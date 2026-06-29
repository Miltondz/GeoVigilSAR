# GeoVigil SAR — API Integration Plan (7 new sources)

> Executor: Sonnet coding agent. Follow exactly. TS strict, no `any`, no new npm deps.

## ⚠️ Architecture reality check (READ FIRST — overrides CLAUDE.md "Convex" wording)

The repo describes Convex caching, but **Convex is NOT wired** — `convex/` contains only `.gitkeep`. The **actual** pattern is:

1. **Cache** = Next.js Route Handler segment cache: `export const revalidate = <seconds>` + response header `Cache-Control: public, s-maxage=<seconds>`. This is the data-layer TTL. There is no DB table. (Each "Convex cache" section below specifies the route `revalidate` value + header. If Convex is ever wired, the listed table/fields are the forward-compatible spec.)
2. **Fetch** = client-side `fetch('/api/<name>')` inside `components/map/GeoVigilMap.tsx` (or `page.tsx` for panel-only data), gated on `activeLayers.<key>` so we only hit the API when the layer is on.
3. **2D** = one file in `components/map/layers/<Name>Layer.tsx`. Props shape mirrors `AirTrafficLayer`: `{ map: MapLibreMap, data: T[], visible: boolean, onSelect?: (o: SelectedMapObject|null)=>void }`. Setup useEffect adds source+layers once (keyed on `[map]`), data useEffect calls `(map.getSource(id) as GeoJSONSource).setData(...)`, visibility useEffect toggles `setLayoutProperty(id,'visibility',v)`.
4. **3D** = a new `useEffect` block inside `components/map/Cesium3DGlobe.tsx`, gated on `activeLayers.<key>`, using `viewer.entities.add(...)`, tracked in a `useRef<CesiumEntity[]>` for cleanup. Pass new data arrays as new optional props on `Cesium3DGlobeProps` (default `[]`), wired from `GeoVigilMap`.
5. **Colors in Cesium**: `Cesium.Color.fromCssColorString('#00FF88')`. **Colors in MapLibre**: read CSS var is not possible in paint expressions — use the literal hex from the token table, with a `// --color-green` comment.
6. **New layer key** → add to `DEFAULT_LAYERS` in `app/[locale]/page.tsx` (default `false` for heavy/optional layers) AND to the layer-toggle control list (find where `LayerControl` enumerates keys — same file/component that reads `DEFAULT_LAYERS`).
7. **i18n**: every UI string → `messages/es.json` + `messages/en.json`.

Shared selection type lives in `lib/types/map-selection.ts` (`SelectedMapObject`). Add a new variant per clickable feature type.

---

## 1. AviationStack — flight routes / airline / airport / flight status

**Budget: 100 req/month, HTTP only (free tier blocks HTTPS).** This dictates the whole design: do NOT poll. Use it as an on-demand enrichment + a one-time static airport reference cache. OpenSky already gives live positions; AviationStack fills route/airline/airport metadata.

### Base URL + endpoints
- `http://api.aviationstack.com/v1/airports?access_key=KEY&country_iso2=VE` — static VE airport list (fetch once, cache 30 days).
- `http://api.aviationstack.com/v1/flights?access_key=KEY&flight_icao=<ICAO>` — on-demand single flight status when user clicks an aircraft.
- `http://api.aviationstack.com/v1/routes?access_key=KEY&dep_iata=CCS` — optional, route reference.

### `lib/aviationstack.ts` — contracts
```ts
export interface AviationAirport {
  iataCode: string
  icaoCode: string
  airportName: string
  latitude: number
  longitude: number
  countryIso2: string
  countryName: string
  timezone: string
  gmt: string
}

export type FlightStatus =
  | 'scheduled' | 'active' | 'landed' | 'cancelled' | 'incident' | 'diverted'

export interface AviationFlight {
  flightDate: string
  flightStatus: FlightStatus
  departure: { airport: string; iata: string; icao: string; scheduled: string; delay: number | null }
  arrival:   { airport: string; iata: string; icao: string; scheduled: string; delay: number | null }
  airline:   { name: string; iata: string; icao: string }
  flight:    { number: string; iata: string; icao: string }
}

export interface AviationStackEnvelope<T> {
  pagination: { limit: number; offset: number; count: number; total: number }
  data: T[]
}

// Raw API field names (snake_case) → map in route handler.
export interface RawAirport {
  iata_code: string; icao_code: string; airport_name: string
  latitude: string; longitude: string; country_iso2: string
  country_name: string; timezone: string; gmt: string
}
export interface RawFlight {
  flight_date: string; flight_status: FlightStatus
  departure: { airport: string; iata: string; icao: string; scheduled: string; delay: number | null }
  arrival:   { airport: string; iata: string; icao: string; scheduled: string; delay: number | null }
  airline:   { name: string; iata: string; icao: string }
  flight:    { number: string; iata: string; icao: string }
}

export function mapAirport(r: RawAirport): AviationAirport { /* parseFloat lat/lng */ }
export function mapFlight(r: RawFlight): AviationFlight { /* passthrough */ }
```

### `app/api/aviation-airports/route.ts`
- `GET` no params. `export const revalidate = 2592000` (30d).
- Calls `airports?country_iso2=VE`. Maps → `AviationAirport[]`. Returns `{ airports, count, lastUpdated }`.
- **Monthly guard**: env-driven kill switch `AVIATIONSTACK_KEY` — if missing, return `{ airports: [], count: 0 }` (no throw). Static fallback: ship a hardcoded `VE_AIRPORTS` const (CCS/Maiquetía, VLN/Valencia, BLA/Barcelona, MAR/Maracaibo, PMV/Porlamar) in `lib/aviationstack.ts` so the layer works with zero quota.

### `app/api/aviation-flight/[icao]/route.ts`
- `GET` param `icao` (flight ICAO). `revalidate = 3600`.
- Calls `flights?flight_icao=<icao>`. Returns first `AviationFlight | null`. Wrapped in try/catch → null. This is the click-to-enrich path; reuses existing aircraft-click flow.

### Cache (route segment)
- airports: `revalidate 2592000`, header `s-maxage=2592000, stale-while-revalidate=86400`. (Convex-equiv table `aviationAirports`, TTL 30d, fields = `AviationAirport` + `cachedAt:number`.)
- flight: `revalidate 3600`. (Table `aviationFlights` keyed by icao, TTL 1h.)

### 2D layer
- `components/map/layers/AirportsLayer.tsx`. Type **symbol** (airport glyph) + **circle** halo. Color token `--color-cyan #00B4FF`. Toggle key `airports`.
- Click → `onSelect({ type:'airport', iata, icao, name, lat, lng, ... })`.

### 3D Cesium
- New useEffect gated on `activeLayers.airports`. Entity type **billboard** (pin) + **label** (IATA). Color `Cesium.Color.fromCssColorString('#00B4FF')`. Ref `airportEntitiesRef`. Trigger deps `[cesiumReady, activeLayers.airports, airports]`. New prop `airports?: AviationAirport[] = []`.

### Panel / UI
- Airport detail shows in existing `MapDetailPanel.tsx` (add `airport` case). Flight-status enrichment shows inside the aircraft detail card already used for OpenSky selection (append route + status rows when `/api/aviation-flight` resolves).

### Refresh cadence
- Airports: once / 30 days. Flights: on click only, 1h cache. Never polled.

### Expected visual
- Cyan airport pins (5 VE airports) on globe + map; clicking an in-flight aircraft adds "CCS→MIA · LANDED · delay 12m" to its detail card.

### Limitations / gotchas
- 100 req/mo HARD cap → never put AviationStack on a timer. HTTP-only on free tier (mixed-content: must proxy through the route handler, never fetch from browser — already our rule). Free tier omits `live` positions for many flights. Static `VE_AIRPORTS` fallback is mandatory so the feature degrades gracefully at quota exhaustion.

---

## 2. Open-Meteo — weather (wind, precip, visibility, temp, cloud)

### Base URL + endpoints
- `https://api.open-meteo.com/v1/forecast`
- params: `latitude`, `longitude`, `current=temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m`, `hourly=visibility`, `timezone=auto`, `wind_speed_unit=ms`.
- One call per point. For a wind field we sample a small grid (see gotchas) — but default is a single call at the active event epicenter.

### `lib/open-meteo.ts` — contracts
```ts
export interface WeatherCurrent {
  time: string
  temperature2m: number       // °C
  relativeHumidity2m: number  // %
  precipitation: number       // mm
  weatherCode: number         // WMO code
  cloudCover: number          // %
  windSpeed10m: number        // m/s
  windDirection10m: number    // deg, meteorological (FROM)
  windGusts10m: number        // m/s
  visibility: number | null   // m (from hourly[nearestHour])
}
export interface WeatherPoint { lat: number; lng: number; current: WeatherCurrent }

export interface RawOpenMeteo {
  latitude: number; longitude: number
  current: {
    time: string; temperature_2m: number; relative_humidity_2m: number
    precipitation: number; weather_code: number; cloud_cover: number
    wind_speed_10m: number; wind_direction_10m: number; wind_gusts_10m: number
  }
  hourly?: { time: string[]; visibility: number[] }
}
export function mapWeather(r: RawOpenMeteo): WeatherPoint
export function weatherCodeLabel(code: number): string // WMO → 'Clear'|'Rain'|'Thunderstorm'... ES/EN keyed
```

### `app/api/weather/route.ts`
- `GET` params: `lat`, `lng` (default to active event epicenter `10.4,-68.7`). Optional `grid=1` → returns 9-point 3×3 sample over VE bbox (one call per point, sequential `Promise.all`, max 9).
- `revalidate = 900` (15min). Returns `{ points: WeatherPoint[], lastUpdated }`.

### Cache
- route `revalidate 900`, header `s-maxage=900, stale-while-revalidate=300`. (Table `weather`, TTL 15min, fields = `WeatherPoint` flattened + `cachedAt`.)

### 2D layer
- `components/map/layers/WeatherLayer.tsx`. Type **symbol** wind barbs/arrows: an arrow icon rotated by `windDirection10m` (point-toward = dir+180), sized by `windSpeed10m`. Plus a small **circle** colored by precip intensity. Token: arrows `--color-cyan`, precip `--color-amber #FFB800` (none→transparent ramp). Toggle key `weather`.
- Click → `onSelect({ type:'weather', lat,lng, current })`.

### 3D Cesium
- useEffect gated `activeLayers.weather`. Entity **point** + **label** showing `🌬 {windSpeed} m/s {dirArrow}` and temp. Optionally a thin **polyline** from point along wind vector (length ∝ speed). Color `fromCssColorString('#00B4FF')`. Ref `weatherEntitiesRef`. Prop `weather?: WeatherPoint[] = []`. Deps `[cesiumReady, activeLayers.weather, weather]`.

### Panel / UI
- New compact card in `StatsPanel.tsx` "MET / WEATHER" section: temp, wind speed+dir, gusts, precip, cloud %, visibility, WMO label. Localized via `weatherCodeLabel`.

### Refresh cadence
- 15 min (client interval gated on `activeLayers.weather`, matching route TTL).

### Expected visual
- Cyan wind arrows over the epicenter region rotating with direction, an amber precip dot when raining, and a StatsPanel readout of current met conditions; in 3D a labeled point with a wind vector line.

### Limitations / gotchas
- `visibility` only exists in `hourly`, not `current` — pick `hourly.visibility[i]` where `hourly.time[i]` matches current hour. Wind direction is meteorological (direction wind comes FROM) — for a "blowing toward" arrow add 180°. Free, generous limits (~10k/day) but still cache. Grid mode = N calls; cap at 9.

---

## 3. NOAA NDBC — marine buoys (wave height, sea temp, sea wind)

### Base URL + endpoints
- Station catalog: `https://www.ndbc.noaa.gov/activestations.xml` (XML; lat/lon/name/type for every active station). Fetch once, cache 24h, filter to VE/Caribbean bbox (lat 8–16, lng -75 to -59).
- Latest obs (all stations, one file): `https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt` (space-delimited). Preferred over per-station.
- Per-station detail (fallback): `https://www.ndbc.noaa.gov/data/realtime2/{station}.txt`.

### `lib/ndbc.ts` — contracts
```ts
export interface BuoyStation {
  id: string; name: string; lat: number; lng: number
  type: string; owner: string
}
export interface BuoyObservation {
  id: string; lat: number; lng: number
  time: string              // ISO from #YY MM DD hh mm (UTC)
  windDir: number | null    // WDIR deg
  windSpeed: number | null  // WSPD m/s
  gust: number | null       // GST m/s
  waveHeight: number | null // WVHT m
  dominantPeriod: number | null // DPD s
  meanWaveDir: number | null    // MWD deg
  pressure: number | null   // PRES hPa
  airTemp: number | null    // ATMP °C
  seaTemp: number | null    // WTMP °C
  visibility: number | null // VIS nmi
}
export function parseActiveStationsXml(xml: string): BuoyStation[] // DOMParser? NO (server) → regex/manual; use simple string parse on <station ... /> attrs
export function parseLatestObs(txt: string, stations: Map<string,BuoyStation>): BuoyObservation[]
```
> `activestations.xml` parse: no `xml2js` dep. Server-side has no `DOMParser`. Use a regex over `<station ` self-closing tags extracting `id|lat|lon|name|type|owner` attributes. `latest_obs.txt`: header line starts `#STN`, columns fixed; the sentinel for missing is `MM`.

### `app/api/buoys/route.ts`
- `GET` no params. `revalidate = 1800` (30min). Fetches catalog (cached) + latest_obs, joins, filters to VE bbox. Returns `{ buoys: BuoyObservation[], count, lastUpdated }`.

### Cache
- route `revalidate 1800`, header `s-maxage=1800, stale-while-revalidate=600`. (Table `buoys`, TTL 30min, fields = `BuoyObservation` + `cachedAt`; static `buoyStations` table TTL 24h.)

### 2D layer
- `components/map/layers/BuoysLayer.tsx`. Type **circle** sized by `waveHeight`, colored by `seaTemp` ramp (cyan→amber). Token base `--color-cyan #00B4FF`. Optional **symbol** wave label. Toggle key `buoys`.
- Click → `onSelect({ type:'buoy', id, lat,lng, waveHeight, seaTemp, windSpeed, ... })`.

### 3D Cesium
- useEffect gated `activeLayers.buoys`. Entity **point** (cyan) + **label** `🌊 {waveHeight}m {seaTemp}°C`. Ref `buoyEntitiesRef`. Prop `buoys?: BuoyObservation[] = []`. Deps `[cesiumReady, activeLayers.buoys, buoys]`.

### Panel / UI
- `MapDetailPanel.tsx` gains a `buoy` case (full obs table). Optional count chip in `StatsPanel` "MARINE" row.

### Refresh cadence
- 30 min.

### Expected visual
- Cyan buoy dots off the VE coast sized by wave height; click shows wave/sea-temp/wind table; 3D labeled marine points.

### Limitations / gotchas
- Coverage near Venezuela is SPARSE (few Caribbean buoys; many obs may be `MM`/missing → null). Plain-text/XML parsing fragility — column order in `latest_obs.txt` is stable but guard every `parseFloat` against `MM`. No CORS for browser → must go through route handler (already our rule). Time fields are UTC; build ISO carefully.

---

## 4. Overpass / OSM — dynamic infra by bbox (shelters, schools, bridges, fuel, police/fire, roads)

> Hospitals already covered by `lib/hotosm.ts` — DO NOT duplicate hospitals here.

### Base URL + endpoints
- `https://overpass-api.de/api/interpreter` (POST, body = OverpassQL). Fallback mirror `https://overpass.kumi.systems/api/interpreter`.
- Query template (bbox `{{bbox}}` = `south,west,north,east`):
```overpassql
[out:json][timeout:25];
(
  node["amenity"="shelter"]({{bbox}});
  way["amenity"="shelter"]({{bbox}});
  node["amenity"="school"]({{bbox}});
  way["amenity"="school"]({{bbox}});
  node["amenity"="fuel"]({{bbox}});
  node["amenity"="police"]({{bbox}});
  node["amenity"="fire_station"]({{bbox}});
  way["bridge"="yes"]({{bbox}});
);
out center tags;
```
> Roads-status: optionally a separate query `way["highway"~"motorway|trunk|primary|secondary"]({{bbox}});out geom;` returns geometry for road lines (heavier — keep behind its own sub-toggle / only on demand).

### `lib/overpass.ts` — contracts
```ts
export type OsmKind = 'shelter' | 'school' | 'fuel' | 'police' | 'fire_station' | 'bridge'
export interface OsmFeature {
  id: number
  kind: OsmKind
  lat: number
  lng: number
  name: string | null
  tags: Record<string, string>
}
export interface OsmRoad {
  id: number
  ref: string | null
  highway: string
  coords: [number, number][] // [lng,lat]
}
export interface RawOverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number; lon?: number
  center?: { lat: number; lon: number }
  geometry?: { lat: number; lon: number }[]
  tags?: Record<string, string>
}
export interface RawOverpass { elements: RawOverpassElement[] }
export function buildInfraQuery(bbox: string): string
export function buildRoadsQuery(bbox: string): string
export function mapElements(raw: RawOverpass): OsmFeature[] // classify by tags.amenity / tags.bridge; use center for ways
export function mapRoads(raw: RawOverpass): OsmRoad[]
```

### `app/api/osm-infra/route.ts`
- `GET` params: `bbox=minLng,minLat,maxLng,maxLat` (convert to Overpass `s,w,n,e`), optional `roads=1`. `revalidate = 3600`.
- POST to Overpass, map, return `{ features: OsmFeature[], roads?: OsmRoad[], count, lastUpdated }`. Clamp bbox area (reject if span > ~3° to protect rate limit).

### Cache
- route `revalidate 3600`, header `s-maxage=3600, stale-while-revalidate=1800`. Bbox-keyed (vary by query). (Table `osmInfra` keyed by bbox-hash, TTL 1h.)

### 2D layer
- `components/map/layers/InfraLayer.tsx`. Type **symbol** with per-`kind` icon, colored by category: shelter `--color-green`, school/fuel `--color-amber`, police/fire `--color-red`, bridge `--color-slate`. Toggle key `osmInfra`. Roads as **line** `--color-amber` (sub-toggle `osmRoads`).
- Click → `onSelect({ type:'osm', kind, id, name, lat,lng, tags })`.

### 3D Cesium
- useEffect gated `activeLayers.osmInfra`. Entity **billboard** per kind (reuse 2D icon set) + **label** name. Roads as **polyline** clamped to ground. Refs `infraEntitiesRef`, `roadEntitiesRef`. Props `osmFeatures?: OsmFeature[] = []`, `osmRoads?: OsmRoad[] = []`. Deps `[cesiumReady, activeLayers.osmInfra, osmFeatures]`.

### Panel / UI
- Counts per kind in `StatsPanel.tsx` "INFRASTRUCTURE" section (shelters: N, schools: N, fuel: N...). Feature detail in `MapDetailPanel.tsx` (`osm` case shows raw tags).

### Refresh cadence
- On viewport settle (debounced) + 1h cache. Tie fetch to `viewportBbox` change when `activeLayers.osmInfra` is on (mirror existing zone-analysis viewport pattern).

### Expected visual
- Colored infra icons (green shelters, red emergency services, amber fuel/schools) populate as you pan; optional amber primary-road lines; StatsPanel infra counts update per viewport.

### Limitations / gotchas
- Overpass rate limits + occasional 504/429 — implement mirror fallback + try/catch → empty. Large bbox = slow/blocked: clamp span. OSM completeness in Venezuela is uneven (many shelters/bridges untagged). `out center` gives ways a single point (good enough for markers). Don't request `out geom` for everything — only roads, behind its own toggle.

---

## 5. HDX / OCHA CKAN — population grids, displacement, admin boundaries

### Base URL + endpoints
- CKAN action API: `https://data.humdata.org/api/3/action/`
  - Discover: `package_search?q=venezuela+administrative+boundaries&rows=20`
  - Dataset: `package_show?id=<slug>` → `result.resources[]` (each has `format`, `url`).
- Curated resource slugs (hardcode, verified VE COD datasets) to avoid fragile search at runtime:
  - Admin boundaries (COD-AB): `cod-ab-ven` → GeoJSON resources (adm0/adm1/adm2).
  - Population: WorldPop / HRSL VEN raster→csv, or `cod-ps-ven` (population statistics by admin).
  - Displacement: IOM DTM Venezuela dataset (CSV).

### `lib/hdx.ts` — contracts
```ts
export interface HdxResource {
  id: string; name: string; format: string; url: string
}
export interface HdxDataset {
  id: string; name: string; title: string; organization: string
  resources: HdxResource[]
}
export interface AdminBoundary {
  adminLevel: 0 | 1 | 2
  name: string
  pcode: string
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
}
export interface PopulationStat { pcode: string; name: string; population: number }
export interface RawCkanEnvelope<T> { success: boolean; result: T }
export interface RawCkanDataset {
  id: string; name: string; title: string
  organization: { title: string } | null
  resources: { id: string; name: string; format: string; url: string }[]
}
export function mapDataset(r: RawCkanDataset): HdxDataset
export function mergeBoundariesWithPop(
  boundaries: AdminBoundary[], pop: PopulationStat[]
): (AdminBoundary & { population: number | null })[]
```

### `app/api/hdx/route.ts`
- `GET` params: `kind=admin|population|displacement`. `revalidate = 86400` (24h).
- Looks up the curated dataset via `package_show`, picks the GeoJSON/CSV resource, fetches & parses it server-side. Returns:
  - admin → `{ boundaries: AdminBoundary[] }` (GeoJSON FeatureCollection flattened).
  - population → `{ stats: PopulationStat[] }` (CSV parse, reuse FIRMS-style splitter).
- Cap admin geometry to adm1 by default (adm2 large — behind `level=2`).

### Cache
- route `revalidate 86400`, header `s-maxage=86400, stale-while-revalidate=43200`. (Tables `hdxBoundaries` TTL 24h, `hdxPopulation` TTL 24h.)

### 2D layer
- `components/map/layers/PopulationLayer.tsx`. Type **fill** (choropleth by population, transparent→`--color-red` ramp) + **line** boundary outlines `--color-slate`. Reuses existing `population` + `adminBoundaries` toggle keys already in `DEFAULT_LAYERS` (extend them, don't add new). Click admin polygon → `onSelect({ type:'admin', name, pcode, population })`.

### 3D Cesium
- useEffect gated `activeLayers.population` / `activeLayers.adminBoundaries`. Boundaries as **polyline** (outline) + optional extruded **polygon** with `material` alpha ∝ population. Color `fromCssColorString('#FF4444')` (pop), `#1A3A4A` (outline). Ref `adminEntitiesRef`. Props `boundaries?: (AdminBoundary&{population:number|null})[] = []`. Deps `[cesiumReady, activeLayers.population, boundaries]`.

### Panel / UI
- `StatsPanel.tsx` "POPULATION AT RISK" — sum population within affected states; per-admin breakdown on click in `MapDetailPanel`.

### Refresh cadence
- 24h (effectively static). Fetch once on load when toggle first enabled.

### Expected visual
- A red-graded choropleth of Venezuelan adm1 states with slate outlines; clicking a state shows its population; 3D extruded states by population.

### Limitations / gotchas
- CKAN resource URLs/slugs drift — hardcode but wrap in try/catch with empty fallback; log resolved URL. Some resources are zipped shapefiles, NOT GeoJSON — prefer resources where `format==='GeoJSON'`; if only SHP, skip (no shp parser, no new dep). adm2 GeoJSON can be multi-MB → default adm1, gate adm2. Population datasets vary in column naming (`P_2020`, `population`, `T_TL`) — normalize defensively.

---

## 6. USAID Disasters — active declarations + response activity

> No single canonical real-time USAID JSON API exists. Use **data.usaid.gov (Socrata SODA)** as primary, **ReliefWeb disaster filter** (already in `lib/reliefweb.ts`) as cross-reference/fallback.

### Base URL + endpoints
- Socrata SODA: `https://data.usaid.gov/resource/<dataset_id>.json?$where=...&$limit=...`
  - Use the BHA/OFDA disaster-declarations dataset id (discover via `https://data.usaid.gov/api/catalog/v1?q=disaster`); filter `country='Venezuela'`.
- Fallback (already integrated): ReliefWeb `https://api.reliefweb.int/v1/disasters?filter[field]=country&...` filtered to source/donor USAID — reuse `reliefweb.ts` client, add a `donor` filter helper.

### `lib/usaid.ts` — contracts
```ts
export interface UsaidDeclaration {
  id: string
  country: string
  disasterType: string      // e.g. 'Earthquake'
  declarationDate: string   // ISO
  fiscalYear: number
  status: 'active' | 'closed'
  fundingUsd: number | null
  lat: number | null        // may be country-centroid only
  lng: number | null
  description: string
}
export interface RawUsaidSocrata {
  // Socrata returns flat string fields; names depend on dataset — map defensively
  [key: string]: string | undefined
}
export function mapDeclaration(r: RawUsaidSocrata): UsaidDeclaration
export function venezuelaCentroid(): { lat: number; lng: number } // -66.6,6.4 fallback geo
```

### `app/api/usaid/route.ts`
- `GET` no params (Venezuela-scoped). `revalidate = 21600` (6h).
- Try Socrata → map → `UsaidDeclaration[]`. On empty/error, fall back to ReliefWeb donor filter. Returns `{ declarations, count, source: 'socrata'|'reliefweb', lastUpdated }`.

### Cache
- route `revalidate 21600`, header `s-maxage=21600, stale-while-revalidate=7200`. (Table `usaidDeclarations`, TTL 6h.)

### 2D layer
- `components/map/layers/UsaidLayer.tsx`. Type **symbol** (USAID/aid icon) at declaration lat/lng (country centroid if point-less), colored `--color-green #00FF88` (active) / `--color-muted` (closed). Toggle key `usaidDisasters`. Click → `onSelect({ type:'usaid', ...declaration })`.

### 3D Cesium
- useEffect gated `activeLayers.usaidDisasters`. Entity **billboard** + **label** `USAID · {disasterType} · ${funding}`. Color `fromCssColorString('#00FF88')`. Ref `usaidEntitiesRef`. Prop `usaid?: UsaidDeclaration[] = []`. Deps `[cesiumReady, activeLayers.usaidDisasters, usaid]`.

### Panel / UI
- New section in `StatsPanel.tsx` or `DataSourcesPanel` "USAID RESPONSE": active declaration count, disaster type, declared date, total funding. Detail in `MapDetailPanel` (`usaid` case).

### Refresh cadence
- 6h.

### Expected visual
- A green USAID marker over Venezuela showing active earthquake disaster declaration + funding amount; StatsPanel "USAID RESPONSE" summary.

### Limitations / gotchas
- **Biggest gotcha**: no stable USAID disaster API — Socrata dataset ids change and may lack geocoordinates (only country) → use `venezuelaCentroid()`. Must verify the live dataset id at implementation time via the catalog endpoint; if none, the ReliefWeb fallback carries the feature. Socrata fields are all strings → coerce. Free, no key (anonymous Socrata is rate-limited; add `$limit` and cache hard).

---

## 7. UN OCHA FTS — humanitarian funding flows

### Base URL + endpoints
- `https://api.hpc.tools/v1/public/`
  - Flows: `fts/flow?countryISO3=VEN&year=2026` → who funds, how much, to whom.
  - Plans/appeals: `plan/country/VEN` → requirements vs funding per response plan.
- ISO3 Venezuela = `VEN`.

### `lib/fts.ts` — contracts
```ts
export interface FtsFlow {
  id: number
  amountUsd: number
  date: string                 // ISO
  sourceOrg: string            // first sourceObjects[].name
  sourceType: string           // organization | government | ...
  destinationOrg: string       // first destinationObjects[].name
  status: string               // 'paid' | 'commitment' | 'pledge'
}
export interface FtsPlanFunding {
  planId: number
  planName: string
  requirementsUsd: number
  fundingUsd: number
  coveragePct: number          // funding/requirements*100
}
export interface RawFtsFlowObject { type: string; name: string; organizationTypes?: string[] }
export interface RawFtsFlow {
  id: number; amountUSD: number; date: string; status: string
  sourceObjects: RawFtsFlowObject[]
  destinationObjects: RawFtsFlowObject[]
}
export interface RawFtsFlowEnvelope { data: { flows: RawFtsFlow[] } }
export interface RawFtsPlanEnvelope {
  data: { plans: { id: number; planVersion: { name: string }
    requirements?: { revisedRequirements: number }
    funding?: { totalFunding: number } }[] }
}
export function mapFlow(r: RawFtsFlow): FtsFlow
export function mapPlanFunding(env: RawFtsPlanEnvelope): FtsPlanFunding[]
export function topDonors(flows: FtsFlow[], n: number): { org: string; total: number }[]
```

### `app/api/fts/route.ts`
- `GET` params: `year` (default current year 2026). `revalidate = 21600` (6h).
- Fetch flow + plan endpoints in parallel. Returns `{ flows: FtsFlow[], plans: FtsPlanFunding[], topDonors, totalFundingUsd, lastUpdated }`.

### Cache
- route `revalidate 21600`, header `s-maxage=21600, stale-while-revalidate=7200`. (Table `ftsFunding`, TTL 6h.)

### 2D layer (funding is non-geospatial → render as donor flows to country centroid)
- `components/map/layers/FundingFlowLayer.tsx`. Donors placed on a ring around Venezuela centroid; **line** arcs (donor→VEN) width ∝ amount, plus **symbol** donor labels. Token `--color-green #00FF88` (funded) / `--color-amber` (pledged). Toggle key `funding`. This satisfies the "must appear in 2D AND 3D" constraint with a synthetic geo encoding. Click arc → `onSelect({ type:'funding', sourceOrg, amountUsd, status })`.

### 3D Cesium
- useEffect gated `activeLayers.funding`. **polyline** arcs from donor ring positions to VEN centroid (use `Cesium.Cartesian3` + arc height ∝ amount), **label** donor + amount. Color `fromCssColorString('#00FF88')`. Ref `fundingEntitiesRef`. Prop `funding?: FtsFlow[] = []`. Deps `[cesiumReady, activeLayers.funding, funding]`.

### Panel / UI
- New `components/panels/FundingPanel.tsx` (or section in `DataSourcesPanel`): total funding USD, coverage % bar (funding/requirements from plans), top-5 donors list. Strings i18n'd.

### Refresh cadence
- 6h.

### Expected visual
- Green funding arcs sweeping from donor organizations toward Venezuela, thickness by amount; a panel showing "$X funded · Y% of appeal · Top donors: USA, ECHO, ...".

### Limitations / gotchas
- FTS API shape is nested/verbose — `sourceObjects`/`destinationObjects` are arrays; pick first relevant org defensively. `amountUSD` may be 0 for pledges. Donor positions are SYNTHETIC (we invent ring coords) — make that clear in UI ("flows are schematic"). 2026 plan may not exist yet → handle empty `plans`. No key but be polite: 6h cache. Endpoint occasionally returns 202/processing — treat non-200 as empty.

---

## Cross-cutting execution checklist (per API)

1. `lib/<name>.ts` — types + `map*` pure functions (no fetch, no `any`).
2. `app/api/<name>/route.ts` — `export const revalidate`, fetch via `AbortSignal.timeout(10_000)`, try/catch → empty payload (never 500 the dashboard), `Cache-Control: s-maxage` header. Match `lib/firms.ts` route style.
3. `components/map/layers/<Name>Layer.tsx` — mirror `AirTrafficLayer` lifecycle (setup-once / setData / visibility-toggle / cleanup with `isMapAlive`).
4. `Cesium3DGlobe.tsx` — add prop (default `[]`), add `<x>EntitiesRef`, add gated useEffect with cleanup, wire deps.
5. `GeoVigilMap.tsx` — add `useState` for the data, `useEffect` fetch gated on `activeLayers.<key>`, pass to both the 2D layer and `Cesium3DGlobe`.
6. `app/[locale]/page.tsx` — add key(s) to `DEFAULT_LAYERS` + layer-control list.
7. `lib/types/map-selection.ts` — add `SelectedMapObject` variant; handle in `MapDetailPanel.tsx`.
8. `messages/es.json` + `messages/en.json` — all labels.
9. `npm run typecheck` + `npm run lint` clean before done.

## New DEFAULT_LAYERS keys to add
`airports`, `weather`, `buoys`, `osmInfra`, `osmRoads`, `usaidDisasters`, `funding` (all default `false`). Reuse existing `population` + `adminBoundaries` for HDX (#5).

## New env vars (add to `.env.example`)
`AVIATIONSTACK_KEY=a9dab5deb61ece201ef1een292087164b` (only #1 needs a key; #2–#7 keyless).
