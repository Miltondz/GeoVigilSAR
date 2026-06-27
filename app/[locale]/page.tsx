'use client'

import { useState, useCallback, useMemo } from 'react'
import DashboardHeader from '@/components/DashboardHeader'
import StatsPanel from '@/components/panels/StatsPanel'
import AIPanel from '@/components/panels/AIPanel'
import GeoVigilMap from '@/components/map/GeoVigilMap'
import TimelineSlider from '@/components/map/controls/TimelineSlider'
import HospitalStatusPanel from '@/components/panels/HospitalStatusPanel'
import SituationReportModal from '@/components/panels/SituationReportModal'
import InSARPanel from '@/components/panels/InSARPanel'
import DataSourcesPanel from '@/components/panels/DataSourcesPanel'
import {
  MOCK_STATS,
  MOCK_MAIN_SHOCKS,
  MOCK_DATA_STREAM,
  MOCK_TIMELINE_EVENTS,
} from '@/lib/mock-data'
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
  damagePoints:    false,
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
}

export default function DashboardPage({ params }: { params: { locale: string } }) {
  const [activeLayers, setActiveLayers] = useState(DEFAULT_LAYERS)
  const [timelineValue, setTimelineValue] = useState(75)
  const [activeEventId, setActiveEventId] = useState('VEN-2406')
  const [hospitalPanelOpen, setHospitalPanelOpen] = useState(false)
  const [sitrepOpen, setSitrepOpen] = useState(false)
  const [insarPanelOpen, setInsarPanelOpen] = useState(false)
  const [dataSourcesPanelOpen, setDataSourcesPanelOpen] = useState(false)
  const [mapTarget, setMapTarget] = useState<{ lat: number; lng: number; name: string } | null>(null)
  const [liveEarthquakes, setLiveEarthquakes] = useState<{
    id: string; magnitude: number; depth: number; lat: number; lng: number
    time: number; place: string; classification: string
  }[]>([])

  const handleLayerChange = useCallback((id: string, visible: boolean) => {
    setActiveLayers(prev => ({ ...prev, [id]: visible }))
    if (id === 'insar' && visible) setInsarPanelOpen(true)
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

  const timelineMs = useMemo((): number => {
    const events = MOCK_TIMELINE_EVENTS
    if (events.length < 2) return event.mainShockTime
    const startMs = new Date(events[0].date + 'T00:00:00Z').getTime()
    const endMs   = new Date(events[events.length - 1].date + 'T00:00:00Z').getTime()
    return startMs + (timelineValue / 100) * (endMs - startMs)
  }, [timelineValue, event.mainShockTime])

  // Mock stats — replaced with live data once Convex or polling is wired
  const stats = activeEventId === 'VEN-2406'
    ? MOCK_STATS
    : { fatalities: 50766, injured: 107204, aftershockCount: 1500, lastAftershock: { magnitude: 3.2, place: 'Hatay', hoursAgo: 18 }, rescuedAlive: 8000, displaced: 3000000 }

  const mainShocks = activeEventId === 'VEN-2406'
    ? MOCK_MAIN_SHOCKS
    : [{ magnitude: 7.8, timeStr: '01:17 UTC 06.02.23', depth: 18 }, { magnitude: 7.7, timeStr: '10:24 UTC 06.02.23', depth: 10 }]

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
        earthquakes={liveEarthquakes}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <StatsPanel
          eventId={activeEventId}
          stats={stats}
          mainShocks={mainShocks}
          location={`${event.epicenter.lat.toFixed(2)}°N, ${Math.abs(event.epicenter.lng).toFixed(2)}°W`}
          faultSystem={event.faultSystem}
          dataStream={MOCK_DATA_STREAM}
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
          events={MOCK_TIMELINE_EVENTS}
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
    </div>
  )
}
