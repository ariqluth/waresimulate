// Derived numbers and display text (PRD §9, §11.2).
import type { BayStatus, Forklift, ShipmentStep, SiteCode, Truck, TruckStatus } from '../data/types';
import { BAY_BY_ID, CARRIERS, SITES, SITE_BY_CODE } from '../data/sites';
import { hhmm, siteTrucks, truckArrival, type World } from './engine';
import { truckPose } from './pose';
import { dockingPath } from './path';

export function truckStatus(t: Truck): TruckStatus {
  switch (t.phase) {
    case 'enroute':
    case 'departing':
      return 'En route';
    case 'atgate':
      return 'At gate';
    case 'docking':
      return 'Docking';
    default:
      return t.direction === 'inbound' ? 'Unloading' : 'Loading';
  }
}

export function isOnSite(t: Truck) {
  return t.phase === 'atgate' || t.phase === 'docking' || t.phase === 'working';
}

export function isInbound(t: Truck) {
  return t.phase === 'enroute' || t.phase === 'atgate' || t.phase === 'docking';
}

export function bayStatus(w: World, bayId: string): { status: BayStatus; truck?: Truck } {
  for (const t of w.trucks.values()) {
    if (t.bay !== bayId || t.phase === 'departing') continue;
    if (t.phase === 'working') return { status: t.direction === 'inbound' ? 'Unloading' : 'Loading', truck: t };
    if (t.phase === 'docking') return { status: 'Arriving', truck: t };
    return { status: 'Booked', truck: t };
  }
  return { status: 'Available' };
}

export const forkliftWorking = (f: Forklift) => f.status === 'Loading truck' || f.status === 'Unloading truck';

export interface SiteMetrics {
  onSite: number;
  inbound: number;
  docked: number;
  baysBusy: number;
  bays: number;
  staged: number;
  forkliftsWorking: number;
  forkliftsTotal: number;
  trucks: number;
  stock: number;
  capacity: number;
  pctFull: number;
}

export function siteMetrics(w: World, code: SiteCode): SiteMetrics {
  const site = SITE_BY_CODE[code];
  const trucks = siteTrucks(w, code);
  let staged = 0;
  for (const p of w.pallets.values()) if (p.site === code && p.status === 'Staged') staged++;
  let fw = 0;
  let ft = 0;
  for (const f of w.forklifts.values()) {
    if (f.site !== code) continue;
    ft++;
    if (forkliftWorking(f)) fw++;
  }
  const stock = w.sites[code].stock;
  return {
    onSite: trucks.filter(isOnSite).length,
    inbound: trucks.filter(isInbound).length,
    docked: trucks.filter((t) => t.phase === 'working').length,
    baysBusy: site.bays.filter((b) => bayStatus(w, b.id).status !== 'Available').length,
    bays: site.bays.length,
    staged,
    forkliftsWorking: fw,
    forkliftsTotal: ft,
    trucks: trucks.length,
    stock,
    capacity: site.capacity,
    pctFull: Math.round((stock / site.capacity) * 100),
  };
}

export function networkMetrics(w: World): SiteMetrics & { onTimePct: number } {
  const all = SITES.map((s) => siteMetrics(w, s.code));
  const sum = (k: keyof SiteMetrics) => all.reduce((a, m) => a + (m[k] as number), 0);
  let num = 0;
  let den = 0;
  for (const s of SITES) {
    const st = w.sites[s.code];
    num += st.onTimePct * st.deliveries30d;
    den += st.deliveries30d;
  }
  const stock = sum('stock');
  const capacity = sum('capacity');
  return {
    onSite: sum('onSite'), inbound: sum('inbound'), docked: sum('docked'), baysBusy: sum('baysBusy'), bays: sum('bays'),
    staged: sum('staged'), forkliftsWorking: sum('forkliftsWorking'), forkliftsTotal: sum('forkliftsTotal'),
    trucks: sum('trucks'), stock, capacity, pctFull: Math.round((stock / capacity) * 100),
    onTimePct: den ? num / den : 0,
  };
}

/** Whole minutes until `eta`, floored, at least 1 while still in the future (PRD §11.2). */
export function minsUntil(eta: number, now: number): number | 'now' {
  const d = eta - now;
  if (d <= 0) return 'now';
  return Math.max(1, Math.floor(d));
}

export const minsText = (eta: number, now: number) => {
  const m = minsUntil(eta, now);
  return m === 'now' ? 'now' : `${m} min`;
};

/** Expected arrival at the bay (or gate while en route). */
export function truckEta(w: World, t: Truck): number | undefined {
  switch (t.phase) {
    case 'enroute':
    case 'atgate':
    case 'docking':
      return truckArrival(w, t);
    case 'working':
      return workFinish(w, t);
    default:
      return undefined;
  }
}

export function workFinish(w: World, t: Truck): number {
  const remaining = t.work.total - t.work.done;
  const base = t.work.forklift ? Math.max(t.work.cycleStart, w.time - t.work.period) : w.time;
  return base + remaining * t.work.period;
}

export function fmtWeight(kg: number) {
  if (kg <= 0) return '0 kg';
  if (kg < 1000) return `${Math.round(kg)} kg`;
  return `${(kg / 1000).toFixed(1)} t`;
}

export const carrierOf = (t: Truck) => CARRIERS[t.carrier];
export const bayName = (t: Truck) => (t.bay ? BAY_BY_ID[t.bay].name : undefined);

export function truckStatusLine(w: World, t: Truck): string {
  const site = t.site;
  const bay = bayName(t);
  switch (t.phase) {
    case 'enroute':
      return `To ${site} · ETA ${minsText(truckArrival(w, t), w.time)}`;
    case 'atgate':
      return `At gate · ${site}`;
    case 'docking':
      return `Reversing into ${bay} · ${site}`;
    case 'working':
      return `${site} · ${bay} · ${t.work.done}/${t.work.total} pallets`;
    default:
      return `Departing ${site}`;
  }
}

const dockLenCache = new Map<string, number>();
function dockingLength(t: Truck) {
  if (!t.bay) return 0;
  const k = t.bay;
  if (!dockLenCache.has(k)) dockLenCache.set(k, dockingPath(SITE_BY_CODE[t.site], BAY_BY_ID[t.bay]).path.length);
  return dockLenCache.get(k)!;
}

/** Inspector bar for a truck: fraction + right-hand text. */
export function truckBar(w: World, t: Truck): { value: number; text: string; color: 'green' | 'blue' } {
  if (t.phase === 'working') return { value: t.work.done / t.work.total, text: `${t.work.done}/${t.work.total}`, color: 'green' };
  const pose = truckPose(t, w.time);
  if (t.phase === 'atgate') return { value: 0.02, text: `${Math.round(dockingLength(t))} m left`, color: 'blue' };
  return { value: Math.max(0.02, pose.progress), text: `${Math.max(0, Math.round(pose.distLeft))} m left`, color: 'blue' };
}

export function truckEtaText(w: World, t: Truck): string {
  if (t.phase === 'working') return `Done in ${minsText(workFinish(w, t), w.time)}`;
  const eta = truckEta(w, t);
  if (eta === undefined) return '—';
  const m = minsUntil(eta, w.time);
  return `${hhmm(eta)} (${m === 'now' ? 'now' : `${m} min`})`;
}

/** Shipment timeline variants (PRD §9.5). */
export function timeline(w: World, t: Truck): ShipmentStep[] {
  const sh = w.shipments.get(t.shipment);
  if (!sh) return [];
  const finish = workFinish(w, t);
  if (t.direction === 'outbound') {
    const working = t.phase === 'working';
    const departed = t.phase === 'departing';
    const loadDone = departed ? sh.loaded ?? w.time : undefined;
    return [
      { label: 'Order Confirmed', state: 'done', time: sh.orderConfirmed },
      { label: 'Picked', state: 'done', time: sh.picked },
      departed
        ? { label: 'Loaded', state: 'done', time: loadDone }
        : { label: `Loading ${t.work.done}/${t.work.total}`, state: working ? 'active' : 'todo', eta: finish },
      departed
        ? { label: 'In Transit', state: 'active', time: loadDone }
        : { label: 'In Transit', state: 'todo', eta: working ? finish + 8 : sh.transitEta },
      { label: 'Delivered', state: 'todo', eta: sh.deliveredEta },
    ];
  }
  const steps: ShipmentStep[] = [
    { label: 'Order Confirmed', state: 'done', time: sh.orderConfirmed },
    { label: 'Picked', state: 'done', time: sh.picked },
    { label: 'Loaded', state: 'done', time: sh.loaded },
  ];
  if (t.phase === 'working' || t.phase === 'departing') {
    steps.push({ label: 'In Transit', state: 'done', time: sh.inTransit });
    steps.push(
      t.phase === 'departing'
        ? { label: 'Delivered', state: 'done', time: t.phaseStart }
        : { label: `Unloading ${t.work.done}/${t.work.total}`, state: 'active', eta: finish },
    );
  } else {
    steps.push({ label: 'In Transit', state: 'active', time: sh.inTransit });
    steps.push({ label: 'Delivered', state: 'todo', eta: sh.deliveredEta });
  }
  return steps;
}

/** Trucks tab order: at a bay (by bay name), Docking, At gate, En route by ETA. */
export function sortedTrucks(w: World, code: SiteCode | 'ALL'): Truck[] {
  const list = code === 'ALL' ? SITES.flatMap((s) => siteTrucks(w, s.code)) : siteTrucks(w, code);
  const rank = (t: Truck) => (t.phase === 'working' ? 0 : t.phase === 'docking' ? 1 : t.phase === 'atgate' ? 2 : 3);
  return list.sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r) return r;
    if (a.phase === 'working') return (bayName(a) ?? '').localeCompare(bayName(b) ?? '', undefined, { numeric: true });
    return (truckEta(w, a) ?? 0) - (truckEta(w, b) ?? 0);
  });
}

/** Truck used by Shipment Tracking when switching to a site (PRD §10.2). */
export function defaultTruck(w: World, code: SiteCode): string | undefined {
  const site = SITE_BY_CODE[code];
  for (const b of site.bays) {
    const s = bayStatus(w, b.id);
    if (s.truck && s.truck.phase === 'working') return s.truck.code;
  }
  const inbound = siteTrucks(w, code)
    .filter(isInbound)
    .sort((a, b) => (truckEta(w, a) ?? 0) - (truckEta(w, b) ?? 0));
  return inbound[0]?.code ?? siteTrucks(w, code)[0]?.code;
}

export function forkliftActivity(w: World, f: Forklift): string {
  if (f.truck) {
    const t = w.trucks.get(f.truck);
    const bay = t ? bayName(t) : undefined;
    return `${f.status === 'Unloading truck' ? 'Unloading' : 'Loading'} ${f.truck} at ${bay ?? '—'}`;
  }
  if (f.status === 'Charging') return 'Charging at bay';
  return 'Parked · waiting for task';
}
