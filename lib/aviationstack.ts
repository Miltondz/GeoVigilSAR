export interface AviationAirport {
  iataCode: string
  icaoCode: string
  airportName: string
  latitude: number
  longitude: number
  countryIso2: string
  countryName: string
  timezone: string
  gmt: string
}

export type FlightStatus =
  | 'scheduled' | 'active' | 'landed' | 'cancelled' | 'incident' | 'diverted'

export interface AviationFlight {
  flightDate: string
  flightStatus: FlightStatus
  departure: { airport: string; iata: string; icao: string; scheduled: string; delay: number | null }
  arrival:   { airport: string; iata: string; icao: string; scheduled: string; delay: number | null }
  airline:   { name: string; iata: string; icao: string }
  flight:    { number: string; iata: string; icao: string }
}

interface RawAirport {
  iata_code: string; icao_code: string; airport_name: string
  latitude: string; longitude: string; country_iso2: string
  country_name: string; timezone: string; gmt: string
}

interface RawFlight {
  flight_date: string; flight_status: FlightStatus
  departure: { airport: string; iata: string; icao: string; scheduled: string; delay: number | null }
  arrival:   { airport: string; iata: string; icao: string; scheduled: string; delay: number | null }
  airline:   { name: string; iata: string; icao: string }
  flight:    { number: string; iata: string; icao: string }
}

export function mapAirport(r: RawAirport): AviationAirport {
  return {
    iataCode:    r.iata_code,
    icaoCode:    r.icao_code,
    airportName: r.airport_name,
    latitude:    parseFloat(r.latitude),
    longitude:   parseFloat(r.longitude),
    countryIso2: r.country_iso2,
    countryName: r.country_name,
    timezone:    r.timezone,
    gmt:         r.gmt,
  }
}

export function mapFlight(r: RawFlight): AviationFlight {
  return {
    flightDate:   r.flight_date,
    flightStatus: r.flight_status,
    departure:    r.departure,
    arrival:      r.arrival,
    airline:      r.airline,
    flight:       r.flight,
  }
}

// Static VE fallback — ensures layer works at quota exhaustion
export const VE_AIRPORTS: AviationAirport[] = [
  { iataCode:'CCS', icaoCode:'SVMI', airportName:'Simón Bolívar Int\'l', latitude:10.6012, longitude:-66.9911, countryIso2:'VE', countryName:'Venezuela', timezone:'America/Caracas', gmt:'-4' },
  { iataCode:'VLN', icaoCode:'SVVA', airportName:'Arturo Michelena Int\'l', latitude:10.1497, longitude:-67.9284, countryIso2:'VE', countryName:'Venezuela', timezone:'America/Caracas', gmt:'-4' },
  { iataCode:'BLA', icaoCode:'SVBC', airportName:'General J.A. Anzoátegui', latitude:10.1071, longitude:-64.6892, countryIso2:'VE', countryName:'Venezuela', timezone:'America/Caracas', gmt:'-4' },
  { iataCode:'MAR', icaoCode:'SVMC', airportName:'La Chinita Int\'l', latitude:10.5582, longitude:-71.7279, countryIso2:'VE', countryName:'Venezuela', timezone:'America/Caracas', gmt:'-4' },
  { iataCode:'PMV', icaoCode:'SVMG', airportName:'Del Caribe Gen. S. Mariño', latitude:10.9126, longitude:-63.9666, countryIso2:'VE', countryName:'Venezuela', timezone:'America/Caracas', gmt:'-4' },
]
