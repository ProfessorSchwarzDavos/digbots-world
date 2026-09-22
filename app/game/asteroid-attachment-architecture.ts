import { BLOCKS, type BlockId } from "./data";
import { bedCounterpart } from "./beds";
import { doorPairFor, doorState } from "./doors";
import { pressureDoorLower, pressureDoorUpper } from "./pressure-devices";
import { FENCE_POST_TOP, FENCE_GATE_TOP, fenceConnectsTo } from "./fence-body";
import { parseCustodyCellKey } from "./chest-custody-owner";
import { asteroidAttachmentContainsCell, createAsteroidAttachmentFrame, type AsteroidAttachmentFrame } from "./asteroid-attachment-frame";
import { asteroidAttachmentVolumeSide } from "./asteroid-attachment-creature-footprint";
import type { createAsteroidAttachmentWorld } from "./asteroid-attachment-world";
import { canonicalJson, freezeUniverseJson } from "./universe-json";

type ArchitectureKind = "door" | "pressure-door" | "bed" | "fence" | "gate";
type Cell = Readonly<{ key: string; block: BlockId; facing: number }>;

/** Read-only whole paired-cell and fence-body closure. Canonical finite pages
 * and construction are complete, unlike rendered chunks. No state is created
 * for a missing counterpart; malformed pairs refuse even outside the frame.
 * This is not full authored-site closure, pressure authority or travel consent. */
export function selectAsteroidArchitecture(frame: AsteroidAttachmentFrame, world: ReturnType<typeof createAsteroidAttachmentWorld>) {
  if (canonicalJson(frame) !== canonicalJson(createAsteroidAttachmentFrame(world.source.registry, frame.asteroidId)))
    throw Error("Architecture frame differs from its canonical world.");
  const seen = new Set<string>();
  const installations: { kind: ArchitectureKind; key: string; cells: Cell[]; attached: boolean;
    neighbors: { key: string; block: BlockId; connects: boolean }[] }[] = [];
  for (const [key, block] of Object.entries(world.authoredVoxels).sort(([a], [b]) => a.localeCompare(b))) {
    if (seen.has(key)) continue;
    const [x, y, z] = parseCustodyCellKey(key), door = doorState(block), bed = bedCounterpart(block, x, y, z);
    const upper = pressureDoorUpper(block), lower = pressureDoorLower(block), shape = BLOCKS[block]?.shape;
    let kind: ArchitectureKind, partner: { key: string; block: BlockId } | null = null;
    if (door) {
      kind = "door";
      partner = { key: `${x},${y + (door.upper ? -1 : 1)},${z}`, block: door.upper ? doorPairFor(block).lower : doorPairFor(block).upper };
    } else if (upper !== undefined || lower !== undefined) {
      kind = "pressure-door";
      partner = { key: `${x},${y + (upper !== undefined ? 1 : -1)},${z}`, block: upper ?? lower! };
    } else if (bed) {
      kind = "bed"; partner = { key: `${bed.x},${bed.y},${bed.z}`, block: bed.type };
    } else if (shape === "fence" || shape === "gate") kind = shape;
    else continue;

    const attached = asteroidAttachmentContainsCell(frame, key, "orbit");
    const keys = [key];
    if (partner) {
      if (world.block(partner.key) !== partner.block) throw Error("Architecture lacks its exact paired counterpart.");
      if (kind === "pressure-door" && world.facing(key) !== world.facing(partner.key))
        throw Error("Pressure door counterpart facing differs.");
      if (asteroidAttachmentContainsCell(frame, partner.key, "orbit") !== attached)
        throw Error("Paired architecture crosses the attached boundary.");
      keys.push(partner.key);
    }
    for (const cell of keys) {
      const [cx, cy, cz] = parseCustodyCellKey(cell);
      // Door/bed poses fit their paired unit envelope. Pressure leaves shrink
      // while opening; moving panels and all fittings stay within that pair.
      // Full machine state/body validation remains in the physical selector.
      // Fence/gate posts exceed Y+.5; horizontal rails fit the unit envelope.
      const top = kind === "fence" ? FENCE_POST_TOP : kind === "gate" ? FENCE_GATE_TOP : .5;
      if (asteroidAttachmentVolumeSide(frame, { minX: cx - .5, maxX: cx + .5, minY: cy - .5,
        maxY: cy + top, minZ: cz - .5, maxZ: cz + .5 }, "orbit") !== attached)
        throw Error("Architecture body crosses the attached boundary.");
      seen.add(cell);
    }
    // Connections may read across the boundary; they are not a new owner. Bind
    // the exact canonical neighbor, never replace outside/unloaded cells by air.
    const neighbors = kind === "fence" ? [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => {
      const key = `${x + dx},${y},${z + dz}`, block = world.block(key);
      return { key, block, connects: fenceConnectsTo(block) };
    }) : [];
    installations.push({ kind, key: [...keys].sort()[0], cells: keys.sort().map(key => ({ key, block: world.block(key), facing: world.facing(key) })), attached, neighbors });
  }
  return freezeUniverseJson({ worldBaseline: world.sourceBaseline, installations });
}
