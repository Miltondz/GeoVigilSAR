import { NextRequest, NextResponse } from 'next/server'
import { fetchGDELTNews, type NewsItem } from '@/lib/gdelt'
import { fetchMultiSourceNews } from '@/lib/rss-news'
import { getEvent } from '@/lib/events/index'

export const runtime = 'nodejs'
export const revalidate = 900

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const eventId = searchParams.get('eventId') ?? 'VEN-2406'
  const lang    = searchParams.get('lang') as 'es' | 'en' | null
  const limit   = parseInt(searchParams.get('limit') ?? '25', 10)
  const place   = searchParams.get('place') ?? ''  // optional location term

  const event = getEvent(eventId)

  const baseQuery = event.gdeltQuery
  // No quotes around place — allows partial/variant matches (small towns often absent otherwise)
  const query = place ? `${baseQuery} ${place}` : baseQuery

  // Pin to a wide rolling window rather than computing absolute dates from this
  // server's clock — avoids any dependency on local time being in sync with
  // GDELT's own clock, and sidesteps GDELT's STARTDATETIME edge cases entirely.
  const TIMESPAN_90D = 129_600

  // GDELT alone often returns 0 — it rate-limits hard (1 req/5s) and the
  // query can be too narrow for small towns. Merge in RSS sources (BBC,
  // Al Jazeera, EMSC via seismicportal.eu) which have no comparable rate
  // limit. ReliefWeb is deliberately excluded: its RSS endpoint blocks
  // Node's fetch() as bot traffic (406), and its v2 JSON API requires an
  // appname this project isn't registered for (403); v1 is decommissioned (410).
  const rssKeywords = place ? [place, event.faultSystem] : [event.faultSystem]
  const countryName = event.name.es.replace(/\s+\d{4}$/, '')  // "Venezuela 2026" → "Venezuela"

  const [gdeltResult, rssResult] = await Promise.allSettled([
    fetchGDELTNews(query, { maxRecords: limit, timespanMinutes: TIMESPAN_90D })
      .then(async items => {
        // Fallback: place produced nothing → retry with broader base query only
        if (items.length === 0 && place) {
          return fetchGDELTNews(baseQuery, { maxRecords: limit, timespanMinutes: TIMESPAN_90D })
        }
        return items
      }),
    fetchMultiSourceNews(countryName, rssKeywords),
  ])

  const gdeltItems = gdeltResult.status === 'fulfilled' ? gdeltResult.value : []
  const rssItems   = rssResult.status   === 'fulfilled' ? rssResult.value   : []

  if (gdeltResult.status === 'rejected') console.error('GDELT fetch error:', gdeltResult.reason)

  const seen = new Set<string>()
  const merged: NewsItem[] = [...gdeltItems, ...rssItems]
    .filter(n => { if (seen.has(n.url)) return false; seen.add(n.url); return true })
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, limit)

  const filtered = lang ? merged.filter(i => i.language === lang) : merged
  const lastUpdated = Date.now()

  return NextResponse.json(
    { items: filtered, lastUpdated, count: filtered.length },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1200' } }
  )
}
