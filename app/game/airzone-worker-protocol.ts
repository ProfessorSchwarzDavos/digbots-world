import { discoverAirZone, type AirEpochs, type AirTopologyRequest, type AirTopologyResult } from "./airzone";

export type AirZoneWorkerRequest = Readonly<{ type: "discover"; request: AirTopologyRequest }> | Readonly<{ type: "cancel"; epochs: AirEpochs }>;
export type AirZoneWorkerResponse = Readonly<{ type: "result"; result: AirTopologyResult }> | Readonly<{ type: "cancelled"; epochs: AirEpochs }> | Readonly<{ type: "error"; epochs: AirEpochs; message: string }>;

/** A worker cannot interrupt synchronous discovery mid-message. Cancel retires all
 * requests <= this requestId for the same location/generation; the main authority
 * must also reject already-in-flight results with isAirTopologyResultCurrent.
 */
export function createAirZoneWorkerHandler(): (message: AirZoneWorkerRequest) => AirZoneWorkerResponse {
  const latest = new Map<string, number>();
  return message => {
    const invalidEpochs = { locationId: "invalid", generation: 0, topologyRevision: 0, requestId: 0 };
    if (!message || (message.type !== "discover" && message.type !== "cancel") || (message.type === "discover" && !message.request)) return { type: "error", epochs: invalidEpochs, message: "invalid-message" };
    const epochs = message.type === "discover" ? message.request.epochs : message.epochs;
    if (!epochs || typeof epochs.locationId !== "string" || !epochs.locationId || [epochs.generation, epochs.topologyRevision, epochs.requestId].some(v => !Number.isSafeInteger(v) || v < 0)) return { type: "error", epochs: invalidEpochs, message: "invalid-epochs" };
    const key = JSON.stringify([epochs.locationId, epochs.generation]);
    const retired = latest.get(key) ?? -1;
    if (message.type === "cancel") { latest.set(key, Math.max(retired, epochs.requestId)); if (latest.size > 64) latest.delete(latest.keys().next().value!); return { type: "cancelled", epochs }; }
    if (epochs.requestId <= retired) return { type: "cancelled", epochs };
    latest.set(key, epochs.requestId);
    // Bounded session bookkeeping; authoritative epochs remain the install gate.
    if (latest.size > 64) latest.delete(latest.keys().next().value!);
    try { return { type: "result", result: discoverAirZone(message.request) }; }
    catch (error) { return { type: "error", epochs, message: error instanceof Error ? error.message : "invalid-request" }; }
  };
}
export function handleAirZoneWorkerRequest(message: AirZoneWorkerRequest): AirZoneWorkerResponse {
  return createAirZoneWorkerHandler()(message);
}
