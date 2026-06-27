import OpenAI from 'openai'
import type { USGSFeature } from './usgs'

// ─── Model registry (verified against OpenRouter API 2026-06-26) ───────────────
export const OPENROUTER_MODELS = {
  free: [
    // Best for GeoVigil SAR: multilingual, structured output, large context
    { id: 'meta-llama/llama-3.3-70b-instruct:free',      label: 'Llama 3.3 70B (free)',         tokens: 131072  },
    { id: 'qwen/qwen3-next-80b-a3b-instruct:free',        label: 'Qwen3 Next 80B A3B (free)',    tokens: 262144  },
    { id: 'nousresearch/hermes-3-llama-3.1-405b:free',    label: 'Hermes 3 405B (free)',         tokens: 131072  },
    { id: 'google/gemma-4-31b-it:free',                   label: 'Gemma 4 31B (free)',           tokens: 262144  },
    { id: 'google/gemma-4-26b-a4b-it:free',               label: 'Gemma 4 26B MoE (free)',       tokens: 262144  },
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

// Llama 3.3 70B: best balance of quality + multilingual + 131K ctx for SAR use case
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
