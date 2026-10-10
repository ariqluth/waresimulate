import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Selection, Vec2 } from '../data/types';
import { BAY_BY_ID, CHARGER_BY_ID, SITE_BY_CODE, bayParkPoint } from '../data/sites';
import { SKUS } from '../data/seed';
import { useApp, world, type Hover } from '../store';
import { forkliftPose, truckPose } from '../sim/pose';
import { bayStatus, truckStatus } from '../sim/derived';
import { skuKeyFor } from '../sim/engine';
import { dockingPath, samplePath } from '../sim/path';
import { Pin } from './models';
import { chevron, radialGlow } from './textures';

type Target = NonNullable<Selection> | NonNullable<Hover>;

interface Frame {
  x: number;
  z: number;
  angle: number;
  size: [number, number, number]; // length (local x), height, width (local z)
  cy: number; // centre height offset
}

/** Position, heading and box size of a selectable object at the current sim time. */
function frameOf(t: Target): Frame | null {
  switch (t.kind) {
    case 'truck': {
      const tr = world.trucks.get(t.id);
      if (!tr) return null;
      const p = truckPose(tr, world.time);
      return { x: p.x, z: p.z, angle: p.angle, size: [17.4, 4.6, 3.3], cy: 0 };
    }
    case 'forklift': {
      const f = world.forklifts.get(t.id);
      if (!f) return null;
      const p = forkliftPose(world, f, world.time);
      return { x: p.x, z: p.z, angle: p.angle, size: [3.6, 3.0, 2.0], cy: 0.3 };
    }
    case 'pallet': {
      const p = world.pallets.get(t.id);
      if (!p) return null;
      if (p.slot !== undefined) {
        const s = SITE_BY_CODE[p.site].staging[p.slot];
        return { x: s.x, z: s.z, angle: 0, size: [2.2, 1.9, 1.9], cy: 0.3 };
      }
      const f = p.forklift ? world.forklifts.get(p.forklift) : undefined;
      if (!f) return null;
      const fp = forkliftPose(world, f, world.time);
      return { x: fp.x, z: fp.z, angle: fp.angle, size: [3.6, 3.0, 2.0], cy: 0.3 };
    }
    case 'bay': {
      const b = BAY_BY_ID[t.id];
      return { x: b.door.x, z: b.door.z + 9.5, angle: Math.PI / 2, size: [18.4, 1.2, 4.8], cy: 0.3 };
    }
    case 'charger': {
      const c = CHARGER_BY_ID[t.id];
      return { x: c.pos.x, z: c.pos.z, angle: 0, size: [1.6, 2.4, 1.4], cy: 0.3 };
    }
  }
}

function labelText(t: Target): [string, string] {
  switch (t.kind) {
    case 'truck': {
      const tr = world.trucks.get(t.id);
      return [t.id, tr ? truckStatus(tr) : ''];
    }
    case 'forklift':
      return [t.id, world.forklifts.get(t.id)?.status ?? ''];
    case 'pallet': {
      const p = world.pallets.get(t.id);
      return [t.id, p ? SKUS[skuKeyFor(p.sku)].name : ''];
    }
    case 'bay':
      return [BAY_BY_ID[t.id].name, bayStatus(world, t.id).status];
    case 'charger':
      return [CHARGER_BY_ID[t.id].code, world.chargers.get(t.id)?.charging ? 'Charging' : 'Free'];
  }
}

const bracketMat = new THREE.MeshBasicMaterial({ color: '#3D6FF2', transparent: true, opacity: 0.95 });
const BOX = new THREE.BoxGeometry(1, 1, 1);

/** Eight 3D corner brackets around a unit box; scaled per object. */
function Brackets({ size }: { size: [number, number, number] }) {
  const [L, H, W] = size;
  const arm = Math.min(L, W, H) * 0.32 + 0.4;
  const th = 0.09;
  const parts: { p: [number, number, number]; s: [number, number, number] }[] = [];
  for (const sx of [-1, 1])
    for (const sy of [0, 1])
      for (const sz of [-1, 1]) {
        const x = (sx * L) / 2;
        const y = sy * H;
        const z = (sz * W) / 2;
        parts.push({ p: [x - (sx * arm) / 2, y, z], s: [arm, th, th] });
        parts.push({ p: [x, y, z - (sz * arm) / 2], s: [th, th, arm] });
        parts.push({ p: [x, y + (sy ? -arm / 2 : arm / 2), z], s: [th, arm, th] });
      }
  return (
    <group>
      {parts.map((b, i) => (
        <mesh key={i} geometry={BOX} material={bracketMat} position={b.p} scale={b.s} />
      ))}
    </group>
  );
}

const glowMat = new THREE.MeshBasicMaterial({ map: radialGlow('rgba(70,120,245,0.55)'), transparent: true, depthWrite: false });
const PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

function Pill({ title, sub, light }: { title: string; sub: string; light?: boolean }) {
  return (
    <div className={`map-pill ${light ? 'map-pill--light' : ''}`}>
      <b>{title}</b>
      {sub && <span>{sub}</span>}
    </div>
  );
}

function SelectionMarker({ sel }: { sel: NonNullable<Selection> }) {
  const group = useRef<THREE.Group>(null);
  const label = useRef<THREE.Group>(null);
  useApp((s) => s.tick);
  const f0 = frameOf(sel);
  useFrame(() => {
    const f = frameOf(sel);
    if (!f || !group.current || !label.current) return;
    group.current.position.set(f.x, f.cy, f.z);
    group.current.rotation.y = f.angle;
    label.current.position.set(f.x, f.cy + f.size[1] + 1.6, f.z);
  });
  if (!f0) return null;
  const [title, sub] = labelText(sel);
  return (
    <group>
      <group ref={group}>
        <group position={[0, 0.05, 0]}>
          <Brackets size={f0.size} />
        </group>
        <mesh geometry={PLANE} material={glowMat} position={[0, 0.06, 0]} scale={[f0.size[0] * 1.7, 1, f0.size[2] * 3.2]} />
      </group>
      <group ref={label}>
        <Html center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
          <Pill title={title} sub={sub} />
        </Html>
      </group>
    </group>
  );
}

function HoverLabel({ hover }: { hover: NonNullable<Hover> }) {
  const label = useRef<THREE.Group>(null);
  useFrame(() => {
    const f = frameOf(hover);
    if (f && label.current) label.current.position.set(f.x, f.cy + f.size[1] + 1.4, f.z);
  });
  const [title, sub] = labelText(hover);
  return (
    <group ref={label}>
      <Html center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
        <Pill title={title} sub={sub} light />
      </Html>
    </group>
  );
}

// ---- route for a selected truck heading to its bay ------------------------------------------

const routeMat = new THREE.MeshBasicMaterial({ color: '#2B60E8', transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
const chevMat = new THREE.MeshBasicMaterial({ map: chevron(), transparent: true, depthWrite: false });
const dotMat = new THREE.MeshBasicMaterial({ color: '#2B60E8' });
const DOT = new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2);

function ribbon(points: Vec2[], width: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l = Math.hypot(dx, dz) || 1;
    const nx = (-dz / l) * (width / 2);
    const nz = (dx / l) * (width / 2);
    pos.push(points[i].x + nx, 0, points[i].z + nz, points[i].x - nx, 0, points[i].z - nz);
    if (i > 0) {
      const k = i * 2;
      idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function RouteLine({ truckCode }: { truckCode: string }) {
  useApp((s) => s.tick);
  const t = world.trucks.get(truckCode);
  const plan = useMemo(() => {
    if (!t || !t.bay || (t.phase !== 'enroute' && t.phase !== 'atgate' && t.phase !== 'docking')) return null;
    const pose = truckPose(t, world.time);
    const site = SITE_BY_CODE[t.site];
    const dock = t.phase === 'docking' && t.path ? { path: t.path, reverseFrom: t.reverseFrom ?? t.path.length } : dockingPath(site, BAY_BY_ID[t.bay]);
    const pts: Vec2[] = [];
    const dots: Vec2[] = [];
    const sample = (path: typeof dock.path, from: number, to: number, out: Vec2[], step: number) => {
      for (let s = from; s < to; s += step) out.push(samplePath(path, s));
      out.push(samplePath(path, to));
    };
    if (t.phase === 'enroute' && t.path) {
      const s0 = t.path.length - pose.distLeft;
      sample(t.path, Math.max(s0, t.path.length - 220), t.path.length, pts, 2);
    }
    const startOnDock = t.phase === 'docking' ? dock.path.length - pose.distLeft : 0;
    if (startOnDock < dock.reverseFrom) sample(dock.path, startOnDock, dock.reverseFrom, pts, 2);
    for (let s = Math.max(startOnDock, dock.reverseFrom); s < dock.path.length; s += 2.6) dots.push(samplePath(dock.path, s));
    const chevrons: { x: number; z: number; angle: number }[] = [];
    for (let i = 4; i < pts.length - 2; i += 5) {
      const a = pts[i];
      const b = pts[i + 1];
      chevrons.push({ x: a.x, z: a.z, angle: Math.atan2(-(b.z - a.z), b.x - a.x) });
    }
    return { geo: pts.length > 1 ? ribbon(pts, 2.4) : null, dots, chevrons, end: bayParkPoint(BAY_BY_ID[t.bay]) };
  }, [t, t?.phase, Math.floor(world.time * 4)]);
  if (!plan) return null;
  return (
    <group position={[0, 0.34, 0]}>
      {plan.geo && <mesh geometry={plan.geo} material={routeMat} />}
      {plan.chevrons.map((c, i) => (
        <mesh key={i} geometry={PLANE} material={chevMat} position={[c.x, 0.02, c.z]} rotation={[0, c.angle, 0]} scale={[1.6, 1, 1.6]} />
      ))}
      {plan.dots.map((d, i) => (
        <mesh key={`d${i}`} geometry={DOT} material={dotMat} position={[d.x, 0.02, d.z]} />
      ))}
      <group position={[plan.end.x, 0, plan.end.z]}>
        <mesh geometry={DOT} material={dotMat} scale={2.4} />
        <Pin height={4.6} scale={1.2} />
      </group>
    </group>
  );
}

export function Markers() {
  const selection = useApp((s) => s.selection);
  const hover = useApp((s) => s.hover);
  const showHover = hover && !(selection && selection.kind === hover.kind && selection.id === hover.id);
  return (
    <group>
      {selection && <SelectionMarker key={`${selection.kind}:${selection.id}`} sel={selection} />}
      {selection?.kind === 'truck' && <RouteLine truckCode={selection.id} />}
      {showHover && <HoverLabel key={`${hover.kind}:${hover.id}`} hover={hover} />}
    </group>
  );
}
