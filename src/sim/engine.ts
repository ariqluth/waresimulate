// Simulation engine (PRD §11–§12). Mutable world advanced in simulated minutes.
import type {
  BayState, CarrierId, ChargerState, Crossing, Forklift, Pallet, PathData, Shipment, SiteCode, SiteDef, SiteState, Truck, Vec2,
} from '../data/types';
import {
  BAY_BY_ID, CARRIERS, CHARGER_BY_ID, PLOT_HX, PUTAWAY_ANGLE, SITES, SITE_BY_CODE, WORK_ANGLE, bayLane, bayParkPoint, bayPutawayPoint,
  bayWorkPoint, gatePoints, stagingStand,
} from '../data/sites';
import { planRoute, truckSweep, type DynamicObstacles, type Rect } from './planner';
import {
  TRUCK_HL, TRUCK_HW, boxAt, boxOnPath, boxesOverlap, driveMover, gridlockBreaks, type Box, type Mover, type Obstacle,
} from './traffic';
import {
  BAY_TRUCKS_TODAY, CAPTURED_AT, CHARGER_SEEDS, CITIES, CUSTOMERS, DRIVER_NAMES, FORKLIFT_SEEDS, LOCAL_POOLS, PALLET_SEEDS,
  SIM_START, SITE_SEEDS, SKUS, TRUCK_SEEDS,
} from '../data/seed';
import { Rng, hash01 } from './rng';
import { ambientRoute, departPath, dockingPath, entryRoute, makePath, samplePath } from './path';

export const ROAD_SPEED = 45; // metres of path per simulated minute
export const AMBIENT_SPEED = 50;
export const YARD_FWD = 42; // driving forward inside the yard
export const YARD_REV = 16; // reversing onto a bay
/** Length of the turn-in before a gate that only one arriving truck may occupy. */
const GATE_ZONE = 34;
export const AT_GATE_MIN = 1;
export const DOCK_MIN = 2;
export const FORKLIFT_SPEED = 32; // metres per simulated minute
export const CHARGE_LOW = 30;
export const CHARGE_FULL = 95;
/** Heading at a charger (forks toward the charger, which is on the +z side of the spot). */
const CHARGE_ANGLE = -Math.PI / 2;
/** Heading while parked idle (facing the yard). */
const IDLE_ANGLE = Math.PI / 2;
const DRAIN_WORK = 1.0;
const DRAIN_IDLE = 0.08;
const KWH_PER_PCT = 0.3;

export interface AmbientTruck {
  id: string;
  carrier: CarrierId;
  path: PathData;
  s: number;
  v: number;
  blockedBy?: string;
}

export interface CycleInfo {
  site: SiteCode;
  pallet?: string;
  /** Planned route from the work point beside the truck to the far end (staging stand or putaway). */
  route: Vec2[];
  otherAngle: number; // heading at the far end: forks toward the slot or the building
  slot?: number; // staging slot reserved for an unloaded pallet
  /** Loading from staging: the pallet stays in its slot until the forklift lifts it. */
  pickFromSlot?: boolean;
  /** Unloading into staging: the pallet appears in its slot when the forklift sets it down. */
  dropped?: boolean;
}

/** Fractions of a cycle at which a pallet is lifted (loading) or set down (unloading). */
export const PICK_AT = 0.45;
export const DROP_AT = 0.55;

/** Random numbers and code counters for one group of sites. */
export interface Stream {
  rng: Rng;
  nextPallet: number;
  nextShipment: number;
}

/**
 * The five original sites share the world's stream. Sites added later (WH-06) draw from their own,
 * so adding them does not change the original sites' random sequence (PRD addendum NFR-4).
 */
const SHARED_STREAM: SiteCode[] = ['WH-01', 'WH-02', 'WH-03', 'WH-04', 'WH-05'];

export interface World extends Stream {
  time: number;
  sites: Record<SiteCode, SiteState>;
  trucks: Map<string, Truck>;
  shipments: Map<string, Shipment>;
  forklifts: Map<string, Forklift>;
  pallets: Map<string, Pallet>;
  chargers: Map<string, ChargerState>;
  bays: Map<string, BayState>;
  cycles: Map<string, CycleInfo>; // keyed by truck code
  ambient: AmbientTruck[];
  nextSpawn: Record<SiteCode, number>;
  streams: Partial<Record<SiteCode, Stream>>;
  /** Bumped whenever objects are added or removed, so React can re-render lists. */
  roster: number;
}

// ---- helpers --------------------------------------------------------------------------------

const stream = (w: World, code: SiteCode): Stream => w.streams[code] ?? w;

export function siteTrucks(w: World, code: SiteCode): Truck[] {
  const out: Truck[] = [];
  for (const t of w.trucks.values()) if (t.site === code && t.phase !== 'departing') out.push(t);
  return out;
}

function bayTruck(w: World, bayId: string): Truck | undefined {
  for (const t of w.trucks.values()) if (t.bay === bayId && t.phase !== 'departing') return t;
  return undefined;
}

function freeBays(w: World, code: SiteCode, direction: Truck['direction']) {
  const site = SITE_BY_CODE[code];
  return site.bays.filter((b) => {
    if (b.kind === 'In' && direction === 'outbound') return false;
    if (b.kind === 'Out' && direction === 'inbound') return false;
    return !bayTruck(w, b.id);
  });
}

function freeSlots(w: World, code: SiteCode): number[] {
  const site = SITE_BY_CODE[code];
  const used = new Set<number>();
  for (const p of w.pallets.values()) if (p.site === code && p.slot !== undefined) used.add(p.slot);
  // Slots reserved by in-flight unloading cycles at this site.
  for (const c of w.cycles.values()) if (c.site === code && c.slot !== undefined) used.add(c.slot);
  return site.staging.map((_, i) => i).filter((i) => !used.has(i));
}

/** Things a forklift must drive around right now: parked/docking trucks, staged pallets, parked forklifts. */
export function dynamicObstacles(w: World, code: SiteCode, ignorePallet?: string, self?: string): DynamicObstacles {
  const site = SITE_BY_CODE[code];
  const trucks: Vec2[] = [];
  for (const t of w.trucks.values())
    if (t.site === code && t.bay && (t.phase === 'working' || t.phase === 'docking')) trucks.push(bayParkPoint(BAY_BY_ID[t.bay]));
  const pallets: Vec2[] = [];
  for (const p of w.pallets.values())
    if (p.site === code && p.status === 'Staged' && p.slot !== undefined && p.code !== ignorePallet) pallets.push(site.staging[p.slot]);
  // Slots that another forklift's unloading cycle has reserved: its pallet will be set down there
  // shortly, possibly while this route is being driven.
  for (const [truckCode, c] of w.cycles) {
    if (c.site !== code || c.slot === undefined || c.dropped) continue;
    if (self && w.trucks.get(truckCode)?.work.forklift === self) continue;
    pallets.push(site.staging[c.slot]);
  }
  // Parked forklifts, and the spots that travelling ones are heading to.
  const forklifts: Vec2[] = [];
  for (const f of w.forklifts.values()) {
    if (f.site !== code || f.code === self || f.truck) continue;
    forklifts.push(f.pos);
  }
  // Trucks that are reversing in, about to (waiting at the gate or arriving shortly), or pulling out.
  const zones: Rect[] = [];
  const moving: Rect[] = [];
  const gx = site.center.x + site.gateX;
  for (const t of w.trucks.values()) {
    if (t.site !== code || !t.bay) continue;
    const door = BAY_BY_ID[t.bay].door.x;
    const arriving = t.phase === 'docking' || t.phase === 'atgate' || (t.phase === 'enroute' && truckArrival(w, t) - w.time < 4);
    const finishesSoon =
      t.phase === 'working' && !!t.work.forklift && t.work.cycleStart + (t.work.total - t.work.done) * t.work.period - w.time < 2;
    const leaving = (t.phase === 'departing' && w.time - t.phaseStart < 2) || finishesSoon;
    const bay = BAY_BY_ID[t.bay];
    // Which way the truck swings: away from where it joins the lane (the gate, or the bay's lane).
    const ref = site.entrance ? bayLane(site, bay).entry.x : gx;
    if (arriving) zones.push(...truckSweep(site, bay, Math.sign(door - ref) || 1));
    if (leaving) zones.push(...truckSweep(site, bay, Math.sign(ref - door) || 1));
    if (t.phase === 'docking') moving.push(...truckSweep(site, bay, Math.sign(door - ref) || 1));
    if (t.phase === 'departing' && w.time - t.phaseStart < 2) moving.push(...truckSweep(site, bay, Math.sign(ref - door) || 1));
  }
  return { trucks, pallets, forklifts, zones, moving };
}

/** Free staging slots in the gap beside one bay. */
function freeBaySlots(w: World, code: SiteCode, bayId: string): number[] {
  const site = SITE_BY_CODE[code];
  return freeSlots(w, code).filter((i) => site.stagingBay[i] === bayId);
}

export const smooth = (u: number) => u * u * (3 - 2 * u);

const fmtLot = (rng: Rng) => `L25${rng.int(10, 99)}-${rng.int(100, 999)}`;

function newPallet(w: World, code: SiteCode, skuKey?: string): Pallet {
  const site = w.sites[code];
  const st = stream(w, code);
  const item = skuKey ? SKUS[skuKey] : SKUS[skuKeyFor(st.rng.pick(site.inventory).sku)];
  const p: Pallet = {
    code: `PAL-${st.nextPallet++}`,
    sku: item.sku,
    site: code,
    status: 'Moving',
    quantity: item.unitsPerPallet,
    grossKg: item.kgPerPallet,
    lot: fmtLot(st.rng),
    received: 'Apr 20, ' + hhmm(w.time),
    pinned: false,
  };
  w.pallets.set(p.code, p);
  return p;
}

export function skuKeyFor(sku: string): string {
  return Object.keys(SKUS).find((k) => SKUS[k].sku === sku) ?? 'box';
}

export function hhmm(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// ---- forklift work cycles -------------------------------------------------------------------

/**
 * Pick the pallet and plan the route for the next pallet move of a truck (PRD §11.1).
 * Unloading at the cross-dock drops into a free staging slot; elsewhere it is put away into the
 * building beside the bay. Loading takes the lowest staged pallet, or one from the building.
 */
function startCycle(w: World, truck: Truck, seededPallet?: Pallet) {
  const f = truck.work.forklift ? w.forklifts.get(truck.work.forklift) : undefined;
  if (!f || !truck.bay) return;
  const bay = BAY_BY_ID[truck.bay];
  const site = SITE_BY_CODE[truck.site];
  const work = bayWorkPoint(bay);
  let other = bayPutawayPoint(bay);
  let otherAngle = PUTAWAY_ANGLE;
  let slot: number | undefined;
  let pallet: Pallet;
  if (truck.direction === 'inbound') {
    pallet = seededPallet ?? newPallet(w, truck.site);
    // Cross-dock: most pallets wait in the staging slots beside the bay; the rest go inside. The
    // learning centre stages some for the next outbound truck too.
    const stageShare = site.style === 'crossdock' ? 0.7 : site.style === 'geo' ? 0.4 : 0;
    if (hash01(pallet.code) < stageShare) {
      const free = freeBaySlots(w, truck.site, bay.id);
      if (free.length) {
        slot = free[0];
        ({ pos: other, angle: otherAngle } = stagingStand(site, slot));
      }
    }
  } else {
    // Load from this bay's own staging slots first, otherwise bring a pallet out of the building.
    let src: Pallet | undefined;
    for (const p of w.pallets.values()) {
      if (p.site !== truck.site || p.status !== 'Staged' || p.forklift || p.slot === undefined) continue;
      if (site.stagingBay[p.slot] !== bay.id) continue;
      if (!src || p.slot < (src.slot ?? 99)) src = p;
    }
    if (src) {
      // Reserve it; it stays visible in its slot until the forklift lifts it (PICK_AT).
      ({ pos: other, angle: otherAngle } = stagingStand(site, src.slot!));
      pallet = src;
    } else {
      pallet = newPallet(w, truck.site);
    }
  }
  pallet.forklift = f.code;
  f.carrying = pallet.code;
  const pickFromSlot = truck.direction === 'outbound' && pallet.status === 'Staged';
  const { route } = planRoute(site, dynamicObstacles(w, truck.site, pallet.code), work, other);
  w.cycles.set(truck.code, { site: truck.site, pallet: pallet.code, route, otherAngle, slot, pickFromSlot });
  w.roster++;
}

/** Lift a reserved staged pallet / set an unloaded pallet down at the right moment of the cycle. */
function cycleEvents(w: World, truck: Truck) {
  const cyc = w.cycles.get(truck.code);
  if (!cyc?.pallet || !truck.work.forklift) return;
  const u = (w.time - truck.work.cycleStart) / truck.work.period;
  const p = w.pallets.get(cyc.pallet);
  if (!p) return;
  if (cyc.pickFromSlot && u >= PICK_AT) {
    cyc.pickFromSlot = false;
    p.status = 'Moving';
    p.slot = undefined;
    w.roster++;
  }
  if (truck.direction === 'inbound' && cyc.slot !== undefined && !cyc.dropped && u >= DROP_AT && freeSlotOk(w, truck.site, cyc.slot)) {
    cyc.dropped = true;
    p.status = 'Staged';
    p.slot = cyc.slot;
    p.forklift = undefined;
    w.roster++;
  }
}

function completeCycle(w: World, truck: Truck) {
  const cyc = w.cycles.get(truck.code);
  const f = truck.work.forklift ? w.forklifts.get(truck.work.forklift) : undefined;
  const site = w.sites[truck.site];
  const p = cyc?.pallet ? w.pallets.get(cyc.pallet) : undefined;
  const item = p ? site.inventory.find((i) => i.sku === p.sku) : undefined;
  if (truck.direction === 'inbound') {
    site.stock += 1;
    truck.cargo.onBoard = Math.max(0, truck.cargo.onBoard - 1);
    if (item && p) item.units += p.quantity;
    if (p && !cyc?.dropped) {
      if (cyc?.slot !== undefined && freeSlotOk(w, truck.site, cyc.slot)) {
        p.status = 'Staged';
        p.slot = cyc.slot;
        p.forklift = undefined;
      } else {
        w.pallets.delete(p.code);
        site.putawaysToday += 1;
      }
    }
  } else {
    site.stock = Math.max(0, site.stock - 1);
    truck.cargo.onBoard += 1;
    if (item && p) item.units = Math.max(0, item.units - p.quantity);
    if (p) w.pallets.delete(p.code);
  }
  if (f) {
    f.movesToday += 1;
    f.carrying = undefined;
  }
  w.cycles.delete(truck.code);
  truck.work.done += 1;
  truck.work.cycleStart += truck.work.period;
  w.roster++;
  if (truck.work.done < truck.work.total) startCycle(w, truck);
}

function freeSlotOk(w: World, code: SiteCode, slot: number) {
  for (const p of w.pallets.values()) if (p.site === code && p.slot === slot) return false;
  return true;
}

/** Forklift pose while working a truck cycle; also used to snapshot the position on release. */
export function forkliftWorkPose(w: World, f: Forklift, time: number) {
  const truck = f.truck ? w.trucks.get(f.truck) : undefined;
  const cyc = truck ? w.cycles.get(truck.code) : undefined;
  if (!truck || !cyc) return null;
  if (time < truck.work.cycleStart) return null; // still travelling to the truck
  const u = Math.min(0.999, (time - truck.work.cycleStart) / truck.work.period);
  const unloading = truck.direction === 'inbound';
  // A = work point beside the truck, B = staging stand or putaway point.
  // Unloading: dwell at A, carry A→B, dwell at B, return empty. Loading: the reverse.
  const route = cyc.route;
  const A = route[0];
  const B = route[route.length - 1];
  const at = (s: number) => pointOnRoute(route, smooth(s));
  let pos: { x: number; z: number; angle: number };
  let carrying: boolean;
  let moving = false;
  if (unloading) {
    if (u < 0.12) {
      pos = { ...A, angle: WORK_ANGLE };
      carrying = u > 0.06;
    } else if (u < 0.5) {
      pos = at((u - 0.12) / 0.38);
      carrying = true;
      moving = true;
    } else if (u < 0.6) {
      pos = { ...B, angle: cyc.otherAngle };
      carrying = u < 0.55;
    } else {
      const back = at(1 - (u - 0.6) / 0.4);
      pos = { ...back, angle: back.angle + Math.PI };
      carrying = false;
      moving = true;
    }
  } else {
    if (u < 0.4) {
      pos = at(u / 0.4);
      carrying = false;
      moving = true;
    } else if (u < 0.5) {
      pos = { ...B, angle: cyc.otherAngle };
      carrying = u > 0.45;
    } else if (u < 0.88) {
      const back = at(1 - (u - 0.5) / 0.38);
      pos = { ...back, angle: back.angle + Math.PI };
      carrying = true;
      moving = true;
    } else {
      pos = { ...A, angle: WORK_ANGLE };
      carrying = u < 0.95;
    }
  }
  return { ...pos, carrying, moving };
}

export function pointOnRoute(route: Vec2[], u: number) {
  const lens: number[] = [0];
  for (let i = 1; i < route.length; i++) lens.push(lens[i - 1] + Math.hypot(route[i].x - route[i - 1].x, route[i].z - route[i - 1].z));
  const total = lens[lens.length - 1] || 1;
  const d = Math.max(0, Math.min(1, u)) * total;
  let i = 1;
  while (i < route.length - 1 && lens[i] < d) i++;
  const a = route[i - 1];
  const b = route[i];
  const seg = lens[i] - lens[i - 1] || 1;
  const k = (d - lens[i - 1]) / seg;
  return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, angle: Math.atan2(-(b.z - a.z), b.x - a.x) };
}

export const routeLength = (route: Vec2[]) =>
  route.reduce((s, p, i) => (i ? s + Math.hypot(p.x - route[i - 1].x, p.z - route[i - 1].z) : 0), 0);

/** Where a forklift is right now, including part-way along a travel route. */
function currentPos(f: Forklift, now: number): Vec2 {
  if (f.travel && now < f.travel.end) {
    const u = (now - f.travel.start) / Math.max(0.001, f.travel.end - f.travel.start);
    return pointOnRoute(f.travel.route, smooth(Math.max(0, u)));
  }
  return f.pos;
}

/** How long a forklift waits for a manoeuvring truck to clear its way before driving anyway. */
const MAX_WAIT = 8;
const RETRY_EVERY = 0.2;

/**
 * Drive a forklift to `to` along a planned route, ending with heading `endAngle` if given.
 * With `canWait`, returns null instead of driving when the only route crosses an area a truck is
 * about to sweep; the caller tries again a little later. Without it the forklift may cut across
 * the areas of trucks still waiting or arriving, but it still waits (null) for a truck that is
 * reversing in or pulling out right now, which takes a minute or two.
 */
function travel(w: World, f: Forklift, to: Vec2, now: number, endAngle?: number, canWait = false): number | null {
  const site = SITE_BY_CODE[f.site];
  const from = currentPos(f, now);
  const dyn = dynamicObstacles(w, f.site, undefined, f.code);
  let plan = planRoute(site, dyn, from, to);
  if (plan.relaxed && !canWait && dyn.moving?.length) {
    const strict = planRoute(site, { ...dyn, zones: dyn.moving }, from, to);
    if (!strict.relaxed) plan = strict;
    else canWait = true;
  }
  if (canWait && plan.relaxed) {
    f.retryAt = now + RETRY_EVERY;
    return null;
  }
  const dur = Math.max(0.25, routeLength(plan.route) / FORKLIFT_SPEED);
  const last = pointOnRoute(plan.route, 1);
  f.travel = { route: plan.route, start: now, end: now + dur, endAngle };
  f.pos = { ...to };
  f.heading = endAngle ?? last.angle;
  f.retryAt = undefined;
  return dur;
}

const mayRetry = (f: Forklift, now: number) => f.retryAt === undefined || now >= f.retryAt;

function assignForklift(w: World, truck: Truck) {
  if (!truck.bay) return;
  const bay = BAY_BY_ID[truck.bay];
  let best: Forklift | undefined;
  let bestD = Infinity;
  for (const f of w.forklifts.values()) {
    if (f.site !== truck.site || f.status !== 'Idle' || f.truck || f.battery < CHARGE_LOW || !mayRetry(f, w.time)) continue;
    const d = Math.hypot(f.pos.x - bay.door.x, f.pos.z - bay.door.z);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  if (!best) return;
  // Wait while a truck is reversing across the way (the truck keeps waiting for its forklift).
  const dur = travel(w, best, bayWorkPoint(bay), w.time, WORK_ANGLE, w.time - truck.phaseStart < MAX_WAIT);
  if (dur === null) return;
  best.pendingHome = undefined;
  best.truck = truck.code;
  best.status = truck.direction === 'inbound' ? 'Unloading truck' : 'Loading truck';
  truck.work.forklift = best.code;
  truck.work.cycleStart = w.time + dur;
  startCycle(w, truck);
}

/** Send an idle forklift to its parking spot, waiting (up to MAX_WAIT) if a truck blocks the way. */
function goHome(w: World, f: Forklift) {
  if (!mayRetry(f, w.time)) return;
  const since = f.pendingHome ?? w.time;
  const dur = travel(w, f, idleSpot(f), w.time, IDLE_ANGLE, w.time - since < MAX_WAIT);
  f.pendingHome = dur === null ? since : undefined;
}

function releaseForklift(w: World, truck: Truck) {
  const f = truck.work.forklift ? w.forklifts.get(truck.work.forklift) : undefined;
  const pose = f ? forkliftWorkPose(w, f, w.time) : null;
  truck.work.forklift = undefined;
  w.cycles.delete(truck.code);
  if (!f) return;
  if (pose) {
    f.pos = { x: pose.x, z: pose.z };
    f.heading = pose.angle;
  }
  f.truck = undefined;
  f.carrying = undefined;
  f.status = 'Idle';
  f.travel = undefined;
  f.retryAt = undefined;
  goHome(w, f);
}

/** Each forklift's own parking spot near the site's forklift home, laid out in rows of three. */
export function idleSpot(f: Pick<Forklift, 'code' | 'site'>): Vec2 {
  const site = SITE_BY_CODE[f.site];
  const fleet = FORKLIFT_SEEDS.filter((s) => s.site === f.site).map((s) => s.code);
  const i = Math.max(0, fleet.indexOf(f.code));
  return { x: site.forkliftHome.x + ((i % 3) - 1) * 3.6, z: site.forkliftHome.z + Math.floor(i / 3) * 3.8 };
}

function chargerSpot(chargerId: string): Vec2 {
  const c = CHARGER_BY_ID[chargerId];
  return { x: c.pos.x, z: c.pos.z - 3.2 };
}

// ---- trucks --------------------------------------------------------------------------------

/** Minutes a docking manoeuvre takes for a bay (forward to the pivot, then reversing in). */
const dockTimeCache = new Map<string, number>();
export function dockDuration(siteCode: SiteCode, bayId: string): number {
  if (!dockTimeCache.has(bayId)) {
    const { path, reverseFrom } = dockingPath(SITE_BY_CODE[siteCode], BAY_BY_ID[bayId]);
    dockTimeCache.set(bayId, reverseFrom / YARD_FWD + (path.length - reverseFrom) / YARD_REV);
  }
  return dockTimeCache.get(bayId)!;
}

/** Expected arrival: at the gate while en route, at the bay while waiting or docking. */
export function truckArrival(w: World, t: Truck): number {
  const left = t.path ? t.path.length - t.s : 0;
  switch (t.phase) {
    case 'enroute':
      return w.time + left / ROAD_SPEED;
    case 'atgate':
      return Math.max(w.time, (t.gateArrivedAt ?? w.time) + AT_GATE_MIN) + (t.bay ? dockDuration(t.site, t.bay) : DOCK_MIN);
    case 'docking': {
      const rf = t.reverseFrom ?? t.s;
      const fwd = Math.max(0, rf - t.s);
      return w.time + fwd / YARD_FWD + (left - fwd) / YARD_REV;
    }
    default:
      return w.time;
  }
}

function assignBays(w: World) {
  const waiting = [...w.trucks.values()]
    .filter((t) => !t.bay && (t.phase === 'enroute' || t.phase === 'atgate'))
    // At a side entrance the truck already waiting comes first: trucks behind it cannot pass it.
    .sort((a, b) => waitFirst(a) - waitFirst(b) || truckArrival(w, a) - truckArrival(w, b));
  for (const t of waiting) {
    const free = freeBays(w, t.site, t.direction);
    if (free.length) {
      t.bay = free[0].id;
      onToLaneWait(w, t);
    }
  }
}

const waitFirst = (t: Truck) => (SITE_BY_CODE[t.site].entrance && t.phase === 'atgate' ? 0 : 1);

/**
 * Side entrance (WH-06): a truck bound for a lane with its own waiting point drives on past the
 * shared one. A truck already waiting at the shared point sets off again.
 */
function onToLaneWait(w: World, t: Truck) {
  const site = SITE_BY_CODE[t.site];
  if (!site.entrance || !t.bay || !t.path || (t.phase !== 'enroute' && t.phase !== 'atgate')) return;
  const more = bayLane(site, BAY_BY_ID[t.bay]).approach;
  if (!more?.length) return;
  const end = t.path.pts[t.path.pts.length - 1];
  const last = more[more.length - 1];
  if (Math.hypot(end.x - last.x, end.z - last.z) < 0.5) return;
  t.path = makePath([...t.path.pts, ...more]);
  if (t.phase === 'atgate') {
    t.phase = 'enroute';
    t.gateArrivedAt = undefined;
    t.phaseStart = w.time;
    w.roster++;
  }
}

function startDocking(w: World, t: Truck) {
  const site = SITE_BY_CODE[t.site];
  const { path, reverseFrom } = dockingPath(site, BAY_BY_ID[t.bay!]);
  t.phase = 'docking';
  t.path = path;
  t.reverseFrom = reverseFrom;
  t.s = 0;
  t.v = YARD_FWD;
  t.phaseStart = w.time;
}

function startDeparture(w: World, t: Truck) {
  const site = SITE_BY_CODE[t.site];
  releaseForklift(w, t);
  const bay = BAY_BY_ID[t.bay!];
  w.bays.get(bay.id)!.trucksToday += 1;
  if (t.direction === 'outbound') {
    w.sites[t.site].outboundToday += 1;
    const sh = w.shipments.get(t.shipment);
    if (sh) sh.loaded = w.time;
  }
  t.path = departPath(site, bay, stream(w, t.site).rng);
  t.phase = 'departing';
  t.phaseStart = w.time;
  t.s = 0;
  t.v = 0;
  t.reverseFrom = undefined;
  w.roster++;
}

/**
 * Yard lock: only one truck manoeuvres inside a site's yard at a time. A departing truck holds the
 * yard until it has passed the barrier on its way out.
 */
function yardFree(w: World, code: SiteCode, except?: Truck): boolean {
  const site = SITE_BY_CODE[code];
  if (site.entrance && except?.bay) return laneFree(w, site, except);
  const clearZ = gatePoints(site).yardClearZ;
  for (const o of w.trucks.values()) {
    if (o === except || o.site !== code) continue;
    if (o.phase === 'docking') return false;
    if (o.phase === 'departing' && o.path) {
      const p = samplePath(o.path, o.s);
      if (Math.abs(p.x - site.center.x) < PLOT_HX && p.z < clearZ) return false;
    }
  }
  return true;
}

/**
 * Side entrance with several dock lanes (WH-06): a lane is busy while another truck docks on it,
 * or while any other moving truck is inside its hold area. Lanes that do not share ground work at
 * the same time.
 */
function laneFree(w: World, site: SiteDef, t: Truck): boolean {
  const mine = bayLane(site, BAY_BY_ID[t.bay!]);
  const box = mine.hold;
  for (const o of w.trucks.values()) {
    if (o === t || o.site !== site.code || !o.path) continue;
    const same = !!o.bay && bayLane(site, BAY_BY_ID[o.bay]) === mine;
    if (o.phase === 'docking' && same) return false;
    if (!box || o.phase === 'atgate') continue;
    const p = samplePath(o.path, o.s);
    if (p.x > box.x0 && p.x < box.x1 && p.z > box.z0 && p.z < box.z1) return false;
  }
  return true;
}

/** Departures go one at a time: the previous one must be well clear of the gate exit. */
function canDepart(w: World, t: Truck): boolean {
  if (!yardFree(w, t.site, t) || forkliftCrossing(w, t, false)) return false;
  const exit = gatePoints(SITE_BY_CODE[t.site]).exitFence;
  for (const o of w.trucks.values()) {
    if (o === t || o.site !== t.site || o.phase !== 'departing' || !o.path) continue;
    const p = samplePath(o.path, o.s);
    if (Math.hypot(p.x - exit.x, p.z - exit.z) < 40) return false;
  }
  return true;
}

function canDock(w: World, t: Truck): boolean {
  if (!t.bay) return false;
  if (w.time < (t.gateArrivedAt ?? 0) + AT_GATE_MIN) return false;
  return yardFree(w, t.site, t) && !forkliftCrossing(w, t, true) && crossingsFree(w, t);
}

/**
 * Side entrance: a truck may start docking only when no truck of another flow is in, or about to
 * enter, a crossing on its way in (it cannot stop once it has started).
 */
function crossingsFree(w: World, t: Truck): boolean {
  const site = SITE_BY_CODE[t.site];
  if (!site.entrance?.crossings || !t.bay) return true;
  const path = dockingPath(site, BAY_BY_ID[t.bay]).path;
  for (const x of site.entrance.crossings) {
    const area: Box = { cx: (x.x0 + x.x1) / 2, cz: (x.z0 + x.z1) / 2, fx: 1, fz: 0, hl: (x.x1 - x.x0) / 2 + 12, hw: (x.z1 - x.z0) / 2 + 12 };
    let crosses = false;
    for (let s = 0; s <= path.length && !crosses; s += 2) crosses = boxesOverlap(boxOnPath(path, s), area);
    if (!crosses) continue;
    const mine = crossingFlow(t, x.clash);
    for (const o of w.trucks.values()) {
      if (o === t || o.site !== t.site || !o.path || o.phase === 'atgate' || o.phase === 'working') continue;
      if (crossingFlow(o, x.clash) !== mine && boxesOverlap(boxOnPath(o.path, o.s), area)) return false;
    }
  }
  return true;
}

/**
 * Side entrance (WH-06): a driving forklift's way ahead crosses the area this truck is about to
 * sweep (reversing in, or pulling out). The truck waits for it; forklifts never stop mid-route.
 */
function forkliftCrossing(w: World, t: Truck, docking: boolean): boolean {
  const site = SITE_BY_CODE[t.site];
  if (!site.entrance || !t.bay) return false;
  const bay = BAY_BY_ID[t.bay];
  const ref = bayLane(site, bay).entry.x;
  const toward = (docking ? Math.sign(bay.door.x - ref) : Math.sign(ref - bay.door.x)) || 1;
  const rects = truckSweep(site, bay, toward).map((r) => ({ x0: r.x0 - 1.5, z0: r.z0 - 1.5, x1: r.x1 + 1.5, z1: r.z1 + 1.5 }));
  for (const f of w.forklifts.values()) {
    if (f.site !== t.site || !f.travel || w.time >= f.travel.end) continue;
    const u = smooth(Math.max(0, (w.time - f.travel.start) / Math.max(0.001, f.travel.end - f.travel.start)));
    const n = Math.max(1, Math.ceil((1 - u) * routeLength(f.travel.route)));
    for (let k = 0; k <= n; k++) {
      const p = pointOnRoute(f.travel.route, u + ((1 - u) * k) / n);
      if (rects.some((r) => p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1)) return true;
    }
  }
  return false;
}

/** Collision boxes of every vehicle on the map, for following and queueing. */
function vehicleObstacles(w: World): Obstacle[] {
  const out: Obstacle[] = [];
  for (const t of w.trucks.values()) {
    let p: { x: number; z: number; angle: number };
    if (t.phase === 'working' && t.bay) {
      const k = bayParkPoint(BAY_BY_ID[t.bay]);
      p = { x: k.x, z: k.z, angle: -Math.PI / 2 };
    } else if (t.path) p = samplePath(t.path, t.s);
    else continue;
    out.push({ id: t.code, box: boxAt(p.x, p.z, p.angle), blockedBy: t.blockedBy });
  }
  for (const a of w.ambient) {
    const p = samplePath(a.path, a.s);
    out.push({ id: a.id, box: boxAt(p.x, p.z, p.angle), blockedBy: a.blockedBy });
  }
  return out;
}

/** Forklift size for trucks keeping clear of it (half length, half width, with a margin). */
const FORKLIFT_HL = 1.9;
const FORKLIFT_HW = 1.1;

/**
 * Side-entrance sites (WH-06): forklifts drive across the yard road the trucks use, so trucks give
 * way to a forklift that is driving. Forklifts follow their planned route, so this cannot deadlock.
 */
function drivingForklifts(w: World): Obstacle[] {
  const out: Obstacle[] = [];
  for (const f of w.forklifts.values()) {
    if (!SITE_BY_CODE[f.site].entrance || !f.travel || w.time >= f.travel.end) continue;
    const u = (w.time - f.travel.start) / Math.max(0.001, f.travel.end - f.travel.start);
    const p = pointOnRoute(f.travel.route, smooth(Math.max(0, u)));
    out.push({ id: f.code, box: boxAt(p.x, p.z, p.angle, FORKLIFT_HL, FORKLIFT_HW) });
  }
  return out;
}

/** True when a forklift is within the next few metres of a docking truck's path. */
function forkliftInWay(t: Truck, forklifts: Obstacle[]): boolean {
  if (!t.path || !forklifts.length) return false;
  for (let d = 0; d <= 6; d += 2) {
    const b = boxOnPath(t.path, Math.min(t.path.length, t.s + d), TRUCK_HL + 0.5, TRUCK_HW + 0.3);
    if (forklifts.some((o) => boxesOverlap(b, o.box))) return true;
  }
  return false;
}

/** Move every vehicle for this step. Road and exit traffic follows; yard docking is exclusive. */
function moveVehicles(w: World, dt: number) {
  const forklifts = drivingForklifts(w);
  const obstacles = [...vehicleObstacles(w), ...forklifts];
  // Who waited for whom last step; any circular wait is broken by letting one vehicle through.
  const waits = new Map<string, string>();
  for (const t of w.trucks.values()) if (t.blockedBy) waits.set(t.code, t.blockedBy);
  for (const a of w.ambient) if (a.blockedBy) waits.set(a.id, a.blockedBy);
  const breaks = gridlockBreaks(waits);
  // Gate hold line: only one truck at a time may enter the last GATE_ZONE metres before a gate
  // (the turn-in), so a queue waits in its road lane instead of blocking the gate exit.
  const gateBusy = new Set<SiteCode>();
  for (const t of w.trucks.values()) {
    if (t.phase === 'atgate' || (t.phase === 'docking' && t.s < 24)) gateBusy.add(t.site);
    if (t.phase === 'enroute' && t.path && t.path.length - t.s <= GATE_ZONE) gateBusy.add(t.site);
  }
  const arriving = [...w.trucks.values()]
    .filter((t) => t.phase === 'enroute' && t.path)
    .sort((a, b) => a.path!.length - a.s - (b.path!.length - b.s));
  const holdAt = new Map<string, number>();
  for (const t of arriving) {
    const L = t.path!.length;
    if (L - t.s <= GATE_ZONE) continue;
    if (gateBusy.has(t.site)) holdAt.set(t.code, L - GATE_ZONE);
    else if (L - t.s < GATE_ZONE + 25) gateBusy.add(t.site); // about to enter: others wait behind it
  }
  for (const site of SITES) for (const x of site.entrance?.crossings ?? []) holdForCrossing(w, site.code, x, holdAt);
  for (const t of w.trucks.values()) {
    if (!t.path) continue;
    if (t.phase === 'enroute' || t.phase === 'departing') {
      const m: Mover = {
        id: t.code, path: t.path, s: t.s, v: t.v, vmax: ROAD_SPEED, blockedBy: t.blockedBy, ignore: breaks.get(t.code),
        stopAt: holdAt.get(t.code),
      };
      driveMover(m, obstacles, dt);
      t.s = m.s;
      t.v = m.v;
      t.blockedBy = m.blockedBy;
    } else if (t.phase === 'docking') {
      const yielding = !!SITE_BY_CODE[t.site].entrance && forkliftInWay(t, forklifts);
      t.v = yielding ? 0 : t.s < (t.reverseFrom ?? Infinity) ? YARD_FWD : YARD_REV;
      t.s = Math.min(t.path.length, t.s + t.v * dt);
    }
  }
  for (const a of w.ambient) {
    const m: Mover = { id: a.id, path: a.path, s: a.s, v: a.v, vmax: AMBIENT_SPEED, blockedBy: a.blockedBy, ignore: breaks.get(a.id) };
    driveMover(m, obstacles, dt);
    a.s = m.s;
    a.v = m.v;
    a.blockedBy = m.blockedBy;
  }
}

/** How far ahead a truck looks for a crossing it must wait at. */
const CROSSING_AHEAD = 40;

/** Which flow a truck belongs to at a crossing (see Crossing). */
function crossingFlow(t: Truck, clash: Crossing['clash']): string {
  if (clash === 'direction') return t.phase === 'departing' ? 'out' : 'in';
  return t.bay && BAY_BY_ID[t.bay].lane ? t.bay : 'main';
}

/**
 * Side entrance: trucks about to enter a crossing that a truck of another flow is in (or about to
 * enter) wait just before it. Trucks already inside always drive on, so they clear it.
 */
function holdForCrossing(w: World, code: SiteCode, x: Crossing, holdAt: Map<string, number>) {
  const area: Box = { cx: (x.x0 + x.x1) / 2, cz: (x.z0 + x.z1) / 2, fx: 1, fz: 0, hl: (x.x1 - x.x0) / 2, hw: (x.z1 - x.z0) / 2 };
  const inside: string[] = [];
  const coming: { t: Truck; at: number; flow: string }[] = [];
  for (const t of w.trucks.values()) {
    if (t.site !== code || !t.path || (t.phase !== 'enroute' && t.phase !== 'departing' && t.phase !== 'docking')) continue;
    const flow = crossingFlow(t, x.clash);
    if (boxesOverlap(boxOnPath(t.path, t.s), area)) {
      inside.push(flow);
      continue;
    }
    if (t.phase === 'docking') {
      // A docking truck cannot stop: it holds every crossing left on its way in.
      for (let s = t.s; s <= t.path.length; s += 2) {
        if (boxesOverlap(boxOnPath(t.path, s), area)) {
          inside.push(flow);
          break;
        }
      }
      continue;
    }
    for (let d = 1; d <= CROSSING_AHEAD && t.s + d <= t.path.length; d++) {
      if (boxesOverlap(boxOnPath(t.path, t.s + d), area)) {
        coming.push({ t, at: t.s + d, flow });
        break;
      }
    }
  }
  coming.sort((a, b) => a.at - a.t.s - (b.at - b.t.s) || (a.t.code < b.t.code ? -1 : 1));
  for (const c of coming) {
    if (inside.some((f) => f !== c.flow)) holdAt.set(c.t.code, Math.min(holdAt.get(c.t.code) ?? Infinity, c.at - 1));
    else if (c.at - c.t.s < 25) inside.push(c.flow); // about to enter: trucks of other flows wait for it
  }
}

/** True when nothing occupies the first stretch of `path` (where a new vehicle would appear). */
function startClear(w: World, path: PathData): boolean {
  const start = boxOnPath(path, 0, TRUCK_HL + 3, TRUCK_HW + 0.5);
  return !vehicleObstacles(w).some((o) => boxesOverlap(start, o.box));
}

/** Returns false when the truck could not enter yet (its entry point is occupied). */
function spawnTruck(w: World, siteCode: SiteCode): boolean {
  const st = stream(w, siteCode);
  const rng = st.rng;
  const pool = LOCAL_POOLS[siteCode];
  const site = SITE_BY_CODE[siteCode];
  if (siteTrucks(w, siteCode).length >= (site.maxTrucks ?? site.bays.length + 2)) return true;
  const outboundShare = site.style === 'crossdock' ? 0.5 : 0.4;
  const direction: Truck['direction'] = rng.chance(outboundShare) ? 'outbound' : 'inbound';
  const carrier = rng.pick(Object.keys(CARRIERS) as CarrierId[]);
  // Own-stream sites number their trucks apart, so the shared stream never has to redraw a code.
  const [lo, hi] = st === w ? [2000, 2999] : [3100, 3999];
  let code = '';
  do code = `TRK-${rng.int(lo, hi)}`;
  while (w.trucks.has(code));
  const route = makePath(entryRoute(site, rng));
  if (!startClear(w, route)) return false;
  const eta = w.time + route.length / ROAD_SPEED;
  const total = rng.int(3, 7);
  const capacity = total + rng.int(1, 3);
  const shipCode = `SHP-${st.nextShipment}`;
  st.nextShipment += 2;
  const oc = w.time - rng.range(140, 220);
  const picked = oc + rng.range(70, 110);
  const sh: Shipment =
    direction === 'inbound'
      ? {
          code: shipCode, truck: code, customer: rng.pick(pool?.customers ?? CUSTOMERS), destination: `${site.code} ${site.name}`,
          orderConfirmed: oc, picked, loaded: picked + rng.range(25, 50), inTransit: w.time - rng.range(4, 14),
          deliveredEta: eta + DOCK_MIN + total * 2.5 + rng.range(18, 32),
        }
      : {
          code: shipCode, truck: code, customer: rng.pick(pool?.customers ?? CUSTOMERS), destination: rng.pick(pool?.cities ?? CITIES),
          orderConfirmed: oc, picked, transitEta: eta + DOCK_MIN + total * 2.5 + 3,
          deliveredEta: eta + DOCK_MIN + total * 2.5 + rng.range(30, 50),
        };
  w.shipments.set(shipCode, sh);
  const letters = 'ABCDEFGHJKLMNPRSTVWXYZ';
  const plate = pool
    ? `${rng.pick(pool.plateRegions)} ${rng.int(1000, 9999)} ${letters[rng.int(0, 21)]}${letters[rng.int(0, 21)]}`
    : `${letters[rng.int(0, 21)]}${letters[rng.int(0, 21)]}${letters[rng.int(0, 21)]}-${rng.int(1000, 9999)}`;
  w.trucks.set(code, {
    code, carrier, driver: rng.pick(pool?.drivers ?? DRIVER_NAMES), plate, site: site.code, direction,
    phase: 'enroute', phaseStart: w.time, path: route, s: 0, v: ROAD_SPEED, cruiseKmh: Math.round(rng.range(32, 42)),
    work: { done: 0, total, period: 2.5, cycleStart: 0 },
    cargo: { onBoard: direction === 'inbound' ? total : 0, capacity, kgPerPallet: Math.round(rng.range(220, 420)) },
    shipment: shipCode,
  });
  w.roster++;
  return true;
}

// ---- lifecycle -----------------------------------------------------------------------------

export function createWorld(seed: number): World {
  const rng = new Rng(seed);
  const w: World = {
    time: SIM_START,
    rng,
    sites: {} as World['sites'],
    trucks: new Map(),
    shipments: new Map(),
    forklifts: new Map(),
    pallets: new Map(),
    chargers: new Map(),
    bays: new Map(),
    cycles: new Map(),
    ambient: [],
    nextSpawn: {} as World['nextSpawn'],
    nextPallet: 1100,
    nextShipment: 78474,
    streams: {},
    roster: 0,
  };
  for (const s of SITES) {
    if (!SHARED_STREAM.includes(s.code)) {
      const k = SITES.indexOf(s) + 1;
      w.streams[s.code] = { rng: new Rng(Math.imul(seed ^ 0x5bd1e995, 0x27d4eb2d) + k), nextPallet: 1000 * k + 100, nextShipment: 10000 * k + 610 };
    }
    w.nextSpawn[s.code] = SIM_START + 4 + stream(w, s.code).rng.range(0, 6);
    const seedS = SITE_SEEDS[s.code];
    w.sites[s.code] = { code: s.code, ...seedS, inventory: seedS.inventory.map((i) => ({ ...i })) };
    for (const b of s.bays) w.bays.set(b.id, { id: b.id, trucksToday: BAY_TRUCKS_TODAY[b.id] ?? 2 + Math.floor(hash01(b.id) * 5) });
    for (const c of s.chargers) {
      const cs = CHARGER_SEEDS[c.id];
      w.chargers.set(c.id, { id: c.id, sessionsToday: cs?.sessionsToday ?? 3 + Math.floor(hash01(c.id) * 5), energyKwh: cs?.energyKwh ?? 14 + hash01(c.id + 'e') * 22 });
    }
  }

  for (const ps of PALLET_SEEDS) {
    const sku = SKUS[ps.sku];
    w.pallets.set(ps.code, {
      code: ps.code, sku: sku.sku, site: ps.site, status: ps.forklift ? 'Moving' : 'Staged', slot: ps.slot,
      forklift: ps.forklift, quantity: ps.quantity ?? sku.unitsPerPallet, grossKg: sku.kgPerPallet,
      lot: ps.lot, received: ps.received, pinned: !!ps.pinned,
    });
  }

  for (const fs of FORKLIFT_SEEDS) {
    const charger = `${fs.site}:${fs.charger}`;
    const f: Forklift = {
      code: fs.code, site: fs.site, operator: fs.operator, model: fs.model,
      status: fs.status === 'working' ? 'Idle' : fs.status, battery: fs.battery, charger, movesToday: fs.movesToday,
      pos: { x: 0, z: 0 }, heading: 0,
    };
    w.forklifts.set(f.code, f);
    if (fs.status === 'Charging') {
      f.pos = chargerSpot(charger);
      f.heading = CHARGE_ANGLE;
      w.chargers.get(charger)!.charging = f.code;
    } else {
      f.pos = idleSpot(f);
      f.heading = IDLE_ANGLE;
    }
  }

  for (const ts of TRUCK_SEEDS) {
    const site = SITE_BY_CODE[ts.site];
    const shift = SIM_START - CAPTURED_AT[ts.site];
    const sh = (v?: number) => (v === undefined ? undefined : v + shift);
    const bay = ts.bay ? `${ts.site}:${ts.bay}` : undefined;
    const s = ts.shipment;
    w.shipments.set(s.code, {
      code: s.code, truck: ts.code, customer: s.customer, destination: s.destination,
      orderConfirmed: sh(s.orderConfirmed)!, picked: sh(s.picked)!, loaded: sh(s.loaded), inTransit: sh(s.inTransit),
      deliveredEta: sh(s.deliveredEta)!, transitEta: sh(s.transitEta),
    });
    const t: Truck = {
      code: ts.code, carrier: ts.carrier, driver: ts.driver, plate: ts.plate, site: ts.site, direction: ts.direction,
      phase: ts.phase, bay, phaseStart: w.time, s: 0, v: 0, cruiseKmh: ts.cruiseKmh,
      work: { done: ts.work.done, total: ts.work.total, period: ts.work.period, cycleStart: sh(ts.work.cycleStart) ?? w.time },
      cargo: { ...ts.cargo }, shipment: s.code,
    };
    if (ts.phase === 'enroute') {
      // Place it so that, unobstructed, it reaches the gate at the seeded ETA.
      t.path = makePath(entryRoute(site, stream(w, ts.site).rng));
      t.s = Math.max(0, t.path.length - (sh(ts.gateEta)! - w.time) * ROAD_SPEED);
      t.v = ROAD_SPEED;
    } else if (ts.phase === 'atgate') {
      t.path = makePath(entryRoute(site, stream(w, ts.site).rng));
      t.s = t.path.length;
      t.gateArrivedAt = sh(ts.gateArrivedAt)!;
      t.phaseStart = t.gateArrivedAt;
    } else if (ts.phase === 'docking') {
      const d = dockingPath(site, BAY_BY_ID[bay!]);
      const start = sh(ts.dockStart)!;
      const end = sh(ts.dockEnd)!;
      t.path = d.path;
      t.reverseFrom = d.reverseFrom;
      t.phaseStart = start;
      t.s = d.path.length * Math.max(0, Math.min(1, (w.time - start) / Math.max(0.1, end - start)));
      t.v = YARD_FWD;
    }
    w.trucks.set(t.code, t);
  }

  for (const t of w.trucks.values()) onToLaneWait(w, t);

  // Start forklift cycles only once every truck is placed, so routes see all parked trucks.
  for (const ts of TRUCK_SEEDS) {
    if (ts.phase !== 'working' || !ts.work.forklift) continue;
    const t = w.trucks.get(ts.code)!;
    const f = w.forklifts.get(ts.work.forklift)!;
    f.truck = t.code;
    f.status = t.direction === 'inbound' ? 'Unloading truck' : 'Loading truck';
    f.pos = bayWorkPoint(BAY_BY_ID[t.bay!]);
    f.heading = WORK_ANGLE;
    t.work.forklift = f.code;
    const seeded = [...w.pallets.values()].find((p) => p.forklift === f.code);
    startCycle(w, t, seeded);
  }

  // City traffic starts part-way along its routes, never on top of another vehicle.
  for (let i = 0; i < 12; i++) {
    let a = newAmbient(w, `AMB-${i}`, true);
    for (let k = 0; k < 8 && !placementClear(w, a); k++) a = newAmbient(w, `AMB-${i}`, true);
    w.ambient.push(a);
  }
  return w;
}

function placementClear(w: World, a: AmbientTruck): boolean {
  const box = boxOnPath(a.path, a.s, TRUCK_HL + 4, TRUCK_HW + 0.5);
  return !vehicleObstacles(w).some((o) => boxesOverlap(box, o.box));
}

function newAmbient(w: World, id: string, midway = false): AmbientTruck {
  const path = makePath(ambientRoute(w.rng));
  const carrier = w.rng.pick(Object.keys(CARRIERS) as CarrierId[]);
  const s = midway ? w.rng.range(0, path.length * 0.8) : 0;
  return { id, carrier, path, s, v: AMBIENT_SPEED };
}

/** Advance the world by dt simulated minutes. */
export function step(w: World, dt: number) {
  const now = w.time + dt;
  w.time = now;

  for (const s of SITES) {
    if (now >= w.nextSpawn[s.code]) {
      w.nextSpawn[s.code] = spawnTruck(w, s.code) ? now + stream(w, s.code).rng.range(...(s.spawnEvery ?? [6, 10])) : now + 0.5;
    }
  }

  assignBays(w);
  moveVehicles(w, dt);

  for (const t of [...w.trucks.values()]) {
    const arrived = !!t.path && t.s >= t.path.length - 0.01;
    switch (t.phase) {
      case 'enroute':
        if (arrived) {
          t.phase = 'atgate';
          t.gateArrivedAt = now;
          t.phaseStart = now;
          t.v = 0;
          w.roster++;
        }
        break;
      case 'atgate':
        break;
      case 'docking':
        if (arrived) {
          t.phase = 'working';
          t.path = undefined;
          t.reverseFrom = undefined;
          t.s = 0;
          t.v = 0;
          t.phaseStart = now;
          t.work.cycleStart = now;
          w.roster++;
        }
        break;
      case 'working': {
        if (!t.work.forklift && t.work.done < t.work.total) {
          t.work.cycleStart = now;
          assignForklift(w, t);
        }
        let guard = 0;
        while (t.work.forklift && t.work.done < t.work.total && now >= t.work.cycleStart + t.work.period && guard++ < 20) {
          completeCycle(w, t);
        }
        if (t.work.done >= t.work.total) {
          // The forklift is free as soon as the last pallet is moved.
          if (t.work.forklift) releaseForklift(w, t);
          // Leave only when the yard and the gate exit are clear; otherwise wait at the bay.
          if (canDepart(w, t)) startDeparture(w, t);
        } else cycleEvents(w, t);
        break;
      }
      case 'departing':
        if (arrived) {
          w.trucks.delete(t.code);
          w.shipments.delete(t.shipment);
          w.roster++;
        }
        break;
    }
  }

  // Waiting trucks dock in arrival order, one at a time per site.
  const waiting = [...w.trucks.values()].filter((t) => t.phase === 'atgate').sort((a, b) => (a.gateArrivedAt ?? 0) - (b.gateArrivedAt ?? 0));
  for (const t of waiting) if (canDock(w, t)) startDocking(w, t);

  for (const f of w.forklifts.values()) {
    if (f.travel && now >= f.travel.end) f.travel = undefined;
    if (f.status === 'Charging') {
      if (!f.travel) {
        const c = CHARGER_BY_ID[f.charger];
        const gain = c.ratePctPerMin * dt;
        f.battery = Math.min(100, f.battery + gain);
        const cs = w.chargers.get(f.charger);
        if (cs) cs.energyKwh += gain * KWH_PER_PCT;
      }
      if (f.battery >= CHARGE_FULL) {
        const cs = w.chargers.get(f.charger);
        if (cs && cs.charging === f.code) cs.charging = undefined;
        f.status = 'Idle';
        f.retryAt = undefined;
        goHome(w, f);
        w.roster++;
      }
    } else if (f.status === 'Idle') {
      f.battery = Math.max(0, f.battery - DRAIN_IDLE * dt);
      if (f.battery < CHARGE_LOW) goCharge(w, f);
      else if (f.pendingHome !== undefined && !f.truck) goHome(w, f);
    } else {
      f.battery = Math.max(0, f.battery - DRAIN_WORK * dt);
    }
  }

  for (let i = 0; i < w.ambient.length; i++) {
    const a = w.ambient[i];
    if (a.s >= a.path.length - 0.01) {
      // Re-enter on a new route once its entry point is free.
      const next = newAmbient(w, a.id);
      if (startClear(w, next.path)) {
        w.ambient[i] = next;
        w.roster++;
      }
    }
  }
}

function goCharge(w: World, f: Forklift) {
  const site = SITE_BY_CODE[f.site];
  const order = [f.charger, ...site.chargers.map((c) => c.id).filter((id) => id !== f.charger)];
  const free = order.find((id) => !w.chargers.get(id)?.charging);
  if (!free || !mayRetry(f, w.time)) return;
  const since = f.pendingHome ?? w.time;
  if (travel(w, f, chargerSpot(free), w.time, CHARGE_ANGLE, w.time - since < MAX_WAIT) === null) {
    f.pendingHome = since;
    return;
  }
  f.pendingHome = undefined;
  const cs = w.chargers.get(free)!;
  cs.charging = f.code;
  cs.sessionsToday += 1;
  f.charger = free;
  f.status = 'Charging';
  w.roster++;
}

export { gatePoints };
