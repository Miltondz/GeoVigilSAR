// HOT OSM Tasking Manager — humanitarian mapping projects
// API v8 requires authentication (403 without token).
// Manual reference: https://tasks.hotosm.org

export interface HotProject {
  id: number
  name: string
  status: string
  percentMapped: number
  percentValidated: number
  created: string
  lastUpdated: string
  centroid: [number, number]
}

export async function fetchHotProjects(_params: {
  search?: string
  bbox?: [number, number, number, number]
}): Promise<HotProject[]> {
  return []
}
