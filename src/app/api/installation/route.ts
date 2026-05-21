import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { validateInstallationBase } from '@/lib/validations'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const site_code = searchParams.get('site_code')
  const country = searchParams.get('country')
  const data_granularity = searchParams.get('data_granularity')

  const where: Record<string, unknown> = {}
  if (user.role === 'site_staff' && user.site_code) where.site_code = user.site_code
  if (site_code) where.site_code = site_code
  if (country) where.country = country
  if (data_granularity) where.data_granularity = data_granularity

  const installations = await prisma.installationBase.findMany({
    where,
    orderBy: [{ site_code: 'asc' }, { install_year: 'asc' }, { primary_flag: 'desc' }],
  })
  return NextResponse.json(installations)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  const errors = validateInstallationBase(data)
  if (errors.length > 0) return NextResponse.json({ errors }, { status: 400 })

  const existing = await prisma.installationBase.findFirst({
    where: {
      site_code: data.site_code,
      install_year: Number(data.install_year),
      data_granularity: data.data_granularity,
      machine_builder: data.machine_builder ?? null,
      nc_series: data.nc_series ?? null,
      area: data.area ?? null,
    },
  })
  if (existing) return NextResponse.json({ error: 'Duplicate record exists' }, { status: 409 })

  const record = await prisma.installationBase.create({
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
      primary_flag: Boolean(data.primary_flag),
      source_file_name: data.source_file_name ?? null,
      source_note: data.source_note ?? null,
      note: data.note ?? null,
    },
  })
  return NextResponse.json(record, { status: 201 })
}
