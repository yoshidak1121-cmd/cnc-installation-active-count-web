'use client'

import { useEffect, useState, useCallback } from 'react'
import Navigation from '@/components/Navigation'

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else field += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { fields.push(field); field = '' }
      else field += ch
    }
  }
  fields.push(field)
  return fields
}

interface Installation {
  base_id: string
  site_code: string
  country: string
  install_year: number
  data_granularity: string
  machine_builder: string | null
  nc_series: string | null
  area: string | null
  installed_count: number
  installed_count_accuracy: string
  note: string | null
}

const EMPTY: Omit<Installation, 'base_id'> = {
  site_code: '', country: '', install_year: new Date().getFullYear(), data_granularity: 'Total',
  machine_builder: null, nc_series: null, area: null, installed_count: 0,
  installed_count_accuracy: 'confirmed', note: null,
}

const GRANULARITIES = ['Total', 'MTB', 'NCSeries', 'Area', 'Detail']
const ACCURACIES = ['confirmed', 'estimated', 'unknown']

export default function InstallationPage() {
  const [records, setRecords] = useState<Installation[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSite, setFilterSite] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterGran, setFilterGran] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Installation, 'base_id'>>(EMPTY)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterSite) params.set('site_code', filterSite)
    if (filterCountry) params.set('country', filterCountry)
    if (filterGran) params.set('data_granularity', filterGran)
    const res = await fetch(`/api/installation?${params}`)
    if (res.ok) setRecords(await res.json())
    setLoading(false)
  }, [filterSite, filterCountry, filterGran])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  function openNew() {
    setEditId(null)
    setForm(EMPTY)
    setFormErrors([])
    setShowModal(true)
  }

  function openEdit(r: Installation) {
    setEditId(r.base_id)
    setForm({ ...r })
    setFormErrors([])
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    setFormErrors([])
    const url = editId ? `/api/installation/${editId}` : '/api/installation'
    const method = editId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, install_year: Number(form.install_year), installed_count: Number(form.installed_count) }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setFormErrors(data.errors ?? [data.error ?? 'Save failed'])
      return
    }
    setShowModal(false)
    setMessage(editId ? 'Updated successfully' : 'Created successfully')
    fetchRecords()
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this record?')) return
    const res = await fetch(`/api/installation/${id}`, { method: 'DELETE' })
    if (res.ok) { fetchRecords(); setMessage('Deleted'); setTimeout(() => setMessage(''), 2000) }
    else { const d = await res.json(); alert(d.error ?? 'Delete failed') }
  }

  function handleExport() {
    window.open('/api/report/export?type=installation', '_blank')
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.trim().split('\n')
    const headers = parseCsvLine(lines[0])
    let imported = 0
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCsvLine(lines[i])
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h.trim()] = vals[idx]?.trim() ?? '' })
      const res = await fetch('/api/installation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_code: row.site_code, country: row.country, install_year: Number(row.install_year),
          data_granularity: row.data_granularity, machine_builder: row.machine_builder || null,
          nc_series: row.nc_series || null, area: row.area || null,
          installed_count: Number(row.installed_count), installed_count_accuracy: row.installed_count_accuracy,
          note: row.note || null,
        }),
      })
      if (res.ok) imported++
    }
    setMessage(`Imported ${imported} records`)
    fetchRecords()
    e.target.value = ''
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Installation Data</h1>
          <div className="flex gap-2">
            <button onClick={openNew} className="bg-blue-700 text-white px-4 py-2 rounded text-sm hover:bg-blue-600">+ Add</button>
            <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-500">Export CSV</button>
            <label className="bg-yellow-500 text-white px-4 py-2 rounded text-sm hover:bg-yellow-400 cursor-pointer">
              Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
            </label>
          </div>
        </div>

        {message && <div className="mb-4 bg-green-50 border border-green-300 text-green-700 rounded px-4 py-2 text-sm">{message}</div>}

        <div className="flex gap-3 mb-4">
          <input placeholder="Filter site code" value={filterSite} onChange={(e) => setFilterSite(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm w-40" />
          <input placeholder="Filter country" value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm w-40" />
          <select value={filterGran} onChange={(e) => setFilterGran(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
            <option value="">All granularities</option>
            {GRANULARITIES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                {['Site Code','Country','Year','Granularity','Builder','NC Series','Area','Installed','Accuracy','Note','Actions'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={11} className="text-center py-8 text-gray-400">Loading…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-8 text-gray-400">No records found</td></tr>
              ) : records.map((r) => (
                <tr key={r.base_id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{r.site_code}</td>
                  <td className="px-3 py-2">{r.country}</td>
                  <td className="px-3 py-2">{r.install_year}</td>
                  <td className="px-3 py-2">{r.data_granularity}</td>
                  <td className="px-3 py-2">{r.machine_builder ?? '—'}</td>
                  <td className="px-3 py-2">{r.nc_series ?? '—'}</td>
                  <td className="px-3 py-2">{r.area ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{r.installed_count.toLocaleString()}</td>
                  <td className="px-3 py-2">{r.installed_count_accuracy}</td>
                  <td className="px-3 py-2 text-gray-400">{r.note ?? ''}</td>
                  <td className="px-3 py-2 flex gap-1">
                    <button onClick={() => openEdit(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
                    <button onClick={() => handleDelete(r.base_id)} className="text-red-500 hover:underline text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-4">{editId ? 'Edit Installation' : 'Add Installation'}</h2>
            {formErrors.length > 0 && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-xs">
                {formErrors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {([['site_code','Site Code'],['country','Country']] as const).map(([f, label]) => (
                <div key={f}>
                  <label className="block text-xs font-medium mb-1">{label} *</label>
                  <input value={(form as Record<string, unknown>)[f] as string ?? ''}
                    onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium mb-1">Install Year *</label>
                <input type="number" value={form.install_year}
                  onChange={(e) => setForm({ ...form, install_year: Number(e.target.value) })}
                  className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Granularity *</label>
                <select value={form.data_granularity} onChange={(e) => setForm({ ...form, data_granularity: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm">
                  {GRANULARITIES.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
              {form.data_granularity === 'MTB' && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Machine Builder *</label>
                  <input value={form.machine_builder ?? ''} onChange={(e) => setForm({ ...form, machine_builder: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
              )}
              {form.data_granularity === 'NCSeries' && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">NC Series *</label>
                  <input value={form.nc_series ?? ''} onChange={(e) => setForm({ ...form, nc_series: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
              )}
              {form.data_granularity === 'Area' && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Area *</label>
                  <input value={form.area ?? ''} onChange={(e) => setForm({ ...form, area: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1">Installed Count *</label>
                <input type="number" value={form.installed_count}
                  onChange={(e) => setForm({ ...form, installed_count: Number(e.target.value) })}
                  className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Accuracy *</label>
                <select value={form.installed_count_accuracy} onChange={(e) => setForm({ ...form, installed_count_accuracy: e.target.value })}
                  className="w-full border rounded px-2 py-1.5 text-sm">
                  {ACCURACIES.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Note</label>
                <textarea value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value || null })}
                  className="w-full border rounded px-2 py-1.5 text-sm" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded border text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded bg-blue-700 text-white text-sm hover:bg-blue-600 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
