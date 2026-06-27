import type { Map as MapLibreMap } from 'maplibre-gl'

// MapLibre sets _removed = true after map.remove(). Calling any method after
// removal throws — guard every cleanup with this check.
export function isMapAlive(map: MapLibreMap): boolean {
  return !(map as unknown as { _removed: boolean })._removed
}
