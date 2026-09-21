import type { WorldSave } from "./engine";
import { WORLD_SAVE_OWNERS } from "./universe-save";
import { freezeUniverseJson } from "./universe-json";

/** Comparison data, deliberately NOT a WorldSave or a transfer payload. Tags
 * distinguish absent keys, own undefined values, null, and negative zero. */
export type AttachmentSourceValue =
  | readonly ["undefined" | "null"]
  | readonly ["boolean", boolean]
  | readonly ["number" | "string", string]
  | readonly ["array", readonly AttachmentSourceValue[]]
  | readonly ["object", readonly (readonly [string, AttachmentSourceValue])[]];

/** Exact, bounded observation of plain data. Unlike JSON.stringify/canonicalJson,
 * it never drops undefined fields or invokes getters/toJSON/normalizers. Maps,
 * sets and vectors must be projected explicitly by their authoritative owner. */
export function encodeAttachmentSource(value: unknown): AttachmentSourceValue {
  let nodes = 0;
  const ancestors = new Set<object>();
  const encode = (input: unknown, depth: number): AttachmentSourceValue => {
    if (++nodes > 2_000_000 || depth > 96) throw Error("Attachment source exceeds structural limits.");
    if (input === undefined) return ["undefined"];
    if (input === null) return ["null"];
    if (typeof input === "boolean") return ["boolean", input];
    if (typeof input === "string") return ["string", input];
    if (typeof input === "number") {
      if (!Number.isFinite(input)) throw Error("Attachment source numbers must be finite.");
      return ["number", Object.is(input, -0) ? "-0" : String(input)];
    }
    if (typeof input !== "object" || ancestors.has(input)) throw Error("Attachment source must be acyclic plain data.");
    const array = Array.isArray(input), prototype = Object.getPrototypeOf(input);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null)
      throw Error("Attachment source must be plain data.");
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (Object.getOwnPropertySymbols(input).length || Object.entries(descriptors).some(([key, descriptor]) =>
      !(array && key === "length") && (!descriptor.enumerable || !("value" in descriptor))))
      throw Error("Attachment source cannot contain accessors or hidden properties.");
    ancestors.add(input);
    let result: AttachmentSourceValue;
    if (array) {
      if (Object.keys(descriptors).length !== input.length + 1
        || Array.from({ length: input.length }, (_, index) => String(index)).some(key => !Object.hasOwn(descriptors, key)))
        throw Error("Attachment source arrays must be dense and unextended.");
      result = ["array", input.map((_, index) => encode(descriptors[index].value, depth + 1))];
    } else result = ["object", Object.keys(descriptors).sort().map(key => [key, encode(descriptors[key].value, depth + 1)])];
    ancestors.delete(input);
    return result;
  };
  return freezeUniverseJson(encode(value, 0));
}

/** Every persisted field has an explicit source, even optional fields. savedAt
 * is commit metadata, never sampled while observing the source. Values may be
 * raw owner representations (map rows, unnormalized records), not save shapes. */
export type AttachmentSaveSources = { [K in Exclude<keyof WorldSave, "savedAt">]-?: unknown };

export function snapshotAttachmentSaveSources(fields: AttachmentSaveSources, extensions: unknown, runtime: unknown) {
  const expected = Object.keys(WORLD_SAVE_OWNERS).filter(key => key !== "savedAt");
  if (Object.keys(fields).length !== expected.length || expected.some(key => !Object.hasOwn(fields, key)))
    throw Error("Attachment source has missing or unsupported save fields.");
  return encodeAttachmentSource({ schema: 1, fields, extensions, runtime, commitOnly: ["savedAt"] });
}
