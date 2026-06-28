import OpenAI from 'openai'
import type { USGSFeature } from './usgs'

// ─── Model registry ─────────────────────────────────────────────────────────────
export const OPENROUTER_MODELS = {
  free: [
    // Ranked best→good for GeoVigil SAR: multilingual ES/EN, structured output, large context
    { id: 'meta-llama/llama-3.3-70b-instruct:free',       label: 'Llama 3.3 70B (free)',         tokens: 131072  },
    { id: 'qwen/qwen3-235b-a22b:free',                    label: 'Qwen3 235B MoE (free)',        tokens: 262144  },
    { id: 'deepseek/deepseek-r1:free',                    label: 'DeepSeek R1 (free)',           tokens: 163840  },
    { id: 'google/gemma-3-27b-it:free',                   label: 'Gemma 3 27B (free)',           tokens: 131072  },
    { id: 'nousresearch/hermes-3-llama-3.1-405b:free',    label: 'Hermes 3 405B (free)',         tokens: 131072  },
    { id: 'openrouter/free',                              label: 'Router (aleatorio gratis)',     tokens: 200000  },
  ],
  paid: [
    { id: 'openai/gpt-4o-mini',              label: 'GPT-4o Mini',        costPer1M: '$0.15 in / $0.60 out'   },
    { id: 'anthropic/claude-3-haiku',        label: 'Claude 3 Haiku',     costPer1M: '$0.25 in / $1.25 out'   },
    { id: 'anthropic/claude-3.5-sonnet',     label: 'Claude 3.5 Sonnet',  costPer1M: '$3.00 in / $15.00 out'  },
    { id: 'openai/gpt-4o',                   label: 'GPT-4o',             costPer1M: '$2.50 in / $10.00 out'  },
    { id: 'google/gemini-flash-1.5',         label: 'Gemini Flash 1.5',   costPer1M: '$0.075 in / $0.30 out'  },
  ],
} as const

export type FreeModelId = typeof OPENROUTER_MODELS.free[number]['id']
export type PaidModelId = typeof OPENROUTER_MODELS.paid[number]['id']
export type ModelId     = FreeModelId | PaidModelId

export const DEFAULT_FREE_MODEL: FreeModelId = 'meta-llama/llama-3.3-70b-instruct:free'
export const DEFAULT_PAID_MODEL: PaidModelId = 'openai/gpt-4o-mini'

export const DEFAULT_MODEL: string = process.env.OPENROUTER_MODEL ?? DEFAULT_FREE_MODEL

export function getModelLabel(id: string): string {
  const all = [...OPENROUTER_MODELS.free, ...OPENROUTER_MODELS.paid]
  return all.find(m => m.id === id)?.label ?? id.split('/').pop() ?? id
}

export function isFreeModel(id: string): boolean {
  return id.endsWith(':free') || id === 'openrouter/free'
}

// ─── Context types ─────────────────────────────────────────────────────────────
export interface AIContext {
  eventId: string
  recentEarthquakes: Pick<USGSFeature, 'magnitude' | 'place' | 'time' | 'depth'>[]
  latestStats: { fatalities: number; injured: number; source: string; timestamp: number }
  recentNews: { title: string; source: string; publishedAt: number }[]
  activeLayers: string[]
}

// ─── System prompt ─────────────────────────────────────────────────────────────
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

export function buildSystemPrompt(ctx: Partial<AIContext> & { eventId: string }): string {
  const quakes = ctx.recentEarthquakes ?? []
  const news   = ctx.recentNews       ?? []
  const layers = ctx.activeLayers     ?? []
  const stats  = ctx.latestStats

  const quakesSection = quakes.length > 0
    ? `\n--- SISMOS RECIENTES (${quakes.length} en área visible) ---\n` +
      quakes
        .slice(0, 10)
        .map(q => `M${q.magnitude.toFixed(1)} · ${q.place} · prof. ${q.depth.toFixed(0)}km · ${new Date(q.time).toISOString()}`)
        .join('\n')
    : ''

  const statsSection = stats
    ? `\n--- ESTADÍSTICAS HUMANITARIAS ---\nFallecidos: ${stats.fatalities} | Heridos: ${stats.injured} | Fuente: ${stats.source} | ${new Date(stats.timestamp).toISOString()}`
    : ''

  const newsSection = news.length > 0
    ? `\n--- NOTICIAS RECIENTES (${news.length}) ---\n` +
      news.slice(0, 5).map(n => `[${n.source}] ${n.title}`).join('\n')
    : ''

  const layersSection = layers.length > 0
    ? `\n--- CAPAS ACTIVAS ---\n${layers.join(', ')}`
    : ''

  return SYSTEM_BASE + quakesSection + statsSection + newsSection + layersSection
}

// ─── Client factory ────────────────────────────────────────────────────────────
export function getAIClient(): OpenAI | null {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return null

  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: key,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      'X-Title': 'GeoVigil SAR',
    },
  })
}
