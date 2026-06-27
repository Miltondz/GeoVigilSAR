# GeoVigil SAR — Fuentes de Datos

> Documento de referencia: todas las fuentes activas, propósito, tipo de dato y endpoints.
> Actualizado: 2026-06-27

---

## SÍSMICO

### USGS Earthquake Hazards Program
| Campo | Detalle |
|-------|---------|
| **Propósito** | Réplicas en tiempo real, epicentros, magnitudes, ShakeMap de intensidad PGA |
| **Tipo** | GeoJSON — puntos sísmicos + raster ShakeMap |
| **Cobertura** | Global, actualiza cada 60 s |
| **Auth** | Ninguna |
| **Endpoint principal** | `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson` |
| **ShakeMap** | `https://earthquake.usgs.gov/earthquakes/eventpage/{id}/shakemap` |
| **Route** | `GET /api/earthquakes` |
| **Revalidate** | 60 s |

### EMSC — European Mediterranean Seismological Centre
| Campo | Detalle |
|-------|---------|
| **Propósito** | Réplicas complementarias con red de sensores europeos (FDSN) |
| **Tipo** | GeoJSON FeatureCollection |
| **Cobertura** | Global — especialmente fuerte en Atlántico/Caribe |
| **Auth** | Ninguna |
| **Endpoint** | `https://www.seismicportal.eu/fdsnws/event/1/query?format=json` |
| **Route** | `GET /api/emsc` |
| **Revalidate** | 60 s |

---

## SATELITAL / SAR

### Copernicus Dataspace (CDSE) — Sentinel-1 SAR
| Campo | Detalle |
|-------|---------|
| **Propósito** | Imágenes SAR pre/post evento — change detection de estructuras, deformación del terreno |
| **Tipo** | Raster GRD (Ground Range Detected), quicklook PNG |
| **Resolución** | 10–20 m, revisita 12 días |
| **Auth** | OAuth2 password grant — `COPERNICUS_USERNAME` / `COPERNICUS_PASSWORD` |
| **Token** | `POST https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token` |
| **Search** | `GET https://catalogue.dataspace.copernicus.eu/odata/v1/Products` |
| **Quicklook proxy** | `GET /api/image-proxy?productId={id}` |
| **Route** | `GET /api/sar-tiles` |
| **Revalidate** | 3600 s |

### Copernicus Dataspace (CDSE) — Sentinel-2 Óptico
| Campo | Detalle |
|-------|---------|
| **Propósito** | Imágenes ópticas pre/post evento — daños visibles, comparación temporal |
| **Tipo** | Raster L2A (corregido atmosféricamente), quicklook PNG |
| **Resolución** | 10 m, revisita 5 días |
| **Auth** | Mismo token CDSE |
| **Route** | `GET /api/optical?phase=pre|post` |
| **Revalidate** | 3600 s |

### ASF HyP3 — InSAR Interferograms
| Campo | Detalle |
|-------|---------|
| **Propósito** | Mapas de deformación del suelo centimétrica (DInSAR) — subsidencia, fallas activas |
| **Tipo** | GeoTIFF `unw_phase` + browse PNG falso-color |
| **Proceso** | On-demand: pares S1 SLC → INSAR_GAMMA → GeoTIFF en ~60 min |
| **Auth** | NASA Earthdata bearer token — `EARTHDATA_TOKEN` |
| **Créditos** | 8 000 disponibles (cuenta mdvoid), límite 200/mes |
| **Submit** | `POST https://hyp3-api.asf.alaska.edu/jobs` |
| **Status** | `GET https://hyp3-api.asf.alaska.edu/jobs/{id}` |
| **Granule search** | `GET https://api.daac.asf.alaska.edu/services/search/param` |
| **Route** | `GET|POST /api/insar` |
| **Revalidate** | 0 (polling activo) |

### Copernicus EMS — Emergency Management Service
| Campo | Detalle |
|-------|---------|
| **Propósito** | Activaciones oficiales de mapeo de emergencia — damage grading maps, delineation maps |
| **Tipo** | JSON — lista de activaciones + productos por activación |
| **Auth** | Ninguna |
| **Endpoint** | `https://emergency.copernicus.eu/mapping/activations-rapid/EMS_RapidMappingActivation.json` |
| **Route** | `GET /api/copernicus-ems` |
| **Revalidate** | 3600 s |

---

## OBSERVACIÓN TERRESTRE

### NASA FIRMS — Fire Information for Resource Management System
| Campo | Detalle |
|-------|---------|
| **Propósito** | Focos de calor activos — incendios post-sismo, quemas en zonas afectadas |
| **Tipo** | CSV → puntos GeoJSON con FRP (Fire Radiative Power, MW) |
| **Sensores** | MODIS (1 km) + VIIRS SNPP (375 m) |
| **Auth** | MAP KEY — `NASA_FIRMS_MAP_KEY` |
| **Endpoint MODIS** | `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/MODIS_NRT/{bbox}/1` |
| **Endpoint VIIRS** | `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/VIIRS_SNPP_NRT/{bbox}/1` |
| **Transacciones** | 5 000 / 10 min |
| **Route** | `GET /api/firms` |
| **Revalidate** | 900 s |

---

## HUMANITARIO / RESPUESTA

### ReliefWeb (OCHA)
| Campo | Detalle |
|-------|---------|
| **Propósito** | Reportes humanitarios — situation reports, flash appeals, respuesta de agencias ONU/ONG |
| **Tipo** | JSON — artículos + estadísticas GKG |
| **Auth** | Ninguna (appname recomendado) |
| **Endpoint** | `https://api.reliefweb.int/v1/reports` |
| **Route** | `GET /api/humanitarian` |
| **Revalidate** | 3600 s |

### ReliefWeb Disasters
| Campo | Detalle |
|-------|---------|
| **Propósito** | Página oficial de desastre — GLIDE number, estado de respuesta, clasificación |
| **Tipo** | JSON — registro de desastre |
| **Auth** | Ninguna |
| **Endpoint** | `https://api.reliefweb.int/v1/disasters?filter[field]=country.iso3&filter[value]=VEN` |
| **Route** | `GET /api/reliefweb-disasters` |
| **Revalidate** | 3600 s |

### GDACS — Global Disaster Alert and Coordination System
| Campo | Detalle |
|-------|---------|
| **Propósito** | Nivel de alerta global (Rojo/Naranja/Verde), población afectada estimada, equipos de rescate internacionales |
| **Tipo** | XML RSS → eventos GeoJSON |
| **Auth** | Ninguna |
| **Endpoint** | `https://www.gdacs.org/xml/rss.xml` |
| **Route** | `GET /api/gdacs` |
| **Revalidate** | 900 s |

### HOT OSM — Humanitarian OpenStreetMap Team
| Campo | Detalle |
|-------|---------|
| **Propósito** | Proyectos de mapeo humanitario activos — % mapeado, % validado |
| **Tipo** | JSON — proyectos con centroide geográfico |
| **Auth** | Ninguna |
| **Endpoint** | `https://tasks.hotosm.org/api/v8/projects/?search=venezuela+earthquake` |
| **Route** | `GET /api/hotosm` |
| **Revalidate** | 1800 s |

---

## NOTICIAS / INTELIGENCIA ABIERTA

### GDELT Project
| Campo | Detalle |
|-------|---------|
| **Propósito** | Noticias geolocalizadas últimas 24 h — cobertura mediática, menciones por zona |
| **Tipo** | JSON — artículos con lat/lng, tono, tema |
| **Auth** | Ninguna |
| **DOC API** | `https://api.gdeltproject.org/api/v2/doc/doc?query=Venezuela+earthquake&mode=artlist&maxrecords=25&format=json` |
| **GKG Counts** | `https://api.gdeltproject.org/api/v2/summary/summary?d=web&t=summary&k=Venezuela+terremoto` |
| **Route** | `GET /api/news` |
| **Revalidate** | 900 s |

---

## TRÁFICO AÉREO / RESCATE

### OpenSky Network
| Campo | Detalle |
|-------|---------|
| **Propósito** | Aeronaves en tiempo real — helicópteros de rescate, vuelos de respuesta humanitaria, NOTAM |
| **Tipo** | JSON — estados ADS-B: posición, altitud, velocidad, callsign |
| **Auth** | Client credentials — `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` |
| **Cuota** | 4 000 req/día (con cuenta), vs 400 anónimo |
| **Endpoint** | `https://opensky-network.org/api/states/all?lamin=0&lomin=-74&lamax=13&lomax=-59` |
| **Route** | `GET /api/air-traffic` |
| **Refresh** | 30 s (polling cliente) |

---

## ÓRBITAS SATELITALES

### CelesTrak — TLE Database
| Campo | Detalle |
|-------|---------|
| **Propósito** | TLE (Two-Line Elements) de Sentinel-1A/1B/1C — calcular próximos pases sobre Venezuela |
| **Tipo** | Texto TLE — propagado con satellite.js v7 |
| **Auth** | Ninguna |
| **Endpoint** | `https://celestrak.org/SOCRATES/query.php` / GP elements |
| **Caché** | 12 h |
| **Route** | `GET /api/satellites` |
| **Revalidate** | 43200 s |

---

## CARTOGRAFÍA / GEOCODIFICACIÓN

### Nominatim (OpenStreetMap)
| Campo | Detalle |
|-------|---------|
| **Propósito** | Búsqueda de zonas — geocodificación inversa acotada a Venezuela bbox |
| **Tipo** | JSON — lugares con lat/lng |
| **Auth** | Ninguna (User-Agent obligatorio) |
| **Endpoint** | `https://nominatim.openstreetmap.org/search?viewbox=-74,0,-59,13&bounded=1` |
| **Route** | `GET /api/geocode` |

### MapLibre GL JS — Protomaps / demotiles
| Campo | Detalle |
|-------|---------|
| **Propósito** | Mapa base vectorial — calles, edificios, topónimos |
| **Tipo** | Vector tiles (MVT) |
| **Auth** | Ninguna |
| **Endpoint** | `https://demotiles.maplibre.org/style.json` |

### Cesium ion
| Campo | Detalle |
|-------|---------|
| **Propósito** | Terrain 3D real — Cesium World Terrain para globo 3D |
| **Tipo** | quantized-mesh terrain tiles |
| **Auth** | `NEXT_PUBLIC_CESIUM_TOKEN` |
| **URL** | `https://api.cesium.com` |

---

## FOTOGRAFÍA TERRESTRE

### Mapillary
| Campo | Detalle |
|-------|---------|
| **Propósito** | Fotos a nivel de calle — comparación pre/post en puntos de daño confirmado |
| **Tipo** | JSON + imágenes JPEG |
| **Auth** | `MAPILLARY_CLIENT_TOKEN` (access token) |
| **App ID** | `25758079677223453` |
| **Endpoint** | `https://graph.mapillary.com/images?fields=id,thumb_1024_url,computed_geometry` |
| **Route** | usado en `PhotoComparator` |

---

## IA / MODELOS DE LENGUAJE

### OpenRouter
| Campo | Detalle |
|-------|---------|
| **Propósito** | Chat AI contextual + triage hospitalario + situation report |
| **Auth** | `OPENROUTER_API_KEY` |
| **Endpoint** | `https://openrouter.ai/api/v1/chat/completions` |
| **Modelo chat** | `meta-llama/llama-3.3-70b-instruct:free` — panel AI, 131K ctx, multilingual |
| **Modelo triage** | `google/gemma-4-31b-it:free` — hospital status, JSON estructurado |
| **Modelo sitrep** | `nousresearch/hermes-3-llama-3.1-405b:free` — situation report, análisis largo |
| **Route** | `POST /api/ai`, `POST /api/hospital-status`, `POST /api/situation-report` |

---

## RESUMEN DE CREDENCIALES

| Variable | Fuente | Expira |
|----------|--------|--------|
| `COPERNICUS_USERNAME/PASSWORD` | dataspace.copernicus.eu | nunca |
| `EARTHDATA_TOKEN` | urs.earthdata.nasa.gov/user-tokens | 2026-10-25 |
| `NASA_FIRMS_MAP_KEY` | firms.modaps.eosdis.nasa.gov | nunca |
| `MAPILLARY_CLIENT_TOKEN` | mapillary.com | nunca (access token) |
| `OPENSKY_CLIENT_ID/SECRET` | opensky-network.org | nunca |
| `NEXT_PUBLIC_CESIUM_TOKEN` | cesium.com | ver JWT `exp` |
| `OPENROUTER_API_KEY` | openrouter.ai | nunca |
| `EARTHDATA_USERNAME/PASSWORD` | urs.earthdata.nasa.gov | nunca |

---

## CADENCIA DE ACTUALIZACIÓN

| Fuente | Intervalo API | Caché TTL |
|--------|--------------|-----------|
| USGS réplicas | 60 s | 90 s |
| EMSC réplicas | 60 s | 90 s |
| OpenSky ADS-B | 30 s (polling) | sin caché |
| GDELT noticias | 15 min | 20 min |
| NASA FIRMS | 15 min (ingest) | 15 min |
| GDACS alertas | 15 min | 15 min |
| HOT OSM | variable | 30 min |
| ReliefWeb | 1 h | 90 min |
| ReliefWeb Disasters | 1 h | 60 min |
| Copernicus SAR/Optical | ~12 días (revisita S1) | 60 min |
| Copernicus EMS | evento-driven | 60 min |
| CelesTrak TLE | 12 h | 12 h |
| NASA FIRMS (VIIRS) | 3 h | 4 h |
| HyP3 InSAR | on-demand (~60 min proc.) | hasta SUCCEEDED |
