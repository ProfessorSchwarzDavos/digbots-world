import { ITEMS, type InventorySlot } from "./data";
import { cloneUniverseJson, isUniverseRecord, assertExactKeys } from "./universe-json";

/** Location-owned material custody, never session grants or executable jobs.
 * Interrupted build reservations return to this ledger, including overflow. */
export type AgentCustodySave = Readonly<{
  schema: 1;
  agents: Readonly<Record<string, Readonly<{
    inventory: readonly (InventorySlot | null)[];
    revision: number;
    returning: readonly InventorySlot[];
  }>>>;
}>;

export function validateAgentCustody(value: unknown): AgentCustodySave {
  if (value === undefined) return { schema: 1, agents: {} };
  if (!isUniverseRecord(value) || value.schema !== 1 || !isUniverseRecord(value.agents)) throw new Error("Invalid drone material custody.");
  assertExactKeys(value, ["schema", "agents"], "Drone custody");
  const slot = (entry: unknown, nullable: boolean) => {
    if (nullable && entry === null) return;
    if (!isUniverseRecord(entry) || !Number.isSafeInteger(entry.item) || !ITEMS[entry.item as number]
      || !Number.isSafeInteger(entry.count) || Number(entry.count) < 1) throw new Error("Invalid drone custody item.");
    assertExactKeys(entry, ["item", "count", ...("durability" in entry ? ["durability"] : []), ...("metadata" in entry ? ["metadata"] : [])], "Drone custody item");
    if (entry.durability !== undefined && (typeof entry.durability !== "number" || !Number.isFinite(entry.durability))) throw new Error("Invalid drone item durability.");
    if (entry.metadata !== undefined && !isUniverseRecord(entry.metadata)) throw new Error("Invalid drone item metadata.");
  };
  for (const [id, entry] of Object.entries(value.agents)) {
    if (!/^[A-Za-z0-9_.:-]{1,160}$/.test(id) || !isUniverseRecord(entry)) throw new Error("Invalid drone custody identity.");
    assertExactKeys(entry, ["inventory", "revision", "returning"], "Drone material record");
    if (!Number.isSafeInteger(entry.revision) || Number(entry.revision) < 0 || !Array.isArray(entry.inventory)
      || entry.inventory.length > 256 || !Array.isArray(entry.returning)) throw new Error("Invalid drone material record.");
    entry.inventory.forEach((item) => slot(item, true));
    entry.returning.forEach((item) => slot(item, false));
  }
  return cloneUniverseJson(value) as AgentCustodySave;
}
