// Forklift route planning inside a site yard: A* on a 1 m grid around buildings, parked trucks,
// chargers and staged pallets, then string-pulled into a few straight legs.
import type { BayDef, SiteCode, SiteDef, Vec2 } from '../data/types';
import { PLOT_HX, PLOT_HZ, bayLane, gatePoints } from '../data/sites';
import { GEO_SITES, polyBounds } from '../data/geo';

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** Clearance kept between a forklift's centre and any obstacle edge. */
export const CLEARANCE = 1.5;
const CELL = 1;

/** Shipping container in the depot yard (WH-01), local coordinates. Also used by the renderer. */
export const DEPOT_CONTAINER = { x0: 46, z0: -7.3, x1: 58, z1: -4.7 };

const rect = (cx: number, cz: number, hx: number, hz: number): Rect => ({ x0: cx - hx, z0: cz - hz, x1: cx + hx, z1: cz + hz });

/** Obstacles that never move, in world coordinates. */
export function staticObstacles(site: SiteDef): Rect[] {
  const c = site.center;
  const b = site.building;
  const L = (x0: number, z0: number, x1: number, z1: number): Rect => ({ x0: c.x + x0, z0: c.z + z0, x1: c.x + x1, z1: c.z + z1 });
  const out: Rect[] = [L(b.x0 - 0.6, b.z0 - 0.6, b.x1 + 0.6, Math.max(b.z1, site.faceZ) + 0.6)];
  for (const ch of site.chargers) out.push(rect(ch.pos.x, ch.pos.z, 0.55, 0.4));
  if (site.style === 'depot') {
    out.push(L(14, -42, 52, -18)); // second shed
    out.push(L(16, -12, 50, -10)); // pallet racks
    out.push(L(DEPOT_CONTAINER.x0, DEPOT_CONTAINER.z0, DEPOT_CONTAINER.x1, DEPOT_CONTAINER.z1)); // shipping container
  }
  if (site.style === 'cold') {
    out.push(rect(c.x + 46, c.z - 34, 3.3, 3.3), rect(c.x + 53, c.z - 24, 3.3, 3.3)); // silos
  }
  // Map buildings around a real site (the map is turned to the block axes, so bounds fit closely).
  for (const b of GEO_SITES[site.code]?.buildings ?? []) {
    const [x0, z0, x1, z1] = polyBounds(b.poly);
    out.push(L(x0, z0, x1, z1));
  }
  return out;
}

export interface DynamicObstacles {
  trucks: Vec2[]; // centres of parked/docking trucks (trailer axis along z)
  pallets: Vec2[]; // staged pallet positions
  forklifts: Vec2[]; // forklifts parked idle or charging
  zones: Rect[]; // yard areas a truck is about to sweep (docking, waiting at the gate, departing)
  moving?: Rect[]; // the part of `zones` a truck is sweeping right now (reversing in or pulling out)
}

function allObstacles(site: SiteDef, dyn: DynamicObstacles): Rect[] {
  const out = staticObstacles(site);
  out.push(...(site.entrance?.noForklift ?? []));
  for (const t of dyn.trucks) out.push(rect(t.x, t.z, 1.4, 8.5));
  for (const p of dyn.pallets) out.push(rect(p.x, p.z, 0.9, 0.8));
  for (const f of dyn.forklifts) out.push(rect(f.x, f.z, 1.0, 1.0));
  out.push(...dyn.zones);
  return out;
}

/**
 * Area a truck sweeps while reversing into (or pulling out of) a bay, plus its lane run from the
 * gate. Kept clear of forklift routes while that truck is moving or about to move.
 */
export function truckSweep(site: SiteDef, bay: BayDef, toward: number): Rect[] {
  const c = site.center;
  const doorX = bay.door.x;
  const face = bay.door.z;
  const lane = bayLane(site, bay).entry.z;
  // Side entrance: the lane run starts where the truck joins the bay's lane.
  const gx = site.entrance ? bayLane(site, bay).entry.x : c.x + site.gateX;
  const far = doorX + toward * 21.5; // pivot (13 m) plus half a truck length
  return [
    { x0: doorX - 1.6, z0: face, x1: doorX + 1.6, z1: face + 17.5 }, // the stall itself
    { x0: Math.min(doorX, far) - 2, z0: face + 16, x1: Math.max(doorX, far) + 2, z1: lane + 1.6 }, // swing area
    { x0: Math.min(gx, doorX) - 2, z0: lane - 1.6, x1: Math.max(gx, doorX) + 2, z1: lane + 1.6 }, // lane run
    bay.lane && site.entrance
      ? laneRun(site, bay) // a bay with its own lane: from its waiting point to the lane
      : (site.entrance?.sweep ?? { x0: gx - 5, z0: lane, x1: gx + 5, z1: c.z + PLOT_HZ }), // gate (entry and exit lanes)
  ];
}

/** Side entrance: the run from a bay lane's waiting point to where the truck starts to reverse. */
function laneRun(site: SiteDef, bay: BayDef): Rect {
  const lane = bayLane(site, bay);
  const start = lane.approach?.length ? lane.approach[lane.approach.length - 1] : gatePoints(site).stop;
  const pts = [start, ...lane.dockVia, lane.entry];
  const xs = pts.map((p) => p.x);
  const zs = pts.map((p) => p.z);
  return { x0: Math.min(...xs) - 2, z0: Math.min(...zs) - 2, x1: Math.max(...xs) + 2, z1: Math.max(...zs) + 2 };
}

const inflate = (r: Rect, d: number): Rect => ({ x0: r.x0 - d, z0: r.z0 - d, x1: r.x1 + d, z1: r.z1 + d });
const inside = (r: Rect, p: Vec2) => p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1;
const distTo = (r: Rect, p: Vec2) => Math.hypot(Math.max(r.x0 - p.x, 0, p.x - r.x1), Math.max(r.z0 - p.z, 0, p.z - r.z1));

/** Liang–Barsky: does segment a→b pass through the interior of r? */
function segmentHits(a: Vec2, b: Vec2, r: Rect): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  let t0 = 0;
  let t1 = 1;
  const clip = (p: number, q: number) => {
    if (Math.abs(p) < 1e-9) return q > 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  if (!clip(-dx, a.x - r.x0) || !clip(dx, r.x1 - a.x) || !clip(-dz, a.z - r.z0) || !clip(dz, r.z1 - a.z)) return false;
  return t1 - t0 > 1e-6;
}

/**
 * Plan a route from `from` to `to` within the site's fence. An obstacle that contains an end point
 * (e.g. the pallet being picked) is ignored; one that is merely close to an end point keeps a
 * reduced clearance there instead of being dropped, so the route still goes around it.
 *
 * If no route exists, the constraints are relaxed step by step: first the areas trucks are about
 * to sweep are dropped, then the clearance is reduced. A straight line is the last resort.
 */
export function planRoute(site: SiteDef, dyn: DynamicObstacles, from: Vec2, to: Vec2): { route: Vec2[]; relaxed: boolean } {
  const attempts: [DynamicObstacles, number][] = [
    [dyn, CLEARANCE],
    [{ ...dyn, zones: [] }, CLEARANCE],
    [{ ...dyn, zones: [] }, 1.0],
  ];
  for (let i = 0; i < attempts.length; i++) {
    const [obstacles, clearance] = attempts[i];
    const rects: Rect[] = [];
    for (const r of allObstacles(site, obstacles)) {
      if (inside(r, from) || inside(r, to)) continue;
      const d = Math.min(clearance, distTo(r, from) - 0.05, distTo(r, to) - 0.05);
      rects.push(inflate(r, Math.max(0, d)));
    }
    const route = search(site, rects, from, to);
    if (route) return { route, relaxed: i > 0 };
  }
  return { route: [from, to], relaxed: true };
}

function search(site: SiteDef, rects: Rect[], from: Vec2, to: Vec2): Vec2[] | null {
  const clear = (a: Vec2, b: Vec2) => !rects.some((r) => segmentHits(a, b, r));
  if (clear(from, to)) return [from, to];

  const p = site.plot ?? { x0: -PLOT_HX, z0: -PLOT_HZ, x1: PLOT_HX, z1: PLOT_HZ };
  const bx0 = site.center.x + p.x0 + 1.5;
  const bz0 = site.center.z + p.z0 + 1.5;
  const nx = Math.floor((p.x1 - p.x0 - 3) / CELL);
  const nz = Math.floor((p.z1 - p.z0 - 3) / CELL);
  const cellOf = (p: Vec2) => ({
    i: Math.max(0, Math.min(nx - 1, Math.floor((p.x - bx0) / CELL))),
    j: Math.max(0, Math.min(nz - 1, Math.floor((p.z - bz0) / CELL))),
  });
  const centre = (i: number, j: number): Vec2 => ({ x: bx0 + (i + 0.5) * CELL, z: bz0 + (j + 0.5) * CELL });
  const blocked = new Uint8Array(nx * nz);
  for (const r of rects) {
    const a = cellOf({ x: r.x0, z: r.z0 });
    const b = cellOf({ x: r.x1, z: r.z1 });
    for (let i = a.i; i <= b.i; i++)
      for (let j = a.j; j <= b.j; j++) if (inside(r, centre(i, j))) blocked[j * nx + i] = 1;
  }
  const s = cellOf(from);
  const g = cellOf(to);
  blocked[s.j * nx + s.i] = 0;
  blocked[g.j * nx + g.i] = 0;

  // A* with an octile heuristic on a binary heap.
  const N = nx * nz;
  const gScore = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const heap: [number, number][] = [];
  const push = (f: number, k: number) => {
    heap.push([f, k]);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  const h = (i: number, j: number) => {
    const dx = Math.abs(i - g.i);
    const dz = Math.abs(j - g.j);
    return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz);
  };
  const start = s.j * nx + s.i;
  const goal = g.j * nx + g.i;
  gScore[start] = 0;
  push(h(s.i, s.j), start);
  let found = false;
  while (heap.length) {
    const [, k] = pop();
    if (closed[k]) continue;
    if (k === goal) {
      found = true;
      break;
    }
    closed[k] = 1;
    const i = k % nx;
    const j = (k - i) / nx;
    for (let di = -1; di <= 1; di++)
      for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue;
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue;
        const nk = nj * nx + ni;
        if (blocked[nk] || closed[nk]) continue;
        // No corner cutting past a blocked cell.
        if (di && dj && (blocked[j * nx + ni] || blocked[nj * nx + i])) continue;
        const cost = gScore[k] + (di && dj ? Math.SQRT2 : 1);
        if (cost < gScore[nk]) {
          gScore[nk] = cost;
          came[nk] = k;
          push(cost + h(ni, nj), nk);
        }
      }
  }
  if (!found) return null;

  const cells: Vec2[] = [];
  for (let k = goal; k !== -1; k = came[k]) {
    const i = k % nx;
    cells.unshift(centre(i, (k - i) / nx));
  }
  const raw = [from, ...cells.slice(1, -1), to];
  // String pulling: keep only the points needed to stay clear of obstacles.
  const out: Vec2[] = [from];
  let a = 0;
  while (a < raw.length - 1) {
    let b = raw.length - 1;
    while (b > a + 1 && !clear(raw[a], raw[b])) b--;
    out.push(raw[b]);
    a = b;
  }
  return out;
}

/** Snapshot of the obstacles at a site that move over time. Provided by the engine. */
export type ObstacleSource = (site: SiteCode, ignorePallet?: string) => DynamicObstacles;
