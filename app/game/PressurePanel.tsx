"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Item, itemName } from "./data";
import { chemistryCost, chemistryRecipes, type ChemicalQuantity } from "./pressure-chemistry";
import { pressureDoorKind } from "./pressure-catalog";
import { PRESSURE_LINK_RANGE, PRESSURE_LINK_ROLES, parsePressureAction, pressurePoint, type PressureAction, type PressureDevice, type PressureLinkRole } from "./pressure-devices";
import type { PressureRuntime } from "./pressure-runtime";
import type { MachineKind } from "./wayworks";
import type { WorkshopAction } from "./wayworks-integration";
import { workshopFluidCapacity, workshopGasCapacity, workshopStoredTotal, type WorkshopState } from "./wayworks-stores";
import styles from "./PressurePanel.module.css";

export type PressurePanelProps = Readonly<{
  kind: MachineKind;
  workshop: WorkshopState;
  pressure?: ReturnType<PressureRuntime["diagnosticsFor"]>;
  serviceOnly?: boolean;
  onAction: (action: WorkshopAction) => void;
}>;
type HoldCommand = Extract<PressureAction, { kind: "hold" }>["command"];
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });
const reading = (value: number | undefined, divisor = 1) => value !== undefined && Number.isFinite(value) ? number.format(value / divisor) : "Unavailable";
const words = (value: string) => value.replaceAll("-", " ");
const zoneLabels: Record<string, string> = { unknown: "Unknown", checking: "Checking", leaking: "Leaking", depressurized: "Depressurized", "over-capacity": "Over capacity", sealed: "Sealed" };
const zoneHelp: Record<string, string> = {
  unknown: "Room boundaries are not verified. Keep your helmet sealed; load nearby chunks and check the room link.",
  checking: "The room is being checked after a change. Keep your helmet sealed until fresh readings arrive.",
  leaking: "The room has an open boundary. Find and seal the reported leak before supplying more gas.",
  depressurized: "Pressure is below the habitat threshold. Check supply, power and room seals.",
  "over-capacity": "The room exceeds controller capacity. Add controllers or divide the room; the discovery limit is 16,384 cells.",
  sealed: "A sealed boundary alone does not guarantee breathable air. Check oxygen, CO₂ and temperature.",
};
const roleLabels: Record<PressureLinkRole, string> = { room: "Room sample", inner: "Inner door", outer: "Outer door", chamber: "Chamber sample", interior: "Interior sample", exterior: "Exterior sample", pump: "Recovery pump", reserve: "Recovery reserve", vent: "Chamber vent", shutter: "Emergency shutter", signal: "Signal receiver" };
const fluidOptions = ["water", "coolant", "liquid-fuel"];
const gasOptions = ["oxygen", "inert", "hydrogen", "methane", "carbon-dioxide"];
const quantityText = (entry: ChemicalQuantity) => `${reading(entry.amount, 1000)} ${entry.slot === "fluid" || entry.slot === "fluidAux" ? "L" : "standard L"} ${words(entry.resource)}`;

/** One host-validated hold at a time. No client elapsed duration is transmitted. */
export class PressureHoldSession {
  private command: HoldCommand | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private dispatch: (action: WorkshopAction) => void) {}
  setDispatch(dispatch: (action: WorkshopAction) => void) { this.dispatch = dispatch; }
  start(command: HoldCommand) {
    if (this.command === command) return;
    this.stop();
    this.command = command;
    const heartbeat = () => this.dispatch({ kind: "pressure", action: { kind: "hold", command, active: true } });
    this.timer = setInterval(heartbeat, 200);
    heartbeat();
  }
  stop() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    const command = this.command;
    this.command = null;
    if (command) this.dispatch({ kind: "pressure", action: { kind: "hold", command, active: false } });
  }
}

/** Embedded inspector only. Machine state always comes from host props; local state is input drafts. */
export function PressurePanel(props: PressurePanelProps) {
  return <PressurePanelContent key={`${props.kind}:${props.pressure?.device?.installationId ?? props.workshop.process?.installationId ?? "unbound"}:${!!props.pressure?.device?.airlock}`} {...props} />;
}

function PressurePanelContent({ kind, workshop, pressure, onAction, serviceOnly }: PressurePanelProps) {
  const id = useId();
  const device = pressure?.device, zone = pressure?.zone, process = workshop.process;
  const [pressureDraft, setPressureDraft] = useState(String((device?.targetPressurePa ?? 100000) / 1000));
  const [temperatureDraft, setTemperatureDraft] = useState(String((device?.targetTemperatureMilliC ?? 20000) / 1000));
  const [width, setWidth] = useState(String(device?.gateWidth ?? 5));
  const [height, setHeight] = useState(String(device?.gateHeight ?? 5));
  const [role, setRole] = useState<PressureLinkRole>("room");
  const [target, setTarget] = useState("");
  const [holding, setHolding] = useState<HoldCommand | null>(null);
  const actionRef = useRef(onAction);
  const [holdSession] = useState(() => new PressureHoldSession(onAction));
  useLayoutEffect(() => {
    actionRef.current = onAction;
    holdSession.setDispatch(action => actionRef.current(action));
  }, [onAction, holdSession]);
  const stopHold = useCallback(() => {
    holdSession.stop();
    setHolding(null);
  }, [holdSession]);
  useEffect(() => {
    const releaseKey = (event: KeyboardEvent) => { if (event.key === " " || event.key === "Enter" || event.key === "Escape") stopHold(); };
    const hide = () => { if (document.hidden) stopHold(); };
    window.addEventListener("blur", stopHold);
    window.addEventListener("pointerup", stopHold);
    window.addEventListener("pointercancel", stopHold);
    window.addEventListener("keyup", releaseKey);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", stopHold);
      window.removeEventListener("pointerup", stopHold);
      window.removeEventListener("pointercancel", stopHold);
      window.removeEventListener("keyup", releaseKey);
      document.removeEventListener("visibilitychange", hide);
      stopHold();
    };
  }, [stopHold]);
  function startHold(command: HoldCommand) {
    if (!device?.airlock) return;
    setHolding(command);
    holdSession.start(command);
  }
  const send = (action: PressureAction) => onAction({ kind: "pressure", action });
  function holdButton(command: HoldCommand, label: string, danger = false) {
    return <button type="button" key={command} className={danger ? styles.dangerButton : styles.holdButton}
      disabled={!device?.airlock} aria-pressed={holding === command} aria-describedby={`${id}-${danger ? "danger" : "manual"}`}
      onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); startHold(command); }}
      onPointerUp={stopHold} onPointerCancel={stopHold} onLostPointerCapture={stopHold} onBlur={stopHold}
      onKeyDown={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); if (!event.repeat) startHold(command); } }}
      onKeyUp={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); stopHold(); } }}>{label}</button>;
  }
  const recipes = serviceOnly ? [] : chemistryRecipes(kind);
  const status = zone?.status ?? "unknown";
  const total = zone ? zone.oxygenMilliMoles + zone.inertMilliMoles + zone.co2MilliMoles : 0;
  const targetPressurePa = Number(pressureDraft) * 1000, targetTemperatureMilliC = Number(temperatureDraft) * 1000;
  const targetValid = pressureDraft.trim() !== "" && temperatureDraft.trim() !== "" && Number.isSafeInteger(targetPressurePa) && targetPressurePa >= 10000 && targetPressurePa <= 120000 && Number.isSafeInteger(targetTemperatureMilliC) && targetTemperatureMilliC >= 0 && targetTemperatureMilliC <= 45000;
  const gateValid = [width, height].every(value => value.trim() !== "" && Number.isInteger(Number(value)) && Number(value) >= 3 && Number(value) <= 9);
  const linkTarget = target.trim().replaceAll(/\s+/g, "");
  const linkValid = !!pressurePoint(linkTarget) || role === "exterior" && linkTarget === "exterior";
  const airlock = device?.airlock;
  const fluidCapacity = workshopFluidCapacity(kind, workshop), gasCapacity = workshopGasCapacity(kind, workshop);
  const reserve = process?.airReserve;
  const filterLoaded = workshop.slots.reagent?.item === Item.HabitatFilter;
  const filterRemaining = process?.filterUsedMl ? 240000 - process.filterUsedMl : filterLoaded ? 240000 : 0;
  const showHabitat = kind === "carbon-scrubber" || !recipes.length && !["liquid-pipe", "gasline", "heat-conduit"].includes(kind);
  const canTarget = ["life-support-controller", "thermal-regulator", "atmosphere-vent", "recovery-pump", "equalization-vent"].includes(kind);
  const canMode = canTarget || kind === "carbon-scrubber" || kind === "pressure-sensor";

  return <section className={styles.panel} aria-label="Pressure and chemistry controls" data-pressure-kind={kind}>
    {showHabitat && <>
      <header className={styles.heading}><h3>Habitat atmosphere</h3><span className={styles.state} data-state={status}>{zoneLabels[status] ?? words(status)}</span></header>
      <p className={styles.help}>{zoneHelp[status]}</p>
      <p className={styles.safety} role="status">{!zone ? "Breathing safety unavailable — keep helmet sealed." : pressure?.breathable ? "Air is currently breathable." : `Keep helmet sealed: ${pressure?.reasons?.length ? pressure.reasons.map(words).join(", ") : "breathing safety unverified"}.`}</p>
      <dl className={styles.readings}>
        <div><dt>Pressure</dt><dd>{reading(zone?.pressureMilliKPa, 1000)} <small>kPa</small></dd></div>
        <div><dt>Partial O₂</dt><dd>{reading(pressure?.oxygenPartialPressureMilliKPa, 1000)} <small>kPa</small></dd></div>
        <div><dt>Temperature</dt><dd>{reading(zone?.temperatureMilliC, 1000)} <small>°C</small></dd></div>
        <div><dt>Volume / capacity</dt><dd>{reading(zone?.cellCount)} / {reading(zone ? pressure?.capacity : undefined)} <small>cells</small></dd></div>
      </dl>
      <p className={styles.help}>O₂ {reading(zone ? pressure?.oxygenPartsPerMillion : undefined, 10000)}% · Inert {reading(zone ? total ? zone.inertMilliMoles / total * 100 : 0 : undefined)}% · CO₂ {reading(zone ? pressure?.co2PartsPerMillion : undefined)} ppm</p>
      <p className={styles.help}>Occupants: {reading(zone ? pressure?.occupants : undefined)} · O₂ reserve: {zone && pressure?.reserveSeconds === null ? "No current consumption estimate" : `${reading(zone ? pressure?.reserveSeconds ?? undefined : undefined)} s`}</p>
      <p className={styles.help}>Last 0.2 s sample · O₂ consumed {reading(pressure?.rates?.oxygenConsumedMmolPerSecond)} mmol/s · O₂ produced by plants {reading(pressure?.rates?.oxygenProducedMmolPerSecond)} mmol/s · CO₂ produced {reading(pressure?.rates?.co2ProducedMmolPerSecond)} mmol/s · CO₂ removed {reading(pressure?.rates?.co2RemovedMmolPerSecond)} mmol/s</p>
      <p className={styles.help}>Gas inflow {reading(pressure?.rates?.inflowMmolPerSecond)} mmol/s · Gas outflow {reading(pressure?.rates?.outflowMmolPerSecond)} mmol/s. Reserve assumes measured consumption continues.</p>
      <p className={styles.help}>Measured pressure-operation draw: {reading(pressure?.power?.drawW)} W · Source: {pressure?.power ? "local machine buffer" : "unavailable"}. Upstream grid charging is separate.</p>
      {pressure?.rates && <p className={styles.help}>Major O₂ consumers: {pressure.rates.majorConsumers.length ? pressure.rates.majorConsumers.map(consumer => `${words(consumer.kind)} ${reading(consumer.oxygenMmolPerSecond)} mmol/s`).join(" · ") : "None in the last sample"}</p>}
      <p className={styles.help}>Last check: {zone ? `${reading(pressure?.checkAgeMs, 1000)} s ago` : "Unavailable"} · Topology revision {reading(pressure?.topologyRevision)} · Gas revision {reading(zone?.resourceRevision)}</p>
      <p className={styles.help}>Wrench overlay: pale box = room bounding extent, not a seal; lines = explicit links; orange diamond and ray = reported leak or unknown face. Port arrows show configured flow direction.</p>
      {pressure?.leak && <p className={styles.warning} role="status">{pressure.leak.unknown ? "Unknown boundary" : "Leak"} at {pressure.leak.cell.x}, {pressure.leak.cell.y}, {pressure.leak.cell.z} · face {pressure.leak.face} · {pressure.leak.cause}</p>}
    </>}
    {pressure?.error && <p className={styles.warning} role="status">Pressure system: {pressure.error}</p>}
    {device && <>
      {pressureDoorKind(kind) && <div className={styles.group}><h4>Pressure door</h4><p className={styles.help}>Door: {device.open ? "Open" : "Closed"} · {device.locked ? "Interlocked" : "Unlocked"}. Powered operation requires 100 J and a checked, safe pressure difference.</p><div className={styles.actions}><button type="button" disabled={device.open || device.locked} onClick={() => send({ kind: "door", open: true })}>Open door</button><button type="button" disabled={!device.open || device.locked} onClick={() => send({ kind: "door", open: false })}>Close door</button></div></div>}
      {canTarget && <details className={styles.detail}><summary>Pressure targets and operating mode</summary>
        <p className={styles.help}>Current target: {reading(device.targetPressurePa, 1000)} kPa · {reading(device.targetTemperatureMilliC, 1000)} °C</p>
        <div className={styles.fields}><label>Target pressure · kPa<input type="number" min="10" max="120" step="0.001" value={pressureDraft} onChange={event => setPressureDraft(event.currentTarget.value)} /></label><label>Target temperature · °C<input type="number" min="0" max="45" step="0.001" value={temperatureDraft} onChange={event => setTemperatureDraft(event.currentTarget.value)} /></label></div>
        <button type="button" disabled={!targetValid} onClick={() => send({ kind: "target", pressurePa: targetPressurePa, temperatureMilliC: targetTemperatureMilliC })}>Apply targets</button>
      </details>}
      {canMode && <label className={styles.field}>Operating mode<select value={device.mode} onChange={event => send({ kind: "mode", mode: event.currentTarget.value as typeof device.mode })}><option value="supply">{kind === "thermal-regulator" || kind === "carbon-scrubber" || kind === "equalization-vent" || kind === "pressure-sensor" ? "Run" : kind === "recovery-pump" ? "Standby" : "Supply"}</option>{(kind === "recovery-pump" || kind === "atmosphere-vent" || device.mode === "capture") && <option value="capture">Capture</option>}{(kind === "recovery-pump" || kind === "atmosphere-vent" || device.mode === "release") && <option value="release">Release</option>}{kind === "atmosphere-vent" && <option value="balanced">Balanced composition</option>}<option value="off">Off</option></select></label>}
      <PressureDeviceSettings kind={kind} device={device} send={send} signal={workshop.signal} />
      {kind === "hangar-pressure-gate" && <details className={styles.detail}><summary>Formed gate dimensions</summary><p className={styles.help}>Current frame: {device.gateWidth} × {device.gateHeight} blocks. Close the gate before changing its 3–9 block dimensions; the host checks the complete frame.</p><div className={styles.fields}><label>Gate width<input type="number" min="3" max="9" step="1" value={width} onChange={event => setWidth(event.currentTarget.value)} /></label><label>Gate height<input type="number" min="3" max="9" step="1" value={height} onChange={event => setHeight(event.currentTarget.value)} /></label></div><button type="button" disabled={!gateValid || device.open} onClick={() => send({ kind: "gate", width: Number(width), height: Number(height) })}>Check frame dimensions</button></details>}
      {kind === "airlock-controller" && <div className={styles.group}>
        <h4>Airlock cycle</h4><p className={styles.safety} role="status">{airlock ? words(airlock.phase) : "Not configured — link doors, room samples, chamber vent, pump and reserve."}</p>
        {airlock && <p className={styles.help}>Phase {reading(airlock.phaseElapsedMs, 1000)} s · Cycle {reading(airlock.cycleElapsedMs, 1000)} s · Sequence {airlock.sequence} · Recovery {airlock.recoveryVerified ? "verified" : "not yet verified"}</p>}
        {airlock?.error && <p className={styles.warning} role="status">Airlock fault: {words(airlock.error)}. Repair the cause before resetting.</p>}
        <div className={styles.actions}><button type="button" disabled={!airlock} onClick={() => send({ kind: "cycle", command: "cycle-out" })}>Cycle out</button><button type="button" disabled={!airlock} onClick={() => send({ kind: "cycle", command: "return-in" })}>Return in</button><button type="button" disabled={!airlock} onClick={() => send({ kind: "cycle", command: "reset" })}>Reset cycle</button></div>
        <p className={styles.help}>Close the inspector to advance the automatic cycle. Manual holds below remain active while inspecting.</p>
        <details className={styles.detail}><summary>Manual crank and emergency override</summary>
          <p id={`${id}-manual`} className={styles.help}>Safe manual crank: hold for 8 seconds. The host checks the pressure difference and opposing door. Hold with a pointer, Space or Enter; release to stop.</p>
          <div className={styles.actions}>{holdButton("manual-open-inner", "Hold 8 s · crank inner")}{holdButton("manual-open-outer", "Hold 8 s · crank outer")}</div>
          <p id={`${id}-danger`} className={styles.warning}>DANGEROUS: holding an override for 3 seconds can open across an unsafe pressure difference and decompress the chamber. Gas will escape; occupants may be injured. Seal your helmet first.</p>
          <div className={styles.actions}>{holdButton("dangerous-open-inner", "DANGEROUS · hold 3 s · inner", true)}{holdButton("dangerous-open-outer", "DANGEROUS · hold 3 s · outer", true)}</div>
          <p className={styles.holdStatus} role="status" aria-live="polite">{holding ? `Holding ${words(holding)}. Keep holding; release to cancel. Door state is confirmed by the host.` : "No hold active."}</p>
        </details>
      </div>}
      {showHabitat && <details className={styles.detail}><summary>Room and hardware links</summary><p className={styles.help}>Select the Field Wrench. Targets must be loaded and within {PRESSURE_LINK_RANGE} blocks. Room samples are air-cell coordinates; door, pump and reserve links use owned hardware coordinates.</p>
        <dl className={styles.links}>{PRESSURE_LINK_ROLES.filter(key => device.links[key]).map(key => <div key={key}><dt>{roleLabels[key]}</dt><dd><code>{device.links[key]}</code><button type="button" aria-label={`Unlink ${roleLabels[key].toLowerCase()}`} onClick={() => send({ kind: "unlink", role: key })}>Unlink</button></dd></div>)}</dl>
        {!Object.keys(device.links).length && <p className={styles.help}>No explicit links. The room sample defaults to the block in front.</p>}
        {kind === "airlock-controller" && <p className={styles.help}>Use two separate doors, an Atmosphere Vent sampling the chamber, a Recovery Pump and a separate gas-capable reserve. Chamber, interior and exterior samples must be distinct air cells. Keep pump and reserve enabled and powered.</p>}
        <div className={styles.fields}><label>Link role<select value={role} onChange={event => setRole(event.currentTarget.value as PressureLinkRole)}>{PRESSURE_LINK_ROLES.map(key => <option key={key} value={key}>{roleLabels[key]}</option>)}</select></label><label>Target coordinates · x,y,z<input type="text" value={target} maxLength={80} placeholder={role === "exterior" ? "x,y,z or exterior" : "x,y,z"} onChange={event => setTarget(event.currentTarget.value)} /></label></div>
        {role === "exterior" && <p className={styles.help}>Use “exterior” for the world atmosphere, or coordinates for another room.</p>}
        <button type="button" disabled={!linkValid} onClick={() => send({ kind: "link", role, target: linkTarget })}>Link target</button>
      </details>}
    </>}
    {recipes.length > 0 && <div className={styles.group}><h3>Chemistry process</h3><label className={styles.field}>Recipe<select value={process?.recipeId ?? ""} disabled={!process || !!workshop.cycle} onChange={event => onAction({ kind: "process-recipe", recipeId: event.currentTarget.value || null })}><option value="">Automatic · match available inputs</option>{recipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select></label>
      {workshop.cycle && <><p className={styles.help}>Current batch: {recipes.find(recipe => recipe.id === workshop.cycle?.recipeId)?.name ?? workshop.cycle.recipeId} · {reading(workshop.cycle.progressMs, 1000)} / {reading(workshop.cycle.durationMs, 1000)} s · {reading(workshop.cycle.paidJ, 1000)} / {reading(workshop.cycle.costJ, 1000)} kJ paid.</p><button type="button" onClick={() => onAction({ kind: "cancel-cycle" })}>Cancel batch · keep ingredients, lose paid power</button></>}
      {kind === "carbon-scrubber" && <p className={styles.safety}>Filter remaining: {reading(filterRemaining, 1000)} standard L CO₂. {filterRemaining ? "Spent filters go to the byproduct slot." : "Deposit a Habitat Filter in the reagent slot."}</p>}
      <details className={styles.detail}><summary>Recipe quantities and energy</summary><ul className={styles.recipes}>{recipes.map(recipe => { const cost = chemistryCost(recipe, workshop); return <li key={recipe.id}><strong>{recipe.name}</strong><span>{[...recipe.inputs.map(quantityText), ...recipe.itemsIn?.map(entry => `${entry.count} × ${itemName(entry.item)}`) ?? [], ...(recipe.harvest ? [`Exterior atmospheric ${words(recipe.harvest)}`] : [])].join(" + ")} → {[...recipe.outputs.map(quantityText), ...recipe.itemsOut?.map(entry => `${entry.count} × ${itemName(entry.item)}`) ?? []].join(" + ") || "filter capture"}</span><small>{reading(cost.durationMs, 1000)} s · {reading(cost.costJ, 1000)} kJ {recipe.generatedJ ? `ignition from yield · ${reading(recipe.generatedJ, 1000)} kJ gross generation` : "input"}{recipe.filterMl ? ` · ${reading(recipe.filterMl, 1000)} standard L filter capacity used` : ""}{recipe.wasteHeatJ ? ` · ${reading(recipe.wasteHeatJ, 1000)} kJ waste heat` : ""}</small></li>; })}</ul></details>
    </div>}
    {process && !serviceOnly && <details className={styles.detail}><summary>Reservoirs and transport limits</summary>
      {fluidCapacity > 0 && <p className={styles.help}>Combined liquid: {reading(workshopStoredTotal(workshop, "fluid"), 1000)} / {reading(fluidCapacity, 1000)} L</p>}
      {gasCapacity > 0 && <p className={styles.help}>Combined gas: {reading(workshopStoredTotal(workshop, "chemical"), 1000)} / {reading(gasCapacity, 1000)} standard L, including recovery reserve.</p>}
      <dl className={styles.reservoirs}>{([ ["Primary liquid", workshop.fluid, false], ["Auxiliary liquid", process.fluidAux, false], ["Primary gas", workshop.chemical, true], ["Auxiliary gas", process.chemicalAux, true], ["Reagent gas", process.chemicalReagent, true] ] as const).filter(([, store, gas]) => store || (gas ? gasCapacity : fluidCapacity) > 0).map(([label, store, gas]) => <div key={label}><dt>{label}</dt><dd>{store ? `${reading(store.amount, 1000)} ${gas ? "standard L" : "L"} ${words(store.resource)}` : "Empty"}</dd></div>)}</dl>
      {gasCapacity > 0 && <p className={styles.help}>Mixed recovery reserve: {reserve ? `${reading(reserve.oxygenMilliMoles)} mmol O₂ · ${reading(reserve.inertMilliMoles)} mmol inert · ${reading(reserve.co2MilliMoles)} mmol CO₂` : "Empty"}. Gas conversion: 24 standard mL = 1 mmol.</p>}
      <div className={styles.fields}>{([ ["fluid", "Liquid filter", process.fluidFilter, fluidOptions, fluidCapacity], ["chemical", "Gas filter", process.gasFilter, gasOptions, gasCapacity] ] as const).filter(([, , , , capacity]) => capacity > 0).map(([resource, label, value, options]) => <label key={resource}>{label}<select value={value ?? ""} onChange={event => onAction({ kind: "process-filter", resource, value: event.currentTarget.value || null })}><option value="">Any compatible resource</option>{[...new Set([...options, ...(value ? [value] : [])])].map(option => <option key={option} value={option}>{words(option)}</option>)}</select></label>)}</div>
      <label className={styles.field}>Flow limit · {reading(process.flowPermille, 10)}%<input type="range" min="0" max="1000" step="10" value={process.flowPermille} aria-label="Transport flow limit" aria-valuetext={`${reading(process.flowPermille, 10)} percent`} onChange={event => onAction({ kind: "process-flow", permille: Number(event.currentTarget.value) })} /></label>
      <label className={styles.check}><input type="checkbox" checked={process.backflow} onChange={event => onAction({ kind: "process-backflow", enabled: event.currentTarget.checked })} />Allow backflow</label>
      <p className={styles.help}>Limits apply with face connections and available storage. Configuration requires the Field Wrench.</p>
    </details>}
  </section>;
}

function PressureDeviceSettings({ kind, device, send, signal }: { kind: MachineKind; device: PressureDevice; send: (action: PressureAction) => void; signal: boolean }) {
  const [oxygen, setOxygen] = useState(String(device.mixture.oxygenPermille / 10));
  const [carbon, setCarbon] = useState(String(device.mixture.co2Permille / 10));
  const [sensor, setSensor] = useState({ minimumPressurePa: String(device.sensor.minimumPressurePa), maximumPressurePa: String(device.sensor.maximumPressurePa),
    minimumOxygenPpm: String(device.sensor.minimumOxygenPpm), maximumCo2Ppm: String(device.sensor.maximumCo2Ppm), output: device.sensor.output });
  const mixtureAction = parsePressureAction({ kind: "mixture", oxygenPermille: Number(oxygen) * 10, co2Permille: Number(carbon) * 10 });
  const sensorAction = parsePressureAction({ kind: "sensor", minimumPressurePa: Number(sensor.minimumPressurePa), maximumPressurePa: Number(sensor.maximumPressurePa),
    minimumOxygenPpm: Number(sensor.minimumOxygenPpm), maximumCo2Ppm: Number(sensor.maximumCo2Ppm), output: sensor.output });
  if (kind === "atmosphere-vent") return <details className={styles.detail}><summary>Vent mixture and finite recovery</summary>
    <p className={styles.help}>Current target: O₂ {reading(device.mixture.oxygenPermille, 10)}% · CO₂ {reading(device.mixture.co2Permille, 10)}% · remainder inert. Supply uses stored pure gas; capture and release preserve gas and heat in the shared finite reserve. Balanced mode captures excess then replenishes missing gas; a full reserve stops capture. Filters apply in both directions.</p>
    <div className={styles.fields}><label>Target oxygen · %<input type="number" min="0" max="100" step="0.1" value={oxygen} onChange={event => setOxygen(event.currentTarget.value)} /></label><label>Target carbon dioxide · %<input type="number" min="0" max="100" step="0.1" value={carbon} onChange={event => setCarbon(event.currentTarget.value)} /></label></div>
    <button type="button" disabled={!mixtureAction || !oxygen.trim() || !carbon.trim()} onClick={() => mixtureAction && send(mixtureAction)}>Apply mixture</button></details>;
  if (kind === "equalization-vent") return <label className={styles.field}>Check-valve direction<select value={device.valveDirection} onChange={event => send({ kind: "valve", direction: event.currentTarget.value as PressureDevice["valveDirection"] })}><option value="both">Both directions</option><option value="front-to-back">Front room → back room</option><option value="back-to-front">Back room → front room</option></select><span className={styles.help}>Transfers down the pressure gradient, stopping at equilibrium or the receiving pressure target. Room sample is the front side; the opposite block is the back side.</span></label>;
  if (kind !== "pressure-sensor") return null;
  const fields = [["minimumPressurePa", "Minimum pressure · Pa", 200000], ["maximumPressurePa", "Maximum pressure · Pa", 200000], ["minimumOxygenPpm", "Minimum oxygen · ppm", 1000000], ["maximumCo2Ppm", "Maximum carbon dioxide · ppm", 1000000]] as const;
  return <details className={styles.detail}><summary>Sensor thresholds and output</summary><p className={styles.help}>Signal: {signal ? "On" : "Off"}. Any threshold violation or unchecked room triggers the alarm. Link one owned signal receiver to control its existing signal-on/off mode. Sensor operation costs 50 J/s. Linked shutters close on alarm or loss of sensor power; clearing never opens them.</p>
    <div className={styles.fields}>{fields.map(([field, label, max]) => <label key={field}>{label}<input type="number" min="0" max={max} step="1" value={sensor[field]} onChange={event => setSensor({ ...sensor, [field]: event.currentTarget.value })} /></label>)}</div>
    <label className={styles.field}>Output polarity<select value={sensor.output} onChange={event => setSensor({ ...sensor, output: event.currentTarget.value as "alarm" | "safe" })}><option value="alarm">On while alarmed</option><option value="safe">On while thresholds are satisfied</option></select></label>
    <button type="button" disabled={!sensorAction || fields.some(([field]) => !sensor[field].trim())} onClick={() => sensorAction && send(sensorAction)}>Apply sensor thresholds</button></details>;
}
