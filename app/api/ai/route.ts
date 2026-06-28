import { NextRequest, NextResponse } from 'next/server'
import { buildSystemPrompt, getAIClient, DEFAULT_MODEL } from '@/lib/ai'

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

export async function POST(req: NextRequest) {
  const client = getAIClient()

  if (!client) {
    return NextResponse.json(
      {
        error: 'OPENROUTER_API_KEY not configured.',
        hint: 'Get a free key at https://openrouter.ai — add OPENROUTER_API_KEY to .env.local',
      },
      { status: 503 }
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
  const model = req.headers.get('X-Model') ?? DEFAULT_MODEL

  const messages = [
    ...history.slice(-10),
    { role: 'user' as const, content: message },
  ]

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
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
        'X-Model-Used': model,
      },
    })
  } catch (err) {
    console.error('OpenRouter stream error:', err)
    return NextResponse.json({ error: 'AI request failed' }, { status: 502 })
  }
}
