import { cookies } from 'next/headers'

export interface UserSession {
  id: string
  username: string
  role: string
  site_code?: string | null
}

export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('user_session')
  if (!sessionCookie) return null
  try {
    return JSON.parse(sessionCookie.value) as UserSession
  } catch {
    return null
  }
}
