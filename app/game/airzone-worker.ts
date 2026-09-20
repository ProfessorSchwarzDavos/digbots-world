import { createAirZoneWorkerHandler, type AirZoneWorkerRequest, type AirZoneWorkerResponse } from "./airzone-worker-protocol";

export { createAirZoneWorkerHandler, handleAirZoneWorkerRequest } from "./airzone-worker-protocol";
export type { AirZoneWorkerRequest, AirZoneWorkerResponse } from "./airzone-worker-protocol";

// Safe to import in Node and in a browser main thread. This module binds only to
// a dedicated worker global; it does not read an engine or mutate window handlers.
const scope = globalThis as typeof globalThis & {
  importScripts?: (...urls: string[]) => void;
  postMessage?: (message: AirZoneWorkerResponse) => void;
  onmessage?: (event: MessageEvent<AirZoneWorkerRequest>) => void;
};
if (typeof scope.importScripts === "function" && typeof scope.postMessage === "function" && typeof document === "undefined") {
  const handle = createAirZoneWorkerHandler();
  scope.onmessage = event => scope.postMessage!(handle(event.data));
}
