import type { BayDef, PathData, SiteDef, Vec2 } from '../data/types';
import { LANE_OFFSET, X_EDGE, X_ROADS, Z_EDGE, Z_ROADS, bayLane, bayParkPoint, gatePoints } from '../data/sites';
import type { Rng } from './rng';

export function makePath(pts: Vec2[]): PathData {
  const clean: Vec2[] = [];
  for (const p of pts) {
    const last = clean[clean.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.z - last.z) > 0.01) clean.push(p);
  }
  const cum = [0];
  for (let i = 1; i < clean.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(clean[i].x - clean[i - 1].x, clean[i].z - clean[i - 1].z));
  }
  return { pts: clean, cum, length: cum[cum.length - 1] ?? 0 };
}

export interface PathSample {
  x: number;
  z: number;
  /** Direction of travel along the path, as three.js rotation.y for a model whose forward is +x. */
  angle: number;
}

const dirAngle = (dx: number, dz: number) => Math.atan2(-dz, dx);

export function samplePath(path: PathData, s: number): PathSample {
  const { pts, cum, length } = path;
  if (pts.length === 1) return { x: pts[0].x, z: pts[0].z, angle: 0 };
  const d = Math.max(0, Math.min(length, s));
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const a = pts[lo];
  const b = pts[hi];
  const seg = cum[hi] - cum[lo] || 1;
  const u = (d - cum[lo]) / seg;
  return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, angle: dirAngle(b.x - a.x, b.z - a.z) };
}

/** Replace sharp corners with quadratic curves so vehicles turn smoothly. */
export function roundCorners(pts: Vec2[], radius: number, steps = 8): Vec2[] {
  if (pts.length < 3) return pts.slice();
  const out: Vec2[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1];
    const p = pts[i];
    const p1 = pts[i + 1];
    const l0 = Math.hypot(p.x - p0.x, p.z - p0.z);
    const l1 = Math.hypot(p1.x - p.x, p1.z - p.z);
    const r = Math.min(radius, l0 * 0.45, l1 * 0.45);
    if (r < 0.5) {
      out.push(p);
      continue;
    }
    const a = { x: p.x + ((p0.x - p.x) / l0) * r, z: p.z + ((p0.z - p.z) / l0) * r };
    const b = { x: p.x + ((p1.x - p.x) / l1) * r, z: p.z + ((p1.z - p.z) / l1) * r };
    for (let k = 0; k <= steps; k++) {
      const u = k / steps;
      const iu = 1 - u;
      out.push({
        x: iu * iu * a.x + 2 * iu * u * p.x + u * u * b.x,
        z: iu * iu * a.z + 2 * iu * u * p.z + u * u * b.z,
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Offset a polyline to the right of travel (right-hand traffic). */
export function offsetRight(pts: Vec2[], offset: number): Vec2[] {
  const right = (a: Vec2, b: Vec2) => {
    const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return { x: -(b.z - a.z) / l, z: (b.x - a.x) / l };
  };
  return pts.map((p, i) => {
    const prev = i > 0 ? right(pts[i - 1], p) : null;
    const next = i < pts.length - 1 ? right(p, pts[i + 1]) : null;
    let n = prev && next ? { x: prev.x + next.x, z: prev.z + next.z } : (prev ?? next)!;
    const nl = Math.hypot(n.x, n.z) || 1;
    n = { x: n.x / nl, z: n.z / nl };
    const ref = prev ?? next!;
    const scale = offset / Math.max(0.3, n.x * ref.x + n.z * ref.z);
    return { x: p.x + n.x * scale, z: p.z + n.z * scale };
  });
}

// ---- Road graph ---------------------------------------------------------------------------

const key = (p: Vec2) => `${p.x},${p.z}`;

interface Graph {
  nodes: Map<string, Vec2>;
  adj: Map<string, string[]>;
  edges: Vec2[];
}

function buildGraph(): Graph {
  const nodes = new Map<string, Vec2>();
  const adj = new Map<string, string[]>();
  const add = (p: Vec2) => {
    nodes.set(key(p), p);
    if (!adj.has(key(p))) adj.set(key(p), []);
  };
  const link = (a: Vec2, b: Vec2) => {
    add(a);
    add(b);
    adj.get(key(a))!.push(key(b));
    adj.get(key(b))!.push(key(a));
  };
  for (const x of X_ROADS) {
    const zs = [-Z_EDGE, ...Z_ROADS, Z_EDGE];
    for (let i = 0; i < zs.length - 1; i++) link({ x, z: zs[i] }, { x, z: zs[i + 1] });
  }
  for (const z of Z_ROADS) {
    const xs = [-X_EDGE, ...X_ROADS, X_EDGE];
    for (let i = 0; i < xs.length - 1; i++) link({ x: xs[i], z }, { x: xs[i + 1], z });
  }
  const edges: Vec2[] = [];
  for (const x of X_ROADS) edges.push({ x, z: -Z_EDGE }, { x, z: Z_EDGE });
  for (const z of Z_ROADS) edges.push({ x: -X_EDGE, z }, { x: X_EDGE, z });
  return { nodes, adj, edges };
}

export const ROAD_GRAPH = buildGraph();

function shortest(from: Vec2, to: Vec2): Vec2[] {
  const { nodes, adj } = ROAD_GRAPH;
  const dist = new Map<string, number>([[key(from), 0]]);
  const prev = new Map<string, string>();
  const open = new Set<string>([key(from)]);
  while (open.size) {
    let cur = '';
    let best = Infinity;
    for (const k of open) {
      const d = dist.get(k)!;
      if (d < best) {
        best = d;
        cur = k;
      }
    }
    open.delete(cur);
    if (cur === key(to)) break;
    const cp = nodes.get(cur)!;
    for (const n of adj.get(cur) ?? []) {
      const np = nodes.get(n)!;
      const nd = best + Math.abs(np.x - cp.x) + Math.abs(np.z - cp.z);
      if (nd < (dist.get(n) ?? Infinity)) {
        dist.set(n, nd);
        prev.set(n, cur);
        open.add(n);
      }
    }
  }
  const out: Vec2[] = [];
  let k: string | undefined = key(to);
  while (k) {
    out.unshift(nodes.get(k)!);
    k = prev.get(k);
  }
  return out;
}

/** Intersections at either end of the road segment the gate sits on. */
function gateSegment(site: SiteDef) {
  const g = gatePoints(site);
  const xa = Math.max(...X_ROADS.filter((x) => x < g.road.x));
  const xb = Math.min(...X_ROADS.filter((x) => x > g.road.x));
  return { g, a: { x: xa, z: g.road.z }, b: { x: xb, z: g.road.z } };
}

const pathLen = (pts: Vec2[]) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z) : 0), 0);

/** One of the few map-edge entry points closest to the gate, so trucks arrive within minutes. */
function nearEdge(g: Vec2, rng: Rng, n: number): Vec2 {
  const sorted = [...ROAD_GRAPH.edges].sort(
    (p, q) => Math.abs(p.x - g.x) + Math.abs(p.z - g.z) - (Math.abs(q.x - g.x) + Math.abs(q.z - g.z)),
  );
  return rng.pick(sorted.slice(0, n));
}

/** Road route from a map edge, through the gate's entry lane, to the waiting point at the barrier. */
export function entryRoute(site: SiteDef, rng: Rng): Vec2[] {
  if (site.entrance) return roundCorners(site.entrance.in, 9);
  const { g, a, b } = gateSegment(site);
  const start = nearEdge(g.road, rng, 3);
  const viaA = [...shortest(start, a), g.entryRoad];
  const viaB = [...shortest(start, b), g.entryRoad];
  const road = pathLen(viaA) <= pathLen(viaB) ? viaA : viaB;
  const lane = offsetRight(road, LANE_OFFSET);
  return roundCorners([...lane, g.stop], 9);
}

/** Road route from the gate's exit lane out to a map edge. */
export function exitRoute(site: SiteDef, rng: Rng): Vec2[] {
  if (site.entrance) return site.entrance.out;
  const { g, a, b } = gateSegment(site);
  const end = nearEdge(g.road, rng, 4);
  const viaA = [g.exitRoad, ...shortest(a, end)];
  const viaB = [g.exitRoad, ...shortest(b, end)];
  const road = pathLen(viaA) <= pathLen(viaB) ? viaA : viaB;
  return offsetRight(road, LANE_OFFSET);
}

/** Yard path from the waiting point to the bay, ending in a reverse manoeuvre. */
export function dockingPath(site: SiteDef, bay: BayDef): { path: PathData; reverseFrom: number } {
  const g = gatePoints(site);
  const lane = bayLane(site, bay);
  const park = bayParkPoint(bay);
  const laneZ = lane.entry.z;
  const s = Math.sign(bay.door.x - lane.entry.x) || 1;
  const pivot = { x: bay.door.x + s * 13, z: laneZ };
  const start = lane.approach?.length ? lane.approach[lane.approach.length - 1] : g.stop;
  const forward = roundCorners([start, ...lane.dockVia, lane.entry, pivot], 7);
  const reverse: Vec2[] = [];
  const p0 = pivot;
  const p1 = { x: bay.door.x, z: laneZ };
  // A bay far from its lane: the turn ends 12 m off the lane and the truck backs straight on.
  const p2 = { x: bay.door.x, z: Math.max(park.z + 6, laneZ - 12) };
  for (let k = 1; k <= 14; k++) {
    const u = k / 14;
    const iu = 1 - u;
    reverse.push({ x: iu * iu * p0.x + 2 * iu * u * p1.x + u * u * p2.x, z: iu * iu * p0.z + 2 * iu * u * p1.z + u * u * p2.z });
  }
  reverse.push(park);
  const fwd = makePath(forward);
  return { path: makePath([...forward, ...reverse]), reverseFrom: fwd.length };
}

/** From the parked position out through the gate's exit lane to a map edge. */
export function departPath(site: SiteDef, bay: BayDef, rng: Rng): PathData {
  const g = gatePoints(site);
  const lane = bayLane(site, bay);
  const park = bayParkPoint(bay);
  const dx = lane.exit.x - bay.door.x;
  const turn = Math.sign(dx) * Math.min(10, Math.abs(dx) / 2);
  const yard = roundCorners(
    [park, { x: park.x, z: lane.exit.z - 3 }, { x: park.x + turn, z: lane.exit.z }, lane.exit, ...lane.exitVia, g.exitFence],
    7,
  );
  const road = exitRoute(site, rng);
  return makePath(roundCorners([...yard, ...road], 9));
}

/** A loop for decorative city traffic: edge → edge. */
export function ambientRoute(rng: Rng): Vec2[] {
  const a = rng.pick(ROAD_GRAPH.edges);
  let b = rng.pick(ROAD_GRAPH.edges);
  for (let i = 0; i < 6 && Math.hypot(a.x - b.x, a.z - b.z) < 300; i++) b = rng.pick(ROAD_GRAPH.edges);
  return roundCorners(offsetRight(shortest(a, b), LANE_OFFSET), 9);
}
