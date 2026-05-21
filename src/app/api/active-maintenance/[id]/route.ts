import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { calculateDerivedFields } from '@/lib/calculations'
import { validateActiveMaintenance } from '@/lib/validations'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const record = await prisma.activeMaintenance.findUnique({
    where: { maintenance_id: id },
    include: { installation_base: true },
  })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (user.role === 'site_staff' && !['Draft', 'Returned'].includes(record.status)) {
    return NextResponse.json({ error: 'Cannot edit record in current status' }, { status: 403 })
  }

  const data = await req.json()
  const { errors } = validateActiveMaintenance({
    ...data,
    installed_count: record.installation_base.installed_count,
    install_year: record.installation_base.install_year,
  })
  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 })

  const { inactiveCount, activeRate, differenceFromPrevious, differenceRate } = calculateDerivedFields(
    record.installation_base.installed_count,
    Number(data.active_count),
    data.previous_active_count != null ? Number(data.previous_active_count) : null
  )

  const updated = await prisma.activeMaintenance.update({
    where: { maintenance_id: id },
    data: {
      previous_active_count: data.previous_active_count != null ? Number(data.previous_active_count) : null,
      active_count: Number(data.active_count),
      inactive_count: inactiveCount,
      active_rate: activeRate,
      difference_from_previous: differenceFromPrevious,
      difference_rate: differenceRate,
      active_count_method: data.active_count_method,
      active_count_accuracy: data.active_count_accuracy,
      status_confirmed_date: data.status_confirmed_date,
      confirmed_by: data.confirmed_by ?? null,
      change_reason: data.change_reason ?? null,
      note: data.note ?? null,
    },
    include: { installation_base: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const record = await prisma.activeMaintenance.findUnique({ where: { maintenance_id: id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (record.status !== 'Draft') {
    return NextResponse.json({ error: 'Only Draft records can be deleted' }, { status: 403 })
  }

  await prisma.activeMaintenance.delete({ where: { maintenance_id: id } })
  return NextResponse.json({ ok: true })
}
