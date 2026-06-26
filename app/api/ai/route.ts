import { NextRequest, NextResponse } from 'next/server'
import { buildSystemPrompt, getAnthropicClient, type AIContext } from '@/lib/anthropic'

export const runtime = 'nodejs'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AIRequest {
  message: string
  history: ChatMessage[]
  context: AIContext
}

export async function POST(req: NextRequest) {
  const client = getAnthropicClient()

  if (!client) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured. Add it to .env.local to enable the AI assistant.' },
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

  const messages: ChatMessage[] = [
    ...history.slice(-10),
    { role: 'user', content: message },
  ]

  try {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      },
    })

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('Anthropic stream error:', err)
    return NextResponse.json({ error: 'AI request failed' }, { status: 502 })
  }
}
