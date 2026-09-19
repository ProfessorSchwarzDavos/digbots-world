"use client";

import { useId, type KeyboardEvent } from "react";

export type WayworksFace = "front" | "back" | "left" | "right" | "top" | "bottom";
export type WayworksPortMode = "disabled" | "input" | "output" | "both";
export type WayworksPanelAction =
  | { kind: "port"; face: WayworksFace; mode: WayworksPortMode }
  | { kind: "rotate" }
  | { kind: "toggle" }
  | { kind: "crank" }
  | { kind: "charge" };

export type WayworksPanelProps = Readonly<{
  name: string;
  kind: string;
  energyJ: number;
  capacityJ: number;
  rateW: number;
  status: string;
  revision: number;
  facing: number;
  enabled: boolean;
  ports: Record<WayworksFace, WayworksPortMode>;
  heldItemName?: string;
  onAction: (action: WayworksPanelAction) => void;
  onClose: () => void;
}>;

const faces: readonly WayworksFace[] = ["front", "back", "left", "right", "top", "bottom"];
const modes: readonly [WayworksPortMode, string][] = [
  ["disabled", "Disabled"], ["input", "Input"], ["output", "Output"], ["both", "Input + output"],
];
const directions = ["North", "East", "South", "West"] as const;
const quantity = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });

function reading(value: number, divisor = 1): string {
  return Number.isFinite(value) ? quantity.format(value / divisor) : "Unavailable";
}

/** Displays authoritative props; actions are requests and never change machine state locally. */
export function WayworksPanel(props: WayworksPanelProps) {
  const id = useId();
  const { name, kind, energyJ, capacityJ, rateW, status, revision, facing, enabled, ports, heldItemName, onAction, onClose } = props;
  const validGauge = Number.isFinite(energyJ) && Number.isFinite(capacityJ) && capacityJ > 0;
  const fill = validGauge ? Math.min(100, Math.max(0, energyJ / capacityJ * 100)) : 0;
  const direction = Number.isInteger(facing) ? directions[facing] : undefined;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
    if (event.key !== "Tab") return;
    const controls = event.currentTarget.querySelectorAll<HTMLButtonElement | HTMLSelectElement>("button:not(:disabled), select:not(:disabled)");
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && event.target === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && event.target === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <div className="ww-overlay" onPointerDown={(event) => event.stopPropagation()} onKeyUp={(event) => event.stopPropagation()}>
      <section className="ww-panel" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} onKeyDown={handleKeyDown} data-wayworks-kind={kind} data-wayworks-revision={revision}>
        <header className="ww-header">
          <div className="ww-heading">
            <p className="ww-eyebrow">Wayworks / machine inspector</p>
            <h2 id={`${id}-title`}>{name}</h2>
          </div>
          <button className="ww-close" type="button" onClick={onClose} aria-label="Close machine inspector" autoFocus>×</button>
        </header>

        <div className="ww-body">
          <div className="ww-state-line">
            <span className="ww-switch-state">{enabled ? "Enabled" : "Disabled"}</span>
            <span>Front faces {direction ?? "unknown"}</span>
          </div>
          <p className="ww-status" role="status">{status || "Status unavailable"}</p>

          <dl className="ww-readings">
            <div><dt>Stored energy</dt><dd>{reading(energyJ, 1_000)} <span>kJ</span></dd></div>
            <div><dt>Capacity</dt><dd>{reading(capacityJ, 1_000)} <span>kJ</span></dd></div>
            <div><dt>Power rate</dt><dd>{reading(rateW)} <span>W</span></dd></div>
          </dl>
          <div className="ww-gauge" role="meter" aria-label="Stored energy" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fill} aria-valuetext={validGauge ? `${reading(energyJ, 1_000)} of ${reading(capacityJ, 1_000)} kJ` : "Storage gauge unavailable"}>
            <span className="ww-gauge-fill" style={{ width: `${fill}%` }} />
          </div>

          <fieldset className="ww-ports">
            <legend>Energy ports</legend>
            <p className="ww-help">Faces are relative to the machine. Rotate to change their world direction.</p>
            <div className="ww-port-list">
              {faces.map((face) => (
                <label className="ww-port" key={face} htmlFor={`${id}-${face}`}>
                  <span>{face[0].toUpperCase() + face.slice(1)}</span>
                  <select id={`${id}-${face}`} aria-label={`${face[0].toUpperCase() + face.slice(1)} energy port`} value={ports[face]} onChange={(event) => onAction({ kind: "port", face, mode: event.currentTarget.value as WayworksPortMode })}>
                    {modes.map(([mode, label]) => <option key={mode} value={mode}>{label}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>

          {kind === "hand-dynamo" && (
            <div className="ww-operation">
              <p className="ww-help">Turn the crank to add energy to this dynamo.</p>
              <button className="ww-primary" type="button" disabled={!enabled || (validGauge && energyJ >= capacityJ)} onClick={() => onAction({ kind: "crank" })}>Turn crank</button>
            </div>
          )}
          {kind === "charging-pedestal" && (
            <div className="ww-operation">
              <p className="ww-help">Transfer measured energy from this pedestal to the selected cell or rig.</p>
              <p className="ww-selected">Selected: {heldItemName || "Select a charge cell or rig in your hotbar"}</p>
              <button className="ww-primary" type="button" disabled={!enabled || energyJ <= 0} onClick={() => onAction({ kind: "charge" })}>Charge selected cell / rig</button>
            </div>
          )}

          <footer className="ww-controls">
            <button type="button" onClick={() => onAction({ kind: "rotate" })}>Rotate 90°</button>
            <button type="button" aria-pressed={enabled} onClick={() => onAction({ kind: "toggle" })}>{enabled ? "Disable machine" : "Enable machine"}</button>
          </footer>
        </div>
      </section>
    </div>
  );
}
