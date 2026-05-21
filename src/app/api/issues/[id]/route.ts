import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  const issue = await prisma.issueList.update({
    where: { issue_id: id },
    data: {
      issue_type: data.issue_type,
      issue_detail: data.issue_detail,
      response: data.response ?? null,
      status: data.status,
    },
  })
  return NextResponse.json(issue)
}
