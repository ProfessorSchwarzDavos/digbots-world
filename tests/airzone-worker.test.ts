import assert from "node:assert/strict";
import test from "node:test";
import { createAirZoneWorkerHandler, handleAirZoneWorkerRequest } from "../app/game/airzone-worker";
import { discoverAirZone, isAirTopologyResultCurrent, type AirTopologyRequest } from "../app/game/airzone";

const request: AirTopologyRequest = { epochs: { locationId: "home", generation: 1, topologyRevision: 4, requestId: 1 }, seed: { x: 0, y: 0, z: 0 }, cells: [{ x: 0, y: 0, z: 0, passable: true, sealMask: 63, controllerIds: ["c"] }] };
test("dedicated worker entry imports in Node without main-thread global side effects", () => {
  assert.equal("onmessage" in globalThis, false);
  const response = handleAirZoneWorkerRequest({ type: "discover", request });
  assert.equal(response.type, "result");
  if (response.type === "result") assert.deepEqual(response.result, discoverAirZone(request));
});
test("worker rejects duplicate, older and cancelled requests; accepts future revisions", () => {
  const handle = createAirZoneWorkerHandler();
  assert.equal(handle({ type: "discover", request }).type, "result");
  assert.equal(handle({ type: "discover", request }).type, "cancelled");
  assert.equal(handle({ type: "cancel", epochs: { ...request.epochs, requestId: 5 } }).type, "cancelled");
  assert.equal(handle({ type: "discover", request: { ...request, epochs: { ...request.epochs, requestId: 4 } } }).type, "cancelled");
  assert.equal(handle({ type: "discover", request: { ...request, epochs: { ...request.epochs, requestId: 6 } } }).type, "result");
});
test("world generation/location isolate cancellation while main authority rejects old result", () => {
  const handle = createAirZoneWorkerHandler();
  handle({ type: "cancel", epochs: { ...request.epochs, requestId: 99 } });
  for (const changed of [{ locationId: "moon" }, { generation: 2 }]) {
    const epochs = { ...request.epochs, ...changed }, response = handle({ type: "discover", request: { ...request, epochs } });
    assert.equal(response.type, "result");
    if (response.type === "result") assert.equal(isAirTopologyResultCurrent(response.result, request.epochs), false);
  }
});
test("worker protocol survives structured clone of transferable dense sections", () => {
  const flags = new Uint8Array(4096); flags[0] = 127;
  const clone = structuredClone({ type: "discover" as const, request: { ...request, sections: [{ origin: { x: 0, y: 0, z: 0 }, flags }] } });
  assert.equal(handleAirZoneWorkerRequest(clone).type, "result");
});
test("malformed worker messages fail closed instead of throwing outside the handler", () => {
  assert.equal(handleAirZoneWorkerRequest(null as never).type, "error");
  assert.equal(handleAirZoneWorkerRequest({ type: "discover", request: { ...request, epochs: undefined } } as never).type, "error");
});
