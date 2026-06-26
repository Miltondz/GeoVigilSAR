# GeoVigil SAR — Plan de Trabajo

*Fases autocontenidas. Cada fase tiene contrato (entradas/salidas), entregables medibles y criterios de aceptación objetivos.*

---

## Resumen de Fases

| # | Fase | Entregable principal | Dep. |
|---|---|---|---|
| 0 | Bootstrap + Infraestructura | Proyecto corriendo localmente | — |
| 1 | Design System + Layout Shell | UI completa con datos mock | 0 |
| 2 | Capa Sísmica en Vivo | Mapa con datos USGS reales | 1 |
| 3 | Capas Satelitales SAR | Overlay daño + slider antes/después | 2 |
| 4 | Inteligencia de Noticias | Feed GDELT + stats humanitarias | 2 |
| 5 | Asistente IA | Chat contextualizado con datos en vivo | 2+4 |
| 6 | Multi-evento + Exportación | Sistema generalizable a cualquier evento | 3+4+5 |

---

## FASE 0 — Bootstrap + Infraestructura

### Objetivo
Repositorio funcional con todas las dependencias instaladas y configuradas. `npm run dev` muestra página en negro.

### Contrato de entrada
- Repositorio git vacío (o solo con PRD/WORKPLAN)
- Cuentas creadas: Convex (free), Anthropic (API key), Vercel (free)
- `.env.local` copiado de `.env.example` y rellenado

### Contrato de salida
- `npm run dev` → `http://localhost:3000` sin errores
- `npx convex dev` → Convex conectado, schema deployado
- TypeScript strict sin errores (`npm run typecheck`)
- ESLint sin errores (`npm run lint`)

### Tareas
- [ ] `npx create-next-app@14 . --typescript --tailwind --app --eslint`
- [ ] Instalar dependencias core:
  ```bash
  npm install convex @convex-dev/react maplibre-gl react-map-gl \
    next-intl @anthropic-ai/sdk supercluster \
    @types/supercluster pmtiles maplibre-gl
  ```
- [ ] Configurar Convex: `npx convex dev` (primera vez)
- [ ] Definir `convex/schema.ts` con todas las tablas (ver PRD §5.2)
- [ ] Configurar next-intl: `i18n.ts`, `middleware.ts`, `messages/es.json`, `messages/en.json`
- [ ] Cargar fuentes Google Fonts en `app/layout.tsx` (Share Tech Mono, Exo 2, Inter)
- [ ] Definir CSS custom properties del tema HUD en `app/globals.css`
- [ ] Configurar `tailwind.config.ts` con colores del tema como tokens
- [ ] `tsconfig.json`: strict mode, path aliases (`@/` → `./`)
- [ ] `.eslintrc.json`: next/core-web-vitals + typescript rules
- [ ] Deploy inicial a Vercel (main branch)

### Criterios de aceptación
- [ ] `npm run dev` sin errores de compilación
- [ ] `npm run typecheck` → 0 errores
- [ ] `npm run lint` → 0 errores
- [ ] `http://localhost:3000` muestra fondo `#000A0F`
- [ ] Convex dashboard muestra schema deployado con todas las tablas
- [ ] Vercel preview URL funcional
- [ ] `.env.example` tiene todas las variables necesarias documentadas

---

## FASE 1 — Design System + Layout Shell

### Objetivo
Interfaz completa estilo sala situacional operativa, con todos los elementos HUD y layout, usando datos mock. Sin integraciones externas.

### Contrato de entrada
- Fase 0 completada (proyecto corriendo, Convex conectado)
- Diseño de referencia: PRD §6 (Layout, paneles, paleta, tipografía)

### Contrato de salida
- Layout de 3 columnas renderizado con todos los elementos HUD activos
- Todos los componentes UI primitivos funcionando
- Datos mock realistas que simulan el evento Venezuela 2026
- Bilingüe ES/EN con toggle funcional

### Componentes a implementar

#### Primitivos UI (`components/ui/`)
| Componente | Props clave | Descripción |
|---|---|---|
| `HUDText` | `value, label, variant` | Texto monospace estilo terminal |
| `DataBar` | `value, max, label, color` | Barra de progreso estilo HUD |
| `PulseRing` | `magnitude, active` | Anillos concéntricos animados CSS |
| `GlitchTransition` | `trigger, children` | Envoltorio con glitch 200ms |
| `StatusBadge` | `status: 'live'|'warning'|'offline'` | Indicador con punto pulsante |

#### Layout (`app/[locale]/layout.tsx`)
- Header: logo GEOVIGIL SAR + event tag + LIVE indicator + UTC clock + nav controls
- Grid 3 columnas: `[240px] [1fr] [320px]`
- Footer: timeline slider placeholder

#### Overlays de mapa (`components/map/overlays/`)
| Componente | Descripción |
|---|---|
| `Scanlines` | CSS overlay, líneas horizontales 3% opacidad |
| `HUDCorners` | 4 esquinas decorativas con coords viewport + escala + UTC |
| `TargetingOverlay` | Brackets animados en clic + ID `NODE-VEN-2406-XXXX` |

#### Paneles (`components/panels/`)
| Componente | Contenido mock |
|---|---|
| `StatsPanel` | M7.5/M7.2 cards, DataBars (235†, 4300⚕, 138≈), DataStream |
| `NewsStream` | 5-8 items ficticios scrolleando |
| `AIPanel` | Chat terminal vacío con mensaje de bienvenida |
| `PhotoComparator` | Modal con slider estático sobre imágenes placeholder |

### Criterios de aceptación
- [ ] Layout renderiza sin overflow en viewport 1440×900 y 1280×800
- [ ] Toggle ES/EN cambia todos los strings de UI
- [ ] PulseRing anima en CSS puro (sin requestAnimationFrame)
- [ ] Scanlines visibles sobre el área del mapa (fondo oscuro de placeholder)
- [ ] HUDCorners muestran UTC timestamp actualizado cada segundo
- [ ] GlitchTransition ejecuta en < 200ms sin jank
- [ ] TargetingOverlay muestra brackets en clic sobre mapa placeholder
- [ ] StatsPanel DataBars tienen valores mock coherentes con evento real
- [ ] `npm run typecheck` → 0 errores
- [ ] Responsive básico: funciona en 768px (tablet landscape)

---

## FASE 2 — Capa Sísmica en Vivo

### Objetivo
Mapa real de Venezuela con datos sísmicos en vivo de USGS: epicentros, réplicas, ShakeMap, sistema de capas, zoom multi-nivel.

### Contrato de entrada
- Fase 1 completada (UI shell con datos mock)
- USGS Earthquake API accesible (pública, sin key)

### Contrato de salida
- Mapa MapLibre GL renderizando Venezuela con tiles Protomaps
- Epicentros M7.2 + M7.5 visibles con PulseRings
- Réplicas (138+) cargadas y agrupadas en clusters
- ShakeMap overlay como raster layer
- Sistema de capas con toggles funcionales
- Panel izquierdo con datos reales de USGS (no mock)
- Réplicas nuevas aparecen en < 2 min del evento USGS

### API client (`lib/usgs.ts`)
```typescript
// Contrato de la función principal:
fetchEarthquakes(bbox: BoundingBox, minMag?: number): Promise<EarthquakeFeature[]>
// BoundingBox: { minLat, maxLat, minLng, maxLng }
// EarthquakeFeature: { id, magnitude, depth, lat, lng, time, place, type }
```

### Convex functions (`convex/earthquakes.ts`)
```typescript
// Mutation: guarda o actualiza sismos del batch USGS
upsertEarthquakes(earthquakes: EarthquakeFeature[]): Promise<void>
// Query: devuelve sismos en bbox, ordenados por tiempo desc
getEarthquakes(bbox: BoundingBox, limit?: number): EarthquakeFeature[]
// Scheduled action: polling USGS cada 60s
pollUSGS(): Promise<void>  // cron Convex cada 60s
```

### Route handler (`app/api/earthquakes/route.ts`)
```
GET /api/earthquakes?minLat=0&maxLat=13&minLng=-74&maxLng=-59&minMag=2.0
→ 200 { earthquakes: EarthquakeFeature[], lastUpdated: number, count: number }
→ 304 si no hay cambios desde If-None-Match
```

### Capas de mapa a implementar
| Layer | Componente | Datos |
|---|---|---|
| Base tiles | `MapLibre` config | Protomaps COG |
| Epicentros principales | `EarthquakeLayer` | USGS, radio = magnitud, color = profundidad |
| Réplicas | `EarthquakeLayer` (aftershocks) | USGS, cluster en zoom < 10 |
| ShakeMap | `ShakeMapLayer` | USGS ShakeMap GeoJSON raster |
| Fallas geológicas | `FaultLinesLayer` | USGS Fault Database GeoJSON estático |

### Comportamiento por zoom
| Zoom | Comportamiento |
|---|---|
| 5–8 | ShakeMap visible, epicentros grandes, réplicas en cluster, sin edificios |
| 9–11 | Zonas por estado, réplicas individuales M3+, ShakeMap transparente |
| 12–14 | Barrios Caracas/La Guaira, daño SAR placeholder, infra crítica OSM |
| 15–16 | Edificios OSM, puntos de daño, overlay reconocimiento |
| 17+ | Ficha de punto activada automáticamente |

### Criterios de aceptación
- [ ] Mapa carga en < 3s en conexión normal (tiles Protomaps)
- [ ] Epicentros M7.2 y M7.5 visibles con PulseRings activos
- [ ] Clic en epicentro muestra TargetingOverlay + ficha con datos reales
- [ ] 138+ réplicas visibles (agrupadas en cluster a zoom 7)
- [ ] ShakeMap overlay con colores de intensidad correctos (MMI scale)
- [ ] Layer toggle activa/desactiva cada capa individualmente
- [ ] StatsPanel muestra conteo real de réplicas desde Convex
- [ ] DataStream muestra últimas 5 réplicas en tiempo real
- [ ] Polling USGS cada 60s verificable en Convex dashboard
- [ ] `npm run typecheck` → 0 errores
- [ ] HUDCorners muestran coordenadas del viewport en movimiento

---

## FASE 3 — Capas Satelitales SAR + Comparativo Fotográfico

### Objetivo
Overlay de daño estructural Sentinel-1, comparativo óptico Sentinel-2 antes/después, puntos de daño confirmado con ficha detallada, integración Mapillary.

### Contrato de entrada
- Fase 2 completada (mapa con datos sísmicos)
- Al menos 1 GeoTIFF Sentinel-1 procesado disponible en `public/sar-tiles/`
- Al menos 2 imágenes Sentinel-2 (pre + post) disponibles
- Script SAR ejecutado exitosamente (ver `processing/`)

### Contrato de salida
- SAR change detection visible como overlay sobre mapa en zoom 12+
- Clic en punto de daño → modal PhotoComparator con slider funcional
- Puntos de daño con datos reales de edificios OSM
- Timeline slider muestra fechas de adquisición satelital

### Procesamiento SAR requerido (previo al desarrollo)
```
Opción A — Copernicus Dataspace JupyterHub:
  1. Buscar escenas Sentinel-1 IW GRD, VV, bbox Venezuela norte
  2. Seleccionar imagen pre (< 20 Jun 2026) y post (25-26 Jun 2026)
  3. Pipeline: Orbit → Calibrate → Speckle(3x3) → TerrainCorrect → Export COG GeoTIFF

Opción B — Google Earth Engine:
  Ver processing/gee_export.js para script completo
  Output: COG GeoTIFF en Google Drive → descargar → public/sar-tiles/

Nomenclatura de archivo: s1_ven_pre_YYYYMMDD.tif / s1_ven_post_YYYYMMDD.tif
```

### Convex schema additions (`convex/schema.ts`)
```typescript
sarLayers: defineTable({
  satellite: v.union(v.literal("sentinel-1"), v.literal("sentinel-2"), v.literal("alos-2")),
  acquisitionDate: v.number(),   // UTC ms
  phase: v.union(v.literal("pre"), v.literal("post")),
  tileUrl: v.string(),           // /sar-tiles/filename.tif or /sar-tiles/filename.png
  boundingBox: v.array(v.number()), // [west, south, east, north]
  confidenceLevel: v.optional(v.number()), // 0-1
})

damagePoints: defineTable({
  location: v.object({ lat: v.number(), lng: v.number() }),
  osmId: v.optional(v.string()),
  address: v.string(),
  buildingType: v.optional(v.string()),
  buildingYear: v.optional(v.number()),
  damageType: v.union(v.literal("collapsed"), v.literal("damaged"), v.literal("unknown")),
  sarConfidence: v.number(),     // 0-1
  confirmedBy: v.array(v.string()),
  photoUrls: v.object({ before: v.optional(v.string()), after: v.optional(v.string()) }),
  mapillaryKey: v.optional(v.string()),
  lastUpdated: v.number(),
})
```

### Componentes nuevos
| Componente | Descripción |
|---|---|
| `SARLayer` | Raster overlay COG GeoTIFF sobre MapLibre |
| `DamagePointsLayer` | Marcadores con confidence overlay `[████░] 78%` |
| `PhotoComparator` | Modal con react-comparison-slider + Mapillary embed |
| `TimelineSlider` | Slider con fechas de adquisición satelital marcadas |

### Criterios de aceptación
- [ ] SAR overlay visible en zoom ≥ 12 con opacidad ajustable
- [ ] COG GeoTIFF carga progresivamente (no bloquea interacción del mapa)
- [ ] Clic en punto de daño → PhotoComparator abre en < 500ms
- [ ] Slider antes/después funciona con mouse y touch
- [ ] Puntos de daño muestran porcentaje SAR confidence correctamente
- [ ] Timeline slider muestra fechas correctas de Sentinel-1 y Sentinel-2
- [ ] Toggle de capa SAR activa/desactiva overlay
- [ ] Modal PhotoComparator muestra datos OSM del edificio si disponibles
- [ ] `npm run typecheck` → 0 errores

---

## FASE 4 — Inteligencia de Noticias + Estadísticas Humanitarias

### Objetivo
Feed de noticias geolocalizadas en tiempo real vía GDELT, estadísticas humanitarias actualizadas, integración ReliefWeb/OCHA, NASA FIRMS.

### Contrato de entrada
- Fase 2 completada (mapa + seismic layer)
- GDELT API accesible (pública, sin key)
- ReliefWeb API accesible (pública, sin key)

### Contrato de salida
- NewsStream muestra artículos reales de GDELT, actualizados cada 15 min
- StatsPanel muestra estadísticas humanitarias reales (no mock)
- Noticias geolocalizadas aparecen como marcadores en el mapa
- Focos de calor NASA FIRMS visibles como capa opcional

### API clients

**`lib/gdelt.ts`**
```typescript
fetchNews(query: string, maxRecords?: number, timespan?: number): Promise<NewsItem[]>
// query: "Venezuela sismo terremoto"
// timespan: minutos (default 1440 = 24h)
// NewsItem: { title, url, source, publishedAt, lat?, lng?, zone, language }

fetchVictimCounts(query: string): Promise<VictimCount>
// Usa GDELT GKG Counts endpoint
// VictimCount: { fatalities, injured, displaced, timestamp }
```

**`lib/reliefweb.ts`**
```typescript
fetchReports(country: string, limit?: number): Promise<ReliefReport[]>
// country: "VEN"
// ReliefReport: { title, url, publishedAt, source, type, summary }
```

### Route handlers
```
GET /api/news?timespan=1440&lang=es
→ 200 { items: NewsItem[], lastUpdated: number }

GET /api/humanitarian
→ 200 { stats: HumanitarianStats, reports: ReliefReport[], lastUpdated: number }
```

### Convex functions
```typescript
// news.ts
cacheNewsItems(items: NewsItem[]): Promise<void>
getNewsItems(limit?: number, lang?: string): NewsItem[]
// Scheduled: poll GDELT cada 15min

// humanitarian.ts
upsertStats(stats: HumanitarianStats): Promise<void>
getLatestStats(): HumanitarianStats
// Scheduled: poll GDELT GKG + ReliefWeb cada 15min
```

### Criterios de aceptación
- [ ] NewsStream muestra ≥ 5 artículos reales sobre Venezuela sismo
- [ ] Artículos tienen timestamp correcto (últimas 24h)
- [ ] Noticias geolocalizadas visibles como marcadores en mapa (toggle)
- [ ] StatsPanel `fatalities` y `injured` provienen de datos reales GDELT/ReliefWeb
- [ ] Stats se actualizan sin recarga de página (Convex reactive queries)
- [ ] NASA FIRMS focos de calor visibles como capa optional
- [ ] Polling verificable: nuevo artículo aparece en < 15 min de publicación
- [ ] `npm run typecheck` → 0 errores

---

## FASE 5 — Asistente IA

### Objetivo
Panel de chat estilo terminal integrado con contexto dinámico del mapa: datos sísmicos actuales, noticias recientes, estadísticas humanitarias, estado de capas activas.

### Contrato de entrada
- Fase 2 completada (datos sísmicos)
- Fase 4 completada (datos de noticias + stats) — o mocks funcionales
- `ANTHROPIC_API_KEY` configurado en `.env.local`

### Contrato de salida
- AIPanel renderiza como terminal oscuro con fuente monospace
- Chat responde en < 4 segundos
- Sistema inyecta contexto sísmico real en cada llamada
- Respuestas bilingües automáticas (detección de idioma)
- Streaming de respuesta visible token a token

### Route handler (`app/api/ai/route.ts`)
```typescript
// POST /api/ai
// Request:
{
  message: string,
  history: { role: "user" | "assistant", content: string }[],
  context: {
    visibleBbox: BoundingBox,
    activeLayers: string[],
    recentEarthquakes: EarthquakeFeature[],  // últimas 10 en bbox visible
    latestStats: HumanitarianStats,
    recentNews: NewsItem[],                  // últimas 5
  }
}
// Response: text/event-stream (streaming)
```

### Context builder (`lib/anthropic.ts`)
```typescript
buildSystemPrompt(context: AIContext): string
// Ensambla system prompt con:
// - Descripción del evento Venezuela 2026
// - Sismos recientes en área visible
// - Últimas estadísticas humanitarias
// - Últimas noticias
// - Capas activas en el mapa
// Respeta límite: ~2000 tokens de contexto dinámico
```

### System prompt base
```
Eres el sistema de inteligencia situacional de GeoVigil SAR.
[...ver PRD §8.2 para prompt completo...]
```

### AIPanel component (`components/panels/AIPanel.tsx`)
- Fuente: Share Tech Mono
- Fondo: `var(--color-panel)` con scanlines
- Prefijo de turno: `SISTEMA >` (verde) y `USUARIO >` (cian)
- Streaming: tokens aparecen progresivamente
- Queries sugeridas: 3 botones contextuales debajo del input
- Historial: scroll automático al nuevo mensaje

### Criterios de aceptación
- [ ] Primera respuesta llega en < 4s (P95)
- [ ] Streaming visible: tokens aparecen uno a uno
- [ ] Contexto incluye réplicas reales del área visible
- [ ] Respuesta en español si pregunta en español
- [ ] Respuesta en inglés si pregunta en inglés
- [ ] Historial de conversación persiste en sesión (no en DB)
- [ ] Error manejado graciosamente si API falla (mensaje en terminal)
- [ ] `npm run typecheck` → 0 errores

---

## FASE 6 — Multi-evento + Exportación

### Objetivo
Sistema generalizable: cualquier evento sísmico global configurable sin cambios de código. Exportación de datos y documentación pública.

### Contrato de entrada
- Fases 2-5 completadas para Venezuela 2026
- Segundo evento de prueba identificado (ej. Turquía 2023 Mw 7.8)

### Contrato de salida
- EventConfig JSON que define completamente un evento
- Selector de evento activo en UI
- Mismo dashboard funciona para Venezuela 2026 Y segundo evento de prueba
- Exportación: PNG mapa, CSV réplicas, PDF reporte

### EventConfig schema
```typescript
interface EventConfig {
  id: string                     // "VEN-2406", "TUR-2302"
  name: { es: string, en: string }
  mainShockTime: number          // UTC ms
  epicenter: { lat: number, lng: number }
  bbox: BoundingBox
  initialZoom: number
  faultSystem: string
  affectedZones: string[]
  usgsQuery: {                   // parámetros para USGS API
    minLat: number, maxLat: number
    minLng: number, maxLng: number
    startTime: string            // ISO date
  }
  gdeltQuery: string             // query string para GDELT
  reliefWebCountry: string       // ISO country code
  sarTiles: {
    pre: { url: string, date: string }[]
    post: { url: string, date: string }[]
  }
  status: "active" | "archive"
}
```

### Exportación
```
PNG:  html2canvas sobre el mapa visible (resolución: 2x devicePixelRatio)
CSV:  earthquakes desde Convex → Papa.parse → download
PDF:  @react-pdf/renderer → reporte con stats + mapa + noticias destacadas
```

### Criterios de aceptación
- [ ] Cargar `EventConfig` de Venezuela → dashboard funcional idéntico a fase 2-5
- [ ] Cargar `EventConfig` de segundo evento → dashboard funcional con datos correctos
- [ ] Selector de evento en header muestra ambos eventos
- [ ] Exportación PNG descarga imagen del mapa visible
- [ ] Exportación CSV descarga réplicas con columnas correctas
- [ ] Sin hardcoding de Venezuela en ningún componente de mapa o datos
- [ ] `npm run typecheck` → 0 errores
- [ ] README actualizado con instrucciones para agregar nuevo evento

---

## Métricas globales de éxito

| Métrica | Target | Validación |
|---|---|---|
| Réplicas en mapa | < 2 min de ocurrencia USGS | Comparar timestamp USGS vs aparición |
| Carga inicial mapa | < 3s | Lighthouse Performance ≥ 80 |
| Respuesta IA | < 4s P95 | Medir 10 queries consecutivas |
| Capas SAR disponibles | < 7 días post-evento | Manual |
| Noticias actualizadas | cada 15 min | Verificar timestamp más reciente |
| 100% free tier | Sin cargo en ningún servicio | Revisar billing en Vercel/Convex/Anthropic |
| Mobile funcional | Funciona en 768px | Test manual + Lighthouse mobile |

---

*GeoVigil SAR — WORKPLAN v1.0 — Junio 2026*
