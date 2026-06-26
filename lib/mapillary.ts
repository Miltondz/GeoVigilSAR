export interface MapillaryImage {
  id: string
  thumbUrl: string
  capturedAt: number
  lat: number
  lng: number
  creatorUsername?: string
}

export async function fetchMapillaryImages(
  lat: number,
  lng: number,
  radius = 100,
  limit = 5
): Promise<MapillaryImage[]> {
  const token = process.env.MAPILLARY_CLIENT_TOKEN
  if (!token) return []

  const params = new URLSearchParams({
    access_token: token,
    fields: 'id,thumb_256_url,captured_at,geometry',
    limit: limit.toString(),
    closeto: `${lng},${lat}`,
    radius: radius.toString(),
  })

  try {
    const res = await fetch(
      `https://graph.mapillary.com/images?${params.toString()}`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return []

    const data = await res.json()
    return (data.data ?? []).map((img: {
      id: string
      thumb_256_url: string
      captured_at: string
      geometry: { coordinates: [number, number] }
    }) => ({
      id: img.id,
      thumbUrl: img.thumb_256_url,
      capturedAt: new Date(img.captured_at).getTime(),
      lat: img.geometry.coordinates[1],
      lng: img.geometry.coordinates[0],
    }))
  } catch {
    return []
  }
}
