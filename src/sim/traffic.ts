// Vehicle following: trucks advance along their paths by speed, and slow or stop when their body a
// little further along the path would overlap another vehicle. Used for road traffic, gate queues
// and trucks leaving a site; yard manoeuvres are serialised by the engine's yard lock instead.
import type { PathData } from '../data/types';
import { samplePath } from './path';

export const TRUCK_HL = 8.3; // half length
export const TRUCK_HW = 1.3; // half width

/** Oriented box: centre, unit forward vector, half sizes. */
export interface Box {
  cx: number;
  cz: number;
  fx: number;
  fz: number;
  hl: number;
  hw: number;
}

export function boxAt(x: number, z: number, angle: number, hl = TRUCK_HL, hw = TRUCK_HW): Box {
  // A model with rotation.y = angle faces (cos a, -sin a).
  return { cx: x, cz: z, fx: Math.cos(angle), fz: -Math.sin(angle), hl, hw };
}

export function boxOnPath(path: PathData, s: number, hl = TRUCK_HL, hw = TRUCK_HW): Box {
  const p = samplePath(path, s);
  return boxAt(p.x, p.z, p.angle, hl, hw);
}

/** Separating-axis test for two oriented boxes. */
export function boxesOverlap(a: Box, b: Box): boolean {
  const dx = b.cx - a.cx;
  const dz = b.cz - a.cz;
  const axes = [
    [a.fx, a.fz],
    [-a.fz, a.fx],
    [b.fx, b.fz],
    [-b.fz, b.fx],
  ];
  for (const [ax, az] of axes) {
    const ra = Math.abs(a.fx * ax + a.fz * az) * a.hl + Math.abs(-a.fz * ax + a.fx * az) * a.hw;
    const rb = Math.abs(b.fx * ax + b.fz * az) * b.hl + Math.abs(-b.fz * ax + b.fx * az) * b.hw;
    if (Math.abs(dx * ax + dz * az) > ra + rb) return false;
  }
  return true;
}

export interface Mover {
  id: string;
  path: PathData;
  s: number;
  v: number; // metres per simulated minute
  vmax: number;
  blockedBy?: string;
  /** Vehicle to drive past this step to break a circular wait (gridlock). */
  ignore?: string;
  /** Hold line: do not pass this distance along the path (e.g. before an occupied gate). */
  stopAt?: number;
}

export interface Obstacle {
  id: string;
  box: Box;
  blockedBy?: string;
}

const LOOK = 34; // metres of path checked ahead
const CROSS_LOOK = 18; // vehicles crossing our path only matter when they are this close
const STEP = 2;
const ACC = 140; // m/min²
const END_DEC = 220; // braking toward the end of the path
const FOLLOW_GAIN = 3.2; // speed per metre of free road ahead
const SAFE_L = 2.2; // extra length kept clear in front/behind
const SAFE_W = 0.35;

/**
 * Move `m` forward by up to `m.v · dt`. The truck's body is swept along its own path; the first
 * position that would touch a vehicle ahead limits the speed, so trucks queue instead of overlapping.
 */
export function driveMover(m: Mover, obstacles: Obstacle[], dt: number) {
  const L = m.path.length;
  const here = boxOnPath(m.path, m.s);
  const hereSafe = boxOnPath(m.path, m.s, TRUCK_HL + SAFE_L, TRUCK_HW + SAFE_W);
  const near: { o: Obstacle; reach: number; minD: number }[] = [];
  for (const o of obstacles) {
    if (o.id === m.id) continue;
    const dx = o.box.cx - here.cx;
    const dz = o.box.cz - here.cz;
    if (dx * dx + dz * dz > (LOOK + 22) ** 2) continue;
    const along = dx * here.fx + dz * here.fz;
    const lateral = Math.abs(-here.fz * dx + here.fx * dz);
    // Same lane: a curve can put the truck ahead slightly "behind" our heading. Still follow it.
    const sameLane = Math.abs(here.fx * o.box.fx + here.fz * o.box.fz) > 0.65 && lateral < TRUCK_HW * 2 + 1.5;
    if (o.id === m.ignore && !sameLane) continue; // a crossing deadlock: this one is allowed through
    if (along < -2 * TRUCK_HL) continue; // well behind us: it is following, not in our way
    if (o.blockedBy === m.id) {
      // Mutual wait. If exactly one of us is in front of the other (along the other's heading), that
      // one goes, so they move apart. Crossing or head-on pairs fall back to the lower id.
      const weAreInFront = -(dx * o.box.fx + dz * o.box.fz) > 1;
      const itIsInFront = along > 1;
      const weGo = weAreInFront !== itIsInFront ? weAreInFront : m.id < o.id;
      if (weGo) continue;
    }
    // Same-direction traffic is followed from afar; crossing traffic only once it is close.
    const crossing = Math.abs(here.fx * o.box.fx + here.fz * o.box.fz) < 0.5;
    // A vehicle alongside or slightly behind only blocks where we are about to move (merging).
    // If we already touch it, driving on separates us, so it does not hold us back.
    if (along <= 0 && !sameLane && boxesOverlap(hereSafe, o.box)) continue;
    near.push({ o, reach: crossing ? CROSS_LOOK : LOOK, minD: along > 0 ? 0 : STEP });
  }
  let free = LOOK;
  let blocker: string | undefined;
  if (near.length) {
    outer: for (let d = 0; d <= LOOK; d += STEP) {
      const s = Math.min(L, m.s + d);
      const b = boxOnPath(m.path, s, TRUCK_HL + SAFE_L, TRUCK_HW + SAFE_W);
      for (const { o, reach, minD } of near) {
        if (d >= minD && d <= reach && boxesOverlap(b, o.box)) {
          free = Math.max(0, d - STEP);
          blocker = o.id;
          break outer;
        }
      }
      if (s >= L) break;
    }
  }
  const end = Math.min(L, m.stopAt ?? L);
  const remaining = Math.max(0, end - m.s);
  if (remaining <= 0.05 && free > 0) {
    // Close enough: settle exactly on the end point (gate, hold line or map edge).
    m.s = Math.max(m.s, end);
    m.v = 0;
    m.blockedBy = undefined;
    return;
  }
  const target = Math.min(m.vmax, Math.sqrt(2 * END_DEC * remaining) + 4, free * FOLLOW_GAIN);
  m.v = target < m.v ? target : Math.min(target, m.v + ACC * dt);
  m.s = Math.min(Math.max(m.s, end), m.s + m.v * dt);
  m.blockedBy = blocker !== undefined && m.v < 1 ? blocker : undefined;
}

/**
 * Find circular waits (A waits for B … waits for A) and pick, in each, the vehicle with the lowest
 * id to drive past its blocker. Returns vehicle id → blocker id to ignore.
 */
export function gridlockBreaks(waits: Map<string, string>): Map<string, string> {
  const out = new Map<string, string>();
  const done = new Set<string>();
  for (const start of waits.keys()) {
    if (done.has(start)) continue;
    const seen: string[] = [];
    let cur: string | undefined = start;
    while (cur !== undefined && !seen.includes(cur) && !done.has(cur)) {
      seen.push(cur);
      cur = waits.get(cur);
    }
    if (cur !== undefined && seen.includes(cur)) {
      const cycle = seen.slice(seen.indexOf(cur));
      const first = cycle.reduce((a, b) => (a < b ? a : b));
      out.set(first, waits.get(first)!);
    }
    seen.forEach((id) => done.add(id));
  }
  return out;
}
