// Top-view SVG aircraft silhouettes per EmitterCategory
// All viewBox="0 0 80 80", aircraft pointing UP (nose at top)

import type { EmitterCategory } from '@/lib/opensky'

interface SilhouetteProps {
  size?: number
  color?: string
}

// ── Commercial jet: swept wing, 2 underwing engines ───────────────────────
function JetLarge({ size = 64, color = 'currentColor' }: SilhouetteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill={color}>
      {/* Fuselage */}
      <ellipse cx="40" cy="40" rx="5" ry="34" />
      {/* Nose cone */}
      <ellipse cx="40" cy="9" rx="3.5" ry="5" />
      {/* Swept wings */}
      <polygon points="40,30 4,58 7,61 40,38 73,61 76,58" />
      {/* Engine nacelles */}
      <ellipse cx="15" cy="57" rx="4" ry="6" />
      <ellipse cx="65" cy="57" rx="4" ry="6" />
      {/* Horizontal stabilizers */}
      <polygon points="40,70 22,76 22,73 40,68 58,73 58,76" />
    </svg>
  )
}

// ── Wide-body: 4 engines ──────────────────────────────────────────────────
function JetWidebody({ size = 64, color = 'currentColor' }: SilhouetteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill={color}>
      {/* Fuselage — wider */}
      <ellipse cx="40" cy="40" rx="8" ry="33" />
      <ellipse cx="40" cy="9" rx="5" ry="5" />
      {/* Swept wings */}
      <polygon points="40,28 2,58 5,62 40,36 75,62 78,58" />
      {/* 4 engine nacelles */}
      <ellipse cx="12" cy="55" rx="4" ry="6" />
      <ellipse cx="24" cy="59" rx="3.5" ry="5.5" />
      <ellipse cx="56" cy="59" rx="3.5" ry="5.5" />
      <ellipse cx="68" cy="55" rx="4" ry="6" />
      {/* Stabilizers */}
      <polygon points="40,69 20,76 20,73 40,67 60,73 60,76" />
    </svg>
  )
}

// ── Small prop / turboprop: straight wings, front engine ──────────────────
function PropSmall({ size = 64, color = 'currentColor' }: SilhouetteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill={color}>
      {/* Propeller disk */}
      <ellipse cx="40" cy="7" rx="16" ry="2.5" opacity={0.7} />
      {/* Fuselage */}
      <ellipse cx="40" cy="40" rx="4" ry="32" />
      {/* Straight wings */}
      <rect x="4" y="38" width="72" height="6" rx="2" />
      {/* Stabilizers */}
      <rect x="22" y="68" width="36" height="5" rx="1.5" />
    </svg>
  )
}

// ── Helicopter: rotor disc + narrow body ──────────────────────────────────
function Rotorcraft({ size = 64, color = 'currentColor' }: SilhouetteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill={color}>
      {/* Main rotor disc */}
      <circle cx="40" cy="38" r="28" fill="none" stroke={color} strokeWidth="2.5" />
      {/* Main rotor blades cross */}
      <line x1="40" y1="10" x2="40" y2="66" stroke={color} strokeWidth="2" />
      <line x1="12" y1="38" x2="68" y2="38" stroke={color} strokeWidth="2" />
      {/* Fuselage */}
      <ellipse cx="40" cy="44" rx="5" ry="16" />
      {/* Tail boom */}
      <rect x="38" y="58" width="4" height="14" rx="2" />
      {/* Tail rotor */}
      <line x1="32" y1="71" x2="48" y2="71" stroke={color} strokeWidth="2" />
    </svg>
  )
}

// ── UAV / drone: flying wing delta ────────────────────────────────────────
function Uav({ size = 64, color = 'currentColor' }: SilhouetteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill={color}>
      {/* Flying wing delta */}
      <polygon points="40,10 75,68 68,68 40,48 12,68 5,68" />
      {/* Body spine */}
      <ellipse cx="40" cy="42" rx="3" ry="20" />
      {/* Winglet tips */}
      <polygon points="68,68 72,60 76,70" />
      <polygon points="12,68 8,60 4,70" />
    </svg>
  )
}

// ── Glider: very long narrow straight wings ───────────────────────────────
function Glider({ size = 64, color = 'currentColor' }: SilhouetteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill={color}>
      {/* Very long wings */}
      <rect x="2" y="37" width="76" height="4" rx="2" />
      {/* Slender fuselage */}
      <ellipse cx="40" cy="42" rx="2.5" ry="30" />
      {/* Small stabilizers */}
      <rect x="30" y="68" width="20" height="3" rx="1" />
    </svg>
  )
}

// ── Fighter / high-performance: delta + single engine ─────────────────────
function Fighter({ size = 64, color = 'currentColor' }: SilhouetteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill={color}>
      {/* Delta wing */}
      <polygon points="40,8 70,72 10,72" />
      {/* Fuselage centreline */}
      <ellipse cx="40" cy="45" rx="3.5" ry="30" />
      {/* Engine exhaust */}
      <ellipse cx="40" cy="73" rx="5" ry="4" opacity={0.6} />
      {/* Canards (small front fins) */}
      <polygon points="40,22 50,32 42,32" />
      <polygon points="40,22 30,32 38,32" />
    </svg>
  )
}

// ── Generic (NO_INFO / UNKNOWN) ───────────────────────────────────────────
function Generic({ size = 64, color = 'currentColor' }: SilhouetteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill={color}>
      <polygon points="40,5 55,65 40,55 25,65" />
    </svg>
  )
}

// ── Public API ────────────────────────────────────────────────────────────

export function AircraftSilhouette({ category, size = 64, color = 'currentColor' }: {
  category: EmitterCategory | string
  size?: number
  color?: string
}) {
  const props = { size, color }
  switch (category) {
    case 'HEAVY':       return <JetWidebody {...props} />
    case 'HIGH_VORTEX': return <JetWidebody {...props} />
    case 'LARGE':       return <JetLarge    {...props} />
    case 'SMALL':       return <PropSmall   {...props} />
    case 'LIGHT':       return <PropSmall   {...props} />
    case 'HIGH_PERF':   return <Fighter     {...props} />
    case 'ROTORCRAFT':  return <Rotorcraft  {...props} />
    case 'UAV':         return <Uav         {...props} />
    case 'GLIDER':      return <Glider      {...props} />
    case 'LIGHTER_AIR': return <Glider      {...props} />
    default:            return <Generic     {...props} />
  }
}

/** Human-readable label for each category */
export function categoryLabel(cat: EmitterCategory | string): string {
  const MAP: Record<string, string> = {
    LIGHT:            'Avión Ligero (Pistón)',
    SMALL:            'Avión Pequeño / Turbohélice',
    LARGE:            'Jet Comercial (Narrobody)',
    HIGH_VORTEX:      'Jet Mediano — Estela Alta',
    HEAVY:            'Jet Ancho (Wide-body)',
    HIGH_PERF:        'Alta Performance / Militar',
    ROTORCRAFT:       'Helicóptero',
    GLIDER:           'Planeador',
    LIGHTER_AIR:      'Aeróstato',
    PARACHUTE:        'Paracaídas',
    ULTRALIGHT:       'Ultraligero',
    UAV:              'Drone / UAV',
    SPACE:            'Vehiculo Espacial',
    EMERGENCY_VEHICLE:'Vehículo de Emergencia',
    SERVICE_VEHICLE:  'Vehículo de Servicio',
    NO_INFO:          'Categoría Desconocida',
    UNKNOWN:          'Desconocido',
  }
  return MAP[cat] ?? cat
}
