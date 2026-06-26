export interface ReliefReport {
  id: number
  title: string
  url: string
  publishedAt: number
  source: string
  type: string
  summary?: string
}

export async function fetchReliefWebReports(country: string, limit = 10): Promise<ReliefReport[]> {
  const body = {
    filter: {
      operator: 'AND',
      conditions: [
        { field: 'country.iso3', value: country },
        { field: 'date.created', value: { from: '2026-06-20T00:00:00+00:00' } },
      ],
    },
    fields: {
      include: ['title', 'date', 'source', 'type', 'body-html', 'url'],
    },
    sort: ['date.created:desc'],
    limit,
  }

  const res = await fetch('https://api.reliefweb.int/v1/reports?appname=geovigil-sar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`ReliefWeb API ${res.status}`)

  const data = await res.json()

  return (data.data ?? []).map((item: {
    id: number
    fields: { title: string; url?: string; date?: { created: string }; source?: { name: string }[]; type?: { name: string }[] }
  }) => ({
    id: item.id,
    title: item.fields.title,
    url: item.fields.url ?? `https://reliefweb.int/report/${item.id}`,
    publishedAt: new Date(item.fields.date?.created ?? Date.now()).getTime(),
    source: item.fields.source?.[0]?.name ?? 'ReliefWeb',
    type: item.fields.type?.[0]?.name ?? 'Report',
  }))
}
