export interface GdacsEvent {
  id: string
  title: string
  alertLevel: 'Red' | 'Orange' | 'Green' | 'Unknown'
  country: string
  lat: number
  lng: number
  magnitude: number
  populationAffected: number
  pubDate: string
  eventType: string
  url: string
}

// Extract inner text of a simple XML tag (first occurrence).
function extractGdacsTag(xml: string, tag: string): string {
  const open = `<${tag}`
  const close = `</${tag}>`
  const start = xml.indexOf(open)
  if (start === -1) return ''
  const innerStart = xml.indexOf('>', start)
  if (innerStart === -1) return ''
  const end = xml.indexOf(close, innerStart)
  if (end === -1) return ''
  return xml.slice(innerStart + 1, end).trim()
}

// Extract an attribute value from a tag (first occurrence).
function extractGdacsAttr(xml: string, tag: string, attr: string): string {
  const open = `<${tag}`
  const start = xml.indexOf(open)
  if (start === -1) return ''
  const closeAngle = xml.indexOf('>', start)
  if (closeAngle === -1) return ''
  const tagStr = xml.slice(start, closeAngle + 1)
  const attrRe = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`)
  const m = attrRe.exec(tagStr)
  return m ? m[1] : ''
}

function parseAlertLevel(raw: string): GdacsEvent['alertLevel'] {
  const lower = raw.toLowerCase()
  if (lower === 'red') return 'Red'
  if (lower === 'orange') return 'Orange'
  if (lower === 'green') return 'Green'
  return 'Unknown'
}

// Split RSS XML into individual <item>...</item> blocks.
function splitItems(xml: string): string[] {
  const items: string[] = []
  let pos = 0
  while (true) {
    const start = xml.indexOf('<item>', pos)
    if (start === -1) break
    const end = xml.indexOf('</item>', start)
    if (end === -1) break
    items.push(xml.slice(start, end + 7))
    pos = end + 7
  }
  return items
}

export async function fetchGdacsEarthquakes(): Promise<GdacsEvent[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    let res: Response
    try {
      res = await fetch('https://www.gdacs.org/xml/rss.xml', {
        signal: controller.signal,
        next: { revalidate: 900 },
        headers: { 'Accept': 'application/xml, text/xml, */*' },
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) {
      console.warn(`[GDACS] RSS returned ${res.status}`)
      return []
    }

    const xml = await res.text()
    const items = splitItems(xml)
    const events: GdacsEvent[] = []

    for (const item of items) {
      const eventType = extractGdacsTag(item, 'gdacs:eventtype')
      if (eventType !== 'EQ') continue

      const title = extractGdacsTag(item, 'title')
      const alertRaw = extractGdacsTag(item, 'gdacs:alertlevel')
      const country = extractGdacsTag(item, 'gdacs:country')
      // GDACS uses geo:lat / geo:long (not gdacs:latitude / gdacs:longitude)
      const latStr = extractGdacsTag(item, 'geo:lat') || extractGdacsTag(item, 'gdacs:latitude')
      const lngStr = extractGdacsTag(item, 'geo:long') || extractGdacsTag(item, 'gdacs:longitude')
      const pubDate = extractGdacsTag(item, 'pubDate')
      const eventId = extractGdacsTag(item, 'gdacs:eventid')
      const severityRaw = extractGdacsTag(item, 'gdacs:severity')
      const popRaw = extractGdacsAttr(item, 'gdacs:population', 'affected')

      // URL from <link> or <gdacs:url>
      let url = extractGdacsTag(item, 'gdacs:url')
      if (!url) url = extractGdacsTag(item, 'link')

      const lat = parseFloat(latStr)
      const lng = parseFloat(lngStr)
      const magnitude = parseFloat(severityRaw) || 0
      const populationAffected = parseInt(popRaw, 10) || 0

      events.push({
        id: eventId || `gdacs-eq-${pubDate}`,
        title,
        alertLevel: parseAlertLevel(alertRaw),
        country,
        lat: isNaN(lat) ? 0 : lat,
        lng: isNaN(lng) ? 0 : lng,
        magnitude,
        populationAffected,
        pubDate,
        eventType,
        url,
      })
    }

    return events
  } catch (err) {
    console.warn('[GDACS] Fetch failed:', err)
    return []
  }
}
