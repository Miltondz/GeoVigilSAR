import { NextRequest, NextResponse } from 'next/server'
import { getEvent } from '@/lib/events/index'
import { loadHospitals } from '@/lib/hospitals'
import { fetchUSGSEarthquakes } from '@/lib/usgs'
import { getAIClient, DEFAULT_MODEL } from '@/lib/ai'

export const runtime = 'nodejs'

interface SitRepRequest {
  eventId: string
  locale: 'es' | 'en'
  includeAI: boolean
}

function formatDate(ms: number): string {
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

export async function POST(req: NextRequest) {
  let body: SitRepRequest
  try {
    body = (await req.json()) as SitRepRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { eventId = 'VEN-2406', locale = 'es', includeAI = false } = body
  const event = getEvent(eventId)
  const now = Date.now()

  // ── 1. Seismic data ──────────────────────────────────────────────────────────
  let earthquakes: { magnitude: number; place: string; time: number; depth: number; classification: string }[] = []
  try {
    const raw = await fetchUSGSEarthquakes(event.bbox, {
      startTime: event.usgsQuery.startTime,
      minMagnitude: 2.0,
      limit: 200,
    })
    earthquakes = raw.map(q => ({
      magnitude: q.magnitude,
      place: q.place,
      time: q.time,
      depth: q.depth,
      classification: q.magnitude >= event.mainShockMagnitude - 0.5 ? 'mainshock' : 'aftershock',
    }))
  } catch {
    // USGS unavailable — continue with empty list
  }

  const mainShocks = earthquakes.filter(q => q.magnitude >= 7.0)
  const aftershocks = earthquakes.filter(q => q.magnitude < 7.0)
  const maxMag = earthquakes.reduce((m, q) => Math.max(m, q.magnitude), 0)

  // ── 2. Hospitals ─────────────────────────────────────────────────────────────
  const hospitals = loadHospitals()
  const green = hospitals.filter(h => h.status === 'GREEN').length
  const amber = hospitals.filter(h => h.status === 'AMBER').length
  const red   = hospitals.filter(h => h.status === 'RED').length

  // ── 3. AI executive summary (optional) ──────────────────────────────────────
  let aiSummary = ''
  if (includeAI) {
    try {
      const client = getAIClient()
      if (client) {
        const prompt =
          locale === 'es'
            ? `Genera un resumen ejecutivo de situación sísmica para el evento ${eventId}.\n` +
              `Evento principal: Mw ${event.mainShockMagnitude}, ${event.faultSystem}, ` +
              `epicentro ${event.epicenter.lat}°N ${Math.abs(event.epicenter.lng)}°W.\n` +
              `Réplicas registradas: ${aftershocks.length} (magnitud máxima ${maxMag.toFixed(1)}).\n` +
              `Hospitales: ${green} operativos, ${amber} limitados, ${red} no operativos.\n` +
              `Estados afectados: ${event.affectedStates.join(', ')}.\n` +
              `En 3-5 oraciones, resume el estado actual y prioridades de respuesta.`
            : `Generate an executive situation summary for event ${eventId}.\n` +
              `Main shock: Mw ${event.mainShockMagnitude}, ${event.faultSystem}, ` +
              `epicenter ${event.epicenter.lat}°N ${Math.abs(event.epicenter.lng)}°W.\n` +
              `Recorded aftershocks: ${aftershocks.length} (max magnitude ${maxMag.toFixed(1)}).\n` +
              `Hospitals: ${green} operational, ${amber} limited, ${red} non-operational.\n` +
              `Affected states: ${event.affectedStates.join(', ')}.\n` +
              `In 3-5 sentences, summarize current status and response priorities.`

        const completion = await client.chat.completions.create({
          model: DEFAULT_MODEL,
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        })
        aiSummary = completion.choices[0]?.message?.content ?? ''
      }
    } catch {
      // AI unavailable — omit section
    }
  }

  // ── 4. Build Markdown ────────────────────────────────────────────────────────
  const title    = locale === 'es' ? 'REPORTE DE SITUACIÓN SÍSMICA' : 'SEISMIC SITUATION REPORT'
  const sections: string[] = []

  sections.push(`# ${title}`)
  sections.push(
    `**Evento:** ${eventId}  \n` +
    `**Fecha evento:** ${formatDate(event.mainShockTime)}  \n` +
    `**Generado:** ${formatDate(now)}  \n` +
    `**Sistema de falla:** ${event.faultSystem}`,
  )

  // Seismic section
  const seismicTitle = locale === 'es' ? '## Datos Sísmicos' : '## Seismic Data'
  const epicenterLine =
    locale === 'es'
      ? `- **Epicentro:** ${event.epicenter.lat}°N, ${Math.abs(event.epicenter.lng)}°W (${event.affectedStates[0] ?? ''})`
      : `- **Epicenter:** ${event.epicenter.lat}°N, ${Math.abs(event.epicenter.lng)}°W (${event.affectedStates[0] ?? ''})`
  const magLine =
    locale === 'es'
      ? `- **Magnitud principal:** Mw ${event.mainShockMagnitude}`
      : `- **Main magnitude:** Mw ${event.mainShockMagnitude}`
  const afterLine =
    locale === 'es'
      ? `- **Réplicas (≥ M2.0):** ${aftershocks.length} · máx. M${maxMag.toFixed(1)}`
      : `- **Aftershocks (≥ M2.0):** ${aftershocks.length} · max. M${maxMag.toFixed(1)}`
  const statesLine =
    locale === 'es'
      ? `- **Estados afectados:** ${event.affectedStates.join(', ')}`
      : `- **Affected states:** ${event.affectedStates.join(', ')}`

  sections.push([seismicTitle, epicenterLine, magLine, afterLine, statesLine].join('\n'))

  if (mainShocks.length > 0) {
    const msHeader = locale === 'es' ? '### Eventos M7+' : '### M7+ Events'
    const msLines = mainShocks
      .slice(0, 10)
      .map(q => `| M${q.magnitude.toFixed(1)} | ${q.place} | ${formatDate(q.time)} | ${q.depth.toFixed(0)} km |`)
    sections.push(
      [msHeader, '| Mag | Lugar | Hora | Prof. |', '|-----|-------|------|-------|', ...msLines].join('\n'),
    )
  }

  if (aftershocks.length > 0) {
    const top5 = aftershocks
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, 5)
    const aftHeader = locale === 'es' ? '### Top 5 Réplicas' : '### Top 5 Aftershocks'
    const aftLines  = top5.map(q => `| M${q.magnitude.toFixed(1)} | ${q.place} | ${formatDate(q.time)} |`)
    sections.push(
      [aftHeader, '| Mag | Lugar | Hora |', '|-----|-------|------|', ...aftLines].join('\n'),
    )
  }

  // Medical section
  const medTitle = locale === 'es' ? '## Infraestructura Médica' : '## Medical Infrastructure'
  const medTotal = locale === 'es' ? `- **Total hospitales:** ${hospitals.length}` : `- **Total hospitals:** ${hospitals.length}`
  const medGreen = locale === 'es' ? `- **Operativos:** ${green}` : `- **Operational:** ${green}`
  const medAmber = locale === 'es' ? `- **Limitados:** ${amber}` : `- **Limited:** ${amber}`
  const medRed   = locale === 'es' ? `- **No operativos:** ${red}` : `- **Non-operational:** ${red}`
  sections.push([medTitle, medTotal, medGreen, medAmber, medRed].join('\n'))

  // AI section
  if (aiSummary) {
    const aiTitle = locale === 'es' ? '## Resumen Ejecutivo (IA)' : '## Executive Summary (AI)'
    sections.push(`${aiTitle}\n\n${aiSummary}`)
  }

  // Sources
  const srcTitle  = locale === 'es' ? '## Fuentes de Datos' : '## Data Sources'
  const srcLines  = [
    '- USGS Earthquake Hazards Program — earthquake.usgs.gov',
    '- OpenStreetMap / OCHA — hospital data',
    '- Copernicus Emergency Management Service (EMS)',
    `- GeoVigil SAR v1.0 — geovigil.vercel.app`,
  ]
  sections.push([srcTitle, ...srcLines].join('\n'))

  const markdown = sections.join('\n\n')

  return NextResponse.json({ markdown, generatedAt: now })
}
