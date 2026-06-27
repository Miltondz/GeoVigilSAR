export interface EmsActivation {
  activationId: string // e.g. "EMSR123"
  title: string
  countries: string[]
  eventDate: string
  type: string // e.g. "Earthquake"
  status: string
  url: string
  productCount: number
}

interface RawActivation {
  activationId?: string
  title?: string
  countries?: string | string[]
  eventDate?: string
  type?: string
  status?: string
  url?: string
  products?: unknown[]
  [key: string]: unknown
}

function isRawActivation(val: unknown): val is RawActivation {
  return typeof val === 'object' && val !== null
}

function parseCountries(raw: unknown): string[] {
  if (typeof raw === 'string') return [raw]
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string')
  return []
}

function matchesCountry(activation: RawActivation, country: string): boolean {
  const lc = country.toLowerCase()
  const countries = parseCountries(activation.countries)
  if (countries.some(c => c.toLowerCase().includes(lc))) return true
  const title = typeof activation.title === 'string' ? activation.title.toLowerCase() : ''
  return title.includes(lc)
}

export async function fetchEmsActivations(country: string = 'Venezuela'): Promise<EmsActivation[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    let res: Response
    try {
      res = await fetch(
        'https://emergency.copernicus.eu/mapping/activations-rapid/EMS_RapidMappingActivation.json',
        { signal: controller.signal, next: { revalidate: 3600 } }
      )
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) {
      console.warn(`[CopernicusEMS] API returned ${res.status}`)
      return []
    }

    const data: unknown = await res.json()

    // The response may be a direct array or { activations: [...] } or similar
    let rawList: unknown[] = []
    if (Array.isArray(data)) {
      rawList = data
    } else if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>
      const found = Object.values(obj).find(v => Array.isArray(v))
      if (found) rawList = found as unknown[]
    }

    const results: EmsActivation[] = []

    for (const item of rawList) {
      if (!isRawActivation(item)) continue
      if (!matchesCountry(item, country)) continue

      const activationId = typeof item.activationId === 'string' ? item.activationId : ''
      const title = typeof item.title === 'string' ? item.title : ''
      const eventDate = typeof item.eventDate === 'string' ? item.eventDate : ''
      const type = typeof item.type === 'string' ? item.type : ''
      const status = typeof item.status === 'string' ? item.status : ''
      const url = typeof item.url === 'string'
        ? item.url
        : activationId
          ? `https://emergency.copernicus.eu/mapping/list-of-components/${activationId}`
          : 'https://emergency.copernicus.eu/mapping/activations-rapid'
      const productCount = Array.isArray(item.products) ? item.products.length : 0

      results.push({
        activationId,
        title,
        countries: parseCountries(item.countries),
        eventDate,
        type,
        status,
        url,
        productCount,
      })
    }

    return results
  } catch (err) {
    console.warn('[CopernicusEMS] Fetch failed:', err)
    return []
  }
}
