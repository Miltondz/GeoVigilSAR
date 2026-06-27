# GeoVigil SAR — WORKPLAN Panóptico

*Plan ejecutable por Claude Code (Sonnet). Cada fase es autocontenida.*

> Derivado de `GeoVigil_SAR_Mejoras_Panoptico.md` v1.0.
> Stack base verificado: Next.js 14 App Router · TypeScript strict · MapLibre GL JS 4.x · Tailwind v3 + CSS custom props · OpenRouter (Llama 3.3 70B) vía OpenAI SDK · next-intl ES/EN · APIs públicas USGS/GDELT/ReliefWeb.
> **Nota de realidad del repo:** NO existe carpeta `convex/` todavía (Convex está en `package.json` pero sin schema). Las fases que usan Convex deben crear `convex/schema.ts` y `convex/` desde cero, O usar el fallback documentado (route handler + cache en memoria/ISR). Cada fase indica ambos caminos.

---

## Resumen de Fases

| # | Fase | Entregable principal | Dep. | Estimado | Keys nuevas |
|---|---|---|---|---|---|
| 0 | Índice de Vulnerabilidad Compuesto | Heatmap MapLibre de score compuesto + motor de cálculo | — | 2-3 días | Ninguna |
| 1 | Fusión Aérea OpenSky + Timeline | Capa aeronaves + panel timeline multi-fuente | 0 | 3-4 días | Ninguna |
| 2 | Tracking Satelital NORAD | Traza orbital Sentinel-1 + ventana de captura | 1 | 2 días | Opcional (N2YO; fallback Celestrak sin key) |
| 3 | Timeline interactivo + Estado Hospitalario IA | Brush temporal + clasificador hospitales IA | 1 | 2-3 días | Ninguna (usa OpenRouter ya en stack) |
| 4 | Motor 3D CesiumJS (coexistencia) | Globo Cesium toggle + paridad de capas P0 | 1 | 4-5 días | Opcional (Cesium Ion; fallback Ellipsoid) |
| 5 | Geometría Urbana 3D + Lock-on + Shaders | 3D Tiles/OSM Buildings + cámara seguidora + FLIR/NVG/CRT | 4 | 4-5 días | Opcional (Google 3D Tiles; fallback OSM Buildings) |
| 6 | Zona Específica + Situation Report PDF | Resumen IA de zona + export PDF OCHA | 1 (3,5 opc.) | 2-3 días | Ninguna |

**Camino crítico de valor:** Fase 0 → 1 → 3 entrega el salto analítico "visor → inteligencia" sin keys nuevas. Fases 4-5 entregan la estética "Spy Thriller" (3D + shaders). Fase 6 cierra el ciclo de usuario.

**Regla de oro (del documento fuente):** MapLibre y Cesium coexisten hasta el final. Nada se rompe en `main` en ningún punto.

---

## FASE 0 — Índice de Vulnerabilidad Compuesto

### Objetivo
Entregar el músculo analítico de mayor impacto (índice de vulnerabilidad médica/poblacional/SAR) sobre el motor MapLibre actual, sin keys nuevas. Una zona con daño SAR moderado pero sin hospital operativo cercano debe escalar a CRITICAL.

### Contrato de Entrada
- App funcional con `MapLibreMap.tsx` renderizando sismos USGS del evento VEN-2406.
- `lib/events/index.ts` exporta `EVENT_REGISTRY` con bbox Venezuela.
- `npm run typecheck` y `npm run lint` limpios.

### Contrato de Salida
- `lib/vulnerability.ts` exporta `computeVulnerability()` y `rankOf()` puros y testeados contra fixture.
- `GET /api/vulnerability` devuelve ≥10 zonas con score `composite` calculado.
- Capa `VulnerabilityHeatmap` visible y toggleable en el mapa.
- Dataset estático de hospitales y densidad poblacional pre-procesado en `data/`.

### Resultado Esperado
El usuario activa la capa "Vulnerabilidad" desde el `LayerToggle`. El mapa pinta un gradiente de polígonos/celdas verde→ámbar→rojo sobre Venezuela. Tres parroquias aparecen en rojo CRITICAL pese a daño moderado, con tooltip que explica "hospital más cercano inoperativo". Leyenda lateral con escala LOW→CRITICAL.

### Tareas
- [ ] `data/hospitals-venezuela.json` — dataset estático de hospitales (OSM/OCHA export manual del usuario o seed fixture): osmId, name, lat, lng, status inicial, capacity. **[TRABAJO MANUAL: el usuario puede exportar de Overpass `amenity=hospital` en bbox VEN; si no, usar fixture de 15-20 hospitales reales de Caracas/Valencia/La Guaira]**
- [ ] `data/population-h3-venezuela.json` — densidad WorldPop pre-agregada a celdas H3 res 7, normalizada 0..1. **[TRABAJO MANUAL: pre-procesar offline desde WorldPop raster; si no, fixture sintético basado en centros poblados conocidos]**
- [ ] `lib/vulnerability.ts` — motor de cálculo: `computeVulnerability()`, `rankOf()`, `clamp01()`, pesos `{ sar: 0.35, pop: 0.30, medical: 0.35 }`.
- [ ] `lib/hospitals.ts` — loader del dataset de hospitales + función `nearestOperationalHospitalKm(lat, lng)`.
- [ ] `app/api/vulnerability/route.ts` — route handler: lee datasets, calcula score por celda, devuelve `VulnerabilityScore[]` con cache `next: { revalidate: 300 }`.
- [ ] `components/map/layers/VulnerabilityHeatmap.tsx` — capa MapLibre tipo `fill`/`heatmap` con gradiente de color tokens; tooltip por celda mostrando variable dominante.
- [ ] `components/map/controls/LayerToggle.tsx` — añadir entrada "Vulnerabilidad" al registro de capas.
- [ ] `messages/es.json` + `messages/en.json` — strings: título capa, leyenda LOW/MODERATE/HIGH/CRITICAL, tooltip factores.
- [ ] `lib/vulnerability.test.ts` (o fixture inline) — verificar caso "daño moderado + sin hospital → CRITICAL".

### APIs / Dependencias Nuevas
| Recurso | URL/Package | Key requerida | Free tier |
|---|---|---|---|
| h3-js (indexación H3) | npm `h3-js` | No | Sí (Apache 2.0) |
| WorldPop (offline) | https://www.worldpop.org/ | No | Datos abiertos, pre-procesado offline |
| Overpass (hospitales, offline) | https://overpass-api.de/api/interpreter | No | Gratis, export manual una vez |

### Interfaces TypeScript (contratos de datos)
```typescript
// lib/vulnerability.ts
export interface VulnerabilityScore {
  zoneId: string;                 // H3 cell id (res 7)
  centroid: { lat: number; lng: number };
  sarChange: number;              // 0..1 backscatter delta (fixture en Fase 0; real en Fase futura)
  populationDensity: number;      // 0..1 normalizado WorldPop
  medicalAccess: number;          // 0..1 (1 = peor acceso)
  composite: number;              // 0..1 score final ponderado
  rank: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
}

// lib/hospitals.ts
export interface Hospital {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  status: "GREEN" | "AMBER" | "RED";   // operativo / parcial / inoperativo
  capacity?: number;
  source: "osm" | "ocha" | "gdelt" | "manual";
  updatedMs: number;
}

export interface VulnerabilityInput {
  sarChange: number;
  populationDensity: number;
  nearestHospitalKm: number;
  hospitalOperational: boolean;
}
```

### Criterios de Aceptación
- [ ] `computeVulnerability({ sarChange:0.4, populationDensity:0.5, nearestHospitalKm:5, hospitalOperational:false })` retorna `composite ≥ 0.5` → rank HIGH o CRITICAL (fixture verificable).
- [ ] `GET /api/vulnerability` responde 200 con array de ≥10 `VulnerabilityScore`.
- [ ] La capa pinta ≥10 zonas con color proporcional a `composite`; al menos 1 zona CRITICAL.
- [ ] Toggle de la capa muestra/oculta sin recargar.
- [ ] `npm run typecheck` y `npm run lint` limpios. Sin `any`, sin `@ts-ignore`.

---

## FASE 1 — Fusión Aérea OpenSky (P0 del Bloque C)

### Objetivo
Rastreo aéreo en vivo sobre Venezuela vía OpenSky Network (sin key), consumido server-side y cacheado, renderizado como símbolos de aeronaves en MapLibre con categoría de emisor (helicóptero rescate, dron, avión pesado).

### Contrato de Entrada
- Fase 0 completa (patrón de route handler + cache + capa toggleable establecido).
- `lib/usgs.ts` y `lib/gdelt.ts` como referencia de patrón de cliente API.

### Contrato de Salida
- `lib/opensky.ts` cliente con `fetchVenezuelaTraffic()`.
- `GET /api/air-traffic` devuelve ≥1 aeronave cacheada con TTL 30s.
- Capa `AirTrafficLayer` con símbolos por categoría y heading rotado.
- Interpolación client-side (dead reckoning) para movimiento suave sin más requests.

### Resultado Esperado
El usuario activa "Tráfico Aéreo". Aparecen iconos de aeronaves sobre el bbox Venezuela, orientados según rumbo, coloreados por categoría (cian civil, ámbar rescate/rotor, rojo militar). Los iconos se mueven suavemente entre actualizaciones. Click en una aeronave muestra callsign, altitud, velocidad. Contador HUD "N Flights Tracked".

### Tareas
- [ ] `lib/opensky.ts` — cliente: `fetchVenezuelaTraffic()`, `mapStateVector()`, `EMITTER_MAP`, header `Accept-Encoding: gzip`, bbox Venezuela.
- [ ] `app/api/air-traffic/route.ts` — route handler server-side: 1 fetch compartido, `next: { revalidate: 30 }`; degrada a último snapshot si OpenSky falla (nunca 500 al cliente).
- [ ] `lib/airtraffic/provider.ts` — interfaz `AirTrafficProvider` con adaptador OpenSky; gancho para ADS-B futuro (Fase posterior, key opcional).
- [ ] `components/map/layers/AirTrafficLayer.tsx` — capa MapLibre `symbol`: icono por categoría, `icon-rotate` por heading, interpolación de posición client-side por `velocity`+`heading`.
- [ ] `components/map/layers/aircraftIcons.ts` — generación/registro de iconos SVG (avión, helicóptero, dron) en el sprite del mapa.
- [ ] `components/map/overlays/HUDCorners.tsx` — añadir contador "FLIGHTS TRACKED: N".
- [ ] `components/map/controls/LayerToggle.tsx` — entrada "Tráfico Aéreo".
- [ ] `messages/es.json` + `messages/en.json` — strings de capa, categorías, tooltip.

### APIs / Dependencias Nuevas
| Recurso | URL/Package | Key requerida | Free tier |
|---|---|---|---|
| OpenSky Network | https://opensky-network.org/api/states/all | No (anónimo) | 400 cred/día anónimo; 4000 registrado |
| OpenSky registrado (opc.) | OAuth2 client credentials | Opcional `OPENSKY_CLIENT_ID/SECRET` | Sube cuota a 4000/día |

### Interfaces TypeScript (contratos de datos)
```typescript
// lib/opensky.ts
export interface AircraftState {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null;    // metros
  velocity: number | null;        // m/s
  verticalRate: number | null;    // m/s (+ asciende)
  heading: number | null;         // grados
  onGround: boolean;
  category: EmitterCategory;
  lastContact: number;            // epoch s
}

export type EmitterCategory =
  | "NO_INFO" | "LIGHT" | "SMALL" | "LARGE" | "HIGH_VORTEX"
  | "HEAVY" | "HIGH_PERF" | "ROTORCRAFT"
  | "GLIDER" | "LIGHTER_AIR" | "PARACHUTE"
  | "ULTRALIGHT" | "UAV"
  | "SPACE" | "EMERGENCY_VEHICLE" | "SERVICE_VEHICLE";

// lib/airtraffic/provider.ts
export interface AirTrafficProvider {
  id: "opensky" | "adsbx";
  fetchTraffic(): Promise<AircraftState[]>;
  available(): boolean;
}
```

### Criterios de Aceptación
- [ ] `GET /api/air-traffic` responde 200 con ≥1 `AircraftState` dentro del bbox (o snapshot cacheado si OpenSky vacío).
- [ ] El cliente NUNCA llama a OpenSky directamente (verificable: solo el route handler hace el fetch externo).
- [ ] Iconos rotan según `heading` y se interpolan entre updates (movimiento visible sin nuevos requests durante 30s).
- [ ] Categorías ROTORCRAFT/UAV/HEAVY renderizan iconos distintos.
- [ ] HUD muestra contador de vuelos actualizado.
- [ ] `npm run typecheck` y `npm run lint` limpios.

---

## FASE 2 — Tracking Satelital NORAD (Sentinel-1)

### Objetivo
Propagación orbital client-side de Sentinel-1 con `satellite.js`, mostrando traza terrestre y predicción de la próxima ventana de captura SAR sobre el área del evento.

### Contrato de Entrada
- Fase 1 completa (patrón de capa MapLibre + route handler).
- Constante `VEN_2026_EVENT.epicenter` disponible.

### Contrato de Salida
- `lib/n2yo.ts` / `lib/celestrak.ts` — obtención de TLE (key opcional N2YO, fallback Celestrak sin key).
- `lib/orbits.ts` — propagación SGP4, `groundTrack()`, `nextCaptureWindow()`.
- Capa `SatelliteTrackLayer` con polilínea de traza orbital.
- Predicción de pase Sentinel-1 con error < 60s.

### Resultado Esperado
El usuario activa "Satélites". Una polilínea cian muestra la traza terrestre de Sentinel-1A. Un badge HUD anuncia "Sentinel-1 next capture: 47 min" cuando el satélite pasará sobre el área del evento. La traza se actualiza al avanzar el reloj.

### Tareas
- [ ] `lib/celestrak.ts` — fetch TLE bruto de Celestrak (sin key), parse de `tleLine1`/`tleLine2` por NORAD id. Sentinel-1A = 39634.
- [ ] `lib/n2yo.ts` — cliente N2YO opcional (key) para pases predichos; usado solo si `N2YO_API_KEY` existe.
- [ ] `lib/orbits.ts` — `satellite.js` SGP4: `propagate()`, `groundTrack(tle, fromMs, toMs, stepS)`, `nextCaptureWindow(tle, target, maxLookaheadH)`.
- [ ] `app/api/satellites/route.ts` — route handler: TLE cacheado 12h (`revalidate: 43200`), devuelve `SatellitePass[]`.
- [ ] `components/map/layers/SatelliteTrackLayer.tsx` — capa MapLibre `line` para `groundTrack`; marcador de posición actual; badge de ventana de captura.
- [ ] `components/map/controls/LayerToggle.tsx` — entrada "Satélites".
- [ ] `messages/es.json` + `messages/en.json` — strings (no traducir "Sentinel-1", "SAR", "NORAD").

### APIs / Dependencias Nuevas
| Recurso | URL/Package | Key requerida | Free tier |
|---|---|---|---|
| satellite.js | npm `satellite.js` | No | Sí (MIT, SGP4 en cliente) |
| Celestrak | https://celestrak.org/NORAD/elements/ | No | Sin límite duro |
| N2YO (opcional) | https://www.n2yo.com/api/ | Opcional `N2YO_API_KEY` | 1000 tx/h |

### Interfaces TypeScript (contratos de datos)
```typescript
// lib/orbits.ts
export interface SatellitePass {
  noradId: number;                // Sentinel-1A = 39634
  name: string;
  tleLine1: string;
  tleLine2: string;
  orbitClass: "LEO" | "MEO" | "GEO" | "GEOSYNC" | "HEO";
  isGeostationary: boolean;
  nextCaptureWindow: { startMs: number; endMs: number; maxElevationDeg: number } | null;
  groundTrack: Array<{ lat: number; lng: number; t: number }>;
}
```

### Criterios de Aceptación
- [ ] `GET /api/satellites` devuelve `SatellitePass` de Sentinel-1A con `groundTrack` de ≥20 puntos.
- [ ] La traza orbital se dibuja como polilínea sobre el mapa.
- [ ] `nextCaptureWindow` predice el próximo pase sobre el epicentro con error de tiempo < 60s vs. heavens-above (verificación manual del usuario).
- [ ] Sin `N2YO_API_KEY`, el cálculo funciona 100% con Celestrak + satellite.js (degradación documentada).
- [ ] `npm run typecheck` y `npm run lint` limpios.

---

## FASE 3 — Timeline Interactivo + Estado Hospitalario IA

### Objetivo
Panel timeline multi-fuente con brush interactivo (réplicas acumuladas vs. eventos ReliefWeb vs. conteo GDELT) y clasificación IA del estado de hospitales (verde/ámbar/rojo) que retroalimenta el Índice de Vulnerabilidad de Fase 0.

### Contrato de Entrada
- Fase 0 (vulnerabilidad + dataset hospitales) y Fase 1 (patrón route handler).
- `lib/ai.ts` (OpenRouter) y `lib/gdelt.ts`, `lib/reliefweb.ts`, `lib/usgs.ts` disponibles.

### Contrato de Salida
- `components/panels/TimelinePanel.tsx` con 3 series temporales y brush.
- `lib/hospitalsClassifier.ts` — clasificador IA sobre GDELT/ReliefWeb.
- `GET /api/hospitals` devuelve hospitales con `status` clasificado + confianza.
- El status hospitalario alimenta `medicalAccess` del índice de Fase 0.

### Resultado Esperado
Panel inferior/lateral con gráfico de líneas: réplicas acumuladas (verde), eventos humanitarios ReliefWeb (cian), volumen noticias GDELT (ámbar). El usuario arrastra un brush temporal y el mapa filtra a esa ventana. Marcadores de hospitales coloreados por estado IA con badge de confianza ("RED · 0.72 conf · fuente: GDELT").

### Tareas
- [ ] `lib/timeline.ts` — agregador: serie de réplicas acumuladas (USGS), eventos ReliefWeb por día, conteo GDELT por bucket horario.
- [ ] `app/api/timeline/route.ts` — route handler que compone las 3 series, `revalidate: 900`.
- [ ] `components/panels/TimelinePanel.tsx` — gráfico SVG/canvas de 3 series + brush interactivo; emite ventana `[fromMs, toMs]` a estado global.
- [ ] `lib/hospitalsClassifier.ts` — `classifyHospitalStatus(hospital, gdeltArticles, reliefwebReports)` → `{ status, confidence, source }` vía OpenRouter (Llama 3.3 70B). Prompt: detecta menciones de hospital colapsado/operativo/parcial.
- [ ] `app/api/hospitals/route.ts` — route handler: carga dataset Fase 0, clasifica con IA, cachea 1h; degrada a último snapshot.
- [ ] `components/map/layers/HospitalsLayer.tsx` — marcadores coloreados por status + badge confianza + disclaimer.
- [ ] Conectar `medicalAccess` de Fase 0 al `status` clasificado (hospital RED → `hospitalOperational: false`).
- [ ] `messages/es.json` + `messages/en.json` — strings timeline, estados hospital, disclaimer de confianza.

### APIs / Dependencias Nuevas
| Recurso | URL/Package | Key requerida | Free tier |
|---|---|---|---|
| OpenRouter (ya en stack) | https://openrouter.ai/ | Ya configurada | Llama 3.3 70B free, rate-limited |
| GDELT / ReliefWeb (ya en stack) | clientes existentes | No | Públicas |

### Interfaces TypeScript (contratos de datos)
```typescript
// lib/timeline.ts
export interface TimelineSeries {
  aftershocksCumulative: Array<{ t: number; value: number }>;
  reliefwebEvents: Array<{ t: number; value: number }>;
  gdeltCounts: Array<{ t: number; value: number }>;
  windowMs: { fromMs: number; toMs: number };
}

// lib/hospitalsClassifier.ts
export interface HospitalClassification {
  osmId: string;
  status: "GREEN" | "AMBER" | "RED";
  confidence: number;             // 0..1
  source: "gdelt" | "ocha" | "reliefweb" | "manual";
  reasoning: string;              // breve, para tooltip
}
```

### Criterios de Aceptación
- [ ] `TimelinePanel` renderiza 3 series superpuestas con ejes y leyenda.
- [ ] Arrastrar el brush emite una ventana temporal que filtra al menos la capa de sismos.
- [ ] `GET /api/hospitals` devuelve ≥10 hospitales con `status` y `confidence ∈ [0,1]`.
- [ ] Un hospital clasificado RED hace que su celda H3 suba de rank en el índice de vulnerabilidad (integración Fase 0 verificable).
- [ ] Cada status hospital muestra disclaimer de confianza/fuente (R7).
- [ ] `npm run typecheck` y `npm run lint` limpios.

---

## FASE 4 — Motor 3D CesiumJS (coexistencia con MapLibre)

### Objetivo
Introducir el globo Cesium como motor de render alterno seleccionable por toggle, replicando las capas P0 (sismos, tráfico aéreo, vulnerabilidad). MapLibre permanece como fallback ligero. Al cierre, Cesium pasa a default.

### Contrato de Entrada
- Fases 0-1 completas (capas a portar existen: sismos, vulnerabilidad, tráfico aéreo).
- Build Next.js 14 funcional.

### Contrato de Salida
- `cesium` instalado; assets estáticos vendoreados en `public/cesium`; `CESIUM_BASE_URL` definido.
- `components/map/CesiumGlobe.tsx` cargado vía `next/dynamic` `ssr:false`.
- `components/map/MapEngineProvider.tsx` decide MapLibre vs. Cesium con `flyTo` común.
- Sismos, aeronaves y vulnerabilidad renderizados como entities Cesium 3D.
- `HudCorners3D` con altitud de cámara + UTC en vivo.

### Resultado Esperado
El usuario ve un toggle "2D / 3D". Al pulsar 3D, sin recargar, aparece un globo terráqueo oscuro (fondo `#000A0F`, globo `#001A24`) girado hacia Venezuela a ~250km de altitud. Los sismos son volúmenes/billboards 3D con pulse rings; las aeronaves vuelan a su altitud real. El HUD muestra altitud de cámara y UTC a 1Hz. Volver a 2D preserva las capas activas.

### Tareas
- [ ] `next.config.js` — `copy-webpack-plugin` (o copia manual) de `Workers`/`Assets`/`Widgets` de cesium a `public/cesium`; definir `window.CESIUM_BASE_URL = "/cesium"`.
- [ ] `lib/cesium/viewer.ts` — `createViewer(container)`: `EllipsoidTerrainProvider`, `requestRenderMode: true`, `RequestScheduler` limitado a 18/servidor, tema HUD (colores), UI chrome off.
- [ ] `lib/cesium/imagery.ts` — `UrlTemplateImageryProvider` OSM raster (sin key); gancho para Esri World Imagery.
- [ ] `components/map/CesiumGlobe.tsx` — root viewer, `next/dynamic` `ssr:false`, flyTo inicial al epicentro VEN-2406.
- [ ] `components/map/MapEngineProvider.tsx` — context `{ engine, setEngine, flyTo }`; preserva estado de capas al conmutar.
- [ ] `components/map/controls/EngineToggle.tsx` — toggle 2D/3D con glitch transition (CSS, ya existe `GlitchTransition.tsx`).
- [ ] `components/map/layers/cesium/EarthquakeEntities.tsx` — sismos como `Entity` (billboard + pulse ring escalado por magnitud).
- [ ] `components/map/layers/cesium/AirTrafficEntities.tsx` — aeronaves como `Entity`, modelo glTF por categoría, `path` si `velocity>0`, `scaleByDistance`.
- [ ] `components/map/layers/cesium/VulnerabilityEntities.tsx` — celdas H3 como `polygon` con material interpolado del gradiente.
- [ ] `components/map/HudCorners3D.tsx` — Lat/Lon 4 dec, altitud de cámara, UTC 1Hz, detecciones activas.
- [ ] `messages/es.json` + `messages/en.json` — strings toggle 2D/3D, HUD 3D.

### APIs / Dependencias Nuevas
| Recurso | URL/Package | Key requerida | Free tier |
|---|---|---|---|
| CesiumJS | npm `cesium` | No | Apache 2.0, render gratis (~3MB gz) |
| copy-webpack-plugin | npm (dev) | No | Sí |
| Imagery OSM raster | tile.openstreetmap.org | No | Gratis (atribución obligatoria) |
| Cesium Ion (opcional) | https://cesium.com/ion/ | Opcional `CESIUM_ION_TOKEN` | 5GB / 50K tiles/mes |

### Interfaces TypeScript (contratos de datos)
```typescript
// components/map/MapEngineProvider.tsx
export type MapEngine = "maplibre" | "cesium";

export interface MapEngineContextValue {
  engine: MapEngine;
  setEngine: (e: MapEngine) => void;
  flyTo: (target: { lat: number; lng: number; altitude?: number; durationS?: number }) => void;
  isReady: boolean;
}
```

### Criterios de Aceptación
- [ ] Toggle MapLibre⇄Cesium sin recarga; capas activas preservadas.
- [ ] Sismos VEN-2406 renderizados como entities 3D georreferenciados (error < 50m verificable contra USGS lat/lng).
- [ ] HUD 3D muestra altitud de cámara en vivo y UTC a 1Hz.
- [ ] Bundle Cesium cargado por dynamic import: el first load de la ruta sin 3D NO descarga los ~3MB (verificable en Network tab).
- [ ] ≥60 fps en desktop GPU media con < 200 entities (`requestRenderMode` activo).
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` limpios.

---

## FASE 5 — Geometría Urbana 3D + Lock-on + Shaders

### Objetivo
Geometría urbana real (Google Photorealistic 3D Tiles con fallback OSM Buildings), cámara lock-on que sigue objetivos en movimiento con cuadro de seguimiento, y post-procesado GLSL (FLIR/NVG/CRT/Bloom) sobre el canvas Cesium. Cierra la estética "Spy Thriller".

### Contrato de Entrada
- Fase 4 completa (viewer Cesium + entities funcionando).
- `MapEngineProvider` con `flyTo`.

### Contrato de Salida
- `lib/cesium/tilesets.ts` carga Google 3D Tiles si hay key, OSM Buildings extruidos si no.
- `lib/cesium/georeference.ts` encuadra un volumen OSM a ~60% del viewport.
- `components/map/LockOnController.tsx` con `trackedEntity` + cuadro de seguimiento HTML.
- `lib/cesium/sparseSet.ts` LOD adaptativo por framerate.
- 4 modos de visión (NORMAL/FLIR/NVG/CRT) conmutables + Bloom.

### Resultado Esperado
El usuario busca "Aeropuerto Maiquetía": la cámara vuela y encuadra el aeropuerto fotorrealista (o cajas OSM extruidas si no hay key) ocupando ~60% de pantalla. Click en una aeronave: la cámara se engancha y la sigue, con 4 corner brackets HUD persiguiendo el objetivo y un ID `NODE-VEN-2406-XXXX`. Un selector de modo de visión transforma toda la escena a térmico FLIR, verde NVG o CRT con distorsión de barril, en < 200ms con glitch.

### Tareas
- [ ] `lib/osm/overpass.ts` — cliente Overpass: `fetchOverpassBbox(query)` → bbox de objeto OSM; cache agresivo (24h).
- [ ] `lib/cesium/tilesets.ts` — `loadGooglePhotorealistic(viewer)` con key; `loadOsmBuildingsFallback(viewer)` sin key (extrusión desde Overpass o Cesium OSM Buildings).
- [ ] `lib/cesium/georeference.ts` — `frameOsmVolume(viewer, query)`: bbox → rectangle escalado 1/0.6 → flyTo.
- [ ] `components/map/SearchZone.tsx` — buscador: Nominatim geocode → Overpass bbox → flyTo + encuadre de volumen.
- [ ] `components/map/LockOnController.tsx` — `lockOn(viewer, entity)`: `trackedEntity` + `postRender` → `SceneTransforms.worldToWindowCoordinates` → mueve corner brackets HUD.
- [ ] `lib/cesium/sparseSet.ts` — `applySparseSet(entities, fps)`: decima visibilidad bajo 50/30 fps.
- [ ] `lib/cesium/postprocess/index.ts` — registro de stages: `addNvgStage`, `addFlirStage`, `addCrtStage`, `addBloomStage`.
- [ ] `lib/cesium/postprocess/nvg.glsl.ts` — fragment shader night vision (tinte verde + grano + scanlines).
- [ ] `lib/cesium/postprocess/flir.glsl.ts` — térmico: invertir luminancia + heatmap + Sobel edge detection.
- [ ] `lib/cesium/postprocess/crt.glsl.ts` — distorsión de barril + máscara subpíxel RGB.
- [ ] `components/panels/VisionModePanel.tsx` — selector NORMAL/FLIR/NVG/CRT + Bloom; glitch transition al conmutar; detección GPU móvil → baja `resolutionScale` / desactiva CRT.
- [ ] `messages/es.json` + `messages/en.json` — strings de modos de visión, buscador.

### APIs / Dependencias Nuevas
| Recurso | URL/Package | Key requerida | Free tier |
|---|---|---|---|
| Google Photorealistic 3D Tiles | tile.googleapis.com/v1/3dtiles | Opcional `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | $200 crédito/mes (no free puro) → fallback OSM |
| OSM Buildings (fallback) | Overpass extrusión / Cesium OSM Buildings | No | 100% gratis |
| Overpass API | https://overpass-api.de/api/interpreter | No | Gratis, rate-limited (cache 24h) |
| Nominatim | https://nominatim.openstreetmap.org/search | No | 1 req/s, User-Agent obligatorio |

### Interfaces TypeScript (contratos de datos)
```typescript
// lib/osm/overpass.ts
export interface OsmVolume {
  query: string;
  bbox: { s: number; w: number; n: number; e: number };
  centroid: { lat: number; lng: number };
  osmType: "node" | "way" | "relation";
  tags: Record<string, string>;
}

// components/panels/VisionModePanel.tsx
export type VisionMode = "NORMAL" | "FLIR" | "NVG" | "CRT";
```

### Criterios de Aceptación
- [ ] Buscar "Aeropuerto Maiquetía" encuadra el volumen ocupando 55-65% del viewport.
- [ ] Sin `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, carga OSM Buildings extruidos sin error (degradación elegante, R2).
- [ ] Lock-on sobre aeronave en movimiento mantiene el cuadro de seguimiento sobre el objetivo con desfase < 1 frame.
- [ ] Con > 500 entities, Sparse Set mantiene ≥30 fps decimando visibilidad.
- [ ] 4 modos de visión conmutables en < 200ms con glitch; cada modo ≥30 fps en desktop.
- [ ] **[TRABAJO MANUAL DEL USUARIO]** obtener `NEXT_PUBLIC_GOOGLE_MAPS_KEY` en Google Maps Platform si se quiere fotorrealismo; opcional, la app corre sin ella.
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` limpios.

---

## FASE 6 — Zona Específica + Situation Report PDF

### Objetivo
Modo "Zona Específica": el usuario selecciona una zona, la cámara la encuadra y un resumen IA de las últimas 24h aparece; export de un "Situation Report" PDF de 1 página formato OCHA con snapshot del mapa, capas activas y stats.

### Contrato de Entrada
- Fase 1 (datos de fusión) mínimo. Fases 3 (timeline/hospitales) y 5 (volúmenes OSM + flyTo) enriquecen pero no bloquean.
- `lib/ai.ts` (OpenRouter) disponible.

### Contrato de Salida
- `lib/report/zoneSummary.ts` — `summarizeZone()` vía OpenRouter, cacheado por bbox+ventana.
- `components/panels/ZoneReportPanel.tsx` — resumen IA 24h de zona seleccionada.
- `lib/report/situationReport.ts` + `app/api/report/route.ts` — generación PDF server-side.

### Resultado Esperado
El usuario escribe una dirección o selecciona una zona. En < 5s aparece un panel con 4 bullets operativos generados por IA (sismos + noticias + humanitario de las últimas 24h del bbox), en ES o EN según locale, sin traducir términos técnicos (InSAR, ADS-B, SAR). Un botón "Export Situation Report" descarga un PDF de 1 página con header OCHA, snapshot del mapa, lista de capas activas y stats clave.

### Tareas
- [ ] `lib/report/zoneContext.ts` — `buildZoneContext(bbox, windowMs)`: agrega sismos USGS + noticias GDELT + reportes ReliefWeb del bbox/ventana.
- [ ] `lib/report/zoneSummary.ts` — `summarizeZone(zone)`: prompt analista de inteligencia de desastres, 4 bullets, ES/EN por locale; cache por `bbox+ventana 1h`.
- [ ] `app/api/zone-summary/route.ts` — route handler que envuelve `summarizeZone`, backoff si OpenRouter satura, reusa último resumen.
- [ ] `components/panels/ZoneReportPanel.tsx` — input de zona/dirección → `flyTo` (vía `MapEngineProvider`) + render del resumen IA.
- [ ] `lib/report/situationReport.ts` — generador PDF con `@react-pdf/renderer`: header OCHA, snapshot mapa (dataURL del canvas), capas activas, stats.
- [ ] `app/api/report/route.ts` — endpoint server-side que devuelve el PDF (`Content-Type: application/pdf`).
- [ ] `components/ui/ExportMenu.tsx` — añadir opción "Situation Report (PDF)".
- [ ] `messages/es.json` + `messages/en.json` — strings panel zona, botón export, labels PDF.

### APIs / Dependencias Nuevas
| Recurso | URL/Package | Key requerida | Free tier |
|---|---|---|---|
| OpenRouter (ya en stack) | https://openrouter.ai/ | Ya configurada | Llama 3.3 70B free, rate-limited |
| @react-pdf/renderer | npm | No | Sí (MIT); preferido sobre Puppeteer en serverless |

### Interfaces TypeScript (contratos de datos)
```typescript
// lib/report/zoneContext.ts
export interface ZoneContext {
  bbox: { s: number; w: number; n: number; e: number };
  windowMs: { fromMs: number; toMs: number };
  earthquakes: Array<{ mag: number; depthKm: number; t: number; lat: number; lng: number }>;
  news: Array<{ title: string; t: number; tone: number }>;
  humanitarian: Array<{ title: string; org: string; t: number }>;
}

// lib/report/situationReport.ts
export interface SituationReportInput {
  zone: { name: string; bbox: ZoneContext["bbox"] };
  mapSnapshotDataUrl: string;
  activeLayers: string[];
  stats: Record<string, string | number>;
  locale: "es" | "en";
  generatedAtMs: number;
}
```

### Criterios de Aceptación
- [ ] Modo Zona Específica: dirección → flyTo + resumen IA en < 5s (con cache cálido < 1s).
- [ ] El resumen respeta el locale (ES/EN) y NO traduce InSAR/ADS-B/SAR/NORAD.
- [ ] Export PDF: 1 página con snapshot del mapa, capas activas, stats y header OCHA, descargable.
- [ ] Resumen cacheado por bbox+ventana: una segunda petición idéntica no llama de nuevo a OpenRouter.
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` limpios.

---

## Reglas para el Agente Ejecutor (Sonnet)

1. **Una fase a la vez.** No empezar la siguiente hasta que TODOS los criterios de aceptación de la actual pasen. Cada fase deja `main` desplegable.
2. **No romper MapLibre.** Hasta el final de Fase 4, MapLibre es el render por defecto. Cesium se añade en paralelo, nunca reemplaza destructivamente.
3. **Toda API externa es server-side.** Ningún componente cliente llama a OpenSky/Overpass/Nominatim/Celestrak/OpenRouter directamente. Siempre vía route handler en `app/api/*` (o Convex action si se decide crear `convex/`). El cliente lee del endpoint propio. Esto protege las cuotas free tier (N usuarios = 1 fetch).
4. **Convex es opcional.** El repo NO tiene carpeta `convex/` aún. Camino por defecto: route handlers con `next: { revalidate: N }` como cache. Si el usuario pide Convex, crear `convex/schema.ts` primero y migrar el cache allí (TTLs del documento: OpenSky 30s, Overpass 24h, TLE 12h, resúmenes IA 1h).
5. **TypeScript strict.** Sin `any`, sin `// @ts-ignore`. Tipar mapeos de arrays crudos (OpenSky devuelve `unknown[][]`).
6. **Color tokens siempre.** Usar las CSS custom properties (`--color-green`, `--color-cyan`, `--color-red`, etc.). Nunca hex hardcodeado en componentes. En shaders GLSL, derivar los tintes de esos valores (documentar el hex origen en comentario).
7. **i18n obligatorio.** Toda cadena visible en `messages/es.json` y `messages/en.json`. NUNCA traducir términos técnicos: InSAR, ADS-B, SAR, NORAD, TLE, Sentinel-1, FLIR, NVG, CRT.
8. **CSS para HUD 2D, GLSL para escena 3D.** Scanlines/glitch/pulse rings/targeting siguen siendo CSS (regla CLAUDE.md). FLIR/NVG/CRT/Bloom son `PostProcessStage` GLSL sobre el framebuffer Cesium.
9. **Degradación elegante, nunca error.** Si falta una key opcional (Google, N2YO, ADS-B) o una API externa falla, degradar al fallback documentado y servir el último snapshot cacheado. Nunca devolver 500 al cliente por una fuente externa caída.
10. **Cesium siempre `next/dynamic` `ssr:false`.** No debe inflar el first load de quien no usa 3D ni romper SSR (R1).
11. **Marcar trabajo manual del usuario.** Las tareas etiquetadas `[TRABAJO MANUAL]` (obtener keys, pre-procesar WorldPop/InSAR offline, exportar hospitales de Overpass) requieren acción del usuario; el agente debe pausar y pedirla, o proveer un fixture funcional como puente.
12. **No commit ni push** salvo que el usuario lo pida explícitamente (regla de memoria del proyecto).
13. **Verificar con `npm run typecheck` y `npm run lint`** al cierre de cada fase. Fases 4-6 además con `npm run build` (assets Cesium / dynamic import / PDF serverside).

---

## Estrategia Free Tier por Fase

| Fase | Servicios externos | Límite gratuito | Estrategia / Fallback |
|---|---|---|---|
| 0 | WorldPop, Overpass (offline, una vez) | Datos abiertos | Pre-procesado offline a JSON estático en `data/`. Sin runtime. Fixture si el usuario no procesa. |
| 1 | OpenSky Network | 400 cred/día anónimo, 4000 registrado | 1 fetch server-side compartido, cache 30s, dead-reckoning client-side. Degradar a snapshot si se agota. |
| 2 | Celestrak (sin key), N2YO opcional | Celestrak sin límite duro; N2YO 1000 tx/h | TLE cacheado 12h + SGP4 en cliente (`satellite.js`). 100% gratis sin N2YO. |
| 3 | OpenRouter (Llama 3.3 70B), GDELT, ReliefWeb | OpenRouter rate-limited; GDELT/ReliefWeb públicas | Cachear clasificación hospitalaria 1h; backoff/cola; reusar último snapshot. |
| 4 | CesiumJS, imagery OSM, Ion opcional | Cesium render ilimitado; Ion 5GB/50K tiles/mes | `EllipsoidTerrainProvider` (cero terrain requests); `RequestScheduler` 18/servidor; sin Ion por defecto. |
| 5 | Google 3D Tiles opcional, Overpass, Nominatim | Google $200 crédito/mes; Overpass/Nominatim rate-limited | Default OSM Buildings (gratis total); Google detrás de key opcional con alarma 80% crédito (R2); cache Overpass 24h, Nominatim por query. |
| 6 | OpenRouter, @react-pdf/renderer | OpenRouter rate-limited; react-pdf local | Cache de resumen por bbox+ventana 1h; PDF generado server-side sin servicio externo. |

**Principio rector (del documento fuente):** *toda* API externa se consume server-side; el cliente siempre lee del endpoint propio. Default sostenible = 0 keys de pago. Keys opcionales (Google, ADS-B, N2YO, Cesium Ion) solo añaden fidelidad, nunca bloquean funcionalidad.

---

*WORKPLAN_PANOPTICO v1.0 — Junio 2026*
