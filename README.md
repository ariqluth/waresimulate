# WareTrack

![Uploading Screenshot 2026-10-10 170143.png…]()


3D warehouse operations dashboard, built from [prd.md](prd.md) and its addendum [prd-mpm-learning-center.md](prd-mpm-learning-center.md). Five sites in a fictional city plus WH-06, MPM Learning Center Sidoarjo, drawn at full scale from real map data in its own district west of the city. A live simulation of trucks, forklifts and pallets runs at every site, with an inspector for every object you click.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build into dist/
```

Needs a browser with WebGL2 (recent Chrome, Edge, Firefox or Safari).

## Building signage logo

The building signs show MPM Group (PT Mitra Pinasthika Mustika Tbk) with the official logo from `public/brand/mpm-logo.png`. An SVG at `public/brand/mpm-logo.svg` takes precedence if you add one. Without either file the signs show the company name as text only.

## WH-06 map data

WH-06 is drawn from the labelled map of the compound in `src/data/geo/mpm.geojson` (one outline per part: main office, warehouses, helmet storage, parking, security post, field, canteen; the field is not drawn, its ground is the truck yard) and from OpenStreetMap data (© OpenStreetMap contributors, ODbL). The attribution is always shown in the bottom-right corner of the 3D view. The app reads the result from `src/data/geo/wh06.json` and never calls a map service while it runs.

To rebuild that file (one Overpass request):

```bash
node scripts/fetch-geo.mjs                    # fetch and write src/data/geo/wh06.json
node scripts/fetch-geo.mjs --save osm.json    # also keep the raw response
node scripts/fetch-geo.mjs --input osm.json   # rebuild from a saved response, offline
```

Hand-made inputs live in `src/data/geo/wh06.overrides.json`: how each labelled part is drawn (building, open ground or lot, or `removed`, as the field now is), the main warehouse hall and the new hall west of it, the dock side, the operational yards, map buildings and roads left out (`drop`), paved areas, heights and colours. To change an outline or a label, edit `mpm.geojson` and run the script again. The same inputs always give the same file.

Docks, gate, chargers, trucks and forklifts at WH-06 are simulated. The inspector says so, and shows a north arrow because the map is turned to line the dock side up with the yard. The names of the compound's parts float over them while WH-06 is in view. Trucks enter past the security post and wait on the road beside the main hall. Five bays are at the south end of the hall's east wall, and one more is in the covered dock beside Gudang part 1.

The main office, the canteen (kantin dan learning study MPM) and the Gudang part 1 dock are low-poly GLB models in `public/models`, built from the user's photos and marked screenshots. To rebuild one after editing its script:

```bash
node scripts/build-office-glb.mjs   # public/models/kantor-utama.glb
node scripts/build-kantin-glb.mjs   # public/models/kantin-mpm.glb
node scripts/build-dock-glb.mjs     # public/models/gudang-1-dock.glb
```

## URL parameters

| Parameter | Effect |
|---|---|
| `?speed=2` | Simulation speed multiplier. `1` = 1 simulated minute per 5 real seconds. |
| `?seed=7` | Random seed for generated trucks. The same seed replays the same events. |
| `?state=loading` | Stay on the loading state. |
| `?state=empty` | No trucks at any site. |
| `?state=error` | First load fails. |
| `?state=offline` | Connection drops 10 seconds after the data appears. |

## Controls

- Left drag: pan.
- Right drag: rotate.
- Scroll: zoom.
- Toolbar `+ − ↺ ↻ ⌂`: zoom, rotate 45°, reset.
- Click any truck, forklift, pallet, dock bay or charger to inspect it. Click empty ground or press Esc to go back to the site.
- `/` focuses search.
- `>` in the site switcher jumps to the next site. The dropdown also offers Network overview.

## Layout

```
src/data    site layout (world coordinates), seed data, geo/ map data for WH-06
scripts     fetch-geo.mjs (build-time map data), build-*-glb.mjs (WH-06 models, shared lowpoly.mjs)
src/sim     simulation engine, road/yard paths, poses, derived metrics
src/world   Three.js scene (city, sites, vehicles, markers, camera)
src/ui      header, KPI cards, inspector, shipment tracking, queue
```
