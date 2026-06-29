# GeoVigil SAR

**Geospatial Situational Intelligence Dashboard — Earthquake Emergency Response**

Foundational event: **Venezuela Mw 7.2 + Mw 7.5 — 24 June 2026**  
Fault system: Boconó-Morón-El Pilar · Epicenter: Veroes, Yaracuy  
Impact: 235+ fatalities · 4,300+ injured · 138+ aftershocks

---

## What this is

Tactical operations room (HUD aesthetic) combining real-time seismic feeds, satellite SAR/optical imagery, Copernicus EMS damage maps, humanitarian statistics, live air traffic, orbital tracking and an AI situational assistant — all on a single web dashboard.

**Dual purpose:** operational tool for the Venezuela 2026 earthquake response + portfolio piece demonstrating full-stack geospatial + AI integration.

**Infrastructure:** 100% free tier. No proprietary servers. No paid APIs beyond API keys.

---

## Live data sources

### Seismic

| Source | Data | Update |
|---|---|---|
| USGS Earthquake API | Epicenters, aftershocks (M2+), ShakeMap intensity | 60 s |
| EMSC (seismicportal.eu) | Complementary seismic catalog, European network | 60 s |
| GDACS | Global alert level, estimated affected population | 15 min |

### Satellite / SAR

| Source | Data | Update |
|---|---|---|
| Copernicus Dataspace (CDSE) | Sentinel-1 SAR change detection (structural damage) | 6-day revisit |
| Copernicus Dataspace (CDSE) | Sentinel-2 optical before/after comparison | 5-day revisit |
| ASF HyP3 | On-demand InSAR interferograms (cm-scale ground deformation) | On-demand ~60 min |
| NASA FIRMS | MODIS + VIIRS active fire radiative power | 3–6 hr |

### Copernicus Emergency Management Service (EMSR884)

| Source | Data | Update |
|---|---|---|
| EMSR884 API (public) | Activation metadata, products per AOI, S3 bucket URL | 60 min |
| EMSR884 AOI GeoJSON | 13 intervention zones (Caracas, Valencia, Maracay…) | Static |
| EMSR884 Vector Tiles (S3) | DEL/GRA damage products — building-level assessment, EMS-98 scale | Batch (on product finish) |

### Humanitarian / Response

| Source | Data | Update |
|---|---|---|
| ReliefWeb (OCHA) | Situation reports, flash appeals, UN/NGO response | 1 hr |
| HOT OSM Tasking Manager | Active mapping projects, % mapped / validated | 30 min |
| GDELT DOC API | Geolocated news articles, last 24 h | 15 min |

### Air / Space

| Source | Data | Update |
|---|---|---|
| OpenSky Network | ADS-B aircraft states (rescue helicopters, humanitarian flights) | 60 s |
| CelesTrak (TLE) | Sentinel-1A/1B/1C orbital passes over Venezuela | 12 hr |

### Cartography / Infrastructure

| Source | Data | Update |
|---|---|---|
| Overpass API (OSM) | Hospitals, helipads, shelters, schools, fuel, police, fire stations | On viewport change |
| Nominatim (OSM) | Geocoding — zone search bounded to event bbox | On demand |
| MapLibre GL JS + demotiles | Vector base map — streets, buildings, toponyms | Static tiles |
| Cesium ion | Real 3D terrain (World Terrain quantized-mesh) | Static tiles |
| Mapillary | Street-level photos — pre/post comparison at damage points | Static cache |

### AI

| Source | Data | Notes |
|---|---|---|
| OpenRouter | Contextual situational chat, hospital triage, situation reports | `google/gemini-2.0-flash-exp:free` default |

---

## Stack

```
Frontend:   Next.js 14 (App Router) · TypeScript strict · Tailwind CSS v3
Map 2D:     MapLibre GL JS 4.x — open-source, zero tile cost
Map 3D:     CesiumJS (toggle mode) — Cesium World Terrain
AI:         OpenRouter API (OpenAI-compatible) — Gemini 2.0 Flash free tier
i18n:       next-intl (ES / EN)
Data:       Next.js ISR route handlers (60 s – 60 min revalidate per source)
Hosting:    Vercel (free tier)
```

---

## Map layers

| Toggle | Layer | Source |
|---|---|---|
| Epicentros | Main shock pulse rings + selectable circles | USGS |
| Réplicas | Clustered aftershock circles (zoom to expand cluster) | USGS |
| ShakeMap | PGA intensity raster | USGS |
| Fallas | Fault line vectors | USGS Fault DB |
| SAR Cambio | Sentinel-1 change detection overlay | Copernicus CDSE |
| Óptico Pre/Post | Sentinel-2 before/after quicklooks | Copernicus CDSE |
| InSAR | Interferogram browse image (phase deformation) | ASF HyP3 |
| FIRMS | MODIS + VIIRS active fire points | NASA |
| EMSR884 Zonas | 13 AOI intervention boundary polygons | Copernicus EMS |
| EMSR884 Productos | DEL/GRA damage vector tiles (EMS-98 palette) | Copernicus EMS S3 |
| EMSC Sísmico | Complementary seismic events | EMSC |
| Hospitales | Hospital + helipad markers (OSM) — selectable + list fly-to | OSM Overpass |
| Refugios | Emergency shelter locations | OSM Overpass |
| Rutas Evacuación | Evacuation route corridors | OSM Overpass |
| Daño Confirmado | Damage points with Mapillary photo comparison | Internal |
| Vulnerabilidad | Composite vulnerability heatmap (SAR+pop+medical) | Internal calc |
| Tráfico Aéreo | Live ADS-B — positions, trail, inferred routes, ISO2 labels | OpenSky |
| Satélites | Sentinel orbital ground tracks + capture windows | CelesTrak |
| Noticias Geo | Geolocated news article markers | GDELT |

---

## UI features

- **HUD aesthetic** — scanlines overlay, pulse rings on epicenters (magnitude-scaled), targeting reticle on click with `NODE-VEN-XXXX` ID, glitch transition on layer change, corner decorations with live viewport coordinates + UTC
- **Dynamic seismic discovery** — within event bbox: stable event-locked data; outside: USGS rolling 30-day fetch for viewport region with automatic region detection
- **All seismic objects selectable** — individual circles, cluster zoom-on-click, Cesium 3D entity click; all load detail modal
- **Flight route inference** — all visible airborne aircraft show inferred departure→position→arrival polyline from heading + speed projection; click to highlight; no credentials required
- **Hospital list → map** — HospitalStatusPanel lists OSM hospitals by distance; clicking any row flies the map to that location and highlights marker
- **Dynamic event context** — when viewport exits all known events, EVENTO ACTIVO section shows largest live USGS earthquake; AI assistant updates region context automatically
- **Timeline slider** — scrub through pre-main-post event phases, filters SAR/optical layers by date
- **AI assistant panel** — streaming chat terminal with seismic + news + humanitarian context injection; region-aware system prompt (known event or dynamic viewport)
- **Mobile layout** — hamburger menu for all controls; bottom tab bar (Map / Stats / AI); 100dvh safe areas
- **System Health modal** — streaming NDJSON checks all endpoints on startup, shows latency + status
- **EMSR884 panel** — activation metadata, products per AOI, sensor info, download links (ZIP + GeoJSON), vector tile load status
- **InSAR panel** — submit HyP3 job, poll processing status, load interferogram when ready
- **Hospital Status panel** — AI-triage of hospitals near epicenter, capacity, operational status; click row → fly to map
- **Situation Report modal** — AI-generated OCHA-style sitrep with export
- **Data Sources panel** — browsable registry of all active sources with attribution links
- **Zone analysis** — analyze any viewport area: fetches news, reports, satellite imagery, AI summary; cached 20 min
- **Photo comparator** — before/after Mapillary slider for confirmed damage points
- **Event selector** — multi-event support (Venezuela 2026 + Turkey 2023); auto-switches on viewport proximity
- **Bilingüe** — full ES/EN i18n toggle

---

## Setup

### Requirements

- Node.js 20+
- API keys (see `.env.example`)

### Steps

```bash
# 1. Clone and install
git clone https://github.com/miltond4/geovigil-sar.git
cd geovigil-sar
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in the keys listed in .env.example

# 3. Start dev server
npm run dev
# → http://localhost:3000
```

### Environment variables

| Variable | Required for | Notes |
|---|---|---|
| `OPENROUTER_API_KEY` | AI assistant, hospital triage, sitrep | Free tier at openrouter.ai |
| `OPENROUTER_MODEL` | AI model selection | Default: `google/gemini-2.0-flash-exp:free` |
| `COPERNICUS_USERNAME` | SAR + optical Sentinel imagery | dataspace.copernicus.eu |
| `COPERNICUS_PASSWORD` | SAR + optical Sentinel imagery | |
| `NASA_FIRMS_MAP_KEY` | Active fire layer | firms.modaps.eosdis.nasa.gov |
| `EARTHDATA_TOKEN` | InSAR HyP3 jobs | urs.earthdata.nasa.gov/user-tokens |
| `EARTHDATA_USERNAME` | InSAR granule search | |
| `EARTHDATA_PASSWORD` | InSAR granule search | |
| `MAPILLARY_CLIENT_TOKEN` | Street photo comparator | mapillary.com |
| `NEXT_PUBLIC_MAPILLARY_APP_ID` | Mapillary client | |
| `OPENSKY_CLIENT_ID` | Flight history (departure/arrival airports) | opensky-network.org — optional; app infers routes from heading when absent |
| `OPENSKY_CLIENT_SECRET` | Flight history | |
| `NEXT_PUBLIC_CESIUM_TOKEN` | 3D terrain globe | cesium.com |

Missing keys: layers render empty or fall back to inference — the app does not crash.

---

## Project structure

```
geovigil-sar/
├── app/
│   ├── [locale]/              # next-intl routing (es | en)
│   │   ├── page.tsx           # Main dashboard — state, layout, panels
│   │   └── layout.tsx         # HUD shell, Google Fonts
│   └── api/
│       ├── earthquakes/       # USGS proxy — event bbox or dynamic viewport bbox
│       ├── emsc/              # EMSC seismic proxy
│       ├── gdacs/             # GDACS alert feed
│       ├── emsr884/           # Copernicus EMS EMSR884 activation + VT layers
│       ├── sar-tiles/         # Sentinel-1 product search
│       ├── optical/           # Sentinel-2 product search
│       ├── insar/             # ASF HyP3 job submit + poll
│       ├── firms/             # NASA FIRMS fire data
│       ├── news/              # GDELT news proxy
│       ├── humanitarian/      # ReliefWeb + GDELT GKG
│       ├── air-traffic/       # OpenSky ADS-B
│       ├── aircraft/[icao24]/ # Per-aircraft enrichment + route inference
│       ├── satellites/        # CelesTrak TLE + orbital calc
│       ├── hospitals/         # Hospital status + AI triage
│       ├── zone-analyze/      # Zone analysis: news + reports + imagery + AI
│       ├── vulnerability/     # Composite vulnerability score
│       ├── geocode/           # Nominatim zone search
│       ├── situation-report/  # AI sitrep generation
│       ├── ai/                # Streaming chat — region-aware system prompt
│       └── health/            # Streaming NDJSON health check
├── components/
│   ├── map/
│   │   ├── GeoVigilMap.tsx        # Root map wrapper — data fetching, state
│   │   ├── MapLibreMap.tsx        # MapLibre GL instance + all layer mounts
│   │   ├── Cesium3DGlobe.tsx      # CesiumJS 3D globe + entity rendering
│   │   ├── layers/
│   │   │   ├── EarthquakeLayer.tsx      # Circles + pulse rings + cluster zoom
│   │   │   ├── AirTrafficLayer.tsx      # Points + trails + inferred route lines
│   │   │   ├── InfraLayer.tsx           # OSM features — hospitals, helipads, shelters…
│   │   │   ├── ShakeMapLayer.tsx
│   │   │   ├── FaultLinesLayer.tsx
│   │   │   ├── SARLayer.tsx
│   │   │   ├── DamagePointsLayer.tsx
│   │   │   ├── FlightRouteLayer.tsx
│   │   │   └── …
│   │   ├── overlays/              # Scanlines, HUDCorners, TargetingOverlay
│   │   └── controls/              # LayerToggle, ZoneAnalyzeButton, VisionModeControl
│   ├── panels/
│   │   ├── StatsPanel.tsx         # Left panel — live stats + source links + data stream
│   │   ├── AIPanel.tsx            # Right panel — region-aware AI terminal
│   │   ├── HospitalStatusPanel.tsx  # Hospital list + map fly-to
│   │   ├── MapDetailPanel.tsx     # Selected object detail (eq, aircraft, damage, OSM)
│   │   ├── ZoneAnalysisPanel.tsx
│   │   ├── SituationReportModal.tsx
│   │   ├── InSARPanel.tsx
│   │   ├── EMSR884Panel.tsx
│   │   └── DataSourcesPanel.tsx
│   └── DashboardHeader.tsx        # Mobile hamburger + desktop controls
├── lib/
│   ├── ai.ts                  # OpenRouter client + dynamic region-aware system prompt
│   ├── flight-route-infer.ts  # Client-safe heading-based route inference
│   ├── airports.ts            # Static airport database (~300 airports)
│   ├── country-flags.ts       # ISO2 country code lookup (OpenSky name variants)
│   ├── usgs.ts                # USGS API client
│   ├── gdelt.ts               # GDELT DOC API client
│   ├── reliefweb.ts           # ReliefWeb client
│   ├── overpass.ts            # Overpass QL builder — hospitals, helipads, shelters…
│   ├── opensky.ts             # OpenSky ADS-B client
│   ├── orbits.ts              # satellite.js orbital propagation
│   ├── events/                # Event registry (VEN-2406, TUR-2302)
│   └── types/map-selection.ts # SelectedMapObject union type
├── messages/
│   ├── es.json                # Spanish UI strings
│   └── en.json                # English UI strings
├── public/geojson/
│   └── EMSR884_aois.json      # 13 Copernicus EMS AOI polygons (static)
├── DATA_SOURCES.md            # Full source registry: endpoints, auth, cadence
└── WORKPLAN.md                # Phase contracts + acceptance criteria
```

---

## Design language

**Style:** tactical operations room / surveillance HUD  
**Palette:**

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#000A0F` | Main background |
| `--color-panel` | `#001A24` | Panels, sidebars |
| `--color-green` | `#00FF88` | Live data, primary accent |
| `--color-cyan` | `#00B4FF` | SAR layers, satellite, aircraft |
| `--color-red` | `#FF4444` | Damage, alerts, hospitals |
| `--color-amber` | `#FFB800` | Warnings, moderate aftershocks |
| `--color-slate` | `#1A3A4A` | Borders, grids |

**Typography:** Share Tech Mono (HUD values) · Exo 2 (headlines) · Inter (body)

---

## Dev commands

```bash
npm run dev         # Next.js dev server
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # ESLint
npm run build       # Production build
```

---

## License

MIT — third-party data subject to respective terms:  
USGS: public domain · Copernicus: CC BY 4.0 · GDELT: CC BY 4.0 · OSM: ODbL
