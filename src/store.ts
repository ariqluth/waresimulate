import { create } from 'zustand';
import type { Selection, SiteCode, SiteView } from './data/types';
import { BAY_BY_ID, CHARGER_BY_ID, SITE_ORDER } from './data/sites';
import { createWorld, idleSpot, type World } from './sim/engine';
import { defaultTruck } from './sim/derived';

// ---- URL parameters (PRD §12, §16) ----------------------------------------------------------
const params = new URLSearchParams(window.location.search);
export const SEED = Number(params.get('seed') ?? 1) || 1;
export const SPEED = Math.max(0.1, Number(params.get('speed') ?? 1) || 1);
export const FORCED_STATE = params.get('state') as 'loading' | 'empty' | 'error' | 'offline' | null;
export const SIM_MIN_PER_SEC = 0.2 * SPEED;

export const world: World = makeWorld();

/** Camera heading, written by the camera rig every frame and read by 2D overlays (north arrow). */
export const view3d = { azimuth: 0 };

function makeWorld() {
  const w = createWorld(SEED);
  if (FORCED_STATE === 'empty') {
    for (const f of w.forklifts.values()) {
      f.truck = undefined;
      f.carrying = undefined;
      if (f.status !== 'Charging') {
        f.status = 'Idle';
        f.pos = idleSpot(f);
      }
    }
    for (const p of [...w.pallets.values()]) if (p.status === 'Moving') w.pallets.delete(p.code);
    w.trucks.clear();
    w.shipments.clear();
    w.cycles.clear();
    for (const k of Object.keys(w.nextSpawn) as SiteCode[]) w.nextSpawn[k] = Infinity;
  }
  return w;
}

export type QueueTab = 'Docks' | 'Forklifts' | 'Trucks';
export type Connection = 'loading' | 'live' | 'offline' | 'error';
export type Hover = { kind: 'truck' | 'forklift' | 'pallet' | 'bay' | 'charger'; id: string } | null;

export type CameraCmd =
  | { type: 'site'; code: SiteCode; instant?: boolean }
  | { type: 'overview' }
  | { type: 'locate' }
  | { type: 'zoom'; dir: 1 | -1 }
  | { type: 'rotate'; dir: 1 | -1 }
  | { type: 'home' };

interface State {
  tick: number;
  roster: number;
  connection: Connection;
  view: SiteView;
  selection: Selection;
  hover: Hover;
  activeTruck?: string;
  queueTab: QueueTab;
  follow: boolean;
  camCmd: (CameraCmd & { id: number }) | null;
  setTick: () => void;
  setConnection: (c: Connection) => void;
  setView: (v: SiteView, opts?: { keepSelection?: boolean }) => void;
  nextSite: () => void;
  select: (sel: Selection, opts?: { locate?: boolean }) => void;
  clearSelection: () => void;
  setHover: (h: Hover) => void;
  setQueueTab: (t: QueueTab) => void;
  toggleFollow: () => void;
  stopFollow: () => void;
  camera: (cmd: CameraCmd) => void;
  retry: () => void;
}

let camId = 0;

export function selectionSite(sel: Selection): SiteCode | undefined {
  if (!sel) return undefined;
  switch (sel.kind) {
    case 'truck':
      return world.trucks.get(sel.id)?.site;
    case 'forklift':
      return world.forklifts.get(sel.id)?.site;
    case 'pallet':
      return world.pallets.get(sel.id)?.site;
    case 'bay':
      return BAY_BY_ID[sel.id]?.site;
    case 'charger':
      return CHARGER_BY_ID[sel.id]?.site;
  }
}

/** Truck that Shipment Tracking should follow after a selection (PRD §10.2). */
function relatedTruck(sel: Selection): string | undefined {
  if (!sel) return undefined;
  if (sel.kind === 'truck') return sel.id;
  if (sel.kind === 'forklift') return world.forklifts.get(sel.id)?.truck;
  if (sel.kind === 'bay') {
    for (const t of world.trucks.values()) if (t.bay === sel.id && t.phase !== 'departing') return t.code;
  }
  if (sel.kind === 'charger') {
    const fl = world.chargers.get(sel.id)?.charging;
    if (fl) return world.forklifts.get(fl)?.truck;
  }
  return undefined;
}

export const useApp = create<State>((set, get) => ({
  tick: 0,
  roster: 0,
  connection: 'loading',
  view: 'WH-01',
  selection: null,
  hover: null,
  activeTruck: defaultTruck(world, 'WH-01'),
  queueTab: 'Docks',
  follow: false,
  camCmd: null,

  setTick: () => {
    const s = get();
    const patch: Partial<State> = { tick: s.tick + 1, roster: world.roster };
    // Drop references to objects that left the simulation.
    if (s.selection && !selectionExists(s.selection)) {
      patch.selection = null;
      patch.follow = false;
    }
    const active = s.activeTruck ? world.trucks.get(s.activeTruck) : undefined;
    if (!active || active.phase === 'departing') {
      const code = s.view === 'ALL' ? (active?.site ?? 'WH-04') : s.view;
      const fallback = defaultTruck(world, code);
      if (fallback !== s.activeTruck) patch.activeTruck = fallback;
    }
    set(patch);
  },

  setConnection: (connection) => set({ connection }),

  setView: (view, opts) => {
    const patch: Partial<State> = { view, follow: false };
    if (!opts?.keepSelection) patch.selection = null;
    if (view !== 'ALL') patch.activeTruck = defaultTruck(world, view) ?? get().activeTruck;
    set(patch);
    get().camera(view === 'ALL' ? { type: 'overview' } : { type: 'site', code: view });
  },

  nextSite: () => {
    const v = get().view;
    const i = v === 'ALL' ? -1 : SITE_ORDER.indexOf(v);
    get().setView(SITE_ORDER[(i + 1) % SITE_ORDER.length]);
  },

  select: (selection, opts) => {
    if (!selection) return get().clearSelection();
    const site = selectionSite(selection);
    const s = get();
    const patch: Partial<State> = { selection, follow: false };
    const truck = relatedTruck(selection);
    if (truck) patch.activeTruck = truck;
    set(patch);
    if (site && s.view !== site) {
      set({ view: site });
      if (!truck) set({ activeTruck: defaultTruck(world, site) });
      get().camera({ type: 'locate' });
      return;
    }
    if (opts?.locate) get().camera({ type: 'locate' });
  },

  clearSelection: () => set({ selection: null, follow: false }),
  setHover: (hover) => set({ hover }),
  setQueueTab: (queueTab) => set({ queueTab }),
  toggleFollow: () => set((s) => ({ follow: !s.follow && !!s.selection })),
  stopFollow: () => set({ follow: false }),
  camera: (cmd) => set({ camCmd: { ...cmd, id: ++camId } }),

  retry: () => {
    const c = get().connection;
    if (c === 'error') {
      set({ connection: 'loading' });
      window.setTimeout(() => get().setConnection('live'), 700);
    } else if (c === 'offline') {
      set({ connection: 'live' });
    }
  },
}));

// Dev builds only: handles for headless checks (screenshots, draw-call counts).
if (import.meta.env.DEV) Object.assign(window, { __app: useApp, __world: world });

function selectionExists(sel: NonNullable<NonNullable<Selection>>) {
  switch (sel.kind) {
    case 'truck': {
      const t = world.trucks.get(sel.id);
      return !!t && t.phase !== 'departing';
    }
    case 'forklift':
      return world.forklifts.has(sel.id);
    case 'pallet':
      return world.pallets.has(sel.id);
    default:
      return true;
  }
}
