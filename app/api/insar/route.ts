import { NextRequest, NextResponse } from 'next/server'
import {
  listJobsByName,
  searchSLCGranules,
  submitInSARJob,
} from '@/lib/hyp3'
import type { HyP3Job, AsfGranule } from '@/lib/hyp3'

// Venezuela 2026 event constants
const VEN_BBOX: [number, number, number, number] = [-74, 0, -59, 13]
const VEN_MAIN_SHOCK_MS = 1750806240000 // 2026-06-24T22:04:00Z

function jobNameForEvent(eventId: string): string {
  return `${eventId}-insar`
}

// ─── GET /api/insar ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const eventId = searchParams.get('eventId') ?? 'VEN-2406'
  const action = searchParams.get('action') ?? 'status'

  if (action === 'granules') {
    return handleGranules()
  }

  return handleStatus(eventId)
}

interface StatusResponse {
  jobs: HyP3Job[]
  hasSucceeded: boolean
  latestBrowseUrl: string | null
}

async function handleStatus(eventId: string): Promise<NextResponse<StatusResponse>> {
  const jobs = await listJobsByName(jobNameForEvent(eventId))
  const succeededJobs = jobs.filter(j => j.status === 'SUCCEEDED')
  const latestBrowseUrl = succeededJobs.length > 0
    ? (succeededJobs[0].browseUrl ?? null)
    : null

  return NextResponse.json(
    {
      jobs,
      hasSucceeded: succeededJobs.length > 0,
      latestBrowseUrl,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

interface GranulesResponse {
  preGranules: AsfGranule[]
  postGranules: AsfGranule[]
}

async function handleGranules(): Promise<NextResponse<GranulesResponse>> {
  const mainShockTime = new Date(VEN_MAIN_SHOCK_MS)
  const preStart = new Date(VEN_MAIN_SHOCK_MS - 30 * 24 * 60 * 60 * 1000).toISOString()
  const preEnd = mainShockTime.toISOString()
  const postStart = mainShockTime.toISOString()
  const postEnd = new Date(VEN_MAIN_SHOCK_MS + 7 * 24 * 60 * 60 * 1000).toISOString()

  const [preGranules, postGranules] = await Promise.all([
    searchSLCGranules({ bbox: VEN_BBOX, startDate: preStart, endDate: preEnd }),
    searchSLCGranules({ bbox: VEN_BBOX, startDate: postStart, endDate: postEnd }),
  ])

  return NextResponse.json(
    { preGranules, postGranules },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    }
  )
}

// ─── POST /api/insar ──────────────────────────────────────────────────────────
interface PostBody {
  eventId?: string
  preGranule: string
  postGranule: string
}

interface PostResponse {
  job: HyP3Job | null
  error?: string
}

function isPostBody(val: unknown): val is PostBody {
  if (typeof val !== 'object' || val === null) return false
  const v = val as Record<string, unknown>
  return typeof v.preGranule === 'string' && typeof v.postGranule === 'string'
}

export async function POST(req: NextRequest): Promise<NextResponse<PostResponse>> {
  try {
    const raw: unknown = await req.json()
    if (!isPostBody(raw)) {
      return NextResponse.json({ job: null, error: 'invalid_body' }, { status: 400 })
    }

    const { eventId = 'VEN-2406', preGranule, postGranule } = raw
    const job = await submitInSARJob({
      preGranule,
      postGranule,
      jobName: jobNameForEvent(eventId),
    })

    if (!job) {
      const hasCredentials =
        Boolean(process.env.EARTHDATA_USERNAME) && Boolean(process.env.EARTHDATA_PASSWORD)
      return NextResponse.json({
        job: null,
        error: hasCredentials ? 'submit_failed' : 'no_credentials',
      })
    }

    return NextResponse.json({ job })
  } catch {
    return NextResponse.json({ job: null, error: 'submit_failed' })
  }
}
