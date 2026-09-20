import assert from "node:assert/strict";
import test from "node:test";
import { VoxelEngine, POINTER_LOCK_REACQUIRE_SUPPRESSION_EVENTS } from "../app/game/engine";

function fixture(run: (f: { engine: VoxelEngine; document: { pointerLockElement: object | null; exitPointerLock(): void };
  calls: { requests: number; exits: number; audio: number; changes: boolean[] } }) => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  const calls = { requests: 0, exits: 0, audio: 0, changes: [] as boolean[] };
  const document = { pointerLockElement: null as object | null, exitPointerLock() { calls.exits++; this.pointerLockElement = null; } };
  Object.defineProperty(globalThis, "document", { value: document, configurable: true });
  const engine = Object.assign(Object.create(VoxelEngine.prototype), {
    running: true, paused: false, titleMode: false, gameplayOverlayOpen: false, touchMode: false, agentMode: false,
    multiplayer: null, pendingFieldSurvey: null, locationTransitioning: false, locked: false,
    canvas: { requestPointerLock: () => { calls.requests++; } }, clearInput: () => {}, resetLookFrameBudget: () => {},
    audio: { unlock: () => { calls.audio++; return Promise.resolve(); } },
    events: { onLockChange: (locked: boolean) => { calls.changes.push(locked); }, onToast: () => {} },
  }) as VoxelEngine;
  try { run({ engine, document, calls }); }
  finally { if (previous) Object.defineProperty(globalThis, "document", previous); else Reflect.deleteProperty(globalThis, "document"); }
}

test("late pointer-lock acquisition cannot resume a paused overlay or steal its button clicks", () => fixture(({ engine, document, calls }) => {
  engine.activate(); assert.equal(calls.requests, 1);
  engine.pause(); assert.equal(engine.paused, true); assert.equal(engine.gameplayOverlayOpen, true);
  document.pointerLockElement = engine.canvas; engine.syncPointerLockState();
  assert.equal(engine.paused, true); assert.equal(engine.gameplayOverlayOpen, true);
  assert.equal(engine.locked, false); assert.equal(document.pointerLockElement, null); assert.equal(calls.exits, 1);
  assert.deepEqual(calls.changes, [false]); assert.equal(calls.audio, 1, "late completion cannot unlock audio or resume");
}));

test("lock loss marks the overlay guard before a pending reacquisition can complete", () => fixture(({ engine, document, calls }) => {
  engine.syncPointerLockState();
  assert.equal(engine.paused, true); assert.equal(engine.gameplayOverlayOpen, true);
  document.pointerLockElement = engine.canvas; engine.syncPointerLockState();
  assert.equal(engine.paused, true); assert.equal(engine.locked, false); assert.equal(calls.exits, 1);
}));

test("explicit resume still permits ordinary pointer lock with recenter suppression", () => fixture(({ engine, document, calls }) => {
  engine.pause(); engine.activate(); document.pointerLockElement = engine.canvas; engine.syncPointerLockState();
  assert.equal(engine.paused, false); assert.equal(engine.gameplayOverlayOpen, false); assert.equal(engine.locked, true);
  assert.equal(engine.pointerLockMovementSuppression, POINTER_LOCK_REACQUIRE_SUPPRESSION_EVENTS);
  assert.deepEqual(calls.changes, [true]); assert.equal(calls.exits, 0);
}));

test("shared simulation remains live behind a menu without retaining pointer custody", () => fixture(({ engine, document, calls }) => {
  Reflect.set(engine, "multiplayer", { state: "connected" });
  engine.pause(); assert.equal(engine.paused, false); assert.equal(engine.gameplayOverlayOpen, true);
  document.pointerLockElement = engine.canvas; engine.syncPointerLockState();
  assert.equal(engine.paused, false); assert.equal(engine.gameplayOverlayOpen, true); assert.equal(engine.locked, false);
  assert.equal(calls.exits, 1);
}));

test("title, stopped runtime and pending checkpoint transitions cannot accept an old pointer grant", () => {
  for (const change of [{ titleMode: true }, { running: false }, { pendingFieldSurvey: {} }, { locationTransitioning: true }])
    fixture(({ engine, document, calls }) => {
      Object.assign(engine, change); document.pointerLockElement = engine.canvas;
      engine.syncPointerLockState();
      assert.equal(engine.locked, false); assert.equal(calls.exits, 1); assert.equal(calls.audio, 0);
    });
});
