export interface BuoyStation {
  id: string
  name: string
  lat: number
  lng: number
  type: string
  owner: string
}

export interface BuoyObservation {
  id: string
  lat: number
  lng: number
  time: string
  windDir: number | null
  windSpeed: number | null
  gust: number | null
  waveHeight: number | null
  dominantPeriod: number | null
  meanWaveDir: number | null
  pressure: number | null
  airTemp: number | null
  seaTemp: number | null
  visibility: number | null
}

function num(s: string): number | null {
  if (!s || s === 'MM') return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

// Parse activestations.xml — server-side only (no DOMParser), regex over attrs
export function parseActiveStationsXml(xml: string): BuoyStation[] {
  const stations: BuoyStation[] = []
  const re = /<station\s([\s\S]*?)\/>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1]
    const get = (key: string) => {
      const r = new RegExp(`${key}="([^"]*)"`)
      return r.exec(attrs)?.[1] ?? ''
    }
    const lat = parseFloat(get('lat'))
    const lng = parseFloat(get('lon'))
    if (isNaN(lat) || isNaN(lng)) continue
    stations.push({
      id:    get('id'),
      name:  get('name'),
      lat,
      lng,
      type:  get('type'),
      owner: get('owner'),
    })
  }
  return stations
}

// Parse latest_obs.txt — fixed-column, header starts with #STN
// Columns: #STN YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE
export function parseLatestObs(txt: string, stations: Map<string, BuoyStation>): BuoyObservation[] {
  const lines = txt.split('\n').filter(l => !l.startsWith('#') && l.trim())
  const obs: BuoyObservation[] = []

  for (const line of lines) {
    const cols = line.trim().split(/\s+/)
    if (cols.length < 14) continue
    const id      = cols[0]
    const station = stations.get(id)
    if (!station) continue

    const year = parseInt(cols[1]) + (parseInt(cols[1]) < 50 ? 2000 : 1900)
    const time = `${year}-${cols[2].padStart(2,'0')}-${cols[3].padStart(2,'0')}T${cols[4].padStart(2,'0')}:${cols[5].padStart(2,'0')}:00Z`

    obs.push({
      id,
      lat:            station.lat,
      lng:            station.lng,
      time,
      windDir:        num(cols[6]),
      windSpeed:      num(cols[7]),
      gust:           num(cols[8]),
      waveHeight:     num(cols[9]),
      dominantPeriod: num(cols[10]),
      meanWaveDir:    num(cols[12]),
      pressure:       num(cols[13]),
      airTemp:        num(cols[14]),
      seaTemp:        num(cols[15]),
      visibility:     num(cols[17]) !== null ? (num(cols[17])! * 1.852) : null, // nmi→km
    })
  }

  return obs
}

// Caribbean + VE bbox filter
export function inVeBbox(lat: number, lng: number): boolean {
  return lat >= 8 && lat <= 16 && lng >= -75 && lng <= -59
}
