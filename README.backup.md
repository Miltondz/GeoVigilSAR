# GeoVigil SAR

**Geospatial Situational Intelligence Platform for Earthquake Emergencies**

Foundational event: **Venezuela Mw 7.2 + Mw 7.5 — 24 June 2026**  
Fault system: Boconó-Morón-El Pilar · Epicenter: Veroes, Yaracuy  
Impact: 235+ fatalities · 4,300+ injured · 138+ aftershocks

---

## What this is

Web dashboard combining real-time seismic feeds, satellite SAR imagery, humanitarian statistics, and an AI situational assistant — styled as a tactical operations room (Person of Interest aesthetic).

**Dual purpose:** operational tool for the Venezuela 2026 earthquake + high-level portfolio piece demonstrating full-stack geospatial + AI integration.

**Infrastructure principle:** 100% free tier. No proprietary servers. No paid APIs.

---

## Live data sources

| Layer | Source | Update |
|---|---|---|
| Earthquakes + aftershocks | USGS Earthquake API | < 2 min |
| Shaking intensity map | USGS ShakeMap (GeoJSON) | Per event |
| SAR structural damage | Sentinel-1 via Copernicus Dataspace | 6-day cycle |
| Optical before/after | Sentinel-2 via Copernicus Dataspace | 5-day cycle |
| Damage proxy maps | NASA ARIA DPM | Post-event |
| News (geolocated) | GDELT DOC API | 15 min |
| Humanitarian stats | GDELT GKG + ReliefWeb/OCHA | 15 min – 1 hr |
| Heat sources | NASA FIRMS | 3–6 hr |
| Street photos | Mapillary | Static cache |
| Base map | OpenStreetMap via Protomaps | Static tiles |

---

## Stack

```
Frontend:    Next.js 14 (App Router) + TypeScript strict
Map:         MapLibre GL JS — open-source, zero tile cost
Tiles:       Protomaps (self-hosted OSM tiles, free)
Styling:     Tailwind CSS v3 + CSS custom properties
Backend:     Convex (real-time DB + cache + serverless functions)
AI:          Anthropic API — claude-sonnet-4-6
i18n:        next-intl (ES / EN)
Hosting:     Vercel (free tier)
SAR assets:  GitHub / Vercel static (COG GeoTIFFs)
```

---

## Setup

### Prerequisites
- Node.js 20+
- A [Convex](https://convex.dev) account (free)
- An [Anthropic](https://console.anthropic.com) API key

### Steps

```bash
# 1. Clone and install
git clone https://github.com/your-user/geovigil-sar.git
cd geovigil-sar
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in: CONVEX_DEPLOYMENT, NEXT_PUBLIC_CONVEX_URL, ANTHROPIC_API_KEY
# Mapillary and NASA FIRMS are optional for Phase 1

# 3. Start Convex (separate terminal)
npx convex dev

# 4. Start Next.js
npm run dev
# → http://localhost:3000
```

---

## Project structure

```
geovigil-sar/
├── app/
│   ├── [locale]/              # next-intl routing (es | en)
│   │   ├── page.tsx           # Main dashboard
│   │   └── layout.tsx         # HUD layout shell
│   └── api/
│       ├── earthquakes/       # USGS proxy + Convex cache
│       ├── news/              # GDELT proxy + cache
│       ├── humanitarian/      # ReliefWeb + GDELT GKG
│       └── ai/                # Anthropic chat endpoint
├── components/
│   ├── map/
│   │   ├── GeoVigilMap.tsx    # Root map component
│   │   ├── layers/            # One file per data layer
│   │   ├── overlays/          # HUD: scanlines, targeting, corners
│   │   └── controls/          # Layer toggle, timeline slider
│   ├── panels/
│   │   ├── StatsPanel.tsx     # Left panel — live stats + data stream
│   │   ├── AIPanel.tsx        # Right panel — AI assistant terminal
│   │   ├── NewsStream.tsx     # Scrolling news feed
│   │   └── PhotoComparator.tsx # Before/after slider modal
│   └── ui/                    # Primitives: HUDText, PulseRing, DataBar...
├── convex/
│   ├── schema.ts              # Full Convex schema
│   ├── earthquakes.ts         # Seismic queries + mutations
│   ├── news.ts                # News cache
│   └── humanitarian.ts        # Stats cache
├── lib/
│   ├── usgs.ts                # USGS API client
│   ├── gdelt.ts               # GDELT client
│   ├── reliefweb.ts           # ReliefWeb client
│   ├── mapillary.ts           # Mapillary client
│   └── anthropic.ts           # AI context builder
├── messages/
│   ├── es.json                # Spanish strings
│   └── en.json                # English strings
├── public/
│   └── sar-tiles/             # Processed GeoTIFFs (served statically)
└── processing/                # SAR processing scripts (not deployed)
    ├── sentinel1_change_detection.py
    └── gee_export.js
```

---

## Development phases

| Phase | Focus | Status |
|---|---|---|
| 0 | Bootstrap: Next.js + Convex + Tailwind + layout shell | Pending |
| 1 | Design system + HUD UI components (mock data) | Pending |
| 2 | Seismic layer: USGS live data + MapLibre map | Pending |
| 3 | SAR + photographic comparison (satellite layers) | Pending |
| 4 | News + humanitarian intelligence (GDELT + ReliefWeb) | Pending |
| 5 | AI assistant (Anthropic API + context injection) | Pending |
| 6 | Multi-event generalization + export | Pending |

See `WORKPLAN.md` for contracts, deliverables, and acceptance criteria per phase.

---

## SAR processing (offline, free tier)

SAR imagery requires manual processing before being served as map tiles:

1. **Download:** Copernicus Dataspace → Sentinel-1 GRD scenes (IW mode, VV polarization)
2. **Process (option A):** Copernicus Dataspace JupyterHub (browser-based, free)  
   Pipeline: `Apply Orbit → Calibrate → Speckle Filter → Terrain Correct → Export GeoTIFF`
3. **Process (option B):** Google Earth Engine (free personal account)  
   `ee.ImageCollection('COPERNICUS/S1_GRD')` → change detection → export to Drive
4. **Serve:** Upload COG GeoTIFF to `public/sar-tiles/` → MapLibre loads as raster tile
5. **Update cadence:** Every 6 days when new Sentinel-1 pass is available

Scripts in `processing/` directory.

---

## Visual design reference

**Style:** Tactical operations room / surveillance HUD  
**Palette:** Deep black + neon green accents + electric cyan for satellite data  
**Typography:** Share Tech Mono (HUD values) · Exo 2 (headlines) · Inter (body)

HUD elements: scanlines overlay, pulse rings on epicenters, targeting reticle on click,  
glitch transitions on layer change, corner decorations with live coordinates.

---

## License

MIT — data from third-party sources subject to their respective terms.  
USGS data: public domain. Copernicus data: CC BY 4.0. GDELT: CC BY 4.0.
