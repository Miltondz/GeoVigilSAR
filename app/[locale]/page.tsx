'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import DashboardHeader from '@/components/DashboardHeader'
import StatsPanel from '@/components/panels/StatsPanel'
import AIPanel from '@/components/panels/AIPanel'
import GeoVigilMap from '@/components/map/GeoVigilMap'
import TimelineSlider from '@/components/map/controls/TimelineSlider'
import HospitalStatusPanel from '@/components/panels/HospitalStatusPanel'
import SituationReportModal from '@/components/panels/SituationReportModal'
import InSARPanel from '@/components/panels/InSARPanel'
import DataSourcesPanel from '@/components/panels/DataSourcesPanel'
import SystemHealthModal from '@/components/ui/SystemHealthModal'
import EMSR884Panel from '@/components/panels/EMSR884Panel'
import { getEvent } from '@/lib/events/index'

const DEFAULT_LAYERS: Record<string, boolean> = {
  epicenters:      true,
  aftershocks:     true,
  shakemap:        true,
  faults:          false,
  seismicHistory:  false,
  sarChange:       true,
  opticalPre:      false,
  opticalPost:     false,
  sarLband:        false,
  ariaDPM:         false,
  firms:           false,
  satellite:       false,
  damagePoints:    true,
  hospitals:       false,
  shelters:        false,
  evacRoutes:      false,
  noAccess:        false,
  buildings:       true,
  population:      false,
  geoNews:         false,
  vulnerability:   false,
  airTraffic:      false,
  satellites:      false,
  insar:           false,
  emscSeismic:     false,
  emsr884:         false,
  emsr884Products: false,
}

export default function DashboardPage({ params }: { params: { locale: string } }) {
  const [activeLayers, setActiveLayers] = useState(DEFAULT_LAYERS)
  const [timelineValue, setTimelineValue] = useState(75)
  const [activeEventId, setActiveEventId] = useState('VEN-2406')
  const [hospitalPanelOpen, setHospitalPanelOpen] = useState(false)
  const [sitrepOpen, setSitrepOpen] = useState(false)
  const [insarPanelOpen, setInsarPanelOpen] = useState(false)
  const [dataSourcesPanelOpen, setDataSourcesPanelOpen] = useState(false)
  const [systemHealthOpen, setSystemHealthOpen] = useState(true)
  const [emsr884PanelOpen, setEmsr884PanelOpen] = useState(false)
  const [mapTarget, setMapTarget] = useState<{ lat: number; lng: number; name: string } | null>(null)
  const [liveEarthquakes, setLiveEarthquakes] = useState<{
    id: string; magnitude: number; depth: number; lat: number; lng: number
    time: number; place: string; classification: string
  }[]>([])
  const [humanStats, setHumanStats] = useState<{
    fatalities: number; injured: number
  } | null>(null)

  useEffect(() => {
    setHumanStats(null)
    fetch(`/api/humanitarian?eventId=${activeEventId}`)
      .then(r => r.json())
      .then((d: { stats?: { fatalities: number; injured: number } }) => {
        if (d.stats) setHumanStats(d.stats)
      })
      .catch(() => {})
  }, [activeEventId])

  const handleLayerChange = useCallback((id: string, visible: boolean) => {
    setActiveLayers(prev => ({ ...prev, [id]: visible }))
    if (id === 'insar'    && visible) setInsarPanelOpen(true)
    if (id === 'emsr884'  && visible) setEmsr884PanelOpen(true)
    if (id === 'emsr884Products' && visible) setEmsr884PanelOpen(true)
  }, [])

  const handleInsarJobReady = useCallback(
    (_browseUrl: string, _bbox: [number, number, number, number]) => {
      setActiveLayers(prev => ({ ...prev, insar: true }))
    },
    []
  )

  const handleEventChange = useCallback((eventId: string) => {
    setActiveEventId(eventId)
    setLiveEarthquakes([])  // clear until new data loads
  }, [])

  const handleZoomTo = useCallback((lat: number, lng: number, name: string) => {
    setMapTarget({ lat, lng, name })
  }, [])

  const event = getEvent(activeEventId)

  const timelinePhase = useMemo((): 'pre' | 'main' | 'post' => {
    if (timelineValue < 40) return 'pre'
    if (timelineValue <= 60) return 'main'
    return 'post'
  }, [timelineValue])

  const timelineEvents = event.timelineEvents ?? []

  const timelineMs = useMemo((): number => {
    if (timelineEvents.length < 2) return event.mainShockTime
    const startMs = new Date(timelineEvents[0].date + 'T00:00:00Z').getTime()
    const endMs   = new Date(timelineEvents[timelineEvents.length - 1].date + 'T00:00:00Z').getTime()
    return startMs + (timelineValue / 100) * (endMs - startMs)
  }, [timelineValue, event.mainShockTime, timelineEvents])

  const sortedEqs = useMemo(
    () => [...liveEarthquakes].sort((a, b) => b.time - a.time),
    [liveEarthquakes]
  )

  const stats = useMemo(() => {
    const lastEq = sortedEqs[0]
    return {
      fatalities:     humanStats?.fatalities ?? 0,
      injured:        humanStats?.injured ?? 0,
      aftershockCount: liveEarthquakes.length,
      lastAftershock: lastEq
        ? { magnitude: lastEq.magnitude, place: lastEq.place, hoursAgo: Math.round((Date.now() - lastEq.time) / 3_600_000) }
        : { magnitude: 0, place: '—', hoursAgo: 0 },
    }
  }, [humanStats, liveEarthquakes, sortedEqs])

  const mainShocks = useMemo(
    () => event.mainShocks ?? [{ magnitude: event.mainShockMagnitude, timeStr: new Date(event.mainShockTime).toISOString().slice(11, 16) + ' UTC', depth: 10 }],
    [event]
  )

  const dataStream = useMemo(
    () => sortedEqs.slice(0, 10).map(eq => ({
      time: new Date(eq.time).toISOString().slice(11, 16) + ' UTC',
      text: `M${eq.magnitude.toFixed(1)} detectado · ${eq.place}`,
      type: 'seismic' as const,
    })),
    [sortedEqs]
  )

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: 'var(--color-bg)',
      overflow: 'hidden',
    }}>
      <DashboardHeader
        eventId={activeEventId}
        locale={params.locale}
        activeLayers={activeLayers}
        onLayersChange={handleLayerChange}
        onEventChange={handleEventChange}
        onZoomTo={handleZoomTo}
        onSitrepOpen={() => setSitrepOpen(true)}
        onDataSourcesOpen={() => setDataSourcesPanelOpen(o => !o)}
        onSystemHealthOpen={() => setSystemHealthOpen(true)}
        earthquakes={liveEarthquakes}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <StatsPanel
          eventId={activeEventId}
          stats={stats}
          mainShocks={mainShocks}
          location={`${event.epicenter.lat.toFixed(2)}°N, ${Math.abs(event.epicenter.lng).toFixed(2)}°W`}
          faultSystem={event.faultSystem}
          dataStream={dataStream}
          onHospitalDetailOpen={() => setHospitalPanelOpen(true)}
        />

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <GeoVigilMap
            activeLayers={activeLayers}
            eventId={activeEventId}
            onEarthquakesLoaded={setLiveEarthquakes}
            timelinePhase={timelinePhase}
            timelineMs={timelineMs}
            flyTo={mapTarget}
            damagePoints={event.damageAssessment ?? []}
          />
        </div>

        <AIPanel eventId={activeEventId} isConnected={true} />
      </div>

      <div style={{
        height: 40,
        backgroundColor: 'var(--color-panel)',
        borderTop: '1px solid var(--color-slate)',
        flexShrink: 0,
      }}>
        <TimelineSlider
          events={timelineEvents}
          value={timelineValue}
          onChange={setTimelineValue}
        />
      </div>

      <HospitalStatusPanel
        visible={hospitalPanelOpen}
        onClose={() => setHospitalPanelOpen(false)}
        eventId={activeEventId}
      />

      <SituationReportModal
        isOpen={sitrepOpen}
        onClose={() => setSitrepOpen(false)}
        eventId={activeEventId}
        locale={params.locale}
      />

      <InSARPanel
        visible={insarPanelOpen}
        onClose={() => setInsarPanelOpen(false)}
        eventId={activeEventId}
        onJobReady={handleInsarJobReady}
      />

      <DataSourcesPanel
        visible={dataSourcesPanelOpen}
        onClose={() => setDataSourcesPanelOpen(false)}
        eventId={activeEventId}
      />

      {systemHealthOpen && (
        <SystemHealthModal
          onClose={() => setSystemHealthOpen(false)}
          autoClose={true}
        />
      )}

      <EMSR884Panel
        visible={emsr884PanelOpen}
        onClose={() => setEmsr884PanelOpen(false)}
      />
    </div>
  )
}
