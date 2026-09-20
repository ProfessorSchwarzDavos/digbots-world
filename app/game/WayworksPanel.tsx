"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { itemName } from "./data";
import { machineSlots } from "./wayworks-machines";
import { machineRecipes, recipeCost } from "./wayworks-recipes";
import { createWorkshop, MATERIAL_PORT_MODES, UPGRADE_KINDS, supportedWorkshopUpgrades, workshopFluidCapacity, workshopGasCapacity,
  type MaterialKind, type MaterialPortMode, type WorkshopState } from "./wayworks-stores";
import type { MachineKind } from "./wayworks";
import type { WorkshopAction } from "./wayworks-integration";
import { PressurePanel } from "./PressurePanel";
import type { PressureRuntime } from "./pressure-runtime";
import { SpaceflightPanel } from "./SpaceflightPanel";
import type { SpaceflightIntent, SpaceflightMission } from "./spaceflight-mission";
import { CelestialChart } from "./CelestialChart";
import type { CelestialChartProjection } from "./celestial-chart";

export type WayworksFace = "front" | "back" | "left" | "right" | "top" | "bottom";
export type WayworksPortMode = "disabled" | "input" | "output" | "both" | "passive" | "pull" | "service";
export type WayworksPanelAction = WorkshopAction;

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
  feedback?: string;
  workshop?: WorkshopState;
  pressureOnly?: boolean;
  radiatorBoundary?: "room" | "exterior" | "unknown";
  observatoryCharts?: { system: CelestialChartProjection; orbit: CelestialChartProjection } | null;
  asteroidSurvey?: { level: number; count: number; epoch: number; registryRevision: number; shared: boolean } | null;
  pressure?: ReturnType<PressureRuntime["diagnosticsFor"]>;
  flight?: SpaceflightMission;
  onFlightAction?: (action: SpaceflightIntent) => void;
  network?: { id: string; count: number; energyJ: number; capacityJ: number; revision: number };
  onAction: (action: WayworksPanelAction) => void;
  onClose: () => void;
  onInspectResource?: (resource: "energy" | MaterialKind) => void;
}>;

const faces: readonly WayworksFace[] = ["front", "back", "left", "right", "top", "bottom"];
const modes: readonly [WayworksPortMode, string][] = [
  ["disabled", "Disabled"], ["input", "Input"], ["output", "Output"], ["both", "Input + output"],
  ["passive", "Passive"], ["pull", "Pull"], ["service", "Service"],
];
const directions = ["North", "East", "South", "West"] as const;
const quantity = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });

function reading(value: number, divisor = 1): string {
  return Number.isFinite(value) ? quantity.format(value / divisor) : "Unavailable";
}

/** Displays authoritative props; actions are requests and never change machine state locally. */
export function WayworksPanel(props: WayworksPanelProps) {
  const id = useId();
  const [resource, setResource] = useState<"energy" | MaterialKind>("energy");
  const [confirmVent, setConfirmVent] = useState(false);
  const [trustedActor, setTrustedActor] = useState("");
  const { name, kind, energyJ, capacityJ, rateW, status, revision, facing, enabled, ports, heldItemName, onAction, onClose } = props;
  const workshop = props.workshop ?? createWorkshop();
  const slots = machineSlots(kind as MachineKind), recipes = machineRecipes(kind as MachineKind);
  const fluidCapacity = workshopFluidCapacity(kind as MachineKind, workshop), gasCapacity = workshopGasCapacity(kind as MachineKind, workshop);
  const progress = workshop.cycle ? workshop.cycle.progressMs / workshop.cycle.durationMs * 100 : 0;
  const supported = supportedWorkshopUpgrades(kind as MachineKind);
  const moduleKinds = UPGRADE_KINDS.filter(upgrade => supported.includes(upgrade) || workshop.upgrades[upgrade] > 0);
  const passiveTank = kind === "fluid-tank" || kind === "gas-tank";
  const thermalLimitKw = (props.radiatorBoundary === "exterior" ? 8 : props.radiatorBoundary === "room" ? 2 : 0) * (1 + workshop.upgrades.thermal);
  const statusLabels: Record<string, string> = { idle: "Idle", disabled: "Disabled", "no-power": "Waiting for power", "no-input": kind === "station-radiator" ? "No stored heat to reject" : "Waiting for ingredients", "no-fuel": kind === "heat-engine" ? "Waiting for fuel or supplied heat" : "Waiting for fuel",
    "output-blocked": "Output full or incompatible", "no-water": kind === "waterwheel-generator" ? "Needs flowing water beside the wheel" : "Needs a water source directly below", "no-sun": "No sunlight reaching panel", "no-wind": "No usable wind / rotor obstructed",
    "control-off": "Stopped by control signal", "heat-limited": kind === "station-radiator" ? "Thermal boundary unverified; heat retained" : "Cooling before next cycle", "buffer-full": "Storage full", working: kind === "station-radiator" ? "Rejecting stored heat" : "Processing", generating: "Generating power", transferring: "Transferring power" };
  const validGauge = Number.isFinite(energyJ) && Number.isFinite(capacityJ) && capacityJ > 0;
  const fill = validGauge ? Math.min(100, Math.max(0, energyJ / capacityJ * 100)) : 0;
  const direction = Number.isInteger(facing) ? directions[facing] : undefined;
  const feedbackLabels: Record<string, string> = {
    "invalid-transfer": "Nothing compatible is available to transfer.", backpressure: "The destination is full or contains a different resource.",
    "cycle-reserved": "Finish or cancel the active cycle before taking its ingredients.", "stale-revision": "Machine changed; inspect it again.",
    "filtered-item": "The selected item does not match this machine's filter.",
  };
  const feedback = props.feedback && props.feedback !== "ok" ? feedbackLabels[props.feedback] ?? props.feedback : "";

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), select:not(:disabled), input:not(:disabled), summary")]
      .filter((element) => element.getClientRects().length > 0);
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
        {feedback && <p className="ww-feedback" role="status" aria-live="polite">{feedback}</p>}

        <div className="ww-body">
          {kind === "station-observatory" && <section aria-label="Observatory chart reader">
            <p className="ww-help">Read the first-flight chart for Waystar, Blockwild and Morrow, plus your current body. This snapshot includes only authorized local station points. Reading consumes 1 kJ and transfers it to the instrument heat buffer; no travel or hidden-world discovery is granted.</p>
            <button type="button" disabled={!enabled || energyJ < 1000 || !props.onFlightAction} onClick={() => props.onFlightAction?.({ kind: "observatory-read" })}>Read first-flight chart · 1 kJ</button>
            {props.asteroidSurvey && <div className="ww-field-survey" aria-label="Finite asteroid field survey">
              <p className="ww-help">Field extent {props.asteroidSurvey.level} / 3 · {props.asteroidSurvey.count} asteroids. A survey adds one finite ring, preserves existing claims and excavations, and reloads the local view after saving. The world stays paused until you resume. It grants no ownership or ore.</p>
              <button type="button" disabled={!enabled || energyJ < 1000 || !props.onFlightAction || props.asteroidSurvey.shared || props.asteroidSurvey.level >= 3}
                onClick={() => props.onFlightAction?.({ kind: "asteroid-survey", epoch: props.asteroidSurvey!.epoch, registryRevision: props.asteroidSurvey!.registryRevision })}>
                {props.asteroidSurvey.level >= 3 ? "Field fully surveyed" : "Survey next ring and reload · 1 kJ"}</button>
              {props.asteroidSurvey.shared && <p className="ww-help">Close the shared session to survey. Shared-session field reload is not available yet.</p>}
            </div>}
            {props.observatoryCharts && <CelestialChart charts={props.observatoryCharts} initialMode="orbit" />}
          </section>}
          {kind === "station-radiator" && <p className="ww-help">Thermal boundary: {props.radiatorBoundary ?? "unknown"}. Connect imported heat through a Heat Conduit. Exposed panels reject up to {8 * (1 + workshop.upgrades.thermal)} kW; indoor panels transfer up to {2 * (1 + workshop.upgrades.thermal)} kW into the measured room. No electricity or coolant is created or consumed. Unknown boundaries retain heat.</p>}
          {props.flight && props.onFlightAction && <SpaceflightPanel mission={props.flight} onAction={props.onFlightAction} />}
          <div className="ww-state-line">
            <span className="ww-switch-state">{enabled ? "Enabled" : "Disabled"}</span>
            <span>Front faces {direction ?? "unknown"}</span>
          </div>
          <p className="ww-status" role="status">{(statusLabels[status] ?? status.replaceAll("-", " ")) || "Status unavailable"}</p>

          {!passiveTank && <><dl className="ww-readings">
            <div><dt>Stored energy</dt><dd>{reading(energyJ, 1_000)} <span>kJ</span></dd></div>
            <div><dt>Capacity</dt><dd>{reading(capacityJ, 1_000)} <span>kJ</span></dd></div>
            <div><dt>{kind === "station-radiator" ? "Electrical port limit" : "Power rate"}</dt><dd>{reading(rateW)} <span>W</span></dd></div>
            {kind === "station-radiator" && <>
              <div><dt>Stored heat</dt><dd>{reading(workshop.heatJ, 1_000)} <span>kJ</span></dd></div>
              <div><dt>Thermal limit</dt><dd>{reading(thermalLimitKw)} <span>kW</span></dd></div>
            </>}
          </dl>
          <div className="ww-gauge" role="meter" aria-label="Stored energy" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fill} aria-valuetext={validGauge ? `${reading(energyJ, 1_000)} of ${reading(capacityJ, 1_000)} kJ` : "Storage gauge unavailable"}>
            <span className="ww-gauge-fill" style={{ width: `${fill}%` }} />
          </div></>}

          {props.network && !passiveTank && <p className="ww-help" data-network-id={props.network.id}>Grid segment: {props.network.count} blocks · {reading(props.network.energyJ, 1000)} / {reading(props.network.capacityJ, 1000)} kJ · topology {props.network.revision}</p>}
          <p className="ww-selected">Selected: {heldItemName || "Empty hand"}. Close the inspector to change hotbar slots. Simulation pauses while inspecting.</p>

          {props.pressureOnly ? <>
            <p className="ww-help">Pressure service only. Storage and machine configuration remain private.</p>
            <PressurePanel kind={kind as MachineKind} workshop={workshop} pressure={props.pressure} onAction={onAction} serviceOnly />
          </> : <>

          {slots.length > 0 && <section className="ww-materials" aria-label="Machine inventory">
            <h3>{slots.includes("fuel") ? "Fuel" : "Materials"}</h3>
            {slots.map((slot) => <div className="ww-slot" key={slot}>
              <div><span className="ww-slot-label">{slot}</span><strong>{workshop.slots[slot] ? `${workshop.slots[slot]!.count} × ${itemName(workshop.slots[slot]!.item)}` : "Empty"}</strong></div>
              <div className="ww-slot-actions">
                {slot !== "output" && slot !== "byproduct" && <button type="button" onClick={() => onAction({ kind: "slot", slot, direction: "insert", maximum: 64 })}>Deposit selected</button>}
                <button type="button" disabled={!workshop.slots[slot] || (!!workshop.cycle && (slot === "input" || slot === "reagent"))} onClick={() => onAction({ kind: "slot", slot, direction: "extract", maximum: 64 })}>Take</button>
              </div>
            </div>)}
            {slots.includes("fuel") && <p className="ww-help">{kind === "biofuel-engine" ? "Uses pressed Biofuel Pellets." : "Uses coal, charcoal or supplied heat. Four joules of heat produce one joule of electricity; the rest dissipates."} Unconverted fuel: {reading(workshop.burnJ, 1000)} kJ.</p>}
          </section>}

          {workshop.process && <PressurePanel kind={kind as MachineKind} workshop={workshop} pressure={props.pressure} onAction={onAction} />}
          {(fluidCapacity > 0 || gasCapacity > 0) && <section className="ww-materials" aria-label="Measured resource storage">
            <h3>{gasCapacity ? "Gas storage" : "Fluid storage"}</h3>
            {!workshop.process && <p className="ww-resource-reading">{reading((gasCapacity ? workshop.chemical : workshop.fluid)?.amount ?? 0, 1000)} / {reading(gasCapacity || fluidCapacity, 1000)} {gasCapacity ? "standard L" : "L"} <span>{(gasCapacity ? workshop.chemical : workshop.fluid)?.resource ?? "empty"}</span></p>}
            {gasCapacity > 0 && !workshop.process && <p className="ww-help">Pressure: {reading(101.325 * (workshop.chemical?.amount ?? 0) / (20000 * (1 + workshop.upgrades.capacity)))} kPa · rated {reading(607.95 * (1 + workshop.upgrades.seal))} kPa. Sealed pickup preserves contents.</p>}
            <div className="ww-inline-actions"><button type="button" onClick={() => onAction({ kind: "portable", direction: "fill" })}>Fill selected container · 1 L</button><button type="button" onClick={() => onAction({ kind: "portable", direction: "empty" })}>Empty container · 1 L</button></div>
            {gasCapacity > 0 && <div className="ww-inline-actions"><button type="button" onClick={() => onAction({ kind: "oxygen", direction: "fill" })}>Fill selected O2 equipment · 1 L</button><button type="button" onClick={() => onAction({ kind: "oxygen", direction: "empty" })}>Store selected O2 supply · 1 L</button></div>}
            {gasCapacity > 0 && <button className="ww-vent" type="button" disabled={!workshop.chemical} onClick={() => { if (confirmVent) { onAction({ kind: "vent", confirmed: true }); setConfirmVent(false); } else setConfirmVent(true); }}>{confirmVent ? "Confirm: discard primary gas buffer" : "Vent primary gas buffer…"}</button>}
            {kind === "fluid-pump" && <p className="ww-help">Consumes a full water source directly below: 1,000 J per litre. Neighboring tanks accept through matching fluid ports.</p>}
          </section>}

          {recipes.length > 0 && <section className="ww-materials" aria-label="Processing cycle">
            <h3>{workshop.cycle ? recipes.find((recipe) => recipe.id === workshop.cycle!.recipeId)?.name ?? "Current cycle" : "Automatic processing"}</h3>
            <div className="ww-gauge" role="progressbar" aria-label="Recipe progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span className="ww-gauge-fill ww-process-fill" style={{ width: `${progress}%` }} /></div>
            <p className="ww-help">{workshop.cycle ? `${reading(progress)}% · ${reading(workshop.cycle.paidJ, 1000)} / ${reading(workshop.cycle.costJ, 1000)} kJ paid. Ingredients reserved until completion.` : "Matches the deposited ingredients. Full outputs stop the machine before more power is spent."}</p>
            {workshop.cycle && <button type="button" onClick={() => onAction({ kind: "cancel-cycle" })}>Cancel cycle · keep ingredients, lose paid power</button>}
            <details className="ww-detail"><summary>Processing recipes</summary><ul className="ww-recipe-list">{recipes.map((recipe) => {
              const cost = recipeCost(recipe, workshop);
              return <li key={recipe.id}><strong>{recipe.name}</strong><span>{recipe.input.count} × {itemName(recipe.input.items[0])}{recipe.input.items.length > 1 ? " (or compatible alternative)" : ""}{recipe.reagent ? ` + ${recipe.reagent.count} × ${itemName(recipe.reagent.items[0])}` : ""}{recipe.fluid ? ` + ${recipe.fluid.amount / 1000} L ${recipe.fluid.resource}` : ""} → {recipe.output.count} × {itemName(recipe.output.item)}{recipe.byproduct ? ` + ${recipe.byproduct.count} × ${itemName(recipe.byproduct.item)}` : ""}</span><small>{reading(cost.durationMs, 1000)} s · {reading(cost.costJ, 1000)} kJ</small></li>;
            })}</ul></details>
          </section>}

          <fieldset className="ww-ports">
            <legend>Six-face connections</legend>
            <label className="ww-resource-choice">Resource<select aria-label="Port resource" value={resource} onChange={(event) => { const next = event.currentTarget.value as typeof resource; setResource(next); props.onInspectResource?.(next); }}><option value="energy">Energy</option><option value="item">Items</option><option value="fluid">Fluids</option><option value="chemical">Gases / chemicals</option><option value="heat">Heat</option></select></label>
            <p className="ww-note">Hold the wrench nearby to see face glyphs: ↓ input · ↑ output · ↕ both · ○ passive · double ↓ pull · + service · × disabled. Resource color follows this selector.</p>
            <p className="ww-help">Select the Field Wrench to configure. Faces rotate with the machine; service faces are manual-only.</p>
            <div className="ww-port-list">
              {faces.map((face) => (
                <label className="ww-port" key={face} htmlFor={`${id}-${face}`}>
                  <span>{face[0].toUpperCase() + face.slice(1)}</span>
                  <select id={`${id}-${face}`} aria-label={`${face[0].toUpperCase() + face.slice(1)} ${resource} port`} value={resource === "energy" ? ports[face] : workshop.resourcePorts[resource][face]} onChange={(event) => onAction(resource === "energy" ? { kind: "port", face, mode: event.currentTarget.value as WayworksPortMode } : { kind: "material-port", resource, face, mode: event.currentTarget.value as MaterialPortMode })}>
                    {resource === "energy" ? modes.map(([mode, label]) => <option key={mode} value={mode}>{label}</option>) : MATERIAL_PORT_MODES.map((mode) => <option key={mode} value={mode}>{mode === "both" ? "Input + output" : mode[0].toUpperCase() + mode.slice(1)}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>

          <details className="ww-detail"><summary>Control, security and upgrades</summary>
            <div className="ww-settings-grid">
              <label>Control<select aria-label="Machine control" value={workshop.control} onChange={(event) => onAction({ kind: "control", mode: event.currentTarget.value as WorkshopState["control"] })}><option value="always">Always run</option><option value="signal-on">Run with signal</option><option value="signal-off">Run without signal</option></select></label>
              <label>Access<select aria-label="Machine access" value={workshop.security} onChange={(event) => onAction({ kind: "security", mode: event.currentTarget.value as WorkshopState["security"] })}><option value="owner">Owner only</option><option value="public">Public service</option></select></label>
              <label>Channel<select aria-label="Network channel" value={workshop.channel} onChange={(event) => onAction({ kind: "channel", channel: event.currentTarget.value })}><option value="">Default</option><option value="copper">Copper</option><option value="teal">Teal</option><option value="violet">Violet</option></select></label>
              <button type="button" aria-pressed={workshop.signal} onClick={() => onAction({ kind: "signal", enabled: !workshop.signal })}>Signal {workshop.signal ? "on" : "off"}</button>
              <button type="button" aria-pressed={workshop.autoEject} onClick={() => onAction({ kind: "eject", enabled: !workshop.autoEject })}>Auto-eject {workshop.autoEject ? "on" : "off"}</button>
            </div>
            <p className="ww-help">Heat: {reading(workshop.heatJ, 1000)} kJ. Thermal modules improve cooling. Muffling changes machine sound, never hazard alarms.</p>
            <p className="ww-help">Public service permits material transfers, not configuration. Trusted operators can configure and pick up this machine.</p>
            <div className="ww-inline-actions"><input aria-label="Trusted player or drone ID" value={trustedActor} maxLength={128} placeholder="Player or drone ID" onChange={event => setTrustedActor(event.currentTarget.value)} /><button type="button" disabled={!/^[A-Za-z0-9_.:-]{1,128}$/.test(trustedActor)} onClick={() => { onAction({ kind: "trust", actor: trustedActor, enabled: true }); setTrustedActor(""); }}>Trust operator</button></div>
            {workshop.trusted.map(actor => <div className="ww-slot" key={actor}><span>{actor}</span><button type="button" onClick={() => onAction({ kind: "trust", actor, enabled: false })}>Revoke</button></div>)}
            <div className="ww-inline-actions"><button type="button" onClick={() => onAction({ kind: "copy" })}>Copy configuration</button><button type="button" onClick={() => onAction({ kind: "paste" })}>Paste compatible</button></div>
            <p className="ww-help">Filter: {workshop.upgrades.filter > 0 && workshop.filterItem !== null ? itemName(workshop.filterItem) : "none"}. Requires a Filter Module.</p>
            <div className="ww-inline-actions"><button type="button" onClick={() => onAction({ kind: "filter-held" })}>Filter to selected item</button><button type="button" onClick={() => onAction({ kind: "clear-filter" })}>Clear filter</button></div>
            <h3>Installed modules</h3><p className="ww-help">Supported: {supported.length ? supported.join(", ") : "none"}. Speed raises energy cost superlinearly. Efficiency saves energy but slows work. Select a module to install; select an empty slot to remove.</p>
            <button className="ww-primary" type="button" disabled={!supported.length} onClick={() => onAction({ kind: "upgrade-install" })}>Install selected module</button>
            <div className="ww-module-list">{moduleKinds.map((upgrade) => <div key={upgrade}><span>{upgrade} · {workshop.upgrades[upgrade]} / 4</span><button type="button" disabled={!workshop.upgrades[upgrade]} onClick={() => onAction({ kind: "upgrade-remove", upgrade })}>Remove one</button></div>)}</div>
          </details>

          {kind === "hand-dynamo" && (
            <div className="ww-operation">
              <p className="ww-help">Turn the crank to add energy to this dynamo.</p>
              <button className="ww-primary" type="button" disabled={!enabled || (validGauge && energyJ >= capacityJ)} onClick={() => onAction({ kind: "crank" })}>Turn crank</button>
            </div>
          )}
          {kind === "charging-pedestal" && (
            <div className="ww-operation">
              <p className="ww-help">Transfer up to 2 kJ per second to a compatible cell or equipped rig. Full stores stop the transfer.</p>
              <p className="ww-selected">Selected: {heldItemName || "Select a charge cell or rig in your hotbar"}</p>
              <button className="ww-primary" type="button" disabled={!enabled || energyJ <= 0} onClick={() => onAction({ kind: "charge" })}>Charge selected cell / rig</button>
              <button type="button" disabled={!enabled || energyJ <= 0} onClick={() => onAction({ kind: "charge", target: "back" })}>Charge equipped back rig</button>
            </div>
          )}

          <footer className="ww-controls">
            <button type="button" onClick={() => onAction({ kind: "rotate" })}>Rotate 90°</button>
            <button type="button" aria-pressed={enabled} onClick={() => onAction({ kind: "toggle" })}>{enabled ? "Disable machine" : "Enable machine"}</button>
          </footer>
          </>}
        </div>
      </section>
    </div>
  );
}
