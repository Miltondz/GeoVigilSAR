import { NextRequest, NextResponse } from 'next/server'
import { buildSystemPrompt, getAIClient, DEFAULT_MODEL, OPENROUTER_MODELS } from '@/lib/ai'

const FREE_MODEL_IDS = OPENROUTER_MODELS.free.map(m => m.id)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AIRequest {
  message: string
  history: ChatMessage[]
  context: { eventId: string; [k: string]: unknown }
}

// Status codes that mean "try next model" rather than "fatal error"
const RETRYABLE_STATUSES = new Set([400, 404, 429, 503, 529])

function streamText(text: string, modelUsed = 'none'): NextResponse {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    start(c) { c.enqueue(encoder.encode(text)); c.close() },
  })
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'X-Model-Used': modelUsed,
    },
  })
}

export async function POST(req: NextRequest) {
  const client = getAIClient()

  if (!client) {
    return streamText(
      'API key no configurada. Agrega OPENROUTER_API_KEY a .env.local para activar el asistente.'
    )
  }

  let body: AIRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { message, history, context } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  const systemPrompt = buildSystemPrompt(context)
  const requestedModel = req.headers.get('X-Model') ?? DEFAULT_MODEL

  const messages = [
    ...history.slice(-10),
    { role: 'user' as const, content: message },
  ]

  // Fallback chain: requested model first, then remaining free models
  const fallbackChain = [
    requestedModel,
    ...FREE_MODEL_IDS.filter(id => id !== requestedModel),
  ]

  let lastErr: unknown
  let lastStatus = 0

  for (const model of fallbackChain) {
    try {
      const stream = await client.chat.completions.create({
        model,
        max_tokens: 1024,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      })

      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) controller.enqueue(encoder.encode(text))
          }
          controller.close()
        },
      })

      return new NextResponse(readable, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
          'X-Model-Used': model,
        },
      })
    } catch (err) {
      const status = (err as { status?: number }).status ?? 0
      lastErr = err
      lastStatus = status

      if (RETRYABLE_STATUSES.has(status)) {
        const reason =
          status === 429 ? 'limitado por tasa' :
          status === 503 || status === 529 ? 'sobrecargado' :
          'no disponible'
        console.warn(`[ai] modelo ${model} ${reason} (${status}), probando siguiente`)
        continue
      }

      // Non-retryable (auth, unexpected server error, etc.)
      console.error(`[ai] error no reintentable en ${model}:`, err)
      return streamText('Error interno del servidor AI. Intenta de nuevo en unos minutos.')
    }
  }

  // All models exhausted
  console.error('[ai] todos los modelos agotados. Último error:', lastErr)

  const msg = lastStatus === 429
    ? 'Todos los modelos AI están temporalmente limitados por tasa. Intenta nuevamente en ~30 segundos.'
    : 'Sistema AI no disponible en este momento. Intenta en unos minutos.'

  return streamText(msg)
}
