'use client'

import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import { calculateDerivedFields } from '@/lib/calculations'

interface Installation {
  base_id: string
  site_code: string
  country: string
  install_year: number
  data_granularity: string
  installed_count: number
  primary_flag: boolean
}

interface MaintenanceRecord {
  maintenance_id: string
  base_id: string
  report_year: number
  active_count: number
  inactive_count: number
  active_rate: number
  previous_active_count: number | null
  difference_from_previous: number | null
  difference_rate: number | null
  active_count_method: string
  active_count_accuracy: string
  status_confirmed_date: string
  confirmed_by: string | null
  change_reason: string | null
  status: string
  note: string | null
  installation_base: Installation
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Submitted: 'bg-blue-100 text-blue-700',
  Approved: 'bg-green-100 text-green-700',
  Returned: 'bg-red-100 text-red-700',
  Locked: 'bg-purple-100 text-purple-700',
}

const METHODS = ['confirmed_by_site', 'calculated_from_status', 'estimated_by_active_rate', 'estimated_by_age_rate', 'unknown']
const ACCURACIES = ['confirmed', 'site_estimated', 'hq_estimated', 'unknown']

function formatRate(rate: number | null | undefined): string {
  return rate != null ? `${(rate * 100).toFixed(1)}%` : '—'
}

export default function ActiveMaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [installations, setInstallations] = useState<Installation[]>([])
  const [loading, setLoading] = useState(true)
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [filterSite, setFilterSite] = useState('')
  const [userRole, setUserRole] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<MaintenanceRecord>>({})
  const [showNewModal, setShowNewModal] = useState(false)
  const [newForm, setNewForm] = useState({ base_id: '', active_count: 0, previous_active_count: '', active_count_method: 'Survey', active_count_accuracy: 'confirmed', status_confirmed_date: '', confirmed_by: '', change_reason: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [returnModal, setReturnModal] = useState<{ id: string } | null>(null)
  const [returnForm, setReturnForm] = useState({ issue_type: '', issue_detail: '' })

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUserRole(d?.user?.role ?? ''))
  }, [])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ report_year: String(reportYear) })
    if (filterSite) params.set('site_code', filterSite)
    const res = await fetch(`/api/active-maintenance?${params}`)
    if (res.ok) setRecords(await res.json())
    setLoading(false)
  }, [reportYear, filterSite])

  useEffect(() => { fetchRecords() }, [fetchRecords])
  useEffect(() => {
    fetch('/api/installation').then(r => r.ok ? r.json() : []).then(setInstallations)
  }, [])

  const isHqOrAdmin = userRole === 'hq_staff' || userRole === 'admin'
  const isSiteStaff = userRole === 'site_staff'

  function startEdit(r: MaintenanceRecord) {
    setEditId(r.maintenance_id)
    setEditForm({ ...r })
  }

  function handleEditChange(field: string, value: string | number | null) {
    const updated = { ...editForm, [field]: value }
    if (field === 'active_count' && editForm.installation_base) {
      const { inactiveCount, activeRate, differenceFromPrevious, differenceRate } = calculateDerivedFields(
        editForm.installation_base.installed_count,
        Number(value),
        editForm.previous_active_count ?? null
      )
      updated.inactive_count = inactiveCount
      updated.active_rate = activeRate
      updated.difference_from_previous = differenceFromPrevious
      updated.difference_rate = differenceRate
    }
    setEditForm(updated)
  }

  async function saveEdit() {
    if (!editId) return
    setSaving(true)
    const res = await fetch(`/api/active-maintenance/${editId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (res.ok) { setEditId(null); fetchRecords(); setMessage('Saved'); setTimeout(() => setMessage(''), 2000) }
    else { const d = await res.json(); alert((d.errors ?? [d.error]).join('\n')) }
  }

  async function handleSubmit(id: string) {
    const res = await fetch(`/api/active-maintenance/${id}/submit`, { method: 'POST' })
    if (res.ok) { fetchRecords(); setMessage('Submitted'); setTimeout(() => setMessage(''), 2000) }
    else { const d = await res.json(); alert(d.error) }
  }

  async function handleApprove(id: string) {
    const res = await fetch(`/api/active-maintenance/${id}/approve`, { method: 'POST' })
    if (res.ok) { fetchRecords(); setMessage('Approved'); setTimeout(() => setMessage(''), 2000) }
    else { const d = await res.json(); alert(d.error) }
  }

  async function handleReturn(id: string) {
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
      setMessage('Returned')
      setTimeout(() => setMessage(''), 2000)
    } else {
      const d = await res.json(); alert(d.error)
    }
  }

  async function handleLock(id: string) {
    const res = await fetch(`/api/active-maintenance/${id}/lock`, { method: 'POST' })
    if (res.ok) { fetchRecords(); setMessage('Locked'); setTimeout(() => setMessage(''), 2000) }
    else { const d = await res.json(); alert(d.error) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this draft?')) return
    const res = await fetch(`/api/active-maintenance/${id}`, { method: 'DELETE' })
    if (res.ok) { fetchRecords(); setMessage('Deleted'); setTimeout(() => setMessage(''), 2000) }
    else { const d = await res.json(); alert(d.error) }
  }

  async function handleCopyFromPrevious() {
    const prevYear = reportYear - 1
    const params = new URLSearchParams({ report_year: String(prevYear) })
    if (filterSite) params.set('site_code', filterSite)
    const res = await fetch(`/api/active-maintenance?${params}`)
    if (!res.ok) return
    const prevRecords: MaintenanceRecord[] = await res.json()
    let copied = 0
    for (const pr of prevRecords) {
      const existing = records.find(r => r.base_id === pr.base_id)
      if (existing) continue
      const base = installations.find(i => i.base_id === pr.base_id)
      if (!base) continue
      await fetch('/api/active-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_id: pr.base_id,
          report_year: reportYear,
          previous_active_count: pr.active_count,
          active_count: pr.active_count,
          active_count_method: pr.active_count_method,
          active_count_accuracy: pr.active_count_accuracy,
          status_confirmed_date: new Date().toISOString().slice(0, 10),
          confirmed_by: pr.confirmed_by ?? '',
          change_reason: '',
          note: `Copied from ${prevYear}`,
        }),
      })
      copied++
    }
    setMessage(`Copied ${copied} records from ${prevYear}`)
    fetchRecords()
  }

  async function handleCreate() {
    setSaving(true)
    const base = installations.find(i => i.base_id === newForm.base_id)
    if (!base) { alert('Select a valid installation base'); setSaving(false); return }
    const res = await fetch('/api/active-maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newForm,
        report_year: reportYear,
        active_count: Number(newForm.active_count),
        previous_active_count: newForm.previous_active_count !== '' ? Number(newForm.previous_active_count) : null,
      }),
    })
    setSaving(false)
    if (res.ok) { setShowNewModal(false); fetchRecords(); setMessage('Created'); setTimeout(() => setMessage(''), 2000) }
    else { const d = await res.json(); alert((d.errors ?? [d.error]).join('\n')) }
  }

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Active Maintenance</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowNewModal(true)} className="bg-blue-700 text-white px-4 py-2 rounded text-sm hover:bg-blue-600">+ Add Record</button>
            <button onClick={handleCopyFromPrevious} className="bg-yellow-500 text-white px-4 py-2 rounded text-sm hover:bg-yellow-400">Copy from Previous Year</button>
          </div>
        </div>

        {message && <div className="mb-4 bg-green-50 border border-green-300 text-green-700 rounded px-4 py-2 text-sm">{message}</div>}

        <div className="flex gap-3 mb-4">
          <select value={reportYear} onChange={(e) => setReportYear(Number(e.target.value))} className="border rounded px-3 py-1.5 text-sm">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {isHqOrAdmin && (
            <input placeholder="Filter site code" value={filterSite} onChange={(e) => setFilterSite(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm w-40" />
          )}
        </div>

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                {['Site','Country','Year','Granularity','Active','Inactive','Rate','Prev','Diff','Method','Accuracy','Date','Status','Actions'].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={14} className="text-center py-8 text-gray-400">Loading…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={14} className="text-center py-8 text-gray-400">No records found</td></tr>
              ) : records.map((r) => {
                const isEditing = editId === r.maintenance_id
                const canEdit = isSiteStaff && ['Draft', 'Returned'].includes(r.status)
                const canSubmit = isSiteStaff && ['Draft', 'Returned'].includes(r.status)
                const canApproveReturn = isHqOrAdmin && ['Submitted', 'Under Review'].includes(r.status)
                const canLock = userRole === 'admin' && r.status === 'Approved'
                const canDelete = r.status === 'Draft'

                return (
                  <tr key={r.maintenance_id} className="hover:bg-gray-50">
                    <td className="px-2 py-1.5 font-medium">{r.installation_base.site_code}</td>
                    <td className="px-2 py-1.5">{r.installation_base.country}</td>
                    <td className="px-2 py-1.5">{r.report_year}</td>
                    <td className="px-2 py-1.5">{r.installation_base.data_granularity}</td>
                    <td className="px-2 py-1.5 text-right">
                      {isEditing ? (
                        <input type="number" value={editForm.active_count ?? ''} onChange={e => handleEditChange('active_count', Number(e.target.value))}
                          className="w-20 border rounded px-1 py-0.5 text-xs" />
                      ) : r.active_count}
                    </td>
                    <td className="px-2 py-1.5 text-right">{isEditing ? editForm.inactive_count : r.inactive_count}</td>
                    <td className="px-2 py-1.5 text-right">{formatRate(isEditing ? (editForm.active_rate ?? r.active_rate) : r.active_rate)}</td>
                    <td className="px-2 py-1.5 text-right">{r.previous_active_count ?? '—'}</td>
                    <td className="px-2 py-1.5 text-right">{r.difference_from_previous ?? '—'}</td>
                    <td className="px-2 py-1.5">
                      {isEditing ? (
                        <select value={editForm.active_count_method ?? ''} onChange={e => handleEditChange('active_count_method', e.target.value)}
                          className="border rounded px-1 py-0.5 text-xs">
                          {METHODS.map(m => <option key={m}>{m}</option>)}
                        </select>
                      ) : r.active_count_method}
                    </td>
                    <td className="px-2 py-1.5">
                      {isEditing ? (
                        <select value={editForm.active_count_accuracy ?? ''} onChange={e => handleEditChange('active_count_accuracy', e.target.value)}
                          className="border rounded px-1 py-0.5 text-xs">
                          {ACCURACIES.map(a => <option key={a}>{a}</option>)}
                        </select>
                      ) : r.active_count_accuracy}
                    </td>
                    <td className="px-2 py-1.5">
                      {isEditing ? (
                        <input type="date" value={editForm.status_confirmed_date ?? ''} onChange={e => handleEditChange('status_confirmed_date', e.target.value)}
                          className="border rounded px-1 py-0.5 text-xs" />
                      ) : r.status_confirmed_date}
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex gap-1 flex-wrap">
                        {isEditing ? (
                          <>
                            <button onClick={saveEdit} disabled={saving} className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-500 disabled:opacity-60">Save</button>
                            <button onClick={() => setEditId(null)} className="text-xs border px-2 py-0.5 rounded">Cancel</button>
                          </>
                        ) : (
                          <>
                            {canEdit && <button onClick={() => startEdit(r)} className="text-xs text-blue-600 hover:underline">Edit</button>}
                            {canSubmit && <button onClick={() => handleSubmit(r.maintenance_id)} className="text-xs text-green-600 hover:underline">Submit</button>}
                            {canApproveReturn && (
                              <>
                                <button onClick={() => handleApprove(r.maintenance_id)} className="text-xs text-green-600 hover:underline">Approve</button>
                                <button onClick={() => handleReturn(r.maintenance_id)} className="text-xs text-red-500 hover:underline">Return</button>
                              </>
                            )}
                            {canLock && <button onClick={() => handleLock(r.maintenance_id)} className="text-xs text-purple-600 hover:underline">Lock</button>}
                            {canDelete && <button onClick={() => handleDelete(r.maintenance_id)} className="text-xs text-red-400 hover:underline">Delete</button>}
                          </>
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

      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-4">Add Active Maintenance Record ({reportYear})</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Installation Base *</label>
                <select value={newForm.base_id} onChange={e => setNewForm({ ...newForm, base_id: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">Select…</option>
                  {installations.map(i => (
                    <option key={i.base_id} value={i.base_id}>
                      {i.site_code} — {i.country} {i.install_year} ({i.data_granularity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Active Count *</label>
                <input type="number" value={newForm.active_count} onChange={e => setNewForm({ ...newForm, active_count: Number(e.target.value) })}
                  className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Previous Active Count</label>
                <input type="number" value={newForm.previous_active_count} onChange={e => setNewForm({ ...newForm, previous_active_count: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Method *</label>
                <select value={newForm.active_count_method} onChange={e => setNewForm({ ...newForm, active_count_method: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm">
                  {METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Accuracy *</label>
                <select value={newForm.active_count_accuracy} onChange={e => setNewForm({ ...newForm, active_count_accuracy: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm">
                  {ACCURACIES.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Confirmed Date *</label>
                <input type="date" value={newForm.status_confirmed_date} onChange={e => setNewForm({ ...newForm, status_confirmed_date: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Confirmed By</label>
                <input value={newForm.confirmed_by} onChange={e => setNewForm({ ...newForm, confirmed_by: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Change Reason</label>
                <input value={newForm.change_reason} onChange={e => setNewForm({ ...newForm, change_reason: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Note</label>
                <textarea value={newForm.note} onChange={e => setNewForm({ ...newForm, note: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 rounded border text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 rounded bg-blue-700 text-white text-sm hover:bg-blue-600 disabled:opacity-60">
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

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
