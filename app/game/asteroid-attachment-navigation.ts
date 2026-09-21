import { BLOCKS, type BlockId } from "./data";
import type { WorldSave } from "./engine";
import type { AttachmentActorBody } from "./attachment-actor-bodies";
import type { CelestialPoint } from "./celestial-terrain";
import { EVA_TETHER_RENDER_HEIGHT } from "./life-support";
import { validateLocationPlayerState, type LocationPlayerState } from "./location-manager";
import { asteroidAttachmentContainsCell, asteroidAttachmentContainsPosition, rebaseAsteroidPosition,
  type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { asteroidAttachmentVolumeSide } from "./asteroid-attachment-creature-footprint";
import { assertAsteroidLeadSegmentOutside } from "./asteroid-attachment-relationships";
import { assertExactKeys, canonicalJson, cloneUniverseJson, freezeUniverseJson } from "./universe-json";

export type AsteroidNavigationSource = Readonly<Pick<WorldSave, "player" | "spawn" | "locationPlayerState">>;
/** Private transient view, not another spawn/respawn owner or a travel grant.
 * A distant spawn is deliberately absent, never moved to the local player. */
export type AsteroidNavigationView = Readonly<{
  frameId: string; actorId: string; sourceBaseline: string; actorBaseline: string;
  player: WorldSave["player"] | null;
  spawn: CelestialPoint | null;
  locationPlayerState: LocationPlayerState | null;
}>;
export type AsteroidNavigationVoxels = (canonicalKey: string) => BlockId | undefined;
const point = (value: CelestialPoint) => ({ x: value.x, y: value.y, z: value.z });
const tuple = (value: CelestialPoint): [number, number, number] => [value.x, value.y, value.z];
function validPoint(value: CelestialPoint, fields = ["x", "y", "z"]) {
  assertExactKeys(value, fields, "Attached navigation point");
  if (!Object.values(value).every(Number.isFinite)) throw Error("Invalid attached navigation coordinates.");
}
function validateSource(frame: AsteroidAttachmentFrame, source: AsteroidNavigationSource,
  actor: AttachmentActorBody, voxel: AsteroidNavigationVoxels): boolean {
  canonicalJson(source); canonicalJson(actor);
  assertExactKeys(source, ["player", "spawn", ...(Object.hasOwn(source, "locationPlayerState") ? ["locationPlayerState"] : [])], "Attached navigation source");
  if (Object.hasOwn(source, "locationPlayerState") && source.locationPlayerState === undefined)
    throw Error("Navigation binding must be absent or an explicit supported state.");
  validPoint(source.player, ["x", "y", "z", "yaw", "pitch"]); validPoint(source.spawn);
  if (!actor.id || actor.kind !== "human" || actor.connectionId !== null || actor.poseTick !== null || actor.agentUpdatedAt !== null
    || canonicalJson(point(source.player)) !== canonicalJson(actor.position)) throw Error("Navigation requires the actual current local human body.");
  const inside = asteroidAttachmentVolumeSide(frame, actor.bounds, "orbit");
  const b = actor.bounds;
  if (b.minX === b.maxX || b.minY === b.maxY || b.minZ === b.maxZ || actor.position.x < b.minX || actor.position.x > b.maxX
    || actor.position.y < b.minY || actor.position.y > b.maxY || actor.position.z < b.minZ || actor.position.z > b.maxZ)
    throw Error("Invalid attached navigation body anchor.");
  const state = validateLocationPlayerState(source.locationPlayerState);
  if ((state?.boatId ?? null) !== actor.boatId || (state?.creatureId ?? null) !== actor.mountedCreatureId
    || (state?.creatureSeat ?? null) !== actor.mountedCreatureSeat) throw Error("Navigation binding differs from the actual occupied seats.");
  if (state?.tether) {
    const [x, y, z] = state.tether.anchor, anchor = { x, y, z };
    if (![x, y, z].every(Number.isSafeInteger)) throw Error("Tether requires its exact canonical voxel anchor.");
    const key = `${x},${y},${z}`, block = voxel(key);
    if (block === undefined || !BLOCKS[block]?.solid) throw Error("Tether has no known solid canonical anchor.");
    if (asteroidAttachmentContainsCell(frame, key, "orbit") !== inside) throw Error("Tether anchor crosses the attached frame boundary.");
    const renderedStart = { ...actor.position, y: actor.position.y + EVA_TETHER_RENDER_HEIGHT };
    if (inside) {
      if (!asteroidAttachmentContainsPosition(frame, renderedStart, "orbit")) throw Error("Tether display crosses the attached frame boundary.");
    } else {
      // Physics constrains the feet; the actual rendered line begins higher.
      // Both outside endpoints can still span the selected frame.
      assertAsteroidLeadSegmentOutside(frame, actor.position, anchor, "orbit");
      assertAsteroidLeadSegmentOutside(frame, renderedStart, anchor, "orbit");
    }
  }
  return inside;
}
function localState(frame: AsteroidAttachmentFrame, state: LocationPlayerState): LocationPlayerState {
  const result = cloneUniverseJson(state);
  return result.tether ? { ...result, tether: { ...result.tether,
    anchor: tuple(rebaseAsteroidPosition(frame, { x: result.tether.anchor[0], y: result.tether.anchor[1], z: result.tether.anchor[2] }, "orbit")) } } : result;
}
export function projectAsteroidNavigation(frame: AsteroidAttachmentFrame, canonical: AsteroidNavigationSource,
  actor: AttachmentActorBody, voxel: AsteroidNavigationVoxels): AsteroidNavigationView {
  const inside = validateSource(frame, canonical, actor, voxel);
  return freezeUniverseJson(cloneUniverseJson({ frameId: frame.frameId, actorId: actor.id,
    sourceBaseline: canonicalJson(canonical), actorBaseline: canonicalJson(actor),
    player: inside ? { ...canonical.player, ...rebaseAsteroidPosition(frame, point(canonical.player), "orbit") } : null,
    spawn: asteroidAttachmentContainsPosition(frame, canonical.spawn, "orbit") ? rebaseAsteroidPosition(frame, canonical.spawn, "orbit") : null,
    locationPlayerState: inside && canonical.locationPlayerState ? localState(frame, canonical.locationPlayerState) : null }));
}

/** Same-membership capture only. Original outside spawn and optional-field
 * absence survive exactly. New respawn/bed actions need their own authority;
 * actor movement, tether edits, inertia and seat changes must already agree with
 * the host's complete after-image and later atomic resource/consent validation. */
export function captureAsteroidNavigation(frame: AsteroidAttachmentFrame, canonical: AsteroidNavigationSource,
  baseline: AsteroidNavigationView, edited: AsteroidNavigationView,
  context: Readonly<{ before: AttachmentActorBody; after: AttachmentActorBody;
    beforeVoxel: AsteroidNavigationVoxels; afterVoxel: AsteroidNavigationVoxels }>): AsteroidNavigationSource {
  if (canonicalJson(projectAsteroidNavigation(frame, canonical, context.before, context.beforeVoxel)) !== canonicalJson(baseline))
    throw Error("Stale attached navigation view.");
  canonicalJson(edited); assertExactKeys(edited, Object.keys(baseline), "Attached navigation view");
  for (const key of ["frameId", "actorId", "sourceBaseline", "actorBaseline", "spawn"] as const)
    if (canonicalJson(edited[key]) !== canonicalJson(baseline[key])) throw Error("Attached navigation owner or spawn binding changed.");
  if (context.after.id !== context.before.id || context.after.kind !== "human"
    || asteroidAttachmentVolumeSide(frame, context.after.bounds, "orbit") !== Boolean(baseline.player))
    throw Error("Attached navigation actor membership changed.");
  if (!baseline.player) {
    if (edited.player !== null || edited.locationPlayerState !== null || canonicalJson(context.before) !== canonicalJson(context.after))
      throw Error("Outside navigation actor cannot be edited through this frame.");
    validateSource(frame, canonical, context.after, context.afterVoxel); return cloneUniverseJson(canonical);
  }
  if (!edited.player) throw Error("Attached navigation player was omitted.");
  validPoint(edited.player, ["x", "y", "z", "yaw", "pitch"]);
  const rebased = rebaseAsteroidPosition(frame, point(edited.player), "local");
  const captured = { x: edited.player.x === baseline.player.x ? canonical.player.x : rebased.x,
    y: edited.player.y === baseline.player.y ? canonical.player.y : rebased.y,
    z: edited.player.z === baseline.player.z ? canonical.player.z : rebased.z };
  let state = edited.locationPlayerState;
  if (state) {
    validateLocationPlayerState(state);
    if (state.tether) state = { ...state, tether: { ...state.tether,
      anchor: tuple(rebaseAsteroidPosition(frame, { x: state.tether.anchor[0], y: state.tether.anchor[1], z: state.tether.anchor[2] }, "local")) } };
  } else if (Object.hasOwn(canonical, "locationPlayerState")) throw Error("Attached navigation binding was omitted.");
  const result: AsteroidNavigationSource = { player: { ...edited.player, ...captured }, spawn: cloneUniverseJson(canonical.spawn),
    ...(state ? { locationPlayerState: cloneUniverseJson(state) } : {}) };
  validateSource(frame, result, context.after, context.afterVoxel);
  return result;
}
