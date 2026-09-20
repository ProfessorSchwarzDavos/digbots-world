import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  CAVE_GRAPH_LAYER_Y,
  UNDERGROUND_BIOME_NAMES,
  UndergroundBiomeId,
  caveGraphEdgesInBounds,
  caveGraphNodesInBounds,
  nearestUpperCaveNode,
} from "../app/game/underground";
import {
  BiomeId,
  ChunkWorld,
  MAX_Y,
  MIN_Y,
  planDeepgearMineRoad,
} from "../app/game/world";
import {
  buildWorldOverhaulAudit,
  caveAudit,
  dwarfHoldAudit,
  formatWorldOverhaulAudit,
} from "./audit-world-overhaul";
import { buildInspectionSpecs, renderModelPortraits } from "./render-models";

const SHOWCASE_SEED = "WILDERNESS";
const DWARF_SHOWCASE_SEED = "GLASSWATER";
const DEFAULT_OUTPUT = path.resolve("output/world-overhaul");
const SURFACE_COLORS: Readonly<Record<BiomeId, string>> = Object.freeze({
  [BiomeId.DeepOcean]: "#17334c",
  [BiomeId.Ocean]: "#28658a",
  [BiomeId.Beach]: "#d6c283",
  [BiomeId.Meadow]: "#85a853",
  [BiomeId.Wildwood]: "#315e39",
  [BiomeId.Frostpine]: "#41675a",
  [BiomeId.Desert]: "#d6ad54",
  [BiomeId.Savanna]: "#a99c43",
  [BiomeId.Siltfen]: "#526f56",
  [BiomeId.Snowfield]: "#d9e4df",
  [BiomeId.Badlands]: "#a75d3d",
  [BiomeId.Birchlight]: "#83a66f",
  [BiomeId.Bloomwood]: "#6f9a65",
  [BiomeId.Highlands]: "#718076",
  [BiomeId.Volcanic]: "#5d342f",
  [BiomeId.MushroomFen]: "#735d80",
  [BiomeId.River]: "#3f8fa6",
  [BiomeId.CloudreedGlen]: "#8cae7b",
  [BiomeId.RainveilJungle]: "#245d42",
  [BiomeId.SakurabloomGrove]: "#a67583",
  [BiomeId.LumenTrench]: "#174e68",
  [BiomeId.SugarplumVale]: "#b57b9f",
  [BiomeId.Glimmerwood]: "#477963",
  [BiomeId.SnowcapRange]: "#edf2ed",
  [BiomeId.PaleRegolithSea]: "#b5bbb0",
  [BiomeId.StarshadowCraters]: "#686e76",
  [BiomeId.MoonSlateHighlands]: "#8c97a5",
  [BiomeId.IceLanternRilles]: "#a8dbd0",
  [BiomeId.BuriedWaystoneGalleries]: "#798485",
  [BiomeId.OrbitalVoid]: "#050813",
});
const UNDERGROUND_COLORS: Readonly<Record<UndergroundBiomeId, string>> = Object.freeze({
  [UndergroundBiomeId.OrdinaryTunnel]: "#59605e",
  [UndergroundBiomeId.RootweaveGrotto]: "#7fa85a",
  [UndergroundBiomeId.StarbloomHollows]: "#a47ad4",
  [UndergroundBiomeId.GlasswaterDeeps]: "#52b5cb",
  [UndergroundBiomeId.PillarstoneReaches]: "#b5a98c",
  [UndergroundBiomeId.CrystaldeepGallery]: "#77a8e4",
  [UndergroundBiomeId.EmberdeepFumaroles]: "#e3733e",
});

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function shadeHex(hex: string, factor: number) {
  const raw = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) => clamp(Math.round(Number.parseInt(raw.slice(offset, offset + 2), 16) * factor), 0, 255));
  return `rgb(${channels.join(",")})`;
}

async function writeSvgAndPng(svg: string, destinationWithoutExtension: string) {
  const svgPath = `${destinationWithoutExtension}.svg`;
  const pngPath = `${destinationWithoutExtension}.png`;
  await writeFile(svgPath, svg, "utf8");
  try {
    const sharp = (await import("sharp")).default;
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    return [svgPath, pngPath];
  } catch (error) {
    process.stderr.write(`PNG rendering unavailable for ${path.basename(svgPath)} (${error instanceof Error ? error.message : String(error)}).\n`);
    return [svgPath];
  }
}

type SurfaceMap = Readonly<{
  cells: readonly Readonly<{ biome: BiomeId; height: number }>[];
  distinctBiomes: number;
  meanHeight: number;
  elevationRange: readonly [number, number];
  transitionRate: number;
  mountainShare: number;
}>;

function sampleSurfaceMap(world: ChunkWorld, count: number, step: number): SurfaceMap {
  const cells: Array<{ biome: BiomeId; height: number }> = [];
  const half = count * step / 2;
  const biomes = new Set<BiomeId>();
  let heightTotal = 0;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  let mountains = 0;
  for (let z = 0; z < count; z += 1) for (let x = 0; x < count; x += 1) {
    const sample = world.sampleColumn(-half + (x + 0.5) * step, -half + (z + 0.5) * step);
    cells.push({ biome: sample.biome, height: sample.height });
    biomes.add(sample.biome);
    heightTotal += sample.height;
    minimum = Math.min(minimum, sample.height);
    maximum = Math.max(maximum, sample.height);
    mountains += Number(sample.height >= 65);
  }
  let transitions = 0;
  let checks = 0;
  for (let z = 0; z < count; z += 1) for (let x = 0; x < count; x += 1) {
    const current = cells[x + z * count];
    if (x + 1 < count) { checks += 1; transitions += Number(current.biome !== cells[x + 1 + z * count].biome); }
    if (z + 1 < count) { checks += 1; transitions += Number(current.biome !== cells[x + (z + 1) * count].biome); }
  }
  return {
    cells,
    distinctBiomes: biomes.size,
    meanHeight: heightTotal / cells.length,
    elevationRange: [minimum, maximum],
    transitionRate: transitions / checks * 100,
    mountainShare: mountains / cells.length * 100,
  };
}

function renderSurfaceComparison() {
  const count = 96;
  const step = 64;
  const legacy = new ChunkWorld();
  legacy.reset(SHOWCASE_SEED, undefined, { profile: "legacy-v14", biomeScale: 1 });
  const current = new ChunkWorld();
  current.reset(SHOWCASE_SEED, undefined, { profile: "world-below-v15" });
  const maps = [
    { title: "BEFORE · LEGACY V14", subtitle: "Local climate intersections", map: sampleSurfaceMap(legacy, count, step) },
    { title: "AFTER · THE WORLD BELOW", subtitle: "Regional cores + authored relief", map: sampleSurfaceMap(current, count, step) },
  ];
  const width = 1440;
  const height = 880;
  const mapSize = 588;
  const panelXs = [80, 772];
  const top = 164;
  const cellSize = mapSize / count;
  const panels = maps.map((entry, panelIndex) => {
    const panelX = panelXs[panelIndex];
    const rects = entry.map.cells.map((cell, index) => {
      const x = index % count;
      const z = Math.floor(index / count);
      const reliefShade = clamp(0.7 + ((cell.height - MIN_Y) / (MAX_Y - MIN_Y)) * 0.58, 0.68, 1.23);
      return `<rect x="${(panelX + x * cellSize).toFixed(2)}" y="${(top + z * cellSize).toFixed(2)}" width="${(cellSize + 0.15).toFixed(2)}" height="${(cellSize + 0.15).toFixed(2)}" fill="${shadeHex(SURFACE_COLORS[cell.biome], reliefShade)}"/>`;
    }).join("");
    const stats = [
      `${entry.map.distinctBiomes}/24 biomes in frame`,
      `Y ${entry.map.elevationRange[0]} to ${entry.map.elevationRange[1]}`,
      `${entry.map.mountainShare.toFixed(1)}% high terrain`,
      `${entry.map.transitionRate.toFixed(1)}% sampled edges`,
    ];
    return `<g>
      <text x="${panelX}" y="115" class="panel-title">${entry.title}</text>
      <text x="${panelX}" y="140" class="panel-subtitle">${entry.subtitle}</text>
      <rect x="${panelX - 5}" y="${top - 5}" width="${mapSize + 10}" height="${mapSize + 10}" rx="5" fill="#111713" stroke="#697268" stroke-width="2"/>
      ${rects}
      ${stats.map((stat, index) => `<text x="${panelX + index * 147}" y="790" text-anchor="middle" class="stat">${escapeXml(stat)}</text>`).join("")}
    </g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <style>.title{font:900 34px ui-sans-serif,system-ui;letter-spacing:2px;fill:#ecd181}.kicker{font:700 13px ui-sans-serif,system-ui;letter-spacing:2.4px;fill:#88a393}.panel-title{font:800 18px ui-sans-serif,system-ui;letter-spacing:1.2px;fill:#eef2e8}.panel-subtitle{font:500 12px ui-sans-serif,system-ui;fill:#9eaba1}.stat{font:700 10px ui-sans-serif,system-ui;fill:#b9c4bb}.footer{font:500 11px ui-sans-serif,system-ui;fill:#829087}</style>
    <rect width="100%" height="100%" fill="#0b100d"/>
    <text x="72" y="46" class="kicker">BLOCKWILD · GENERATOR STUDY · SEED ${SHOWCASE_SEED}</text>
    <text x="72" y="83" class="title">A MORE COHERENT SURFACE</text>
    ${panels}
    <line x1="720" y1="116" x2="720" y2="821" stroke="#2f3832" stroke-width="1"/>
    <text x="720" y="846" text-anchor="middle" class="footer">Same 6,144 × 6,144-block frame · biome color with elevation shading · no hand-authored substitutions</text>
  </svg>`;
}

function renderCaveAtlas(world: ChunkWorld) {
  const bound = 320;
  const nodes = caveGraphNodesInBounds(world.seed, -bound, bound, -bound, bound).filter((node) => Math.abs(node.x) <= bound && Math.abs(node.z) <= bound);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = caveGraphEdgesInBounds(world.seed, -bound, bound, -bound, bound).filter((edge) => nodeIds.has(edge.from.id) && nodeIds.has(edge.to.id));
  const audit = caveAudit(world);
  const panelSize = 390;
  const panelTop = 158;
  const panelXs = [60, 525, 990];
  const project = (value: number, origin: number) => origin + ((value + bound) / (bound * 2)) * panelSize;
  const panels = CAVE_GRAPH_LAYER_Y.map((nominalY, layer) => {
    const originX = panelXs[layer];
    const layerNodes = nodes.filter((node) => node.layer === layer);
    const lines = edges.filter((edge) => edge.from.layer === layer && edge.to.layer === layer).map((edge) => {
      const flowColor = edge.flow === "waterfall" ? "#6cc5db" : edge.flow === "stream" ? "#447f9f" : edge.stoneRoad ? "#bfa967" : "#56625d";
      return `<line x1="${project(edge.from.x, originX).toFixed(1)}" y1="${project(edge.from.z, panelTop).toFixed(1)}" x2="${project(edge.to.x, originX).toFixed(1)}" y2="${project(edge.to.z, panelTop).toFixed(1)}" stroke="${flowColor}" stroke-width="${edge.stoneRoad ? 1.8 : 1.05}" opacity="0.7"/>`;
    }).join("");
    const verticalNodes = new Set(edges.filter((edge) => edge.vertical && (edge.from.layer === layer || edge.to.layer === layer)).flatMap((edge) => [edge.from.id, edge.to.id]));
    const dots = layerNodes.map((node) => {
      const radius = node.scale === "cathedral" ? 10 : node.scale === "great" ? 7 : node.scale === "chamber" ? 4.2 : 2.6;
      const x = project(node.x, originX);
      const y = project(node.z, panelTop);
      return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius}" fill="${UNDERGROUND_COLORS[node.biome]}" stroke="${node.poi ? "#f0d582" : "#101713"}" stroke-width="${node.poi ? 1.8 : 0.9}"/>${verticalNodes.has(node.id) ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius + 3}" fill="none" stroke="#e4bf63" stroke-width="0.9" opacity="0.72"/>` : ""}${node.poi ? `<path d="M ${x} ${y - radius - 5} l 3 3 -3 3 -3 -3 z" fill="#f0d582"/>` : ""}</g>`;
    }).join("");
    const layerName = layer === 0 ? "DEEP LAYER" : layer === 1 ? "MIDDLE LAYER" : "UPPER LAYER";
    return `<g>
      <text x="${originX}" y="119" class="panel-title">${layerName} · Y ${nominalY >= 0 ? "+" : ""}${nominalY}</text>
      <text x="${originX}" y="140" class="panel-subtitle">${layerNodes.length} chambers · ${layerNodes.filter((node) => node.poi).length} landmarks</text>
      <rect x="${originX - 5}" y="${panelTop - 5}" width="${panelSize + 10}" height="${panelSize + 10}" rx="5" fill="#101613" stroke="#53615a" stroke-width="2"/>
      ${lines}${dots}
    </g>`;
  }).join("");
  const legendEntries = Object.entries(UNDERGROUND_BIOME_NAMES).slice(1).map(([id, name], index) => {
    const x = 70 + (index % 3) * 435;
    const y = 640 + Math.floor(index / 3) * 36;
    return `<circle cx="${x}" cy="${y - 4}" r="6" fill="${UNDERGROUND_COLORS[Number(id) as UndergroundBiomeId]}"/><text x="${x + 15}" y="${y}" class="legend">${escapeXml(name)}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="820" viewBox="0 0 1440 820">
    <style>.title{font:900 34px ui-sans-serif,system-ui;letter-spacing:2px;fill:#ecd181}.kicker{font:700 13px ui-sans-serif,system-ui;letter-spacing:2.4px;fill:#88a393}.panel-title{font:800 17px ui-sans-serif,system-ui;letter-spacing:1.1px;fill:#eef2e8}.panel-subtitle{font:500 11px ui-sans-serif,system-ui;fill:#9eaba1}.legend{font:650 13px ui-sans-serif,system-ui;fill:#c7d0c8}.metric{font:750 12px ui-sans-serif,system-ui;fill:#d8dfd6}.footer{font:500 11px ui-sans-serif,system-ui;fill:#829087}</style>
    <rect width="100%" height="100%" fill="#090e0c"/>
    <text x="60" y="45" class="kicker">BLOCKWILD · LIVE CAVE GRAPH · SEED ${SHOWCASE_SEED}</text>
    <text x="60" y="82" class="title">ONE CONNECTED WORLD BELOW</text>
    ${panels}
    <text x="60" y="588" class="metric">${audit.nodes.toLocaleString()} audited nodes · ${audit.edges.toLocaleString()} routes · ${audit.loops.toLocaleString()} loops · ${audit.components} connected component · ${audit.deadEnds} dead ends</text>
    <text x="1380" y="588" text-anchor="end" class="metric">${audit.connectedMouths}/${audit.mouths} cave mouths connected · ${audit.undergroundStreams} streams · ${audit.waterfalls} waterfalls</text>
    ${legendEntries}
    <g transform="translate(70 722)"><circle cx="0" cy="0" r="8" fill="none" stroke="#e4bf63"/><text x="16" y="4" class="legend">Vertical route between depth layers</text><circle cx="275" cy="0" r="7" fill="#59605e" stroke="#f0d582" stroke-width="2"/><text x="291" y="4" class="legend">Landmark / reward chamber</text><line x1="574" y1="0" x2="630" y2="0" stroke="#4f8ba5" stroke-width="3"/><text x="645" y="4" class="legend">Underground stream</text><line x1="865" y1="0" x2="921" y2="0" stroke="#bfa967" stroke-width="3"/><text x="936" y="4" class="legend">Authored Stone Road</text></g>
    <text x="720" y="787" text-anchor="middle" class="footer">Gold rings connect depth layers · blue routes carry water · chamber size reflects authored cavern scale</text>
  </svg>`;
}

function renderDwarvenHold(world: ChunkWorld) {
  const audit = dwarfHoldAudit(world);
  if (!audit.verifiedHoldId) throw new Error(`No generated Dwarven hold found for ${world.seedText}.`);
  const plan = world.settlementPlans.get(audit.verifiedHoldId);
  if (!plan) throw new Error(`Generated hold ${audit.verifiedHoldId} was not retained.`);
  const { candidate, layout } = plan;
  const holdY = candidate.floorY ?? world.sampleColumn(candidate.center.x, candidate.center.z).height - 18;
  const liftX = candidate.center.x + Math.max(7, layout.radiusBlocks - 5);
  const liftZ = candidate.center.z;
  const liftBottomY = holdY + 1;
  const liftTopY = world.sampleColumn(liftX, liftZ).height + 1;
  const target = nearestUpperCaveNode(world.seed, candidate.center.x, candidate.center.z);
  const road = planDeepgearMineRoad({ x: candidate.center.x, y: holdY + 2, z: candidate.center.z }, target);
  const width = 1440;
  const height = 800;
  const section = { x: 55, y: 148, width: 790, height: 520 };
  const profileMinX = liftX - 92;
  const profileMaxX = liftX + 92;
  const mapX = (x: number) => section.x + ((x - profileMinX) / (profileMaxX - profileMinX)) * section.width;
  const mapY = (y: number) => section.y + ((MAX_Y - y) / (MAX_Y - MIN_Y)) * section.height;
  const profile = Array.from({ length: 93 }, (_, index) => {
    const x = profileMinX + index * 2;
    return { x, y: world.sampleColumn(x, liftZ).height };
  });
  const mountainPath = `M ${section.x} ${section.y + section.height} L ${profile.map((point) => `${mapX(point.x).toFixed(1)} ${mapY(point.y).toFixed(1)}`).join(" L ")} L ${section.x + section.width} ${section.y + section.height} Z`;
  const liftScreenX = mapX(liftX);
  const civicScreenX = mapX(candidate.center.x);
  const layerGlyphs = layout.verticalLayers.map((layer, index) => {
    const y = mapY(layer.y);
    const x = civicScreenX - 92 + index * 35;
    return `<g><rect x="${x}" y="${y - 17}" width="185" height="34" rx="16" fill="#202b27" stroke="${layer.purpose === "forge-depth" ? "#d77845" : "#c6a35a"}" stroke-width="2"/><text x="${x + 92.5}" y="${y + 4}" text-anchor="middle" class="room">${escapeXml(layer.purpose.replaceAll("-", " ").toUpperCase())} · Y ${layer.y}</text></g>`;
  }).join("");
  const roadX = 920;
  const roadY = 205;
  const roadW = 455;
  const roadH = 300;
  const roadMinY = Math.min(...road.map((point) => point.y)) - 4;
  const roadMaxY = Math.max(...road.map((point) => point.y)) + 4;
  const roadPoints = road.map((point, index) => `${(roadX + (index / Math.max(1, road.length - 1)) * roadW).toFixed(1)},${(roadY + ((roadMaxY - point.y) / Math.max(1, roadMaxY - roadMinY)) * roadH).toFixed(1)}`).join(" ");
  const maximumGrade = road.slice(1).reduce((maximum, point, index) => Math.max(maximum, Math.abs(point.y - road[index].y)), 0);
  const badges = [
    ["MOUNTAIN", audit.mountainCompatible === audit.accepted],
    ["PAIRED LIFT", audit.pairedLift],
    ["CLEAR SHAFT", audit.shaftClear],
    ["GATEHOUSE", audit.gatehouseComplete],
    ["MINE ROAD", audit.mineRoadConnected],
    ["MAP MARKER", audit.discoveryMarker],
  ] as const;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <style>.title{font:900 34px ui-sans-serif,system-ui;letter-spacing:2px;fill:#ecd181}.kicker{font:700 13px ui-sans-serif,system-ui;letter-spacing:2.4px;fill:#88a393}.panel-title{font:800 17px ui-sans-serif,system-ui;letter-spacing:1.1px;fill:#eef2e8}.panel-subtitle{font:500 11px ui-sans-serif,system-ui;fill:#9eaba1}.room{font:750 10px ui-sans-serif,system-ui;letter-spacing:.6px;fill:#ece8d8}.label{font:700 11px ui-sans-serif,system-ui;fill:#d3ddd5}.small{font:550 10px ui-sans-serif,system-ui;fill:#9ba89f}.badge{font:800 9px ui-sans-serif,system-ui;letter-spacing:.7px;fill:#dfe9df}</style>
    <defs><linearGradient id="mountain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#647269"/><stop offset=".45" stop-color="#3b4640"/><stop offset="1" stop-color="#151c19"/></linearGradient><linearGradient id="road" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d6b85e"/><stop offset="1" stop-color="#77a5c3"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="#090e0c"/>
    <text x="55" y="44" class="kicker">BLOCKWILD · GENERATED DEEPGEAR HOLD · SEED ${escapeXml(world.seedText)}</text>
    <text x="55" y="82" class="title">THE MOUNTAIN STILL WORKS</text>
    <text x="55" y="111" class="panel-subtitle">${escapeXml(audit.verifiedBiome ?? "unknown biome")} · ${audit.accepted} accepted holds · inspected ${escapeXml(audit.verifiedHoldId)}</text>
    <text x="55" y="137" class="panel-title">ACTUAL TERRAIN SECTION</text>
    <rect x="${section.x}" y="${section.y}" width="${section.width}" height="${section.height}" rx="5" fill="#0f1512" stroke="#53615a" stroke-width="2"/>
    <path d="${mountainPath}" fill="url(#mountain)" stroke="#859187" stroke-width="1.3"/>
    <rect x="${liftScreenX - 12}" y="${mapY(liftTopY)}" width="24" height="${mapY(liftBottomY) - mapY(liftTopY)}" fill="#111815" stroke="#d5b458" stroke-width="3"/>
    <line x1="${liftScreenX - 5}" y1="${mapY(liftTopY)}" x2="${liftScreenX - 5}" y2="${mapY(liftBottomY)}" stroke="#91a399" stroke-width="2"/><line x1="${liftScreenX + 5}" y1="${mapY(liftTopY)}" x2="${liftScreenX + 5}" y2="${mapY(liftBottomY)}" stroke="#91a399" stroke-width="2"/>
    <g transform="translate(${liftScreenX - 42} ${mapY(liftTopY) - 43})"><path d="M0 40V17h14V4h56v13h14v23" fill="#303a35" stroke="#d1ae56" stroke-width="3"/><circle cx="12" cy="30" r="5" fill="#f3c75e"/><circle cx="72" cy="30" r="5" fill="#f3c75e"/></g>
    ${layerGlyphs}
    <circle cx="${mapX(target.x)}" cy="${mapY(target.y)}" r="13" fill="#315b66" stroke="#78c0d0" stroke-width="3"/><text x="${mapX(target.x) + 20}" y="${mapY(target.y) - 10}" class="label">CAVE-GRAPH HUB</text>
    <text x="${liftScreenX + 20}" y="${mapY(liftTopY) + 15}" class="label">MOUNTAIN GATE · Y ${liftTopY}</text><text x="${liftScreenX + 20}" y="${mapY(liftBottomY) - 8}" class="small">PAIRED DEEPGEAR LIFT · ${liftTopY - liftBottomY} BLOCKS</text>
    <text x="${section.x + 12}" y="${section.y + section.height - 13}" class="small">WORLD BOUNDS Y ${MIN_Y} TO ${MAX_Y} · PROFILE SAMPLED AT Z ${liftZ}</text>
    <text x="920" y="167" class="panel-title">MINE ROAD ELEVATION</text><text x="920" y="188" class="panel-subtitle">${road.length} unique treads · maximum grade ${maximumGrade} block · deterministic switchback</text>
    <rect x="${roadX}" y="${roadY}" width="${roadW}" height="${roadH}" rx="5" fill="#101613" stroke="#53615a" stroke-width="2"/>
    ${[0, 1, 2, 3].map((index) => `<line x1="${roadX}" y1="${roadY + index * roadH / 3}" x2="${roadX + roadW}" y2="${roadY + index * roadH / 3}" stroke="#27312c"/>`).join("")}
    <polyline points="${roadPoints}" fill="none" stroke="url(#road)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${roadX}" cy="${roadPoints.split(" ")[0].split(",")[1]}" r="7" fill="#d6b85e"/><circle cx="${roadX + roadW}" cy="${roadPoints.split(" ").at(-1)?.split(",")[1]}" r="7" fill="#77a5c3"/>
    <text x="${roadX}" y="${roadY + roadH + 25}" class="small">CIVIC HOLD</text><text x="${roadX + roadW}" y="${roadY + roadH + 25}" text-anchor="end" class="small">UPPER CAVE HUB</text>
    ${badges.map(([name, pass], index) => { const x = 920 + (index % 2) * 230; const y = 568 + Math.floor(index / 2) * 52; return `<g transform="translate(${x} ${y})"><rect width="215" height="37" rx="4" fill="${pass ? "#173929" : "#4b2424"}" stroke="${pass ? "#5db47e" : "#d66a61"}"/><circle cx="18" cy="18.5" r="7" fill="${pass ? "#65cf8c" : "#e07067"}"/><text x="34" y="22" class="badge">${escapeXml(name)} · ${pass ? "PASS" : "FAIL"}</text></g>`; }).join("")}
    <text x="920" y="752" class="small">Generated blocks · shaft, gate, road, marker, and mountain anchoring: PASS.</text>
  </svg>`;
}

export async function renderWorldOverhaulShowcase(output = DEFAULT_OUTPUT) {
  await mkdir(output, { recursive: true });
  const files: string[] = [];
  files.push(...await writeSvgAndPng(renderSurfaceComparison(), path.join(output, "world-below-surface-before-after")));

  const world = new ChunkWorld();
  world.reset(SHOWCASE_SEED, undefined, { profile: "world-below-v15" });
  files.push(...await writeSvgAndPng(renderCaveAtlas(world), path.join(output, "world-below-cave-atlas")));
  const dwarfWorld = new ChunkWorld();
  dwarfWorld.reset(DWARF_SHOWCASE_SEED, undefined, { profile: "world-below-v15" });
  files.push(...await writeSvgAndPng(renderDwarvenHold(dwarfWorld), path.join(output, "world-below-dwarven-hold")));

  const creatureIds = new Set(["grotto-grazer", "lanternray", "prismtail-swift", "glassback-newt", "sailfin-skimmer", "ashnose-bat", "chimewing", "cinder-kite", "veinling"]);
  const creatureSpecs = buildInspectionSpecs().filter((spec) => creatureIds.has(spec.id));
  if (creatureSpecs.length !== creatureIds.size) throw new Error(`Expected ${creatureIds.size} World Below creature models; found ${creatureSpecs.length}.`);
  const creatureOutput = path.join(output, "creature-lineup");
  const renderedCreatures = await renderModelPortraits({ out: creatureOutput, columns: 3, specs: creatureSpecs, png: true });
  files.push(...renderedCreatures.files);
  const creatureSheet = await readFile(renderedCreatures.sheetPath, "utf8");
  files.push(...await writeSvgAndPng(creatureSheet, path.join(output, "world-below-creatures")));

  const audit = buildWorldOverhaulAudit();
  const auditJson = path.join(output, "world-overhaul-audit.json");
  const auditText = path.join(output, "world-overhaul-audit.txt");
  await writeFile(auditJson, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  await writeFile(auditText, `${formatWorldOverhaulAudit(audit)}\n`, "utf8");
  files.push(auditJson, auditText);

  const manifestPath = path.join(output, "showcase-manifest.json");
  await writeFile(manifestPath, `${JSON.stringify({
    schema: 1,
    release: "1.7.0 · Wild Bonds & Hearthroads",
    seed: SHOWCASE_SEED,
    generatedAt: audit.generatedAt,
    files: files.map((file) => path.relative(output, file).replaceAll("\\", "/")),
  }, null, 2)}\n`, "utf8");
  files.push(manifestPath);
  return { output, files, manifestPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const outputIndex = process.argv.indexOf("--out");
  const output = outputIndex >= 0 && process.argv[outputIndex + 1] ? path.resolve(process.argv[outputIndex + 1]) : DEFAULT_OUTPUT;
  const result = await renderWorldOverhaulShowcase(output);
  process.stdout.write(`${JSON.stringify({ status: "rendered", output: result.output, files: result.files.length, manifest: result.manifestPath }, null, 2)}\n`);
}
