"use client";

import { ITEMS, type InventorySlot } from "./data";
import { gearCapacity, lifeSupportStore, sourceOxygen, type LifeSupportHud, type LifeSupportOperation } from "./life-support";

export function LifeSupportIcon({ item, small = false }: { item: number; small?: boolean }) {
  const kind = ITEMS[item]?.lifeSupportKind;
  const twin = kind === "harness" || kind === "rig" || kind === "spell-rig";
  return <svg className={`item-icon life-support-icon ${small ? "small" : ""}`} viewBox="0 0 40 40" aria-hidden="true" data-item-id={item}>
    <g fill={ITEMS[item]?.color ?? "#bbc8ce"} stroke="#26363c" strokeWidth="2" strokeLinejoin="round">
      {kind === "helmet" ? <><path d="M8 29V17a12 12 0 0 1 24 0v12l-5 5H13Z" /><path d="M11 15h18v12H11Z" fill="#315c70" /><path d="m13 18 9-2" stroke="#b8e6e3" /><path d="M8 29h24v5H8Z" fill="#b79b62" /></>
        : kind === "weave" && ITEMS[item].equipmentSlot === "legs" ? <path d="M9 5h22v30H22V19h-4v16H9Z" />
        : kind === "weave" && ITEMS[item].equipmentSlot === "feet" ? <><path d="M7 9h10v17l4 4v5H5V25Zm16 0h10v17l4 4v5H23Z" /><path d="M5 30h16M23 30h14" stroke="#a6c5bd" /></>
        : kind === "weave" ? <path d="m12 5-8 7 5 8 4-3v19h14V17l4 3 5-8-8-7-8 4Z" />
        : kind === "boots" ? <><path d="M7 8h10v19l5 3v6H5V24Zm16 0h10v19l5 3v6H23Z" /><path d="M5 31h17M23 31h15" stroke="#d4b968" strokeWidth="4" /></>
        : kind === "tether" ? <><circle cx="19" cy="19" r="12" /><circle cx="19" cy="19" r="6" fill="#283d44" /><path d="M29 12q9 5 2 18l4 5h-7" fill="none" stroke="#d4b968" strokeWidth="3" /></>
        : kind === "cell" ? <><rect x="10" y="8" width="20" height="28" rx="3" /><path d="M16 3h8v5h-8Z" /><path d="m23 12-8 11h7l-3 10 9-13h-8Z" fill="#e4bd58" /></>
        : kind === "scrubber" ? <><rect x="9" y="7" width="22" height="28" rx="4" /><path d="M13 13h14M13 19h14M13 25h14M13 31h14" stroke="#799894" strokeWidth="3" /></>
        : <>{(twin ? [7, 23] : [13]).map(x => <g key={x}><rect x={x} y="9" width="11" height="26" rx="5" /><path d={`M${x + 4} 4h4v5h-4Z`} fill="#bc9b55" /><path d={`M${x} 17h11M${x} 28h11`} stroke="#bc9b55" strokeWidth="3" /></g>)}{twin && <path d="M18 14h5v16h-5Z" fill="#5b696b" />}{(kind === "rig" || kind === "spell-rig") && <path d="m5 31-3 6h10l-2-6m17 0-2 6h11l-4-6" fill={kind === "spell-rig" ? "#a891e5" : "#70838b"} />}</>}
    </g>
  </svg>;
}

export function LifeSupportPanel({ back, cursor, onAction }: { back: InventorySlot | null; cursor: InventorySlot | null; onAction: (op: LifeSupportOperation) => void }) {
  if (!back || !ITEMS[back.item]?.lifeSupportKind) return <p className="life-support-help">Back gear leaves chest armor free. Wear a sealed helmet plus a filled O2 source outside breathable air.</p>;
  const store = lifeSupportStore(back), cap = gearCapacity(back.item), oxygen = sourceOxygen(back);
  return <section className="life-support-panel" aria-label="Life support equipment controls">
    <header><LifeSupportIcon item={back.item} small /><strong>{ITEMS[back.item].name}</strong></header>
    <p>{(oxygen.amount / 1000).toFixed(1)} / {(oxygen.capacity / 1000).toFixed(0)} L O2 · {Math.ceil(store.energyJ / 1000)} kJ · scrubber {Math.ceil(store.scrubberSeconds)}s</p>
    {store.sockets.map((tank, index) => <div className="life-support-socket" key={index}>
      <button type="button" onClick={() => onAction({ kind: "socket", index })} aria-label={`Exchange O2 socket ${index + 1}`}>
        {tank ? <LifeSupportIcon item={tank.item} small /> : <span aria-hidden="true">＋</span>}<span>SOCKET {index + 1}<small>{tank ? `${ITEMS[tank.item].name} · ${(sourceOxygen(tank).amount / 1000).toFixed(1)} L` : "Empty · carry a tank on cursor"}</small></span>
      </button>
      <button type="button" onClick={() => onAction({ kind: "refill", index })}>Fill {index + 1}</button>
    </div>)}
    <div className="life-support-actions">{cap.oxygenMl > 0 && <button type="button" onClick={() => onAction({ kind: "refill", index: -1 })}>Transfer up to 120 L</button>}
      {(cap.energyJ > 0 || cap.scrubberSeconds > 0) && <button type="button" onClick={() => onAction({ kind: "service" })}>Transfer cell / scrubber</button>}</div>
    <small>Cursor: {cursor ? ITEMS[cursor.item]?.name : "empty"}. Refill transfers from a finite Sealed Field O2 Reserve. Empty supplies stay empty. Vacuum socket swaps take 1.5s after resuming play.</small>
  </section>;
}

type EvaDisplay = { boots: boolean; contact: boolean; thrust: boolean; tether: number | null; stableUp: boolean; armed?: boolean };
export function LifeSupportDisplay({ state, eva, control, reel }: { state?: LifeSupportHud; eva?: EvaDisplay; control: (key: "thrust" | "boots" | "tether" | "comfort" | "cargo") => void; reel: (held: boolean) => void }) {
  if (!state?.relevant) return null;
  const seconds = Math.max(0, Math.ceil(state.secondsRemaining));
  return <aside className={`life-support-hud level-${state.level}`} aria-label="Oxygen and EVA status">
    <div className="life-support-heading"><b>O₂</b><strong>{state.level === "safe" ? "●" : "⚠"} {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</strong><span>{state.oxygenLiters.toFixed(1)} L</span></div>
    <meter aria-label="Oxygen reserve" min={0} max={Math.max(1, state.capacityLiters)} value={state.oxygenLiters} />
    <small>{state.source}</small><strong className="life-support-status" role="status">{state.status}{state.swapSeconds > 0 ? ` · ${state.swapSeconds.toFixed(1)}s` : ""}</strong>
    <span>Seal {state.sealed ? "closed" : "OPEN"} · scrubber {state.scrubber} · leak ×{(1 + state.leak).toFixed(1)}</span>
    {state.hazards.length > 0 && <b role="alert">⚠ {state.hazards.join(" / ")}</b>}
    {eva && <div className="eva-controls" aria-label="EVA controls">
      <button type="button" aria-pressed={eva.armed} onClick={() => control("thrust")}>I · Thrust {eva.thrust ? "FIRING" : eva.armed ? "armed" : "off"}</button>
      <button type="button" aria-pressed={eva.boots} onClick={() => control("boots")}>N · Boots {eva.contact ? "LOCKED" : eva.boots ? "hold Shift" : "off"}</button>
      <button type="button" onClick={() => control("tether")}>T · {eva.tether === null ? "Anchor" : `Release ${eva.tether.toFixed(1)}m`}</button>
      <button type="button" onClick={() => control("cargo")}>O · Cargo 6m</button>
      {eva.tether !== null && <button type="button" onPointerDown={() => reel(true)} onPointerUp={() => reel(false)} onPointerLeave={() => reel(false)} onKeyDown={event => { if (event.key === " " || event.key === "Enter") reel(true); }} onKeyUp={() => reel(false)}>Y · Hold to reel</button>}
      <button type="button" aria-pressed={eva.stableUp} onClick={() => control("comfort")}>U · {eva.stableUp ? "Stable up" : "Roll [ / ]"}</button>
    </div>}
  </aside>;
}
