export interface UsaidDeclaration {
  id: string
  country: string
  disasterType: string
  declarationDate: string
  fiscalYear: number
  status: 'active' | 'closed'
  fundingUsd: number | null
  lat: number | null
  lng: number | null
  description: string
}

// Venezuela centroid fallback when no geocoordinates present
export function venezuelaCentroid(): { lat: number; lng: number } {
  return { lat: 8.0, lng: -66.6 }
}

// Map a raw Socrata row (all strings) to UsaidDeclaration
// Field names are defensive because Socrata datasets change column names
export function mapDeclaration(r: Record<string, string | undefined>): UsaidDeclaration {
  const id      = r['id']           ?? r['declaration_id'] ?? String(Math.random())
  const country = r['country_name'] ?? r['country']        ?? 'Venezuela'
  const dtype   = r['disaster_type']?? r['type']           ?? 'Earthquake'
  const date    = r['declaration_date'] ?? r['date']        ?? ''
  const fy      = parseInt(r['fiscal_year'] ?? r['fy'] ?? '0') || new Date().getFullYear()
  const status  = (r['status'] ?? '').toLowerCase().includes('active') ? 'active' : 'closed'
  const funding = parseFloat(r['total_funding_usd'] ?? r['funding_usd'] ?? r['amount'] ?? '')
  const lat     = parseFloat(r['latitude'] ?? r['lat'] ?? '')
  const lng     = parseFloat(r['longitude'] ?? r['lon'] ?? r['lng'] ?? '')
  const desc    = r['description'] ?? r['title'] ?? r['disaster_name'] ?? dtype

  return {
    id,
    country,
    disasterType: dtype,
    declarationDate: date,
    fiscalYear: fy,
    status,
    fundingUsd: isNaN(funding) ? null : funding,
    lat: isNaN(lat) ? null : lat,
    lng: isNaN(lng) ? null : lng,
    description: desc,
  }
}

// Discover USAID Socrata dataset ID at runtime
export const SOCRATA_BASE = 'https://data.usaid.gov'
