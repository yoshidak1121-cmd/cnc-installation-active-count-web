import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items: {
    type: 'error' | 'warning' | 'info'
    message: string
    site_code?: string
    base_id?: string
    maintenance_id?: string
    report_year?: number
  }[] = []

  // Check InstallationBase records
  const installationWhere = user.role === 'site_staff' && user.site_code ? { site_code: user.site_code } : {}
  const bases = await prisma.installationBase.findMany({ where: installationWhere })

  for (const b of bases) {
    if (!b.site_code || !b.country || !b.install_year || !b.data_granularity || b.installed_count == null || !b.installed_count_accuracy) {
      items.push({ type: 'error', message: 'Missing required fields in installation base', site_code: b.site_code, base_id: b.base_id })
    }
    if (b.data_granularity === 'MTB' && !b.machine_builder) {
      items.push({ type: 'error', message: 'MTB record missing machine builder', site_code: b.site_code, base_id: b.base_id })
    }
    if (b.data_granularity === 'NCSeries' && !b.nc_series) {
      items.push({ type: 'error', message: 'NCSeries record missing NC series', site_code: b.site_code, base_id: b.base_id })
    }
    if (b.data_granularity === 'Area' && !b.area) {
      items.push({ type: 'error', message: 'Area record missing area', site_code: b.site_code, base_id: b.base_id })
    }
  }

  // Check ActiveMaintenance records
  const maintenanceWhere: Record<string, unknown> = {
    status: { in: ['Draft', 'Returned'] },
  }
  if (user.role === 'site_staff' && user.site_code) {
    maintenanceWhere.installation_base = { site_code: user.site_code }
  }

  const maintenances = await prisma.activeMaintenance.findMany({
    where: maintenanceWhere,
    include: { installation_base: true },
  })

  for (const m of maintenances) {
    const site = m.installation_base.site_code
    if (!m.active_count_method || !m.active_count_accuracy || !m.status_confirmed_date) {
      items.push({ type: 'error', message: 'Missing required fields in active maintenance', site_code: site, base_id: m.base_id, maintenance_id: m.maintenance_id, report_year: m.report_year })
    }

    if (m.active_count > m.installation_base.installed_count) {
      items.push({ type: 'error', message: `Active count (${m.active_count}) exceeds installed count (${m.installation_base.installed_count})`, site_code: site, base_id: m.base_id, maintenance_id: m.maintenance_id, report_year: m.report_year })
    }

    if (m.installation_base.installed_count > 0 && m.active_rate < 0.05) {
      items.push({ type: 'warning', message: `Active rate is very low (${(m.active_rate * 100).toFixed(1)}%) — please verify`, site_code: site, base_id: m.base_id, maintenance_id: m.maintenance_id, report_year: m.report_year })
    }

    if (m.previous_active_count != null && m.previous_active_count > 0) {
      const changeRate = Math.abs(m.active_count - m.previous_active_count) / m.previous_active_count
      if (changeRate >= 0.2 && (!m.change_reason || m.change_reason.trim() === '')) {
        items.push({ type: 'error', message: `Year-over-year change is ${(changeRate * 100).toFixed(0)}% but no change reason provided`, site_code: site, base_id: m.base_id, maintenance_id: m.maintenance_id, report_year: m.report_year })
      }
    }

    if (m.previous_active_count != null && m.active_count === m.previous_active_count) {
      items.push({ type: 'warning', message: 'Active count is same as previous year — please verify', site_code: site, base_id: m.base_id, maintenance_id: m.maintenance_id, report_year: m.report_year })
    }
  }

  return NextResponse.json(items)
}
