export interface FtsFlow {
  id: number
  amountUsd: number
  date: string
  sourceOrg: string
  sourceType: string
  destinationOrg: string
  status: string
}

export interface FtsPlanFunding {
  planId: number
  planName: string
  requirementsUsd: number
  fundingUsd: number
  coveragePct: number
}

interface RawFtsFlowObject {
  type: string
  name: string
  organizationTypes?: string[]
}

interface RawFtsFlow {
  id: number
  amountUSD: number
  date: string
  status: string
  sourceObjects: RawFtsFlowObject[]
  destinationObjects: RawFtsFlowObject[]
}

interface RawFtsPlan {
  id: number
  planVersion: { name: string }
  requirements?: { revisedRequirements: number }
  funding?: { totalFunding: number }
}

export function mapFlow(r: RawFtsFlow): FtsFlow {
  return {
    id:             r.id,
    amountUsd:      r.amountUSD ?? 0,
    date:           r.date ?? '',
    sourceOrg:      r.sourceObjects?.[0]?.name ?? 'Unknown',
    sourceType:     r.sourceObjects?.[0]?.type ?? 'organization',
    destinationOrg: r.destinationObjects?.[0]?.name ?? 'Venezuela',
    status:         r.status ?? 'paid',
  }
}

export function mapPlanFunding(plans: RawFtsPlan[]): FtsPlanFunding[] {
  return plans.map(p => {
    const req     = p.requirements?.revisedRequirements ?? 0
    const funded  = p.funding?.totalFunding ?? 0
    const coverage = req > 0 ? (funded / req) * 100 : 0
    return {
      planId:          p.id,
      planName:        p.planVersion?.name ?? `Plan ${p.id}`,
      requirementsUsd: req,
      fundingUsd:      funded,
      coveragePct:     Math.min(100, coverage),
    }
  })
}

export function topDonors(flows: FtsFlow[], n: number): { org: string; total: number }[] {
  const map = new Map<string, number>()
  for (const f of flows) {
    if (f.amountUsd <= 0) continue
    map.set(f.sourceOrg, (map.get(f.sourceOrg) ?? 0) + f.amountUsd)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([org, total]) => ({ org, total }))
}

// Schematic donor positions arranged in a ring around Venezuela
// Ordered: USA, EU/ECHO, UK, Canada, Germany, Spain, Norway, Japan, Netherlands, Australia
export const DONOR_RING_POSITIONS: Record<string, { lat: number; lng: number }> = {
  default: { lat: 10.0, lng: -66.6 },
  'United States': { lat: 30.0, lng: -95.0 },
  'European Commission': { lat: 50.8, lng: 4.3 },
  'United Kingdom': { lat: 51.5, lng: -0.1 },
  'Canada': { lat: 45.4, lng: -75.7 },
  'Germany': { lat: 52.5, lng: 13.4 },
  'Spain': { lat: 40.4, lng: -3.7 },
  'Norway': { lat: 59.9, lng: 10.7 },
  'Japan': { lat: 35.7, lng: 139.7 },
  'Netherlands': { lat: 52.4, lng: 4.9 },
  'Australia': { lat: -35.3, lng: 149.1 },
  'CERF': { lat: 46.2, lng: 6.1 },
  'Switzerland': { lat: 46.9, lng: 7.4 },
}

export function getDonorPosition(org: string): { lat: number; lng: number } {
  // Partial match
  for (const [key, pos] of Object.entries(DONOR_RING_POSITIONS)) {
    if (org.toLowerCase().includes(key.toLowerCase())) return pos
  }
  return DONOR_RING_POSITIONS.default
}

export const FTS_BASE = 'https://api.hpc.tools/v1/public'
