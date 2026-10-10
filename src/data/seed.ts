// Seed data (PRD §15). Values come from the source video unless marked "(contoh)".
// Times are simulated minutes since midnight; t('09:40') = 580.
import type { CarrierId, InventoryItem, SiteCode, SkuIcon } from './types';

export const t = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const SIM_START = t('09:40');

/** Minute at which each site's values were captured in the video. Times are shifted by SIM_START - capture. */
export const CAPTURED_AT: Record<SiteCode, number> = {
  'WH-01': t('09:40'),
  'WH-02': t('09:48'),
  'WH-03': t('09:48'),
  'WH-04': t('09:40'),
  'WH-05': t('09:52'),
  'WH-06': t('09:40'), // (contoh)
};

interface SkuDef {
  sku: string;
  name: string;
  icon: SkuIcon;
  category: string;
  unitsPerPallet: number;
  kgPerPallet: number;
}

export const SKUS: Record<string, SkuDef> = {
  box: { sku: 'PKG-BOX-M', name: 'Cardboard Box (M)', icon: 'box', category: 'PACKAGING', unitsPerPallet: 60, kgPerPallet: 180 },
  container: { sku: 'PKG-CNT-B', name: 'Plastic Container', icon: 'container', category: 'PACKAGING', unitsPerPallet: 24, kgPerPallet: 140 },
  helmet: { sku: 'PPE-HLM-Y', name: 'Safety Helmet', icon: 'helmet', category: 'PPE', unitsPerPallet: 82, kgPerPallet: 56 },
  tape: { sku: 'PKG-TAPE-48', name: 'Packing Tape', icon: 'tape', category: 'PACKAGING', unitsPerPallet: 240, kgPerPallet: 210 },
  panel: { sku: 'ELC-LED-60', name: 'LED Panel 60×60', icon: 'panel', category: 'ELECTRICAL', unitsPerPallet: 40, kgPerPallet: 320 },
  chair: { sku: 'FUR-CHR-01', name: 'Office Chair', icon: 'chair', category: 'FURNITURE', unitsPerPallet: 12, kgPerPallet: 190 },
  gloves: { sku: 'PPE-GLV-N', name: 'Nitrile Gloves', icon: 'gloves', category: 'PPE', unitsPerPallet: 120, kgPerPallet: 240 },
  peas: { sku: 'FRZ-PEA-10', name: 'Frozen Peas 10 kg', icon: 'peas', category: 'FROZEN', unitsPerPallet: 60, kgPerPallet: 620 },
  water: { sku: 'BEV-WTR-24', name: 'Spring Water 24-pack', icon: 'water', category: 'BEVERAGE', unitsPerPallet: 50, kgPerPallet: 480 },
};

const inv = (key: keyof typeof SKUS, units: number, low: boolean): InventoryItem => {
  const d = SKUS[key];
  return { ...d, units, reorderPoint: low ? units + 40 : Math.round(units * 0.4) };
};

export interface SiteSeed {
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

export const SITE_SEEDS: Record<SiteCode, SiteSeed> = {
  'WH-01': {
    stock: 1412, stockDelta: 15, trucksDelta: 1, onTimePct: 96.6, onTimeDelta: 0.4, deliveries30d: 412,
    outboundToday: 23, putawaysToday: 15,
    inventory: [inv('box', 1906, false), inv('container', 297, false), inv('helmet', 212, true), inv('tape', 4448, false)],
  },
  'WH-02': {
    stock: 3310, stockDelta: 35, trucksDelta: 2, onTimePct: 98.2, onTimeDelta: 0.4, deliveries30d: 655,
    outboundToday: 21, putawaysToday: 35,
    inventory: [inv('panel', 1787, false), inv('chair', 174, false), inv('box', 993, true), inv('gloves', 5793, false)],
  },
  'WH-03': {
    stock: 990, stockDelta: 20, trucksDelta: 2, onTimePct: 96.0, onTimeDelta: 0.4, deliveries30d: 498,
    outboundToday: 31, putawaysToday: 20,
    inventory: [inv('peas', 334, false), inv('water', 364, false), inv('gloves', 495, true), inv('container', 208, false)],
  },
  'WH-04': {
    stock: 610, stockDelta: 20, trucksDelta: 2, onTimePct: 96.2, onTimeDelta: 0.4, deliveries30d: 532,
    outboundToday: 29, putawaysToday: 20,
    inventory: [inv('water', 288, false), inv('tape', 1922, false), inv('panel', 73, true), inv('helmet', 320, false)],
  },
  'WH-05': {
    stock: 1730, stockDelta: 25, trucksDelta: 2, onTimePct: 95.9, onTimeDelta: 0.4, deliveries30d: 590,
    outboundToday: 33, putawaysToday: 25,
    inventory: [inv('panel', 934, false), inv('box', 1817, false), inv('gloves', 865, true), inv('helmet', 908, false)],
  },
  // WH-06 MPM Learning Center, Sidoarjo (contoh, PRD addendum §9)
  'WH-06': {
    stock: 640, stockDelta: 12, trucksDelta: 1, onTimePct: 97.1, onTimeDelta: 0.3, deliveries30d: 286,
    outboundToday: 14, putawaysToday: 11,
    inventory: [inv('helmet', 1340, false), inv('gloves', 2160, false), inv('box', 880, false), inv('tape', 1450, false), inv('container', 96, true)],
  },
};

export interface ShipmentSeed {
  code: string;
  customer: string;
  destination: string;
  orderConfirmed: number;
  picked: number;
  loaded?: number;
  inTransit?: number;
  deliveredEta: number;
  transitEta?: number;
}

export interface TruckSeed {
  code: string;
  carrier: CarrierId;
  driver: string;
  plate: string;
  site: SiteCode;
  direction: 'inbound' | 'outbound';
  phase: 'enroute' | 'atgate' | 'docking' | 'working';
  /** Bay name; none for a truck still on its way that has no bay yet. */
  bay?: string;
  gateEta?: number;
  gateArrivedAt?: number;
  dockStart?: number;
  dockEnd?: number;
  work: { done: number; total: number; period: number; cycleStart?: number; forklift?: string };
  cargo: { onBoard: number; capacity: number; kgPerPallet: number };
  cruiseKmh: number;
  shipment: ShipmentSeed;
}

export const TRUCK_SEEDS: TruckSeed[] = [
  // WH-04 Southfield Cross-Dock — state at 09:40 (PRD §12.6, §15.4)
  {
    code: 'TRK-2205', carrier: 'waretrack', driver: 'Sam Chen', plate: 'ZBY-5648', site: 'WH-04', direction: 'inbound',
    phase: 'working', bay: 'In 1', cruiseKmh: 34,
    work: { done: 2, total: 6, period: 3.75, cycleStart: t('09:40'), forklift: 'FL-10' },
    cargo: { onBoard: 4, capacity: 7, kgPerPallet: 300 },
    shipment: { code: 'SHP-78450', customer: 'Oakridge Market', destination: 'WH-04 Southfield Cross-Dock',
      orderConfirmed: t('06:57'), picked: t('08:25'), loaded: t('09:10'), inTransit: t('09:36'), deliveredEta: t('10:05') },
  },
  {
    code: 'TRK-2229', carrier: 'nordline', driver: 'Noah Tanaka', plate: 'CRX-5820', site: 'WH-04', direction: 'outbound',
    phase: 'working', bay: 'Out 2', cruiseKmh: 36,
    work: { done: 3, total: 6, period: 5, cycleStart: t('09:40'), forklift: 'FL-11' },
    cargo: { onBoard: 3, capacity: 7, kgPerPallet: 467 },
    shipment: { code: 'SHP-78452', customer: 'Harbor & Co.', destination: 'Providence, RI',
      orderConfirmed: t('06:36'), picked: t('08:16'), transitEta: t('10:03'), deliveredEta: t('10:35') },
  },
  {
    code: 'TRK-2307', carrier: 'nordline', driver: 'Ada Larsen', plate: 'EKT-2697', site: 'WH-04', direction: 'inbound',
    phase: 'enroute', bay: 'In 3', gateEta: t('09:43'), cruiseKmh: 38,
    work: { done: 0, total: 4, period: 2.5 },
    cargo: { onBoard: 4, capacity: 8, kgPerPallet: 300 },
    shipment: { code: 'SHP-78456', customer: 'Sunvale Grocers', destination: 'WH-04 Southfield Cross-Dock',
      orderConfirmed: t('06:37'), picked: t('08:16'), loaded: t('09:12'), inTransit: t('09:26'), deliveredEta: t('10:26') },
  },
  {
    code: 'TRK-2481', carrier: 'cargoviva', driver: 'Alex Haddad', plate: 'WKH-3157', site: 'WH-04', direction: 'inbound',
    phase: 'enroute', bay: 'In 2', gateEta: t('09:45'), cruiseKmh: 37,
    work: { done: 0, total: 5, period: 2.5 },
    cargo: { onBoard: 5, capacity: 10, kgPerPallet: 380 },
    shipment: { code: 'SHP-78466', customer: 'Halcyon Retail', destination: 'WH-04 Southfield Cross-Dock',
      orderConfirmed: t('07:03'), picked: t('08:29'), loaded: t('09:12'), inTransit: t('09:28'), deliveredEta: t('10:25') },
  },

  // WH-01 Riverside Hub — captured 09:40
  {
    code: 'TRK-2051', carrier: 'waretrack', driver: 'Maya Brooks', plate: 'LTR-4471', site: 'WH-01', direction: 'outbound',
    phase: 'working', bay: 'Bay 1', cruiseKmh: 35,
    work: { done: 2, total: 6, period: 3.25, cycleStart: t('09:40'), forklift: 'FL-01' },
    cargo: { onBoard: 2, capacity: 7, kgPerPallet: 240 },
    shipment: { code: 'SHP-78442', customer: 'Keystone Supply', destination: 'Philadelphia, PA',
      orderConfirmed: t('06:49'), picked: t('08:19'), transitEta: t('10:01'), deliveredEta: t('10:33') },
  },
  {
    code: 'TRK-2287', carrier: 'bluepeak', driver: 'Owen Price', plate: 'JNR-3308', site: 'WH-01', direction: 'inbound',
    phase: 'enroute', bay: 'Bay 2', gateEta: t('09:43'), cruiseKmh: 33,
    work: { done: 0, total: 5, period: 2.5 },
    cargo: { onBoard: 5, capacity: 8, kgPerPallet: 260 },
    shipment: { code: 'SHP-78446', customer: 'Riverside Pantry', destination: 'WH-01 Riverside Hub',
      orderConfirmed: t('06:12'), picked: t('07:58'), loaded: t('08:55'), inTransit: t('09:18'), deliveredEta: t('10:20') },
  },

  // WH-02 Northgate DC — captured 09:48
  {
    code: 'TRK-2127', carrier: 'bluepeak', driver: 'Grace Kim', plate: 'PLM-6614', site: 'WH-02', direction: 'outbound',
    phase: 'working', bay: 'Bay 3', cruiseKmh: 35,
    work: { done: 4, total: 7, period: 3, cycleStart: t('09:48'), forklift: 'FL-03' },
    cargo: { onBoard: 4, capacity: 7, kgPerPallet: 300 },
    shipment: { code: 'SHP-78438', customer: 'Metro Office Co.', destination: 'Edison, NJ',
      orderConfirmed: t('06:20'), picked: t('08:02'), transitEta: t('10:05'), deliveredEta: t('10:40') },
  },
  {
    code: 'TRK-2104', carrier: 'nordline', driver: 'Ravi Patel', plate: 'KRT-5521', site: 'WH-02', direction: 'inbound',
    phase: 'working', bay: 'Bay 1', cruiseKmh: 36,
    work: { done: 1, total: 5, period: 3.25, cycleStart: t('09:48'), forklift: 'FL-04' },
    cargo: { onBoard: 4, capacity: 6, kgPerPallet: 300 },
    shipment: { code: 'SHP-78444', customer: 'Northpoint Foods', destination: 'WH-02 Northgate DC',
      orderConfirmed: t('06:44'), picked: t('08:21'), loaded: t('09:16'), inTransit: t('09:42'), deliveredEta: t('10:15') },
  },
  {
    code: 'TRK-2658', carrier: 'cargoviva', driver: 'Lena Fischer', plate: 'CVA-1187', site: 'WH-02', direction: 'inbound',
    phase: 'docking', bay: 'Bay 2', dockStart: t('09:47'), dockEnd: t('09:49'), cruiseKmh: 34,
    work: { done: 0, total: 4, period: 2.5 },
    cargo: { onBoard: 4, capacity: 8, kgPerPallet: 350 },
    shipment: { code: 'SHP-78449', customer: 'Harbor & Co.', destination: 'WH-02 Northgate DC',
      orderConfirmed: t('06:58'), picked: t('08:30'), loaded: t('09:05'), inTransit: t('09:24'), deliveredEta: t('10:30') },
  },
  {
    code: 'TRK-2526', carrier: 'waretrack', driver: 'Tom Reyes', plate: 'QLM-4410', site: 'WH-02', direction: 'inbound',
    phase: 'enroute', bay: 'Bay 4', gateEta: t('09:51'), cruiseKmh: 39,
    work: { done: 0, total: 6, period: 2.5 },
    cargo: { onBoard: 6, capacity: 8, kgPerPallet: 280 },
    shipment: { code: 'SHP-78453', customer: 'Oakridge Market', destination: 'WH-02 Northgate DC',
      orderConfirmed: t('07:10'), picked: t('08:41'), loaded: t('09:20'), inTransit: t('09:31'), deliveredEta: t('10:38') },
  },

  // WH-03 Eastport Cold Chain — captured 09:48
  {
    code: 'TRK-2148', carrier: 'bluepeak', driver: 'Priya Shah', plate: 'HCL-7731', site: 'WH-03', direction: 'inbound',
    phase: 'working', bay: 'Bay 2', cruiseKmh: 33,
    work: { done: 3, total: 4, period: 4, cycleStart: t('09:48'), forklift: 'FL-07' },
    cargo: { onBoard: 1, capacity: 6, kgPerPallet: 620 },
    shipment: { code: 'SHP-78448', customer: 'FreshWay Markets', destination: 'WH-03 Eastport Cold Chain',
      orderConfirmed: t('06:40'), picked: t('08:19'), loaded: t('09:16'), inTransit: t('09:42'), deliveredEta: t('10:05') },
  },
  {
    code: 'TRK-2471', carrier: 'bluepeak', driver: 'Marco Silva', plate: 'BLP-6602', site: 'WH-03', direction: 'inbound',
    phase: 'docking', bay: 'Bay 1', dockStart: t('09:47'), dockEnd: t('09:49'), cruiseKmh: 32,
    work: { done: 0, total: 4, period: 2.5 },
    cargo: { onBoard: 4, capacity: 6, kgPerPallet: 620 },
    shipment: { code: 'SHP-78464', customer: 'Sunvale Grocers', destination: 'WH-03 Eastport Cold Chain',
      orderConfirmed: t('06:51'), picked: t('08:22'), loaded: t('09:02'), inTransit: t('09:20'), deliveredEta: t('10:28') },
  },
  {
    code: 'TRK-2603', carrier: 'bluepeak', driver: 'Alex Walsh', plate: 'HUL-7099', site: 'WH-03', direction: 'inbound',
    phase: 'atgate', bay: 'Bay 3', gateArrivedAt: t('09:47'), cruiseKmh: 34,
    work: { done: 0, total: 4, period: 2.5 },
    cargo: { onBoard: 4, capacity: 8, kgPerPallet: 600 },
    shipment: { code: 'SHP-78472', customer: 'Harbor & Co.', destination: 'WH-03 Eastport Cold Chain',
      orderConfirmed: t('07:07'), picked: t('08:34'), loaded: t('09:18'), inTransit: t('09:32'), deliveredEta: t('10:32') },
  },

  // WH-05 Westgate Robotics Hub — captured 09:52
  {
    code: 'TRK-2339', carrier: 'cargoviva', driver: 'Hannah Cole', plate: 'VTR-2208', site: 'WH-05', direction: 'outbound',
    phase: 'working', bay: 'Bay 1', cruiseKmh: 37,
    work: { done: 1, total: 5, period: 3.25, cycleStart: t('09:52'), forklift: 'FL-15' },
    cargo: { onBoard: 1, capacity: 6, kgPerPallet: 330 },
    shipment: { code: 'SHP-78458', customer: 'Brightline Electronics', destination: 'Trenton, NJ',
      orderConfirmed: t('06:53'), picked: t('08:28'), transitEta: t('10:13'), deliveredEta: t('10:45') },
  },
  {
    code: 'TRK-2574', carrier: 'nordline', driver: 'Diego Ramos', plate: 'PKL-8823', site: 'WH-05', direction: 'outbound',
    phase: 'working', bay: 'Bay 2', cruiseKmh: 35,
    work: { done: 0, total: 4, period: 3 },
    cargo: { onBoard: 0, capacity: 6, kgPerPallet: 300 },
    shipment: { code: 'SHP-78462', customer: 'Harbor & Co.', destination: 'Newark, NJ',
      orderConfirmed: t('07:15'), picked: t('08:50'), transitEta: t('10:30'), deliveredEta: t('11:05') },
  },
  {
    code: 'TRK-2372', carrier: 'waretrack', driver: 'Luis Walsh', plate: 'TTC-2870', site: 'WH-05', direction: 'inbound',
    phase: 'docking', bay: 'Bay 3', dockStart: t('09:51'), dockEnd: t('09:53'), cruiseKmh: 36,
    work: { done: 0, total: 4, period: 2.5 },
    cargo: { onBoard: 4, capacity: 6, kgPerPallet: 300 },
    shipment: { code: 'SHP-78460', customer: 'Sunvale Grocers', destination: 'WH-05 Westgate Robotics Hub',
      orderConfirmed: t('07:01'), picked: t('08:32'), loaded: t('09:21'), inTransit: t('09:35'), deliveredEta: t('10:33') },
  },
  {
    code: 'TRK-2412', carrier: 'nordline', driver: 'Ana Lopez', plate: 'DXL-4412', site: 'WH-05', direction: 'inbound',
    phase: 'atgate', bay: 'Bay 4', gateArrivedAt: t('09:51'), cruiseKmh: 35,
    work: { done: 0, total: 5, period: 2.5 },
    cargo: { onBoard: 5, capacity: 8, kgPerPallet: 280 },
    shipment: { code: 'SHP-78468', customer: 'Halcyon Retail', destination: 'WH-05 Westgate Robotics Hub',
      orderConfirmed: t('07:20'), picked: t('08:45'), loaded: t('09:24'), inTransit: t('09:38'), deliveredEta: t('10:40') },
  },

  // WH-06 MPM Learning Center, Sidoarjo — (contoh), state at 09:40. Codes sit outside the ranges the
  // simulation generates (TRK-2000…2999, SHP-78474+, PAL-1100+).
  // Five trucks at the main hall's docks, one waiting for Gudang 1, one on the way (user, 9 Oct 2026).
  {
    code: 'TRK-3061', carrier: 'waretrack', driver: 'Bayu Pratama', plate: 'W 8214 NA', site: 'WH-06', direction: 'outbound',
    phase: 'working', bay: 'Bay 2', cruiseKmh: 34,
    work: { done: 1, total: 5, period: 3.5, cycleStart: t('09:40'), forklift: 'FL-18' },
    cargo: { onBoard: 1, capacity: 6, kgPerPallet: 210 },
    shipment: { code: 'SHP-60601', customer: 'Arunika Motor Parts', destination: 'Malang, Jawa Timur',
      orderConfirmed: t('06:45'), picked: t('08:20'), transitEta: t('10:05'), deliveredEta: t('11:25') },
  },
  {
    code: 'TRK-3064', carrier: 'bluepeak', driver: 'Eko Saputra', plate: 'L 9087 UD', site: 'WH-06', direction: 'inbound',
    phase: 'working', bay: 'Bay 1', cruiseKmh: 33,
    work: { done: 1, total: 4, period: 3, cycleStart: t('09:40'), forklift: 'FL-20' },
    cargo: { onBoard: 3, capacity: 6, kgPerPallet: 260 },
    shipment: { code: 'SHP-60603', customer: 'Bentala Niaga', destination: 'WH-06 MPM Learning Center',
      orderConfirmed: t('06:30'), picked: t('08:05'), loaded: t('08:50'), inTransit: t('09:05'), deliveredEta: t('10:05') },
  },
  {
    code: 'TRK-3067', carrier: 'nordline', driver: 'Rina Kurnia', plate: 'W 1563 QK', site: 'WH-06', direction: 'outbound',
    phase: 'working', bay: 'Bay 3', cruiseKmh: 36,
    work: { done: 1, total: 4, period: 3.2, cycleStart: t('09:40'), forklift: 'FL-21' },
    cargo: { onBoard: 1, capacity: 6, kgPerPallet: 230 },
    shipment: { code: 'SHP-60605', customer: 'Candra Moto Supply', destination: 'Gresik, Jawa Timur',
      orderConfirmed: t('07:05'), picked: t('08:40'), transitEta: t('10:15'), deliveredEta: t('10:55') },
  },
  {
    code: 'TRK-3070', carrier: 'nordline', driver: 'Andi Wijaya', plate: 'W 4417 KS', site: 'WH-06', direction: 'inbound',
    phase: 'working', bay: 'Bay 4', cruiseKmh: 35,
    work: { done: 2, total: 6, period: 3.4, cycleStart: t('09:40'), forklift: 'FL-22' },
    cargo: { onBoard: 4, capacity: 7, kgPerPallet: 240 },
    shipment: { code: 'SHP-60607', customer: 'Daksa Retail', destination: 'WH-06 MPM Learning Center',
      orderConfirmed: t('06:50'), picked: t('08:15'), loaded: t('08:55'), inTransit: t('09:10'), deliveredEta: t('10:20') },
  },
  {
    code: 'TRK-3073', carrier: 'cargoviva', driver: 'Putri Anggraini', plate: 'L 2286 BZ', site: 'WH-06', direction: 'outbound',
    phase: 'working', bay: 'Bay 5', cruiseKmh: 34,
    work: { done: 0, total: 5, period: 3 },
    cargo: { onBoard: 0, capacity: 6, kgPerPallet: 220 },
    shipment: { code: 'SHP-60609', customer: 'Gemilang Sparepart', destination: 'Surabaya, Jawa Timur',
      orderConfirmed: t('07:10'), picked: t('08:45'), transitEta: t('10:30'), deliveredEta: t('11:05') },
  },
  {
    code: 'TRK-3076', carrier: 'bluepeak', driver: 'Fajar Nugroho', plate: 'W 7720 RT', site: 'WH-06', direction: 'inbound',
    phase: 'atgate', bay: 'Gudang 1', gateArrivedAt: t('09:39'), cruiseKmh: 33,
    work: { done: 0, total: 3, period: 2.5 },
    cargo: { onBoard: 3, capacity: 5, kgPerPallet: 250 },
    shipment: { code: 'SHP-60611', customer: 'Kirana Dealer Group', destination: 'WH-06 MPM Learning Center',
      orderConfirmed: t('06:40'), picked: t('08:10'), loaded: t('08:45'), inTransit: t('09:00'), deliveredEta: t('10:10') },
  },
  {
    code: 'TRK-3079', carrier: 'waretrack', driver: 'Agus Prasetyo', plate: 'L 6031 GN', site: 'WH-06', direction: 'outbound',
    phase: 'enroute', gateEta: t('09:45'), cruiseKmh: 36,
    work: { done: 0, total: 4, period: 2.5 },
    cargo: { onBoard: 0, capacity: 6, kgPerPallet: 230 },
    shipment: { code: 'SHP-60613', customer: 'Arunika Motor Parts', destination: 'Mojokerto, Jawa Timur',
      orderConfirmed: t('07:20'), picked: t('08:55'), transitEta: t('10:40'), deliveredEta: t('11:20') },
  },
];

export interface ForkliftSeed {
  code: string;
  site: SiteCode;
  operator: string;
  model: string;
  status: 'working' | 'Charging' | 'Idle';
  battery: number;
  charger: string; // charger code at the site
  movesToday: number;
  truck?: string;
  carrying?: string;
}

export const FORKLIFT_SEEDS: ForkliftSeed[] = [
  { code: 'FL-01', site: 'WH-01', operator: 'Sam Haddad', model: 'Toyota 8FBE18', status: 'working', battery: 75, charger: 'C1', movesToday: 28, truck: 'TRK-2051' },
  { code: 'FL-02', site: 'WH-01', operator: 'Kai Turner', model: 'Linde E20', status: 'Charging', battery: 62, charger: 'C1', movesToday: 17 },
  { code: 'FL-03', site: 'WH-02', operator: 'Nina Petrov', model: 'Toyota 8FBE18', status: 'working', battery: 78, charger: 'C1', movesToday: 33, truck: 'TRK-2127' },
  { code: 'FL-04', site: 'WH-02', operator: 'Omar Aziz', model: 'Jungheinrich EFG 216', status: 'working', battery: 71, charger: 'C2', movesToday: 29, truck: 'TRK-2104' },
  { code: 'FL-05', site: 'WH-02', operator: 'Liam Carter', model: 'Linde E20', status: 'Charging', battery: 54, charger: 'C1', movesToday: 21 },
  { code: 'FL-06', site: 'WH-02', operator: 'Sofia Marin', model: 'Toyota 8FBE18', status: 'Charging', battery: 48, charger: 'C2', movesToday: 18 },
  { code: 'FL-07', site: 'WH-03', operator: 'Jonas Berg', model: 'Jungheinrich EFG 216', status: 'working', battery: 79, charger: 'C1', movesToday: 31, truck: 'TRK-2148' },
  { code: 'FL-08', site: 'WH-03', operator: 'Mei Tan', model: 'Toyota 8FBE18', status: 'Charging', battery: 88, charger: 'C1', movesToday: 22 },
  { code: 'FL-09', site: 'WH-03', operator: 'Arjun Rao', model: 'Linde E20', status: 'Charging', battery: 52, charger: 'C2', movesToday: 19 },
  { code: 'FL-10', site: 'WH-04', operator: 'Zoe Reyes', model: 'Jungheinrich EFG 216', status: 'working', battery: 84, charger: 'C1', movesToday: 38, truck: 'TRK-2205', carrying: 'PAL-1060' },
  { code: 'FL-11', site: 'WH-04', operator: 'Ethan Park', model: 'Toyota 8FBE18', status: 'working', battery: 82, charger: 'C2', movesToday: 31, truck: 'TRK-2229' },
  { code: 'FL-12', site: 'WH-04', operator: 'Zoe Larsen', model: 'Toyota 8FBE18', status: 'Charging', battery: 85, charger: 'C3', movesToday: 24 },
  { code: 'FL-13', site: 'WH-04', operator: 'Ruth Adeyemi', model: 'Linde E20', status: 'Charging', battery: 90, charger: 'C2', movesToday: 27 },
  { code: 'FL-14', site: 'WH-04', operator: 'Ben Ito', model: 'Toyota 8FBE18', status: 'Idle', battery: 64, charger: 'C1', movesToday: 19 },
  { code: 'FL-15', site: 'WH-05', operator: 'Ines Moreau', model: 'Toyota 8FBE18', status: 'working', battery: 95, charger: 'C1', movesToday: 34, truck: 'TRK-2339' },
  { code: 'FL-16', site: 'WH-05', operator: 'Paolo Neri', model: 'Linde E20', status: 'Charging', battery: 41, charger: 'C2', movesToday: 16 },
  { code: 'FL-17', site: 'WH-05', operator: 'Chloe Martin', model: 'Jungheinrich EFG 216', status: 'Charging', battery: 86, charger: 'C1', movesToday: 20 },
  { code: 'FL-18', site: 'WH-06', operator: 'Dimas Arya', model: 'Toyota 8FBE18', status: 'working', battery: 72, charger: 'C1', movesToday: 21, truck: 'TRK-3061' },
  { code: 'FL-19', site: 'WH-06', operator: 'Siti Rahma', model: 'Linde E20', status: 'Charging', battery: 58, charger: 'C2', movesToday: 14 },
  { code: 'FL-20', site: 'WH-06', operator: 'Hendra Kusuma', model: 'Toyota 8FBE18', status: 'working', battery: 81, charger: 'C1', movesToday: 17, truck: 'TRK-3064' },
  { code: 'FL-21', site: 'WH-06', operator: 'Rizky Ramadhan', model: 'Linde E20', status: 'working', battery: 76, charger: 'C2', movesToday: 12, truck: 'TRK-3067' },
  { code: 'FL-22', site: 'WH-06', operator: 'Lina Marlina', model: 'Jungheinrich EFG 216', status: 'working', battery: 88, charger: 'C1', movesToday: 9, truck: 'TRK-3070' },
];

export interface PalletSeed {
  code: string;
  site: SiteCode;
  sku: keyof typeof SKUS;
  slot?: number;
  forklift?: string;
  quantity?: number;
  lot: string;
  received: string;
  pinned?: boolean;
}

export const PALLET_SEEDS: PalletSeed[] = [
  { code: 'PAL-1026', site: 'WH-01', sku: 'helmet', slot: 0, quantity: 82, lot: 'L2501-870', received: 'Apr 19, 16:29', pinned: true },
  { code: 'PAL-1031', site: 'WH-01', sku: 'box', slot: 1, lot: 'L2502-114', received: 'Apr 20, 08:12', pinned: true },
  { code: 'PAL-1033', site: 'WH-01', sku: 'container', slot: 5, lot: 'L2502-131', received: 'Apr 20, 09:03' },
  { code: 'PAL-1040', site: 'WH-02', sku: 'panel', slot: 0, lot: 'L2502-402', received: 'Apr 20, 07:41', pinned: true },
  { code: 'PAL-1041', site: 'WH-02', sku: 'chair', slot: 1, lot: 'L2502-405', received: 'Apr 20, 07:44' },
  { code: 'PAL-1043', site: 'WH-02', sku: 'gloves', slot: 3, lot: 'L2502-418', received: 'Apr 20, 08:20', pinned: true },
  { code: 'PAL-1044', site: 'WH-02', sku: 'box', slot: 4, lot: 'L2502-420', received: 'Apr 20, 08:26' },
  { code: 'PAL-1046', site: 'WH-02', sku: 'gloves', slot: 6, lot: 'L2502-433', received: 'Apr 20, 08:58' },
  { code: 'PAL-1060', site: 'WH-04', sku: 'panel', forklift: 'FL-10', lot: 'L2502-611', received: 'Apr 20, 09:38' },
  { code: 'PAL-1061', site: 'WH-04', sku: 'water', slot: 0, lot: 'L2502-590', received: 'Apr 20, 08:47', pinned: true },
  { code: 'PAL-1062', site: 'WH-04', sku: 'tape', slot: 1, lot: 'L2502-592', received: 'Apr 20, 08:51' },
  { code: 'PAL-1063', site: 'WH-04', sku: 'helmet', slot: 2, lot: 'L2502-597', received: 'Apr 20, 09:02', pinned: true },
  { code: 'PAL-1064', site: 'WH-04', sku: 'water', slot: 3, lot: 'L2502-598', received: 'Apr 20, 09:05' },
  { code: 'PAL-1065', site: 'WH-04', sku: 'panel', slot: 4, lot: 'L2502-603', received: 'Apr 20, 09:14' },
  { code: 'PAL-1066', site: 'WH-04', sku: 'tape', slot: 5, lot: 'L2502-604', received: 'Apr 20, 09:17' },
  { code: 'PAL-1067', site: 'WH-04', sku: 'water', slot: 6, lot: 'L2502-606', received: 'Apr 20, 09:22' },
  { code: 'PAL-1068', site: 'WH-04', sku: 'helmet', slot: 8, lot: 'L2502-609', received: 'Apr 20, 09:30' },
  // WH-06 (contoh): two beside Bay 1, two beside Bay 2 for the truck loading there, two beside Bay 3.
  { code: 'PAL-1070', site: 'WH-06', sku: 'helmet', slot: 0, lot: 'L2502-702', received: 'Apr 20, 08:14', pinned: true },
  { code: 'PAL-1071', site: 'WH-06', sku: 'gloves', slot: 1, lot: 'L2502-705', received: 'Apr 20, 08:31' },
  { code: 'PAL-1072', site: 'WH-06', sku: 'box', slot: 4, lot: 'L2502-711', received: 'Apr 20, 08:52' },
  { code: 'PAL-1073', site: 'WH-06', sku: 'helmet', slot: 5, lot: 'L2502-713', received: 'Apr 20, 09:06' },
  { code: 'PAL-1074', site: 'WH-06', sku: 'tape', slot: 6, lot: 'L2502-716', received: 'Apr 20, 09:15', pinned: true },
  { code: 'PAL-1075', site: 'WH-06', sku: 'container', slot: 7, lot: 'L2502-719', received: 'Apr 20, 09:27' },
];

export const CHARGER_SEEDS: Record<string, { sessionsToday: number; energyKwh: number }> = {
  'WH-04:C1': { sessionsToday: 7, energyKwh: 40.1 },
  'WH-04:C2': { sessionsToday: 5, energyKwh: 28.6 },
  'WH-04:C3': { sessionsToday: 6, energyKwh: 33.4 },
};

export const BAY_TRUCKS_TODAY: Record<string, number> = { 'WH-04:In 2': 5 };

// Pools for generated trucks/shipments (contoh).
export const DRIVER_NAMES = [
  'Jordan Lee', 'Mia Novak', 'Carlos Vega', 'Aisha Bello', 'Henry Wu', 'Elena Ross', 'Sam Okafor', 'Lucas Brandt',
  'Nora Quinn', 'Victor Hale', 'Ivy Moreno', 'Kenji Mori', 'Rosa Diaz', 'Felix Grant', 'Tara Singh', 'Leo Marsh',
];
export const CUSTOMERS = [
  'Oakridge Market', 'Harbor & Co.', 'Sunvale Grocers', 'Halcyon Retail', 'Keystone Supply', 'FreshWay Markets',
  'Brightline Electronics', 'Metro Office Co.', 'Northpoint Foods', 'Summit Hardware',
];
export const CITIES = [
  'Philadelphia, PA', 'Providence, RI', 'Edison, NJ', 'Stamford, CT', 'Allentown, PA', 'Trenton, NJ',
  'New Haven, CT', 'Wilmington, DE', 'Newark, NJ', 'Hartford, CT',
];

/** Local pools for generated trucks at sites outside the fictional city (contoh). */
export interface LocalPool {
  drivers: string[];
  customers: string[];
  cities: string[];
  /** Plate region letters; plates read like "W 1234 AB". */
  plateRegions: string[];
}
export const LOCAL_POOLS: Partial<Record<SiteCode, LocalPool>> = {
  'WH-06': {
    drivers: ['Andi Wijaya', 'Sri Wahyuni', 'Fajar Nugroho', 'Wahyu Setiawan', 'Yusuf Hidayat', 'Putri Anggraini', 'Agus Prasetyo', 'Nur Aini'],
    customers: ['Arunika Motor Parts', 'Bentala Niaga', 'Candra Moto Supply', 'Daksa Retail', 'Gemilang Sparepart', 'Kirana Dealer Group'],
    cities: ['Surabaya, Jawa Timur', 'Malang, Jawa Timur', 'Gresik, Jawa Timur', 'Mojokerto, Jawa Timur', 'Pasuruan, Jawa Timur', 'Kediri, Jawa Timur'],
    plateRegions: ['W', 'L'],
  },
};
