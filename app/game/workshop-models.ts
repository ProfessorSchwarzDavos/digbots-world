import type * as THREE from "three";
import type { MachineKind } from "./wayworks";
import { createPressureModel, isPressureModelKind, updatePressureModel, type PressureModelState } from "./pressure-models";
import { createWayworksModel, updateWayworksModel } from "./wayworks-models";
import { createSpaceflightModel, isSpaceflightModelKind, updateSpaceflightModel } from "./spaceflight-models";

/** One routing seam for placed, held and dropped workshop hardware. */
export function createWorkshopModel(kind: MachineKind) {
  const model = isSpaceflightModelKind(kind) ? createSpaceflightModel(kind) : isPressureModelKind(kind) ? createPressureModel(kind) : createWayworksModel(kind);
  model.userData.wayworksKind = kind;
  return model;
}
export function updateWorkshopModel(model: THREE.Group, state: PressureModelState) {
  if (isSpaceflightModelKind(model.userData.wayworksKind)) updateSpaceflightModel(model, state);
  else if (isPressureModelKind(model.userData.pressureKind)) updatePressureModel(model, state);
  else updateWayworksModel(model, state);
}
