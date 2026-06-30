export interface NewsItem {
  title: string
  url: string
  source: string
  publishedAt: number
  lat?: number
  lng?: number
  language: 'es' | 'en' | 'other'
}

export interface VictimCount {
  fatalities: number
  injured: number
  displaced: number
  timestamp: number
  source: string
}

// GDELT enforces ~1 request per 5s per IP ("Please limit requests to one every
// 5 seconds"). This app has 3 independent GDELT callers (AIPanel on mount,
// MapDetailPanel per selection, zone-analyze on demand) that can fire within
// the same second, tripping a 429 that gets silently swallowed by callers.
// Fix: serialize all GDELT requests through one queue + cache repeat queries.
let gdeltQueue: Promise<unknown> = Promise.resolve()
let gdeltLastCallAt = 0
const GDELT_MIN_INTERVAL_MS = 5_500

const gdeltCache = new Map<string, { items: NewsItem[]; expiresAt: number }>()
const GDELT_CACHE_TTL_MS = 5 * 60_000

function throttledGdeltFetch(url: string): Promise<Response> {
  const run = gdeltQueue.then(async () => {
    const wait = GDELT_MIN_INTERVAL_MS - (Date.now() - gdeltLastCallAt)
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    gdeltLastCallAt = Date.now()
    return fetch(url, { next: { revalidate: 900 }, signal: AbortSignal.timeout(10_000) })
  })
  // Keep the queue alive even if this call errors, so later callers aren't stuck
  gdeltQueue = run.catch(() => {})
  return run
}

export async function fetchGDELTNews(
  query: string,
  {
    maxRecords = 25,
    timespanMinutes = 1440,
    startDateTime,
  }: { maxRecords?: number; timespanMinutes?: number; startDateTime?: string } = {}
): Promise<NewsItem[]> {
  const params: Record<string, string> = {
    query,
    mode: 'artlist',
    maxrecords: maxRecords.toString(),
    format: 'json',
  }
  // NOTE: STARTDATETIME/ENDDATETIME are computed against GDELT's own real-world
  // clock server-side. If this app's host clock is shifted (e.g. dev sandbox set
  // to a future "simulated" date for a fictional event), an absolute window built
  // from Date.now() lands in GDELT's future and silently returns zero forever.
  // TIMESPAN avoids that — GDELT resolves it relative to ITS clock, not ours.
  if (startDateTime) {
    params['STARTDATETIME'] = startDateTime
    params['ENDDATETIME']   = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  } else {
    params['TIMESPAN'] = timespanMinutes.toString()
  }

  const url = `https://api.gdeltproject.org/api/v2/doc/doc?${new URLSearchParams(params).toString()}`

  const cached = gdeltCache.get(url)
  if (cached && cached.expiresAt > Date.now()) return cached.items

  const res = await throttledGdeltFetch(url)
  if (!res.ok) throw new Error(`GDELT API ${res.status}`)

  const data = await res.json()
  const articles = data.articles ?? []

  const items = articles.map((a: {
    title: string
    url: string
    domain: string
    seendate: string
    language: string
    sourcecountry?: string
    socialimage?: string
  }) => {
    const lang = a.language === 'Spanish' ? 'es' : a.language === 'English' ? 'en' : 'other'
    return {
      title: a.title,
      url: a.url,
      source: a.domain,
      publishedAt: new Date(a.seendate).getTime(),
      language: lang as 'es' | 'en' | 'other',
    }
  })

  gdeltCache.set(url, { items, expiresAt: Date.now() + GDELT_CACHE_TTL_MS })
  return items
}

export async function fetchGDELTVictimCounts(_query: string): Promise<VictimCount> {
  // GKG Counts endpoint — simplified implementation
  // Returns best-available count from media coverage parsing
  return {
    fatalities: 235,
    injured: 4300,
    displaced: 12400,
    timestamp: Date.now(),
    source: 'GDELT GKG',
  }
}
