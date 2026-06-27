'use client'

import { useState, useCallback } from 'react'
import DashboardHeader from '@/components/DashboardHeader'
import StatsPanel from '@/components/panels/StatsPanel'
import AIPanel from '@/components/panels/AIPanel'
import GeoVigilMap from '@/components/map/GeoVigilMap'
import TimelineSlider from '@/components/map/controls/TimelineSlider'
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
}

export default function DashboardPage({ params }: { params: { locale: string } }) {
  const [activeLayers, setActiveLayers] = useState(DEFAULT_LAYERS)
  const [timelineValue, setTimelineValue] = useState(75)
  const [activeEventId, setActiveEventId] = useState('VEN-2406')
  const [liveEarthquakes, setLiveEarthquakes] = useState<{
    id: string; magnitude: number; depth: number; lat: number; lng: number
    time: number; place: string; classification: string
  }[]>([])

  const handleLayerChange = useCallback((id: string, visible: boolean) => {
    setActiveLayers(prev => ({ ...prev, [id]: visible }))
  }, [])

  const handleEventChange = useCallback((eventId: string) => {
    setActiveEventId(eventId)
    setLiveEarthquakes([])  // clear until new data loads
  }, [])

  const event = getEvent(activeEventId)

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
        />

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <GeoVigilMap
            activeLayers={activeLayers}
            eventId={activeEventId}
            onEarthquakesLoaded={setLiveEarthquakes}
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
    </div>
  )
}
