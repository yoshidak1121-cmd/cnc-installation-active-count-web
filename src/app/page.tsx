import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

export default async function Home() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const isHqOrAdmin = user.role === 'hq_staff' || user.role === 'admin'
  const isAdmin = user.role === 'admin'

  const cards = [
    { title: 'Installation Data', desc: 'Manage CNC installation base records', href: '/installation', show: true, color: 'bg-blue-50 border-blue-200' },
    { title: 'Active Maintenance', desc: 'Enter and manage active maintenance data by year', href: '/active-maintenance', show: true, color: 'bg-green-50 border-green-200' },
    { title: 'Input Check', desc: 'Validate data integrity and find issues', href: '/input-check', show: true, color: 'bg-yellow-50 border-yellow-200' },
    { title: 'HQ Review', desc: 'Review and approve submitted records', href: '/hq-review', show: isHqOrAdmin, color: 'bg-purple-50 border-purple-200' },
    { title: 'Aggregate Report', desc: 'View aggregated stats and export CSV', href: '/report', show: isHqOrAdmin, color: 'bg-indigo-50 border-indigo-200' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">CNC Installation Tracker</h1>
        <p className="text-gray-500 mb-8">
          Welcome, <span className="font-semibold">{user.username}</span>
          {user.site_code && <> — Site: <span className="font-semibold">{user.site_code}</span></>}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.filter((c) => c.show).map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`block border rounded-xl p-6 hover:shadow-md transition ${c.color}`}
            >
              <h2 className="text-lg font-semibold mb-1">{c.title}</h2>
              <p className="text-sm text-gray-600">{c.desc}</p>
            </Link>
          ))}
          {isAdmin && (
            <div className="border rounded-xl p-6 bg-red-50 border-red-200 opacity-60 cursor-not-allowed">
              <h2 className="text-lg font-semibold mb-1">User Management</h2>
              <p className="text-sm text-gray-600">Manage user accounts (coming soon)</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
