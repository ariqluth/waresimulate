import { useMemo } from 'react';
import * as THREE from 'three';
import { ROAD_WIDTH, SITES, X_EDGE, X_ROADS, Z_EDGE, Z_ROADS } from '../data/sites';
import type { CarrierId } from '../data/types';
import { Rng } from '../sim/rng';
import { Instanced, type InstanceItem } from './Instanced';
import { GEO, TruckModel } from './models';
import { windows } from './textures';

const COLORS = {
  ground: '#EEF2FA',
  road: '#C9D6F3',
  sidewalk: '#F6F8FD',
  lawn: '#D7EFE6',
  lot: '#E2E9F6',
  marking: '#FFFFFF',
  stall: '#F0C35A',
};

const flat = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
// Pushed back in depth so a truck on the road is not hidden by the road plane.
const roadMat = () => new THREE.MeshStandardMaterial({ color: COLORS.road, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
const MATS = {
  ground: flat(COLORS.ground),
  road: roadMat(),
  sidewalk: flat(COLORS.sidewalk),
  lawn: flat(COLORS.lawn),
  lot: flat(COLORS.lot),
  marking: new THREE.MeshStandardMaterial({ color: COLORS.marking, roughness: 0.6 }),
  stall: new THREE.MeshStandardMaterial({ color: COLORS.stall, roughness: 0.7 }),
  trunk: new THREE.MeshStandardMaterial({ color: '#9A7A5A', roughness: 0.9 }),
  canopy: new THREE.MeshStandardMaterial({ color: '#7FD8A0', roughness: 0.8, flatShading: true }),
  roofTop: new THREE.MeshStandardMaterial({ color: '#E6EBF5', roughness: 0.9 }),
  roofUnit: new THREE.MeshStandardMaterial({ color: '#D5DDEB', roughness: 0.8 }),
};

const PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const TRUNK = new THREE.CylinderGeometry(0.22, 0.3, 2.4, 6).translate(0, 1.2, 0);
const CANOPY = new THREE.IcosahedronGeometry(1.9, 1).translate(0, 3.9, 0);

interface Block {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  cx: number;
  cz: number;
}

function blocks(): Block[] {
  const xs = [-X_EDGE, ...X_ROADS, X_EDGE];
  const zs = [-Z_EDGE, ...Z_ROADS, Z_EDGE];
  const out: Block[] = [];
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = 0; j < zs.length - 1; j++) {
      const h = ROAD_WIDTH / 2;
      const x0 = xs[i] + (i === 0 ? 0 : h);
      const x1 = xs[i + 1] - (i === xs.length - 2 ? 0 : h);
      const z0 = zs[j] + (j === 0 ? 0 : h);
      const z1 = zs[j + 1] - (j === zs.length - 2 ? 0 : h);
      out.push({ x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 });
    }
  return out;
}

const siteAt = (b: Block) => SITES.find((s) => Math.abs(s.center.x - b.cx) < 1 && Math.abs(s.center.z - b.cz) < 1);
const isSite = (b: Block) => {
  const s = siteAt(b);
  return !!s && s.style !== 'geo';
};
/**
 * A block that became a map-drawn site after v2 (WH-06) still makes every random draw an ordinary
 * block makes, so the rest of the city keeps its buildings and trees (PRD addendum §7). What it
 * would have placed is dropped afterwards, except street trees on its north and west edges, as on
 * the other site blocks.
 */
const isGeoSite = (b: Block) => siteAt(b)?.style === 'geo';
const INSET = 2.2;
const PARKING = { cx: 75, cz: 0 };
const isParking = (b: Block) => Math.abs(b.cx - PARKING.cx) < 1 && Math.abs(b.cz - PARKING.cz) < 1;

/**
 * West end of the city's east-west roads: the east edge of WH-06's road, so the two surfaces
 * meet instead of lying on top of each other (that overlap made trucks flicker as they crossed).
 */
const sideRoad = SITES.find((s) => s.road);
const Z_ROAD_WEST = sideRoad?.road ? sideRoad.center.x + sideRoad.road.a.x + ROAD_WIDTH / 2 : -(X_EDGE + 30);
const Z_ROAD_EAST = X_EDGE + 30;

function buildCity() {
  const rng = new Rng(4242);
  const all = blocks();
  const dashes: InstanceItem[] = [];
  const zebra: InstanceItem[] = [];
  const trees: InstanceItem[] = [];
  const buildings: { p: [number, number, number]; s: [number, number, number] }[] = [];
  const units: InstanceItem[] = [];
  const lawns: { cx: number; cz: number; w: number; d: number }[] = [];
  const lots: { cx: number; cz: number; w: number; d: number }[] = [];
  const parked: { x: number; z: number; carrier: CarrierId }[] = [];
  const stalls: InstanceItem[] = [];

  const nearRoad = (v: number, roads: number[]) => roads.some((r) => Math.abs(v - r) < ROAD_WIDTH / 2 + 2);

  // Lane dashes. The west end of each cross street is the WH-06 road, so dashes stop short of it.
  for (const x of X_ROADS)
    for (let z = -Z_EDGE; z < Z_EDGE; z += 10) {
      if (nearRoad(z + 2, Z_ROADS)) continue;
      for (const o of [-4.5, 4.5]) dashes.push({ p: [x + o, 0.06, z + 2], s: [0.22, 1, 4] });
    }
  for (const z of Z_ROADS)
    for (let x = Z_ROAD_WEST + 14; x < X_EDGE; x += 10) {
      if (nearRoad(x + 2, X_ROADS)) continue;
      for (const o of [-4.5, 4.5]) dashes.push({ p: [x + 2, 0.06, z + o], s: [4, 1, 0.22] });
    }
  // Zebra crossings on each approach of every intersection
  for (const x of X_ROADS)
    for (const z of Z_ROADS) {
      for (let k = -3; k <= 3; k++) {
        const o = k * 2.3;
        zebra.push({ p: [x + o, 0.06, z - 12], s: [1.2, 1, 3.6] }, { p: [x + o, 0.06, z + 12], s: [1.2, 1, 3.6] });
        zebra.push({ p: [x - 12, 0.06, z + o], s: [3.6, 1, 1.2] }, { p: [x + 12, 0.06, z + o], s: [3.6, 1, 1.2] });
      }
    }

  for (const b of all) {
    const w = b.x1 - b.x0;
    const d = b.z1 - b.z0;
    // Street trees along the sidewalk
    const edgeTrees = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.floor(len / 20);
      for (let i = 1; i < n; i++) {
        if (rng.chance(0.25)) continue;
        const u = i / n;
        trees.push({ p: [x0 + (x1 - x0) * u, 0.25, z0 + (z1 - z0) * u], s: [1, 0.85 + rng.next() * 0.35, 1] });
      }
    };
    const inset = INSET;
    if (!isSite(b)) {
      edgeTrees(b.x0 + inset, b.z0 + inset, b.x1 - inset, b.z0 + inset);
      edgeTrees(b.x0 + inset, b.z1 - inset, b.x1 - inset, b.z1 - inset);
      edgeTrees(b.x0 + inset, b.z0 + inset, b.x0 + inset, b.z1 - inset);
      edgeTrees(b.x1 - inset, b.z0 + inset, b.x1 - inset, b.z1 - inset);
    } else {
      edgeTrees(b.x0 + inset, b.z0 + inset, b.x1 - inset, b.z0 + inset);
      edgeTrees(b.x0 + inset, b.z0 + inset, b.x0 + inset, b.z1 - inset);
    }
    if (isSite(b)) continue;
    if (isParking(b)) {
      lots.push({ cx: b.cx, cz: b.cz, w: w - 10, d: d - 10 });
      const carriers: CarrierId[] = ['waretrack', 'bluepeak', 'nordline', 'waretrack', 'cargoviva', 'bluepeak', 'nordline'];
      carriers.forEach((c, i) => {
        const x = b.x0 + 22 + i * 14;
        parked.push({ x, z: b.cz - 8, carrier: c });
        for (const o of [-2.4, 2.4]) stalls.push({ p: [x + o, 0.3, b.cz - 8], s: [0.18, 1, 18] });
      });
      continue;
    }
    // Park or offices
    if (rng.chance(0.22)) {
      lawns.push({ cx: b.cx, cz: b.cz, w: w - 14, d: d - 14 });
      for (let i = 0; i < 22; i++)
        trees.push({ p: [b.x0 + 10 + rng.next() * (w - 20), 0.3, b.z0 + 10 + rng.next() * (d - 20)], s: [1.1, 0.9 + rng.next() * 0.5, 1.1] });
      continue;
    }
    const cols = w > 120 ? 3 : 2;
    const rows = 2;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        if (rng.chance(0.18)) continue;
        const cw = (w - 16) / cols;
        const cd = (d - 16) / rows;
        const bw = cw * (0.55 + rng.next() * 0.3);
        const bd = cd * (0.5 + rng.next() * 0.35);
        const h = 9 + rng.next() * 20;
        const x = b.x0 + 8 + cw * (i + 0.5);
        const z = b.z0 + 8 + cd * (j + 0.5);
        buildings.push({ p: [x, h / 2 + 0.25, z], s: [bw, h, bd] });
        for (let k = 0; k < 3; k++)
          units.push({ p: [x + (rng.next() - 0.5) * bw * 0.6, h + 0.25 + 0.5, z + (rng.next() - 0.5) * bd * 0.6], s: [2.4, 1, 1.8] });
      }
  }
  const geo = all.filter(isGeoSite);
  const inGeo = (x: number, z: number) => geo.some((b) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1);
  const onStreetEdge = (x: number, z: number) => geo.some((b) => Math.abs(x - (b.x0 + INSET)) < 0.01 || Math.abs(z - (b.z0 + INSET)) < 0.01);
  return {
    all, dashes, zebra, parked, stalls, lots,
    trees: trees.filter((t) => !inGeo(t.p[0], t.p[2]) || onStreetEdge(t.p[0], t.p[2])),
    buildings: buildings.filter((b) => !inGeo(b.p[0], b.p[2])),
    units: units.filter((u) => !inGeo(u.p[0], u.p[2])),
    lawns: lawns.filter((l) => !inGeo(l.cx, l.cz)),
  };
}

function OfficeBuilding({ p, s }: { p: [number, number, number]; s: [number, number, number] }) {
  const mats = useMemo(() => {
    const side = (len: number) =>
      new THREE.MeshStandardMaterial({ map: (() => { const t = windows().clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len / 9, s[1] / 9); t.needsUpdate = true; return t; })(), roughness: 0.8 });
    const xs = side(s[2]);
    const zs = side(s[0]);
    return [xs, xs, MATS.roofTop, MATS.roofTop, zs, zs];
  }, [s]);
  return <mesh position={p} scale={s} geometry={GEO.box} material={mats} castShadow receiveShadow />;
}

export function City() {
  const c = useMemo(buildCity, []);
  const totalX = X_EDGE * 2 + 400;
  const totalZ = Z_EDGE * 2 + 400;
  return (
    <group>
      <mesh geometry={PLANE} material={MATS.ground} scale={[totalX * 2, 1, totalZ * 2]} position={[0, -0.02, 0]} receiveShadow />
      {X_ROADS.map((x) => (
        <mesh key={`rx${x}`} geometry={PLANE} material={MATS.road} scale={[ROAD_WIDTH, 1, Z_EDGE * 2 + 60]} position={[x, 0.03, 0]} receiveShadow />
      ))}
      {Z_ROADS.map((z) => (
        <mesh
          key={`rz${z}`}
          geometry={PLANE}
          material={MATS.road}
          scale={[Z_ROAD_EAST - Z_ROAD_WEST, 1, ROAD_WIDTH]}
          position={[(Z_ROAD_WEST + Z_ROAD_EAST) / 2, 0.031, z]}
          receiveShadow
        />
      ))}
      {c.all.map((b, i) => (
        <mesh key={`b${i}`} geometry={GEO.box} material={MATS.sidewalk} scale={[b.x1 - b.x0, 0.5, b.z1 - b.z0]} position={[b.cx, 0, b.cz]} receiveShadow />
      ))}
      {c.lawns.map((l, i) => (
        <mesh key={`l${i}`} geometry={PLANE} material={MATS.lawn} scale={[l.w, 1, l.d]} position={[l.cx, 0.27, l.cz]} receiveShadow />
      ))}
      {c.lots.map((l, i) => (
        <mesh key={`p${i}`} geometry={PLANE} material={MATS.lot} scale={[l.w, 1, l.d]} position={[l.cx, 0.27, l.cz]} receiveShadow />
      ))}
      <Instanced geometry={PLANE} material={MATS.marking} items={c.dashes} />
      <Instanced geometry={PLANE} material={MATS.marking} items={c.zebra} />
      <Instanced geometry={PLANE} material={MATS.stall} items={c.stalls} />
      <Instanced geometry={TRUNK} material={MATS.trunk} items={c.trees} cast />
      <Instanced geometry={CANOPY} material={MATS.canopy} items={c.trees} cast />
      <Instanced geometry={GEO.box} material={MATS.roofUnit} items={c.units} cast />
      {c.buildings.map((b, i) => (
        <OfficeBuilding key={i} p={b.p} s={b.s} />
      ))}
      {c.parked.map((t, i) => (
        <group key={i} position={[t.x, 0.25, t.z]} rotation={[0, -Math.PI / 2, 0]}>
          <TruckModel carrier={t.carrier} />
        </group>
      ))}
    </group>
  );
}
