# GeoVigil SAR — Product Requirements Document
**Plataforma de Inteligencia Situacional Geoespacial para Emergencias**
*Versión 2.0 — Junio 2026 — Claude Code Ready*
*Evento fundacional: Terremotos Venezuela Mw 7.2 + Mw 7.5 — 24 junio 2026*

---

## 1. Visión

Dashboard web de sala situacional que integra datos satelitales abiertos, feeds sísmicos en tiempo real, inteligencia de noticias y análisis de daño estructural en una interfaz de alto impacto visual.

**Propósito dual:**
- Herramienta operacional de análisis de emergencias, acceso público
- Portfolio técnico: integración geoespacial + IA + diseño de sistemas críticos

**Principio rector:** 100% free tier. Sin servidores propios. Sin APIs de pago.

**Reutilizable por evento:** Venezuela 2026 es el caso de uso fundacional; la arquitectura soporta cualquier terremoto global vía `EventConfig`.

---

## 2. Contexto del Evento Fundacional

| Parámetro | Valor |
|---|---|
| Fecha/hora | 24 junio 2026, 22:04 UTC |
| Magnitudes | Mw 7.5 + Mw 7.2 (39 segundos de diferencia) |
| Epicentro | Municipio Veroes, estado Yaracuy, Venezuela |
| Sistema de fallas | Boconó-Morón-El Pilar (1,300 km, strike-slip) |
| Fallecidos | 235+ (al 26 junio 2026) |
| Heridos | 4,300+ |
| Réplicas | 138+ |
| Zonas declaradas desastre | La Guaira |
| Infraestructura crítica | Aeropuerto Simón Bolívar cerrado |
| Estados afectados | La Guaira, Miranda, Aragua, Carabobo, Yaracuy, Trujillo |
| Zonas urbanas dañadas | Altamira, Los Palos Grandes (Caracas), Maiquetía (La Guaira) |

**Constante de evento en código:**
```typescript
// lib/events/ven-2406.ts
export const VEN_2406: EventConfig = {
  id: "VEN-2406",
  name: { es: "Venezuela 2026", en: "Venezuela 2026" },
  mainShockTime: 1750806240000,          // 2026-06-24T22:04:00Z
  epicenter: { lat: 10.4, lng: -68.7 }, // Veroes, Yaracuy
  bbox: { minLat: 0, maxLat: 13, minLng: -74, maxLng: -59 },
  initialZoom: 7,
  faultSystem: "Boconó-Morón-El Pilar",
  affectedStates: ["La Guaira","Miranda","Aragua","Carabobo","Yaracuy","Trujillo"],
  usgsQuery: {
    minLat: 0, maxLat: 13, minLng: -74, maxLng: -59,
    startTime: "2026-06-24", minMagnitude: 2.0,
  },
  gdeltQuery: "Venezuela sismo terremoto",
  reliefWebCountry: "VEN",
  status: "active",
}
```

---

## 3. Usuarios

| Perfil | Necesidad principal | Uso del sistema |
|---|---|---|
| Público general | Entender impacto, seguir en tiempo real | Mapa + estadísticas |
| Periodistas | Datos verificados, mapas exportables | Comparativo fotos + export |
| Investigadores | Series temporales, datos SAR | Timeline + capas satelitales |
| Equipos humanitarios | Zonas de daño, infraestructura crítica | Puntos de daño + capas OSM |
| Autor (portfolio) | Demostración técnica full-stack + geoespacial + IA | Todo el sistema |

Sin autenticación v1. Lectura pública. Sin roles diferenciados hasta v2.

---

## 4. Stack Técnico

### 4.1 Dependencias exactas

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "convex": "latest",
    "@convex-dev/react": "latest",
    "maplibre-gl": "^4.x",
    "react-map-gl": "^7.x",
    "next-intl": "^3.x",
    "@anthropic-ai/sdk": "^0.x",
    "supercluster": "^8.x",
    "@types/supercluster": "^7.x",
    "pmtiles": "^2.x",
    "react-comparison-slider": "^1.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "@types/node": "^20.x",
    "@types/react": "^18.x",
    "eslint": "^8.x",
    "eslint-config-next": "14.x"
  }
}
```

### 4.2 Servicios externos

| Servicio | Uso | Key requerida | Límite free |
|---|---|---|---|
| Vercel | Hosting Next.js | No | 100 GB bandwidth/mes |
| Convex | Real-time DB + cache + crons | Sí (dashboard) | 1M requests/mes |
| Anthropic | AI assistant | Sí | Pay per use |
| Mapillary | Fotos nivel de calle | Sí (gratuita) | 50k req/mes |
| NASA FIRMS | Focos de calor | Sí (gratuita) | 500k req/día |
| USGS Earthquake | Sismos + ShakeMap | No | Sin límite documentado |
| GDELT | Noticias + stats | No | Sin límite documentado |
| ReliefWeb | Reportes OCHA | No | Sin límite documentado |
| Copernicus Dataspace | Imágenes Sentinel | No | Gratis con registro |
| Google Earth Engine | Procesamiento SAR | No | Gratis personal |
| Protomaps | Tiles base OSM | No | Self-hosted, sin límite |

---

## 5. Arquitectura de Datos

### 5.1 Capa Sísmica

**Fuentes:**
- USGS Earthquake API: epicentros, magnitud, profundidad, réplicas
- USGS ShakeMap: intensidad PGA/PGV como GeoJSON

**Endpoint USGS:**
```
https://earthquake.usgs.gov/fdsnws/event/1/query
  ?format=geojson
  &minlatitude=0&maxlatitude=13
  &minlongitude=-74&maxlongitude=-59
  &minmagnitude=2.0
  &orderby=time
  &starttime=2026-06-24
```

**Polling:** Convex scheduled action cada 60s → upsert en tabla `earthquakes`

### 5.2 Capa Satelital SAR

| Satélite | Banda | Dato | Portal |
|---|---|---|---|
| Sentinel-1 C/D | SAR C-band | Change detection estructural, deformación InSAR | dataspace.copernicus.eu |
| Sentinel-2 | Óptico 10m | Comparativo visual antes/después | dataspace.copernicus.eu |
| ALOS-2 PALSAR-2 | SAR L-band | Penetra vegetación, complementa Sentinel | earthdata.nasa.gov / ASF |
| NASA ARIA DPM | SAR procesado | Damage Proxy Maps listos | aria-products.jpl.nasa.gov |

**Pipeline SAR (sin infraestructura propia):**
```
1. Copernicus Dataspace JupyterHub (gratis, en browser)
   → Apply Orbit → Calibrate → Speckle Filter(3x3) → Terrain Correct → COG GeoTIFF

2. Google Earth Engine (alternativa)
   → ee.ImageCollection('COPERNICUS/S1_GRD') → change detection → Drive → COG

3. Distribución: GeoTIFF → public/sar-tiles/ → Vercel CDN → MapLibre raster layer
```

**Cadencia:** nueva escena Sentinel-1 cada 6 días para Venezuela norte.

### 5.3 Capa de Noticias e Inteligencia Humanitaria

**GDELT DOC API:**
```
https://api.gdeltproject.org/api/v2/doc/doc
  ?query=Venezuela+sismo+terremoto
  &mode=artlist&maxrecords=25
  &format=json&TIMESPAN=1440
```

**GDELT GKG Counts** (tracker de víctimas extraído de medios):
```
http://data.gdeltproject.org/gdeltv2/lastupdate.txt
→ process GKG counts for Venezuela earthquake keywords
```

**ReliefWeb API:**
```
https://api.reliefweb.int/v1/reports
  ?filter[field]=country.iso3&filter[value]=VEN
  &fields[include][]=title,body-html,date,source
  &sort[]=date:desc&limit=10
```

**Polling:** Convex scheduled action cada 15 min (GDELT) y 1h (ReliefWeb)

### 5.4 Convex Schema completo

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  earthquakes: defineTable({
    usgsId: v.string(),
    magnitude: v.number(),
    depth: v.number(),
    lat: v.number(),
    lng: v.number(),
    time: v.number(),
    place: v.string(),
    type: v.union(v.literal("mainshock"), v.literal("foreshock"), v.literal("aftershock"), v.literal("earthquake")),
    eventId: v.string(),         // "VEN-2406"
  })
    .index("by_event", ["eventId"])
    .index("by_time", ["time"])
    .index("by_usgs_id", ["usgsId"]),

  sarLayers: defineTable({
    eventId: v.string(),
    satellite: v.union(v.literal("sentinel-1"), v.literal("sentinel-2"), v.literal("alos-2")),
    acquisitionDate: v.number(),
    phase: v.union(v.literal("pre"), v.literal("post")),
    tileUrl: v.string(),
    boundingBox: v.array(v.number()),  // [west, south, east, north]
    sarConfidence: v.optional(v.number()),
  })
    .index("by_event_phase", ["eventId", "phase"]),

  damagePoints: defineTable({
    eventId: v.string(),
    lat: v.number(),
    lng: v.number(),
    osmId: v.optional(v.string()),
    address: v.string(),
    buildingType: v.optional(v.string()),
    buildingYear: v.optional(v.number()),
    damageType: v.union(v.literal("collapsed"), v.literal("damaged"), v.literal("unknown")),
    sarConfidence: v.number(),
    confirmedBy: v.array(v.string()),
    photoBefore: v.optional(v.string()),
    photoAfter: v.optional(v.string()),
    mapillaryKey: v.optional(v.string()),
    lastUpdated: v.number(),
  })
    .index("by_event", ["eventId"]),

  newsItems: defineTable({
    eventId: v.string(),
    title: v.string(),
    url: v.string(),
    source: v.string(),
    publishedAt: v.number(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    zone: v.optional(v.string()),
    language: v.union(v.literal("es"), v.literal("en"), v.literal("other")),
    cachedAt: v.number(),
  })
    .index("by_event_time", ["eventId", "publishedAt"])
    .index("by_event_lang", ["eventId", "language"]),

  humanitarianStats: defineTable({
    eventId: v.string(),
    timestamp: v.number(),
    fatalities: v.number(),
    injured: v.number(),
    missing: v.optional(v.number()),
    displaced: v.optional(v.number()),
    rescuedAlive: v.optional(v.number()),
    sheltersActive: v.optional(v.number()),
    source: v.string(),
  })
    .index("by_event_time", ["eventId", "timestamp"]),

  events: defineTable({
    id: v.string(),
    name_es: v.string(),
    name_en: v.string(),
    mainShockTime: v.number(),
    epicenterLat: v.number(),
    epicenterLng: v.number(),
    status: v.union(v.literal("active"), v.literal("archive")),
  })
    .index("by_status", ["status"]),
})
```

---

## 6. API Contracts (Route Handlers)

### GET /api/earthquakes

```
Query params:
  eventId: string (default "VEN-2406")
  minMag?: number (default 2.0)
  limit?: number (default 500)

Response 200:
{
  earthquakes: {
    id: string
    usgsId: string
    magnitude: number
    depth: number
    lat: number
    lng: number
    time: number
    place: string
    type: "mainshock" | "aftershock" | "foreshock" | "earthquake"
  }[]
  lastUpdated: number
  count: number
}

Response 304: si ETag no cambió
```

### GET /api/news

```
Query params:
  eventId: string (default "VEN-2406")
  lang?: "es" | "en" (default: all)
  limit?: number (default 25)

Response 200:
{
  items: {
    title: string
    url: string
    source: string
    publishedAt: number
    lat?: number
    lng?: number
    language: "es" | "en" | "other"
  }[]
  lastUpdated: number
}
```

### GET /api/humanitarian

```
Query params:
  eventId: string (default "VEN-2406")

Response 200:
{
  stats: {
    fatalities: number
    injured: number
    missing?: number
    displaced?: number
    rescuedAlive?: number
    source: string
    timestamp: number
  }
  reports: {
    title: string
    url: string
    source: string
    publishedAt: number
  }[]
  lastUpdated: number
}
```

### POST /api/ai

```
Request body:
{
  message: string
  history: { role: "user" | "assistant", content: string }[]
  context: {
    eventId: string
    visibleBbox: { minLat: number, maxLat: number, minLng: number, maxLng: number }
    activeLayers: string[]
    recentEarthquakes: { magnitude: number, place: string, time: number, depth: number }[]
    latestStats: { fatalities: number, injured: number, source: string }
    recentNews: { title: string, source: string, publishedAt: number }[]
  }
}

Response: text/event-stream
  → tokens de respuesta streameados
  → evento "done" al finalizar
```

---

## 7. Diseño Visual

### 7.1 Tokens de diseño

```css
/* app/globals.css — usar siempre estas variables, nunca hex directo */
:root {
  --color-bg:       #000A0F;
  --color-panel:    #001A24;
  --color-green:    #00FF88;  /* datos en vivo, primary accent */
  --color-cyan:     #00B4FF;  /* SAR, satelital */
  --color-red:      #FF4444;  /* daño máximo, alertas */
  --color-amber:    #FFB800;  /* advertencias, réplicas moderadas */
  --color-slate:    #1A3A4A;  /* bordes de paneles */
  --color-text:     #E0E8F0;  /* texto principal */
  --color-muted:    #607080;  /* texto secundario */

  --font-hud:       'Share Tech Mono', monospace;
  --font-headline:  'Exo 2', sans-serif;
  --font-body:      'Inter', sans-serif;
}
```

### 7.2 Fuentes

| Fuente | Uso | Google Fonts URL |
|---|---|---|
| Share Tech Mono | Coordenadas, timestamps, valores numéricos HUD | `?family=Share+Tech+Mono` |
| Exo 2 | Títulos de panel, headlines | `?family=Exo+2:wght@400;600;700` |
| Inter | Texto de cuerpo, labels UI | `?family=Inter:wght@400;500` |

### 7.3 Elementos HUD (especificación de implementación)

#### Scanlines
```css
.scanlines::after {
  content: '';
  position: absolute; inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  pointer-events: none;
  z-index: 10;
}
```

#### Pulse rings (epicentros)
```css
@keyframes pulse-ring {
  0%   { transform: scale(1);   opacity: 0.8; }
  100% { transform: scale(3.5); opacity: 0; }
}
.pulse-ring {
  animation: pulse-ring 2s ease-out infinite;
  /* velocidad proporcional a magnitud: duration = max(0.8, 4 - magnitude * 0.3) */
}
```

#### Glitch transition (cambio de capa)
```css
@keyframes glitch {
  0%   { filter: none; clip-path: none; }
  20%  { filter: hue-rotate(90deg) saturate(3); clip-path: inset(10% 0 80% 0); }
  40%  { filter: hue-rotate(-90deg); clip-path: inset(60% 0 20% 0); }
  60%  { filter: saturate(0) brightness(2); clip-path: none; }
  80%  { filter: hue-rotate(45deg); clip-path: inset(30% 0 50% 0); }
  100% { filter: none; clip-path: none; }
}
/* duración: 200ms, se dispara al cambiar layer activo */
```

#### Targeting overlay (clic en mapa)
```css
/* 4 corchetes esquineros que convergen sobre el punto */
/* ID generado: NODE-VEN-2406-XXXX (4 hex chars) */
/* Animación: transform: translate desde ±20px hacia 0, 300ms ease-out */
```

#### HUD Corners
- Posición: fixed en los 4 ángulos del área del mapa
- Contenido: coordenadas viewport center (WGS84 decimal, 4 decimales), escala actual, UTC timestamp (actualizado cada segundo)
- Decoración: líneas en L de 20px × 2px, color `var(--color-slate)`

### 7.4 Layout Grid

```
Header:    height 48px — posición fixed top
Contenido: height calc(100vh - 48px - 40px) — debajo del header
  Columna izquierda:  240px fixed — StatsPanel
  Columna central:    1fr — GeoVigilMap (con overlays)
  Columna derecha:    320px fixed — AIPanel
Footer:    height 40px — posición fixed bottom — TimelineSlider
```

```
┌─────────────────────────────────────────────────────────────────────┐
│  ▌GEOVIGIL SAR▐  [VEN-2406] ACTIVE EVENT  ●LIVE  UTC 2026-06-26   │
├──────────┬──────────────────────────────────────┬───────────────────┤
│  240px   │              1fr                     │      320px        │
│          │                                      │                   │
│  STATS   │         MAPA (MapLibre GL)           │   AI ASSISTANT    │
│  PANEL   │                                      │   (terminal)      │
│          │   HUD corners, scanlines,             │                   │
│          │   targeting, pulse rings              │                   │
│          │                                      │                   │
│ [STREAM] │                                      │  [NEWS GDELT]     │
├──────────┴──────────────────────────────────────┴───────────────────┤
│  40px  TIMELINE ─────────────────────────── [PRE] ◄──────► [POST]  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Capas del Mapa

### 8.1 Comportamiento por zoom

| Zoom | Nivel | Capas activas por defecto |
|---|---|---|
| 5–8 | País | ShakeMap intensidad, epicentros principales, fallas geológicas |
| 9–11 | Regional | Réplicas M2+, zonas por estado, ShakeMap transparente |
| 12–14 | Ciudad | Barrios, daño SAR por sector, hospitales OSM |
| 15–16 | Barrio | Edificios OSM, puntos de daño, overlay confidence SAR |
| 17+ | Edificio | Ficha automática, comparativo fotográfico disponible |

### 8.2 Sistema de capas (toggle state inicial)

```typescript
const DEFAULT_LAYERS = {
  // Sísmicas — ON por defecto
  epicenters:       true,
  aftershocks:      true,
  shakemap:         true,
  // Sísmicas — OFF
  faults:           false,
  seismicHistory:   false,
  // Satelitales — ON
  sarChange:        true,
  // Satelitales — OFF
  opticalPre:       false,
  opticalPost:      false,
  sarLband:         false,
  ariaDPM:          false,
  firms:            false,
  // Humanitarias — OFF
  damagePoints:     false,
  hospitals:        false,
  shelters:         false,
  evacRoutes:       false,
  noAccess:         false,
  // Contexto — ON
  buildings:        true,
  // Contexto — OFF
  population:       false,
  geoNews:          false,
}
```

### 8.3 Escala de magnitud → visual

| Magnitud | Radio marcador | Color borde | Duración pulse |
|---|---|---|---|
| < 3.0 | 4px | `--color-muted` | sin pulse |
| 3.0–3.9 | 6px | `--color-amber` | 3.5s |
| 4.0–4.9 | 9px | `--color-amber` | 2.5s |
| 5.0–5.9 | 14px | `--color-red` | 1.5s |
| 6.0–6.9 | 20px | `--color-red` | 1.0s |
| 7.0+ | 30px | `--color-red` | 0.8s |

---

## 9. Asistente IA

### 9.1 System prompt completo

```
Eres el sistema de inteligencia situacional de GeoVigil SAR.
Tienes acceso a datos sísmicos en tiempo real de USGS, imágenes
satelitales de Copernicus, noticias de GDELT y reportes humanitarios
de ReliefWeb/OCHA para el evento sísmico de Venezuela del 24 de
junio de 2026 (Mw 7.2 + Mw 7.5, Yaracuy, falla Boconó-Morón-El Pilar).

Responde en el idioma en que se te pregunta (español o inglés).
Sé directo, técnico y preciso. Cita las fuentes de los datos que usas.
Si no tienes datos suficientes, dilo claramente. No especules más allá
de lo que los datos permiten. Formato: respuestas cortas y estructuradas.
Usa números concretos cuando estén disponibles.
Prioriza utilidad operacional.

--- DATOS ACTUALES DEL EVENTO ---
{CONTEXT_EARTHQUAKES}
{CONTEXT_STATS}
{CONTEXT_NEWS}
{CONTEXT_ACTIVE_LAYERS}
```

### 9.2 Inyección de contexto dinámico

```typescript
// lib/anthropic.ts
interface AIContext {
  eventId: string
  recentEarthquakes: { magnitude: number; place: string; time: number; depth: number }[]
  latestStats: { fatalities: number; injured: number; source: string; timestamp: number }
  recentNews: { title: string; source: string; publishedAt: number }[]
  activeLayers: string[]
  visibleBbox: BoundingBox
}

function buildContextBlock(ctx: AIContext): string {
  // Max ~2000 tokens de contexto dinámico
  // Incluye: últimas 10 réplicas, stats actuales, últimas 5 noticias, capas activas
}
```

### 9.3 Capacidades

- Consultas por zona: *"¿qué está pasando en Altamira?"*
- Análisis de riesgo de réplica por distribución de aftershocks
- Búsqueda en noticias GDELT por zona y rango de tiempo
- Explicación de datos SAR (backscatter, change detection, InSAR)
- Estadísticas humanitarias por zona
- Contexto geológico de la falla Boconó-Morón-El Pilar

---

## 10. Bilingüe (ES/EN)

- Toggle ES | EN en header, siempre visible
- Strings de UI en `messages/es.json` y `messages/en.json` via next-intl
- Términos técnicos internacionales iguales en ambos idiomas (InSAR, ShakeMap, backscatter, SAR)
- IA detecta idioma del input y responde en el mismo
- Timestamps: siempre UTC con indicación explícita
- Coordenadas: siempre WGS84 decimal (4 decimales)

---

## 11. Consideraciones Técnicas Críticas

### Rate limits y mitigación

| API | Límite free | Mitigación |
|---|---|---|
| USGS | Sin límite documentado | Cache Convex, TTL 90s |
| GDELT | Sin límite documentado | Cache Convex, TTL 20min |
| Anthropic | Por plan | Context caching, no re-llamar sin cambios |
| Mapillary | 50k req/mes | Cache agresivo, cargar solo al clic |
| NASA FIRMS | 500k req/día | Sin problema a este scale |
| ReliefWeb | Sin límite documentado | Cache Convex, TTL 90min |

### Rendimiento

- GeoTIFFs SAR pesados (>50MB) servidos como Cloud-Optimized GeoTIFF (COG) — carga por tile progresiva
- Réplicas agrupadas en clusters con `supercluster` en zoom < 10 (K-means espacial)
- Capas opcionales (OFF por defecto) no se cargan hasta toggle
- Convex reactive queries: StatsPanel y DataStream actualizan sin polling desde el cliente

### Procesamiento SAR sin infraestructura

```
Cadena de procesamiento (manual, gratuita):
1. Copernicus Dataspace → buscar escenas S1 IW GRD VV para Venezuela norte
2. JupyterHub en browser → pipeline snappy:
   Apply Orbit File → Calibration (dB) → Speckle Filter (3×3) → 
   Terrain Correction (SRTM 3Sec) → Export COG GeoTIFF
3. Upload a public/sar-tiles/ → Vercel CDN
4. MapLibre: addSource({type:'raster', tiles:['/sar-tiles/...']})
Repetir cada 6 días cuando hay nueva pasada Sentinel-1.
```

---

## 12. Estructura del Repositorio

```
geovigil-sar/
├── CLAUDE.md                      ← contexto para Claude Code
├── WORKPLAN.md                    ← fases, contratos, criterios aceptación
├── GeoVigil_SAR_PRD.md           ← este documento
├── .env.example                   ← todas las variables documentadas
│
├── app/
│   ├── [locale]/
│   │   ├── page.tsx               ← dashboard principal
│   │   └── layout.tsx             ← layout HUD con header/footer
│   └── api/
│       ├── earthquakes/route.ts   ← GET /api/earthquakes
│       ├── news/route.ts          ← GET /api/news
│       ├── humanitarian/route.ts  ← GET /api/humanitarian
│       └── ai/route.ts            ← POST /api/ai (streaming)
│
├── components/
│   ├── map/
│   │   ├── GeoVigilMap.tsx        ← root: MapLibre init + layer orchestration
│   │   ├── layers/
│   │   │   ├── EarthquakeLayer.tsx    ← epicentros + réplicas + clusters
│   │   │   ├── ShakeMapLayer.tsx      ← raster PGA/MMI
│   │   │   ├── SARLayer.tsx           ← raster COG GeoTIFF
│   │   │   ├── DamagePointsLayer.tsx  ← marcadores con confidence
│   │   │   └── FaultLinesLayer.tsx    ← líneas GeoJSON estáticas
│   │   ├── overlays/
│   │   │   ├── Scanlines.tsx          ← CSS overlay
│   │   │   ├── HUDCorners.tsx         ← coordenadas + escala + UTC
│   │   │   └── TargetingOverlay.tsx   ← brackets + NODE ID en clic
│   │   └── controls/
│   │       ├── LayerToggle.tsx        ← panel de capas con checkboxes
│   │       └── TimelineSlider.tsx     ← slider temporal con marcadores SAR
│   │
│   ├── panels/
│   │   ├── StatsPanel.tsx         ← panel izquierdo: stats + data stream
│   │   ├── AIPanel.tsx            ← panel derecho: chat terminal
│   │   ├── NewsStream.tsx         ← feed scrolleable de noticias GDELT
│   │   └── PhotoComparator.tsx    ← modal antes/después con slider
│   │
│   └── ui/
│       ├── HUDText.tsx            ← texto monospace estilo terminal
│       ├── DataBar.tsx            ← barra progreso estilo HUD
│       ├── PulseRing.tsx          ← anillos concéntricos CSS
│       ├── StatusBadge.tsx        ← indicador pulsante LIVE/OFFLINE
│       └── GlitchTransition.tsx   ← wrapper con efecto glitch 200ms
│
├── convex/
│   ├── schema.ts                  ← schema completo (ver §5.4)
│   ├── earthquakes.ts             ← queries + mutations + cron USGS
│   ├── sarLayers.ts               ← queries SAR layers
│   ├── damagePoints.ts            ← queries puntos de daño
│   ├── news.ts                    ← queries + cron GDELT
│   └── humanitarian.ts            ← queries + cron ReliefWeb
│
├── lib/
│   ├── events/
│   │   └── ven-2406.ts            ← EventConfig Venezuela 2026
│   ├── usgs.ts                    ← USGS API client
│   ├── gdelt.ts                   ← GDELT DOC + GKG client
│   ├── reliefweb.ts               ← ReliefWeb API client
│   ├── mapillary.ts               ← Mapillary API client
│   └── anthropic.ts               ← context builder + Anthropic client
│
├── messages/
│   ├── es.json                    ← strings ES
│   └── en.json                    ← strings EN
│
├── public/
│   └── sar-tiles/                 ← GeoTIFFs procesados (COG)
│
└── processing/                    ← scripts offline, no deployados
    ├── sentinel1_change_detection.py
    └── gee_export.js
```

---

## 13. Métricas de Éxito

| Métrica | Target | Medición |
|---|---|---|
| Réplicas en mapa | < 2 min de ocurrencia USGS | Timestamp USGS vs Convex |
| Carga inicial mapa | < 3s | Lighthouse Performance ≥ 80 |
| Capas SAR post-evento | < 7 días | Manual (ciclo Sentinel-1) |
| Respuesta IA | < 4s P95 | 10 queries consecutivas |
| Refresh noticias | cada 15 min | Timestamp más reciente en Convex |
| 100% free tier | $0 infra | Revisar billing en todos los servicios |
| Mobile funcional | 768px landscape | Test manual + Lighthouse mobile |
| TypeScript strict | 0 errores | `npm run typecheck` en CI |

---

## 14. Referencias

**Datos sísmicos**
- USGS Earthquake API: https://earthquake.usgs.gov/fdsnws/event/1/
- USGS ShakeMap: https://earthquake.usgs.gov/data/shakemap/

**Datos satelitales**
- Copernicus Dataspace: https://dataspace.copernicus.eu
- NASA ASF DAAC (ALOS-2): https://asf.alaska.edu
- NASA ARIA DPM: https://aria-products.jpl.nasa.gov
- Copernicus EMS: https://emergency.copernicus.eu
- UN-SPIDER (metodología SAR): https://www.un-spider.org

**Noticias y humanitario**
- GDELT Project: https://www.gdeltproject.org
- ReliefWeb API: https://reliefweb.int/help/api
- NASA FIRMS: https://firms.modaps.eosdis.nasa.gov

**Fotográfico**
- Mapillary API: https://www.mapillary.com/developer/api-documentation

**Infraestructura**
- MapLibre GL JS: https://maplibre.org
- Protomaps (tiles gratuitos): https://protomaps.com
- Convex: https://convex.dev
- next-intl: https://next-intl-docs.vercel.app

---

*GeoVigil SAR — PRD v2.0 — Claude Code Ready*
*Autor: DIAZ — Junio 2026*
