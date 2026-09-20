"use client";
import { BlockId, Item, ITEMS, type ItemCode } from "./data";
import { pressureMachineKind } from "./pressure-catalog";
import { machineKindForBlock } from "./wayworks-integration";

export const hasPressureIcon = (item: ItemCode) => item >= Item.HabitatFilter && item <= Item.PressurePolymer
  || item === BlockId.ReinforcedWindow || item === BlockId.HangarFrame || pressureMachineKind(machineKindForBlock(item) ?? "");

/** Forty-pixel diagrams emphasize ports, pressure boundaries and paired vessels. */
export function PressureIcon({ item, small = false }: { item: ItemCode; small?: boolean }) {
  const kind = machineKindForBlock(item) ?? "", filter = item === Item.HabitatFilter || item === Item.SpentHabitatFilter;
  return <svg className={`item-icon wayworks-icon ${small ? "item-icon-small" : ""}`} viewBox="0 0 40 40" aria-hidden="true" data-pressure-icon={kind || item}>
    <g fill={ITEMS[item]?.color ?? "#94aaa6"} stroke="#304649" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      {filter || kind === "carbon-scrubber" ? <><rect x="9" y="5" width="22" height="30" rx="3" fill={item === Item.SpentHabitatFilter ? "#817970" : "#c6cbb3"} /><path d="M14 11v18m6-18v18m6-18v18M8 8h24M8 32h24" fill="none" /><path d="M14 31h12" stroke={item === Item.SpentHabitatFilter ? "#c47f65" : "#79a98e"} /></>
        : item === Item.CarbonPowder ? <><path d="M7 17h26l-3 18H10Z" fill="#596264" /><path d="m9 17 6-9 5 4 6-5 6 10Z" fill="#283431" /><path d="M7 19h26" stroke="#d4b477" /></>
        : item === Item.CeramicMembrane || item === BlockId.ReinforcedWindow || item === BlockId.HangarFrame ? <><rect x="5" y="4" width="30" height="32" fill={item === BlockId.HangarFrame ? "none" : "#b4d2d4"} /><path d="M9 8h22v24H9Z" fill="none" stroke="#d4b477" />{item === Item.CeramicMembrane && <path d="M14 9v22m6-22v22m6-22v22M9 15h22M9 23h22" fill="none" />}</>
        : item === Item.PressurePolymer ? <><path d="m6 12 22-5 7 20-22 6Z" fill="#a2bdaf" /><path d="m8 17 22-5M10 23l22-5M17 10l7 20" fill="none" stroke="#d4b477" /></>
        : ["liquid-pipe", "gasline", "heat-conduit"].includes(kind) ? <><path d="M3 16h13V3h8v13h13v8H24v13h-8V24H3Z" fill={kind === "gasline" ? "#9cbd9e" : kind === "heat-conduit" ? "#bd8059" : "#6aaeb8"} /><path d="M6 13v14M13 6h14M34 13v14M13 34h14" stroke="#d4b477" /></>
        : /door|gate|shutter/.test(kind) ? <><path d="M5 36V4h30v32" fill="#839597" /><path d="M10 36V9h20v27M20 9v27" fill="#34474a" /><path d="M13 16h4m6 0h4M13 25h14" stroke="#d4b477" />{kind === "emergency-shutter" && <path d="M10 12h20M10 20h20M10 28h20" stroke="#c28468" />}</>
        : /controller|sensor/.test(kind) ? <><rect x="5" y="6" width="30" height="29" rx="3" /><rect x="10" y="11" width="20" height="13" fill="#34474a" /><path d="m12 18 4-3 4 6 3-4h5" fill="none" stroke="#9ad5b1" /><circle cx="13" cy="29" r="2" fill="#d4b477" /><path d="M20 29h9" /></>
        : /vent/.test(kind) ? <><rect x="5" y="7" width="30" height="27" rx="3" />{[12, 18, 24, 30].map(y => <path key={y} d={`M10 ${y}h20`} />)}<path d="m17 3 3 3 3-3m-6 34 3-3 3 3" fill="none" stroke="#88ad9c" /></>
        : /turbine|engine|reformer|regulator/.test(kind) ? <><rect x="5" y="9" width="30" height="27" /><circle cx="20" cy="22" r="10" fill="#34474a" /><path d="M20 12v20M10 22h20m-17-7 14 14m0-14L13 29" stroke={kind === "thermal-regulator" ? "#bd8059" : "#d4b477"} /><path d="M9 9V4h7v5m8 0V4h7v5" /></>
        : <><path d="M4 33h32v4H4Z" fill="#34474a" /><rect x="7" y="8" width="11" height="25" rx="4" fill="#b4d2d4" /><rect x="23" y="8" width="11" height="25" rx="4" fill="#9cbd9e" /><path d="M12 8V3h16v5M7 23h11m5-5h11M18 28h5" fill="none" stroke="#d4b477" /><circle cx="20" cy="14" r="3" fill="#d1c9af" /></>}
    </g>
  </svg>;
}
