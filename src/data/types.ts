export type SiteCode = 'WH-01' | 'WH-02' | 'WH-03' | 'WH-04' | 'WH-05' | 'WH-06';
export type SiteType = 'DEPOT' | 'DISTRIBUTION CENTER' | 'COLD STORE' | 'CROSS-DOCK' | 'AUTOMATED DC' | 'LEARNING CENTER';
export type TruckStatus = 'En route' | 'At gate' | 'Docking' | 'Unloading' | 'Loading';
export type BayStatus = 'Available' | 'Booked' | 'Arriving' | 'Unloading' | 'Loading';
export type ForkliftStatus = 'Idle' | 'Loading truck' | 'Unloading truck' | 'Charging';
export type PalletStatus = 'Staged' | 'Moving' | 'Stored' | 'Loaded';
export type CarrierId = 'waretrack' | 'nordline' | 'cargoviva' | 'bluepeak';
export type SkuIcon = 'box' | 'container' | 'helmet' | 'tape' | 'panel' | 'chair' | 'gloves' | 'peas' | 'water';

export interface Vec2 {
  x: number;
  z: number;
}

export interface Carrier {
  id: CarrierId;
  label: string;
  displayName: string;
  color: string;
  cabColor: string;
}

export interface InventoryItem {
  sku: string;
  name: string;
  units: number;
  reorderPoint: number;
  icon: SkuIcon;
  category: string;
  unitsPerPallet: number;
  kgPerPallet: number;
}

export interface BayDef {
  id: string; 
  site: SiteCode;
  name: string; 
  kind: 'Bay' | 'In' | 'Out';
  door: Vec2; 
  normal: Vec2; 
  /**
   * Own dock lane (world), for a bay on another wall than the site's main facade (WH-06 Gudang 1).
   * Default: the site's lane and gate.
   */
  lane?: BayLane;
  /** Draw the small forklift door beside the bay (default true). */
  sideDoor?: boolean;
}

/** Where docking trucks join a bay's dock lane and where leaving trucks leave it (world). */
/**
 * A crossing of truck flows (side entrance). 'direction': trucks coming in and trucks going out take
 * turns. 'lane': trucks of a bay with its own lane and the other trucks take turns.
 */
export interface Crossing {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  clash: 'direction' | 'lane';
}

export interface BayLane {
  entry: Vec2;
  dockVia: Vec2[];
  exit: Vec2;
  exitVia: Vec2[];
  /** Road on from the shared waiting point to this lane's own waiting point (its last point). */
  approach?: Vec2[];
  /** While a truck of another group, or one leaving this lane, is inside this area, none docks here. */
  hold?: { x0: number; z0: number; x1: number; z1: number };
}

export interface ChargerDef {
  id: string; 
  site: SiteCode;
  code: string;
  model: string;
  pos: Vec2;
  ratePctPerMin: number;
}

export type BuildingStyle = 'depot' | 'dc' | 'cold' | 'crossdock' | 'automated' | 'geo';

export interface SiteDef {
  code: SiteCode;
  name: string;
  type: SiteType;
  address: string;
  badgeColor: string;
  capacity: number;
  center: Vec2; // block centre, world
  style: BuildingStyle;
  building: { x0: number; x1: number; z0: number; z1: number; height: number };
  faceZ: number; 
  gateX: number; 
  laneZ: number; 
  bays: BayDef[];
  chargers: ChargerDef[];
  staging: Vec2[]; // staging slots, world
  stagingStands: { pos: Vec2; angle: number }[]; 
  stagingBay: string[]; 
  forkliftHome: Vec2; 
  /**
   * A yard entered from the side, along a road through the compound (world coordinates; WH-06).
   * Trucks appear at the start of `in` and wait for the yard at its end; docking runs through
   * `dockVia` to `entryLane`; leaving runs from `exitLane` through `exitVia` to `exitFence`,
   * then along `out` to where trucks leave the map. Default: a gate in the fence facing the bays,
   * on a city road.
   */
  entrance?: {
    in: Vec2[];
    dockVia: Vec2[];
    entryLane: Vec2;
    exitLane: Vec2;
    exitVia: Vec2[];
    exitFence: Vec2;
    out: Vec2[];
    /** Barrier post at the compound entrance; the arm (len metres) points along the heading `angle`. */
    gate: { x: number; z: number; angle: number; len: number };
    /** Road on from the shared waiting point to the main lane's own waiting point. */
    waitMain?: Vec2[];
    /** Hold area of the main lane (see BayLane.hold). */
    yard: { x0: number; z0: number; x1: number; z1: number };
    /** Area trucks sweep between the waiting point and the dock lane. */
    sweep: { x0: number; z0: number; x1: number; z1: number };
    /**
     * Areas forklift routes never run through: truck lanes (forklifts cross them only where trucks
     * dock) and buildings that are not in the map data.
     */
    noForklift?: { x0: number; z0: number; x1: number; z1: number }[];
    /** Places where turning trucks reach into another lane: one flow of trucks at a time. */
    crossings?: Crossing[];
  };
  /** Decorative road outside the city for such a site (local, straight, axis-aligned). */
  road?: { a: Vec2; b: Vec2 };
  /** Minutes between new trucks for this site (default 6–10). */
  spawnEvery?: [number, number];
  /** Area forklift routes are planned in (local). Default: the plot inside the fence. */
  plot?: { x0: number; z0: number; x1: number; z1: number };
  /** Most trucks on their way to or at the site at once (default: bays + 2). */
  maxTrucks?: number;
  camera: { azimuth: number; polar: number; distance: number; target: Vec2 };
}

export interface ShipmentStep {
  label: string;
  state: 'done' | 'active' | 'todo';
  time?: number; 
  eta?: number; 
}

export interface Shipment {
  code: string;
  truck: string;
  customer: string;
  destination: string;
  orderConfirmed: number;
  picked: number;
  loaded?: number; 
  inTransit?: number; 
  deliveredEta: number;
  transitEta?: number; 
}

export type TruckPhase = 'enroute' | 'atgate' | 'docking' | 'working' | 'departing';

export interface Truck {
  code: string;
  carrier: CarrierId;
  driver: string;
  plate: string;
  site: SiteCode;
  direction: 'inbound' | 'outbound';
  phase: TruckPhase;
  bay?: string; 
  phaseStart: number;
  gateArrivedAt?: number;
  path?: PathData;
  s: number; 
  v: number; 
  blockedBy?: string; 
  reverseFrom?: number; 
  cruiseKmh: number;
  work: { done: number; total: number; period: number; cycleStart: number; forklift?: string };
  cargo: { onBoard: number; capacity: number; kgPerPallet: number };
  shipment: string;
}

export interface Forklift {
  code: string;
  site: SiteCode;
  operator: string;
  model: string;
  status: ForkliftStatus;
  battery: number;
  charger: string; 
  movesToday: number;
  truck?: string;
  carrying?: string; 
  travel?: { route: Vec2[]; start: number; end: number; endAngle?: number };
  pendingHome?: number;
  retryAt?: number;
  pos: Vec2;
  heading: number;
}

export interface Pallet {
  code: string;
  sku: string;
  site: SiteCode;
  status: PalletStatus;
  slot?: number; 
  forklift?: string;
  truck?: string;
  quantity: number;
  grossKg: number;
  lot: string;
  received: string;
  pinned: boolean;
}

export interface ChargerState {
  id: string;
  sessionsToday: number;
  energyKwh: number;
  charging?: string; // forklift code
}

export interface BayState {
  id: string;
  trucksToday: number;
}

export interface SiteState {
  code: SiteCode;
  stock: number;
  stockDelta: number;
  trucksDelta: number;
  onTimePct: number;
  onTimeDelta: number;
  deliveries30d: number;
  outboundToday: number;
  putawaysToday: number;
  inventory: InventoryItem[];
}

export interface PathData {
  pts: Vec2[];
  cum: number[]; 
  length: number;
}

export type Selection =
  | { kind: 'truck'; id: string }
  | { kind: 'forklift'; id: string }
  | { kind: 'pallet'; id: string }
  | { kind: 'bay'; id: string }
  | { kind: 'charger'; id: string }
  | null;

export type SiteView = SiteCode | 'ALL';
