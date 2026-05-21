import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { calculateDerivedFields } from '@/lib/calculations'
import { validateActiveMaintenance } from '@/lib/validations'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const report_year = searchParams.get('report_year')
  const site_code = searchParams.get('site_code')
  const base_id = searchParams.get('base_id')

  const where: Record<string, unknown> = {}
  if (report_year) where.report_year = Number(report_year)
  if (base_id) where.base_id = base_id

  if (user.role === 'site_staff' && user.site_code) {
    where.installation_base = { site_code: user.site_code }
  } else if (site_code) {
    where.installation_base = { site_code }
  }

  const records = await prisma.activeMaintenance.findMany({
    where,
    include: { installation_base: true },
    orderBy: [{ report_year: 'desc' }, { base_id: 'asc' }],
  })
  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  const base = await prisma.installationBase.findUnique({ where: { base_id: data.base_id } })
  if (!base) return NextResponse.json({ error: 'Installation base not found' }, { status: 404 })

  const { errors } = validateActiveMaintenance({
    ...data,
    installed_count: base.installed_count,
    install_year: base.install_year,
  })
  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 })

  const { inactiveCount, activeRate, differenceFromPrevious, differenceRate } = calculateDerivedFields(
    base.installed_count,
    Number(data.active_count),
    data.previous_active_count != null ? Number(data.previous_active_count) : null
  )

  const existing = await prisma.activeMaintenance.findFirst({
    where: { base_id: data.base_id, report_year: Number(data.report_year) },
  })
  if (existing) return NextResponse.json({ error: 'Record already exists for this base and year' }, { status: 409 })

  const record = await prisma.activeMaintenance.create({
    data: {
      base_id: data.base_id,
      report_year: Number(data.report_year),
      previous_active_count: data.previous_active_count != null ? Number(data.previous_active_count) : null,
      active_count: Number(data.active_count),
      inactive_count: inactiveCount,
      active_rate: activeRate,
      difference_from_previous: differenceFromPrevious,
      difference_rate: differenceRate,
      active_count_method: data.active_count_method,
      active_count_accuracy: data.active_count_accuracy,
      note: data.note ?? null,
    },
    include: { installation_base: true },
  })
  return NextResponse.json(record, { status: 201 })
}
