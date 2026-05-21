import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { validateInstallationBase } from '@/lib/validations'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const data = await req.json()
  const errors = validateInstallationBase(data)
  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 })

  const record = await prisma.installationBase.update({
    where: { base_id: id },
    data: {
      site_code: data.site_code,
      country: data.country,
      install_year: Number(data.install_year),
      data_granularity: data.data_granularity,
      machine_builder: data.machine_builder ?? null,
      nc_series: data.nc_series ?? null,
      area: data.area ?? null,
      installed_count: Number(data.installed_count),
      installed_count_accuracy: data.installed_count_accuracy,
      source_file_name: data.source_file_name ?? null,
      source_note: data.source_note ?? null,
      note: data.note ?? null,
    },
  })
  return NextResponse.json(record)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const hasMaintenances = await prisma.activeMaintenance.findFirst({ where: { base_id: id } })
  if (hasMaintenances) {
    return NextResponse.json({ error: 'Cannot delete: active maintenance records exist' }, { status: 409 })
  }

  await prisma.installationBase.delete({ where: { base_id: id } })
  return NextResponse.json({ ok: true })
}
