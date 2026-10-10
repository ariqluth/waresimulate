// Low-poly "Kantin dan learning study MPM" at WH-06, after the user's photo of the MPM Learning
// Center (10 Oct 2026): a maroon ground floor with the LEARNING CENTER lettering, a glass entrance
// under a red cantilevered canopy, an upper storey wrapped in a skin of red, white, orange and gold
// diamond tiles, planters with shrubs and bonsai in front, and a street lamp. It stands inside the
// user's outline; the front faces -z, toward the service road along the north side (user, 10 Oct
// 2026: the first version faced the yard). The lettering is a texture the app hangs on the
// 'learning-center-sign' anchor.
// Regenerates public/models/kantin-mpm.glb.
import * as THREE from 'three';
import { at, lowPolyModel, mat } from './lowpoly.mjs';

const M = {
  maroon: mat('maroon', '#8C3A2E', 0.8),
  skin: mat('skin', '#D4AE86', 0.8),
  cap: mat('cap', '#EDE6DA', 0.85),
  glass: mat('glass', '#35506F', 0.25),
  dark: mat('dark', '#2A3140', 0.55),
  canopy: mat('canopy', '#D63A2F', 0.6),
  soffit: mat('soffit', '#3A3F48', 0.7),
  planter: mat('planter', '#E7DAC3', 0.9),
  leaf: mat('leaf', '#4F9A5E', 0.85),
  pine: mat('pine', '#3F7F4E', 0.85),
  trunk: mat('trunk', '#7A5A40', 0.9),
  metal: mat('metal', '#C9CED6', 0.5),
  lamp: mat('lamp', '#FFF6DA', 0.3),
  // Facade tiles, a few cm proud of the skin (drawn with a depth offset in the app).
  red: mat('decal-red', '#C8302C', 0.6),
  white: mat('decal-white', '#F6F3EC', 0.6),
  orange: mat('decal-orange', '#E8893A', 0.6),
  gold: mat('decal-gold', '#D8AA48', 0.6),
};
const { put, box, anchor, save } = lowPolyModel('kantin-mpm');
const hash = (a, b) => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// ---- the building ----------------------------------------------------------------------
const X0 = -104;
const X1 = -89;
const FRONT = 17.6; // north wall, toward the road
const BACK = 28; // south wall, toward the yard
const B = 4.2; // ground floor
const H = 9.2;
const O = 0.2; // the skin's overhang
box(X0, X1, 0, B, FRONT, BACK, M.maroon);
box(X0 - O, X1 + O, B, H, FRONT - O, BACK + O, M.skin);
box(X0 - 0.3, X1 + 0.3, H, H + 0.25, FRONT - 0.3, BACK + 0.3, M.cap);
for (const x0 of [-101.5, -97.8]) box(x0, x0 + 2, H + 0.25, H + 1.15, 25, 26.6, M.metal); // roof units

/** Diamond tiles on one face of the skin: outward normal along `axis` with sign `s`, at `plane`. */
function tiles(axis, s, plane, u0, u1, seed) {
  const step = 1.3;
  const ry = axis === 'z' ? (s > 0 ? 0 : Math.PI) : s > 0 ? Math.PI / 2 : -Math.PI / 2;
  let row = 0;
  for (let y = B + 0.7; y <= H - 0.5; y += 0.85, row++) {
    for (let u = u0 + 0.7 + (row % 2) * (step / 2); u <= u1 - 0.6; u += step) {
      const h = hash(u * 3.1 + seed, y * 7.7);
      const m = h < 0.24 ? M.red : h < 0.4 ? M.white : h < 0.55 ? M.orange : h < 0.68 ? M.gold : null;
      if (!m) continue;
      const [x, z] = axis === 'z' ? [u, plane + s * 0.04] : [plane + s * 0.04, u];
      put(new THREE.PlaneGeometry(0.66, 0.66), m, at(x, y, z, ry, 0, Math.PI / 4));
    }
  }
}
tiles('z', -1, FRONT - O, X0 - O, X1 + O, 1); // the front, toward the road
tiles('z', 1, BACK + O, X0 - O, X1 + O, 2);
tiles('x', -1, X0 - O, FRONT - O, BACK + O, 3);
tiles('x', 1, X1 + O, FRONT - O, BACK + O, 4);

// Front, ground floor: the maroon wall with the lettering on the left, glass on the right.
const CX = -95.4;
anchor('learning-center-sign', (X0 + CX) / 2, 2.8, FRONT - 0.03, 6.2, 1.55, Math.PI);
box(CX, X1 - 0.3, 0.15, B - 0.25, FRONT - 0.06, FRONT, M.glass);
for (let x = CX; x <= X1 - 0.2; x += 1.5) box(x - 0.06, x + 0.06, 0.15, B - 0.25, FRONT - 0.1, FRONT, M.dark);
box(-93.2, -91.2, 0.15, 2.6, FRONT - 0.1, FRONT - 0.06, M.dark); // entrance doors
box(-100, -98, 0, 2.6, BACK, BACK + 0.06, M.dark); // service door at the back

// Red canopy over the entrance, reaching past the building's side, on one column.
const KX0 = -95.9;
const KX1 = -86;
const KZ0 = 15.6; // outer edge, toward the road
const KZ1 = 23.4;
box(KX0, KX1, 4.45, 4.95, KZ0, KZ1, M.canopy);
box(KX0, KX1, 4.38, 4.45, KZ0, FRONT - O, M.soffit);
box(X1 + O, KX1, 4.38, 4.45, FRONT - O, KZ1, M.soffit);
box(KX1 - 0.65, KX1 - 0.25, 0, 4.45, KZ0 + 0.2, KZ0 + 0.6, M.dark);
// Glass lobby beside the building, under the canopy.
box(X1, -87.2, 0, 4.38, FRONT, 22.9, M.glass);
box(-88.16, -88.04, 0, 4.38, FRONT - 0.1, FRONT, M.dark);
box(-87.2, -87.1, 0, 4.38, FRONT, 22.9, M.dark);

// ---- front planters, shrubs, bonsai and the lamp ---------------------------------------------
const PZ0 = 15.6;
const PZ1 = 16.6;
const PH = 0.9;
for (const [x0, x1] of [[X0, -93.6], [-90.4, -86]]) {
  box(x0, x1, 0, PH, PZ0, PZ1, M.planter);
  for (let x = x0 + 0.75; x <= x1 - 0.6; x += 1.35) put(new THREE.IcosahedronGeometry(0.55, 0), M.leaf, at(x, PH + 0.3, (PZ0 + PZ1) / 2, x * 1.7));
}
/** Layered, pruned pine (as the bonsai-style trees in the photo), its foot at height y0. */
function bonsai(x, z, y0, h) {
  put(new THREE.CylinderGeometry(0.11, 0.17, h, 6), M.trunk, at(x, y0 + h / 2, z));
  [[0.45, 1.25, 0.25], [0.7, 1, -0.2], [0.95, 0.7, 0.1]].forEach(([f, r, dx]) =>
    put(new THREE.IcosahedronGeometry(r, 0).scale(1, 0.42, 1), M.pine, at(x + dx, y0 + h * f, z, x + f * 5)),
  );
}
bonsai(-94.3, (PZ0 + PZ1) / 2, PH, 3.4);
bonsai(-87, (PZ0 + PZ1) / 2, PH, 2.8);
bonsai(-85, 16, 0, 4.2);
// Street lamp at the road, its head toward the building.
put(new THREE.CylinderGeometry(0.08, 0.13, 9.2, 6), M.metal, at(-84.3, 4.6, 15.1));
box(-85.5, -84.3, 9, 9.12, 15.05, 15.15, M.metal);
box(-85.9, -85.3, 8.75, 9.05, 14.95, 15.3, M.metal);
box(-85.85, -85.35, 8.71, 8.75, 14.98, 15.26, M.lamp);

await save();
