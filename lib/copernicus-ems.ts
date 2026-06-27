// Copernicus EMS — Emergency Management Service activations
// Public JSON API was removed. Manual reference:
// https://emergency.copernicus.eu/mapping/list-of-activations-rapid
// This module returns [] until a replacement endpoint is confirmed.

export interface EmsActivation {
  activationId: string
  title: string
  countries: string[]
  eventDate: string
  type: string
  status: string
  url: string
  productCount: number
}

export async function fetchEmsActivations(_country: string = 'Venezuela'): Promise<EmsActivation[]> {
  return []
}
