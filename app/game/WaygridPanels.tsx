"use client";

import { useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { ItemCode } from "./data";

export type WaygridItemEntry = Readonly<{
  signature: string;
  item: ItemCode;
  name: string;
  count: number;
  color: string;
}>;

export type WaygridCreatureEntry = Readonly<{
  orbId: string;
  kind: string;
  name: string;
  health: number;
  maxHealth: number;
  tamed: boolean;
  baby: boolean;
  fainted: boolean;
  attuned: boolean;
}>;

type Utilization = Readonly<{ used: number; capacity: number; percentage: number; label: string }>;

type SharedProps = Readonly<{
  onClose: () => void;
  onDepositSelected: () => void;
  inventory?: ReactNode;
  feedback?: string;
}>;

export type WaygridItemPanelProps = SharedProps & Readonly<{
  entries: readonly WaygridItemEntry[];
  utilization: Utilization;
  cellCounts: readonly [number, number, number];
  onWithdraw: (signature: string, count: number) => void;
}>;

export type WaygridCreaturePanelProps = SharedProps & Readonly<{
  entries: readonly WaygridCreatureEntry[];
  utilization: Utilization;
  cellCounts: readonly [number, number, number];
  healProgress: number;
  onWithdraw: (orbId: string) => void;
  renderPortrait?: (kind: string) => ReactNode;
}>;

function CapacityFooter({ utilization, exact, onToggle }: Readonly<{ utilization: Utilization; exact: boolean; onToggle: () => void }>) {
  const percentage = Math.max(0, Math.min(100, utilization.percentage));
  return (
    <footer className="waygrid-capacity">
      <button type="button" onClick={onToggle} aria-label={exact ? "Show percentage used" : "Show exact item capacity"}>
        <span>{exact ? utilization.label : `${Math.round(percentage)}% / 100% filled`}</span>
        <small>{exact ? "press for ratio" : "press for exact count"}</small>
      </button>
      <span className="waygrid-capacity-track" aria-hidden="true"><i style={{ width: `${percentage}%` }} /></span>
    </footer>
  );
}

function CellLedger({ counts }: Readonly<{ counts: readonly [number, number, number] }>) {
  return (
    <div className="waygrid-cells" aria-label={`${counts.reduce((sum, count) => sum + count, 0)} connected memory cells`}>
      {counts.map((count, index) => <span key={index} data-tier={index + 1}><i />T{index + 1}<b>{count}</b></span>)}
    </div>
  );
}

function PanelHeader({ title, eyebrow, onClose, children }: Readonly<{ title: string; eyebrow: string; onClose: () => void; children?: ReactNode }>) {
  const titleId = useId();
  return (
    <header className="waygrid-header">
      <div><span>{eyebrow}</span><h2 id={titleId}>{title}</h2></div>
      {children}
      <button type="button" className="panel-close" onClick={onClose} aria-label={`Close ${title}`}>×</button>
    </header>
  );
}

export function WaygridItemPanel({ entries, utilization, cellCounts, onClose, onDepositSelected, onWithdraw, inventory, feedback }: WaygridItemPanelProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [exact, setExact] = useState(false);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return entries.filter((entry) => !needle || entry.name.toLocaleLowerCase().includes(needle));
  }, [entries, query]);
  return (
    <section className="menu-overlay inventory-overlay waygrid-overlay" role="dialog" aria-modal="true" aria-label="Waygrid Vault">
      <div className="mc-window waygrid-window item-waygrid-window">
        <PanelHeader title="Waygrid Vault" eyebrow="50 J / ITEM TRANSFER · ADJACENT POWER REQUIRED" onClose={onClose}>
          <CellLedger counts={cellCounts} />
        </PanelHeader>
        <div className="waygrid-toolbar">
          <label htmlFor={searchId}><span>Find an item</span><input id={searchId} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the whole network…" autoComplete="off" /></label>
          <button type="button" onClick={onDepositSelected}>Deposit selected stack</button>
          {feedback && <p className="waygrid-feedback" role="status" aria-live="polite">{feedback}</p>}
        </div>
        <div className="waygrid-item-list" aria-live="polite">
          {filtered.map((entry) => (
            <article key={entry.signature} className="waygrid-item-row">
              <span className="waygrid-item-glyph" style={{ "--item-color": entry.color } as CSSProperties}><i /></span>
              <div><strong>{entry.name}</strong><small>{entry.count.toLocaleString()} stored</small></div>
              <button type="button" onClick={() => onWithdraw(entry.signature, 1)}>Take 1</button>
              <button type="button" onClick={() => onWithdraw(entry.signature, Math.min(64, entry.count))}>Take stack</button>
            </article>
          ))}
          {!filtered.length ? <div className="waygrid-empty"><span>⌁</span><strong>No matching signal</strong><p>{entries.length ? "Try another item name." : "Deposit a stack to wake this network."}</p></div> : null}
        </div>
        <CapacityFooter utilization={utilization} exact={exact} onToggle={() => setExact((value) => !value)} />
        {inventory}
      </div>
    </section>
  );
}

export function WaygridCreaturePanel({ entries, utilization, cellCounts, healProgress, onClose, onDepositSelected, onWithdraw, renderPortrait, inventory, feedback }: WaygridCreaturePanelProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [exact, setExact] = useState(false);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return entries.filter((entry) => !needle || entry.name.toLocaleLowerCase().includes(needle) || entry.kind.toLocaleLowerCase().includes(needle));
  }, [entries, query]);
  return (
    <section className="menu-overlay inventory-overlay waygrid-overlay creature-waygrid-overlay" role="dialog" aria-modal="true" aria-label="Creature Archive">
      <div className="mc-window waygrid-window">
        <PanelHeader title="Creature Archive" eyebrow="500 J / ORB TRANSFER · ADJACENT POWER REQUIRED" onClose={onClose}>
          <CellLedger counts={cellCounts} />
        </PanelHeader>
        <div className="waygrid-toolbar">
          <label htmlFor={searchId}><span>Find a creature</span><input id={searchId} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names or species…" autoComplete="off" /></label>
          <button type="button" onClick={onDepositSelected}>Archive selected orb</button>
          {feedback && <p className="waygrid-feedback" role="status" aria-live="polite">{feedback}</p>}
        </div>
        <div className="waygrid-creature-list" aria-live="polite">
          {filtered.map((entry) => {
            const health = entry.maxHealth > 0 ? Math.max(0, Math.min(100, entry.health / entry.maxHealth * 100)) : 0;
            return (
              <article key={entry.orbId} className="waygrid-creature-card" data-fainted={entry.fainted}>
                <div className="waygrid-creature-portrait">{renderPortrait?.(entry.kind) ?? <span>{entry.kind.slice(0, 1).toLocaleUpperCase()}</span>}</div>
                <div className="waygrid-creature-copy"><small>{entry.kind.replaceAll("-", " ")}</small><strong>{entry.name}</strong><span>{entry.tamed ? "TAMED" : "WILD"}{entry.baby ? " · YOUNG" : ""}{entry.attuned ? " · ATTUNED" : ""}</span></div>
                <div className="waygrid-creature-health"><span><i style={{ width: `${health}%` }} /></span><b>{Math.ceil(entry.health)}/{Math.ceil(entry.maxHealth)}</b><small>{entry.fainted ? "FAINTED · RECOVERING" : health >= 100 ? "READY" : `NEXT PULSE ${Math.round(healProgress * 100)}%`}</small></div>
                <button type="button" onClick={() => onWithdraw(entry.orbId)}>Withdraw orb</button>
              </article>
            );
          })}
          {!filtered.length ? <div className="waygrid-empty"><span>◇</span><strong>No archived creatures</strong><p>Deposit a filled, undeployed Capture Orb. Archived creatures heal slowly over time.</p></div> : null}
        </div>
        <CapacityFooter utilization={utilization} exact={exact} onToggle={() => setExact((value) => !value)} />
        {inventory}
      </div>
    </section>
  );
}
