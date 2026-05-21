'use client'

import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'

interface AggregatedRow {
  country: string
  year: number
  total_installed: number
  total_active: number
  active_rate: number
  record_count: number
}

interface DetailRecord {
  maintenance_id: string
  report_year: number
  active_count: number
  inactive_count: number
  active_rate: number
  status: string
  installation_base: {
    site_code: string
    country: string
    install_year: number
    installed_count: number
  }
}

export default function ReportPage() {
  const [aggregated, setAggregated] = useState<AggregatedRow[]>([])
  const [records, setRecords] = useState<DetailRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterYear, setFilterYear] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [tab, setTab] = useState<'summary' | 'detail'>('summary')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterYear) params.set('year', filterYear)
    if (filterCountry) params.set('country', filterCountry)
    const res = await fetch(`/api/report?${params}`)
    if (res.ok) {
      const data = await res.json()
      setAggregated(data.aggregated ?? [])
      setRecords(data.records ?? [])
    }
    setLoading(false)
  }, [filterYear, filterCountry])

  useEffect(() => { fetchData() }, [fetchData])

  function handleExport() {
    const params = new URLSearchParams({ type: 'report' })
    if (filterYear) params.set('year', filterYear)
    if (filterCountry) params.set('country', filterCountry)
    window.open(`/api/report/export?${params}`, '_blank')
  }

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)
  const allCountries = records.map(r => r.installation_base.country)
  const countries = Array.from(new Set(allCountries)).sort()

  const totalInstalled = aggregated.reduce((s, r) => s + r.total_installed, 0)
  const totalActive = aggregated.reduce((s, r) => s + r.total_active, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Aggregate Report</h1>
          <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-500">
            Export CSV
          </button>
        </div>

        <div className="flex gap-3 mb-6">
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
            <option value="">All years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
            <option value="">All countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {!loading && aggregated.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs text-gray-500 mb-1">Total Installed</p>
              <p className="text-2xl font-bold text-gray-800">{totalInstalled.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs text-gray-500 mb-1">Total Active</p>
              <p className="text-2xl font-bold text-green-700">{totalActive.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-xs text-gray-500 mb-1">Overall Active Rate</p>
              <p className="text-2xl font-bold text-blue-700">
                {totalInstalled > 0 ? `${((totalActive / totalInstalled) * 100).toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {(['summary', 'detail'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded text-sm font-medium border transition ${tab === t ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300 text-gray-700'}`}>
              {t === 'summary' ? 'Summary by Country' : 'Detail Records'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : tab === 'summary' ? (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                  {['Country','Year','Total Installed','Total Active','Active Rate','Records'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {aggregated.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No submitted/locked data found</td></tr>
                ) : aggregated.sort((a, b) => b.year - a.year || a.country.localeCompare(b.country)).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{row.country}</td>
                    <td className="px-4 py-2">{row.year}</td>
                    <td className="px-4 py-2 text-right">{row.total_installed.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{row.total_active.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{(row.active_rate * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2 text-right">{row.record_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                  {['Site','Country','Install Yr','Report Yr','Installed','Active','Inactive','Rate','Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">No records found</td></tr>
                ) : records.map(r => (
                  <tr key={r.maintenance_id} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-medium">{r.installation_base.site_code}</td>
                    <td className="px-3 py-1.5">{r.installation_base.country}</td>
                    <td className="px-3 py-1.5">{r.installation_base.install_year}</td>
                    <td className="px-3 py-1.5">{r.report_year}</td>
                    <td className="px-3 py-1.5 text-right">{r.installation_base.installed_count.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right">{r.active_count.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right">{r.inactive_count.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right">{(r.active_rate * 100).toFixed(1)}%</td>
                    <td className="px-3 py-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${r.status === 'Locked' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
