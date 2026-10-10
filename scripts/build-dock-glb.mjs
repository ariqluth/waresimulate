// Covered truck dock beside Gudang part 1 at WH-06 (user's marked screenshot, 10 Oct 2026): a dock
// house against the warehouse's east wall, holding the 'Gudang 1' bay door (src/data/sites.ts) and
// the forklift door beside it, and a canopy over the truck's stall and the forklift's working space.
// The bay door, stall lines and bumpers are drawn by the app (SiteModel Bays).
// Regenerates public/models/gudang-1-dock.glb.
import { lowPolyModel, mat } from './lowpoly.mjs';

const M = {
  wall: mat('wall', '#E8EBEF', 0.85), // as Gudang part 1
  trim: mat('trim', '#F07023', 0.7), // MPM orange, as the main hall's band
  opening: mat('opening', '#2A3140', 0.6),
  roller: mat('roller', '#9AA3B0', 0.6),
  column: mat('column', '#8A93A0', 0.6),
  canopy: mat('canopy', '#EEF1F5', 0.85),
};
const { box, save } = lowPolyModel('gudang-1-dock');

const WALL = 27; // Gudang part 1's east wall
const DOOR_X = 29.5; // the bay door
const FACE = -70; // front of the dock house, where the bay door is
const BACK = -76.5;
const EAST = 42;
const OPEN = -49; // open end of the canopy, toward the truck road
const H = 7.2;
const C0 = 6.4; // canopy underside, clear of the trailer and the door's name plate
const C1 = 6.8;

box(WALL, EAST, 0, H, BACK, FACE, M.wall);
// Forklift door, where pallets are put away (6.5 m along from the bay door, as at every bay).
const FX = DOOR_X + 6.5;
box(FX - 1.3, FX + 1.3, 0, 3.2, FACE, FACE + 0.05, M.opening);
box(FX - 1.3, FX + 1.3, 2.3, 3.2, FACE, FACE + 0.1, M.roller);
box(FX - 1.5, FX + 1.5, 3.2, 3.45, FACE, FACE + 0.15, M.trim);
// Canopy from the dock house to the open end, with an orange fascia on its open sides.
box(WALL, EAST, C0, C1, FACE, OPEN, M.canopy);
box(EAST, EAST + 0.3, C0 - 0.2, C1 + 0.1, FACE, OPEN + 0.3, M.trim);
box(WALL, EAST, C0 - 0.2, C1 + 0.1, OPEN, OPEN + 0.3, M.trim);
for (const z of [-59.5, OPEN - 0.6]) box(EAST - 0.6, EAST - 0.1, 0, C0, z - 0.25, z + 0.25, M.column);

await save();
