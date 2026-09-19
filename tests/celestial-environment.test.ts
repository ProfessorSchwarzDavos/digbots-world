import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createWaystarCatalog, validateCelestialCatalog } from "../app/game/celestial-catalog.ts";
import { bodyEnvironment, gravityAcceleration, gravityGait, contactPushOffSpeed, effectiveFallDistance } from "../app/game/celestial-environment.ts";
import { authoredSpaceOffset, EARTH_RADIUS_AU, celestialPositions, discOcclusion, localBodyClock, sampleCelestialSky, secondsFromLocalClock, solveEccentricAnomaly } from "../app/game/celestial-ephemeris.ts";
import { aimArrowVelocity, createArrowProjectile, stepArrowProjectile, disposeArrowVisual } from "../app/game/projectiles.ts";
import { DEFAULT_SWIM_RULES, stepSwimming } from "../app/game/liquids.ts";
import { CelestialSkyRenderer } from "../app/game/celestial-sky.ts";
import { validateLocationPlayerState } from "../app/game/location-manager.ts";
import { validNetworkCelestialCatalog } from "../app/game/multiplayer.ts";

const catalog = createWaystarCatalog();
const body = (id: string) => catalog.bodies.find(b => b.id === id)!;
test("all frozen bodies resolve complete atmosphere, hazard, gravity and sky policies", () => {
  for (const b of catalog.bodies) {
    const e = bodyEnvironment(b);
    assert.equal(e.gravityG, b.physical.massEarths / b.physical.radiusEarths ** 2);
    assert.ok(e.temperatureC[0] <= e.temperatureC[1]); assert.ok(e.sky.day.startsWith("#"));
    assert.equal(bodyEnvironment(b, "orbit").gravityG, 0);
    assert.equal(bodyEnvironment(b, "station").pressureKPa, 0);
    assert.equal(bodyEnvironment(b, "orbit").sky.day, "#030509");
    assert.equal(bodyEnvironment(b, "orbit").sky.aurora, 0);
    assert.equal(bodyEnvironment(b, "orbit").corrosive, false);
  }
  assert.equal(bodyEnvironment(body("blockwild")).breathable, true);
  assert.equal(bodyEnvironment(body("blockwild/morrow")).requiresPressureSuit, true);
  assert.equal(bodyEnvironment(body("talon")).breathable, false);
  const invalid = JSON.parse(JSON.stringify(catalog)); invalid.bodies[2].skyPolicyId = "blockwild/v999";
  assert.throws(() => validateCelestialCatalog(invalid), /policy/);
});
test("Kepler solver meets residual tolerance through eccentricity .95 and many epochs", () => {
  for (const e of [0, .02, .7, .95]) for (const m of [0, .001, .6, Math.PI, 6.2, 1000]) {
    const E = solveEccentricAnomaly(m, e), normalized = ((m % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    assert.ok(Math.abs(E - e * Math.sin(E) - normalized) < 1e-10);
  }
  assert.throws(() => solveEccentricAnomaly(0, 1));
});
test("hierarchical ephemeris keeps moons around their moving parent and survives large jumps", () => {
  for (const t of [0, 12_345, 86_400_000]) {
    const p = celestialPositions(catalog, t), moon = p.get("suno/jun")!, parent = p.get("suno")!;
    const distance = Math.hypot(...moon.map((n, i) => n - parent[i]));
    assert.ok(distance >= .0032 * .98 - 1e-10 && distance <= .0032 * 1.02 + 1e-10);
    assert.deepEqual([...celestialPositions(catalog, t)], [...p]);
  }
});
test("local clocks share one persistent epoch with no travel or reload drift", () => {
  for (const b of catalog.bodies) for (const seconds of [0, 384, 876_543.25]) {
    const clock = localBodyClock(b, seconds);
    assert.ok(Math.abs(secondsFromLocalClock(b, clock.day, clock.time) - seconds) < 1e-7);
  }
  assert.notEqual(localBodyClock(body("blockwild"), 900).time, localBodyClock(body("blockwild/morrow"), 900).time);
  assert.equal(localBodyClock(body("blockwild"), 1200).day, 2);
});
test("physical disc overlap handles total, annular, partial and absent eclipses", () => {
  assert.equal(discOcclusion(.01, .02, 0), 1);
  assert.equal(discOcclusion(.02, .01, 0), .25);
  assert.equal(discOcclusion(.01, .01, .03), 0);
  assert.ok(discOcclusion(.01, .01, .01) > .3 && discOcclusion(.01, .01, .01) < .5);
});
test("sky uses physical phases, parent dominance and distance-sensitive Waystar", () => {
  const moon = sampleCelestialSky(catalog, body("suno/jun"), 450);
  assert.equal(moon.bodies.find(b => b.parent)?.id, "suno");
  assert.ok(moon.bodies.every(b => b.illuminatedFraction >= 0 && b.illuminatedFraction <= 1));
  const inner = sampleCelestialSky(catalog, body("cinderhymn"), 450), outer = sampleCelestialSky(catalog, body("hollowmere"), 450);
  assert.ok(inner.sunAngularRadius > outer.sunAngularRadius * 20);
  assert.ok(inner.irradiance > outer.irradiance * 100);
  const orbit = sampleCelestialSky(catalog, body("orison"), 450, "orbit");
  assert.equal(orbit.bodies.find(b => b.parent)?.id, "orison");
});
test("shared gravity changes ballistics and fall energy, with exact zero-G inertia", () => {
  const g = bodyEnvironment(body("blockwild/morrow")).gravityG;
  assert.ok(Math.abs(gravityAcceleration(24, g) - 4.608) < 1e-12);
  assert.ok(effectiveFallDistance(10, g) < 2);
  assert.equal(effectiveFallDistance(100, 0), 0);
  assert.ok(contactPushOffSpeed(40) < contactPushOffSpeed(0));
  assert.equal(gravityGait(0).mode, "drift"); assert.equal(gravityGait(3).supported, false);
  const origin = new THREE.Vector3(), target = new THREE.Vector3(10, 0, 0);
  assert.equal(aimArrowVelocity(origin, target, 10, 0).y, 0);
  const projectile = createArrowProjectile(1, { kind: "player", id: "test" }, origin, target, 1, 10, 0);
  for (let i = 0; i < 10; i++) stepArrowProjectile(projectile, .1, () => false, () => null, 0);
  assert.equal(projectile.velocity.x, 10); assert.equal(projectile.velocity.y, 0); assert.ok(Math.abs(projectile.position.x - 10) < 1e-10);
  disposeArrowVisual(projectile.visual);
});
test("buoyancy and passive sinking scale with body gravity, player swimming remains powered", () => {
  const state = { velocityY: 0, oxygenSeconds: 12, drowningAccumulator: 0 };
  const input = { jumpHeld: false, movingForward: false, crouching: false, sprinting: false };
  const environment = { submersion: 1, headSubmerged: true, horizontalCollision: false };
  const home = stepSwimming(state, input, environment, .1, DEFAULT_SWIM_RULES, 1);
  const low = stepSwimming(state, input, environment, .1, DEFAULT_SWIM_RULES, .192);
  const zero = stepSwimming(state, input, environment, .1, DEFAULT_SWIM_RULES, 0);
  assert.ok(Math.abs(low.state.velocityY) < Math.abs(home.state.velocityY)); assert.equal(zero.state.velocityY, 0);
});
test("actual sky geometry obeys enclosure/terrain visibility and disposes resources", () => {
  const scene = new THREE.Scene(), renderer = new CelestialSkyRenderer(scene), observer = body("orison/aerie");
  const sample = sampleCelestialSky(catalog, observer, 450), environment = bodyEnvironment(observer);
  renderer.update(catalog, sample, environment, new THREE.Vector3(), 0, .1, false, () => true);
  assert.equal(renderer.group.children.filter(c => c.visible).length, 0);
  renderer.update(catalog, sample, environment, new THREE.Vector3(), 1, .1, false, () => false);
  assert.equal(renderer.group.children.filter(c => c.visible && c.name.startsWith("celestial-")).length, 0);
  renderer.dispose(); assert.equal(scene.children.length, 0);
});

test("space instances have deterministic, moving, bounded authored orbits", () => {
  const b = body("orison");
  for (const kind of ["orbit", "station", "asteroid"] as const) {
    const a = authoredSpaceOffset(b, 12345.5, kind, "dock-a");
    assert.deepEqual(authoredSpaceOffset(b, 12345.5, kind, "dock-a"), a);
    assert.notDeepEqual(authoredSpaceOffset(b, 12345.5, kind, "dock-b"), a);
    assert.notDeepEqual(authoredSpaceOffset(b, 12346.5, kind, "dock-a"), a);
    const factor = kind === "asteroid" ? 6 : kind === "station" ? 3.4 : 3;
    assert.ok(Math.abs(Math.hypot(...a) - b.physical.radiusEarths * EARTH_RADIUS_AU * factor) < 1e-12);
  }
  const parent = sampleCelestialSky(catalog, body("blockwild/morrow"), 0).bodies.find(b => b.parent)!;
  assert.ok(parent.direction[1] > .9, "canonical near-side moon surface sees its parent overhead");
});

test("saved inertial velocity is location-owned and rejects malformed vectors", () => {
  const base = { schema: 1, creativeFlying: false, boatId: null, creatureId: null, creatureSeat: null };
  const input = { ...base, velocity: [2, 1, -.5] };
  const restored = validateLocationPlayerState(input)!;
  assert.deepEqual(restored.velocity, input.velocity);
  input.velocity[0] = 99;
  assert.equal(restored.velocity![0], 2);
  for (const velocity of [[0, 1], [0, 0, Infinity], [0, "1", 0], [1e7, 0, 0]]) {
    assert.throws(() => validateLocationPlayerState({ ...base, velocity }));
  }
});

test("wire catalogs validate complete host physics without guest-world defaults", () => {
  const host = createWaystarCatalog(40);
  assert.equal(validNetworkCelestialCatalog(host), true);
  assert.equal(host.bodies.find(b => b.id === "blockwild")!.rotation.dayLengthMinutes, 40);
  const invalid = JSON.parse(JSON.stringify(host)); invalid.bodies[2].skyPolicyId = "missing/v1";
  assert.equal(validNetworkCelestialCatalog(invalid), false);
  assert.equal(validNetworkCelestialCatalog({}), false);
});
