// Low-poly MPM main office (kantor utama) at WH-06, with its drop-off loop (user's photo and marked
// screenshots, 10 Oct 2026). Coordinates are the WH-06 local frame in metres, ground at y = 0, so the
// model is placed at the site origin. The building faces +z, toward the truck road, and its west wing
// reaches forward to that road. The drop-off leaves the road beside the wing, passes under the
// canopy, rounds the east end of the planted island and returns to the road.
// Regenerates public/models/kantor-utama.glb.
import * as THREE from 'three';
import { arc, at, lowPolyModel, mat } from './lowpoly.mjs';

const M = {
  white: mat('white', '#F4F6F8', 0.82),
  stone: mat('stone', '#8E959F', 0.9),
  glass: mat('glass', '#4F78D6', 0.25),
  dark: mat('dark', '#2A3140', 0.55),
  column: mat('column', '#4A4F57', 0.8),
  concrete: mat('concrete', '#E3E7EE', 0.95),
  drive: mat('drive', '#C9D6F3', 0.95),
  line: mat('line', '#E8C547', 0.7),
  curbY: mat('curb-yellow', '#F2C94C', 0.7),
  curbB: mat('curb-black', '#2C3138', 0.8),
  grass: mat('grass', '#A6E3B8', 0.95),
  leaf: mat('leaf', '#5FBF84', 0.85),
  trunk: mat('trunk', '#9A7A5A', 0.9),
  metal: mat('metal', '#D9DEE6', 0.5),
};

const model = lowPolyModel('kantor-utama');
const { put, box, flat, slab, ribbon } = model;
const curb = (pts, closed) => model.curb(pts, closed, [M.curbB, M.curbY]);
const shrub = (x, z, s) => model.shrub(x, z, s, M.leaf);
const palm = (x, z, h) => model.palm(x, z, h, M.trunk, M.leaf);

// ---- the building (front at z = -50, toward the truck road) -----------------------------
const FRONT = -50;
const BACK = -100.5;
const H = 8.6;
// West wing, from the back line forward to the truck road, beside the drive in.
const WX0 = 47;
const WX1 = 56;
const WFRONT = -12.5;
box(WX0, WX1, 0, H, BACK, WFRONT, M.white);
box(WX1, 74, 0, H, BACK, FRONT, M.stone); // stone wing, left of the entrance
box(74, 139, 0, H, BACK, FRONT, M.white);
slab([[WX0 - 0.6, BACK - 0.4], [139.6, BACK - 0.4], [139.6, FRONT + 0.4], [WX1 + 0.6, FRONT + 0.4], [WX1 + 0.6, WFRONT + 0.4], [WX0 - 0.6, WFRONT + 0.4]], H, H + 0.4, M.white); // roof
// The wing's windows: toward the drive, the road and the west yard, and a glass door on the road.
for (const [y0, y1] of [[1.4, 3], [5.5, 6.8]]) {
  for (const [z0, z1] of [[-48, -32], [-30, -14.5]]) box(WX1, WX1 + 0.22, y0, y1, z0, z1, M.dark);
  for (const [z0, z1] of [[-98, -80], [-78, -60], [-58, -40], [-38, -14.5]]) box(WX0 - 0.22, WX0, y0, y1, z0, z1, M.dark);
}
box(48.5, 54.5, 5.5, 6.8, WFRONT, WFRONT + 0.22, M.dark);
box(49.5, 53.5, 0.3, 3.4, WFRONT, WFRONT + 0.25, M.glass);
const DOOR = 86;
box(76, 100, 0.3, 3.9, FRONT, FRONT + 0.25, M.glass); // lobby glass
box(DOOR - 1.6, DOOR + 1.6, 0.3, 3, FRONT + 0.25, FRONT + 0.4, M.dark);
for (const [x0, x1] of [[76, 87], [89, 100], [104, 120], [122, 137]]) box(x0, x1, 5.5, 6.8, FRONT, FRONT + 0.22, M.dark);
for (const [x0, x1] of [[104, 120], [122, 137]]) box(x0, x1, 1.4, 3, FRONT, FRONT + 0.22, M.dark);
// Raised walk in front of the lobby, with its curb on the drive side.
box(70, 102, 0, 0.22, FRONT, FRONT + 2.4, M.concrete);
curb([[70, FRONT + 2.6], [102, FRONT + 2.6]], false);
// Porte-cochere over the walk and the drive, on dark stone columns at the island's edge.
box(72, 100, 4.6, 5.3, FRONT, -39.4, M.white);
for (const x of [74, 86, 98]) box(x - 0.45, x + 0.45, 0, 4.6, -40.35, -39.45, M.column);
for (const [x, z, s] of [[59.5, -48.6, 1.5], [62.6, -48.8, 1.2], [65.8, -48.5, 1.4], [68.4, -48.9, 1]]) shrub(x, z, s);

// ---- the drop-off loop ---------------------------------------------------------------------
const WIDE = 7; // the drive
const ISL = 4.3; // drive centre line to the island's edge
const ROAD = -10.3; // north edge of the truck road's paving
const IN = 61.5; // centre line of the way in, beside the west wing
const OUT = 120.8; // centre line of the way out, past the island's east end
const LANE = -44; // centre line under the canopy
const R_IN = 8;
const R_OUT = 14.3;
const center = [
  [IN, ROAD + 0.8],
  [IN, LANE + R_IN],
  ...arc(IN + R_IN, LANE + R_IN, R_IN, Math.PI, 1.5 * Math.PI, 8),
  [OUT - R_OUT, LANE],
  ...arc(OUT - R_OUT, LANE + R_OUT, R_OUT, 1.5 * Math.PI, 2 * Math.PI, 12),
  [OUT, ROAD + 0.8],
];
ribbon(center, () => WIDE, 0.14, M.drive);
// The way out flares into the truck road on its outer side.
const F = 4;
const fx = OUT + WIDE / 2;
flat([[fx, ROAD - F], ...arc(fx + F, ROAD - F, F, Math.PI, Math.PI / 2, 6), [fx + F, ROAD + 0.8], [fx, ROAD + 0.8]], 0.14, M.drive);
// Yellow guide line on the outer side of the turn in, as painted at the real entrance.
ribbon([...center.slice(1, 10), [DOOR, LANE]].map(([x, z], i, a) => {
  const b = a[Math.min(a.length - 1, i + 1)];
  const p = a[Math.max(0, i - 1)];
  const l = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1;
  return [x + ((b[1] - p[1]) / l) * 2.3, z - ((b[0] - p[0]) / l) * 2.3];
}), () => 0.35, 0.17, M.line);

// ---- the planted island inside the loop -------------------------------------------------
const island = [
  [IN + ISL, -12.5],
  [IN + ISL, LANE + R_IN],
  ...arc(IN + R_IN, LANE + R_IN, R_IN - ISL, Math.PI, 1.5 * Math.PI, 6),
  [OUT - R_OUT, LANE + ISL],
  ...arc(OUT - R_OUT, LANE + R_OUT, R_OUT - ISL, 1.5 * Math.PI, 2 * Math.PI, 8),
  [OUT - ISL, -15.5],
  ...arc(OUT - ISL - 3, -15.5, 3, 0, Math.PI / 2, 4),
];
flat(island, 0.24, M.grass);
curb(island, true);
for (const [x, z, h] of [[73, -31, 6.5], [83, -22, 7.5], [97, -30, 7], [108, -21, 6]]) palm(x, z, h);
for (const [x, z, s] of [[69.5, -18, 1.1], [71, -25, 0.9], [78, -35.2, 1], [89, -35.8, 0.8], [92, -16, 1.2], [101, -36, 0.9], [104, -27, 1.1], [112, -31, 0.8], [112, -16.5, 1]]) shrub(x, z, s);
// Lamp post and a sign board on the island, as in the photo.
put(new THREE.CylinderGeometry(0.1, 0.14, 7, 6), M.metal, at(70, 3.5, -28));
box(69.6, 70.9, 6.8, 7.05, -28.2, -27.8, M.metal);
put(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 6), M.dark, at(100, 1.6, -34));
box(99.3, 100.7, 2.6, 3.5, -34.08, -33.92, M.metal);

await model.save();
