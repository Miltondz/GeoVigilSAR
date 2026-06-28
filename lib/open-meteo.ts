export interface WeatherCurrent {
  time: string
  temperature2m: number
  relativeHumidity2m: number
  precipitation: number
  weatherCode: number
  cloudCover: number
  windSpeed10m: number
  windDirection10m: number
  windGusts10m: number
  visibility: number | null
}

export interface WeatherPoint {
  lat: number
  lng: number
  current: WeatherCurrent
}

interface RawOpenMeteo {
  latitude: number
  longitude: number
  current: {
    time: string
    temperature_2m: number
    relative_humidity_2m: number
    precipitation: number
    weather_code: number
    cloud_cover: number
    wind_speed_10m: number
    wind_direction_10m: number
    wind_gusts_10m: number
  }
  hourly?: { time: string[]; visibility: number[] }
}

export function mapWeather(r: RawOpenMeteo): WeatherPoint {
  // Pick visibility from hourly nearest to current hour
  let visibility: number | null = null
  if (r.hourly?.time && r.hourly.visibility) {
    const currentHour = r.current.time.slice(0, 13) // "2026-06-24T10"
    const idx = r.hourly.time.findIndex(t => t.slice(0, 13) === currentHour)
    if (idx >= 0) visibility = r.hourly.visibility[idx] ?? null
  }

  return {
    lat: r.latitude,
    lng: r.longitude,
    current: {
      time:               r.current.time,
      temperature2m:      r.current.temperature_2m,
      relativeHumidity2m: r.current.relative_humidity_2m,
      precipitation:      r.current.precipitation,
      weatherCode:        r.current.weather_code,
      cloudCover:         r.current.cloud_cover,
      windSpeed10m:       r.current.wind_speed_10m,
      windDirection10m:   r.current.wind_direction_10m,
      windGusts10m:       r.current.wind_gusts_10m,
      visibility,
    },
  }
}

// WMO weather interpretation code → label
export function weatherCodeLabel(code: number, lang: 'es' | 'en' = 'es'): string {
  const MAP: Record<number, [string, string]> = {
    0:  ['Despejado', 'Clear sky'],
    1:  ['Mayormente despejado', 'Mainly clear'],
    2:  ['Parcialmente nublado', 'Partly cloudy'],
    3:  ['Nublado', 'Overcast'],
    45: ['Niebla', 'Fog'],
    48: ['Niebla con escarcha', 'Depositing rime fog'],
    51: ['Llovizna ligera', 'Light drizzle'],
    53: ['Llovizna moderada', 'Moderate drizzle'],
    55: ['Llovizna intensa', 'Dense drizzle'],
    61: ['Lluvia ligera', 'Slight rain'],
    63: ['Lluvia moderada', 'Moderate rain'],
    65: ['Lluvia intensa', 'Heavy rain'],
    71: ['Nieve ligera', 'Slight snow'],
    73: ['Nieve moderada', 'Moderate snow'],
    75: ['Nieve intensa', 'Heavy snow'],
    80: ['Chubascos ligeros', 'Slight showers'],
    81: ['Chubascos moderados', 'Moderate showers'],
    82: ['Chubascos violentos', 'Violent showers'],
    95: ['Tormenta eléctrica', 'Thunderstorm'],
    96: ['Tormenta con granizo', 'Thunderstorm w/ hail'],
    99: ['Tormenta con granizo fuerte', 'Thunderstorm w/ heavy hail'],
  }
  const entry = MAP[code]
  if (!entry) return lang === 'es' ? 'Desconocido' : 'Unknown'
  return lang === 'es' ? entry[0] : entry[1]
}

// Cardinal direction from meteorological degrees
export function windDirArrow(deg: number): string {
  const dirs = ['↑N','↗NE','→E','↘SE','↓S','↙SW','←W','↖NW']
  return dirs[Math.round(deg / 45) % 8]
}
