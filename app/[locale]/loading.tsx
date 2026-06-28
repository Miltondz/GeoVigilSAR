export default function Loading() {
  const sources = [
    { label: 'USGS Seismic Feed',      status: 'CONECTANDO', color: 'var(--color-amber)' },
    { label: 'GDELT News Stream',       status: 'CONECTANDO', color: 'var(--color-cyan)'  },
    { label: 'Copernicus EMS',          status: 'CONECTANDO', color: 'var(--color-cyan)'  },
    { label: 'OpenSky Air Traffic',     status: 'CONECTANDO', color: 'var(--color-cyan)'  },
    { label: 'ReliefWeb Humanitarian',  status: 'CONECTANDO', color: 'var(--color-green)' },
    { label: 'MapLibre / Cesium GL',    status: 'INIT',       color: 'var(--color-green)' },
  ]

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: 'var(--color-bg)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      overflow: 'hidden',
      fontFamily: 'var(--font-hud)',
    }}>

      {/* ── Left: branding + event ─────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem 4rem',
        borderRight: '1px solid var(--color-slate)',
        position: 'relative',
      }}>
        {/* Corner decoration */}
        <div style={{ position: 'absolute', top: 16, left: 16, width: 20, height: 20, borderTop: '2px solid var(--color-slate)', borderLeft: '2px solid var(--color-slate)' }} />
        <div style={{ position: 'absolute', bottom: 16, right: 16, width: 20, height: 20, borderBottom: '2px solid var(--color-slate)', borderRight: '2px solid var(--color-slate)' }} />

        <div style={{ fontSize: '0.6875rem', color: 'var(--color-muted)', letterSpacing: '0.3em', marginBottom: '1rem' }}>
          SISTEMA DE INTELIGENCIA SAR
        </div>

        <div style={{
          fontFamily: 'var(--font-headline)',
          fontSize: '2.5rem',
          fontWeight: 700,
          color: 'var(--color-green)',
          letterSpacing: '0.12em',
          lineHeight: 1.1,
          marginBottom: '0.5rem',
        }}>
          GEOVIGIL
          <span style={{ color: 'var(--color-cyan)', marginLeft: '0.5rem' }}>SAR</span>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', letterSpacing: '0.15em', marginBottom: '2.5rem' }}>
          SITUATIONAL AWARENESS PLATFORM
        </div>

        {/* Event info */}
        <div style={{
          borderLeft: '3px solid var(--color-red)',
          paddingLeft: '1rem',
          marginBottom: '2rem',
        }}>
          <div style={{ fontSize: '0.625rem', color: 'var(--color-muted)', letterSpacing: '0.15em', marginBottom: '0.375rem' }}>
            EVENTO ACTIVO
          </div>
          <div style={{ fontSize: '1.25rem', color: 'var(--color-red)', fontWeight: 700, marginBottom: '0.25rem' }}>
            M7.5 + M7.2 · Venezuela
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginBottom: '0.25rem' }}>
            24 junio 2026 · Yaracuy · Falla Boconó-Morón-El Pilar
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--color-muted)' }}>
            10.4°N · 68.7°W · Prof. 15 km
          </div>
        </div>

        {/* Loading bar */}
        <div>
          <div style={{ fontSize: '0.5625rem', color: 'var(--color-muted)', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>
            INICIALIZANDO SISTEMA...
          </div>
          <div style={{
            width: '100%',
            height: 2,
            backgroundColor: 'var(--color-slate)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              backgroundColor: 'var(--color-green)',
              animation: 'loading-scan 1.8s ease-in-out infinite',
              boxShadow: '0 0 8px var(--color-green)',
            }} />
          </div>
        </div>

        <style>{`
          @keyframes loading-scan {
            0%   { width: 0%; margin-left: 0%; }
            50%  { width: 60%; margin-left: 20%; }
            100% { width: 0%; margin-left: 100%; }
          }
          @keyframes blink-dot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.2; }
          }
        `}</style>
      </div>

      {/* ── Right: data source status ──────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem 4rem',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 16, right: 16, width: 20, height: 20, borderTop: '2px solid var(--color-slate)', borderRight: '2px solid var(--color-slate)' }} />
        <div style={{ position: 'absolute', bottom: 16, left: 16, width: 20, height: 20, borderBottom: '2px solid var(--color-slate)', borderLeft: '2px solid var(--color-slate)' }} />

        <div style={{ fontSize: '0.6875rem', color: 'var(--color-muted)', letterSpacing: '0.25em', marginBottom: '1.5rem' }}>
          FUENTES DE DATOS
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {sources.map((src, i) => (
            <div key={src.label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.625rem 0.875rem',
              border: '1px solid var(--color-slate)',
              backgroundColor: 'var(--color-panel)',
            }}>
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: src.color,
                boxShadow: `0 0 6px ${src.color}`,
                animation: `blink-dot ${1.2 + i * 0.3}s ease-in-out infinite`,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text)', flex: 1, letterSpacing: '0.05em' }}>
                {src.label}
              </span>
              <span style={{ fontSize: '0.5625rem', color: src.color, letterSpacing: '0.15em' }}>
                {src.status}
              </span>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '2rem',
          fontSize: '0.5625rem',
          color: 'var(--color-muted)',
          letterSpacing: '0.1em',
          lineHeight: 1.8,
        }}>
          <div>CLASIFICACIÓN: USO ACADÉMICO / PORTFOLIO</div>
          <div>DATOS: OPEN-SOURCE · LICENCIAS PÚBLICAS</div>
          <div style={{ color: 'rgba(96,112,128,0.5)', marginTop: '0.25rem' }}>
            GEOVIGIL SAR © 2026 · INFRAESTRUCTURA 100% FREE TIER
          </div>
        </div>
      </div>
    </div>
  )
}
