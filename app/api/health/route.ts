export const dynamic = 'force-dynamic'

type HealthStatus = 'ok' | 'warn' | 'error' | 'timeout'

interface Check {
  id: string
  group: string
  name: string
  url: string
  method?: 'GET' | 'HEAD'
  authHeader?: string
}

export interface HealthResult {
  id: string
  group: string
  name: string
  status: HealthStatus
  latencyMs: number
  httpStatus?: number
  error?: string
}

const TIMEOUT_MS = 8000

function getChecks(): Check[] {
  const firmsKey      = process.env.NASA_FIRMS_MAP_KEY ?? ''
  const earthdataToken = process.env.EARTHDATA_TOKEN ?? ''
  const openrouterKey  = process.env.OPENROUTER_API_KEY ?? ''
  const mapillaryToken = process.env.MAPILLARY_CLIENT_TOKEN ?? ''

  return [
    {
      id: 'usgs',
      group: 'SÍSMICO',
      name: 'USGS Earthquake API',
      url: 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=1&minmagnitude=5',
    },
    {
      id: 'emsc',
      group: 'SÍSMICO',
      name: 'EMSC Seismic Portal',
      url: 'https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=1',
    },
    {
      id: 'gdacs',
      group: 'SÍSMICO',
      name: 'GDACS Alerts RSS',
      url: 'https://www.gdacs.org/xml/rss.xml',
      method: 'HEAD',
    },
    {
      id: 'firms',
      group: 'SATELITAL',
      name: 'NASA FIRMS — Focos calor',
      url: firmsKey
        ? `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsKey}/MODIS_NRT/-74,0,-59,13/1`
        : 'https://firms.modaps.eosdis.nasa.gov/',
    },
    {
      id: 'cdse',
      group: 'SATELITAL',
      name: 'Copernicus Dataspace (CDSE)',
      url: 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/.well-known/openid-configuration',
    },
    {
      id: 'hyp3',
      group: 'SATELITAL',
      name: 'ASF HyP3 InSAR',
      url: 'https://hyp3-api.asf.alaska.edu/',
      authHeader: earthdataToken ? `Bearer ${earthdataToken}` : undefined,
    },
    {
      id: 'emsr884',
      group: 'SATELITAL',
      name: 'Copernicus EMS — EMSR884',
      url: 'https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations/?code=EMSR884',
    },
    {
      id: 'reliefweb',
      group: 'HUMANITARIO',
      name: 'ReliefWeb (OCHA)',
      url: 'https://api.reliefweb.int/v2/disasters?limit=1&appname=geovigil-sar',
    },
    {
      id: 'hotosm',
      group: 'HUMANITARIO',
      name: 'HOT OSM Tasking Manager',
      url: 'https://tasks.hotosm.org/api/v8/projects/?search=venezuela+earthquake&page=1',
    },
    {
      id: 'gdelt',
      group: 'NOTICIAS',
      name: 'GDELT Project',
      url: 'https://api.gdeltproject.org/api/v2/doc/doc?query=Venezuela+terremoto&mode=artlist&maxrecords=1&format=json',
    },
    {
      id: 'opensky',
      group: 'TRÁFICO AÉREO',
      name: 'OpenSky Network',
      url: 'https://opensky-network.org/api/states/all?lamin=10.3&lomin=-69.0&lamax=10.6&lomax=-68.5',
    },
    {
      id: 'celestrak',
      group: 'ORBITAL',
      name: 'CelesTrak TLE',
      url: 'https://celestrak.org/',
      method: 'HEAD',
    },
    {
      id: 'nominatim',
      group: 'CARTOGRAFÍA',
      name: 'Nominatim OSM',
      url: 'https://nominatim.openstreetmap.org/status.php?format=json',
    },
    {
      id: 'maptiles',
      group: 'CARTOGRAFÍA',
      name: 'MapLibre Protomaps',
      url: 'https://demotiles.maplibre.org/style.json',
      method: 'HEAD',
    },
    {
      id: 'openrouter',
      group: 'IA',
      name: 'OpenRouter API',
      url: 'https://openrouter.ai/api/v1/auth/key',
      authHeader: openrouterKey ? `Bearer ${openrouterKey}` : undefined,
    },
    {
      id: 'mapillary',
      group: 'FOTOGRAFÍA',
      name: 'Mapillary API',
      url: 'https://graph.mapillary.com/me?fields=id',
      authHeader: mapillaryToken ? `OAuth ${mapillaryToken}` : undefined,
    },
  ]
}

async function checkEndpoint(check: Check): Promise<HealthResult> {
  const start = Date.now()
  const headers: Record<string, string> = {
    'User-Agent': 'GeoVigilSAR-HealthCheck/1.0',
  }
  if (check.authHeader) headers['Authorization'] = check.authHeader

  try {
    const method = check.method ?? 'GET'
    let res = await fetch(check.url, {
      method,
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })

    // HEAD not allowed → retry GET
    if (method === 'HEAD' && res.status === 405) {
      res = await fetch(check.url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS - (Date.now() - start)),
        cache: 'no-store',
      })
    }

    const latencyMs = Date.now() - start
    const s = res.status

    let status: HealthStatus
    if (s >= 200 && s < 300) status = 'ok'
    else if (s >= 300 && s < 500) status = 'warn'
    else status = 'error'

    return {
      id: check.id,
      group: check.group,
      name: check.name,
      status,
      latencyMs,
      httpStatus: s,
    }
  } catch (err) {
    const latencyMs = Date.now() - start
    const isTimeout = err instanceof Error &&
      (err.name === 'TimeoutError' || err.name === 'AbortError')

    return {
      id: check.id,
      group: check.group,
      name: check.name,
      status: isTimeout ? 'timeout' : 'error',
      latencyMs,
      error: err instanceof Error ? err.message.slice(0, 80) : String(err).slice(0, 80),
    }
  }
}

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const checks = getChecks()
      await Promise.all(
        checks.map(async (check) => {
          const result = await checkEndpoint(check)
          controller.enqueue(encoder.encode(JSON.stringify(result) + '\n'))
        })
      )
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-store, no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
