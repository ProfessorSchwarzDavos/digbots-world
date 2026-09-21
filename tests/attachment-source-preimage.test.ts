import assert from "node:assert/strict";
import test from "node:test";
import { encodeAttachmentSource, snapshotAttachmentSaveSources, type AttachmentSaveSources } from "../app/game/attachment-source-preimage";
import { WORLD_SAVE_OWNERS } from "../app/game/universe-save";

test("exact source tags preserve undefined, absence, null, negative zero and array order", () => {
  const inputs = [{}, { x: undefined }, { x: null }, { x: 0 }, { x: -0 }, { x: "0" }, [undefined], [], [1, 2], [2, 1]];
  const encoded = inputs.map(value => JSON.stringify(encodeAttachmentSource(value)));
  assert.equal(new Set(encoded).size, inputs.length);
  assert.deepEqual(encodeAttachmentSource({ a: 1, b: 2 }), encodeAttachmentSource({ b: 2, a: 1 }));
});

test("source encoding detaches and recursively freezes without clocks, getters or toJSON", () => {
  const raw = { nested: [{ x: 1, optional: undefined }] }, now = Date.now;
  Date.now = () => { throw Error("No clock"); };
  let result: ReturnType<typeof encodeAttachmentSource>;
  try { result = encodeAttachmentSource(raw); } finally { Date.now = now; }
  const before = JSON.stringify(result); raw.nested[0].x = 2;
  assert.equal(JSON.stringify(result), before); assert.notEqual(JSON.stringify(encodeAttachmentSource(raw)), before);
  const frozen = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    assert(Object.isFrozen(value)); for (const child of Object.values(value)) frozen(child);
  };
  frozen(result);
  assert.throws(() => encodeAttachmentSource({ get x() { throw Error("Getter executed"); } }), /accessors/);
  assert.throws(() => encodeAttachmentSource({ toJSON() { throw Error("toJSON executed"); } }), /plain data/);
});

test("unsafe source structures reject without lossy JSON coercion", () => {
  const cycle: { x?: unknown } = {}; cycle.x = cycle;
  for (const value of [NaN, Infinity, -Infinity, BigInt(1), new Map(), new Set(), new Date(), cycle,
    new Array(1), Object.assign([1], { extra: 2 }), { [Symbol("hidden")]: 1 }, Object.defineProperty({}, "hidden", { value: 1 })])
    assert.throws(() => encodeAttachmentSource(value));
});

test("every WorldSave field requires an explicit raw source except savedAt commit metadata", () => {
  const names = Object.keys(WORLD_SAVE_OWNERS).filter(key => key !== "savedAt");
  const fields = Object.fromEntries(names.map(key => [key, undefined])) as AttachmentSaveSources;
  const before = JSON.stringify(snapshotAttachmentSaveSources(fields, {}, {}));
  for (const name of names) {
    const changed = { ...fields, [name]: { directChange: true } };
    assert.notEqual(JSON.stringify(snapshotAttachmentSaveSources(changed, {}, {})), before, name);
    const missing = { ...fields }; delete (missing as Record<string, unknown>)[name];
    assert.throws(() => snapshotAttachmentSaveSources(missing, {}, {}), /missing or unsupported/, name);
  }
  assert.throws(() => snapshotAttachmentSaveSources({ ...fields, savedAt: 1 } as AttachmentSaveSources, {}, {}), /missing or unsupported/);
  assert.notEqual(JSON.stringify(snapshotAttachmentSaveSources(fields, { unknown: undefined }, {})), before);
  assert.notEqual(JSON.stringify(snapshotAttachmentSaveSources(fields, {}, { clock: 0 })), before);
});
