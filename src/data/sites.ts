import type { BayDef, BayLane, BuildingStyle, Carrier, CarrierId, ChargerDef, SiteCode, SiteDef, SiteType, Vec2 } from './types';
import { GEO_SITES } from './geo';

export const X_ROADS = [-300, -150, 0, 150, 300];
export const Z_ROADS = [-180, -60, 60, 180];
export const X_EDGE = 460;
export const Z_EDGE = 300;
export const ROAD_WIDTH = 18;
export const LANE_OFFSET = 2.4;
export const PLOT_HX = 62;
export const PLOT_HZ = 47;

export const SITE_ORDER: SiteCode[] = ['WH-01', 'WH-02', 'WH-03', 'WH-04', 'WH-05', 'WH-06'];

export const CARRIERS: Record<CarrierId, Carrier> = {
  waretrack: { id: 'waretrack', label: 'WareTrack', displayName: 'WARETRACK FREIGHT', color: '#2553E3', cabColor: '#2F5EEA' },
  nordline: { id: 'nordline', label: 'Nordline', displayName: 'NORDLINE LOGISTICS', color: '#159F9B', cabColor: '#F8FAFD' },
  cargoviva: { id: 'cargoviva', label: 'Cargoviva', displayName: 'CARGOVIVA', color: '#E16721', cabColor: '#F8FAFD' },
  bluepeak: { id: 'bluepeak', label: 'Bluepeak', displayName: 'BLUEPEAK FOODS', color: '#1E2F7A', cabColor: '#F8FAFD' },
};

interface SiteSpec {
  code: SiteCode;
  name: string;
  type: SiteType;
  address: string;
  badgeColor: string;
  capacity: number;
  center: Vec2;
  style: BuildingStyle;
  building: SiteDef['building'];
  faceZ: number;
  gateX: number;
  /** Door on the main facade at x, or on another wall at (x, z) with its own lane (local). */
  bays: { name: string; kind: BayDef['kind']; x: number; z?: number; lane?: BayLane; sideDoor?: boolean }[];
  chargers: { code: string; x: number; z: number; rate: number }[];
  home: Vec2;
  /** Site camera overrides (local target). Default: in front of the bays, 118 m away. */
  camera?: { distance?: number; target?: Vec2 };
  /** Local coordinates; converted to world in toSite. */
  entrance?: SiteDef['entrance'];
  road?: SiteDef['road'];
  plot?: SiteDef['plot'];
  spawnEvery?: SiteDef['spawnEvery'];
  maxTrucks?: number;
}


const STAGING_DX = 9;
const STAGING_DZ = [5, 9.5, 14];
const STAND_DX = 6;

/** WH-06 dock wall: the yard side of the warehouse footprint. */
const WH06_FACE = GEO_SITES['WH-06']!.main.bbox[3];

const SPECS: SiteSpec[] = [
  {
    code: 'WH-01',
    name: 'Riverside Hub',
    type: 'DEPOT',
    address: '12 Riverside Dr, Newark NJ',
    badgeColor: '#2553E3',
    capacity: 1800,
    center: { x: 75, z: -120 },
    style: 'depot',
    building: { x0: -52, x1: 6, z0: -42, z1: -2, height: 10 },
    faceZ: -2,
    gateX: 26,
    bays: [
      { name: 'Bay 1', kind: 'Bay', x: -38 },
      { name: 'Bay 2', kind: 'Bay', x: -18 },
    ],
    chargers: [{ code: 'C1', x: 54, z: 10, rate: 6 }],
    home: { x: 30, z: 14 },
  },
  {
    code: 'WH-02',
    name: 'Northgate DC',
    type: 'DISTRIBUTION CENTER',
    address: '480 Northgate Blvd, Newark NJ',
    badgeColor: '#2553E3',
    capacity: 4200,
    center: { x: -75, z: -120 },
    style: 'dc',
    building: { x0: -56, x1: 56, z0: -44, z1: 2, height: 12 },
    faceZ: 2,
    gateX: 26,
    bays: [
      { name: 'Bay 1', kind: 'Bay', x: -42 },
      { name: 'Bay 2', kind: 'Bay', x: -26 },
      { name: 'Bay 3', kind: 'Bay', x: -10 },
      { name: 'Bay 4', kind: 'Bay', x: 6 },
    ],
    chargers: [
      { code: 'C1', x: 36, z: 8, rate: 6 },
      { code: 'C2', x: 41, z: 8, rate: 6 },
    ],
    home: { x: 40, z: 15 },
  },
  {
    code: 'WH-03',
    name: 'Eastport Cold Chain',
    type: 'COLD STORE',
    address: '7 Harbor Way, Elizabeth NJ',
    badgeColor: '#1BA7B4',
    capacity: 1400,
    center: { x: 225, z: 0 },
    style: 'cold',
    building: { x0: -54, x1: 36, z0: -44, z1: 0, height: 11 },
    faceZ: 2.5,
    gateX: 26,
    bays: [
      { name: 'Bay 1', kind: 'Bay', x: -40 },
      { name: 'Bay 2', kind: 'Bay', x: -24 },
      { name: 'Bay 3', kind: 'Bay', x: -8 },
    ],
    chargers: [
      { code: 'C1', x: 44, z: 9, rate: 6 },
      { code: 'C2', x: 49, z: 9, rate: 6 },
    ],
    home: { x: 30, z: 16 },
  },
  {
    code: 'WH-04',
    name: 'Southfield Cross-Dock',
    type: 'CROSS-DOCK',
    address: '2200 Southfield Ave, Linden NJ',
    badgeColor: '#2553E3',
    capacity: 1600,
    center: { x: 75, z: 120 },
    style: 'crossdock',
    building: { x0: -58, x1: 40, z0: -40, z1: 4, height: 12 },
    faceZ: 4,
    gateX: -26,
    bays: [
      { name: 'In 1', kind: 'In', x: -46 },
      { name: 'In 2', kind: 'In', x: -32 },
      { name: 'In 3', kind: 'In', x: -18 },
      { name: 'Out 1', kind: 'Out', x: -2 },
      { name: 'Out 2', kind: 'Out', x: 12 },
      { name: 'Out 3', kind: 'Out', x: 26 },
    ],
    chargers: [
      { code: 'C1', x: 46, z: -8, rate: 8 },
      { code: 'C2', x: 51, z: -8, rate: 3 },
      { code: 'C3', x: 56, z: -8, rate: 2 },
    ],
    home: { x: 51, z: -22 },
  },
  {
    code: 'WH-05',
    name: 'Westgate Robotics Hub',
    type: 'AUTOMATED DC',
    address: '300 Westgate Rd, Kearny NJ',
    badgeColor: '#2553E3',
    capacity: 2400,
    center: { x: -225, z: 0 },
    style: 'automated',
    building: { x0: -56, x1: 44, z0: -44, z1: 4, height: 16 },
    faceZ: 4,
    gateX: 26,
    bays: [
      { name: 'Bay 1', kind: 'Bay', x: -42 },
      { name: 'Bay 2', kind: 'Bay', x: -26 },
      { name: 'Bay 3', kind: 'Bay', x: -10 },
      { name: 'Bay 4', kind: 'Bay', x: 6 },
    ],
    chargers: [
      { code: 'C1', x: 58, z: 10, rate: 6 },
      { code: 'C2', x: 58, z: 16, rate: 6 },
    ],
    home: { x: 30, z: 16 },
  },
  {
    // A real place (PRD addendum WH-06): the MPM Learning Center compound at full scale, drawn from
    // the user's labelled map and OpenStreetMap (src/data/geo). It is too large for a city block, so
    // it sits west of the city, its north side along a road where the city's cross streets end. The
    // main warehouse hall's east side (the dock side) faces +z; docks and traffic are virtual.
    code: 'WH-06',
    name: 'MPM Learning Center', // PRD addendum §8 allows a shorter display name; the city is in the address
    type: 'LEARNING CENTER',
    address: 'Jl. Raya Sedati No.101, Sidoarjo 61254',
    badgeColor: '#2553E3',
    capacity: 1200,
    center: { x: -680, z: 0 },
    style: 'geo',
    building: geoBuilding('WH-06'),
    faceZ: WH06_FACE,
    // Where docking trucks join the main dock lane, at the south end of the hall.
    gateX: -110,
    // Five bays on the main hall's east wall where the field was (user, 9 Oct 2026), and one in the
    // covered dock beside Gudang part 1's east wall, in the yard by the main office: the truck and
    // its forklift stand under the canopy, the door is in the dock house at its north end
    // (public/models/gudang-1-dock.glb; user, 10 Oct 2026). Gudang 1 is listed early so trucks are
    // sent there regularly, not only when the main bays are full.
    bays: [
      { name: 'Bay 1', kind: 'Bay', x: -116 },
      { name: 'Bay 2', kind: 'Bay', x: -130 },
      { name: 'Bay 3', kind: 'Bay', x: -144 },
      {
        name: 'Gudang 1',
        kind: 'Bay',
        x: 29.5,
        z: -70,
        // From the waiting point, pull over to the far side of the road and reverse in between the
        // hall's end and the main office, then straight up along the warehouse wall. Turning from
        // the far side keeps the cab clear of the hall's corner.
        lane: {
          entry: { x: 36, z: 0 },
          dockVia: [{ x: 48, z: -5.4 }],
          exit: { x: 40, z: -0.9 },
          exitVia: [],
          // The yard by the main office, and the road beside it that the reversing truck crosses.
          hold: { x0: 0, z0: -78, x1: 50, z1: 6 },
        },
        // The forklift door is part of the dock house model.
        sideDoor: false,
      },
      { name: 'Bay 4', kind: 'Bay', x: -158 },
      { name: 'Bay 5', kind: 'Bay', x: -172 },
    ],
    chargers: [
      { code: 'C1', x: -130, z: 26, rate: 6 },
      { code: 'C2', x: -134.5, z: 26, rate: 6 },
    ],
    home: { x: -150, z: 24 },
    // Trucks come down the north road (Jalan Rajawali), turn right through the gate by the security
    // post and wait on the road between the main office and the helmet store. To dock they drive on
    // down the east side of the main hall; they leave up the same road on the other lane and turn
    // right onto the north road, so no two truck paths cross outside the yard (user, 9 Oct 2026).
    // They come from the map's north edge and leave at its south edge, through the junctions where
    // the city's cross streets meet the north road (user, 10 Oct 2026).
    entrance: {
      in: [{ x: 197.6, z: -Z_EDGE - 30 }, { x: 197.6, z: -5.4 }, { x: 60, z: -5.4 }],
      // Trucks for the main bays drive on to wait beside the hall, close to their docks.
      waitMain: [{ x: -70, z: -5.4 }],
      dockVia: [{ x: -94, z: -5.4 }],
      entryLane: { x: -110, z: WH06_FACE + 26 },
      exitLane: { x: -106, z: WH06_FACE + 26 },
      exitVia: [{ x: -92, z: -0.9 }],
      exitFence: { x: 80, z: -0.9 },
      out: [{ x: 197.6, z: -0.9 }, { x: 197.6, z: Z_EDGE + 30 }],
      gate: { x: 188, z: -8.2, angle: -Math.PI / 2, len: 10 },
      yard: { x0: -200, z0: -20, x1: -80, z1: 35 },
      // From the main waiting point to the dock lane.
      sweep: { x0: -113, z0: -8, x1: -60, z1: 14 },
      // Both lanes of the road beside the hall: forklifts going to Gudang 1 keep to the strip along
      // the hall wall instead (user, 9 Oct 2026).
      noForklift: [
        { x0: -88, z0: -7.4, x1: 70, z1: 1 },
        // Not in the map data: the main office's west wing and the Gudang 1 dock house (GLB models).
        { x0: 46.4, z0: -101, x1: 57, z1: -12 },
        { x0: 27, z0: -76.5, x1: 42, z1: -70 },
      ],
      crossings: [
        // The gate: trucks turning in and trucks turning out reach into each other's lane.
        { x0: 180, z0: -18, x1: 206, z1: 10, clash: 'direction' },
        // Gudang 1: its trucks cross both lanes of the road beside the hall, and stop on the far one.
        { x0: 5, z0: -16, x1: 50, z1: 6, clash: 'lane' },
      ],
    },
    // As long as the city's avenues, so every cross street from the city meets it.
    road: { a: { x: 200, z: -Z_EDGE - 30 }, b: { x: 200, z: Z_EDGE + 30 } },
    // Forklift routes are planned over both loading areas and the road between them.
    plot: { x0: -200, z0: -80, x1: 62, z1: 34 },
    // At most one truck waits for a bay: a second one queueing behind it would block trucks leaving.
    maxTrucks: 7,
    // New trucks more often than at the city sites, so the five main bays stay busy (user, 9 Oct 2026).
    spawnEvery: [3, 5],
    // The five main bays at the south end of the hall.
    camera: { distance: 190, target: { x: -140, z: 0 } },
  },
];

/** Main building of a geo site: the bounding box of its map footprint, so the dock wall is straight. */
function geoBuilding(code: SiteCode): SiteDef['building'] {
  const m = GEO_SITES[code]!.main;
  const [x0, z0, x1, z1] = m.bbox;
  return { x0, z0, x1, z1, height: m.height };
}

const CHARGER_MODEL = '48 V lithium-ion forklift charger';

function toSite(s: SiteSpec): SiteDef {
  const c = s.center;
  const w = (x: number, z: number): Vec2 => ({ x: c.x + x, z: c.z + z });
  const rectW = (r: { x0: number; z0: number; x1: number; z1: number }) => ({ x0: c.x + r.x0, z0: c.z + r.z0, x1: c.x + r.x1, z1: c.z + r.z1 });
  const bays: BayDef[] = s.bays.map((b) => {
    const bay: BayDef = { id: `${s.code}:${b.name}`, site: s.code, name: b.name, kind: b.kind, door: w(b.x, b.z ?? s.faceZ), normal: { x: 0, z: 1 } };
    if (b.lane) {
      const p = (v: Vec2) => w(v.x, v.z);
      const l = b.lane;
      bay.lane = { entry: p(l.entry), dockVia: l.dockVia.map(p), exit: p(l.exit), exitVia: l.exitVia.map(p) };
      if (l.approach) bay.lane.approach = l.approach.map(p);
      if (l.hold) bay.lane.hold = rectW(l.hold);
    }
    if (b.sideDoor === false) bay.sideDoor = false;
    return bay;
  });
  const chargers: ChargerDef[] = s.chargers.map((ch) => ({
    id: `${s.code}:${ch.code}`,
    site: s.code,
    code: ch.code,
    model: CHARGER_MODEL,
    pos: w(ch.x, ch.z),
    ratePctPerMin: ch.rate,
  }));
  const staging: Vec2[] = [];
  const stagingStands: SiteDef['stagingStands'] = [];
  const stagingBay: string[] = [];
  for (const b of bays)
    for (const dz of STAGING_DZ) {
      staging.push({ x: b.door.x + STAGING_DX, z: b.door.z + dz });
      // Stand on the work-point side, forks toward +x (heading 0).
      stagingStands.push({ pos: { x: b.door.x + STAND_DX, z: b.door.z + dz }, angle: 0 });
      stagingBay.push(b.id);
    }
  const bayXs = s.bays.map((b) => b.x);
  const midX = (Math.min(...bayXs) + Math.max(...bayXs)) / 2;
  return {
    code: s.code,
    name: s.name,
    type: s.type,
    address: s.address,
    badgeColor: s.badgeColor,
    capacity: s.capacity,
    center: c,
    style: s.style,
    building: s.building,
    faceZ: s.faceZ,
    gateX: s.gateX,
    laneZ: s.faceZ + 26,
    bays,
    chargers,
    staging,
    stagingStands,
    stagingBay,
    forkliftHome: w(s.home.x, s.home.z),
    entrance: s.entrance && {
      ...s.entrance,
      in: s.entrance.in.map((p) => w(p.x, p.z)),
      dockVia: s.entrance.dockVia.map((p) => w(p.x, p.z)),
      entryLane: w(s.entrance.entryLane.x, s.entrance.entryLane.z),
      exitLane: w(s.entrance.exitLane.x, s.entrance.exitLane.z),
      exitVia: s.entrance.exitVia.map((p) => w(p.x, p.z)),
      exitFence: w(s.entrance.exitFence.x, s.entrance.exitFence.z),
      out: s.entrance.out.map((p) => w(p.x, p.z)),
      gate: { ...s.entrance.gate, ...w(s.entrance.gate.x, s.entrance.gate.z) },
      waitMain: s.entrance.waitMain?.map((p) => w(p.x, p.z)),
      yard: rectW(s.entrance.yard),
      sweep: rectW(s.entrance.sweep),
      noForklift: s.entrance.noForklift?.map(rectW),
      crossings: s.entrance.crossings?.map((x) => ({ ...rectW(x), clash: x.clash })),
    },
    road: s.road,
    plot: s.plot,
    spawnEvery: s.spawnEvery,
    maxTrucks: s.maxTrucks,
    camera: {
      azimuth: 0.5,
      polar: 0.92,
      distance: s.camera?.distance ?? 118,
      target: s.camera?.target ? w(s.camera.target.x, s.camera.target.z) : w(midX * 0.5 + 6, s.faceZ + 12),
    },
  };
}

export const SITES: SiteDef[] = SPECS.map(toSite);
export const SITE_BY_CODE = Object.fromEntries(SITES.map((s) => [s.code, s])) as Record<SiteCode, SiteDef>;
export const BAY_BY_ID: Record<string, BayDef> = Object.fromEntries(SITES.flatMap((s) => s.bays.map((b) => [b.id, b])));
export const CHARGER_BY_ID: Record<string, ChargerDef> = Object.fromEntries(
  SITES.flatMap((s) => s.chargers.map((c) => [c.id, c])),
);

/** Frames the city and the WH-06 district west of it. */
export const OVERVIEW_CAMERA = { azimuth: 0.22, polar: 0.78, distance: 1350, target: { x: -40, z: 40 } };

export const GATE_ENTRY_DX = 4.4;
export const GATE_EXIT_DX = -4.4;
export const GATE_BARRIER_Z = 36;

/** Gate geometry, world coordinates. */
export function gatePoints(site: SiteDef) {
  const e = site.entrance;
  if (e) {
    // Entered from the side: the trucks wait at the end of the entry road.
    const stop = e.in[e.in.length - 1];
    return {
      road: e.out[0], entryRoad: stop, exitRoad: e.out[0], stop, entryLane: e.entryLane, exitLane: e.exitLane,
      exitFence: e.exitFence, barrier: { x: e.gate.x, z: e.gate.z }, yardClearZ: Infinity,
    };
  }
  const gx = site.center.x + site.gateX;
  const cz = site.center.z;
  return {
    road: { x: gx, z: cz + 60 }, // centre of the road in front of the gate
    entryRoad: { x: gx + GATE_ENTRY_DX, z: cz + 60 },
    exitRoad: { x: gx + GATE_EXIT_DX, z: cz + 60 },
    stop: { x: gx + GATE_ENTRY_DX, z: cz + GATE_BARRIER_Z + 8.8 }, // waiting truck centre, nose at the barrier
    entryLane: { x: gx + GATE_ENTRY_DX, z: cz + site.laneZ },
    exitLane: { x: gx + GATE_EXIT_DX, z: cz + site.laneZ },
    exitFence: { x: gx + GATE_EXIT_DX, z: cz + PLOT_HZ + 1 },
    barrier: { x: gx, z: cz + GATE_BARRIER_Z },
    /** A departing truck still counts as "in the yard" (blocking the next docking) below this z. */
    yardClearZ: cz + Math.max(GATE_BARRIER_Z, site.laneZ + 11),
  };
}

/** A bay's dock lane: its own, or the site's (side entrance or gate). */
export function bayLane(site: SiteDef, bay: BayDef): BayLane {
  if (bay.lane) return bay.lane;
  const cached = mainLanes.get(site.code);
  if (cached) return cached;
  const g = gatePoints(site);
  const e = site.entrance;
  const lane: BayLane = { entry: g.entryLane, dockVia: e?.dockVia ?? [], exit: g.exitLane, exitVia: e?.exitVia ?? [] };
  if (e?.waitMain) lane.approach = e.waitMain;
  if (e) lane.hold = e.yard;
  mainLanes.set(site.code, lane);
  return lane;
}
const mainLanes = new Map<SiteCode, BayLane>();

/** Where a parked truck's centre sits for a bay (trailer rear against the door). */
export function bayParkPoint(bay: BayDef): Vec2 {
  return { x: bay.door.x + bay.normal.x * 8.6, z: bay.door.z + bay.normal.z * 8.6 };
}

/** Where a forklift stands to work a parked truck (beside the trailer). */
export function bayWorkPoint(bay: BayDef): Vec2 {
  return { x: bay.door.x + 3.6, z: bay.door.z + 4.5 };
}

/** Where a forklift stands to put a pallet into the building next to the bay (facing the facade). */
export function bayPutawayPoint(bay: BayDef): Vec2 {
  return { x: bay.door.x + 6.5, z: bay.door.z + 3.4 };
}

/** Forklift position and heading for picking/dropping at a staging slot: beside it, forks in. */
export function stagingStand(site: SiteDef, slot: number): { pos: Vec2; angle: number } {
  return site.stagingStands[slot];
}

/** Heading that faces the building from a putaway point. */
export const PUTAWAY_ANGLE = Math.PI / 2;
/** Heading that faces a parked trailer from its work point (the work point is on the +x side). */
export const WORK_ANGLE = Math.PI;
