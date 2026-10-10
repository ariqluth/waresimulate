import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type { SiteDef } from '../data/types';
import { GATE_BARRIER_Z, PLOT_HX, PLOT_HZ, gatePoints } from '../data/sites';
import { useApp, world } from '../store';
import { truckPose } from '../sim/pose';
import { DEPOT_CONTAINER } from '../sim/planner';
import { Instanced, type InstanceItem } from './Instanced';
import { Box, GEO, MAT, PalletModel } from './models';
import { GeoBuildings, GeoGround, GeoLabels, GeoMain } from './GeoSite';
import { GEO_SITES } from '../data/geo';
import { corrugated, plate, repeated, roofLogo, roofRidges, siteSign, stripes } from './textures';

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

const M = {
  yard: std('#E6ECF8', { roughness: 0.95 }),
  grass: std('#D2EDE8', { roughness: 0.95 }),
  slot: std('#DCE4F3', { roughness: 0.95 }),
  stall: std('#F0C35A', { roughness: 0.7 }),
  fence: new THREE.MeshStandardMaterial({ color: '#CDD6EA', transparent: true, opacity: 0.45, roughness: 0.6, depthWrite: false }),
  rail: std('#AEB9CF'),
  trimBlue: std('#2553E3'),
  trimNavy: std('#1E3A8A'),
  trimGray: std('#9AA6BC'),
  trimOrange: std('#F07023'),
  opening: std('#2E3646'),
  roller: std('#DCE2EC'),
  rollerGray: std('#B9C2D3'),
  bumper: std('#262B35'),
  roofLight: std('#E3E9F4'),
  roofWhite: std('#F2F5FA'),
  hvac: std('#D4DCEA'),
  fan: std('#5C667A'),
  booth: std('#FFFFFF'),
  rackBlue: std('#2F5EEA'),
  rackOrange: std('#F08A2E'),
  container: std('#1FA7A1'),
  silo: std('#F3F5F9', { roughness: 0.5 }),
  pad: std('#DEFAE9', { roughness: 0.95 }),
  charger: std('#F7F9FC', { roughness: 0.5 }),
  screen: std('#1F2A44', { roughness: 0.3 }),
  led: std('#2ABF54', { emissive: '#2ABF54', emissiveIntensity: 0.8 }),
  hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
};

const Y = 0.3; // yard surface height
const SILO = new THREE.CylinderGeometry(3.2, 3.2, 15, 24);
let roofLogoMat: THREE.Material | null = null;
const ROOF_LOGO_MAT = () => (roofLogoMat ??= new THREE.MeshBasicMaterial({ map: roofLogo(), transparent: true }));

interface WallSpec {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  h: number;
  base: string;
  line: string;
}

/** Box building with corrugated walls; faces get their own repeat so ribs stay evenly spaced. */
function Walls({ x0, x1, z0, z1, h, base, line, roof }: WallSpec & { roof: THREE.Material }) {
  const mats = useMemo(() => {
    const tex = corrugated(base, line);
    const sx = new THREE.MeshStandardMaterial({ map: repeated(tex, (z1 - z0) / 1.2, 1), roughness: 0.8 });
    const sz = new THREE.MeshStandardMaterial({ map: repeated(tex, (x1 - x0) / 1.2, 1), roughness: 0.8 });
    return [sx, sx, roof, roof, sz, sz];
  }, [x0, x1, z0, z1, base, line, roof]);
  return (
    <mesh geometry={GEO.box} material={mats} position={[(x0 + x1) / 2, Y + h / 2, (z0 + z1) / 2]} scale={[x1 - x0, h, z1 - z0]} castShadow receiveShadow />
  );
}

function Trim({ x0, x1, z0, z1, h, mat }: { x0: number; x1: number; z0: number; z1: number; h: number; mat: THREE.Material }) {
  const t = 0.55;
  return (
    <group>
      {[[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([x, z], i) => (
        <Box key={i} s={[t, h + 0.1, t]} p={[x, Y + h / 2, z]} m={mat} />
      ))}
      <Box s={[x1 - x0 + t, 0.7, t]} p={[(x0 + x1) / 2, Y + h - 0.2, z1]} m={mat} />
      <Box s={[x1 - x0 + t, 0.7, t]} p={[(x0 + x1) / 2, Y + h - 0.2, z0]} m={mat} />
      <Box s={[t, 0.7, z1 - z0 + t]} p={[x0, Y + h - 0.2, (z0 + z1) / 2]} m={mat} />
      <Box s={[t, 0.7, z1 - z0 + t]} p={[x1, Y + h - 0.2, (z0 + z1) / 2]} m={mat} />
    </group>
  );
}

function GableRoof({ x0, x1, z0, z1, h, rise, mat }: { x0: number; x1: number; z0: number; z1: number; h: number; rise: number; mat: THREE.Material }) {
  const d = z1 - z0;
  const slope = Math.hypot(d / 2, rise);
  const ang = Math.atan2(rise, d / 2);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const w = x1 - x0 + 1.2;
  return (
    <group position={[cx, Y + h, cz]}>
      <mesh geometry={GEO.box} material={mat} scale={[w, 0.35, slope + 0.6]} position={[0, rise / 2, d / 4]} rotation={[ang, 0, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.box} material={mat} scale={[w, 0.35, slope + 0.6]} position={[0, rise / 2, -d / 4]} rotation={[-ang, 0, 0]} castShadow receiveShadow />
      <mesh position={[-(x1 - x0) / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <extrudeGeometry
          args={[
            new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, rise)]),
            { depth: x1 - x0, bevelEnabled: false },
          ]}
        />
        <meshStandardMaterial color="#3567E0" />
      </mesh>
    </group>
  );
}

function Door({ x, wallZ, faceZ, label, trim, roller, rollerDrop }: { x: number; wallZ: number; faceZ: number; label: string; trim: THREE.Material; roller: THREE.Material; rollerDrop: number }) {
  const plateMat = useMemo(() => new THREE.MeshBasicMaterial({ map: plate(label), transparent: true }), [label]);
  return (
    <group position={[x, Y, wallZ]}>
      <Box s={[3.8, 4.2, 0.3]} p={[0, 2.1, 0.02]} m={M.opening} cast={false} />
      <Box s={[3.8, rollerDrop, 0.34]} p={[0, 4.2 - rollerDrop / 2, 0.04]} m={roller} cast={false} />
      <group position={[0, 0, -0.9]}>
        <PalletModel look="cardboard" />
      </group>
      <Box s={[0.42, 4.7, 0.5]} p={[-2.1, 2.35, 0.1]} m={trim} />
      <Box s={[0.42, 4.7, 0.5]} p={[2.1, 2.35, 0.1]} m={trim} />
      <Box s={[4.62, 0.42, 0.5]} p={[0, 4.7, 0.1]} m={trim} />
      <Box s={[0.35, 0.6, 0.35]} p={[-1.55, 1.1, 0.35 + (faceZ - wallZ)]} m={M.bumper} cast={false} />
      <Box s={[0.35, 0.6, 0.35]} p={[1.55, 1.1, 0.35 + (faceZ - wallZ)]} m={M.bumper} cast={false} />
      <mesh geometry={GEO.plane} material={plateMat} scale={[1.7, 0.85, 1]} position={[0, 5.55, 0.36]} />
    </group>
  );
}

function SiteBuilding({ site }: { site: SiteDef }) {
  const b = site.building;
  const roofBlue = useMemo(() => new THREE.MeshStandardMaterial({ map: repeated(roofRidges('#3C78EE', '#3268DA'), 1, (b.z1 - b.z0) / 2.4), roughness: 0.7 }), [b.z0, b.z1]);
  const signMat = useMemo(() => new THREE.MeshBasicMaterial({ map: siteSign(site.code), transparent: true }), [site.code]);
  const signW = 13;
  // A long map-drawn hall gets its sign beside its own docks (not a bay on another building).
  const bayXs = site.bays.filter((bay) => !bay.lane).map((bay) => bay.door.x - site.center.x);
  const signX = site.style === 'geo' ? Math.max(...bayXs) + 13 : b.x1 - signW / 2 - 4;
  const signPos: [number, number, number] = [signX, Y + b.height - 3.4, b.z1 + 0.32];
  const sign = <mesh geometry={GEO.plane} material={signMat} scale={[signW, signW * (200 / 768), 1]} position={signPos} />;

  switch (site.style) {
    case 'depot': {
      const roofLogoMat = ROOF_LOGO_MAT();
      const wallsBlue = { base: '#3E74EA', line: '#2F62D6' };
      const shed2 = { x0: 14, x1: 52, z0: -42, z1: -18, height: 8 };
      return (
        <group>
          <Walls x0={b.x0} x1={b.x1} z0={b.z0} z1={b.z1} h={b.height} {...wallsBlue} roof={M.roofLight} />
          <GableRoof x0={b.x0} x1={b.x1} z0={b.z0} z1={b.z1} h={b.height} rise={5} mat={roofBlue} />
          <mesh geometry={GEO.plane} material={roofLogoMat} scale={[8, 8, 1]} position={[(b.x0 + b.x1) / 2, Y + b.height + 2.75, (b.z0 + b.z1) / 2 + 5]} rotation={[-Math.PI / 2 + Math.atan2(5, (b.z1 - b.z0) / 2), 0, 0]} />
          <Walls x0={shed2.x0} x1={shed2.x1} z0={shed2.z0} z1={shed2.z1} h={shed2.height} {...wallsBlue} roof={M.roofLight} />
          <GableRoof x0={shed2.x0} x1={shed2.x1} z0={shed2.z0} z1={shed2.z1} h={shed2.height} rise={3.6} mat={roofBlue} />
          <Racks x0={16} x1={50} z={-11} />
          <Box
            s={[DEPOT_CONTAINER.x1 - DEPOT_CONTAINER.x0, 2.6, DEPOT_CONTAINER.z1 - DEPOT_CONTAINER.z0]}
            p={[(DEPOT_CONTAINER.x0 + DEPOT_CONTAINER.x1) / 2, Y + 1.3, (DEPOT_CONTAINER.z0 + DEPOT_CONTAINER.z1) / 2]}
            m={M.container}
          />
          {sign}
        </group>
      );
    }
    case 'dc':
      return (
        <group>
          <Walls x0={b.x0} x1={b.x1} z0={b.z0} z1={b.z1} h={b.height} base="#EEF2FA" line="#D3DBEA" roof={M.roofLight} />
          <Trim x0={b.x0} x1={b.x1} z0={b.z0} z1={b.z1} h={b.height} mat={M.trimBlue} />
          <RoofUnits x0={b.x0} x1={b.x1} z0={b.z0} z1={b.z1} h={b.height} n={10} />
          {sign}
        </group>
      );
    case 'cold':
      return (
        <group>
          <Walls x0={b.x0} x1={b.x1} z0={b.z0} z1={b.z1} h={b.height} base="#F5F7FB" line="#E1E7F1" roof={M.roofWhite} />
          <Trim x0={b.x0} x1={b.x1} z0={b.z0} z1={b.z1} h={b.height} mat={M.trimNavy} />
          <RoofUnits x0={b.x0} x1={b.x1} z0={b.z0} z1={b.z1} h={b.height} n={18} />
          <Box s={[b.x1 - b.x0, 1.2, site.faceZ - b.z1]} p={[(b.x0 + b.x1) / 2, Y + 0.6, (b.z1 + site.faceZ) / 2]} m={M.roofLight} />
          <Box s={[b.x1 - b.x0, 0.14, 0.3]} p={[(b.x0 + b.x1) / 2, Y + 1.25, site.faceZ - 0.1]} m={M.stall} cast={false} />
          {[[46, -34], [53, -24]].map(([x, z], i) => (
            <group key={i} position={[x, Y, z]}>
              <mesh geometry={SILO} material={M.silo} position={[0, 7.5, 0]} castShadow receiveShadow />
              <mesh geometry={GEO.sphere} material={M.silo} scale={[3.2, 1.4, 3.2]} position={[0, 15, 0]} castShadow />
              <Box s={[6.5, 0.5, 6.5]} p={[0, 9, 0]} m={M.trimNavy} cast={false} />
            </group>
          ))}
          {sign}
        </group>
      );
    case 'geo':
      return (
        <group>
          <GeoMain site={site} />
          {sign}
        </group>
      );
    case 'crossdock':
      return (
        <group>
          <Walls x0={b.x0} x1={b.x1} z0={b.z0} z1={b.z1} h={b.height} base="#EEF2FA" line="#D3DBEA" roof={roofBlue} />
          <Trim x0={b.x0} x1={b.x1} z0={b.z0} z1={b.z1} h={b.height} mat={M.trimBlue} />
          <Box s={[b.x1 - b.x0 + 1.2, 0.5, b.z1 - b.z0 + 1.2]} p={[(b.x0 + b.x1) / 2, Y + b.height + 0.2, (b.z0 + b.z1) / 2]} m={roofBlue} />
          {sign}
        </group>
      );
    default:
      return (
        <group>
          <Walls x0={b.x0} x1={b.x1} z0={b.z0} z1={b.z1} h={b.height} base="#F2F4F9" line="#E2E7F0" roof={M.roofWhite} />
          <Trim x0={b.x0} x1={b.x1} z0={b.z0} z1={b.z1} h={b.height} mat={M.trimGray} />
          <RoofUnits x0={b.x0} x1={b.x1} z0={b.z0} z1={b.z1} h={b.height} n={14} />
          {sign}
        </group>
      );
  }
}

function RoofUnits({ x0, x1, z0, z1, h, n }: { x0: number; x1: number; z0: number; z1: number; h: number; n: number }) {
  const items = useMemo(() => {
    const out: InstanceItem[] = [];
    const cols = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      out.push({ p: [x0 + ((c + 0.5) / cols) * (x1 - x0), Y + h + 0.7, z0 + (z1 - z0) * (r ? 0.68 : 0.32)], s: [3.2, 1.4, 2.4] });
    }
    return out;
  }, [x0, x1, z0, z1, h, n]);
  const fans = useMemo(() => items.map((it) => ({ p: [it.p[0], it.p[1] + 0.72, it.p[2]] as [number, number, number], s: [1.6, 0.06, 1.6] as [number, number, number] })), [items]);
  const fanGeo = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 1, 16), []);
  return (
    <group>
      <Instanced geometry={GEO.box} material={M.hvac} items={items} cast />
      <Instanced geometry={fanGeo} material={M.fan} items={fans} />
    </group>
  );
}

function Racks({ x0, x1, z }: { x0: number; x1: number; z: number }) {
  const posts: InstanceItem[] = [];
  const beams: InstanceItem[] = [];
  const loads: [number, number][] = [];
  for (let x = x0; x <= x1; x += 3) {
    posts.push({ p: [x, Y + 3, z - 0.6], s: [0.15, 6, 0.15] }, { p: [x, Y + 3, z + 0.6], s: [0.15, 6, 0.15] });
  }
  for (const y of [0.3, 2.6, 4.9]) {
    beams.push({ p: [(x0 + x1) / 2, Y + y, z - 0.6], s: [x1 - x0, 0.18, 0.12] }, { p: [(x0 + x1) / 2, Y + y, z + 0.6], s: [x1 - x0, 0.18, 0.12] });
  }
  for (let x = x0 + 1.5; x < x1; x += 3) for (const y of [0.4, 2.7]) if ((x * 7 + y * 3) % 5 > 1) loads.push([x, y]);
  return (
    <group>
      <Instanced geometry={GEO.box} material={M.rackBlue} items={posts} cast />
      <Instanced geometry={GEO.box} material={M.rackOrange} items={beams} />
      {loads.map(([x, y], i) => (
        <group key={i} position={[x, Y + y, z]} scale={0.95}>
          <PalletModel look="cardboard" />
        </group>
      ))}
    </group>
  );
}

/** Barrier arm at a side entrance, local coordinates: post and the arm's far end. */
function entranceArm(site: SiteDef) {
  const e = site.entrance!;
  const px = e.gate.x - site.center.x;
  const pz = e.gate.z - site.center.z;
  return { px, pz, ex: px + Math.cos(e.gate.angle) * e.gate.len, ez: pz - Math.sin(e.gate.angle) * e.gate.len };
}

/** Fence round the plot (or, for a map-drawn site, round the whole compound), open at the gate. */
function Fence({ site }: { site: SiteDef }) {
  const base = GEO_SITES[site.code]?.base;
  const [x0, z0, x1, zb] = base ?? [-PLOT_HX, -PLOT_HZ, PLOT_HX, PLOT_HZ];
  let segs: [number, number, number, number][];
  if (site.entrance) {
    // Open where the entrance barrier crosses the compound's edge.
    const { px, pz, ex, ez } = entranceArm(site);
    const sides: [number, number, number, number][] = [
      [x0, z0, x1, z0],
      [x1, z0, x1, zb],
      [x0, zb, x1, zb],
      [x0, z0, x0, zb],
    ];
    const mx = (px + ex) / 2;
    const mz = (pz + ez) / 2;
    const dist = (s: number[]) => (s[0] === s[2] ? Math.abs(mx - s[0]) : Math.abs(mz - s[1]));
    const near = sides.reduce((a, b) => (dist(b) < dist(a) ? b : a));
    const alongX = near[1] === near[3];
    const [g0, g1] = alongX ? [Math.min(px, ex) - 1.5, Math.max(px, ex) + 1.5] : [Math.min(pz, ez) - 1.5, Math.max(pz, ez) + 1.5];
    segs = sides.filter((s) => s !== near);
    segs.push(
      alongX ? [near[0], near[1], g0, near[1]] : [near[0], near[1], near[0], g0],
      alongX ? [g1, near[1], near[2], near[1]] : [near[0], g1, near[0], near[3]],
    );
  } else {
    const gx0 = site.gateX - 7;
    const gx1 = site.gateX + 7;
    const z1 = PLOT_HZ; // the gate line
    segs = [
      [x0, z0, x1, z0],
      [x1, z0, x1, z1],
      [x0, z0, x0, z1],
      [x0, z1, gx0, z1],
      [gx1, z1, x1, z1],
    ];
  }
  const posts: InstanceItem[] = [];
  for (const [ax, az, bx, bz] of segs) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 6));
    for (let i = 0; i <= n; i++) posts.push({ p: [ax + ((bx - ax) * i) / n, Y + 1.2, az + ((bz - az) * i) / n], s: [0.16, 2.4, 0.16] });
  }
  return (
    <group>
      {segs.map(([ax, az, bx, bz], i) => {
        const len = Math.hypot(bx - ax, bz - az);
        const horiz = az === bz;
        return (
          <group key={i}>
            <mesh geometry={GEO.box} material={M.fence} position={[(ax + bx) / 2, Y + 1.1, (az + bz) / 2]} scale={horiz ? [len, 2.2, 0.06] : [0.06, 2.2, len]} />
            <Box s={horiz ? [len, 0.12, 0.12] : [0.12, 0.12, len]} p={[(ax + bx) / 2, Y + 2.3, (az + bz) / 2]} m={M.rail} cast={false} />
            <mesh
              geometry={GEO.plane}
              material={M.grass}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[(ax + bx) / 2 + (horiz ? 0 : ax > 0 ? -1.4 : 1.4), Y + 0.01, (az + bz) / 2 + (horiz ? (az > 0 ? -1.4 : 1.4) : 0)]}
              scale={horiz ? [len, 2.8, 1] : [2.8, len, 1]}
            />
          </group>
        );
      })}
      <Instanced geometry={GEO.box} material={M.rail} items={posts} cast />
    </group>
  );
}

/** Barrier at a side entrance (WH-06: by the security post); lifts for any truck of the site nearby. */
function EntranceGate({ site }: { site: SiteDef }) {
  const arm = useRef<THREE.Group>(null);
  const armMat = useMemo(() => new THREE.MeshStandardMaterial({ map: stripes('#E5484D', '#FFFFFF'), roughness: 0.6 }), []);
  const e = site.entrance!;
  const { px, pz, ex, ez } = entranceArm(site);
  const mx = site.center.x + (px + ex) / 2;
  const mz = site.center.z + (pz + ez) / 2;
  useFrame((_, delta) => {
    if (!arm.current) return;
    let open = false;
    for (const t of world.trucks.values()) {
      if (t.site !== site.code || !t.path) continue;
      const p = truckPose(t, world.time);
      if (Math.hypot(p.x - mx, p.z - mz) < 16) open = true;
    }
    const target = open ? Math.PI / 2.2 : 0;
    arm.current.rotation.z += (target - arm.current.rotation.z) * Math.min(1, delta * 4);
  });
  return (
    <group position={[px, Y, pz]} rotation={[0, e.gate.angle, 0]}>
      <Box s={[0.5, 1.3, 0.5]} p={[0, 0.65, 0]} m={M.rail} />
      <group ref={arm} position={[0, 1.15, 0]}>
        <mesh geometry={GEO.box} material={armMat} scale={[e.gate.len, 0.22, 0.22]} position={[e.gate.len / 2, 0, 0]} castShadow />
      </group>
    </group>
  );
}

function Gate({ site }: { site: SiteDef }) {
  const arm = useRef<THREE.Group>(null);
  const armMat = useMemo(() => new THREE.MeshStandardMaterial({ map: stripes('#E5484D', '#FFFFFF'), roughness: 0.6 }), []);
  const g = gatePoints(site);
  const lx = site.gateX;
  useFrame((_, delta) => {
    if (!arm.current) return;
    let open = false;
    for (const t of world.trucks.values()) {
      if (t.site !== site.code || (t.phase !== 'docking' && t.phase !== 'departing')) continue;
      const p = truckPose(t, world.time);
      if (Math.hypot(p.x - g.barrier.x, p.z - g.barrier.z) < 18) open = true;
    }
    const target = open ? Math.PI / 2.2 : 0;
    arm.current.rotation.z += (target - arm.current.rotation.z) * Math.min(1, delta * 4);
  });
  return (
    <group position={[lx + 7.2, Y, GATE_BARRIER_Z]}>
      <Box s={[0.5, 1.3, 0.5]} p={[0, 0.65, 0]} m={M.rail} />
      <group ref={arm} position={[0, 1.15, 0]}>
        <mesh geometry={GEO.box} material={armMat} scale={[13.6, 0.22, 0.22]} position={[-6.8, 0, 0]} castShadow />
      </group>
      <group position={[2.6, 0, -2.8]}>
        <Box s={[2.6, 2.6, 2.4]} p={[0, 1.3, 0]} m={M.booth} />
        <Box s={[3.0, 0.3, 2.8]} p={[0, 2.75, 0]} m={M.trimBlue} />
        <Box s={[2.62, 0.9, 1.6]} p={[0, 1.7, 0]} m={MAT.glass} cast={false} />
      </group>
    </group>
  );
}

function Bays({ site }: { site: SiteDef }) {
  const select = useApp((s) => s.select);
  const setHover = useApp((s) => s.setHover);
  const b = site.building;
  const trim = site.style === 'automated' ? M.trimGray : site.style === 'cold' ? M.trimNavy : site.style === 'geo' ? M.trimOrange : M.trimBlue;
  const roller = site.style === 'automated' ? M.rollerGray : M.roller;
  const drop = site.style === 'automated' ? 2.6 : 1.4;
  const stalls: InstanceItem[] = [];
  for (const bay of site.bays) {
    const x = bay.door.x - site.center.x;
    const f = bay.door.z - site.center.z;
    stalls.push({ p: [x - 2.25, Y + 0.02, f + 9.5], s: [0.2, 1, 18] }, { p: [x + 2.25, Y + 0.02, f + 9.5], s: [0.2, 1, 18] }, { p: [x, Y + 0.02, f + 18.5], s: [4.7, 1, 0.2] });
  }
  const plane = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
  const label = (name: string) => (site.style === 'dc' ? name.replace('Bay ', 'D') : name);
  return (
    <group>
      <Instanced geometry={plane} material={M.stall} items={stalls} />
      {site.bays.map((bay) => {
        const x = bay.door.x - site.center.x;
        const face = bay.door.z - site.center.z;
        // A bay on another wall than the main facade has its door right on that wall.
        const own = Math.abs(face - site.faceZ) > 0.01;
        return (
          <group key={bay.id}>
            <Door x={x} wallZ={own ? face : b.z1} faceZ={face} label={label(bay.name)} trim={trim} roller={roller} rollerDrop={drop} />
            {/* Forklift door beside the bay, where pallets are put away into the building. */}
            {bay.sideDoor !== false && (
              <group position={[x + 6.5, Y, b.z1]}>
                <Box s={[2.6, 3.2, 0.3]} p={[0, 1.6, 0.02]} m={M.opening} cast={false} />
                <Box s={[2.6, 0.9, 0.34]} p={[0, 2.75, 0.04]} m={roller} cast={false} />
                <Box s={[3.0, 0.25, 0.4]} p={[0, 3.32, 0.08]} m={trim} />
              </group>
            )}
            <mesh
              geometry={GEO.box}
              material={M.hit}
              position={[x, Y + 0.3, face + 9.5]}
              scale={[4.4, 0.6, 18]}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                if (e.delta > 5) return;
                e.stopPropagation();
                select({ kind: 'bay', id: bay.id });
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHover({ kind: 'bay', id: bay.id });
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHover(null);
                document.body.style.cursor = '';
              }}
            />
          </group>
        );
      })}
    </group>
  );
}

function Chargers({ site }: { site: SiteDef }) {
  const select = useApp((s) => s.select);
  const setHover = useApp((s) => s.setHover);
  const xs = site.chargers.map((c) => c.pos.x - site.center.x);
  const zs = site.chargers.map((c) => c.pos.z - site.center.z);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = Math.max(...zs) - 2.4;
  return (
    <group>
      <mesh geometry={GEO.box} material={M.pad} position={[cx, Y + 0.02, cz]} scale={[Math.max(...xs) - Math.min(...xs) + 5.5, 0.04, 8]} receiveShadow />
      {site.chargers.map((c) => (
        <group
          key={c.id}
          position={[c.pos.x - site.center.x, Y, c.pos.z - site.center.z]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            if (e.delta > 5) return;
            e.stopPropagation();
            select({ kind: 'charger', id: c.id });
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover({ kind: 'charger', id: c.id });
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHover(null);
            document.body.style.cursor = '';
          }}
        >
          <Box s={[1.0, 1.8, 0.7]} p={[0, 0.9, 0]} m={M.charger} />
          <Box s={[0.62, 0.42, 0.06]} p={[0, 1.25, -0.37]} m={M.screen} cast={false} />
          <Box s={[0.14, 0.14, 0.06]} p={[0.3, 0.7, -0.37]} m={M.led} cast={false} />
        </group>
      ))}
    </group>
  );
}

function StagingSlots({ site }: { site: SiteDef }) {
  const items = useMemo<InstanceItem[]>(
    () => site.staging.map((p) => ({ p: [p.x - site.center.x, Y + 0.015, p.z - site.center.z], s: [2.0, 1, 1.8] })),
    [site],
  );
  const plane = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
  return <Instanced geometry={plane} material={M.slot} items={items} />;
}

export function SiteModel({ site }: { site: SiteDef }) {
  const setView = useApp((s) => s.setView);
  const clearSelection = useApp((s) => s.clearSelection);
  const onBuilding = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 5) return;
    e.stopPropagation();
    const s = useApp.getState();
    if (s.view !== site.code) setView(site.code);
    else clearSelection();
  };
  return (
    <group position={[site.center.x, 0, site.center.z]}>
      {site.style === 'geo' ? (
        <>
          <GeoGround site={site} />
          <GeoLabels site={site} />
        </>
      ) : (
        <mesh geometry={GEO.box} material={M.yard} position={[0, 0, 0]} scale={[PLOT_HX * 2, 0.6, PLOT_HZ * 2]} receiveShadow />
      )}
      <group onClick={onBuilding}>
        <SiteBuilding site={site} />
        {site.style === 'geo' && <GeoBuildings site={site} />}
      </group>
      <Fence site={site} />
      {site.entrance ? <EntranceGate site={site} /> : <Gate site={site} />}
      <Bays site={site} />
      <Chargers site={site} />
      <StagingSlots site={site} />
    </group>
  );
}
