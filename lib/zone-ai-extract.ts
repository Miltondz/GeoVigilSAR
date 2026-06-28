import { getAIClient, DEFAULT_FREE_MODEL } from '@/lib/ai'
import type { NewsItem } from '@/lib/gdelt'
import type { ReliefReport } from '@/lib/reliefweb'
import type { ZoneInfo } from '@/lib/zone-cache'

export interface ZoneAIExtract {
  localities:  string[]
  casualties:  { dead?: number; injured?: number; displaced?: number; missing?: number }
  keyFacts:    string[]       // 3-5 operational bullets
  riskLevel:   'critical' | 'high' | 'moderate' | 'low' | 'unknown'
  summary:     string         // 2-3 sentence operational summary
  confidence:  'high' | 'medium' | 'low'
  sources:     string[]       // source names used
}

const FALLBACK: ZoneAIExtract = {
  localities:  [],
  casualties:  {},
  keyFacts:    [],
  riskLevel:   'unknown',
  summary:     '',
  confidence:  'low',
  sources:     [],
}

export async function extractZoneInsights(
  zone: ZoneInfo,
  news: NewsItem[],
  reports: ReliefReport[]
): Promise<ZoneAIExtract> {
  const client = getAIClient()
  if (!client) return FALLBACK

  // Build compact input — keep under ~2000 chars to save tokens
  const newsLines = news
    .slice(0, 15)
    .map((n, i) => `[${i + 1}][${n.source}] ${n.title}`)
    .join('\n')

  const reportLines = reports
    .slice(0, 5)
    .map((r, i) => `[R${i + 1}][${r.source}] ${r.title}`)
    .join('\n')

  const allSourceNames = [
    ...news.slice(0, 15).map(n => n.source),
    ...reports.slice(0, 5).map(r => r.source),
  ]
  const sourcesUsed = allSourceNames.filter((s, i) => allSourceNames.indexOf(s) === i)

  const prompt = `Eres analista de inteligencia de desastres. Analiza las siguientes noticias y reportes sobre ${zone.country} y extrae información estructurada.

NOTICIAS RECIENTES:
${newsLines || '(sin noticias)'}

REPORTES HUMANITARIOS:
${reportLines || '(sin reportes)'}

Responde ÚNICAMENTE con JSON válido (sin markdown, sin bloques de código), siguiendo exactamente este esquema:
{
  "localities": ["lista de ciudades o zonas afectadas mencionadas"],
  "casualties": { "dead": número o null, "injured": número o null, "displaced": número o null, "missing": número o null },
  "keyFacts": ["hecho operacional 1", "hecho operacional 2", "hecho operacional 3"],
  "riskLevel": "critical|high|moderate|low|unknown",
  "summary": "resumen operacional de 2-3 frases",
  "confidence": "high|medium|low"
}

- localities: solo nombres geográficos concretos (ciudades, provincias, zonas)
- casualties: usa null si no se menciona, NO inventes cifras
- keyFacts: hechos verificables de las fuentes, no opiniones
- riskLevel: basado en magnitud del evento y datos de víctimas
- confidence: high si hay datos claros, low si son especulaciones`

  try {
    const response = await client.chat.completions.create({
      model:       DEFAULT_FREE_MODEL,
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens:  800,
    })

    const text = response.choices[0]?.message?.content ?? ''
    // Extract JSON even if model wraps in markdown
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { ...FALLBACK, sources: sourcesUsed }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ZoneAIExtract>

    return {
      localities:  Array.isArray(parsed.localities) ? parsed.localities.filter(Boolean).slice(0, 15) : [],
      casualties:  parsed.casualties && typeof parsed.casualties === 'object' ? parsed.casualties : {},
      keyFacts:    Array.isArray(parsed.keyFacts)   ? parsed.keyFacts.filter(Boolean).slice(0, 6)    : [],
      riskLevel:   (['critical','high','moderate','low'] as const).includes(parsed.riskLevel as never)
                   ? parsed.riskLevel! : 'unknown',
      summary:     typeof parsed.summary    === 'string' ? parsed.summary.slice(0, 400) : '',
      confidence:  (['high','medium','low'] as const).includes(parsed.confidence as never)
                   ? parsed.confidence! : 'low',
      sources:     sourcesUsed,
    }
  } catch {
    return { ...FALLBACK, sources: sourcesUsed }
  }
}
