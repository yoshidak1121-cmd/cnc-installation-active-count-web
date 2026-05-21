'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

interface CheckItem {
  type: 'error' | 'warning' | 'info'
  message: string
  site_code?: string
  base_id?: string
  maintenance_id?: string
  report_year?: number
}

const TYPE_CONFIG = {
  error: { label: 'Error', color: 'bg-red-100 text-red-700 border-red-200', badge: 'bg-red-500 text-white' },
  warning: { label: 'Warning', color: 'bg-yellow-50 text-yellow-800 border-yellow-200', badge: 'bg-yellow-400 text-white' },
  info: { label: 'Info', color: 'bg-blue-50 text-blue-800 border-blue-200', badge: 'bg-blue-400 text-white' },
}

export default function InputCheckPage() {
  const [items, setItems] = useState<CheckItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'error' | 'warning' | 'info'>('all')

  useEffect(() => {
    setLoading(true)
    fetch('/api/check')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setItems(data); setLoading(false) })
  }, [])

  const filtered = filterType === 'all' ? items : items.filter(i => i.type === filterType)
  const counts = { error: items.filter(i => i.type === 'error').length, warning: items.filter(i => i.type === 'warning').length, info: items.filter(i => i.type === 'info').length }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Input Check</h1>

        <div className="flex gap-3 mb-6">
          {(['all', 'error', 'warning', 'info'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${filterType === t ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {t === 'all' ? `All (${items.length})` : `${TYPE_CONFIG[t].label} (${counts[t]})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Running checks…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center text-green-700 font-medium">
            {filterType === 'all' ? '✓ No issues found!' : `No ${filterType}s found`}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item, i) => {
              const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.info
              return (
                <div key={i} className={`border rounded-lg px-4 py-3 ${cfg.color}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-semibold ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{item.message}</p>
                        <p className="text-xs mt-1 opacity-75">
                          {item.site_code && <span>Site: {item.site_code} </span>}
                          {item.report_year && <span>Year: {item.report_year} </span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {item.base_id && (
                        <Link href={`/installation`} className="text-xs underline opacity-70 hover:opacity-100">
                          View Installation
                        </Link>
                      )}
                      {item.maintenance_id && (
                        <Link href={`/active-maintenance`} className="text-xs underline opacity-70 hover:opacity-100">
                          View Maintenance
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
