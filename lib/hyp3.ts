// ─── ASF HyP3 — InSAR interferogram client ────────────────────────────────────
// Server-side only. Never import from client components.

const URS_BASE = 'https://urs.earthdata.nasa.gov'
const HYP3_API = 'https://hyp3-api.asf.alaska.edu'
const ASF_SEARCH = 'https://api.daac.asf.alaska.gov/services/search/param'

// ─── Auth ─────────────────────────────────────────────────────────────────────
interface UrsToken {
  value: string
  expiresAt: number
}

let ursTokenCache: UrsToken | null = null

// URS token response shape
interface UrsTokenEntry {
  access_token: string
  token_type: string
  expiration_date: string // "MM/DD/YYYY"
}

function isUrsTokenEntry(val: unknown): val is UrsTokenEntry {
  if (typeof val !== 'object' || val === null) return false
  const v = val as Record<string, unknown>
  return typeof v.access_token === 'string' && typeof v.expiration_date === 'string'
}

export async function getUrsToken(): Promise<string | null> {
  // Prefer static bearer token from env (generated via URS web UI)
  const staticToken = process.env.EARTHDATA_TOKEN
  if (staticToken) return staticToken

  const username = process.env.EARTHDATA_USERNAME
  const password = process.env.EARTHDATA_PASSWORD
  if (!username || !password) return null

  if (ursTokenCache && ursTokenCache.expiresAt > Date.now()) {
    return ursTokenCache.value
  }

  try {
    const basic = Buffer.from(`${username}:${password}`).toString('base64')
    const res = await fetch(
      `${URS_BASE}/api/users/${encodeURIComponent(username)}/tokens`,
      {
        headers: { Authorization: `Basic ${basic}` },
        signal: AbortSignal.timeout(10_000),
      }
    )
    if (!res.ok) return null

    const raw: unknown = await res.json()
    if (!Array.isArray(raw) || raw.length === 0) return null

    const entry = raw[0]
    if (!isUrsTokenEntry(entry)) return null

    const parts = entry.expiration_date.split('/')
    if (parts.length !== 3) return null
    const [mm, dd, yyyy] = parts
    const expiresAt =
      new Date(`${yyyy}-${mm}-${dd}T23:59:59Z`).getTime() - 5 * 60 * 1000

    ursTokenCache = { value: entry.access_token, expiresAt }
    return entry.access_token
  } catch {
    return null
  }
}

// ─── ASF granule search ───────────────────────────────────────────────────────
export interface AsfGranule {
  granuleName: string
  platform: string
  startTime: string  // ISO
  pathNumber: number
  frameNumber: number
  centerLat: number
  centerLon: number
}

// jsonlite2 abbreviated field names
interface AsfRawResult {
  gn: string   // granuleName
  d: string    // platform
  st: string   // startTime ISO
  p: number    // pathNumber
  f: number    // frameNumber
}

interface AsfSearchResponse {
  results: AsfRawResult[]
}

function isAsfSearchResponse(val: unknown): val is AsfSearchResponse {
  if (typeof val !== 'object' || val === null) return false
  return Array.isArray((val as Record<string, unknown>).results)
}

function isAsfRawResult(val: unknown): val is AsfRawResult {
  if (typeof val !== 'object' || val === null) return false
  const v = val as Record<string, unknown>
  return typeof v.gn === 'string' && typeof v.d === 'string'
}

export async function searchSLCGranules(params: {
  bbox: [number, number, number, number]
  startDate: string
  endDate: string
}): Promise<AsfGranule[]> {
  const { bbox, startDate, endDate } = params
  const [west, south, east, north] = bbox

  const url = new URL(ASF_SEARCH)
  url.searchParams.set('platform', 'Sentinel-1C,Sentinel-1B,Sentinel-1A')
  url.searchParams.set('processingLevel', 'SLC')
  url.searchParams.set('beamMode', 'IW')
  url.searchParams.set('start', startDate.replace('Z', 'UTC'))
  url.searchParams.set('end', endDate.replace('Z', 'UTC'))
  url.searchParams.set('bbox', `${west},${south},${east},${north}`)
  url.searchParams.set('maxResults', '10')
  url.searchParams.set('output', 'jsonlite2')

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return []

    const raw: unknown = await res.json()
    if (!isAsfSearchResponse(raw)) return []

    return raw.results.filter(isAsfRawResult).map(r => ({
      granuleName: r.gn,
      platform: r.d,
      startTime: r.st ?? '',
      pathNumber: r.p ?? 0,
      frameNumber: r.f ?? 0,
      centerLat: 0,
      centerLon: 0,
    }))
  } catch {
    return []
  }
}

// ─── InSAR job ────────────────────────────────────────────────────────────────
export type HyP3Status = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

export interface HyP3File {
  filename: string
  url: string
  size: number
}

export interface HyP3Job {
  jobId: string
  status: HyP3Status
  name: string
  requestTime: string
  files: HyP3File[]
  browseUrl: string | null    // URL of *_browse.png or null
  browseExpiry: string | null // ISO expiry of signed URL (null for public URLs)
}

// Internal raw shapes from HyP3 v2 API
interface HyP3RawFile {
  filename: string
  url: string
  size: number
}

interface HyP3RawJob {
  job_id: string
  status_code: string
  name: string
  request_time: string
  files?: HyP3RawFile[]
}

interface HyP3JobsResponse {
  jobs: HyP3RawJob[]
}

function isHyP3Status(val: string): val is HyP3Status {
  return ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED'].includes(val)
}

function isHyP3RawFile(val: unknown): val is HyP3RawFile {
  if (typeof val !== 'object' || val === null) return false
  const v = val as Record<string, unknown>
  return typeof v.filename === 'string' && typeof v.url === 'string'
}

function isHyP3RawJob(val: unknown): val is HyP3RawJob {
  if (typeof val !== 'object' || val === null) return false
  const v = val as Record<string, unknown>
  return typeof v.job_id === 'string' && typeof v.status_code === 'string'
}

function isHyP3JobsResponse(val: unknown): val is HyP3JobsResponse {
  if (typeof val !== 'object' || val === null) return false
  const v = val as Record<string, unknown>
  return Array.isArray(v.jobs)
}

function parseJob(raw: unknown): HyP3Job {
  if (!isHyP3RawJob(raw)) {
    return {
      jobId: '',
      status: 'FAILED',
      name: '',
      requestTime: new Date().toISOString(),
      files: [],
      browseUrl: null,
      browseExpiry: null,
    }
  }

  const rawFiles = Array.isArray(raw.files) ? raw.files : []
  const files: HyP3File[] = rawFiles.filter(isHyP3RawFile).map(f => ({
    filename: f.filename,
    url: f.url,
    size: typeof f.size === 'number' ? f.size : 0,
  }))

  const browseFile = files.find(f => f.filename.endsWith('_browse.png'))
  const status = isHyP3Status(raw.status_code) ? raw.status_code : 'FAILED'

  return {
    jobId: raw.job_id,
    status,
    name: raw.name ?? '',
    requestTime: raw.request_time ?? new Date().toISOString(),
    files,
    browseUrl: browseFile?.url ?? null,
    browseExpiry: null,
  }
}

export async function submitInSARJob(params: {
  preGranule: string
  postGranule: string
  jobName?: string
}): Promise<HyP3Job | null> {
  const token = await getUrsToken()
  if (!token) return null

  const { preGranule, postGranule, jobName = 'VEN-2406-insar' } = params

  try {
    const res = await fetch(`${HYP3_API}/jobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobs: [
          {
            job_type: 'INSAR_GAMMA',
            name: jobName,
            job_parameters: {
              granules: [preGranule, postGranule],
              looks: '20x4',
              include_dem: false,
              include_inc_map: false,
              include_wrapped_phase: true,
              apply_water_mask: false,
            },
          },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return null

    const raw: unknown = await res.json()
    if (!isHyP3JobsResponse(raw) || raw.jobs.length === 0) return null

    return parseJob(raw.jobs[0])
  } catch {
    return null
  }
}

export async function getJobStatus(jobId: string): Promise<HyP3Job | null> {
  const token = await getUrsToken()
  if (!token) return null

  try {
    const res = await fetch(`${HYP3_API}/jobs/${encodeURIComponent(jobId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null

    const raw: unknown = await res.json()
    return parseJob(raw)
  } catch {
    return null
  }
}

export async function listJobsByName(name: string): Promise<HyP3Job[]> {
  const token = await getUrsToken()
  if (!token) return []

  try {
    const url = new URL(`${HYP3_API}/jobs`)
    url.searchParams.set('name', name)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []

    const raw: unknown = await res.json()
    if (!isHyP3JobsResponse(raw)) return []

    return raw.jobs
      .map(parseJob)
      .sort((a, b) => b.requestTime.localeCompare(a.requestTime))
  } catch {
    return []
  }
}
