// Map data for sites drawn from a real location (PRD addendum WH-06). Generated once at build time
// by scripts/fetch-geo.mjs from the user's labelled map of the compound and OpenStreetMap; the app
// never fetches map data at runtime. Map data © OpenStreetMap contributors, ODbL.
import type { SiteCode } from '../types';
import wh06 from './wh06.json';

/** [x, z] in the site's local frame (metres, origin at the site centre, dock side toward +z). */
export type Pt = [number, number];
export type Rect4 = [number, number, number, number]; // x0, z0, x1, z1

/** Colours and roof of a building; `accent` is a pitched roof on part of it, `roofHouse` a box on top. */
export interface GeoStyle {
  wall: string;
  roof: string;
  roofShape: 'flat' | 'gable';
  rise?: number;
  ridges?: number;
  ridgeAxis?: 'x' | 'z';
  accent?: { poly: Pt[]; roof: string; rise: number };
  roofHouse?: { poly: Pt[]; height: number };
}

export interface GeoBuilding extends GeoStyle {
  id: number | string;
  source: 'zone' | 'osm' | 'manual';
  /** Name of the user's zone this building is drawn from. */
  zone?: string;
  height: number;
  heightRule: string;
  poly: Pt[];
}

/** A labelled part of the compound, as outlined on the user's map. */
export interface GeoZone {
  name: string;
  kind: 'building' | 'open' | 'lot';
  poly: Pt[];
  /** The outline on the ground, outside the dock yard. */
  outline: Pt[][];
  fill?: string;
  fillParts?: Pt[][];
  label: { pos: Pt; y: number };
}

export interface GeoSite {
  site: SiteCode;
  attribution: string;
  license: string;
  /** local = rotate(project(lat, lon) about origin, rotationDeg) + translate */
  transform: { origin: { lat: number; lon: number }; rotationDeg: number; translate: Pt };
  /** Unit vector toward true north in the local frame (the map is turned, so it is not -z). */
  north: Pt;
  address: { label: string; pos: Pt } | null;
  /** Ground of the whole compound. */
  base: Rect4;
  /** Operational yards (bays, staging, truck lanes). No map building stands in them. */
  yards: Rect4[];
  main: GeoStyle & { id: string; height: number; poly: Pt[]; bbox: Rect4; sections?: { roof: string; box: Rect4 }[] };
  zones: GeoZone[];
  buildings: GeoBuilding[];
  /** 'track': the riding course; 'paved': a road surface wider than the map's road line. */
  areas: { id: string; kind: 'track' | 'paved'; poly: Pt[]; parts: Pt[][] }[];
  roads: { id: number; kind: string; width: number; line: Pt[] }[];
  /** The compound minus the yards: drawn as the compound's ground. */
  ground: Rect4[];
  trees: Pt[];
  dropped: { id: number | string; reason: string }[];
}

export const GEO_SITES: Partial<Record<SiteCode, GeoSite>> = {
  'WH-06': wh06 as unknown as GeoSite,
};

export const GEO_ATTRIBUTION = '© OpenStreetMap contributors';

/** Axis-aligned bounds of a polygon. */
export function polyBounds(poly: Pt[]): Rect4 {
  const xs = poly.map((p) => p[0]);
  const zs = poly.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
}
