import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'hq_staff' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const record = await prisma.activeMaintenance.findUnique({ where: { maintenance_id: id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['Submitted', 'Under Review'].includes(record.status)) {
    return NextResponse.json({ error: 'Record must be Submitted or Under Review to return' }, { status: 400 })
  }

  const { issue_type, issue_detail } = await req.json()
  if (!issue_type || !issue_detail) {
    return NextResponse.json({ error: 'issue_type and issue_detail are required' }, { status: 400 })
  }

  await prisma.activeMaintenance.update({
    where: { maintenance_id: id },
    data: { status: 'Returned' },
  })

  const issue = await prisma.issueList.create({
    data: {
      maintenance_id: id,
      issue_type,
      issue_detail,
      requested_by: user.username,
      status: 'Open',
    },
  })

  return NextResponse.json({ status: 'Returned', issue })
}
