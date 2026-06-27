import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { loadHospitals } from '@/lib/hospitals'

// VEN-2406 epicenter
const EPICENTER = { lat: 10.4, lng: -68.7 }

const FALLBACK = { status: 'AMBER' as const, summary: 'Estado desconocido', confidence: 0.5 }

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface StatusResponse {
  status: 'GREEN' | 'AMBER' | 'RED'
  summary: string
  confidence: number
}

function isValidResponse(data: unknown): data is StatusResponse {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    (d.status === 'GREEN' || d.status === 'AMBER' || d.status === 'RED') &&
    typeof d.summary === 'string' &&
    typeof d.confidence === 'number'
  )
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as { hospitalId?: string; context?: string }
    const { hospitalId } = body

    if (!hospitalId) {
      return NextResponse.json(FALLBACK)
    }

    const hospitals = loadHospitals()
    const hospital = hospitals.find(h => h.osmId === hospitalId)

    if (!hospital) {
      return NextResponse.json(FALLBACK)
    }

    const distanceKm = Math.round(haversineKm(hospital.lat, hospital.lng, EPICENTER.lat, EPICENTER.lng) * 10) / 10

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(FALLBACK)
    }

    const client = new Anthropic({ apiKey })

    const userPrompt = `Eres un sistema de triaje hospitalario para emergencias sísmicas.
Hospital: ${hospital.name}, ubicado a ${distanceKm} km del epicentro (Veroes, Yaracuy).
Sismo principal: Mw 7.5, falla Boconó-Morón-El Pilar, 24 junio 2026.
Estado reportado: ${hospital.status}.
Basado en la distancia, magnitud y tipo de falla, evalúa:
1. Probabilidad de daño estructural (0-1)
2. Capacidad operativa estimada (VERDE/ÁMBAR/ROJO)
3. Resumen en 1 oración.
Responde SOLO en JSON: {"status": "GREEN"|"AMBER"|"RED", "summary": "...", "confidence": 0.0-1.0}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const block = message.content[0]
    if (block.type !== 'text') {
      return NextResponse.json(FALLBACK)
    }

    // Extract JSON — model may wrap in code fences
    const jsonMatch = block.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(FALLBACK)
    }

    const parsed: unknown = JSON.parse(jsonMatch[0])
    if (!isValidResponse(parsed)) {
      return NextResponse.json(FALLBACK)
    }

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json(FALLBACK)
  }
}
