'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { UserSession } from '@/lib/auth'

const ROLE_LABELS: Record<string, string> = {
  site_staff: 'Site Staff',
  hq_staff: 'HQ Staff',
  admin: 'Admin',
}

export default function Navigation() {
  const router = useRouter()
  const [user, setUser] = useState<UserSession | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const isHqOrAdmin = user?.role === 'hq_staff' || user?.role === 'admin'

  return (
    <nav className="bg-blue-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-lg hover:text-blue-200">
            CNC Tracker
          </Link>
          <Link href="/installation" className="text-sm hover:text-blue-200">
            Installation
          </Link>
          <Link href="/active-maintenance" className="text-sm hover:text-blue-200">
            Active Maintenance
          </Link>
          <Link href="/input-check" className="text-sm hover:text-blue-200">
            Input Check
          </Link>
          {isHqOrAdmin && (
            <Link href="/report" className="text-sm hover:text-blue-200">
              Report
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-blue-200">
              {user.username}{' '}
              <span className="bg-blue-600 rounded px-1 text-xs">{ROLE_LABELS[user.role] ?? user.role}</span>
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
