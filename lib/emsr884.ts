// Copernicus EMS EMSR884 — types and VT layer extraction

export interface Emsr884LayerMeta {
  name: string
  type: 'cog' | 'json' | 'vt' | string
}

export interface Emsr884ProductVersion {
  uuid?: string
  number?: number
  /** W=Waiting, I=In production, F=Finished, N=Not produced */
  statusCode?: 'W' | 'I' | 'F' | 'N'
  reason?: string
  deliveryTime?: string
}

export interface Emsr884Image {
  uuid?: string
  new?: boolean
  sensorType?: 'optical' | 'sar'
  resolutionClass?: 'HR' | 'VHR2' | 'VHR1' | 'Aerial'
  sensorName?: string
  acquisitionTime?: string
  fileName?: string
}

export interface Emsr884Product {
  /** FEP=First Estimate, REF=Reference, DEL=Delineation, GRA=Grading */
  type: 'FEP' | 'REF' | 'DEL' | 'GRA' | string
  monitoring: boolean
  monitoringNumber?: number
  feasible: boolean
  activationCode?: string
  aoiName?: string
  aoiNumber?: string
  expectedDelivery?: string
  downloadPath?: string
  version?: Emsr884ProductVersion
  images?: Emsr884Image[]
  layers?: Emsr884LayerMeta[]
  stats?: Record<string, unknown>
}

export interface Emsr884AOI {
  number: number
  name: string
  extent?: string
  blpPath?: string
  activationCode?: string
  products?: Emsr884Product[]
}

export interface Emsr884Activation {
  code: string
  name: string
  reason?: string
  category?: string
  activator?: string
  eventTime?: string
  activationTime?: string
  continent?: string
  countries?: { name: string }[]
  aws_bucket?: string
  productsPath?: string
  closed?: boolean
  gdacsId?: string
  centroid?: string
  infobulletins?: string[]
  stats?: Record<string, unknown>
  aois?: Emsr884AOI[]
}

export interface VtProductLayer {
  id: string
  productType: string
  aoiName: string
  aoiNumber: string
  layerName: string
  /** XYZ tile URL pattern for MapLibre */
  tileUrl: string
  sldUrl: string
  downloadPath?: string
  versionStatus?: string
  images?: Emsr884Image[]
}

/** Extract all VT-type layers from an activation that are finished and feasible */
export function extractVtLayers(activation: Emsr884Activation): VtProductLayer[] {
  const bucket = activation.aws_bucket?.replace(/\/$/, '')
  if (!bucket) return []

  const out: VtProductLayer[] = []

  for (const aoi of activation.aois ?? []) {
    for (const product of aoi.products ?? []) {
      if (!product.feasible) continue
      if (product.version?.statusCode && product.version.statusCode !== 'F') continue

      for (const layer of product.layers ?? []) {
        if (layer.type !== 'vt') continue

        // Per OpenAPI spec: for vt type, `name` = folder path within bucket
        // Tile URL: {bucket}/{layer.name}/{z}/{x}/{y}.pbf
        const layerPath = layer.name.replace(/^\//, '')
        const tileUrl = `${bucket}/${layerPath}/{z}/{x}/{y}.pbf`
        const sldUrl  = `${bucket}/${layerPath}.sld`

        // source-layer in MVT = last segment of the path
        const segments = layerPath.split('/')
        const sourceLayer = segments[segments.length - 1] ?? layerPath

        out.push({
          id: `${aoi.number}_${product.type}_${sourceLayer}`,
          productType: product.type,
          aoiName: aoi.name,
          aoiNumber: String(aoi.number),
          layerName: sourceLayer,
          tileUrl,
          sldUrl,
          downloadPath: product.downloadPath,
          versionStatus: product.version?.statusCode,
          images: product.images,
        })
      }
    }
  }

  return out
}

export const PRODUCT_TYPE_LABEL: Record<string, string> = {
  FEP: 'First Estimate',
  REF: 'Reference',
  DEL: 'Delineation',
  GRA: 'Grading',
}

export const VERSION_STATUS_LABEL: Record<string, string> = {
  W: 'En espera de datos',
  I: 'En producción',
  F: 'Finalizado',
  N: 'No producido',
}

export const VERSION_STATUS_COLOR: Record<string, string> = {
  W: '#FFB800',
  I: '#00B4FF',
  F: '#00FF88',
  N: '#607080',
}

// EMS-98 damage grade colors — standard Copernicus palette
export const DAMAGE_COLORS: Record<string, string> = {
  Destroyed:             '#E0170B',
  'Heavily Damaged':     '#F5830C',
  'Moderately Damaged':  '#FFEB00',
  'Slightly Damaged':    '#AED9A3',
  'Not Affected':        '#1E9C3B',
  // Generic fallback by layer name pattern
  BUA_P:                 '#FF6600',
  OBJ_POLY:              '#FF4444',
  GRD_POLY:              '#FFB800',
}

export function layerFillColor(layerName: string): string {
  for (const [key, color] of Object.entries(DAMAGE_COLORS)) {
    if (layerName.toUpperCase().includes(key.toUpperCase())) return color
  }
  return '#00B4FF'
}
