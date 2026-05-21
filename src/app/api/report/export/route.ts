import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function escapeCsv(value: unknown): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsvRow(fields: unknown[]): string {
  return fields.map(escapeCsv).join(',')
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'installation'
  const yearParam = searchParams.get('year')
  const country = searchParams.get('country')

  let csv = ''


  if (type === 'installation') {
    const where: Record<string, unknown> = {}
    if (user.role === 'site_staff' && user.site_code) where.site_code = user.site_code
    if (country) where.country = country
    const rows = await prisma.installationBase.findMany({ where, orderBy: { site_code: 'asc' } })
    csv = 'base_id,site_code,country,install_year,data_granularity,machine_builder,nc_series,area,installed_count,installed_count_accuracy,primary_flag,note\n'
    csv += rows.map((r) =>
      toCsvRow([r.base_id, r.site_code, r.country, r.install_year, r.data_granularity, r.machine_builder ?? '', r.nc_series ?? '', r.area ?? '', r.installed_count, r.installed_count_accuracy, r.primary_flag, r.note ?? ''])
    ).join('\n')
  } else if (type === 'maintenance') {
    const where: Record<string, unknown> = {}
    if (yearParam) where.report_year = Number(yearParam)
    if (user.role === 'site_staff' && user.site_code) where.installation_base = { site_code: user.site_code }
    const rows = await prisma.activeMaintenance.findMany({ where, include: { installation_base: true } })
    csv = 'maintenance_id,base_id,site_code,country,install_year,report_year,active_count,inactive_count,active_rate,status,active_count_method,active_count_accuracy,status_confirmed_date\n'
    csv += rows.map((r) =>
      toCsvRow([r.maintenance_id, r.base_id, r.installation_base.site_code, r.installation_base.country, r.installation_base.install_year, r.report_year, r.active_count, r.inactive_count, r.active_rate.toFixed(4), r.status, r.active_count_method, r.active_count_accuracy, r.status_confirmed_date])
    ).join('\n')
  } else if (type === 'report') {
    const where: Record<string, unknown> = {
      status: { in: ['Approved', 'Locked'] },
      installation_base: { primary_flag: true, ...(country ? { country } : {}) },
    }
    if (yearParam) where.report_year = Number(yearParam)
    const rows = await prisma.activeMaintenance.findMany({ where, include: { installation_base: true } })
    csv = 'site_code,country,install_year,report_year,installed_count,active_count,inactive_count,active_rate,status\n'
    csv += rows.map((r) =>
      toCsvRow([r.installation_base.site_code, r.installation_base.country, r.installation_base.install_year, r.report_year, r.installation_base.installed_count, r.active_count, r.inactive_count, r.active_rate.toFixed(4), r.status])
    ).join('\n')
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${type}-export.csv"`,
    },
  })
}
