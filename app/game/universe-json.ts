/** Canonical JSON is shared by catalog, journal and portable archive checksums. */
export function canonicalJson(value: unknown): string {
  const ancestors = new Set<object>();
  let nodes = 0;
  function encode(input: unknown, depth: number): string {
    if (++nodes > 2_000_000 || depth > 96) throw new Error("Universe record exceeds structural limits.");
    if (input === null) return "null";
    if (typeof input === "string" || typeof input === "boolean") return JSON.stringify(input);
    if (typeof input === "number") {
      if (!Number.isFinite(input)) throw new Error("Universe numbers must be finite.");
      return JSON.stringify(input);
    }
    if (typeof input !== "object" || ancestors.has(input)) throw new Error("Universe records must be acyclic JSON.");
    ancestors.add(input);
    let result: string;
    if (Array.isArray(input)) {
      result = `[${input.map((entry) => encode(entry, depth + 1)).join(",")}]`;
    } else {
      const prototype = Object.getPrototypeOf(input);
      if (prototype !== Object.prototype && prototype !== null) throw new Error("Universe records must be plain JSON objects.");
      const record = input as Record<string, unknown>;
      result = `{${Object.keys(record).sort().filter((key) => record[key] !== undefined)
        .map((key) => `${JSON.stringify(key)}:${encode(record[key], depth + 1)}`).join(",")}}`;
    }
    ancestors.delete(input);
    return result;
  }
  return encode(value, 0);
}

export function cloneUniverseJson<T>(value: T): T {
  return JSON.parse(canonicalJson(value)) as T;
}

export function freezeUniverseJson<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeUniverseJson(child);
    Object.freeze(value);
  }
  return value;
}

/** Hash strings as exact UTF-8, without parsing or normalizing legacy bytes. */
export async function universeSha256(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Secure browser checksums are unavailable. No save was changed.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isUniverseRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

export function assertExactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  if (Object.keys(value).some((key) => !keys.includes(key)) || keys.some((key) => !(key in value))) {
    throw new Error(`${label} has missing or unsupported fields.`);
  }
}
