"use client";
import { useState, type KeyboardEvent } from "react";
import { itemName } from "./data";
import { FIRST_FLIGHT_ROUTES, SPACE_RESOURCE_LABELS, type AsteroidInspection, type SpaceflightIntent, type SpaceflightMission } from "./spaceflight-mission";
import type { AsteroidGrant } from "./asteroid-custody";
import { SURVEY_HOPPER_CAPACITY, VEHICLE_RESOURCES } from "./space-vehicle";
import { STATION_GRANTS, STATION_PERMISSIONS, type OrbitalStation, type StationGrant } from "./orbital-station";
import { shipDock } from "./station-runtime";

export function SpaceflightDialog({ mission, onAction, onClose, feedback }: { mission: SpaceflightMission;
  onAction: (action: SpaceflightIntent) => void; onClose: () => void; feedback?: string }) {
  function keys(event: KeyboardEvent<HTMLElement>) {
    event.stopPropagation();
    if (event.key === "Escape") { event.preventDefault(); onClose(); }
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), select:not(:disabled), input:not(:disabled), summary")]
      .filter(element => element.checkVisibility());
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && event.target === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && event.target === last) { event.preventDefault(); first?.focus(); }
  }
  return <div className="ww-overlay" onPointerDown={event => event.stopPropagation()} onKeyUp={event => event.stopPropagation()}>
    <section className="ww-panel spaceflight-dialog" role="dialog" aria-modal="true" aria-label={mission.asteroid ? "Asteroid claim" : !mission.ship && mission.stations ? "Orbital station" : "Spacecraft mission"} onKeyDown={keys}>
      <header className="ww-header"><h2>{mission.asteroid ? "Asteroid claim" : mission.ship ? "Spacecraft mission" : mission.stations ? "Orbital station" : "Spacecraft mission"}</h2>
        <button type="button" autoFocus onClick={onClose}>{mission.ship && !mission.asteroid ? "Return to cockpit" : "Return to game"}</button></header>
      <div className="ww-body">{feedback && <p role="status">{feedback}</p>}{mission.asteroid
        ? <AsteroidControls key={`${mission.asteroid.id}:${mission.asteroid.registryRevision}`} asteroid={mission.asteroid} onAction={onAction} />
        : <SpaceflightPanel mission={mission} onAction={onAction} />}</div>
    </section>
  </div>;
}

function AsteroidControls({ asteroid, onAction }: { asteroid: AsteroidInspection; onAction(action: SpaceflightIntent): void }) {
  const [trusted, setTrusted] = useState(asteroid.claim?.trustedIds.join(", ") ?? "");
  const [build, setBuild] = useState<AsteroidGrant>(asteroid.claim?.build ?? "owner");
  const [extract, setExtract] = useState<AsteroidGrant>(asteroid.claim?.extract ?? "owner");
  const base = { asteroidId: asteroid.id, epoch: asteroid.epoch, registryRevision: asteroid.registryRevision };
  const ids = trusted.split(",").map(value => value.trim()).filter(Boolean);
  const validIds = ids.length <= 64 && new Set(ids).size === ids.length && ids.every(id => /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,159}$/.test(id));
  return <section className="ww-materials" aria-label="Observed asteroid">
    <h3>{asteroid.composition[0].toUpperCase() + asteroid.composition.slice(1)} asteroid</h3>
    <p>{asteroid.id} · inspected at [{asteroid.point.x}, {asteroid.point.y}, {asteroid.point.z}]</p>
    <p role="status">{asteroid.claim ? `Claimed by ${asteroid.claim.ownerId}.` : "Unclaimed. Anyone may extract; claim it before building."}</p>
    {!asteroid.nearby && <p>Return within six blocks of the inspected rock to change this claim.</p>}
    {!asteroid.claim ? <button type="button" disabled={!asteroid.nearby} onClick={() => onAction({ kind: "asteroid-claim", ...base })}>Claim asteroid</button>
      : asteroid.claim.ownerId === "local" ? <>
        <label>Construction <select value={build} onChange={event => setBuild(event.target.value as AsteroidGrant)}>
          <option value="owner">Owner only</option><option value="trusted">Trusted builders</option><option value="public">Everyone</option></select></label>
        <label>Extraction <select value={extract} onChange={event => setExtract(event.target.value as AsteroidGrant)}>
          <option value="owner">Owner only</option><option value="trusted">Trusted miners</option><option value="public">Everyone</option></select></label>
        <details><summary>Trusted player and agent IDs</summary><label>Trusted IDs <input value={trusted} maxLength={10300}
          onChange={event => setTrusted(event.target.value)} placeholder="Comma-separated authenticated IDs" /></label>
          {!validIds && <p>Use at most 64 unique IDs containing letters, digits, dots, colons, underscores or hyphens.</p>}</details>
        <button type="button" disabled={!asteroid.nearby || !validIds} onClick={() => onAction({ kind: "asteroid-access", ...base, trustedIds: ids, build, extract })}>Save asteroid access</button>
      </> : <p>Construction: {asteroid.claim.build}. Extraction: {asteroid.claim.extract}. Only the owner can change access.</p>}
    <p>Claims supply no materials, air or power. Mining still requires the normal tools; extracted rock stays depleted.</p>
  </section>;
}

export function SpaceflightPanel({ mission, onAction }: { mission: SpaceflightMission; onAction: (action: SpaceflightIntent) => void }) {
  const ship = mission.ship;
  const [stationName, setStationName] = useState("Waystar Outpost");
  const named = { "home-orbit": "Blockwild · low orbit", "home-surface": "Blockwild · home pad", "morrow-orbit": "Morrow · low orbit", "morrow-surface": "Morrow · surface approach" };
  return <section className="ww-materials spaceflight-mission" aria-label="Spacecraft mission">
    <h3>{ship ? "Survey Hopper · mission" : mission.stations ? "Station operations" : "First spacecraft"}</h3>
    {!ship && mission.stations ? <p>No spacecraft nearby. Station controls remain available at the claim core or a placed collar.</p> : !ship ? <><p>Form a 3 × 3 pad with solid foundations and twelve blocks of clear sky. Select your crafted Hopper.</p>
      <button type="button" onClick={() => onAction({ kind: "deploy" })}>Deploy selected Hopper</button></> : <>
      <p role="status">{mission.status} · Hull {(ship.hull / 10).toFixed(0)}% · {ship.passengers.length}/1 crew · {ship.cargo.filter(Boolean).length}/9 cargo</p>
      <dl className="ww-readings">{VEHICLE_RESOURCES.map(resource => <div key={resource}>
        <dt>{SPACE_RESOURCE_LABELS[resource]}</dt><dd>{(ship[resource] / 1000).toFixed(1)} / {(SURVEY_HOPPER_CAPACITY[resource] / 1000).toFixed(0)} {resource === "batteryJoules" ? "kJ" : "L"}</dd>
        <button type="button" disabled={!!ship.trip} onClick={() => onAction({ kind: "supply", resource, vehicleRevision: ship.revision })}>Load {SPACE_RESOURCE_LABELS[resource]}</button>
      </div>)}</dl>
      <label>Destination <select value={mission.route} disabled={!!ship.trip} onChange={event => onAction({ kind: "route", route: event.target.value as typeof mission.route })}>
        {FIRST_FLIGHT_ROUTES.map(route => <option key={route} value={route}>{named[route]}</option>)}
      </select></label>
      {mission.costs && <p>Route needs {VEHICLE_RESOURCES.map(resource => `${(mission.costs![resource] / 1000).toFixed(1)} ${resource === "batteryJoules" ? "kJ" : "L"} ${SPACE_RESOURCE_LABELS[resource]}`).join(" · ")}. Reserve extra supplies for the return.</p>}
      {mission.blockers.length > 0 && <ul aria-label="Launch blockers">{mission.blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul>}
      <div className="ww-controls">
        {!ship.passengers.length && <button type="button" onClick={() => onAction({ kind: "board", vehicleRevision: ship.revision })}>Board pilot seat</button>}
        {!!ship.passengers.length && !ship.trip && <><button type="button" disabled={ship.passengers[0].consent} onClick={() => onAction({ kind: "consent", vehicleRevision: ship.revision })}>Consent to launch</button>
          <button type="button" onClick={() => onAction({ kind: "leave", vehicleRevision: ship.revision })}>Leave seat</button></>}
        {ship.trip?.status === "reserved" ? <button type="button" onClick={() => onAction({ kind: "abort", vehicleRevision: ship.revision })}>Abort countdown</button>
          : ship.trip?.status === "commit-ready" ? <button type="button" onClick={() => onAction({ kind: "retry-arrival", vehicleRevision: ship.revision })}>Retry arrival checkpoint</button>
            : <button type="button" disabled={mission.blockers.length > 0} onClick={() => onAction({ kind: "launch", vehicleRevision: ship.revision })}>Launch</button>}
      </div>
      <details><summary>Cargo hold · exact stored items</summary>{ship.cargo.map((slot, index) => <div className="ww-slot" key={index}>
        <span>{index + 1}. {slot ? `${slot.count} × ${itemName(slot.item)}` : "Empty"}</span>
        <button type="button" disabled={!!ship.trip} onClick={() => onAction({ kind: slot ? "cargo-out" : "cargo-in", slot: index, vehicleRevision: ship.revision })}>{slot ? "Take stack" : "Load selected stack"}</button>
      </div>)}</details>
    </>}
      {mission.stations && <details open={!ship}><summary>Orbital stations · {Object.keys(mission.stations.stations).length} registered</summary>
        {ship && <><p>A starter deck consumes 1 Claim Core, 1 Orbital Dock and 8 Trusses. It supplies no air, gas or energy.</p>
        <label>New station name <input maxLength={80} value={stationName} onChange={event => setStationName(event.target.value)} /></label>
        <button type="button" disabled={!!ship.trip || !!shipDock(ship) || !stationName.trim()} onClick={() => onAction({ kind: "station-found", name: stationName,
          registryRevision: mission.stations!.revision, vehicleRevision: ship.revision })}>Build starter station deck</button></>}
        {Object.values(mission.stations.stations).map(station => <StationControls key={station.id} station={station} mission={mission} onAction={onAction} />)}
      </details>}
  </section>;
}

function StationControls({ station, mission, onAction }: { station: OrbitalStation; mission: SpaceflightMission; onAction(action: SpaceflightIntent): void }) {
  const [name, setName] = useState(station.name), [icon, setIcon] = useState(station.icon), [members, setMembers] = useState(station.memberIds.join(", "));
  const [collar, setCollar] = useState("");
  const [associationKind, setAssociationKind] = useState(station.association?.kind ?? "none");
  const [associationId, setAssociationId] = useState(station.association?.id ?? "");
  const collarPosition = collar.trim().split(",").map(value => Number(value.trim()));
  const validCollar = /^\s*-?\d+\s*,\s*-?\d+\s*,\s*-?\d+\s*$/.test(collar) && collarPosition.every(Number.isSafeInteger);
  const validAssociation = associationKind === "none" || /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,159}$/.test(associationId);
  const ship = mission.ship, registryRevision = mission.stations!.revision;
  const docked = ship ? shipDock(ship) : null, owner = station.ownerId === "local";
  const base = { stationId: station.id, registryRevision };
  const readings = mission.stationReadings?.[station.id];
  return <section aria-label={station.name}>
    <h4>{station.name} · {station.band}</h4>
    <p>Owner {station.ownerId} · {station.pressureZoneIds.length} linked pressure zones · claim extends 24 blocks from its core.</p>
    <details><summary>Measured habitat and power</summary>
      {!readings ? <p>Measurements unavailable or private. Keep EVA protection until a live room check is safe.</p> : <>
        {!readings.rooms.length && <p>No room measured by an authorized loaded controller. Fit life support and check the pressure boundary.</p>}
        {readings.rooms.map((room, index) => <section key={room.id} aria-label={`Measured room ${index + 1}`}>
          <p>Room {index + 1} · {room.volumeM3} m³ · {room.breathable ? "Breathable now" : `Unsafe: ${room.blockers.join(", ")}`} · {room.occupants} occupants</p>
          <dl className="ww-readings"><div><dt>Pressure</dt><dd>{room.pressureKPa.toFixed(1)} kPa</dd></div>
            <div><dt>Oxygen</dt><dd>{room.oxygenPercent.toFixed(2)}%</dd></div><div><dt>CO₂</dt><dd>{room.co2Ppm} ppm</dd></div>
            <div><dt>Temperature</dt><dd>{room.temperatureC.toFixed(1)} °C</dd></div></dl>
          <p>Room O₂ reserve at current consumption: {room.reserveSeconds === null ? "not estimable" : `${room.reserveSeconds} s`}. This excludes supplies and does not predict CO₂, heat or pressure failure.</p>
          {room.rates && <p>O₂ use / plant production: {room.rates.oxygenConsumedMmolPerSecond} / {room.rates.oxygenProducedMmolPerSecond} mmol/s. CO₂ production / removal: {room.rates.co2ProducedMmolPerSecond} / {room.rates.co2RemovedMmolPerSecond} mmol/s. Gas inflow / outflow: {room.rates.inflowMmolPerSecond} / {room.rates.outflowMmolPerSecond} mmol/s.</p>}
        </section>)}
        {readings.buffers ? <p>Authorized loaded buffers: {(readings.buffers.energyJ / 1000).toFixed(1)} / {(readings.buffers.capacityJ / 1000).toFixed(1)} kJ; {(readings.buffers.oxygenMl / 1000).toFixed(2)} standard L stored O₂. {readings.buffers.noPower} machines waiting for power; {readings.buffers.disabled} disabled or control-gated. Measured habitat draw: {readings.buffers.habitatDrawW} W. Buffers are not necessarily connected to the same grid.</p>
          : <p>Stored gas and power are private; container permission is separate from life-support access.</p>}
      </>}
    </details>
    {Object.values(station.docks).map(dock => <div className="ww-controls" key={dock.id}>
      <span>Collar [{dock.position.join(", ")}] · {dock.occupant ? "Occupied" : "Open"}</span>
      {ship && <button type="button" disabled={!!ship.trip || (!!dock.occupant && dock.occupant.vehicleId !== ship.vehicleId)} onClick={() => onAction({ kind: "station-dock", ...base,
        vehicleRevision: ship.revision, dockId: dock.id, undock: docked?.stationId === station.id && docked.dockId === dock.id })}>{docked?.stationId === station.id && docked.dockId === dock.id ? "Undock spacecraft" : "Dock spacecraft"}</button>}
    </div>)}
    <details><summary>Register a placed collar</summary>
      <p>Place an Orbital Dock normally inside the claim, then stand within eight blocks. Registration uses that existing block and does not supply materials.</p>
      <label>Placed collar coordinates <input value={collar} maxLength={80} placeholder="x, y, z" onChange={event => setCollar(event.target.value)} /></label>
      <button type="button" disabled={!validCollar} onClick={() => onAction({ kind: "station-register-dock", ...base, position: collarPosition as [number, number, number] })}>Register collar</button>
    </details>
    <details><summary>Small cabin blueprint</summary>
      <p>37 Stone Brick · 2 Reinforced Windows · 1 Pressure Door · 1 Truss. Door stores are preserved.</p>
      <button type="button" onClick={() => onAction({ kind: "station-cabin", ...base })}>Build cabin shell</button>
      <p>Leaves a controller socket at [{station.corePosition[0] + 3}, {station.corePosition[1] + 1}, {station.corePosition[2] - 1}]. Place a supplied Life-Support Controller facing south. Supply power and gas; keep EVA protection until the room is measured safe.</p>
    </details>
    {owner && <details><summary>Station administration</summary>
      <label>Station name <input maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>
      <label>Station icon <select value={icon} onChange={event => setIcon(event.target.value)}>
        {[...new Set([station.icon, "station", "observatory", "habitat", "greenhouse", "cargo", "rescue"])].map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <button type="button" onClick={() => onAction({ kind: "station-name", ...base, name, icon })}>Rename station</button>
      <label>Trusted member IDs <input value={members} onChange={event => setMembers(event.target.value)} placeholder="Comma-separated player or agent IDs" /></label>
      <button type="button" onClick={() => onAction({ kind: "station-access", ...base, memberIds: members.split(",").map(id => id.trim()).filter(Boolean), association: station.association, access: station.access })}>Save members</button>
      <label>Station association <select value={associationKind} onChange={event => setAssociationKind(event.target.value as typeof associationKind)}><option value="none">None</option><option value="faction">Faction</option><option value="guild">Guild</option></select></label>
      {associationKind !== "none" && <label>Association ID <input value={associationId} maxLength={160} onChange={event => setAssociationId(event.target.value)} /></label>}
      <button type="button" disabled={!validAssociation} onClick={() => onAction({ kind: "station-access", ...base, memberIds: station.memberIds, access: station.access,
        association: associationKind === "none" ? null : { kind: associationKind as "faction" | "guild", id: associationId } })}>Save association</button>
      {STATION_PERMISSIONS.map(permission => <label key={permission}>{permission} <select aria-label={`Station ${permission} permission`} value={station.access[permission]}
        onChange={event => onAction({ kind: "station-access", ...base, memberIds: station.memberIds, association: station.association,
          access: { ...station.access, [permission]: event.target.value as StationGrant } })}>
        {STATION_GRANTS.map(grant => <option key={grant} value={grant}>{grant}</option>)}
      </select></label>)}
      <button type="button" onClick={() => onAction({ kind: "station-habitat", ...base })}>Refresh measured habitat links</button>
      <p>Pressure links record measured rooms; they do not refill or seal them. Faction access requires verified host membership.</p>
    </details>}
  </section>;
}
