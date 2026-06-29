export type OsmKind = 'shelter' | 'school' | 'fuel' | 'police' | 'fire_station' | 'bridge' | 'hospital' | 'helipad'

export interface OsmFeature {
  id: number
  kind: OsmKind
  lat: number
  lng: number
  name: string | null
  tags: Record<string, string>
}

export interface OsmRoad {
  id: number
  ref: string | null
  highway: string
  coords: [number, number][] // [lng, lat]
}

interface RawOverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  geometry?: { lat: number; lon: number }[]
  tags?: Record<string, string>
}

interface RawOverpass {
  elements: RawOverpassElement[]
}

// bbox = "south,west,north,east"
export function buildInfraQuery(bbox: string): string {
  return `[out:json][timeout:25];
(
  node["amenity"="shelter"](${bbox});
  way["amenity"="shelter"](${bbox});
  node["amenity"="school"](${bbox});
  way["amenity"="school"](${bbox});
  node["amenity"="fuel"](${bbox});
  node["amenity"="police"](${bbox});
  node["amenity"="fire_station"](${bbox});
  node["amenity"="hospital"](${bbox});
  way["amenity"="hospital"](${bbox});
  node["aeroway"="helipad"](${bbox});
  way["bridge"="yes"](${bbox});
);
out center tags;`
}

export function buildRoadsQuery(bbox: string): string {
  return `[out:json][timeout:25];
way["highway"~"motorway|trunk|primary|secondary"](${bbox});
out geom tags;`
}

function classifyKind(tags: Record<string, string>): OsmKind | null {
  if (tags.amenity === 'shelter')      return 'shelter'
  if (tags.amenity === 'school')       return 'school'
  if (tags.amenity === 'fuel')         return 'fuel'
  if (tags.amenity === 'police')       return 'police'
  if (tags.amenity === 'fire_station') return 'fire_station'
  if (tags.amenity === 'hospital')     return 'hospital'
  if (tags.aeroway === 'helipad')      return 'helipad'
  if (tags.bridge === 'yes')           return 'bridge'
  return null
}

export function mapElements(raw: RawOverpass): OsmFeature[] {
  const features: OsmFeature[] = []
  for (const el of raw.elements) {
    const tags = el.tags ?? {}
    const kind = classifyKind(tags)
    if (!kind) continue
    // For ways, use center; for nodes, use lat/lon directly
    const lat = el.lat ?? el.center?.lat
    const lng = el.lon ?? el.center?.lon
    if (lat === undefined || lng === undefined) continue
    features.push({
      id:   el.id,
      kind,
      lat,
      lng,
      name: tags.name ?? null,
      tags,
    })
  }
  return features
}

export function mapRoads(raw: RawOverpass): OsmRoad[] {
  const roads: OsmRoad[] = []
  for (const el of raw.elements) {
    if (el.type !== 'way' || !el.geometry) continue
    roads.push({
      id:      el.id,
      ref:     el.tags?.ref ?? null,
      highway: el.tags?.highway ?? 'road',
      coords:  el.geometry.map(pt => [pt.lon, pt.lat] as [number, number]),
    })
  }
  return roads
}

// Clamp bbox span to protect rate limits (~3° max)
export function bboxToOverpass(minLng: number, minLat: number, maxLng: number, maxLat: number): string | null {
  if (maxLat - minLat > 3 || maxLng - minLng > 3) return null
  return `${minLat},${minLng},${maxLat},${maxLng}`
}
