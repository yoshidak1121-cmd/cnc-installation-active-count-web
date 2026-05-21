import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const maintenance_id = searchParams.get('maintenance_id')

  const where: Record<string, unknown> = {}
  if (maintenance_id) where.maintenance_id = maintenance_id

  const issues = await prisma.issueList.findMany({
    where,
    orderBy: { created_at: 'desc' },
  })
  return NextResponse.json(issues)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  if (!data.maintenance_id || !data.issue_type || !data.issue_detail) {
    return NextResponse.json({ error: 'maintenance_id, issue_type, and issue_detail are required' }, { status: 400 })
  }

  const issue = await prisma.issueList.create({
    data: {
      maintenance_id: data.maintenance_id,
      issue_type: data.issue_type,
      issue_detail: data.issue_detail,
      requested_by: data.requested_by ?? user.username,
      response: data.response ?? null,
      status: data.status ?? 'Open',
    },
  })
  return NextResponse.json(issue, { status: 201 })
}
