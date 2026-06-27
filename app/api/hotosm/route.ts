import { NextResponse } from 'next/server'
import { fetchHotProjects } from '@/lib/hotosm'

export const revalidate = 1800

export async function GET() {
  try {
    const projects = await fetchHotProjects({ search: 'venezuela earthquake' })

    return NextResponse.json({
      projects,
      count: projects.length,
      lastUpdated: Date.now(),
    })
  } catch {
    return NextResponse.json({ projects: [], count: 0, lastUpdated: Date.now() })
  }
}
