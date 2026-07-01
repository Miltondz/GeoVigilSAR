# GeoVigil SAR — Análisis de duplicidad y simplificación

Análisis del código actual (33 rutas API, 41 clientes en `lib/`, ~60 componentes). Convex está en el stack pero `convex/` solo tiene `.gitkeep` — no se usa, todo el cache vive en headers HTTP por ruta. Eso no es duplicidad, solo nota de contexto.

## 1. Duplicación de llamadas API (real, con costo medible)

### 1.1 `/api/satellites` — fetch duplicado en cada toggle del layer
`MapLibreMap.tsx:325` y `Cesium3DGlobe.tsx:865` ambos hacen `fetch('/api/satellites?eventId=...')`, gateado solo por `activeLayers.satellites`. Como `GeoVigilMap.tsx` monta los dos (oculta con `display:none`/`visible`, no desmonta), activar la capa "satellites" dispara **2 fetches simultáneos** + parsing TLE duplicado (`satellite.js` corre en ambos).
**Fix:** subir el fetch a `GeoVigilMap.tsx`, pasar `satellitePasses` como prop a ambos hijos.

### 1.2 `/api/hospitals` — fetch duplicado StatsPanel + HospitalStatusPanel
`StatsPanel.tsx:82` pide la lista completa solo para contar GREEN/AMBER/RED. `HospitalStatusPanel.tsx:45` pide lo mismo cuando se abre el panel (mismo `eventId`). Sin cache compartido — dos round-trips a la misma data.
**Fix:** levantar el fetch a `page.tsx` (ya tiene `humanStats` con patrón similar) y derivar `hospitalCounts` con `useMemo` desde la misma lista que usa `HospitalStatusPanel`.

### 1.3 `/api/health` — probe de 16 endpoints externos, disparado por 2 componentes independientes
`SystemHealthModal.tsx:83` y `DataSourcesPanel.tsx:101` llaman el mismo endpoint, cada uno con su propio polling/countdown. `SystemHealthModal` además **auto-abre al cargar la página** (`page.tsx:72`, `systemHealthOpen` inicia en `true`). Si el usuario abre "DATOS" (DataSourcesPanel) mientras el modal de salud sigue vivo, son **32 requests HTTP salientes** a APIs de terceros (USGS, EMSC, GDACS, FIRMS, CDSE, HyP3, etc.) en paralelo, sin cache (`force-dynamic`, `no-store`).
**Fix:** ver sección 2.1 — son básicamente el mismo componente.

## 2. Duplicación de UI

### 2.1 `SystemHealthModal` y `DataSourcesPanel` son casi el mismo componente
Mismo `interface HealthResult`, mismo mapeo de color por status (`STATUS_COLOR`/`STATUS_DOT` — valores idénticos: `#00FF88`/`#FFB800`/`#FF4444`), misma lógica de latencia (`LatencyText`/`LatencyBadge`), mismo endpoint. Difieren solo en: `SystemHealthModal` tiene auto-close + countdown, `DataSourcesPanel` es manual.
**Fix:** fusionar en un solo componente con prop `autoClose?: boolean`. Elimina ~150 líneas duplicadas y la llamada doble a `/api/health`. Quitar el botón/entrada redundante en `DashboardHeader`.

### 2.2 `NewsStream.tsx` — componente muerto
Grep confirma: no se importa en ningún `.tsx` del proyecto (solo se referencia en docs `.md`). `AIPanel.tsx:46-58` reimplementa la misma lógica de fetch+formato de noticias inline en vez de usar `NewsStream`.
**Fix:** borrar `components/panels/NewsStream.tsx`, o si la intención era reusarlo, reemplazar el bloque inline de `AIPanel` por `<NewsStream items={newsItems} />`.

### 2.3 `MapDetailPanel` vs `ZoneAnalysisPanel` — no son duplicados, pero ambos llaman `/api/news` con lógica de formato de tiempo repetida
No es bug, pero `fmtTime`/cálculo de "hace Xm/h/d" aparece en `AIPanel`, `MapDetailPanel` y `ZoneAnalysisPanel` por separado, cada uno con su propia función local.
**Fix (bajo impacto, opcional):** extraer `formatRelativeTime(ms)` a `lib/format.ts`, usar en los 3.

## 3. Otros hallazgos menores

- `DashboardHeader.tsx` tiene botones separados para `onDataSourcesOpen` y `onSystemHealthOpen` → tras 2.1, queda un solo botón.
- `page.tsx` define 32 flags en `DEFAULT_LAYERS`; varios (`funding`, `usaidDisasters`, `osmInfra`, `buoys`) no tienen evidencia de uso fuera de su propio layer — no es duplicidad, pero vale auditar cuáles realmente aportan al caso de uso (sismo Venezuela) vs. cuáles son "porque la API estaba disponible".

## 4. Prioridad de fixes (impacto vs esfuerzo)

| # | Fix | Esfuerzo | Impacto |
|---|---|---|---|
| 1 | Fusionar `SystemHealthModal` + `DataSourcesPanel` | Bajo (1 archivo, ~30 min) | Alto — corta requests externas a la mitad, simplifica header |
| 2 | Borrar `NewsStream.tsx` o usarlo en `AIPanel` | Bajo | Medio — limpieza, menos código a mantener |
| 3 | Levantar fetch de `/api/satellites` a `GeoVigilMap` | Medio | Medio — evita doble fetch + doble parse TLE |
| 4 | Compartir `/api/hospitals` entre `StatsPanel`/`HospitalStatusPanel` | Medio | Medio — evita doble round-trip |
| 5 | Extraer `formatRelativeTime` compartido | Bajo | Bajo — solo limpieza |

Ningún fix requiere tocar Convex ni cambiar arquitectura — todos son reorganización de fetch/estado dentro de componentes ya existentes.
