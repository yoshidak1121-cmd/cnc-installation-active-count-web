import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'hq_staff' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')
  const country = searchParams.get('country')

  const where: Record<string, unknown> = {
    status: { in: ['Approved', 'Locked'] },
    installation_base: {
      primary_flag: true,
      ...(country ? { country } : {}),
    },
  }
  if (yearParam) where.report_year = Number(yearParam)

  const records = await prisma.activeMaintenance.findMany({
    where,
    include: { installation_base: true },
    orderBy: [{ report_year: 'desc' }, { installation_base: { country: 'asc' } }],
  })

  // Aggregate by country and year
  const aggregated: Record<string, { country: string; year: number; total_installed: number; total_active: number; active_rate: number; record_count: number }> = {}

  for (const r of records) {
    const key = `${r.installation_base.country}__${r.report_year}`
    if (!aggregated[key]) {
      aggregated[key] = {
        country: r.installation_base.country,
        year: r.report_year,
        total_installed: 0,
        total_active: 0,
        active_rate: 0,
        record_count: 0,
      }
    }
    aggregated[key].total_installed += r.installation_base.installed_count
    aggregated[key].total_active += r.active_count
    aggregated[key].record_count += 1
  }

  for (const key of Object.keys(aggregated)) {
    const a = aggregated[key]
    a.active_rate = a.total_installed > 0 ? a.total_active / a.total_installed : 0
  }

  return NextResponse.json({ records, aggregated: Object.values(aggregated) })
}
