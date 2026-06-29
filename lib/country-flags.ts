// Converts OpenSky originCountry string → flag emoji
// Flag emoji = two regional indicator Unicode letters (ISO 3166-1 alpha-2)

function flag(iso2: string): string {
  const upper = iso2.toUpperCase()
  return (
    String.fromCodePoint(0x1F1E0 + upper.charCodeAt(0) - 65) +
    String.fromCodePoint(0x1F1E0 + upper.charCodeAt(1) - 65)
  )
}

// OpenSky country name strings → ISO 3166-1 alpha-2
// Includes ISO 3166-1 standard names AND OpenSky variants (long-form country names)
const ISO2: Record<string, string> = {
  'Venezuela':                              'VE',
  'Venezuela, Bolivarian Republic of':      'VE',
  'Venezuela (Bolivarian Republic of)':     'VE',
  'United States':                          'US',
  'United States of America':               'US',
  'Colombia':                     'CO',
  'Brazil':                       'BR',
  'Mexico':                       'MX',
  'Panama':                       'PA',
  'Peru':                         'PE',
  'Chile':                        'CL',
  'Argentina':                    'AR',
  'Ecuador':                      'EC',
  'Bolivia':                      'BO',
  'Uruguay':                      'UY',
  'Paraguay':                     'PY',
  'Cuba':                         'CU',
  'Dominican Republic':           'DO',
  'Puerto Rico':                  'US',
  'Trinidad and Tobago':          'TT',
  'Jamaica':                      'JM',
  'Haiti':                        'HT',
  'Barbados':                     'BB',
  'Guyana':                       'GY',
  'Suriname':                     'SR',
  'Belize':                       'BZ',
  'Guatemala':                    'GT',
  'Honduras':                     'HN',
  'El Salvador':                  'SV',
  'Nicaragua':                    'NI',
  'Costa Rica':                   'CR',
  'Cayman Islands':               'KY',
  'Bahamas':                      'BS',
  'Aruba':                        'AW',
  'Curaçao':                      'CW',
  'Curacao':                      'CW',
  'Sint Maarten':                 'SX',
  'Bonaire, Saint Eustatius and Saba': 'BQ',
  'Antigua and Barbuda':          'AG',
  'Grenada':                      'GD',
  'Saint Lucia':                  'LC',
  'Saint Vincent and the Grenadines': 'VC',
  'Dominica':                     'DM',
  'Saint Kitts and Nevis':        'KN',
  'Anguilla':                     'AI',
  'British Virgin Islands':       'VG',
  'US Virgin Islands':            'VI',
  'Turks and Caicos Islands':     'TC',
  'Spain':                        'ES',
  'France':                       'FR',
  'Germany':                      'DE',
  'Netherlands':                  'NL',
  'Italy':                        'IT',
  'United Kingdom':               'GB',
  'Portugal':                     'PT',
  'Turkey':                       'TR',
  'Russian Federation':           'RU',
  'Russia':                       'RU',
  'Korea, Republic of':           'KR',
  'Iran, Islamic Republic of':    'IR',
  'Bolivia (Plurinational State of)': 'BO',
  'Tanzania, United Republic of': 'TZ',
  'Syria, Arab Republic':         'SY',
  'Czechia':                      'CZ',
  'China':                        'CN',
  'United Arab Emirates':         'AE',
  'Saudi Arabia':                 'SA',
  'Qatar':                        'QA',
  'Kuwait':                       'KW',
  'Canada':                       'CA',
  'Japan':                        'JP',
  'South Korea':                  'KR',
  'India':                        'IN',
  'South Africa':                 'ZA',
  'Nigeria':                      'NG',
  'Kenya':                        'KE',
  'Australia':                    'AU',
  'New Zealand':                  'NZ',
  'Switzerland':                  'CH',
  'Austria':                      'AT',
  'Belgium':                      'BE',
  'Denmark':                      'DK',
  'Finland':                      'FI',
  'Norway':                       'NO',
  'Sweden':                       'SE',
  'Ireland':                      'IE',
  'Poland':                       'PL',
  'Czech Republic':               'CZ',
  'Hungary':                      'HU',
  'Romania':                      'RO',
  'Bulgaria':                     'BG',
  'Greece':                       'GR',
  'Ukraine':                      'UA',
  'Israel':                       'IL',
  'Egypt':                        'EG',
  'Morocco':                      'MA',
  'Ethiopia':                     'ET',
  'Ghana':                        'GH',
  'Singapore':                    'SG',
  'Thailand':                     'TH',
  'Malaysia':                     'MY',
  'Indonesia':                    'ID',
  'Philippines':                  'PH',
  'Vietnam':                      'VN',
  'Hong Kong':                    'HK',
  'Taiwan':                       'TW',
}

/** Returns a flag emoji for an OpenSky originCountry string. Falls back to 🏳 */
export function countryFlag(countryName: string): string {
  const iso2 = ISO2[countryName]
  if (!iso2) return '🏳'
  return flag(iso2)
}

/** Returns ISO2 code for a country name */
export function countryIso2(countryName: string): string {
  return ISO2[countryName] ?? ''
}
