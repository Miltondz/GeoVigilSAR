import Anthropic from '@anthropic-ai/sdk'
import type { USGSFeature } from './usgs'

export interface AIContext {
  eventId: string
  recentEarthquakes: Pick<USGSFeature, 'magnitude' | 'place' | 'time' | 'depth'>[]
  latestStats: { fatalities: number; injured: number; source: string; timestamp: number }
  recentNews: { title: string; source: string; publishedAt: number }[]
  activeLayers: string[]
}

const SYSTEM_BASE = `Eres el sistema de inteligencia situacional de GeoVigil SAR.
Tienes acceso a datos sísmicos en tiempo real de USGS, imágenes
satelitales de Copernicus, noticias de GDELT y reportes humanitarios
de ReliefWeb/OCHA para el evento sísmico de Venezuela del 24 de
junio de 2026 (Mw 7.2 + Mw 7.5, Yaracuy, falla Boconó-Morón-El Pilar).

Responde en el idioma en que se te pregunta (español o inglés).
Sé directo, técnico y preciso. Cita las fuentes de los datos que usas.
Si no tienes datos suficientes, dilo claramente. No especules más allá
de lo que los datos permiten. Respuestas cortas y estructuradas.
Usa números concretos. Prioriza utilidad operacional.`

export function buildSystemPrompt(ctx: AIContext): string {
  const quakesSection = ctx.recentEarthquakes.length > 0
    ? `\n--- SISMOS RECIENTES (${ctx.recentEarthquakes.length} en área visible) ---\n` +
      ctx.recentEarthquakes
        .slice(0, 10)
        .map(q => `M${q.magnitude.toFixed(1)} · ${q.place} · prof. ${q.depth.toFixed(0)}km · ${new Date(q.time).toISOString()}`)
        .join('\n')
    : ''

  const statsSection = `\n--- ESTADÍSTICAS HUMANITARIAS ---\nFallecidos: ${ctx.latestStats.fatalities} | Heridos: ${ctx.latestStats.injured} | Fuente: ${ctx.latestStats.source} | ${new Date(ctx.latestStats.timestamp).toISOString()}`

  const newsSection = ctx.recentNews.length > 0
    ? `\n--- NOTICIAS RECIENTES (${ctx.recentNews.length}) ---\n` +
      ctx.recentNews
        .slice(0, 5)
        .map(n => `[${n.source}] ${n.title}`)
        .join('\n')
    : ''

  const layersSection = `\n--- CAPAS ACTIVAS ---\n${ctx.activeLayers.join(', ')}`

  return SYSTEM_BASE + quakesSection + statsSection + newsSection + layersSection
}

export function getAnthropicClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  return new Anthropic({ apiKey: key })
}
