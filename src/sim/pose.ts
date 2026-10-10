import type { Forklift, Selection, Truck, Vec2 } from '../data/types';
import { BAY_BY_ID, CHARGER_BY_ID, SITE_BY_CODE, bayParkPoint, gatePoints } from '../data/sites';
import { samplePath } from './path';
import { ROAD_SPEED, forkliftWorkPose, pointOnRoute, smooth, type World } from './engine';
import { hash01 } from './rng';

export interface Pose {
  x: number;
  z: number;
  angle: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export interface TruckPose extends Pose {
  speedKmh: number;
  distLeft: number;
  progress: number; // 0..1 along the current movement
  reversing: boolean;
}

export function truckPose(t: Truck, time: number): TruckPose {
  const jitter = (Math.sin(time * 3.1 + hash01(t.code) * 10) + 1) * 0.6;
  if (t.phase === 'working' && t.bay) {
    const p = bayParkPoint(BAY_BY_ID[t.bay]);
    return { x: p.x, z: p.z, angle: -Math.PI / 2, speedKmh: 0, distLeft: 0, progress: 1, reversing: false };
  }
  if (!t.path) {
    const g = gatePoints(SITE_BY_CODE[t.site]).stop;
    return { x: g.x, z: g.z, angle: Math.PI / 2, speedKmh: 0, distLeft: 0, progress: 0, reversing: false };
  }
  const L = t.path.length;
  const s = Math.min(L, t.s);
  const p = samplePath(t.path, s);
  const progress = clamp01(s / Math.max(0.001, L));
  if (t.phase === 'atgate') return { ...p, speedKmh: 0, distLeft: 0, progress: 0, reversing: false };
  if (t.phase === 'docking') {
    const reversing = t.reverseFrom !== undefined && s >= t.reverseFrom;
    const speed = s >= L ? 0 : reversing ? 4 + jitter : 15 + jitter;
    return { x: p.x, z: p.z, angle: reversing ? p.angle + Math.PI : p.angle, speedKmh: speed, distLeft: L - s, progress, reversing };
  }
  // En route or departing: displayed speed scales with the truck's actual speed (it slows in queues).
  const speedKmh = t.v < 0.5 ? 0 : (t.cruiseKmh + jitter) * Math.min(1, t.v / ROAD_SPEED);
  return { ...p, speedKmh, distLeft: L - s, progress, reversing: false };
}

export interface ForkliftPose extends Pose {
  carrying: boolean;
  moving: boolean;
}

export function forkliftPose(w: World, f: Forklift, time: number): ForkliftPose {
  const work = forkliftWorkPose(w, f, time);
  if (work) return work;
  if (f.travel && time < f.travel.end) {
    const u = clamp01((time - f.travel.start) / Math.max(0.001, f.travel.end - f.travel.start));
    const p = pointOnRoute(f.travel.route, smooth(u));
    // Turn toward the final heading over the last few metres of the trip.
    if (f.travel.endAngle !== undefined && u > 0.9) {
      const k = (u - 0.9) / 0.1;
      let d = f.travel.endAngle - p.angle;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      return { ...p, angle: p.angle + d * k, carrying: false, moving: true };
    }
    return { ...p, carrying: false, moving: true };
  }
  return { x: f.pos.x, z: f.pos.z, angle: f.heading, carrying: false, moving: false };
}

/** World position of a selectable object, for locate / follow. */
export function selectionPosition(w: World, sel: Selection, time: number): Vec2 | null {
  if (!sel) return null;
  switch (sel.kind) {
    case 'truck': {
      const t = w.trucks.get(sel.id);
      return t ? truckPose(t, time) : null;
    }
    case 'forklift': {
      const f = w.forklifts.get(sel.id);
      return f ? forkliftPose(w, f, time) : null;
    }
    case 'pallet': {
      const p = w.pallets.get(sel.id);
      if (!p) return null;
      if (p.slot !== undefined) return SITE_BY_CODE[p.site].staging[p.slot];
      const f = p.forklift ? w.forklifts.get(p.forklift) : undefined;
      return f ? forkliftPose(w, f, time) : null;
    }
    case 'bay': {
      const b = BAY_BY_ID[sel.id];
      return b ? { x: b.door.x, z: b.door.z + 8 } : null;
    }
    case 'charger': {
      const c = CHARGER_BY_ID[sel.id];
      return c ? c.pos : null;
    }
  }
}
