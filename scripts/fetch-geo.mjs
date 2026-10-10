#!/usr/bin/env node
// Build-time map data for a site drawn from a real location (PRD addendum WH-06, §6).
//
// Reads the labelled map of the compound (GeoJSON outlines drawn by the user), fetches the
// OpenStreetMap buildings and roads around it from Overpass (one request), projects everything to
// metres, turns it so the chosen dock side faces +z, and writes src/data/geo/<site>.json. The whole
// compound is kept; only map features inside the virtual dock yard are left out. The app only
// imports that JSON; it never calls the network at runtime.
//
//   node scripts/fetch-geo.mjs                     fetch from Overpass and write the JSON
//   node scripts/fetch-geo.mjs --save osm.json     also keep the raw Overpass response
//   node scripts/fetch-geo.mjs --input osm.json    rebuild from a saved response (no network)
//
// Hand-made decisions (main building, dock side, yard, heights, colours, buildings missing from OSM)
// live in src/data/geo/<site>.overrides.json. Output is deterministic: the same inputs give a
// byte-identical file.
//
// Map data © OpenStreetMap contributors, available under the Open Database License (ODbL).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const site = (opt('--site') ?? 'wh06').toLowerCase();
const overridesPath = path.join(ROOT, 'src/data/geo', `${site}.overrides.json`);
const outPath = path.join(ROOT, 'src/data/geo', `${site}.json`);
const ov = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'WareTrack-fetch-geo/1.0 (build-time map data for a demo dashboard; one request per site)';

// §6.3 height rules and §6.4 road widths.
const LEVEL_M = 3.4;
const ROAD_WIDTH = { primary: 10, secondary: 9, tertiary: 8, residential: 5.5, unclassified: 5.5, living_street: 5.5, service: 3.5, track: 3, path: 1.2, footway: 1.2, cycleway: 1.2, pedestrian: 1.2, steps: 1.2 };
const DEFAULT_WALL = '#EEF2FA';
const DEFAULT_ROOF = '#E3E9F4';

// ---------------------------------------------------------------- fetch

async function loadOsm() {
  const input = opt('--input');
  if (input) return JSON.parse(fs.readFileSync(input, 'utf8'));
  const { lat, lon, radius } = ov.query;
  const around = `(around:${radius},${lat},${lon})`;
  const query = `[out:json][timeout:90];(way["building"]${around};way["highway"]${around};way["landuse"]${around};);out geom;`;
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const save = opt('--save');
  if (save) fs.writeFileSync(save, JSON.stringify(json));
  return json;
}

// ---------------------------------------------------------------- geometry helpers

const r1 = (v) => Math.round(v * 10) / 10 + 0; // + 0 turns -0 into 0
const r2 = (v) => Math.round(v * 100) / 100 + 0;

function area(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, z0] = poly[i];
    const [x1, z1] = poly[(i + 1) % poly.length];
    a += x0 * z1 - x1 * z0;
  }
  return a / 2;
}

function centroid(poly) {
  const a = area(poly);
  if (Math.abs(a) < 1e-6) return poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, z0] = poly[i];
    const [x1, z1] = poly[(i + 1) % poly.length];
    const f = x0 * z1 - x1 * z0;
    cx += (x0 + x1) * f;
    cz += (z0 + z1) * f;
  }
  return [cx / (6 * a), cz / (6 * a)];
}

function bbox(pts) {
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
}

/** Sutherland–Hodgman clip of a polygon to an axis-aligned rectangle [x0, z0, x1, z1]. */
function clipPolygon(poly, [x0, z0, x1, z1]) {
  const edges = [
    [(p) => p[0] >= x0, (a, b) => lerpAt(a, b, 0, x0)],
    [(p) => p[0] <= x1, (a, b) => lerpAt(a, b, 0, x1)],
    [(p) => p[1] >= z0, (a, b) => lerpAt(a, b, 1, z0)],
    [(p) => p[1] <= z1, (a, b) => lerpAt(a, b, 1, z1)],
  ];
  let out = poly;
  for (const [inside, cut] of edges) {
    const src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i];
      const b = src[(i + 1) % src.length];
      if (inside(b)) {
        if (!inside(a)) out.push(cut(a, b));
        out.push(b);
      } else if (inside(a)) out.push(cut(a, b));
    }
    if (!out.length) break;
  }
  return out;
}

function lerpAt(a, b, axis, v) {
  const t = (v - a[axis]) / (b[axis] - a[axis]);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Liang–Barsky: the parts of a polyline inside rectangle r. */
function clipPolyline(line, [x0, z0, x1, z1]) {
  const pieces = [];
  let cur = [];
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i];
    const [bx, bz] = line[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    let t0 = 0;
    let t1 = 1;
    let ok = true;
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dz, az - z0], [dz, z1 - az]]) {
      if (Math.abs(p) < 1e-12) {
        if (q < 0) ok = false;
        continue;
      }
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
    }
    if (!ok || t0 > t1) {
      if (cur.length > 1) pieces.push(cur);
      cur = [];
      continue;
    }
    const a = [ax + dx * t0, az + dz * t0];
    const b = [ax + dx * t1, az + dz * t1];
    if (!cur.length) cur.push(a);
    cur.push(b);
    if (t1 < 1) {
      pieces.push(cur);
      cur = [];
    }
  }
  if (cur.length > 1) pieces.push(cur);
  return pieces;
}

/** Drop vertices that sit (almost) on the line between their neighbours. */
function simplify(poly, tol = 0.25, closed = true) {
  const pts = poly.filter((p, i) => i === 0 || Math.hypot(p[0] - poly[i - 1][0], p[1] - poly[i - 1][1]) > 0.05);
  if (closed && pts.length > 1 && Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < 0.05) pts.pop();
  let changed = true;
  while (changed && pts.length > (closed ? 3 : 2)) {
    changed = false;
    const n = pts.length;
    for (let i = closed ? 0 : 1; i < (closed ? n : n - 1); i++) {
      const a = pts[(i - 1 + n) % n];
      const b = pts[i];
      const c = pts[(i + 1) % n];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const dev = len < 1e-9 ? 0 : Math.abs((c[0] - a[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (c[1] - a[1])) / len;
      if (dev < tol) {
        pts.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return pts;
}

const lineLength = (line) => line.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - line[i][0], p[1] - line[i][1]), 0);
const rectsTouch = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

/** Rectangles minus one rectangle: each split into up to four pieces around the cut. */
function subtractRect(rects, cut) {
  return rects.flatMap((r) => (rectsTouch(r, cut) ? bandsAround(r, cut) : [r]));
}

/** A rectangle minus an overlapping one, as up to four rectangles (north, south, west, east). */
function bandsAround([wx0, wz0, wx1, wz1], [yx0, yz0, yx1, yz1]) {
  const out = [];
  if (yz0 > wz0) out.push([wx0, wz0, wx1, yz0]);
  if (yz1 < wz1) out.push([wx0, yz1, wx1, wz1]);
  if (yx0 > wx0) out.push([wx0, Math.max(wz0, yz0), yx0, Math.min(wz1, yz1)]);
  if (yx1 < wx1) out.push([yx1, Math.max(wz0, yz0), wx1, Math.min(wz1, yz1)]);
  return out;
}

// ---------------------------------------------------------------- frames

const KZ = 110574;
const projector = (o) => {
  const kx = 111320 * Math.cos((o.lat * Math.PI) / 180);
  return { project: (g) => [(g.lon - o.lon) * kx, -(g.lat - o.lat) * KZ] };
};
const rot = ([x, z], a) => [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)];
const deg = (d) => (d * Math.PI) / 180;

// Grid frame: metres from the pin, turned so the compound is square to the axes.
const gridRho = deg(ov.grid.rotationDeg);
const gridProj = projector(ov.grid.origin);
const toGrid = (g) => rot(gridProj.project(g), gridRho);
// Local frame: the grid turned so the dock side faces +z, anchor at the site centre.
const FACING = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };
const facing = FACING[ov.frame.dockFacing];
if (!facing) throw new Error(`frame.dockFacing must be one of ${Object.keys(FACING).join(', ')}`);
const turn = Math.PI / 2 - Math.atan2(facing[1], facing[0]);
const [ax, az] = ov.frame.anchor;
const gridToLocal = ([gx, gz]) => rot([gx - ax, gz - az], turn);
const llToLocal = (g) => gridToLocal(toGrid(g));
/** Grid-frame ridge axis → local axis (a quarter turn swaps them). */
const swapAxes = Math.abs(Math.sin(turn)) > Math.SQRT1_2;
const localAxis = (a) => (swapAxes ? { x: 'z', z: 'x' }[a] : a);
const fixPoly = (poly) => poly.map(([x, z]) => [r1(x), r1(z)]);
const closedRing = (pts) => (pts.length > 2 && Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < 3 ? pts.slice(0, -1) : pts);
const pointIn = ([x, z], poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
};

// ---------------------------------------------------------------- build

const osm = await loadOsm();
const ways = osm.elements.filter((e) => e.type === 'way' && e.geometry?.length > 1).sort((a, b) => a.id - b.id);
const yards = ov.yards ?? [ov.yard];

// Zones: the user's labelled outlines (a zone marked 'removed' is left out).
const zoneMap = JSON.parse(fs.readFileSync(path.join(ROOT, ov.zones.file), 'utf8'));
const zones = [];
let address = null;
for (const f of zoneMap.features) {
  const label = f.properties?.label ?? '';
  if (f.geometry.type === 'Point') {
    const [lon, lat] = f.geometry.coordinates;
    address = { label, pos: fixPoly([llToLocal({ lon, lat })])[0] };
    continue;
  }
  const ring = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates;
  const grid = closedRing(ring.map(([lon, lat]) => toGrid({ lon, lat })));
  const o = ov.zones[label];
  if (!o) throw new Error(`no overrides for zone "${label}"`);
  if (o.kind === 'removed') continue;
  zones.push({ label, o, poly: simplify(grid.map(gridToLocal), 0.3) });
}

function heightOf(o, tags, a) {
  if (o?.height) return { h: o.height, rule: 'override' };
  const t = tags ?? {};
  const tagged = parseFloat(t.height);
  if (Number.isFinite(tagged)) return { h: tagged, rule: 'tag:height' };
  const levels = parseFloat(t['building:levels']);
  if (Number.isFinite(levels)) return { h: levels * LEVEL_M + 1, rule: 'tag:levels' };
  return { h: a < 60 ? 3.5 : a <= 400 ? 5 : 8, rule: 'area' };
}

/** Colours and roof. Ridge axes in the overrides are in the grid frame; default: along the longer side. */
function styleOf(o = {}, poly) {
  const out = { wall: o.wall ?? DEFAULT_WALL, roof: o.roof ?? DEFAULT_ROOF, roofShape: o.roofShape ?? 'flat' };
  if (out.roofShape === 'gable') {
    const [x0, z0, x1, z1] = bbox(poly);
    const axis = o.ridgeAxis ? localAxis(o.ridgeAxis) : x1 - x0 >= z1 - z0 ? 'x' : 'z';
    Object.assign(out, { rise: o.rise ?? 2, ridges: o.ridges ?? 1, ridgeAxis: axis });
  }
  if (o.accent) out.accent = { ...o.accent, poly: fixPoly(o.accent.poly.map(gridToLocal)) };
  if (o.roofHouse) out.roofHouse = { ...o.roofHouse, poly: fixPoly(o.roofHouse.poly.map(gridToLocal)) };
  return out;
}

// Compound bounds (local): every zone plus a margin, clamped where a road runs alongside.
const [cx0, cz0, cx1, cz1] = bbox(zones.flatMap((z) => z.poly));
const m = ov.base.margin;
const cl = ov.base.clamp ?? {};
const base = [Math.max(cx0 - m, cl.x0 ?? -Infinity), Math.max(cz0 - m, cl.z0 ?? -Infinity), Math.min(cx1 + m, cl.x1 ?? Infinity), Math.min(cz1 + m, cl.z1 ?? Infinity)].map(r1);
const bands = yards.reduce((rs, y) => subtractRect(rs, y), [base]).map((r) => r.map(r1)).filter((r) => r[2] - r[0] > 0.5 && r[3] - r[1] > 0.5);
const inBase = ([x, z]) => x >= base[0] && x <= base[2] && z >= base[1] && z <= base[3];
const inYard = ([x, z]) => yards.some((y) => x > y[0] && x < y[2] && z > y[1] && z < y[3]);

const buildings = [];
const dropped = [];
const buildingZones = zones.filter((z) => z.o.kind === 'building');
const consider = (id, poly, osmTags, o, zone) => {
  const a = Math.abs(area(poly));
  if (ov.drop?.[id]) return dropped.push({ id, reason: ov.drop[id] });
  if (yards.some((y) => rectsTouch(bbox(poly), y))) return dropped.push({ id, reason: 'inside the operational yard' });
  const { h, rule } = heightOf(o, osmTags, a);
  const b = { id, source: zone ? 'zone' : osmTags ? 'osm' : 'manual', height: r2(h), heightRule: rule, ...styleOf(o, poly), poly: fixPoly(poly) };
  if (zone) b.zone = zone;
  buildings.push(b);
};
// Zones that are buildings are drawn from the user's outline.
buildingZones.forEach((z, i) => consider(`zone-${i + 1}`, z.poly, null, z.o, z.o.name));
// OSM buildings inside the compound, except where a zone outline already draws the building.
for (const w of ways) {
  if (!w.tags?.building) continue;
  const g = w.geometry;
  if (g[0].lat !== g.at(-1).lat || g[0].lon !== g.at(-1).lon) continue; // not a closed footprint
  const poly = simplify(g.map(llToLocal));
  const c = centroid(poly);
  if (!inBase(c)) continue;
  if (buildingZones.some((z) => pointIn(c, z.poly))) continue;
  consider(w.id, poly, w.tags, ov.buildings?.[w.id]);
}
for (const x of ov.extra ?? []) consider(x.id, x.poly.map(gridToLocal), null, x);

// Open zones get a ground fill and trees; every zone gets its outline and label.
const hash = (i, k) => {
  const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const trees = (ov.trees?.points ?? []).map(gridToLocal);
const zonesOut = zones.map((z, zi) => {
  const out = { name: z.o.name, kind: z.o.kind, poly: fixPoly(z.poly) };
  // The outline as drawn on the ground, and the fill of open zones, outside the dock yard.
  const ring = [...z.poly, z.poly[0]];
  out.outline = bands.flatMap((band) => clipPolyline(ring, band)).filter((p) => lineLength(p) > 1).map(fixPoly);
  if (z.o.fill) {
    out.fill = z.o.fill;
    out.fillParts = bands.map((band) => simplify(clipPolygon(z.poly, band))).filter((p) => p.length >= 3 && Math.abs(area(p)) >= 4).map(fixPoly);
  }
  const own = buildings.find((b) => b.zone === z.o.name && b.poly.length === out.poly.length);
  const at = z.o.labelAt ? gridToLocal(z.o.labelAt) : centroid(z.poly);
  const top = own?.height ?? (z.o.kind === 'lot' ? ov.main.height : 0);
  out.label = { pos: [r1(at[0]), r1(at[1])], y: r1(top + 3.5) };
  if (z.o.trees) {
    // Deterministic scatter on a 7 m lattice inside the outline.
    const [x0, z0, x1, z1] = bbox(z.poly);
    const cand = [];
    for (let x = x0 + 4; x < x1 - 3; x += 7)
      for (let zz = z0 + 4; zz < z1 - 3; zz += 7) {
        const p = [x + (hash(zi, x * 0.37 + zz) - 0.5) * 3, zz + (hash(zi + 7, x + zz * 0.53) - 0.5) * 3];
        if (pointIn(p, z.poly) && !buildings.some((b) => pointIn(p, b.poly))) cand.push({ p, k: hash(zi + 3, x * 1.7 + zz * 2.3) });
      }
    cand.sort((a, b) => a.k - b.k).slice(0, z.o.trees).forEach((c) => trees.push(c.p));
  }
  return out;
});

const areas = (ov.areas ?? []).map((a) => {
  const poly = a.poly.map(gridToLocal);
  const parts = bands.map((band) => simplify(clipPolygon(clipPolygon(poly, base), band))).filter((p) => p.length >= 3 && Math.abs(area(p)) >= 4);
  return { id: a.id, kind: a.kind, poly: fixPoly(poly), parts: parts.map(fixPoly) };
});

const roads = [];
for (const w of ways) {
  const cls = w.tags?.highway;
  if (!cls || w.tags.area === 'yes') continue;
  if (ov.drop?.[w.id]) {
    dropped.push({ id: w.id, reason: ov.drop[w.id] });
    continue;
  }
  const line = w.geometry.map(llToLocal);
  for (const band of bands)
    for (const piece of clipPolyline(line, band)) {
      const pts = simplify(piece, 0.15, false);
      if (lineLength(pts) < 2) continue;
      roads.push({ id: w.id, kind: cls, width: ROAD_WIDTH[cls] ?? 3.5, line: fixPoly(pts) });
    }
}

// The main building, modelled as its bounding box so the dock wall is straight.
const mainPoly = ov.main.poly.map(gridToLocal);
const mainOut = { id: ov.main.id, height: ov.main.height, ...styleOf(ov.main, mainPoly), poly: fixPoly(mainPoly), bbox: bbox(fixPoly(mainPoly)) };
if (ov.main.sections) {
  // Roof sections along the grid z axis, each with its own colour.
  const [gx0, , gx1] = bbox(ov.main.poly);
  mainOut.sections = ov.main.sections.map((sec) => ({
    roof: sec.roof,
    box: bbox(fixPoly([[gx0, sec.from], [gx1, sec.from], [gx1, sec.to], [gx0, sec.to]].map(gridToLocal))),
  }));
}

const total = gridRho + turn;
const [nx, nz] = rot([0, -1], total); // true north in the local frame
const [tx, tz] = rot([-ax, -az], turn);
const out = {
  site: ov.site,
  attribution: '© OpenStreetMap contributors',
  license: 'ODbL 1.0',
  generator: 'scripts/fetch-geo.mjs',
  // local = rotate(project(lat, lon) about origin, rotationDeg) + translate
  transform: { origin: ov.grid.origin, rotationDeg: Number(((total * 180) / Math.PI).toFixed(4)), translate: [r2(tx), r2(tz)] },
  north: [r2(nx), r2(nz)],
  address,
  base,
  yards,
  main: mainOut,
  zones: zonesOut,
  buildings,
  areas,
  roads,
  ground: bands,
  trees: trees.filter((p) => inBase(p) && !inYard(p)).map(([x, z]) => [r1(x), r1(z)]),
  dropped: dropped.sort((a, b) => String(a.id).localeCompare(String(b.id))),
};
const text = `${JSON.stringify(out, null, 0)}\n`;
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, text);
console.log(
  `${path.relative(ROOT, outPath)}: ${(text.length / 1024).toFixed(1)} KB, ${zonesOut.length} zones, ${buildings.length} buildings, ` +
    `${roads.length} road pieces, ${out.trees.length} trees, base ${base.join(',')}, left out: ${dropped.map((d) => d.id).join(', ') || 'none'}`,
);
