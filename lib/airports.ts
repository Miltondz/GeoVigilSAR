// Static airport database covering Venezuela + major international origins
// Used for flight route display when OpenSky flight history API returns ICAO codes

export interface FlightAirport {
  icao:        string
  iata?:       string
  name:        string
  city:        string
  lat:         number
  lng:         number
  country:     string
  countryCode: string  // ISO 3166-1 alpha-2
}

export interface FlightRoute {
  departure:    FlightAirport | null
  arrival:      FlightAirport | null
  aircraftType: string | null   // ICAO type designator e.g. "B738"
  model:        string | null   // "Boeing 737-800"
  registration: string | null   // "YV-1234"
  operator:     string | null
}

const AIRPORTS: FlightAirport[] = [
  // ── Venezuela ────────────────────────────────────────────────────────────
  { icao:'SVMI', iata:'CCS', name:'Simón Bolívar',              city:'Caracas / Maiquetía', lat:10.6012, lng:-66.9912, country:'Venezuela',         countryCode:'VE' },
  { icao:'SVVA', iata:'VLN', name:'Arturo Michelena',           city:'Valencia',            lat:10.1497, lng:-67.9284, country:'Venezuela',         countryCode:'VE' },
  { icao:'SVMC', iata:'MAR', name:'La Chinita',                 city:'Maracaibo',           lat:10.5582, lng:-71.7279, country:'Venezuela',         countryCode:'VE' },
  { icao:'SVBC', iata:'BLA', name:'General Anzoátegui',         city:'Barcelona',           lat:10.1074, lng:-64.6892, country:'Venezuela',         countryCode:'VE' },
  { icao:'SVMG', iata:'PMV', name:'Del Caribe S. Mariño',       city:'Porlamar',            lat:10.9126, lng:-63.9666, country:'Venezuela',         countryCode:'VE' },
  { icao:'SVBS', iata:'CLZ', name:'Jacinto Lara',               city:'Barquisimeto',        lat:10.0083, lng:-69.3586, country:'Venezuela',         countryCode:'VE' },
  { icao:'SVBM', iata:'BRM', name:'Barinas',                    city:'Barinas',             lat: 8.6196, lng:-70.2135, country:'Venezuela',         countryCode:'VE' },
  { icao:'SVMT', iata:'MUN', name:'Maturín',                    city:'Maturín',             lat: 9.7546, lng:-63.1473, country:'Venezuela',         countryCode:'VE' },
  { icao:'SVPR', iata:'PZO', name:'Manuel Carlos Piar',         city:'Puerto Ordaz',        lat: 8.2885, lng:-62.7604, country:'Venezuela',         countryCode:'VE' },
  { icao:'SVCB', iata:'CBL', name:'Ciudad Bolívar',             city:'Ciudad Bolívar',      lat: 8.1221, lng:-63.5370, country:'Venezuela',         countryCode:'VE' },
  { icao:'SVCU', iata:'CUP', name:'Antonio Ricaurte',           city:'Cumaná',              lat:10.4503, lng:-64.1305, country:'Venezuela',         countryCode:'VE' },
  { icao:'SVLF', iata:'LAF', name:'Las Flecheras',              city:'Tucupita',            lat: 9.0888, lng:-62.0943, country:'Venezuela',         countryCode:'VE' },
  { icao:'SVGD', iata:'GDO', name:'Guasdualito',                city:'Guasdualito',         lat: 7.2333, lng:-70.7697, country:'Venezuela',         countryCode:'VE' },
  { icao:'SVSR', iata:'SNV', name:'Santa Elena de Uairén',      city:'Santa Elena',         lat: 4.5550, lng:-61.1500, country:'Venezuela',         countryCode:'VE' },
  { icao:'SVMG', iata:'PMV', name:'Santiago Mariño',            city:'Porlamar',            lat:10.9126, lng:-63.9666, country:'Venezuela',         countryCode:'VE' },
  // ── Colombia ──────────────────────────────────────────────────────────────
  { icao:'SKBO', iata:'BOG', name:'El Dorado',                  city:'Bogotá',              lat: 4.7016, lng:-74.1469, country:'Colombia',          countryCode:'CO' },
  { icao:'SKRG', iata:'MDE', name:'José María Córdova',         city:'Medellín',            lat: 6.1645, lng:-75.4232, country:'Colombia',          countryCode:'CO' },
  { icao:'SKCL', iata:'CLO', name:'Alfonso Bonilla Aragón',     city:'Cali',                lat: 3.5432, lng:-76.3816, country:'Colombia',          countryCode:'CO' },
  { icao:'SKBQ', iata:'BAQ', name:'Ernesto Cortissoz',          city:'Barranquilla',        lat:10.8896, lng:-74.7808, country:'Colombia',          countryCode:'CO' },
  // ── Panamá ────────────────────────────────────────────────────────────────
  { icao:'MPTO', iata:'PTY', name:'Tocumen',                    city:'Panamá',              lat: 9.0714, lng:-79.3835, country:'Panama',            countryCode:'PA' },
  // ── México ────────────────────────────────────────────────────────────────
  { icao:'MMMX', iata:'MEX', name:'Benito Juárez',              city:'Ciudad de México',    lat:19.4363, lng:-99.0721, country:'Mexico',            countryCode:'MX' },
  { icao:'MMCN', iata:'CUN', name:'Cancún',                     city:'Cancún',              lat:21.0365, lng:-86.8771, country:'Mexico',            countryCode:'MX' },
  // ── Caribe ────────────────────────────────────────────────────────────────
  { icao:'MDSD', iata:'SDQ', name:'Las Américas',               city:'Santo Domingo',       lat:18.4297, lng:-69.6689, country:'Dominican Republic', countryCode:'DO' },
  { icao:'MDPC', iata:'PUJ', name:'Punta Cana',                 city:'Punta Cana',          lat:18.5674, lng:-68.3634, country:'Dominican Republic', countryCode:'DO' },
  { icao:'MUHA', iata:'HAV', name:'José Martí',                 city:'La Habana',           lat:22.9892, lng:-82.4091, country:'Cuba',              countryCode:'CU' },
  { icao:'TJSJ', iata:'SJU', name:'Luis Muñoz Marín',           city:'San Juan',            lat:18.4394, lng:-65.9936, country:'United States',     countryCode:'US' },
  { icao:'TTPP', iata:'POS', name:'Piarco',                     city:'Port of Spain',       lat:10.5954, lng:-61.3372, country:'Trinidad and Tobago', countryCode:'TT' },
  { icao:'TNCB', iata:'BON', name:'Flamingo',                   city:'Bonaire',             lat:12.1310, lng:-68.2688, country:'Netherlands',       countryCode:'NL' },
  { icao:'TNCA', iata:'AUA', name:'Reina Beatrix',              city:'Aruba',               lat:12.5014, lng:-70.0152, country:'Aruba',             countryCode:'AW' },
  { icao:'TNCW', iata:'CUR', name:'Hato',                       city:'Willemstad',          lat:12.1888, lng:-68.9598, country:'Curaçao',           countryCode:'CW' },
  // ── USA ───────────────────────────────────────────────────────────────────
  { icao:'KMIA', iata:'MIA', name:'Miami',                      city:'Miami',               lat:25.7959, lng:-80.2870, country:'United States',     countryCode:'US' },
  { icao:'KJFK', iata:'JFK', name:'John F. Kennedy',            city:'New York',            lat:40.6398, lng:-73.7789, country:'United States',     countryCode:'US' },
  { icao:'KEWR', iata:'EWR', name:'Newark Liberty',             city:'Newark',              lat:40.6895, lng:-74.1745, country:'United States',     countryCode:'US' },
  { icao:'KATL', iata:'ATL', name:'Hartsfield-Jackson',         city:'Atlanta',             lat:33.6367, lng:-84.4281, country:'United States',     countryCode:'US' },
  { icao:'KORD', iata:'ORD', name:"O'Hare",                     city:'Chicago',             lat:41.9742, lng:-87.9073, country:'United States',     countryCode:'US' },
  { icao:'KDFW', iata:'DFW', name:'Dallas Fort Worth',          city:'Dallas',              lat:32.8998, lng:-97.0403, country:'United States',     countryCode:'US' },
  { icao:'KLAX', iata:'LAX', name:'Los Angeles',                city:'Los Angeles',         lat:33.9425, lng:-118.4081,country:'United States',     countryCode:'US' },
  { icao:'KBOS', iata:'BOS', name:'Logan',                      city:'Boston',              lat:42.3656, lng:-71.0096, country:'United States',     countryCode:'US' },
  { icao:'KIAD', iata:'IAD', name:'Washington Dulles',          city:'Washington DC',       lat:38.9531, lng:-77.4565, country:'United States',     countryCode:'US' },
  { icao:'KHOU', iata:'HOU', name:'William P. Hobby',           city:'Houston',             lat:29.6454, lng:-95.2789, country:'United States',     countryCode:'US' },
  { icao:'KIAH', iata:'IAH', name:'George Bush',                city:'Houston',             lat:29.9844, lng:-95.3414, country:'United States',     countryCode:'US' },
  // ── Suramérica ───────────────────────────────────────────────────────────
  { icao:'SBBE', iata:'BEL', name:'Val de Cans',                city:'Belém',               lat:-1.3792, lng:-48.4763, country:'Brazil',            countryCode:'BR' },
  { icao:'SBGR', iata:'GRU', name:'Guarulhos',                  city:'São Paulo',           lat:-23.4356,lng:-46.4731, country:'Brazil',            countryCode:'BR' },
  { icao:'SBRJ', iata:'SDU', name:'Santos Dumont',              city:'Rio de Janeiro',      lat:-22.9095,lng:-43.1634, country:'Brazil',            countryCode:'BR' },
  { icao:'SBGL', iata:'GIG', name:'Galeão',                     city:'Rio de Janeiro',      lat:-22.8099,lng:-43.2505, country:'Brazil',            countryCode:'BR' },
  { icao:'SEQM', iata:'UIO', name:'Mariscal Sucre',             city:'Quito',               lat:-0.1292, lng:-78.3575, country:'Ecuador',           countryCode:'EC' },
  { icao:'SEGU', iata:'GYE', name:'José Joaquín de Olmedo',     city:'Guayaquil',           lat:-2.1574, lng:-79.8836, country:'Ecuador',           countryCode:'EC' },
  { icao:'SPJC', iata:'LIM', name:'Jorge Chávez',               city:'Lima',                lat:-12.0219,lng:-77.1143, country:'Peru',              countryCode:'PE' },
  { icao:'SCEL', iata:'SCL', name:'Arturo Merino Benítez',      city:'Santiago',            lat:-33.3928,lng:-70.7856, country:'Chile',             countryCode:'CL' },
  { icao:'SAEZ', iata:'EZE', name:'Ministro Pistarini',         city:'Buenos Aires',        lat:-34.8222,lng:-58.5358, country:'Argentina',         countryCode:'AR' },
  { icao:'SPZO', iata:'CUZ', name:'Velasco Astete',             city:'Cusco',               lat:-13.5357,lng:-71.9388, country:'Peru',              countryCode:'PE' },
  // ── Europa ───────────────────────────────────────────────────────────────
  { icao:'LEMD', iata:'MAD', name:'Adolfo Suárez Madrid-Barajas',city:'Madrid',             lat:40.4936, lng:-3.5668,  country:'Spain',             countryCode:'ES' },
  { icao:'LEBL', iata:'BCN', name:'Josep Tarradellas Barcelona', city:'Barcelona',           lat:41.2976, lng: 2.0833,  country:'Spain',             countryCode:'ES' },
  { icao:'EGLL', iata:'LHR', name:'London Heathrow',            city:'London',              lat:51.4775, lng:-0.4614,  country:'United Kingdom',    countryCode:'GB' },
  { icao:'LFPG', iata:'CDG', name:'Charles de Gaulle',          city:'Paris',               lat:49.0097, lng: 2.5479,  country:'France',            countryCode:'FR' },
  { icao:'EHAM', iata:'AMS', name:'Schiphol',                   city:'Amsterdam',           lat:52.3086, lng: 4.7639,  country:'Netherlands',       countryCode:'NL' },
  { icao:'EDDF', iata:'FRA', name:'Frankfurt',                  city:'Frankfurt',           lat:50.0264, lng: 8.5431,  country:'Germany',           countryCode:'DE' },
  { icao:'LIRF', iata:'FCO', name:'Fiumicino – L. da Vinci',    city:'Rome',                lat:41.8002, lng:12.2388,  country:'Italy',             countryCode:'IT' },
  { icao:'LPPT', iata:'LIS', name:'Humberto Delgado',           city:'Lisbon',              lat:38.7813, lng:-9.1359,  country:'Portugal',          countryCode:'PT' },
  // ── Medio Oriente ─────────────────────────────────────────────────────────
  { icao:'OMDB', iata:'DXB', name:'Dubai',                      city:'Dubai',               lat:25.2528, lng:55.3644,  country:'United Arab Emirates', countryCode:'AE' },
  { icao:'OERK', iata:'RUH', name:'King Khalid',                city:'Riyadh',              lat:24.9576, lng:46.6988,  country:'Saudi Arabia',      countryCode:'SA' },
  // ── Rusia / CIS ───────────────────────────────────────────────────────────
  { icao:'UUDD', iata:'SVO', name:'Sheremetyevo',               city:'Moscow',              lat:55.9726, lng:37.4146,  country:'Russian Federation', countryCode:'RU' },
  // ── China ─────────────────────────────────────────────────────────────────
  { icao:'ZBAA', iata:'PEK', name:'Capital',                    city:'Beijing',             lat:40.0799, lng:116.6031, country:'China',             countryCode:'CN' },
  { icao:'ZGGG', iata:'CAN', name:'Baiyun',                     city:'Guangzhou',           lat:23.3924, lng:113.2988, country:'China',             countryCode:'CN' },
]

// ICAO → airport (O(1) lookup)
const BY_ICAO = new Map<string, FlightAirport>(AIRPORTS.map(a => [a.icao, a]))
// IATA → airport (O(1) lookup)
const BY_IATA = new Map<string, FlightAirport>(
  AIRPORTS.filter(a => a.iata).map(a => [a.iata!, a])
)

export function lookupAirport(code: string): FlightAirport | null {
  if (!code) return null
  const upper = code.toUpperCase()
  return BY_ICAO.get(upper) ?? BY_IATA.get(upper) ?? null
}

export { AIRPORTS }
