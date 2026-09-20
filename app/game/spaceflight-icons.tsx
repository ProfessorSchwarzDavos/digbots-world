"use client";
import { BlockId, Item, type ItemCode } from "./data";

export const hasSpaceflightIcon = (item: ItemCode) => item >= BlockId.LaunchPad && item <= Item.SurveyHopper;

/** Small, shape-coded counterparts of the actual brass/ceramic flight hardware. */
export function SpaceflightIcon({ item, small = false }: { item: ItemCode; small?: boolean }) {
  return <svg className={`item-icon wayworks-icon ${small ? "item-icon-small" : ""}`} viewBox="0 0 40 40" aria-hidden="true" data-spaceflight-icon={item}>
    <g fill="#e0d7bb" stroke="#344b50" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      {item === Item.SurveyHopper ? <><path d="m12 29-4 8m20-8 4 8M4 37h8m16 0h8" stroke="#839597" strokeWidth="3" /><path d="M11 29V15L16 4h8l5 11v14Z" /><path d="m12 14 4-5h8l4 5-2 6H14Z" fill="#78beca" /><path d="M10 29h20v3H10Zm7 3h6l3 4H14Z" fill="#c18a62" /><path d="M20 21v6" stroke="#c18a62" /></>
        : item === BlockId.LaunchPad ? <><path d="m3 21 15-12 19 11-14 14Z" fill="#839597" /><path d="m8 21 10-8 13 8-9 8Z" fill="#344b50" /><path d="m12 22 6-5 8 5m-8-5v9" fill="none" stroke="#e0d7bb" /><path d="m3 21 1 6 19 11 14-12v-6" fill="none" /></>
        : item === BlockId.FuelGantry ? <><path d="M4 36h32M25 35V6h9v5H19v13" fill="none" stroke="#839597" strokeWidth="4" /><rect x="5" y="18" width="8" height="16" rx="3" /><rect x="15" y="18" width="8" height="16" rx="3" /><path d="M6 23h6m4 0h6" stroke="#c18a62" /><path d="M19 11v8" stroke="#78beca" /></>
        : item === BlockId.MissionConsole ? <><path d="M9 37V24h23v13M4 29l4-20h25l3 20Z" /><path d="m10 13-2 11h22l-2-11Z" fill="#285d64" /><ellipse cx="19" cy="19" rx="8" ry="4" fill="none" stroke="#78beca" /><circle cx="19" cy="19" r="2" fill="#e0d7bb" /></>
        : item === BlockId.TrackingBeacon || item === BlockId.StationObservatory ? <><path d="M8 36h24M20 35V21" stroke="#839597" strokeWidth="4" />{item === BlockId.TrackingBeacon ? <><path d="M7 9q-1 22 21 19Z" /><path d="m17 19 13-13m-4 0h5v5" fill="none" stroke="#c18a62" /></> : <><path d="m7 15 21-8 5 12-22 7Z" /><path d="m28 7 5 12 4-1-5-13Z" fill="#78beca" /></>}</>
        : item === BlockId.OrbitalDock ? <><path d="M6 36h28M11 35V23m18 12V23" stroke="#839597" strokeWidth="4" /><circle cx="20" cy="17" r="13" fill="#c18a62" /><circle cx="20" cy="17" r="9" fill="#344b50" /><path d="M20 3v6M7 22l6-3m14 0 6 3" stroke="#e0d7bb" strokeWidth="3" /></>
        : item === BlockId.RecoveryCrane ? <><path d="M4 36h17M11 35V5h22v6H11" fill="none" stroke="#839597" strokeWidth="4" /><path d="M30 11v12q-8-2-5 5t8-2" fill="none" stroke="#c18a62" strokeWidth="3" /></>
        : item === BlockId.StationTruss ? <><path d="M7 4h26v32H7Z" fill="none" strokeWidth="3" /><path d="m7 4 26 32M33 4 7 36M7 20h26" fill="none" stroke="#c18a62" /></>
        : item === BlockId.StationRadiator ? <><path d="M18 3h4v34h-4ZM3 7h12v27H3Zm22 0h12v27H25Z" />{[12, 18, 24, 30].map(y => <path key={y} d={`M4 ${y}h10m12 0h10`} stroke="#c18a62" />)}</>
        : <><path d="M7 5h26v31H7Z" /><path d="M4 4h32v5H4Zm0 28h32v8H4Z" fill="#c18a62" /><circle cx="20" cy="19" r="8" fill="#285d64" /><path d="M20 13v12m-6-6h12" stroke="#78beca" /></>}
    </g>
  </svg>;
}
