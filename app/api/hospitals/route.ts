import { NextResponse } from 'next/server'
import { loadHospitals, type Hospital } from '@/lib/hospitals'

export interface HospitalWithDistance extends Hospital {
  distanceKm: number
}

// Haversine distance in km
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

// VEN-2406 epicenter
const EPICENTER = { lat: 10.4, lng: -68.7 }

export async function GET() {
  const hospitals = loadHospitals()

  const withDistance: HospitalWithDistance[] = hospitals
    .map(h => ({
      ...h,
      distanceKm: Math.round(haversineKm(h.lat, h.lng, EPICENTER.lat, EPICENTER.lng) * 10) / 10,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)

  return NextResponse.json(withDistance, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600',
    },
  })
}
