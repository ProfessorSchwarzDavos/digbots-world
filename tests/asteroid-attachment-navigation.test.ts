import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createAsteroidRegistry } from "../app/game/asteroid-custody";
import { createAsteroidAttachmentFrame } from "../app/game/asteroid-attachment-frame";
import { captureAsteroidNavigation, projectAsteroidNavigation, type AsteroidNavigationSource } from "../app/game/asteroid-attachment-navigation";
import { snapshotHostAttachmentActorBodies, type AttachmentActorBody } from "../app/game/attachment-actor-bodies";
import { assertAsteroidLeadSegmentOutside } from "../app/game/asteroid-attachment-relationships";
import { homeLocation, locationAddress, universeId } from "../app/game/location-address";
import { VoxelEngine } from "../app/game/engine";
import { AgentAuthority } from "../app/game/agent-platform";
import { BlockId } from "../app/game/data";
import { EVA_TETHER_RENDER_HEIGHT } from "../app/game/life-support";
import { canonicalJson } from "../app/game/universe-json";

const orbit = locationAddress({ ...homeLocation(universeId("navigation-selection")), kind: "orbit", instanceId: "low" });
const registry = createAsteroidRegistry(orbit, 902), frame = createAsteroidAttachmentFrame(registry, registry.asteroids[0].descriptor.id);
const point = (x = .1, y = 32.2, z = -.3) => ({ x: frame.offset.x + x, y: frame.offset.y + y, z: frame.offset.z + z });
const solid = () => BlockId.Stone;
function sourceAt(position = point(), tether = true): AsteroidNavigationSource {
  const anchor = point(3, 32, 2);
  return { player: { ...position, yaw: .7, pitch: -.2 }, spawn: point(90, 33, -100),
    locationPlayerState: { schema: 1, creativeFlying: false, boatId: null, creatureId: null, creatureSeat: null,
      velocity: [.125, -3.5, .0625], ...(tether ? { tether: { anchor: [anchor.x, anchor.y, anchor.z], length: 7.25 } } : {}) } };
}
function actorFor(source: AsteroidNavigationSource, overrides: Partial<AttachmentActorBody> = {}): AttachmentActorBody {
  const state = source.locationPlayerState;
  return { ...snapshotHostAttachmentActorBodies({
    local: { id: "host", position: source.player, body: { variant: "female", race: "dwarf", crouching: true },
      boatId: state?.boatId ?? null, mountedCreatureId: state?.creatureId ?? null, mountedCreatureSeat: state?.creatureSeat ?? null },
    session: null, remotes: [], agents: [], activeWorkAgents: [],
    boats: state?.boatId ? [{ id: state.boatId, passengers: ["host"] }] : [],
    mounts: state?.creatureId !== null && state?.creatureId !== undefined ? [{ creatureId: state.creatureId,
      passengers: [...Array(state.creatureSeat ?? 0).fill(""), "host"] }] : [], liveCreatureIds: state?.creatureId === null || state?.creatureId === undefined ? [] : [state.creatureId],
  })[0], ...overrides };
}
const context = (before: AttachmentActorBody, after = before) => ({ before, after, beforeVoxel: solid, afterVoxel: solid });

test("navigation projects the actual local human, exact seats and tether without relocating a distant spawn", () => {
  const source = sourceAt(), actor = actorFor(source), before = canonicalJson(source), view = projectAsteroidNavigation(frame, source, actor, solid);
  assert.deepEqual(view.player, { x: source.player.x - frame.offset.x, y: source.player.y - frame.offset.y,
    z: source.player.z - frame.offset.z, yaw: .7, pitch: -.2 });
  assert.deepEqual(view.locationPlayerState?.tether, { anchor: [3, 32, 2], length: 7.25 });
  assert.deepEqual(view.locationPlayerState?.velocity, source.locationPlayerState?.velocity);
  assert.equal(view.spawn, null); assert.equal(view.actorId, "host");
  assert.equal(canonicalJson(source), before); assert(!Object.isFrozen(source)); assert(Object.isFrozen(view.locationPlayerState?.tether?.anchor));
});

test("one hundred cold navigation captures preserve original fractional axes, inertia, tether and outside spawn", () => {
  let source = sourceAt(); const before = canonicalJson(source);
  for (let index = 0; index < 100; index++) {
    const actor = actorFor(source), view = projectAsteroidNavigation(frame, source, actor, solid);
    source = JSON.parse(JSON.stringify(captureAsteroidNavigation(frame, source, view, view, context(actor))));
    assert.equal(canonicalJson(source), before);
  }
});

test("absent legacy binding remains absent and a selected spawn is only a read-only local hint", () => {
  const fixture = sourceAt(), source = { player: fixture.player, spawn: point(1.1, 32.3, -.2) }, actor = actorFor(source);
  const view = projectAsteroidNavigation(frame, source, actor, solid);
  assert.equal(view.locationPlayerState, null); assert.notEqual(view.spawn, null);
  const result = captureAsteroidNavigation(frame, source, view, view, context(actor));
  assert.deepEqual(result, source); assert(!Object.hasOwn(result, "locationPlayerState"));
  assert.throws(() => projectAsteroidNavigation(frame, { ...source, locationPlayerState: undefined }, actor, solid), /absent or/);
  assert.throws(() => captureAsteroidNavigation(frame, source, view, { ...view, spawn: point() }, context(actor)), /spawn binding/);
});

test("same-frame movement and tether release must match the real after-body and preserve untouched canonical axes", () => {
  const source = sourceAt(), before = actorFor(source), baseline = projectAsteroidNavigation(frame, source, before, solid);
  const releasedState = { ...source.locationPlayerState! }; delete releasedState.tether;
  const edited = { ...structuredClone(baseline), locationPlayerState: releasedState };
  edited.player!.x += 2; edited.player!.yaw += .5;
  const expected: AsteroidNavigationSource = { ...source, player: { ...source.player, x: edited.player!.x + frame.offset.x, yaw: 1.2 },
    locationPlayerState: releasedState };
  const after = actorFor(expected), result = captureAsteroidNavigation(frame, source, baseline, edited, context(before, after));
  assert.deepEqual(result, expected); assert.equal(result.player.y, source.player.y); assert.equal(result.player.z, source.player.z);
  assert.throws(() => captureAsteroidNavigation(frame, source, baseline, edited, context(before)), /actual current local human/);
});

test("occupied boat and creature seats agree exactly; stale, fake and double-owner bindings refuse", () => {
  for (const state of [{ boatId: "boat", creatureId: null, creatureSeat: null }, { boatId: null, creatureId: 7, creatureSeat: 2 }]) {
    const source = sourceAt(), seated = { ...source, locationPlayerState: { ...source.locationPlayerState!, ...state } }, actor = actorFor(seated);
    const view = projectAsteroidNavigation(frame, seated, actor, solid);
    assert.deepEqual(captureAsteroidNavigation(frame, seated, view, view, context(actor)), seated);
    assert.throws(() => projectAsteroidNavigation(frame, seated, actorFor(source), solid), /occupied seats/);
  }
  const source = sourceAt(), actor = actorFor(source), view = projectAsteroidNavigation(frame, source, actor, solid);
  assert.throws(() => projectAsteroidNavigation(frame, source, { ...actor, kind: "drone" }, solid), /local human/);
  assert.throws(() => projectAsteroidNavigation(frame, source, { ...actor, connectionId: "remote" }, solid), /local human/);
  assert.throws(() => captureAsteroidNavigation(frame, source, view, view, context(actor, { ...actor, id: "new-host" })), /membership/);
  assert.throws(() => captureAsteroidNavigation(frame, { ...source, spawn: point(91) }, view, view, context(actor)), /Stale/);
});

test("complete actor body and tether anchor cannot straddle any frame face", () => {
  const b = frame.orbitBounds, outside = [
    { ...point(0, 32, 0), x: b.minX - 1 }, { ...point(0, 32, 0), x: b.maxX + 1 },
    { ...point(0, 32, 0), y: b.minY - 1 }, { ...point(0, 32, 0), y: b.maxY + 1 },
    { ...point(0, 32, 0), z: b.minZ - 1 }, { ...point(0, 32, 0), z: b.maxZ + 1 },
  ];
  for (const anchor of outside) {
    const source = sourceAt(), changed = { ...source, locationPlayerState: { ...source.locationPlayerState!,
      tether: { anchor: [anchor.x, anchor.y, anchor.z] as [number, number, number], length: 32 } } };
    assert.throws(() => projectAsteroidNavigation(frame, changed, actorFor(changed), solid), /anchor crosses/);
  }
  const crossing = sourceAt({ ...point(), x: b.maxX + .4 }, false);
  assert.throws(() => projectAsteroidNavigation(frame, crossing, actorFor(crossing), solid), /Physical volume/);
});

test("outside tethers check both the physics and actual elevated display segments", () => {
  const b = frame.orbitBounds, source = sourceAt({ x: b.minX - 3, y: b.minY - 1.1, z: frame.offset.z });
  const anchor: [number, number, number] = [b.maxX + 3, b.minY - 1, frame.offset.z];
  const changed = { ...source, locationPlayerState: { ...source.locationPlayerState!, tether: { anchor, length: 32 } } }, actor = actorFor(changed);
  assert.doesNotThrow(() => assertAsteroidLeadSegmentOutside(frame, actor.position, { x: anchor[0], y: anchor[1], z: anchor[2] }, "orbit"));
  assert.equal(EVA_TETHER_RENDER_HEIGHT, 1);
  assert.throws(() => projectAsteroidNavigation(frame, changed, actor, solid), /Outside lead segment/);
  const simple = sourceAt(point(-40), false), outsideActor = actorFor(simple), view = projectAsteroidNavigation(frame, simple, outsideActor, solid);
  assert.equal(view.player, null); assert.equal(view.locationPlayerState, null);
  assert.deepEqual(captureAsteroidNavigation(frame, simple, view, view, context(outsideActor)), simple);
  assert.throws(() => captureAsteroidNavigation(frame, simple, view, { ...view, player: source.player }, context(outsideActor)), /Outside navigation/);
});

test("unknown or removed anchors, fractional cell aliases, malformed fields and forged views reject", () => {
  const source = sourceAt(), actor = actorFor(source), view = projectAsteroidNavigation(frame, source, actor, solid);
  for (const voxel of [() => undefined, () => BlockId.Air]) {
    assert.throws(() => projectAsteroidNavigation(frame, source, actor, voxel), /solid canonical anchor/);
    assert.throws(() => captureAsteroidNavigation(frame, source, view, view, { ...context(actor), afterVoxel: voxel }), /solid canonical anchor/);
  }
  const bad = structuredClone(source); bad.locationPlayerState!.tether!.anchor[0] += .25;
  assert.throws(() => projectAsteroidNavigation(frame, bad, actor, solid), /exact canonical voxel/);
  for (const changed of [{ ...source, hidden: 1 }, { ...source, player: { ...source.player, yaw: NaN } },
    { ...source, locationPlayerState: { ...source.locationPlayerState!, velocity: [Infinity, 0, 0] } }])
    assert.throws(() => projectAsteroidNavigation(frame, changed as AsteroidNavigationSource, actor, solid));
  assert.throws(() => captureAsteroidNavigation(frame, source, view, { ...view, sourceBaseline: "forged" }, context(actor)), /binding changed/);
  assert.throws(() => captureAsteroidNavigation(frame, source, view, { ...view, locationPlayerState: null }, context(actor)), /omitted/);
});

test("actual engine snapshot shares saved navigation semantics, copies no resources, and does not serialize", () => {
  const source = sourceAt(), engine = Object.create(VoxelEngine.prototype) as VoxelEngine;
  Object.assign(engine, { position: new THREE.Vector3(source.player.x, source.player.y, source.player.z), yaw: .7, pitch: -.2,
    spawn: new THREE.Vector3(source.spawn.x, source.spawn.y, source.spawn.z), velocity: new THREE.Vector3(.125, -3.5, .0625),
    creativeFlying: false, evaTether: structuredClone(source.locationPlayerState!.tether), evaCargoLine: null,
    playerVariant: "female", crouching: true, activeCharacterProfile: { appearance: { race: "dwarf" } }, multiplayer: null,
    mountedBoatId: null, mountedCreatureId: null, mountedCreatureSeat: null, remotePlayers: new Map(),
    agentAuthority: new AgentAuthority(), boats: new Map(), creatureMountSeats: new Map(), mobs: [],
    agentRuntimeTasks: new Map(), agentBuildJobs: new Map(), agentBuildPreviews: new Map(),
    bodyContext: () => ({ environment: { gravityG: 0 } }), serialize: () => { throw Error("must not serialize"); } });
  const result = engine.snapshotAttachmentNavigationSource();
  assert.deepEqual(result.source, source); assert.equal(result.actor.id, "local"); assert(Object.isFrozen(result.source));
  assert(Object.isFrozen(result.source.locationPlayerState.tether)); assert(!Object.hasOwn(result, "inventory"));
  assert.equal(Object.isFrozen(engine.position), false);
  Object.assign(engine, { bodyContext: () => ({ environment: { gravityG: 1 } }) });
  assert(!Object.hasOwn(engine.snapshotAttachmentNavigationSource().source.locationPlayerState, "velocity"));
  Object.assign(engine, { evaCargoLine: { remaining: .1, point: new THREE.Vector3() } });
  assert.throws(() => engine.snapshotAttachmentNavigationSource(), /active EVA cargo line/);
});
