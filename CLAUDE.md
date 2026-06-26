# GeoVigil SAR — Claude Code Context

## Project
Situational intelligence dashboard for earthquake emergencies. Web-based, geospatial, real-time.
Foundational event: Venezuela Mw 7.2 + 7.5 — 24 June 2026 (Yaracuy, Falla Boconó-Morón-El Pilar).
Goal: functional tool + high-level technical portfolio. 100% free tier infrastructure.

## Stack (exact versions)
- Next.js 14 (App Router) + TypeScript strict mode
- MapLibre GL JS 4.x — open-source map renderer, no tile cost
- Tailwind CSS v3 + CSS custom properties for HUD theme
- Convex — real-time backend + cache layer (already in author's stack)
- Anthropic SDK (`@anthropic-ai/sdk`) — claude-sonnet-4-6
- next-intl — i18n, ES/EN
- supercluster — earthquake marker clustering

## Color tokens (always use these, never hardcode hex in components)
```css
--color-bg:        #000A0F   /* main background */
--color-panel:     #001A24   /* panels, sidebars */
--color-green:     #00FF88   /* live data, primary accent */
--color-cyan:      #00B4FF   /* SAR layers, satellite */
--color-red:       #FF4444   /* damage, alerts */
--color-amber:     #FFB800   /* warnings, moderate aftershocks */
--color-slate:     #1A3A4A   /* panel borders, grids */
--color-text:      #E0E8F0   /* primary text */
--color-muted:     #607080   /* secondary text, metadata */
```

## Fonts (Google Fonts — already loaded in layout)
- `Share Tech Mono` — coordinates, timestamps, numeric HUD values
- `Exo 2` — headlines, panel titles
- `Inter` — body text, UI labels

## Architecture rules
- All external API calls go through `lib/` clients — never call 3rd-party APIs directly from components
- All live data cached in Convex with TTL — components read from Convex, not directly from APIs
- MapLibre layers are individual components in `components/map/layers/` — one layer = one file
- i18n strings in `messages/es.json` and `messages/en.json` — never hardcode UI strings
- TypeScript strict — no `any`, no `// @ts-ignore`
- CSS animations for HUD effects (scanlines, pulse rings, glitch) — never JS animations for these

## Key files
- `lib/usgs.ts` — USGS Earthquake API client
- `lib/gdelt.ts` — GDELT DOC API + GKG Counts client
- `lib/reliefweb.ts` — ReliefWeb API client
- `lib/anthropic.ts` — AI assistant context builder + Anthropic client
- `convex/earthquakes.ts` — seismic data schema + queries + mutations
- `convex/schema.ts` — full Convex schema
- `components/map/GeoVigilMap.tsx` — root map component
- `components/panels/StatsPanel.tsx` — left panel
- `components/panels/AIPanel.tsx` — right panel (AI assistant)

## API endpoints (Next.js Route Handlers)
- `GET /api/earthquakes` — returns cached USGS data for Venezuela bbox
- `GET /api/news` — returns GDELT articles, last 24h, Venezuela keywords
- `GET /api/humanitarian` — returns ReliefWeb + GKG stats
- `POST /api/ai` — chat endpoint, injects seismic context into system prompt

## Venezuela bounding box (WGS84)
```
minLat: 0,  maxLat: 13
minLng: -74, maxLng: -59
```

## Event constants (Venezuela 2026)
```typescript
export const VEN_2026_EVENT = {
  id: "VEN-2406",
  mainShockTime: 1750806240000, // 2026-06-24T22:04:00Z in ms
  mainShocks: [
    { magnitude: 7.5, usgsId: "us7000p..." },
    { magnitude: 7.2, usgsId: "us7000p..." },
  ],
  epicenter: { lat: 10.4, lng: -68.7 }, // Veroes, Yaracuy
  faultSystem: "Boconó-Morón-El Pilar",
  affectedStates: ["La Guaira","Miranda","Aragua","Carabobo","Yaracuy","Trujillo"],
  initialZoom: 7,
  bbox: { minLat: 0, maxLat: 13, minLng: -74, maxLng: -59 },
}
```

## HUD visual elements (implement exactly as spec)
1. **Scanlines** — CSS `::after` overlay, `repeating-linear-gradient`, 3% opacity, pointer-events none
2. **Pulse rings** — CSS keyframe `scale + opacity`, ring count proportional to magnitude
3. **Targeting overlay** — 4 corner brackets animate on click, show `NODE-VEN-2406-XXXX` ID
4. **Glitch transition** — 200ms, RGB channel shift via CSS filter + clip-path, on layer change
5. **HUD corners** — fixed position decorations, show viewport coords + UTC timestamp + scale

## Data refresh cadence
| Source      | Interval | Convex cache TTL |
|-------------|----------|-----------------|
| USGS        | 60s      | 90s             |
| GDELT       | 15min    | 20min           |
| ReliefWeb   | 1h       | 90min           |
| NASA FIRMS  | 3h       | 4h              |

## Current phase
See `WORKPLAN.md` for active phase and acceptance criteria.

## Dev commands
```bash
npm run dev          # start Next.js dev server
npx convex dev       # start Convex dev (separate terminal)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
```

## Environment variables
See `.env.example` — copy to `.env.local` before `npm run dev`.
Required: `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `ANTHROPIC_API_KEY`, `MAPILLARY_CLIENT_TOKEN`.
