import type * as THREE from "three";
import type { MachineKind } from "./wayworks";
import { createPressureModel, isPressureModelKind, updatePressureModel, type PressureModelState } from "./pressure-models";
import { createWayworksModel, updateWayworksModel } from "./wayworks-models";

/** One routing seam for placed, held and dropped workshop hardware. */
export function createWorkshopModel(kind: MachineKind) {
  const model = isPressureModelKind(kind) ? createPressureModel(kind) : createWayworksModel(kind);
  model.userData.wayworksKind = kind;
  return model;
}
export function updateWorkshopModel(model: THREE.Group, state: PressureModelState) {
  if (isPressureModelKind(model.userData.pressureKind)) updatePressureModel(model, state);
  else updateWayworksModel(model, state);
}
