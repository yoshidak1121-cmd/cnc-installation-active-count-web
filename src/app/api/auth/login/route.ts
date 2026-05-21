import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

  const session = { id: user.id, username: user.username, role: user.role, site_code: user.site_code }
  const response = NextResponse.json({ user: session })
  response.cookies.set('user_session', JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
