"use client";

import { Item, ITEMS, type InventorySlot, type ItemCode } from "./data";
import { machineKindForBlock } from "./wayworks-integration";
import { isWayworksItem } from "./wayworks-item-models";
import { portableResource } from "./wayworks-machines";

export const hasWayworksIcon = (item: ItemCode) => item === Item.FieldWrench || !!machineKindForBlock(item) || isWayworksItem(item);

export function wayworksMetadataSummary(slot: InventorySlot): string | null {
  if (slot.item === Item.FluidCanister || slot.item === Item.GasCylinder) {
    const content = portableResource(slot);
    return content === undefined || content?.kind === "item" ? "Invalid container data" : content
      ? `${content.quantity / 1000} ${slot.item === Item.GasCylinder ? "standard L" : "L"} ${content.resource}` : "Empty container";
  }
  return machineKindForBlock(slot.item) && slot.metadata?.wayworks ? "Sealed machine stores and modules" : null;
}

/** Compact silhouettes share the brass/ceramic language of the world models. */
export function WayworksIcon({ item, small = false }: { item: ItemCode; small?: boolean }) {
  const kind = machineKindForBlock(item), isModule = item >= Item.SpeedModule && item <= Item.ThermalModule;
  const tank = item === Item.FluidCanister || item === Item.GasCylinder || kind === "fluid-tank" || kind === "gas-tank";
  const round = item === Item.GasCylinder || kind === "gas-tank";
  return <svg className={`item-icon wayworks-icon ${small ? "item-icon-small" : ""}`} viewBox="0 0 40 40" aria-hidden="true" data-item-id={item} data-wayworks-icon={kind ?? item}>
    <g fill={ITEMS[item]?.color ?? "#819797"} stroke="#293e43" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      {item === Item.FieldWrench ? <path d="m12 4 4 8 5-3-3-8 9 4 2 10-7 6-10 16-6-4 10-16-8-4Z" fill="#c2caca" />
        : tank ? <><rect x="10" y="9" width="20" height="27" rx={round ? 8 : 3} /><path d="M16 9V4h8v5M10 17h20M10 30h20" stroke="#c6a566" /><path d="M15 21h10v5H15Z" fill={round ? "#b9df9a" : "#70bdde"} />{!round && <path d="M13 8V3h14v5" fill="none" />}</>
        : isModule ? <><rect x="7" y="6" width="26" height="27" rx="3" /><path d="M12 33v4m8-4v4m8-4v4" stroke="#d9ba73" strokeWidth="3" />
          {item === Item.SpeedModule ? <path d="m12 13 7 7-7 7m10-14 7 7-7 7" fill="none" />
            : item === Item.EfficiencyModule ? <path d="M12 26q-2-16 17-16-1 16-17 16m0 0 12-11" fill="#b4d993" />
            : item === Item.CapacityModule ? <><rect x="12" y="11" width="16" height="6" /><rect x="12" y="22" width="16" height="6" /></>
            : item === Item.FilterModule ? <path d="M12 12h16l-6 9v7h-4v-7Z" fill="#d8c18a" />
            : item === Item.MufflingModule ? <path d="M12 17h5l6-6v17l-6-6h-5m14-7 4 9m0-9-4 9" fill="none" />
            : item === Item.SealModule ? <><circle cx="20" cy="20" r="8" fill="#334c50" /><circle cx="20" cy="20" r="4" fill="#d8c18a" /></>
            : <path d="M13 12v16m7-16v16m7-16v16M10 18h20M10 23h20" fill="none" />}</>
        : kind ? <><path d="M5 28h30v8H5Z" fill="#718b8d" /><path d="M8 28V11h24v17Z" />
          {kind === "sunplate-array" ? <><path d="m4 22 5-16h24l3 16Z" fill="#497e97" /><path d="m14 6-2 16m11-16-1 16M7 14h28" stroke="#9ad1d8" /></>
            : kind === "grid-cable" ? <path d="M4 20h32M20 5v30" fill="none" stroke="#d29d6b" strokeWidth="7" />
            : kind.includes("battery") ? <><path d="M12 15h5v13h-5Zm11 0h5v13h-5Z" fill="#73c9b1" /><path d="m20 10-4 8h6l-4 9" fill="#edd084" /></>
            : kind === "charging-pedestal" ? <><path d="M14 5h12v19H14Z" fill="#e3dcc0" /><path d="m22 8-5 8h6l-5 7" fill="#edc768" /></>
            : kind === "wind-rotor" || kind === "waterwheel-generator" || kind === "hand-dynamo" || kind === "precision-sawmill" ? <><circle cx="20" cy="17" r="11" fill={kind === "precision-sawmill" ? "#c8d4d1" : "#b99c6b"} /><path d="M20 6v22M9 17h22m-19-8 16 16m0-16L12 25" fill="none" /><circle cx="20" cy="17" r="3" fill="#608c8b" />{kind === "hand-dynamo" && <path d="M20 17h14v-6" fill="none" />}</>
            : kind === "plate-press" ? <path d="M11 8h18v5H11Zm9 5v9m-8 0h16v5H12Z" fill="#d0b679" />
            : kind === "fluid-pump" ? <path d="M11 27V16q0-8 9-8t9 8v11m-9-4v-8m-4 4 4-4 4 4" fill="none" stroke="#acd3d0" strokeWidth="3" />
            : kind === "enrichment-mill" ? <path d="M20 7q-14 14-7 19t14-2Q29 20 20 7Z" fill="#8bd1d7" />
            : kind === "powered-crusher" ? <><circle cx="15" cy="19" r="6" fill="#a8b8b4" /><circle cx="26" cy="19" r="6" fill="#d8bf89" /></>
            : kind === "alloy-infuser" ? <path d="M12 10v10q0 10 8 10t8-10V10m-16 9h16" fill="#caaf80" />
            : <><path d="M10 15h20v14H10Z" fill="#394b50" /><path d="m16 25 4-13 5 13Z" fill={kind === "biofuel-engine" ? "#a3cd77" : "#eba469"} /></>}
          <circle cx="10" cy="32" r="1.5" fill="#8de2c5" stroke="none" /></>
        : item === Item.IronSheet || item === Item.CopperSheet ? <><path d="m6 15 22-7 8 16-22 8Z" /><path d="m6 20 8 16 22-8" fill="none" stroke="#cbbfa2" /></>
        : item === Item.MachineAlloy ? <><path d="m7 17 9-9 17 5-4 16-19 3Z" /><path d="m7 17 18 5 8-9M25 22l4 7" fill="none" stroke="#ddc58e" /></>
        : item === Item.BiofuelPellet ? <>{[9, 18, 27].map(x => <rect key={x} x={x - 3} y={x === 18 ? 10 : 17} width="9" height="18" rx="4" fill="#73916a" />)}</>
        : item === Item.Sawdust || item === Item.StoneDust ? <><path d="M5 31 13 15l9-5 14 21Z" /><path d="m12 26 4-3m5 4 4-5m0-5 3 3" fill="none" /></>
        : <><path d="m6 24 5-14 12-5 11 13-8 15-15 1Z" /><path d="m11 10 9 10 14-2m-14 2 6 13M6 24l14-4" fill="none" stroke={item === Item.EnrichedIron ? "#e0d3ad" : "#879892"} /></>}
    </g>
  </svg>;
}
