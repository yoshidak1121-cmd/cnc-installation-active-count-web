import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

interface Props {
  allowedRoles?: string[]
  children: React.ReactNode
}

export default async function AuthGuard({ allowedRoles, children }: Props) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (allowedRoles && !allowedRoles.includes(user.role)) redirect('/')
  return <>{children}</>
}
