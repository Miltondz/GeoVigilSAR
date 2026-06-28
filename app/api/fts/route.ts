import { mapFlow, mapPlanFunding, topDonors, FTS_BASE } from '@/lib/fts'

export const revalidate = 21600

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year') ?? '2026'

  try {
    const [flowRes, planRes] = await Promise.all([
      fetch(`${FTS_BASE}/fts/flow?countryISO3=VEN&year=${year}&limit=100`, { signal: AbortSignal.timeout(12_000) }),
      fetch(`${FTS_BASE}/plan/country/VEN`, { signal: AbortSignal.timeout(12_000) }),
    ])

    interface FlowEnvelope { data?: { flows?: unknown[] } }
    interface PlanEnvelope { data?: { plans?: unknown[] } }

    const [flowJson, planJson] = await Promise.all([
      flowRes.ok ? flowRes.json() as Promise<FlowEnvelope> : Promise.resolve({ data: undefined }),
      planRes.ok ? planRes.json() as Promise<PlanEnvelope> : Promise.resolve({ data: undefined }),
    ])

    const rawFlows = (flowJson.data?.flows ?? []) as Parameters<typeof mapFlow>[0][]
    const rawPlans = (planJson.data?.plans ?? []) as Parameters<(typeof mapPlanFunding)>[0]

    const flows   = rawFlows.map(mapFlow)
    const plans   = mapPlanFunding(rawPlans)
    const donors  = topDonors(flows, 10)
    const totalFundingUsd = flows.reduce((sum, f) => sum + (f.amountUsd ?? 0), 0)

    return Response.json(
      { flows, plans, topDonors: donors, totalFundingUsd, count: flows.length, lastUpdated: Date.now() },
      { headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=7200' } },
    )
  } catch {
    return Response.json(
      { flows: [], plans: [], topDonors: [], totalFundingUsd: 0, count: 0, lastUpdated: Date.now() },
      { headers: { 'Cache-Control': 'public, s-maxage=3600' } },
    )
  }
}
