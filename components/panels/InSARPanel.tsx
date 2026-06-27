'use client'

import { useState, useEffect, useRef } from 'react'
import type { AsfGranule, HyP3Job } from '@/lib/hyp3'
import type { InSARJobStatus } from '@/components/map/layers/InSARLayer'

// ─── API response shapes (client-side mirror) ─────────────────────────────────
interface StatusResponse {
  jobs: HyP3Job[]
  hasSucceeded: boolean
  latestBrowseUrl: string | null
}

interface GranulesResponse {
  preGranules: AsfGranule[]
  postGranules: AsfGranule[]
}

interface PostResponse {
  job: HyP3Job | null
  error?: string
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface InSARPanelProps {
  visible: boolean
  onClose: () => void
  eventId: string
  onJobReady: (browseUrl: string, bbox: [number, number, number, number]) => void
}

// Venezuela default bbox for the interferogram overlay
const VEN_BBOX: [number, number, number, number] = [-74, 0, -59, 13]

function jobStatusFromApi(jobs: HyP3Job[]): InSARJobStatus {
  if (jobs.length === 0) return 'none'
  const latest = jobs[0]
  if (latest.status === 'SUCCEEDED') return 'ready'
  if (latest.status === 'RUNNING') return 'running'
  if (latest.status === 'PENDING') return 'pending'
  return 'failed'
}

function formatGranuleLabel(g: AsfGranule): string {
  const date = g.startTime ? g.startTime.substring(0, 10) : '?'
  return `${date} — ${g.platform} — Path ${g.pathNumber}`
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function InSARPanel({
  visible,
  onClose,
  eventId,
  onJobReady,
}: InSARPanelProps) {
  const [jobs, setJobs] = useState<HyP3Job[]>([])
  const [jobStatus, setJobStatus] = useState<InSARJobStatus>('none')
  const [preGranules, setPreGranules] = useState<AsfGranule[]>([])
  const [postGranules, setPostGranules] = useState<AsfGranule[]>([])
  const [selectedPre, setSelectedPre] = useState('')
  const [selectedPost, setSelectedPost] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loadingGranules, setLoadingGranules] = useState(false)
  const [latestJobId, setLatestJobId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch current status on open
  useEffect(() => {
    if (!visible) return

    const fetchStatus = async () => {
      try {
        const res = await fetch(
          `/api/insar?eventId=${encodeURIComponent(eventId)}&action=status`
        )
        if (!res.ok) return
        const data = (await res.json()) as StatusResponse
        setJobs(data.jobs)
        const status = jobStatusFromApi(data.jobs)
        setJobStatus(status)
        if (status === 'ready' && data.latestBrowseUrl) {
          onJobReady(data.latestBrowseUrl, VEN_BBOX)
        }
        if (data.jobs.length > 0) {
          setLatestJobId(data.jobs[0].jobId)
        }
      } catch {
        // API unavailable — degrade silently
      }
    }

    void fetchStatus()
  }, [visible, eventId, onJobReady])

  // Fetch granule list when panel opens and no job exists
  useEffect(() => {
    if (!visible) return
    if (jobStatus !== 'none' && jobStatus !== 'failed') return
    if (preGranules.length > 0 || postGranules.length > 0) return

    const fetchGranules = async () => {
      setLoadingGranules(true)
      try {
        const res = await fetch(
          `/api/insar?eventId=${encodeURIComponent(eventId)}&action=granules`
        )
        if (!res.ok) return
        const data = (await res.json()) as GranulesResponse
        setPreGranules(data.preGranules)
        setPostGranules(data.postGranules)
        if (data.preGranules.length > 0)
          setSelectedPre(data.preGranules[0].granuleName)
        if (data.postGranules.length > 0)
          setSelectedPost(data.postGranules[0].granuleName)
      } catch {
        // ASF unavailable — show empty selects
      } finally {
        setLoadingGranules(false)
      }
    }

    void fetchGranules()
  }, [visible, eventId, jobStatus, preGranules.length, postGranules.length])

  // Poll for job completion when pending/running
  useEffect(() => {
    const isActive = jobStatus === 'pending' || jobStatus === 'running'
    if (!isActive || !visible) {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/insar?eventId=${encodeURIComponent(eventId)}&action=status`
        )
        if (!res.ok) return
        const data = (await res.json()) as StatusResponse
        setJobs(data.jobs)
        const status = jobStatusFromApi(data.jobs)
        setJobStatus(status)
        if (status === 'ready' && data.latestBrowseUrl) {
          onJobReady(data.latestBrowseUrl, VEN_BBOX)
        }
      } catch {
        // keep polling
      }
    }

    pollRef.current = setInterval(() => { void poll() }, 30_000)
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [jobStatus, visible, eventId, onJobReady])

  const handleSubmit = async () => {
    if (!selectedPre || !selectedPost) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/insar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          preGranule: selectedPre,
          postGranule: selectedPost,
        }),
      })
      const data = (await res.json()) as PostResponse
      if (data.error) {
        setSubmitError(data.error)
      } else if (data.job) {
        setJobs([data.job])
        setLatestJobId(data.job.jobId)
        setJobStatus(data.job.status === 'PENDING' ? 'pending' : 'running')
      }
    } catch {
      setSubmitError('submit_failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!visible) return null

  const statusColor =
    jobStatus === 'ready'
      ? 'var(--color-green)'
      : jobStatus === 'failed'
      ? 'var(--color-red)'
      : 'var(--color-amber)'

  const statusLabel: Record<InSARJobStatus, string> = {
    none: '—',
    pending: 'EN COLA...',
    running: 'PROCESANDO...',
    ready: 'LISTO',
    failed: 'ERROR DE PROCESAMIENTO',
  }

  const errorLabel: Record<string, string> = {
    no_credentials: 'Configura EARTHDATA_USERNAME en .env.local',
    submit_failed: 'Error al enviar job. Intenta de nuevo.',
    invalid_body: 'Selecciona granulos válidos.',
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '4rem',
        right: '1rem',
        width: 300,
        backgroundColor: 'var(--color-panel)',
        border: '1px solid var(--color-slate)',
        zIndex: 50,
        fontFamily: 'var(--font-hud)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 0.75rem',
          borderBottom: '1px solid var(--color-slate)',
        }}
      >
        <span
          style={{
            fontSize: '0.625rem',
            color: 'var(--color-cyan)',
            letterSpacing: '0.15em',
          }}
        >
          INTERFEROMETRÍA SAR
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-muted)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            padding: 0,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '0.75rem' }}>
        {/* Status row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}
        >
          <span style={{ fontSize: '0.5rem', color: 'var(--color-muted)', letterSpacing: '0.1em' }}>
            ESTADO
          </span>
          <span style={{ fontSize: '0.5rem', color: statusColor, letterSpacing: '0.1em' }}>
            {statusLabel[jobStatus]}
          </span>
        </div>

        {latestJobId && (
          <div
            style={{
              fontSize: '0.45rem',
              color: 'var(--color-muted)',
              marginBottom: '0.5rem',
              letterSpacing: '0.08em',
            }}
          >
            JOB: {latestJobId}
          </div>
        )}

        {(jobStatus === 'pending' || jobStatus === 'running') && (
          <div
            style={{
              fontSize: '0.5rem',
              color: 'var(--color-amber)',
              marginBottom: '0.75rem',
              letterSpacing: '0.08em',
            }}
          >
            Tiempo estimado: 30-90 min
          </div>
        )}

        {/* Granule selection form — show when no active/succeeded job */}
        {(jobStatus === 'none' || jobStatus === 'failed') && (
          <>
            {loadingGranules ? (
              <div
                style={{
                  fontSize: '0.5rem',
                  color: 'var(--color-muted)',
                  marginBottom: '0.75rem',
                }}
              >
                Buscando granulos SLC...
              </div>
            ) : (
              <>
                {/* PRE-EVENT select */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div
                    style={{
                      fontSize: '0.5rem',
                      color: 'var(--color-muted)',
                      letterSpacing: '0.1em',
                      marginBottom: '0.25rem',
                    }}
                  >
                    ESCENA PRE-EVENTO
                  </div>
                  <select
                    value={selectedPre}
                    onChange={e => setSelectedPre(e.target.value)}
                    disabled={preGranules.length === 0}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-slate)',
                      fontFamily: 'var(--font-hud)',
                      fontSize: '0.5rem',
                      padding: '0.25rem',
                    }}
                  >
                    {preGranules.length === 0 ? (
                      <option value="">Sin granulos disponibles</option>
                    ) : (
                      preGranules.map(g => (
                        <option key={g.granuleName} value={g.granuleName}>
                          {formatGranuleLabel(g)}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* POST-EVENT select */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div
                    style={{
                      fontSize: '0.5rem',
                      color: 'var(--color-muted)',
                      letterSpacing: '0.1em',
                      marginBottom: '0.25rem',
                    }}
                  >
                    ESCENA POST-EVENTO
                  </div>
                  <select
                    value={selectedPost}
                    onChange={e => setSelectedPost(e.target.value)}
                    disabled={postGranules.length === 0}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-slate)',
                      fontFamily: 'var(--font-hud)',
                      fontSize: '0.5rem',
                      padding: '0.25rem',
                    }}
                  >
                    {postGranules.length === 0 ? (
                      <option value="">Sin granulos disponibles</option>
                    ) : (
                      postGranules.map(g => (
                        <option key={g.granuleName} value={g.granuleName}>
                          {formatGranuleLabel(g)}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {submitError && (
                  <div
                    style={{
                      fontSize: '0.5rem',
                      color: 'var(--color-red)',
                      marginBottom: '0.5rem',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {errorLabel[submitError] ?? submitError}
                  </div>
                )}

                <button
                  onClick={() => { void handleSubmit() }}
                  disabled={submitting || !selectedPre || !selectedPost}
                  style={{
                    width: '100%',
                    backgroundColor: submitting ? 'var(--color-slate)' : 'transparent',
                    border: `1px solid ${submitting ? 'var(--color-slate)' : 'var(--color-cyan)'}`,
                    color: submitting ? 'var(--color-muted)' : 'var(--color-cyan)',
                    fontFamily: 'var(--font-hud)',
                    fontSize: '0.625rem',
                    letterSpacing: '0.15em',
                    padding: '0.375rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  {submitting ? 'ENVIANDO...' : 'PROCESAR INSAR'}
                </button>
              </>
            )}
          </>
        )}

        {/* Succeeded job info */}
        {jobStatus === 'ready' && jobs.length > 0 && (
          <div
            style={{
              fontSize: '0.5rem',
              color: 'var(--color-green)',
              letterSpacing: '0.08em',
            }}
          >
            Interferograma disponible en capa InSAR.
          </div>
        )}
      </div>
    </div>
  )
}
