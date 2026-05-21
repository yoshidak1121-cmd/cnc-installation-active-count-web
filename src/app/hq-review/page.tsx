'use client'

import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'

interface MaintenanceRecord {
  maintenance_id: string
  base_id: string
  report_year: number
  active_count: number
  inactive_count: number
  active_rate: number
  previous_active_count: number | null
  active_count_method: string
  active_count_accuracy: string
  status_confirmed_date: string
  confirmed_by: string | null
  change_reason: string | null
  status: string
  note: string | null
  installation_base: {
    site_code: string
    country: string
    install_year: number
    data_granularity: string
    installed_count: number
  }
  issues: { issue_id: string; issue_type: string; issue_detail: string; status: string }[]
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Submitted: 'bg-blue-100 text-blue-700',
  Approved: 'bg-green-100 text-green-700',
  Returned: 'bg-red-100 text-red-700',
  Locked: 'bg-purple-100 text-purple-700',
}

export default function HqReviewPage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSite, setFilterSite] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterStatus, setFilterStatus] = useState('Submitted')
  const [userRole, setUserRole] = useState('')
  const [returnModal, setReturnModal] = useState<{ id: string } | null>(null)
  const [returnForm, setReturnForm] = useState({ issue_type: '', issue_detail: '' })
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUserRole(d?.user?.role ?? ''))
  }, [])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterSite) params.set('site_code', filterSite)
    if (filterYear) params.set('report_year', filterYear)
    if (filterStatus) params.set('status', filterStatus)
    const res = await fetch(`/api/active-maintenance?${params}`)
    if (res.ok) {
      const all: MaintenanceRecord[] = await res.json()
      setRecords(filterStatus ? all.filter(r => r.status === filterStatus) : all)
    }
    setLoading(false)
  }, [filterSite, filterYear, filterStatus])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  async function handleApprove(id: string) {
    const res = await fetch(`/api/active-maintenance/${id}/approve`, { method: 'POST' })
    if (res.ok) { fetchRecords(); setMessage('Approved'); setTimeout(() => setMessage(''), 2000) }
    else { const d = await res.json(); alert(d.error) }
  }

  async function openReturn(id: string) {
    setReturnModal({ id })
    setReturnForm({ issue_type: '', issue_detail: '' })
  }

  async function submitReturn() {
    if (!returnModal) return
    if (!returnForm.issue_type || !returnForm.issue_detail) { alert('Both fields required'); return }
    const res = await fetch(`/api/active-maintenance/${returnModal.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(returnForm),
    })
    if (res.ok) {
      setReturnModal(null)
      fetchRecords()
      setMessage('Returned with issue logged')
      setTimeout(() => setMessage(''), 3000)
    } else {
      const d = await res.json(); alert(d.error)
    }
  }

  async function handleLock(id: string) {
    const res = await fetch(`/api/active-maintenance/${id}/lock`, { method: 'POST' })
    if (res.ok) { fetchRecords(); setMessage('Locked'); setTimeout(() => setMessage(''), 2000) }
    else { const d = await res.json(); alert(d.error) }
  }

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)
  const isAdmin = userRole === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">HQ Review</h1>

        {message && <div className="mb-4 bg-green-50 border border-green-300 text-green-700 rounded px-4 py-2 text-sm">{message}</div>}

        <div className="flex gap-3 mb-4">
          <input placeholder="Filter site code" value={filterSite} onChange={e => setFilterSite(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm w-40" />
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
            <option value="">All years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
            <option value="">All statuses</option>
            {['Draft','Submitted','Approved','Returned','Locked'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                {['Site','Country','Yr','Gran','Installed','Active','Rate','Method','Accuracy','Date','Status','Issues','Actions'].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={13} className="text-center py-8 text-gray-400">Loading…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-8 text-gray-400">No records found</td></tr>
              ) : records.map(r => {
                const canApproveReturn = ['Submitted', 'Under Review'].includes(r.status)
                const canLock = isAdmin && r.status === 'Approved'
                return (
                  <tr key={r.maintenance_id} className="hover:bg-gray-50">
                    <td className="px-2 py-1.5 font-medium">{r.installation_base.site_code}</td>
                    <td className="px-2 py-1.5">{r.installation_base.country}</td>
                    <td className="px-2 py-1.5">{r.report_year}</td>
                    <td className="px-2 py-1.5">{r.installation_base.data_granularity}</td>
                    <td className="px-2 py-1.5 text-right">{r.installation_base.installed_count}</td>
                    <td className="px-2 py-1.5 text-right">{r.active_count}</td>
                    <td className="px-2 py-1.5 text-right">{(r.active_rate * 100).toFixed(1)}%</td>
                    <td className="px-2 py-1.5">{r.active_count_method}</td>
                    <td className="px-2 py-1.5">{r.active_count_accuracy}</td>
                    <td className="px-2 py-1.5">{r.status_confirmed_date}</td>
                    <td className="px-2 py-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      {r.issues.length > 0 && (
                        <span className="text-xs text-red-600 font-medium">{r.issues.length} issue{r.issues.length > 1 ? 's' : ''}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex gap-1 flex-wrap">
                        {canApproveReturn && (
                          <>
                            <button onClick={() => handleApprove(r.maintenance_id)} className="text-xs text-green-600 hover:underline">Approve</button>
                            <button onClick={() => openReturn(r.maintenance_id)} className="text-xs text-red-500 hover:underline">Return</button>
                          </>
                        )}
                        {canLock && (
                          <button onClick={() => handleLock(r.maintenance_id)} className="text-xs text-purple-600 hover:underline">Lock</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>

      {returnModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Return Record</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Issue Type *</label>
                <input value={returnForm.issue_type} onChange={e => setReturnForm({ ...returnForm, issue_type: e.target.value })}
                  placeholder="e.g. DataError, MissingInfo"
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Issue Detail *</label>
                <textarea value={returnForm.issue_detail} onChange={e => setReturnForm({ ...returnForm, issue_detail: e.target.value })}
                  placeholder="Describe the issue…"
                  className="w-full border rounded px-3 py-2 text-sm" rows={4} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setReturnModal(null)} className="px-4 py-2 rounded border text-sm">Cancel</button>
              <button onClick={submitReturn} className="px-4 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-500">Return</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
