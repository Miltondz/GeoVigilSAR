'use client'

import { useState } from 'react'
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
}

const EVENT_ID = 'VEN-2406'

export default function DashboardPage({ params }: { params: { locale: string } }) {
  const [activeLayers, setActiveLayers] = useState(DEFAULT_LAYERS)
  const [timelineValue, setTimelineValue] = useState(75)

  const handleLayerChange = (id: string, visible: boolean) => {
    setActiveLayers(prev => ({ ...prev, [id]: visible }))
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: 'var(--color-bg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <DashboardHeader
        eventId={EVENT_ID}
        locale={params.locale}
        activeLayers={activeLayers}
        onLayersChange={handleLayerChange}
      />

      {/* Main content: 3 columns */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* Left panel */}
        <StatsPanel
          eventId={EVENT_ID}
          stats={MOCK_STATS}
          mainShocks={MOCK_MAIN_SHOCKS}
          location="Veroes, Yaracuy"
          faultSystem="Falla Boconó-Morón"
          dataStream={MOCK_DATA_STREAM}
        />

        {/* Map area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <GeoVigilMap activeLayers={activeLayers} eventId={EVENT_ID} />
        </div>

        {/* Right panel */}
        <AIPanel eventId={EVENT_ID} isConnected={false} />
      </div>

      {/* Footer: timeline slider */}
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
