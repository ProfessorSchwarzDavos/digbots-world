"use client";
import { type KeyboardEvent } from "react";
import { itemName } from "./data";
import { FIRST_FLIGHT_ROUTES, SPACE_RESOURCE_LABELS, type SpaceflightIntent, type SpaceflightMission } from "./spaceflight-mission";
import { SURVEY_HOPPER_CAPACITY, VEHICLE_RESOURCES } from "./space-vehicle";

export function SpaceflightDialog({ mission, onAction, onClose, feedback }: { mission: SpaceflightMission;
  onAction: (action: SpaceflightIntent) => void; onClose: () => void; feedback?: string }) {
  function keys(event: KeyboardEvent<HTMLElement>) {
    event.stopPropagation();
    if (event.key === "Escape") { event.preventDefault(); onClose(); }
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), select:not(:disabled), summary")]
      .filter(element => element.checkVisibility());
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && event.target === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && event.target === last) { event.preventDefault(); first?.focus(); }
  }
  return <div className="ww-overlay" onPointerDown={event => event.stopPropagation()} onKeyUp={event => event.stopPropagation()}>
    <section className="ww-panel" role="dialog" aria-modal="true" aria-label="Spacecraft mission" onKeyDown={keys}>
      <header className="ww-header"><h2>Spacecraft mission</h2><button type="button" autoFocus onClick={onClose}>Return to cockpit</button></header>
      <div className="ww-body">{feedback && <p role="status">{feedback}</p>}<SpaceflightPanel mission={mission} onAction={onAction} /></div>
    </section>
  </div>;
}

export function SpaceflightPanel({ mission, onAction }: { mission: SpaceflightMission; onAction: (action: SpaceflightIntent) => void }) {
  const ship = mission.ship;
  const named = { "home-orbit": "Blockwild · low orbit", "home-surface": "Blockwild · home pad", "morrow-orbit": "Morrow · low orbit", "morrow-surface": "Morrow · surface approach" };
  return <section className="ww-materials spaceflight-mission" aria-label="Spacecraft mission">
    <h3>{ship ? "Survey Hopper · mission" : "First spacecraft"}</h3>
    {!ship ? <><p>Form a 3 × 3 pad with solid foundations and twelve blocks of clear sky. Select your crafted Hopper.</p>
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
  </section>;
}
