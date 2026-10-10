// A site drawn from a real place (PRD addendum WH-06): the whole compound from src/data/geo (the
// user's labelled map plus OpenStreetMap), the hand-modelled main hall, low-poly models of a few
// buildings (public/models), and the site's own road.
// Map buildings and flat ground are merged into one mesh each (vertex colours), so the compound
// adds only a few draw calls.
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { Html, useGLTF } from '@react-three/drei';
import { GEO_SITES, polyBounds, type GeoSite, type GeoStyle, type Pt } from '../data/geo';
import { ROAD_WIDTH, X_ROADS, Z_ROADS } from '../data/sites';
import type { SiteDef, Vec2 } from '../data/types';
import { useApp } from '../store';
import { Instanced, type InstanceItem } from './Instanced';
import { GEO } from './models';
import { learningCenterSign, roofLogo } from './textures';

const Y = 0.3; // yard surface height (as SiteModel)

const COLORS = {
  ground: '#DCE3EF', // the compound around the operational yard
  road: '#C9D6F3',
  track: '#B9C4DA', // riding course asphalt
  zoneLine: '#F07023', // the user's outlines
  green: '#D7EFE6',
  trim: '#F07023', // MPM orange (logo)
  glass: '#4F78D6',
};

type V3 = [number, number, number];

/** Flat-shaded triangles with per-vertex colour, merged into one geometry. */
class Builder {
  private pos: number[] = [];
  private nor: number[] = [];
  private col: number[] = [];

  /** Triangle whose normal is turned to agree with `dir` (winding is fixed accordingly). */
  tri(a: V3, b: V3, c: V3, color: THREE.Color, dir: V3) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    if (nx * dir[0] + ny * dir[1] + nz * dir[2] < 0) {
      [b, c] = [c, b];
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    for (const p of [a, b, c]) {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(nx / l, ny / l, nz / l);
      this.col.push(color.r, color.g, color.b);
    }
  }

  quad(a: V3, b: V3, c: V3, d: V3, color: THREE.Color, dir: V3) {
    this.tri(a, b, c, color, dir);
    this.tri(a, c, d, color, dir);
  }

  /** Horizontal polygon at height y, facing up. */
  flat(poly: Pt[], y: number, color: THREE.Color) {
    const contour = poly.map(([x, z]) => new THREE.Vector2(x, z));
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(contour, [])) {
      this.tri([poly[i][0], y, poly[i][1]], [poly[j][0], y, poly[j][1]], [poly[k][0], y, poly[k][1]], color, [0, 1, 0]);
    }
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return g;
  }
}

const signedArea = (poly: Pt[]) => poly.reduce((s, [x, z], i) => s + x * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * z, 0) / 2;

/** Outward-facing walls of a footprint from y0 to y1. */
function walls(out: Builder, poly: Pt[], y0: number, y1: number, color: THREE.Color) {
  const p = signedArea(poly) > 0 ? poly : [...poly].reverse();
  for (let i = 0; i < p.length; i++) {
    const [ax, az] = p[i];
    const [bx, bz] = p[(i + 1) % p.length];
    out.quad([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], color, [bz - az, 0, -(bx - ax)]);
  }
}

/** Gable roof(s) over a rectangle: `ridges` parallel ridges running along `axis`. */
function gables(out: Builder, [x0, z0, x1, z1]: [number, number, number, number], y: number, rise: number, ridges: number, axis: 'x' | 'z', roof: THREE.Color, wall: THREE.Color) {
  // Work in (across, along) coordinates; `axis` is the ridge direction.
  const P = (u: number, h: number, v: number): V3 => (axis === 'z' ? [u, h, v] : [v, h, u]);
  const [u0, u1, v0, v1] = axis === 'z' ? [x0, x1, z0, z1] : [z0, z1, x0, x1];
  const w = (u1 - u0) / ridges;
  const vDir = (sign: number): V3 => (axis === 'z' ? [0, 0, sign] : [sign, 0, 0]);
  for (let k = 0; k < ridges; k++) {
    const a = u0 + k * w;
    const b = a + w;
    const m = (a + b) / 2;
    out.quad(P(a, y, v0), P(m, y + rise, v0), P(m, y + rise, v1), P(a, y, v1), roof, [0, 1, 0]);
    out.quad(P(m, y + rise, v0), P(b, y, v0), P(b, y, v1), P(m, y + rise, v1), roof, [0, 1, 0]);
    out.tri(P(a, y, v0), P(m, y + rise, v0), P(b, y, v0), wall, vDir(-1));
    out.tri(P(a, y, v1), P(m, y + rise, v1), P(b, y, v1), wall, vDir(1));
  }
}

const rectArea = ([x0, z0, x1, z1]: number[]) => (x1 - x0) * (z1 - z0);

/** Roof of a footprint at height `top`, plus its accent roof and roof house. */
function roofOf(out: Builder, poly: Pt[], top: number, s: GeoStyle) {
  const wall = new THREE.Color(s.wall);
  const box = polyBounds(poly);
  // A pitched roof only where the footprint is (nearly) its bounding rectangle.
  if (s.roofShape === 'gable' && Math.abs(signedArea(poly)) > 0.9 * rectArea(box)) {
    gables(out, box, top, s.rise ?? 2, s.ridges ?? 1, s.ridgeAxis ?? 'x', new THREE.Color(s.roof), wall);
  } else out.flat(poly, top, new THREE.Color(s.roof));
  if (s.roofHouse) {
    walls(out, s.roofHouse.poly, top, top + s.roofHouse.height, wall);
    out.flat(s.roofHouse.poly, top + s.roofHouse.height, new THREE.Color(s.roof));
  }
  if (s.accent) {
    // A pitched roof over one wing (the red roof of the Safety Riding Center), ridge along its long side.
    const a = polyBounds(s.accent.poly);
    walls(out, s.accent.poly, top, top + 0.6, wall);
    gables(out, a, top + 0.6, s.accent.rise, 1, a[3] - a[1] > a[2] - a[0] ? 'z' : 'x', new THREE.Color(s.accent.roof), wall);
  }
}

function buildingsGeometry(g: GeoSite) {
  const out = new Builder();
  for (const b of g.buildings) {
    if (b.zone && MODELLED_ZONES.has(b.zone)) continue; // drawn from its model (WH06_MODELS)
    walls(out, b.poly, Y, Y + b.height, new THREE.Color(b.wall));
    roofOf(out, b.poly, Y + b.height, b);
  }
  return out.geometry();
}

function ribbon(out: Builder, line: Pt[], width: number, y: number, color: THREE.Color) {
  const h = width / 2;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i];
    const [bx, bz] = line[i + 1];
    const len = Math.hypot(bx - ax, bz - az) || 1;
    const dx = (bx - ax) / len;
    const dz = (bz - az) / len;
    // Extend each piece by half the width so consecutive pieces overlap at the bends.
    const sx = ax - dx * h, sz = az - dz * h, ex = bx + dx * h, ez = bz + dz * h;
    const nx = -dz * h, nz = dx * h;
    out.quad([sx + nx, y, sz + nz], [ex + nx, y, ez + nz], [ex - nx, y, ez - nz], [sx - nx, y, sz - nz], color, [0, 1, 0]);
  }
}

const rect = ([x0, z0, x1, z1]: number[]): Pt[] => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

/** Layers above the compound base, low to high. */
const LAYER = { ground: 0.03, fill: 0.045, track: 0.05, road: 0.06, mark: 0.075 };

/** Painted loop and slalom lines of the riding course, inside its visible part. */
function trackMarks(out: Builder, [x0, z0, x1, z1]: number[], y: number, color: THREE.Color) {
  const i = 4;
  if (x1 - x0 < 3 * i || z1 - z0 < 3 * i) return;
  ribbon(out, [[x0 + i, z0 + i], [x1 - i, z0 + i], [x1 - i, z1 - i], [x0 + i, z1 - i], [x0 + i, z0 + i]], 0.35, y, color);
  const zm = (z0 + z1) / 2;
  for (let x = x0 + 2 * i; x < x1 - 2 * i; x += 6) ribbon(out, [[x, zm - 1.2], [x, zm + 1.2]], 0.35, y, color);
}

function groundGeometry(g: GeoSite) {
  const out = new Builder();
  const ground = new THREE.Color(COLORS.ground);
  for (const r of g.ground) out.flat(rect(r), Y + LAYER.ground, ground);
  for (const z of g.zones) for (const p of z.fillParts ?? []) out.flat(p, Y + LAYER.fill, new THREE.Color(z.fill!));
  const track = new THREE.Color(COLORS.track);
  const white = new THREE.Color('#FFFFFF');
  const paved = new THREE.Color(COLORS.road);
  for (const a of g.areas)
    for (const p of a.parts) {
      if (a.kind === 'paved') {
        out.flat(p, Y + LAYER.track, paved);
        continue;
      }
      out.flat(p, Y + LAYER.track, track);
      trackMarks(out, polyBounds(p), Y + LAYER.mark, white);
    }
  const road = new THREE.Color(COLORS.road);
  for (const r of g.roads) ribbon(out, r.line, r.width, Y + LAYER.road, road);
  // The user's outlines, drawn on the ground.
  const line = new THREE.Color(COLORS.zoneLine);
  for (const z of g.zones) for (const pl of z.outline) ribbon(out, pl, 0.6, Y + LAYER.mark, line);
  return out.geometry();
}

const flatMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const buildingMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
const baseMat = new THREE.MeshStandardMaterial({ color: '#E6ECF8', roughness: 0.95 });
const roadMat = new THREE.MeshStandardMaterial({ color: COLORS.road, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
const sidewalkMat = new THREE.MeshStandardMaterial({ color: '#F6F8FD', roughness: 0.95 });
const markMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.6 });
const TRUNK = new THREE.CylinderGeometry(0.22, 0.3, 2.4, 6).translate(0, 1.2, 0);
const CANOPY = new THREE.IcosahedronGeometry(1.9, 1).translate(0, 3.9, 0);
const PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const trunkMat = new THREE.MeshStandardMaterial({ color: '#9A7A5A', roughness: 0.9 });
const canopyMat = new THREE.MeshStandardMaterial({ color: '#7FD8A0', roughness: 0.8, flatShading: true });

/**
 * The site's own road outside the city (a straight, axis-aligned segment in local coordinates),
 * with sidewalks and lane dashes like the city roads. The city's cross streets end on it: the
 * sidewalk on the city side is open where they meet it.
 */
function SiteRoad({ road, center }: { road: { a: Vec2; b: Vec2 }; center: Vec2 }) {
  const alongZ = road.a.x === road.b.x;
  const [u0, u1] = alongZ ? [Math.min(road.a.z, road.b.z), Math.max(road.a.z, road.b.z)] : [Math.min(road.a.x, road.b.x), Math.max(road.a.x, road.b.x)];
  const v = alongZ ? road.a.x : road.a.z; // the road's centre line
  const h = ROAD_WIDTH / 2;
  // Cross streets, along this road; the city is on the side toward the world origin.
  const cross = (alongZ ? Z_ROADS.map((z) => z - center.z) : X_ROADS.map((x) => x - center.x)).filter((c) => c > u0 && c < u1);
  const citySide = -Math.sign((alongZ ? center.x : center.z) + v);
  // [along, across] → [x, z]
  const at = (u: number, w: number): [number, number] => (alongZ ? [v + w, u] : [u, v + w]);
  const size = (l: number, w: number): [number, number] => (alongZ ? [w, l] : [l, w]);
  const dashes = useMemo<InstanceItem[]>(() => {
    const out: InstanceItem[] = [];
    for (let u = u0 + 4; u < u1 - 2; u += 10) {
      if (cross.some((c) => Math.abs(u - c) < h + 2)) continue;
      for (const o of [-4.5, 4.5]) {
        const [x, z] = at(u, o);
        const [sx, sz] = size(4, 0.22);
        out.push({ p: [x, 0.06, z], s: [sx, 1, sz] });
      }
    }
    return out;
  }, [u0, u1, v, alongZ, center.x, center.z]);
  const cuts = [u0, ...cross.flatMap((c) => [c - h, c + h]), u1];
  const cityWalks = cuts.filter((_, i) => i % 2 === 0).map((a, i) => [a, cuts[2 * i + 1]]);
  // Short pieces: one 600 m quad hides trucks at a grazing angle (the depth is wrong at the far end).
  const pieces: [number, number][] = [];
  for (let u = u0; u < u1 - 0.5; u += 40) pieces.push([u, Math.min(u1, u + 40)]);
  return (
    <group>
      {pieces.map(([a, b]) => {
        const [x, z] = at((a + b) / 2, 0);
        const [sx, sz] = size(b - a, ROAD_WIDTH);
        return <mesh key={a} geometry={PLANE} material={roadMat} position={[x, 0.04, z]} scale={[sx, 1, sz]} receiveShadow />;
      })}
      {[-1, 1].flatMap((side) =>
        (side === citySide ? cityWalks : [[u0, u1]]).map(([a, b]) => {
          const [x, z] = at((a + b) / 2, side * (h + 2));
          const [sx, sz] = size(b - a, 4);
          return <mesh key={`${side}:${a}`} geometry={GEO.box} material={sidewalkMat} position={[x, 0, z]} scale={[sx, 0.5, sz]} receiveShadow />;
        }),
      )}
      <Instanced geometry={PLANE} material={markMat} items={dashes} />
    </group>
  );
}

/** Ground of the whole compound: base, zone fills, riding course, internal roads, outlines and trees. */
export function GeoGround({ site }: { site: SiteDef }) {
  const g = GEO_SITES[site.code];
  const geo = useMemo(() => (g ? groundGeometry(g) : null), [g]);
  const trees = useMemo<InstanceItem[]>(
    () => (g?.trees ?? []).map(([x, z], i) => ({ p: [x, Y - 0.05, z], s: [1, 0.9 + ((i * 37) % 10) / 25, 1] })),
    [g],
  );
  if (!g || !geo) return null;
  const [x0, z0, x1, z1] = g.base;
  return (
    <group>
      <mesh geometry={GEO.box} material={baseMat} position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]} scale={[x1 - x0, 0.6, z1 - z0]} receiveShadow />
      <mesh geometry={geo} material={flatMat} receiveShadow />
      <Instanced geometry={TRUNK} material={trunkMat} items={trees} cast />
      <Instanced geometry={CANOPY} material={canopyMat} items={trees} cast />
      {site.road && <SiteRoad road={site.road} center={site.center} />}
    </group>
  );
}

/** Names of the compound's parts, as labelled on the user's map; shown while the site is in view. */
export function GeoLabels({ site }: { site: SiteDef }) {
  const view = useApp((s) => s.view);
  const g = GEO_SITES[site.code];
  if (!g || view !== site.code) return null;
  return (
    <group>
      {g.zones.map((z, i) => (
        <Html key={i} position={[z.label.pos[0], Y + z.label.y, z.label.pos[1]]} center zIndexRange={[15, 5]} style={{ pointerEvents: 'none' }}>
          <div className={`zone-label zone-label--${z.kind}`}>{z.name}</div>
        </Html>
      ))}
    </group>
  );
}

/**
 * Low-poly models at WH-06, in the site's local metres (scripts/build-*-glb.mjs): the main office with
 * its drop-off loop, the kantin, and the covered dock beside Gudang part 1.
 */
const WH06_MODELS = ['/models/kantor-utama.glb', '/models/kantin-mpm.glb', '/models/gudang-1-dock.glb'];
/** Map zones whose building one of those models draws. */
const MODELLED_ZONES = new Set(['Kantor utama', 'Kantin dan learning study MPM']);
/** Textures for a model's anchor nodes (GLTFExporter cannot pack canvas textures under Node). */
const ANCHOR_TEXTURES: Record<string, () => THREE.Texture> = { 'learning-center-sign': learningCenterSign };
const inFront = { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 };

function SiteGlb({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const o = scene.clone(true);
    const anchors: THREE.Object3D[] = [];
    o.traverse((m) => {
      if (ANCHOR_TEXTURES[m.name]) anchors.push(m);
      if (!(m instanceof THREE.Mesh)) return;
      m.castShadow = true;
      m.receiveShadow = true;
      // A drive, its marking and facade tiles lie a few cm off another surface: keep them in front of it.
      if (m.name === 'drive' || m.name === 'line' || m.name.startsWith('decal')) {
        m.material = Object.assign((m.material as THREE.Material).clone(), inFront);
        m.castShadow = false;
      }
    });
    for (const a of anchors) a.add(new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({ map: ANCHOR_TEXTURES[a.name](), transparent: true, ...inFront })));
    return o;
  }, [scene]);
  return <primitive object={model} position={[0, Y, 0]} />;
}
for (const url of WH06_MODELS) useGLTF.preload(url);

/** Buildings of the compound other than the main hall (from the user's outlines and OSM). */
export function GeoBuildings({ site }: { site: SiteDef }) {
  const g = GEO_SITES[site.code];
  const geo = useMemo(() => (g ? buildingsGeometry(g) : null), [g]);
  if (!geo) return null;
  return (
    <group>
      <mesh geometry={geo} material={buildingMat} castShadow receiveShadow />
      {site.code === 'WH-06' &&
        WH06_MODELS.map((url) => (
          <Suspense key={url} fallback={null}>
            <SiteGlb url={url} />
          </Suspense>
        ))}
    </group>
  );
}

/**
 * Wall texture of the main building, 3 m wide and the full wall high: profiled cladding, an orange
 * MPM band under the eaves and a strip of high windows.
 */
function cladding(wall: string, height: number) {
  const W = 48;
  const H = Math.round(height * 16);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const m = (v: number) => Math.round(H - v * 16); // metres above ground → canvas y
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(40, 52, 80, 0.07)';
  for (let x = 0; x < W; x += 8) ctx.fillRect(x, 0, 2, H);
  ctx.fillStyle = COLORS.trim;
  ctx.fillRect(0, 0, W, m(height - 0.7));
  const g = ctx.createLinearGradient(0, m(height - 1.4), 0, m(height - 2.6));
  g.addColorStop(0, '#9DB6EE');
  g.addColorStop(1, COLORS.glass);
  ctx.fillStyle = g;
  ctx.fillRect(3, m(height - 1.4), W - 6, m(height - 2.6) - m(height - 1.4));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** The main warehouse hall (hand-modelled); doors and sign come from SiteModel. */
export function GeoMain({ site }: { site: SiteDef }) {
  const g = GEO_SITES[site.code]!;
  const b = site.building;
  const m = g.main;
  const box = useMemo(() => {
    const side = (len: number) => {
      const t = cladding(m.wall, b.height);
      t.repeat.set(Math.max(1, Math.round(len / 3)), 1);
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
    };
    const roof = new THREE.MeshStandardMaterial({ color: m.roof, roughness: 0.9 });
    const ends = side(b.z1 - b.z0);
    const long = side(b.x1 - b.x0);
    return [ends, ends, roof, roof, long, long];
  }, [m.wall, m.roof, b.x0, b.x1, b.z0, b.z1, b.height]);
  const roof = useMemo(() => {
    const out = new Builder();
    const top = Y + b.height;
    if (m.sections && m.roofShape === 'gable') {
      // One pitched roof per section, each in its own colour (as seen on imagery).
      const wall = new THREE.Color(m.wall);
      for (const s of m.sections) gables(out, s.box, top, m.rise ?? 2, 1, m.ridgeAxis ?? 'x', new THREE.Color(s.roof), wall);
    } else roofOf(out, rect([b.x0, b.z0, b.x1, b.z1]), top, m);
    return out.geometry();
  }, [m, b.x0, b.x1, b.z0, b.z1, b.height]);
  const logoMat = useMemo(() => new THREE.MeshBasicMaterial({ map: roofLogo(), transparent: true }), []);
  // MPM logo on the roof slope that faces the yard, above the docks.
  const pitched = m.roofShape === 'gable' && (m.ridgeAxis ?? 'x') === 'x';
  const rise = pitched ? (m.rise ?? 2) : 0;
  const half = (b.z1 - b.z0) / 2;
  const slope = Math.atan2(rise, half);
  // Over the hall's own docks (a bay with its own lane is on another building).
  const bayXs = site.bays.filter((bay) => !bay.lane).map((bay) => bay.door.x - site.center.x);
  const logoX = (Math.min(...bayXs) + Math.max(...bayXs)) / 2;
  return (
    <group>
      <mesh geometry={GEO.box} material={box} position={[(b.x0 + b.x1) / 2, Y + b.height / 2, (b.z0 + b.z1) / 2]} scale={[b.x1 - b.x0, b.height, b.z1 - b.z0]} castShadow receiveShadow />
      <mesh geometry={roof} material={buildingMat} castShadow receiveShadow />
      <mesh
        geometry={GEO.plane}
        material={logoMat}
        scale={[12, 12, 1]}
        position={[logoX, Y + b.height + rise / 2 + 0.08, (b.z0 + b.z1) / 2 + half / 2]}
        rotation={[-Math.PI / 2 + slope, 0, 0]}
      />
    </group>
  );
}
