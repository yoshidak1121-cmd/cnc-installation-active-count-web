import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'hq_staff' && user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const record = await prisma.activeMaintenance.findUnique({ where: { maintenance_id: id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (record.status !== 'Submitted') {
    return NextResponse.json({ error: 'Only Submitted records can be locked' }, { status: 400 })
  }

  const updated = await prisma.activeMaintenance.update({
    where: { maintenance_id: id },
    data: { status: 'Locked' },
  })
  return NextResponse.json(updated)
}
