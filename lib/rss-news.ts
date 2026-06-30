import type { NewsItem } from '@/lib/gdelt'

// ── Minimal RSS XML parser ─────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/${tag}>`, 'i'))
  return m ? m[1].trim() : ''
}

function parseRSSItems(xml: string, source: string, keywords: string[]): NewsItem[] {
  const items: NewsItem[] = []
  const raw = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []
  const kw  = keywords.map(k => k.toLowerCase())

  for (const block of raw.slice(0, 30)) {
    const title   = extractTag(block, 'title')
    const link    = extractTag(block, 'link') || extractTag(block, 'guid')
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'dc:date')
    const desc    = extractTag(block, 'description') || extractTag(block, 'summary') || ''

    const combined = (title + ' ' + desc).toLowerCase()
    const relevant = kw.length === 0 || kw.some(k => combined.includes(k))
    if (!relevant || !title) continue

    const ts = pubDate ? new Date(pubDate).getTime() : Date.now()
    if (isNaN(ts)) continue

    items.push({
      title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      url:   link,
      source,
      publishedAt: ts,
      language: /español|venezuela|sismo|terremoto|muertos|heridos/.test(combined) ? 'es' : 'en',
    })
  }
  return items
}

async function fetchRSS(url: string, source: string, keywords: string[]): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GeoVigilSAR/1.0 (miltond.diaz@gmail.com)' },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseRSSItems(xml, source, keywords)
  } catch {
    return []
  }
}

// ── Source functions ──────────────────────────────────────────────────────────

export async function fetchBBCNews(keywords: string[]): Promise<NewsItem[]> {
  return fetchRSS('https://feeds.bbci.co.uk/news/world/rss.xml', 'BBC News', keywords)
}

export async function fetchAlJazeeraNews(keywords: string[]): Promise<NewsItem[]> {
  return fetchRSS('https://www.aljazeera.com/xml/rss/all.xml', 'Al Jazeera', keywords)
}

// EMSC's old RSS feed (emsc-csem.org/service/rss/rss.php) is dead (404).
// Use the live seismicportal.eu FDSN JSON API instead — same data, same
// source already used by lib/emsc.ts for the map layer — and synthesize
// NewsItem-shaped entries from significant recent earthquakes worldwide.
export async function fetchEMSCQuakeNews(): Promise<NewsItem[]> {
  try {
    const qs = new URLSearchParams({
      format: 'json', minmag: '4.0', limit: '15', orderby: 'time',
    })
    const res = await fetch(
      `https://www.seismicportal.eu/fdsnws/event/1/query?${qs.toString()}`,
      { signal: AbortSignal.timeout(8_000) }
    )
    if (!res.ok) return []
    const data = await res.json() as {
      features?: { properties?: { mag?: number; time?: string; flynn_region?: string; unid?: string } }[]
    }
    return (data.features ?? []).map(f => {
      const p = f.properties ?? {}
      const mag = p.mag ?? 0
      const region = p.flynn_region ?? 'región desconocida'
      const ts = p.time ? new Date(p.time).getTime() : Date.now()
      return {
        title: `M${mag.toFixed(1)} — ${region}`,
        url: `https://www.emsc-csem.org/Earthquake/?unid=${p.unid ?? ''}`,
        source: 'EMSC',
        publishedAt: ts,
        language: 'en' as const,
      }
    })
  } catch {
    return []
  }
}

export async function fetchReliefWebRSS(country: string): Promise<NewsItem[]> {
  const url = `https://reliefweb.int/country/${country.toLowerCase()}/rss.xml`
  return fetchRSS(url, 'ReliefWeb', ['earthquake', 'terremoto', 'sismo', 'seismic', country.toLowerCase()])
}

// ── Aggregator ────────────────────────────────────────────────────────────────

export async function fetchMultiSourceNews(
  country: string,
  keywords: string[]
): Promise<NewsItem[]> {
  const allKw = [country.toLowerCase(), ...keywords.map(k => k.toLowerCase())]

  const [bbc, aje, emsc] = await Promise.allSettled([
    fetchBBCNews(allKw),
    fetchAlJazeeraNews(allKw),
    fetchEMSCQuakeNews(),
  ])

  const merged: NewsItem[] = []
  if (bbc.status  === 'fulfilled') merged.push(...bbc.value)
  if (aje.status  === 'fulfilled') merged.push(...aje.value)
  if (emsc.status === 'fulfilled') merged.push(...emsc.value)

  // Deduplicate by URL, sort by recency
  const seen = new Set<string>()
  return merged
    .filter(n => { if (seen.has(n.url)) return false; seen.add(n.url); return true })
    .sort((a, b) => b.publishedAt - a.publishedAt)
}
