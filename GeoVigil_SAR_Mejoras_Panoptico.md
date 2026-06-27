# GeoVigil SAR — Mejoras "Panóptico"
### Documento de Arquitectura y Hoja de Ruta Técnica

> **Versión:** 1.0
> **Fecha:** 2026-06-26
> **Autor:** Arquitectura GeoVigil SAR
> **Evento de referencia:** Venezuela Mw 7.2 + 7.5 — 24 junio 2026 (Falla Boconó-Morón-El Pilar)
> **Restricción transversal:** 100% free tier. Cero costo de infraestructura.

---

## 1. Resumen Ejecutivo

GeoVigil SAR nace como un **visor de daños** sísmicos: un mapa 2D plano (MapLibre) con marcadores de sismos USGS, noticias GDELT y reportes humanitarios ReliefWeb, todo cacheado en Convex y narrado por un asistente IA. Es competente, pero vive en la misma liga visual y funcional que decenas de portales gratuitos de monitoreo (USGS Latest Earthquakes, ReliefWeb, GDELT GEO). El conjunto de mejoras "Panóptico" descrito en este documento transforma esa herramienta en una **plataforma de inteligencia operacional geoespacial**: un entorno 3D donde el operador no solo *ve* dónde tembló, sino que *entiende* qué se mueve, quién responde, qué infraestructura está comprometida y dónde la población queda aislada del acceso médico — en tiempo real, sobre geometría urbana fotorrealista.

El salto cualitativo es de **estado a situación**. Un portal gratuito muestra un punto rojo de magnitud 7.2 en Yaracuy. GeoVigil "Panóptico" muestra ese mismo epicentro como un volumen 3D de Caracas con edificios reales, un interferograma InSAR revelando 14 cm de subsidencia post-sísmica, las trazas de vuelos militares C-130 entrando a Maiquetía detectados por ADS-B, el paso orbital de Sentinel-1 que capturará nueva imagen SAR en 47 minutos, y un índice de vulnerabilidad compuesto que marca en rojo tres parroquias donde el daño es moderado pero el hospital más cercano quedó inoperativo. Eso ya no es un visor: es una sala de mando.

La analogía operativa es deliberada — **"Spy Thriller"**. El producto debe transmitir la sensación de una consola de centro de operaciones de una agencia de inteligencia: globo terráqueo girando, lock-on de cámara sobre objetivos en movimiento, post-procesado FLIR/NVG/CRT vía shaders GLSL, HUD con altitud de cámara y "6.7K Flights Tracked", fusión de fuentes heterogéneas (sísmica + aérea + satelital + vial + CCTV) en un único panel coherente. Esta estética no es decoración: es **densidad de información legible**. El lenguaje visual de la inteligencia militar existe porque resuelve el problema de mostrar muchas capas correlacionadas sin saturar al operador. GeoVigil lo adopta como ventaja de producto.

El diferenciador estratégico frente a los portales gratuitos es la **fusión de datos (data fusion)** sobre un **gemelo digital 3D**, operada enteramente sobre free tiers. Ningún portal gratuito combina sismología + tráfico aéreo militar + tracking NORAD + índice de vulnerabilidad médica sobre Google Photorealistic 3D Tiles. La barrera no es técnica sino de integración: nadie ha tejido estas fuentes juntas con una capa narrativa IA. Este documento es el plano para hacerlo de forma incremental, sin romper lo que ya funciona, y sin gastar un dólar.

---

## 2. Evaluación de Impacto

Escala: Impacto/Complejidad = Bajo / Medio / Alto / Muy Alto. Prioridad = P0 (fundacional) … P3 (nice-to-have).

| Mejora | Impacto Visual | Impacto Analítico | Complejidad | Prioridad | Free Tier viable |
|---|---|---|---|---|---|
| **A1** Migración a CesiumJS (globo 3D) | Muy Alto | Medio | Alta | **P0** | Sí |
| **A2** Google Photorealistic 3D Tiles | Muy Alto | Medio | Media | P1 | ⚠️ Condicional (key + cuota) |
| **A3** Centrado por volúmenes OSM | Alto | Alto | Media | P1 | Sí |
| **A4** Lock-on mode (cámara seguidora) | Muy Alto | Medio | Media | P2 | Sí |
| **A5** Sparse Set (LOD dinámico de activos) | Bajo | Bajo | Media | P2 | Sí |
| **B1** Shaders FLIR / NVG / CRT | Muy Alto | Bajo | Alta | P2 | Sí |
| **B2** Bloom + Sharpening (post-proc) | Alto | Bajo | Baja | P2 | Sí |
| **B3** HUD Corners 3D (altitud, detecciones) | Medio | Bajo | Baja | P1 | Sí |
| **C1** ADS-B Exchange (activos militares) | Alto | Muy Alto | Media | P1 | ⚠️ Condicional (key RapidAPI) |
| **C2** OpenSky Network (tráfico civil/rescate) | Alto | Alto | Media | **P0** (de Bloque C) | Sí (con rate limit) |
| **C3** Tracking satelital NORAD (Sentinel-1) | Alto | Muy Alto | Media | P1 | Sí |
| **C4** Partículas de tráfico urbano OSM | Muy Alto | Medio | Alta | P3 | Sí |
| **C5** CCTV proyectado sobre 3D | Alto | Medio | Muy Alta | P3 | ⚠️ Condicional (fuentes escasas) |
| **D1** Índice de Vulnerabilidad Compuesto | Medio | Muy Alto | Alta | **P0** (analítico) | Sí |
| **D2** InSAR (deformación mm) | Alto | Muy Alto | Muy Alta | P2 | ⚠️ Procesado offline |
| **D3** Semáforo vial (Sentinel-2 textura) | Alto | Alto | Alta | P2 | Sí |
| **D4** Timeline de Evolución multi-fuente | Medio | Muy Alto | Media | P1 | Sí |
| **D5** Estado de hospitales (IA sobre GDELT/OCHA) | Medio | Muy Alto | Media | P1 | Sí |
| **E1** Modo "Zona Específica" + resumen IA | Alto | Alto | Media | P1 | Sí |
| **E2** Export PDF "Situation Report" (OCHA) | Bajo | Alto | Media | P1 | Sí |
| **E3** Bilingüe técnico ES/EN | Bajo | Bajo | Baja | P0 (ya existe) | Sí |

**Lectura rápida:** Los P0 reales son **A1 (Cesium)**, **C2 (OpenSky)**, **D1 (Vulnerabilidad)** y **D4/D5 (Timeline + Hospitales)** — entregan el 80% del salto "visor → inteligencia". Los shaders (B1) y partículas (C4) son los mayores multiplicadores de la estética "Spy Thriller" pero no bloquean valor analítico.

---

## 3. Hoja de Ruta por Fases

Seis fases incrementales. Cada una entrega valor de forma independiente y mantiene la app desplegable. **Regla de oro:** MapLibre y Cesium coexisten hasta el final de la Fase 1; nada se rompe en `main`.

---

### FASE 0 — Cimientos de Fusión sobre MapLibre actual
> **Objetivo:** Entregar el músculo analítico (data fusion + vulnerabilidad + timeline) *antes* de tocar el motor de render. Bajo riesgo, alto valor. Demuestra el diferenciador sin la complejidad 3D.

**Componentes:**
- `lib/opensky.ts` — cliente OpenSky Network (StateVectors, bbox Venezuela)
- `lib/n2yo.ts` — cliente N2YO / TLE para tracking satelital NORAD
- `lib/worldpop.ts` — cliente densidad poblacional (raster pre-procesado)
- `convex/airTraffic.ts` — schema + queries + mutations de vectores de estado aéreo
- `convex/satellites.ts` — schema TLE + pases predichos
- `convex/vulnerability.ts` — schema del índice compuesto por zona
- `components/panels/TimelinePanel.tsx` — gráfico réplicas vs. ayuda vs. víctimas
- `components/map/layers/AirTrafficLayer.tsx` — capa MapLibre de aeronaves (símbolos)
- `components/map/layers/VulnerabilityHeatmap.tsx` — heatmap MapLibre del índice
- `lib/vulnerability.ts` — motor de cálculo del score compuesto
- `lib/hospitals.ts` — clasificador IA de estado hospitalario (verde/amarillo/rojo)

**APIs / librerías:**
| Servicio | URL | Nota free tier |
|---|---|---|
| OpenSky Network | `https://opensky-network.org/api` | Anónimo: 400 req/día, 10s resolución. Registrado: 4000/día. Sin key obligatoria. |
| N2YO | `https://www.n2yo.com/api/` | Gratuito con key. 1000 transacciones/hora. TLE + pasos. |
| Celestrak (TLE) | `https://celestrak.org/NORAD/elements/` | Sin key. Descarga TLE bruto. Mejor para cálculo propio con `satellite.js`. |
| WorldPop | `https://www.worldpop.org/` | Datos abiertos. Raster descargable, NO API en vivo → pre-procesar offline a tiles/GeoJSON. |
| `satellite.js` | npm `satellite.js` | Propagación SGP4 en cliente. MIT. Cero costo. |

**Contratos de datos:**
```typescript
// lib/opensky.ts
export interface AircraftState {
  icao24: string;            // hex transponder id
  callsign: string | null;
  originCountry: string;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null;   // metros
  velocity: number | null;       // m/s
  verticalRate: number | null;   // m/s (+ asciende)
  heading: number | null;        // grados
  onGround: boolean;
  category: EmitterCategory;      // ver abajo
  lastContact: number;           // epoch s
}

export type EmitterCategory =
  | "NO_INFO" | "LIGHT" | "SMALL" | "LARGE" | "HIGH_VORTEX"
  | "HEAVY" | "HIGH_PERF" | "ROTORCRAFT"   // helicóptero rescate
  | "GLIDER" | "LIGHTER_AIR" | "PARACHUTE"
  | "ULTRALIGHT" | "UAV"                    // dron
  | "SPACE" | "EMERGENCY_VEHICLE" | "SERVICE_VEHICLE";

// convex/satellites.ts
export interface SatellitePass {
  noradId: number;            // Sentinel-1A = 39634; (11574 = legacy ref del PRD)
  name: string;
  tleLine1: string;
  tleLine2: string;
  orbitClass: "LEO" | "MEO" | "GEO" | "GEOSYNC" | "HEO";
  isGeostationary: boolean;
  nextCaptureWindow: { startMs: number; endMs: number; maxElevationDeg: number } | null;
  groundTrack: Array<{ lat: number; lng: number; t: number }>; // traza orbital
}

// lib/vulnerability.ts
export interface VulnerabilityScore {
  zoneId: string;             // admin3 / cell H3
  centroid: { lat: number; lng: number };
  sarChange: number;          // 0..1 backscatter delta Sentinel-1
  populationDensity: number;  // 0..1 normalizado WorldPop
  medicalAccess: number;      // 0..1 (1 = peor acceso; sin hospital operativo cerca)
  composite: number;          // 0..1 score final ponderado
  rank: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
}
```

**Criterios de aceptación:**
- `GET /api/air-traffic` devuelve ≥1 aeronave dentro del bbox Venezuela cacheada en Convex con TTL 30s.
- El `VulnerabilityHeatmap` pinta ≥10 zonas con score `composite` calculado de las 3 variables; verificable contra fixture.
- `TimelinePanel` renderiza 3 series temporales superpuestas (réplicas acumuladas, eventos ReliefWeb, conteo GDELT) con brush interactivo.
- Pase de Sentinel-1 predicho con error de tiempo < 60s vs. heavens-above para las próximas 6h.
- `npm run typecheck` y `npm run lint` limpios.

**Dependencias:** Ninguna. Construye sobre el stack actual.

---

### FASE 1 — Motor 3D: CesiumJS coexistiendo con MapLibre
> **Objetivo:** Introducir el globo terráqueo Cesium como motor de render alterno, seleccionable por toggle, replicando las capas existentes. MapLibre permanece como fallback. Al cierre de fase, Cesium es el default.

**Componentes:**
- `components/map/CesiumGlobe.tsx` — root del viewer Cesium (reemplaza progresivamente a `GeoVigilMap.tsx`)
- `components/map/MapEngineProvider.tsx` — context que decide MapLibre vs. Cesium
- `lib/cesium/viewer.ts` — factory de `Cesium.Viewer` con config HUD/free-tier
- `lib/cesium/imagery.ts` — proveedores de imagery gratuitos (sin Cesium Ion obligatorio)
- `components/map/layers/cesium/EarthquakeEntities.tsx` — sismos como `Entity` 3D (pulse rings billboard)
- `components/map/layers/cesium/AirTrafkEntities.tsx` — aeronaves como `Entity` con modelo glTF
- `components/map/HudCorners3D.tsx` — HUD: Lat/Lon 4 dec, altitud de cámara, UTC, detecciones activas

**APIs / librerías:**
| Servicio | URL | Nota free tier |
|---|---|---|
| CesiumJS | npm `cesium` (`resium` opcional) | Apache 2.0. Render gratis. Bundle ~3MB gz. |
| Cesium Ion (opcional) | `https://cesium.com/ion/` | Free: 5GB / 50K tile loads / mes. Terrain + asset hosting. Evitable. |
| Terrain gratuito | `https://github.com/CesiumGS/cesium` (Ellipsoid) o AWS Terrain Tiles | Ellipsoid = sin terreno (cero costo). Maptiler terrain free tier alternativo. |
| Imagery base | OpenStreetMap raster / Esri World Imagery (atribución) | `UrlTemplateImageryProvider`. Cero key para OSM. |

**Configuración crítica free-tier (del material de entrada):**
```typescript
// lib/cesium/viewer.ts
import * as Cesium from "cesium";

export function createViewer(container: HTMLElement): Cesium.Viewer {
  // Optimización free tier: limitar conexiones concurrentes por servidor
  Cesium.RequestScheduler.requestsByServer["tile.googleapis.com:443"] = 18;
  Cesium.RequestScheduler.maximumRequestsPerServer = 18;

  const viewer = new Cesium.Viewer(container, {
    baseLayerPicker: false,
    geocoder: false,            // usamos geocoder propio (Nominatim)
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    timeline: false,
    animation: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,  // lock-on propio
    terrainProvider: new Cesium.EllipsoidTerrainProvider(), // cero costo
    contextOptions: { webgl: { alpha: false, powerPreference: "high-performance" } },
  });

  // Tema HUD
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#000A0F");
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#001A24");
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.fog.enabled = true;
  return viewer;
}
```

**Contratos de datos:**
```typescript
// components/map/MapEngineProvider.tsx
export type MapEngine = "maplibre" | "cesium";
export interface MapEngineContext {
  engine: MapEngine;
  setEngine: (e: MapEngine) => void;
  flyTo: (target: { lat: number; lng: number; altitude?: number }) => void;
}
```

**Criterios de aceptación:**
- Toggle MapLibre⇄Cesium sin recarga; estado de capas preservado.
- Sismos del evento VEN-2406 renderizados como entities 3D georreferenciados (error < 50m).
- HUD muestra altitud de cámara en vivo y UTC actualizado a 1Hz.
- Bundle Cesium cargado por dynamic import — no infla el first load del resto de la app (`next/dynamic`, `ssr:false`).
- 60 fps en desktop (GPU media) con < 200 entities.

**Dependencias:** Fase 0 (las capas a portar deben existir).

---

### FASE 2 — Geometría Urbana 3D + Navegación Inteligente
> **Objetivo:** Geometría urbana real (Google Photorealistic 3D Tiles con fallback OSM Buildings) + centrado por volúmenes OSM + lock-on + Sparse Set.

**Componentes:**
- `lib/cesium/tilesets.ts` — carga de 3D Tiles (Google + fallback)
- `lib/osm/overpass.ts` — cliente Overpass API para geometría/bbox de objetos OSM
- `lib/cesium/georeference.ts` — ajuste de cámara para que un volumen ocupe ~60% viewport
- `components/map/LockOnController.tsx` — cámara seguidora + cuadro de seguimiento dinámico
- `lib/cesium/sparseSet.ts` — LOD/decimación de entities por presupuesto de framerate
- `components/map/SearchZone.tsx` — buscador de lugares (Nominatim → Overpass → flyTo + volumen)

**APIs / librerías:**
| Servicio | URL | Nota free tier |
|---|---|---|
| Google Photorealistic 3D Tiles | `https://tile.googleapis.com/v1/3dtiles/...` | Requiere Google Maps Platform API key. $200 crédito/mes ≈ free para demo. **Tiene costo si se excede.** |
| OSM Buildings (fallback) | `https://osmbuildings.org/` / extrusión propia desde Overpass | 100% gratis. Geometría extruida (sin texturas fotorrealistas). |
| Overpass API | `https://overpass-api.de/api/interpreter` | Gratis. Rate-limited; cachear agresivo en Convex. |
| Nominatim | `https://nominatim.openstreetmap.org/search` | Gratis. Máx 1 req/s, User-Agent obligatorio. |

**Carga de Google 3D Tiles + georreferencia por volumen OSM:**
```typescript
// lib/cesium/tilesets.ts
export async function loadGooglePhotorealistic(viewer: Cesium.Viewer) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return loadOsmBuildingsFallback(viewer); // free path
  const tileset = await Cesium.Cesium3DTileset.fromUrl(
    `https://tile.googleapis.com/v1/3dtiles/root.json?key=${key}`,
    { showCreditsOnScreen: true } // atribución obligatoria por ToS
  );
  viewer.scene.primitives.add(tileset);
  return tileset;
}

// lib/cesium/georeference.ts — "Aeropuerto Maiquetía" ocupa 60% del viewport
export async function frameOsmVolume(viewer: Cesium.Viewer, query: string) {
  const bbox = await fetchOverpassBbox(query);          // [[s,w],[n,e]]
  const rect = Cesium.Rectangle.fromDegrees(bbox.w, bbox.s, bbox.e, bbox.n);
  // padding inverso para que el objeto llene ~60% (factor 1/0.6)
  viewer.camera.flyTo({
    destination: viewer.camera.getRectangleCameraCoordinates(
      scaleRectangle(rect, 1 / 0.6)
    ),
    duration: 1.5,
  });
}
```

**Lock-on (cámara enganchada a objetivo en movimiento):**
```typescript
// components/map/LockOnController.tsx (núcleo)
function lockOn(viewer: Cesium.Viewer, entity: Cesium.Entity) {
  viewer.trackedEntity = entity; // Cesium sigue automáticamente
  // Cuadro de seguimiento: overlay HTML posicionado por SceneTransforms
  viewer.scene.postRender.addEventListener(() => {
    const pos = entity.position?.getValue(viewer.clock.currentTime);
    if (!pos) return;
    const win = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, pos);
    updateTargetingBracket(win); // mueve los 4 corner brackets HUD
  });
}
```

**Sparse Set:**
```typescript
// lib/cesium/sparseSet.ts
export function applySparseSet(entities: Cesium.Entity[], fps: number) {
  if (fps >= 50) return;                  // ok, mostrar todo
  const keepRatio = fps < 30 ? 0.25 : 0.5;
  entities.forEach((e, i) => { e.show = (i % Math.round(1 / keepRatio)) === 0; });
}
```

**Contratos de datos:**
```typescript
export interface OsmVolume {
  query: string;
  bbox: { s: number; w: number; n: number; e: number };
  centroid: { lat: number; lng: number };
  osmType: "node" | "way" | "relation";
  tags: Record<string, string>;
}
```

**Criterios de aceptación:**
- Buscar "Aeropuerto Maiquetía" centra la cámara con el volumen ocupando 55-65% del viewport.
- Si falta `GOOGLE_MAPS_KEY`, carga OSM Buildings extruidos sin error (degradación elegante).
- Lock-on sobre una aeronave en movimiento mantiene el cuadro de seguimiento sobre el objetivo con desfase < 1 frame.
- Con > 500 entities, Sparse Set mantiene ≥ 30 fps decimando visibilidad.

**Dependencias:** Fase 1 (viewer Cesium).

---

### FASE 3 — Post-procesamiento Visual (Shaders GLSL)
> **Objetivo:** Capa de post-proceso seleccionable sobre el canvas final de Cesium: FLIR/Térmica, NVG, CRT, Bloom, Sharpening. Cierra la estética "Spy Thriller".

**Componentes:**
- `lib/cesium/postprocess/index.ts` — registro de stages
- `lib/cesium/postprocess/flir.glsl.ts` — fragment shader térmico
- `lib/cesium/postprocess/nvg.glsl.ts` — night vision
- `lib/cesium/postprocess/crt.glsl.ts` — distorsión de barril + máscara RGB
- `lib/cesium/postprocess/bloom.ts` — wrapper del bloom nativo de Cesium
- `components/panels/VisionModePanel.tsx` — selector de modo de visión

**Mecanismo:** Cesium expone `viewer.scene.postProcessStages` — se inyectan shaders GLSL como `PostProcessStage` que operan sobre la textura de color final. Esto es **superior a CSS filters** porque opera en GPU sobre el framebuffer 3D (ver Decisión 4.3).

```typescript
// lib/cesium/postprocess/nvg.glsl.ts
export const NVG_FRAGMENT = /* glsl */ `
uniform sampler2D colorTexture;
uniform float u_time;
in vec2 v_textureCoordinates;
float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }
void main() {
  vec2 uv = v_textureCoordinates;
  vec3 src = texture(colorTexture, uv).rgb;
  float lum = dot(src, vec3(0.299, 0.587, 0.114));
  vec3 green = vec3(0.0, lum * 1.6, 0.0);          // tinte #00FF00 escalado
  float grain = (rand(uv * u_time) - 0.5) * 0.15;  // grano dinámico
  float scan = sin(uv.y * 800.0) * 0.04;           // scanlines
  out_FragColor = vec4(green + grain + scan, 1.0);
}`;

// lib/cesium/postprocess/index.ts
export function addNvgStage(viewer: Cesium.Viewer) {
  return viewer.scene.postProcessStages.add(new Cesium.PostProcessStage({
    fragmentShader: NVG_FRAGMENT,
    uniforms: { u_time: () => performance.now() / 1000 },
  }));
}
```

FLIR: invertir luminancia + mapa de calor naranja/blanco + edge detection (Sobel sobre `colorTexture`). CRT: distorsión de barril sobre UV (`uv += uv * dot(uv,uv) * k`) + máscara de subpíxeles RGB por `mod(gl_FragCoord.x, 3.0)`. Bloom y sharpening usan stages nativos de Cesium (`PostProcessStageLibrary.createBloomStage`).

**Criterios de aceptación:**
- 4 modos (NORMAL/FLIR/NVG/CRT) conmutables en < 200ms con glitch transition.
- Cada modo mantiene ≥ 30 fps en desktop.
- Bloom realza luces de ciudad y marcadores sísmicos sin lavar el HUD.

**Dependencias:** Fase 1.

---

### FASE 4 — Capas Analíticas Avanzadas (SAR / InSAR / Semáforo)
> **Objetivo:** Inteligencia SAR profunda: interferograma InSAR de deformación, detección de deslizamientos/inundaciones, semáforo vial sobre infraestructura crítica.

**Componentes:**
- `lib/sar/insar.ts` — carga de interferogramas pre-procesados (raster/GeoJSON deformación)
- `lib/sar/changeDetection.ts` — backscatter delta Sentinel-1 (pre/post evento)
- `lib/sar/roadStatus.ts` — análisis de textura Sentinel-2 → semáforo
- `components/map/layers/cesium/InsarLayer.tsx` — interferograma como imagery/heatmap 3D
- `components/map/layers/cesium/RoadStatusLayer.tsx` — polilíneas Verde/Amarillo/Rojo
- `convex/sarLayers.ts` — schema de productos SAR cacheados

**APIs / librerías:**
| Servicio | URL | Nota free tier |
|---|---|---|
| Copernicus Data Space | `https://dataspace.copernicus.eu/` | Sentinel-1/2 gratis. Procesamiento Sentinel-1 SLC → InSAR es **pesado → offline**. |
| ASF DAAC (Sentinel-1) | `https://search.asf.alaska.edu/` | Productos InSAR/RTC gratuitos. HyP3 genera interferogramas on-demand gratis. |
| SentinelHub (free) | `https://www.sentinel-hub.com/` | Free: 30K req/mes, 5000 unidades procesamiento. WMS/WMTS para tiles. |

**Estrategia InSAR (crítica):** El procesamiento interferométrico Sentinel-1 SLC es inviable en cliente o en función serverless free tier. **Se procesa offline** (ASF HyP3 genera el interferograma gratis), se exporta como GeoTIFF/PNG georreferenciado de deformación (mm), y se sirve como `imagery layer` Cesium. La app *visualiza*, no *calcula* InSAR en runtime.

**Contratos:**
```typescript
export interface RoadSegmentStatus {
  segmentId: string;
  name: string;                 // "Autopista Caracas-La Guaira"
  geometry: Array<{ lat: number; lng: number }>;
  status: "GREEN" | "AMBER" | "RED";
  confidence: number;           // 0..1
  source: "sentinel2-texture" | "manual" | "gdelt";
  updatedMs: number;
}
export interface InsarProduct {
  id: string;
  coherence: number;            // 0..1
  deformationCogUrl: string;    // GeoTIFF deformación (mm)
  maxSubsidenceMm: number;
  acquisitionPair: { primaryMs: number; secondaryMs: number };
}
```

**Criterios de aceptación:**
- Interferograma de la zona Yaracuy renderizado como capa con leyenda mm.
- Semáforo vial sobre Autopista Caracas-La Guaira con estado y confianza.
- Detección de ≥1 zona de deslizamiento/inundación en La Guaira sobre fixture.

**Dependencias:** Fase 1 (Cesium). Independiente de Fases 2-3.

---

### FASE 5 — Funcionalidades de Usuario + Cierre Narrativo
> **Objetivo:** Modo "Zona Específica" con resumen IA, export PDF Situation Report (OCHA), partículas de tráfico urbano, refinamiento bilingüe, CCTV (experimental).

**Componentes:**
- `components/panels/ZoneReportPanel.tsx` — resumen IA 24h de zona seleccionada
- `lib/report/situationReport.ts` — generador PDF (1 página, formato OCHA)
- `app/api/report/route.ts` — endpoint de generación PDF server-side
- `components/map/layers/cesium/TrafficParticles.tsx` — partículas sobre red vial OSM
- `lib/osm/roadNetwork.ts` — carga jerárquica de la red vial
- `components/map/layers/cesium/CctvProjection.tsx` — proyección de video sobre 3D (experimental)

**APIs / librerías:**
| Servicio | URL | Nota free tier |
|---|---|---|
| OpenRouter (ya en stack) | `https://openrouter.ai/` | Llama 3.3 70B free. Para resumen de zona y estado hospitalario. |
| `@react-pdf/renderer` o Puppeteer | npm | Generación PDF. Puppeteer pesado → preferir react-pdf en serverless. |
| Overpass (red vial) | ver Fase 2 | Carga jerárquica: motorway → trunk/primary → residential. |

**Partículas de tráfico urbano (carga jerárquica):**
```typescript
// lib/osm/roadNetwork.ts
const ROAD_TIERS = [
  { tier: 1, filter: "motorway|trunk", maxParticles: 2000 },   // autopistas
  { tier: 2, filter: "primary|secondary", maxParticles: 1500 },// arteriales
  { tier: 3, filter: "residential", maxParticles: 800 },       // residenciales
];
// Cada tier se carga solo si el framerate lo permite (presupuesto Sparse Set)
```
Cesium `ParticleSystem` o entities animadas sobre polilíneas OSM; densidad/velocidad ∝ datos de movilidad. Evalúa congestión en rutas de evacuación.

**Resumen IA de zona:**
```typescript
// lib/report/zoneSummary.ts
export async function summarizeZone(zone: OsmVolume): Promise<string> {
  const ctx = await buildZoneContext(zone); // sismos+noticias+humanitario 24h del bbox
  return callOpenRouter({
    system: "Eres analista de inteligencia de desastres. Resume las últimas 24h de la zona en 4 bullets operativos. ES/EN según locale.",
    user: JSON.stringify(ctx),
  });
}
```

**Criterios de aceptación:**
- Modo Zona Específica: dirección → flyTo + volumen 3D + resumen IA en < 5s.
- Export PDF: 1 página con snapshot del mapa, capas activas, stats, header OCHA.
- Partículas de tráfico fluyen sobre ≥3 autopistas con carga jerárquica respetando framerate.
- Términos técnicos (InSAR, ADS-B, SAR) no se traducen en ningún locale.

**Dependencias:** Fases 1-2 (Cesium + volúmenes OSM). CCTV es opcional/experimental.

---

### Grafo de dependencias entre fases
```
Fase 0 (fusión sobre MapLibre) ─┐
                                ├─► Fase 1 (Cesium) ─┬─► Fase 2 (3D urbano + nav)
                                │                    ├─► Fase 3 (shaders)
                                │                    ├─► Fase 4 (SAR/InSAR)
                                │                    └─► Fase 5 (usuario + tráfico)
```
Fases 3, 4, 5 son paralelizables tras Fase 2. Fase 0 entrega valor sin tocar el render.

---

## 4. Decisiones Arquitecturales Críticas

### 4.1 CesiumJS vs. MapLibre GL JS

| Criterio | MapLibre GL JS 4.x | CesiumJS |
|---|---|---|
| Modelo | Mapa 2D/2.5D (terreno limitado) | Globo 3D WGS84 completo |
| Bundle (gz) | ~250 KB | ~3 MB (mitigable con dynamic import + tree-shaking) |
| Curva de aprendizaje | Baja (estilo declarativo tipo Mapbox) | Alta (Entities, Primitives, Scene graph, cámara 3D) |
| 3D Tiles | Soporte parcial/experimental | Nativo (3D Tiles 1.1, glTF, photogrammetry) |
| Free tier render | Total | Total (Ion opcional) |
| Shaders custom | Limitado (custom layers WebGL manual) | `PostProcessStage` + `CustomShader` first-class |
| Tracking de cámara | Manual | `trackedEntity` nativo (lock-on trivial) |

**Decisión:** Migrar a Cesium es **necesario** — el 80% del material de entrada (globo, 3D Tiles, lock-on, shaders sobre framebuffer 3D, trazas orbitales) es imposible o forzado en MapLibre. El costo es bundle + complejidad, ambos mitigables. **MapLibre no se elimina**: queda como fallback ligero y como motor 2D para vistas donde el 3D no aporta (timeline overlay, mini-mapas).

### 4.2 Estrategia de migración incremental (coexistencia)

- **`MapEngineProvider`** abstrae el motor activo tras una interfaz común (`flyTo`, capas, selección). Componentes de panel no saben qué motor corre debajo.
- Las capas existen en dos implementaciones durante la transición: `layers/*.tsx` (MapLibre) y `layers/cesium/*.tsx` (Cesium). Un registry mapea capa lógica → implementación por motor.
- **Cesium se carga con `next/dynamic` `ssr:false`** — no penaliza el first load ni SSR. El usuario que nunca activa 3D no descarga los 3MB.
- Criterio de "Cesium default": cuando todas las capas P0/P1 tengan paridad y los criterios de Fase 1-2 pasen, se cambia el default y MapLibre queda como toggle/fallback.

### 4.3 Shaders GLSL (Cesium) vs. CSS filters

| | CSS filters | GLSL PostProcessStage |
|---|---|---|
| Dónde opera | Sobre el `<canvas>` ya rasterizado (composite del navegador) | Sobre la textura de color en GPU, dentro del pipeline de render |
| Capacidad | brillo/contraste/blur/hue básicos | Edge detection, distorsión de barril, grano por-píxel, máscaras RGB, sampling arbitrario |
| Performance desktop | Buena | Buena (1 pass full-screen) |
| Performance móvil | Variable (composite costoso con blur) | Mejor control; puede degradarse por resolución de framebuffer |
| Fidelidad "Spy Thriller" | Limitada | Completa (FLIR/NVG/CRT reales) |

**Decisión:** GLSL para los modos de visión 3D (operan sobre la escena Cesium). **CSS filters se conservan** para los efectos de HUD 2D ya especificados (scanlines, glitch transition, pulse rings) — el CLAUDE.md exige CSS para esos y no hay razón para moverlos. Regla: efecto sobre la escena 3D → GLSL; efecto sobre overlay DOM/HUD → CSS. **Móvil:** detectar `devicePixelRatio` alto + GPU débil → bajar `resolutionScale` del post-proceso o desactivar CRT (el más costoso).

### 4.4 ADS-B Exchange vs. OpenSky Network

| | ADS-B Exchange | OpenSky Network |
|---|---|---|
| Datos militares | **Sí** (`/get/mil`, sin filtro MLAT comercial) | No diferenciados |
| Acceso | Vía RapidAPI — requiere key, tier free limitado | API pública, anónima o registrada |
| Free tier | RapidAPI free: cuota baja (p.ej. ~1000 req/mes según plan) | Anónimo 400 cred/día; registrado 4000/día |
| Bitflags militar/PIA | `dbFlags & 1` (mil), `dbFlags & 4` (interés especial) | No expone bitflags equivalentes |
| Encoding | `Accept-Encoding: gzip` obligatorio | Estándar |
| Categoría emisor | Limitado | `category` (UAV, ROTORCRAFT, etc.) |

**Decisión:** **OpenSky es el P0** (free real, sin key, da categoría de emisor → drones/helicópteros de rescate, el caso de uso humanitario). **ADS-B Exchange es P1 condicional** — aporta el ángulo "militar" del Spy Thriller (`/get/mil`, bitflags) pero depende de key RapidAPI y cuota. Arquitectura: `lib/airtraffic/provider.ts` con interfaz común y dos adaptadores; ADS-B se activa solo si `ADSBX_RAPIDAPI_KEY` existe. Sin key → degradación a OpenSky. Cachear ambos en Convex con TTL 30s para no quemar cuota.

### 4.5 Google Photorealistic 3D Tiles vs. alternativas gratuitas

| Opción | Costo | Fidelidad | Cobertura |
|---|---|---|---|
| Google Photorealistic 3D Tiles | $200 crédito/mes (≈free demo), luego pago | Fotorrealista (mesh + texturas aéreas) | Global, urbano denso |
| OSM Buildings (extrusión Overpass) | Gratis total | Cajas extruidas sin textura | Donde hay datos OSM |
| Cesium OSM Buildings (Ion asset) | Free tier Ion (50K tiles/mes) | Extrusión + algunos detalles | Global |
| Maptiler 3D / terrain | Free tier limitado | Terreno, no edificios fotorrealistas | Global |

**Decisión:** **Doble vía con degradación elegante.** Google 3D Tiles es el "wow factor" para la demo de portafolio (Caracas/Valencia fotorrealistas) y el crédito mensual de $200 cubre uso de demostración — pero **tiene costo si se excede**, violando la restricción 100% free tier en producción sostenida. Por tanto: Google detrás de `NEXT_PUBLIC_GOOGLE_MAPS_KEY` opcional; **el default sin key es Cesium/OSM Buildings (100% gratis)**. El documento de portafolio puede mostrar Google; el deploy sostenible corre OSM. Atribución obligatoria on-screen en ambos casos.

---

## 5. Especificaciones Técnicas Detalladas — Top 3 Prioritarias

Las tres de mayor relación valor/viabilidad: **(1) OpenSky Data Fusion**, **(2) Índice de Vulnerabilidad Compuesto**, **(3) CesiumGlobe core**.

---

### 5.1 OpenSky Air Traffic Fusion (C2 — P0)

**Inicialización del cliente:**
```typescript
// lib/opensky.ts
const OPENSKY_BASE = "https://opensky-network.org/api";
const VEN_BBOX = { minLat: 0, maxLat: 13, minLng: -74, maxLng: -59 };

const EMITTER_MAP: Record<number, EmitterCategory> = {
  0: "NO_INFO", 1: "LIGHT", 2: "SMALL", 3: "LARGE", 4: "HIGH_VORTEX",
  5: "HEAVY", 6: "HIGH_PERF", 7: "ROTORCRAFT", 13: "UAV",
};

export async function fetchVenezuelaTraffic(): Promise<AircraftState[]> {
  const url = `${OPENSKY_BASE}/states/all`
    + `?lamin=${VEN_BBOX.minLat}&lomin=${VEN_BBOX.minLng}`
    + `&lamax=${VEN_BBOX.maxLat}&lomax=${VEN_BBOX.maxLng}`
    + `&extended=1`; // incluye category
  const res = await fetch(url, {
    headers: { "Accept-Encoding": "gzip" },
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`OpenSky ${res.status}`);
  const data = await res.json() as { states: unknown[][] | null };
  return (data.states ?? []).map(mapStateVector).filter(s => s.latitude !== null);
}

function mapStateVector(s: unknown[]): AircraftState {
  return {
    icao24: s[0] as string,
    callsign: (s[1] as string)?.trim() || null,
    originCountry: s[2] as string,
    longitude: s[5] as number | null,
    latitude: s[6] as number | null,
    baroAltitude: s[7] as number | null,
    onGround: s[8] as boolean,
    velocity: s[9] as number | null,
    heading: s[10] as number | null,
    verticalRate: s[11] as number | null,
    lastContact: s[4] as number,
    category: EMITTER_MAP[(s[17] as number) ?? 0] ?? "NO_INFO",
  };
}
```

**Esquema Convex:**
```typescript
// convex/schema.ts (extracto)
airTraffic: defineTable({
  icao24: v.string(),
  callsign: v.union(v.string(), v.null()),
  lat: v.union(v.number(), v.null()),
  lng: v.union(v.number(), v.null()),
  baroAltitude: v.union(v.number(), v.null()),
  velocity: v.union(v.number(), v.null()),
  verticalRate: v.union(v.number(), v.null()),
  heading: v.union(v.number(), v.null()),
  category: v.string(),
  onGround: v.boolean(),
  isMilitary: v.boolean(),     // de ADS-B dbFlags&1 si disponible
  fetchedAt: v.number(),
}).index("by_icao", ["icao24"]).index("by_fetchedAt", ["fetchedAt"]),
```

**Estructura React (Cesium):**
```
components/map/layers/cesium/AirTrafficEntities.tsx
  ├─ useQuery(api.airTraffic.recent)           // lee de Convex, no de OpenSky
  ├─ por aeronave → Cesium.Entity
  │    ├─ position (lat,lng,baroAltitude)
  │    ├─ model: helicóptero glTF si ROTORCRAFT, dron si UAV, avión si HEAVY
  │    ├─ color: --color-cyan civil, --color-amber rescate, --color-red militar
  │    └─ path: traza si velocity > 0
  └─ onClick → LockOnController.lockOn(entity)
```

**Performance:**
- Polling server-side (Convex action / cron 30s), **nunca** desde el cliente → protege la cuota de 400/día compartida.
- Cliente lee de Convex (reactivo) — N clientes = 1 fetch a OpenSky.
- Interpolación de posición client-side entre updates (dead reckoning con `velocity`+`heading`) para movimiento suave a 60fps sin más requests.
- Sparse Set sobre entities cuando el bbox satura.

---

### 5.2 Índice de Vulnerabilidad Compuesto (D1 — P0 analítico)

**Motor de cálculo:**
```typescript
// lib/vulnerability.ts
const WEIGHTS = { sar: 0.35, pop: 0.30, medical: 0.35 } as const;

export function computeVulnerability(input: {
  sarChange: number;       // 0..1 backscatter delta normalizado
  populationDensity: number; // 0..1
  nearestHospitalKm: number; // distancia a hospital OPERATIVO
  hospitalOperational: boolean;
}): VulnerabilityScore["composite"] {
  // medicalAccess: 1 = peor. Penaliza distancia y hospital no operativo.
  const distFactor = Math.min(input.nearestHospitalKm / 30, 1); // >30km = 1
  const medical = input.hospitalOperational ? distFactor : 1.0;
  return clamp01(
    WEIGHTS.sar * input.sarChange +
    WEIGHTS.pop * input.populationDensity +
    WEIGHTS.medical * medical
  );
}

export function rankOf(c: number): VulnerabilityScore["rank"] {
  if (c >= 0.75) return "CRITICAL";
  if (c >= 0.50) return "HIGH";
  if (c >= 0.25) return "MODERATE";
  return "LOW";
}
```

**Clave analítica:** el peso medical (0.35) permite que una zona con daño SAR *moderado* (0.4) pero **sin hospital operativo** (medical=1.0) escale a CRITICAL — exactamente el caso "zonas críticas por falta de acceso médico aunque el daño sea moderado" del material de entrada.

**Esquema Convex:**
```typescript
vulnerability: defineTable({
  zoneId: v.string(),        // H3 cell o admin3
  lat: v.number(), lng: v.number(),
  sarChange: v.number(),
  populationDensity: v.number(),
  medicalAccess: v.number(),
  composite: v.number(),
  rank: v.string(),
  computedAt: v.number(),
}).index("by_zone", ["zoneId"]).index("by_rank", ["rank"]),

hospitals: defineTable({
  osmId: v.string(),
  name: v.string(),
  lat: v.number(), lng: v.number(),
  status: v.string(),        // GREEN | AMBER | RED — clasificado por IA
  capacity: v.optional(v.number()),
  source: v.string(),        // gdelt | ocha | osm
  updatedAt: v.number(),
}).index("by_status", ["status"]),
```

**Estructura React:** `VulnerabilityHeatmap` (Cesium): grid H3 → entities `polygon` con `material` interpolado del gradiente `--color-green → amber → red` por `composite`. Leyenda + toggle de la variable dominante (modo "qué factor manda en esta celda").

**Performance:**
- Cálculo en Convex action programada (no en cada render).
- WorldPop pre-agregado a celdas H3 res 7 offline → JSON estático en Convex (no raster en runtime).
- Distancia a hospital: precalcular nearest con índice espacial; recalcular solo cuando cambia `hospitals.status`.

---

### 5.3 CesiumGlobe Core (A1 — P0 fundacional)

**Componente raíz:**
```typescript
// components/map/CesiumGlobe.tsx
"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

function CesiumGlobeInner() {
  const ref = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const viewer = createViewer(ref.current); // lib/cesium/viewer.ts
    viewerRef.current = viewer;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        VEN_2026_EVENT.epicenter.lng,
        VEN_2026_EVENT.epicenter.lat,
        250_000 // altitud inicial ~zoom 7
      ),
      duration: 0,
    });
    return () => { viewer.destroy(); viewerRef.current = null; };
  }, []);

  return <div ref={ref} className="absolute inset-0" />;
}

// Carga diferida — no infla first load ni SSR
export default dynamic(() => Promise.resolve(CesiumGlobeInner), { ssr: false });
```

**Bundling Next.js 14:** `cesium` requiere copiar assets estáticos (`Workers`, `Assets`, `Widgets`) y definir `CESIUM_BASE_URL`. Usar `copy-webpack-plugin` en `next.config.js` o `cesium` vendoreado a `public/cesium`. Definir `window.CESIUM_BASE_URL = "/cesium"`.

**Performance:**
- `requestRenderMode: true` + `maximumRenderTimeChange` → Cesium solo re-renderiza cuando la escena cambia (cámara/datos), no a 60fps constante. **Ahorro masivo de batería/GPU**, crítico en móvil.
- `EllipsoidTerrainProvider` (sin terreno) por defecto = cero requests de terrain.
- Imagery OSM con `RequestScheduler` limitado a 18/servidor.
- Entities con `scaleByDistance` para no rasterizar billboards lejanos.

---

## 6. Estrategia 100% Free Tier

| Servicio | Límite gratuito | Estrategia de caché | Al alcanzar el límite |
|---|---|---|---|
| **OpenSky Network** | 400 cred/día anónimo · 4000 registrado | Convex TTL 30s; 1 fetch server compartido para N clientes | Bajar polling a 60s; degradar a último snapshot cacheado |
| **ADS-B Exchange (RapidAPI)** | Tier free bajo (~1000 req/mes) | Convex TTL 60s; solo zonas de desastre (radio), no bbox completo | Desactivar capa militar; fallback OpenSky |
| **N2YO / Celestrak (NORAD)** | N2YO 1000 tx/h · Celestrak sin límite duro | TLE cacheado 12h (cambia lento); propagación SGP4 en cliente con `satellite.js` | Usar Celestrak TLE + cálculo propio (sin API) |
| **Overpass API (OSM)** | Sin key, rate-limited (uso justo) | Convex TTL 24h para geometría estática de lugares/red vial | Mirror Kumi/alternativo; pre-cachear lugares clave VEN |
| **Nominatim** | 1 req/s, User-Agent obligatorio | Cache de geocodes por query indefinido | Self-host Photon o pre-cargar ciudades del evento |
| **Google Photorealistic 3D Tiles** | $200 crédito/mes (no es "free" puro) | Sesión-scoped; solo al activar zona urbana | Degradar a OSM Buildings (gratis total) |
| **Cesium Ion (opcional)** | 5GB / 50K tile loads/mes | Solo si se usa terrain/asset Ion | `EllipsoidTerrainProvider` (cero costo) |
| **WorldPop** | Datos abiertos (descarga) | Pre-procesado offline → JSON H3 en Convex (sin runtime) | N/A (estático) |
| **Copernicus / ASF (SAR)** | Gratis, procesamiento offline | Productos InSAR/change pre-generados, servidos como tiles | N/A (offline) |
| **SentinelHub** | 30K req/mes, 5000 unidades proc | WMTS tiles cacheados en Convex/CDN | Servir solo capa pre-renderizada |
| **OpenRouter (Llama 3.3 70B)** | Free tier (rate-limited) | Cachear resúmenes de zona por bbox+ventana 1h | Cola/backoff; reusar último resumen |
| **MapLibre / CesiumJS render** | Ilimitado (open source) | N/A | N/A |

**Principio rector:** *toda* API externa se consume **server-side** (Convex actions/cron), nunca desde el cliente — así N usuarios = 1 cuota consumida. El cliente siempre lee de Convex. Esto ya es regla del CLAUDE.md y se mantiene sin excepción para las fuentes nuevas.

---

## 7. Riesgos y Mitigaciones

| # | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| **R1** | **Bundle Cesium (3MB) degrada Core Web Vitals / first load** | Alta | `next/dynamic` `ssr:false`; carga solo al activar 3D; tree-shaking; assets vendoreados con cache CDN agresivo; `requestRenderMode`. MapLibre sigue siendo el render inicial ligero. |
| **R2** | **Costo oculto de Google 3D Tiles excede $200/mes → rompe "100% free"** | Alta | Google detrás de feature flag por key opcional. Default = OSM Buildings gratis. Monitorizar uso en GCP; alarma a 80% del crédito. Documento de portafolio usa Google; deploy sostenible usa OSM. |
| **R3** | **Rate limits OpenSky/ADS-B/Overpass agotados por polling agresivo** | Media | Todo fetch server-side único compartido vía Convex; TTLs conservadores; backoff exponencial; dead-reckoning client-side para suavidad sin más requests; degradación a snapshot cacheado nunca a error. |
| **R4** | **Procesamiento InSAR/SAR inviable en free tier serverless (CPU/memoria/tiempo)** | Alta | No procesar en runtime. Generar productos offline (ASF HyP3 gratis) y servir GeoTIFF/tiles pre-renderizados como imagery. La app visualiza, no computa SAR. |
| **R5** | **Performance móvil colapsa con 3D + shaders + partículas (framerate, batería, calor)** | Media | `requestRenderMode`; detección de capacidad GPU; Sparse Set adaptativo por fps; bajar `resolutionScale` del post-proceso; desactivar CRT/partículas en móvil; `EllipsoidTerrainProvider`. Presupuesto de framerate gobierna la carga jerárquica. |

**Riesgos secundarios vigilados:** disponibilidad/legalidad de feeds CCTV públicos (R6 — tratar como experimental, no prometer en demo); precisión de la clasificación IA de estado hospitalario sobre GDELT (R7 — marcar confianza y fuente, nunca presentar como verdad operativa sin disclaimer); fragmentación de cobertura OSM en zonas rurales de Venezuela (R8 — degradar a extrusión genérica).

---

### Apéndice — Nuevas variables de entorno
```bash
# Opcionales — la app degrada con gracia si faltan
NEXT_PUBLIC_GOOGLE_MAPS_KEY=        # Google Photorealistic 3D Tiles (R2)
ADSBX_RAPIDAPI_KEY=                 # ADS-B Exchange militar (C1)
OPENSKY_CLIENT_ID=                  # OpenSky registrado (sube cuota a 4000/día)
OPENSKY_CLIENT_SECRET=
N2YO_API_KEY=                       # tracking satelital (alternativa: Celestrak sin key)
SENTINELHUB_INSTANCE_ID=           # tiles SAR/óptico
CESIUM_ION_TOKEN=                   # opcional — terrain/assets Ion
```

---
*Fin del documento. Referencia de implementación — un desarrollador puede ejecutar fase por fase sobre el stack GeoVigil SAR existente sin reescrituras destructivas.*
