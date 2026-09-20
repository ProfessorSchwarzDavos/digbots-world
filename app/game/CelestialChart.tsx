"use client";
import { useId, useState } from "react";
import type { CelestialChartProjection, CelestialChartMode } from "./celestial-chart";

export type CelestialChartProps = {
  charts: { system: CelestialChartProjection; orbit: CelestialChartProjection };
  initialMode?: CelestialChartMode; onClose?: () => void;
};

// Scoped here so this small embeddable instrument also renders in ordinary SSR
// consumers. No document listeners, viewport assumptions or external assets.
const chartCss = `
.celestial-chart { color:#302b20; background:#eee7d3; border-block:1px solid #a79a74; padding:16px; min-width:0; font-size:13px; line-height:1.5; overflow-wrap:anywhere; }
.celestial-chart * { box-sizing:border-box; }
.celestial-chart h3,.celestial-chart h4,.celestial-chart p { margin:0 0 10px; }
.celestial-chart h3 { font-size:19px; letter-spacing:.02em; }
.celestial-chart h4 { font-size:14px; }
.celestial-chart header,.celestial-chart-controls { display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between; }
.celestial-chart-controls { justify-content:flex-start; margin:12px 0; }
.celestial-chart button { font:inherit; white-space:normal; min-height:44px; max-width:100%; padding:9px 13px; border:1px solid #58766e; border-radius:4px; background:#f7f1df; color:#245c50; cursor:pointer; transition:none; }
.celestial-chart button:hover:not(:disabled) { background:#dedbc4; color:#245c50; }
.celestial-chart button[aria-pressed=true] { background:#245c50; color:#fff8e6; }
.celestial-chart button[aria-pressed=true]:hover:not(:disabled) { background:#1b493e; color:#fff8e6; }
.celestial-chart button:focus-visible { outline:3px solid #7c421e; outline-offset:3px; }
.celestial-chart-layout { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr)); gap:18px; align-items:start; }
.celestial-chart figure { margin:0; min-width:0; }
.celestial-chart svg { width:100%; height:auto; display:block; background:#253e39; border-radius:4px; }
.celestial-chart figcaption,.celestial-chart-note { font-size:12px; color:#5c5947; margin-top:8px; }
.celestial-chart ol { margin:0; padding-left:24px; }
.celestial-chart li { padding:6px 0; border-bottom:1px solid #c7ba97; }
.celestial-chart li button { width:100%; text-align:left; padding:8px; border-color:transparent; }
.celestial-chart li small { display:block; font-size:12px; }
.celestial-chart-detail { margin-top:14px; border-left:3px solid #a16b3d; padding-left:12px; }
.celestial-chart-stations { margin-top:20px; }
.celestial-chart code { font-size:12px; white-space:normal; }
@media(max-width:480px) { .celestial-chart { padding:12px; } .celestial-chart-controls button { flex:1 1 110px; } }
@media(prefers-reduced-motion:reduce) { .celestial-chart button { transition:none; } }
`;

/** Keep adjacent moon/primary labels legible without moving their actual points. */
function markerLabels(points: readonly { x: number; y: number }[]) {
  const labels: { x: number; y: number }[] = [];
  for (const point of points) {
    const x = Math.min(365, point.x + 18);
    let y = point.y - 10;
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = Math.max(42, Math.min(378, point.y - 10 + (attempt % 2 ? 1 : -1) * Math.ceil(attempt / 2) * 20));
      y = candidate;
      if (!labels.some(label => Math.abs(label.x - x) < 30 && Math.abs(label.y - y) < 18)) break;
    }
    labels.push({ x, y });
  }
  return labels;
}

/** Parent gates observatory access/power; this component only inspects supplied knowledge. */
export function CelestialChart({ charts, initialMode = "system", onClose }: CelestialChartProps) {
  const [mode, setMode] = useState<CelestialChartMode>(initialMode);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const chart = charts[mode];
  const bodyLabels = markerLabels(chart.bodies), stationLabels = markerLabels(chart.stations);
  const selected = chart.bodies.find(body => body.id === selectedId) ?? chart.bodies.find(body => body.current) ?? chart.bodies[0];
  const headingId = useId(), mapId = useId(), mapDescriptionId = useId(), stationMapId = useId();
  return <section className="celestial-chart" aria-labelledby={headingId} data-celestial-chart={mode}
    onKeyDown={event => {
      // Let the containing dialog retain its Tab trap and Escape behavior.
      if (event.key === "Escape" && onClose) { event.stopPropagation(); onClose(); }
      else if (event.key !== "Tab" && event.key !== "Escape") event.stopPropagation();
    }} onKeyUp={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
    <style>{chartCss}</style>
    <header><h3 id={headingId}>Observatory chart</h3>{onClose && <button type="button" onClick={onClose}>Close chart</button>}</header>
    <p><strong>Current location: {chart.currentBodyName ?? "Uncharted body"}</strong> · {chart.locationKind} · {chart.instanceId}</p>
    <div className="celestial-chart-controls" role="group" aria-label="Chart view">
      <button type="button" aria-pressed={mode === "system"} onClick={() => setMode("system")}>System map</button>
      <button type="button" aria-pressed={mode === "orbit"} onClick={() => setMode("orbit")}>Orbital chart</button>
    </div>
    <p className="celestial-chart-note">{chart.clockIsEpoch ? "Catalog epoch · live clock unavailable" : `Universe time ${chart.universeSeconds.toFixed(0)} s`} · Known bodies only</p>
    <div className="celestial-chart-layout">
      <figure>
        <svg viewBox="0 0 400 400" role="img" aria-labelledby={`${mapId} ${mapDescriptionId}`}>
          <title id={mapId}>{mode === "system" ? "Known system bodies" : "Known orbital neighborhood"}</title>
          <desc id={mapDescriptionId}>Numbered markers match the known destination list. Double rings mark the current body. Distances are compressed; use the list for names and details.</desc>
          <g stroke="#617e6d" fill="none" opacity=".65"><path d="M200 22V378M22 200H378" />{[52, 104, 156].map(radius => <circle key={radius} cx="200" cy="200" r={radius} strokeDasharray="3 7" />)}</g>
          <text x="20" y="25" fill="#dac395" fontSize="11" letterSpacing="2">{mode === "system" ? "SYSTEM / XZ" : "ORBIT / XZ"}</text>
          {chart.bodies.map((body, index) => <g key={body.id} data-body-id={body.id}>
            <title>{`${body.name}${body.current ? " · current body" : ""}`}</title>
            {body.current && <circle cx={body.x} cy={body.y} r="15" fill="none" stroke="#f0d18a" strokeWidth="2" />}
            <circle cx={body.x} cy={body.y} r={body.kind === "star" ? 9 : 6} fill={body.current ? "#f0d18a" : "#a7d7c6"} stroke="#253e39" strokeWidth="2" />
            <path d={`M${body.x + 7} ${body.y}L${bodyLabels[index].x - 3} ${bodyLabels[index].y - 4}`} stroke="#90ae9e" strokeWidth="1" />
            <text x={bodyLabels[index].x} y={bodyLabels[index].y} fill="#fff7df" fontSize="13" paintOrder="stroke" stroke="#253e39" strokeWidth="3">{index + 1}</text>
          </g>)}
          {!chart.bodies.length && <text x="200" y="185" textAnchor="middle" fill="#fff7df" fontSize="14">No known bodies in this view</text>}
        </svg>
        <figcaption>{chart.focusName ? `Centered on ${chart.focusName}. ` : "Catalog reference plane. "}Top-down positions; distances compressed and body sizes symbolic. Use Orbital chart to separate nearby moons.</figcaption>
      </figure>
      <div><h4>Known destinations · {chart.bodies.length}</h4>
        {!chart.bodies.length ? <p>No chart knowledge supplied for this neighborhood.</p> : <ol aria-label="Known celestial destinations">{chart.bodies.map(body => <li key={body.id}>
          <button type="button" aria-pressed={selected?.id === body.id} onClick={() => setSelectedId(body.id)}>
            {body.name}{body.current && " · You are here"}<small>{body.kind.replaceAll("-", " ")}{body.parentName && ` · Around ${body.parentName}`}</small>
          </button>
        </li>)}</ol>}
        {selected && <div className="celestial-chart-detail" aria-live="polite"><h4>{selected.name}</h4>
          <p>{selected.current ? `Current body · ${chart.locationKind} (${chart.instanceId})` : "Known body"}</p>
          <p>{selected.distanceAu.toPrecision(4)} AU from {chart.focusName ?? "catalog origin"}</p>
          <p>{selected.illuminatedFraction === null ? "Observed phase unavailable" : `${Math.round(selected.illuminatedFraction * 100)}% illuminated in supplied sky sample`}</p>
        </div>}
      </div>
    </div>
    {mode === "orbit" && <section className="celestial-chart-stations" aria-label="Local station points">
      <h4>Station points · current location</h4>
      {!chart.stations.length ? <p>No station points supplied for this location.</p> : <div className="celestial-chart-layout"><figure>
        <svg viewBox="0 0 400 400" role="img" aria-labelledby={stationMapId}>
          <title id={stationMapId}>Supplied station points in local X/Z block coordinates; numbers match the station list</title>
          <path d="M200 22V378M22 200H378" stroke="#617e6d" />
          <text x="20" y="25" fill="#dac395" fontSize="11" letterSpacing="2">LOCAL / BLOCKS</text>
          {chart.stations.map((station, index) => <g key={station.id}><title>{`${station.name}: ${station.position.join(", ")}`}</title>
            <rect x={station.x - 5} y={station.y - 5} width="10" height="10" fill="#e1b47f" />
            <path d={`M${station.x + 7} ${station.y}L${stationLabels[index].x - 3} ${stationLabels[index].y - 4}`} stroke="#90ae9e" strokeWidth="1" />
            <text x={stationLabels[index].x} y={stationLabels[index].y} fill="#fff7df" fontSize="13">{index + 1}</text></g>)}
        </svg><figcaption>Local origin at center; +X right, +Z up. Height Y appears in the list. Separate from the celestial AU frame.</figcaption>
      </figure><ol aria-label="Supplied station coordinates">{chart.stations.map(station => <li key={station.id}><strong>{station.name}</strong><small>X, Y, Z: <code>{station.position.join(", ")}</code> blocks</small></li>)}</ol></div>}
    </section>}
    <p className="celestial-chart-note">Read-only observations. Route estimates, travel access and undiscovered destinations are not provided by this chart.</p>
  </section>;
}
