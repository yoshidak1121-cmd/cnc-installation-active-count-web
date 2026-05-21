import { calculateDerivedFields } from '@/lib/calculations'
import { validateActiveMaintenance, validateInstallationBase } from '@/lib/validations'

export interface UserSession {
  id: string
  username: string
  role: string
  site_code?: string | null
}

interface UserRecord extends UserSession {
  password: string
}

interface InstallationBase {
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
  primary_flag: boolean
  note: string | null
}

interface IssueRecord {
  issue_id: string
  maintenance_id: string
  issue_type: string
  issue_detail: string
  requested_by: string | null
  status: string
}

interface ActiveMaintenanceRecord {
  maintenance_id: string
  base_id: string
  report_year: number
  previous_active_count: number | null
  active_count: number
  inactive_count: number
  active_rate: number
  difference_from_previous: number | null
  difference_rate: number | null
  active_count_method: string
  active_count_accuracy: string
  status_confirmed_date: string
  confirmed_by: string | null
  change_reason: string | null
  status: string
  note: string | null
}

interface AppState {
  users: UserRecord[]
  installations: InstallationBase[]
  maintenances: ActiveMaintenanceRecord[]
  issues: IssueRecord[]
}

const STORAGE_KEY = 'cnc-tracker-state-v1'
const SESSION_KEY = 'cnc-tracker-session-v1'

function createSeedState(): AppState {
  return {
    users: [
      { id: 'user-site', username: 'site_staff_jp', password: 'staff123', role: 'site_staff', site_code: 'JP001' },
      { id: 'user-hq', username: 'hq_user', password: 'hq123', role: 'hq_staff', site_code: null },
      { id: 'user-admin', username: 'admin_user', password: 'admin123', role: 'admin', site_code: null },
    ],
    installations: [
      { base_id: 'seed-jp-total', site_code: 'JP001', country: 'Japan', install_year: 2020, data_granularity: 'Total', machine_builder: null, nc_series: null, area: null, installed_count: 50, primary_flag: true, installed_count_accuracy: 'confirmed', note: null },
      { base_id: 'seed-jp-mtb', site_code: 'JP001', country: 'Japan', install_year: 2020, data_granularity: 'MTB', machine_builder: 'FANUC', nc_series: null, area: null, installed_count: 30, primary_flag: false, installed_count_accuracy: 'confirmed', note: null },
      { base_id: 'seed-us-total', site_code: 'US001', country: 'USA', install_year: 2019, data_granularity: 'Total', machine_builder: null, nc_series: null, area: null, installed_count: 40, primary_flag: true, installed_count_accuracy: 'estimated', note: null },
      { base_id: 'seed-us-nc', site_code: 'US001', country: 'USA', install_year: 2019, data_granularity: 'NCSeries', machine_builder: null, nc_series: '30i', area: null, installed_count: 40, primary_flag: false, installed_count_accuracy: 'estimated', note: null },
      { base_id: 'seed-de-total', site_code: 'DE001', country: 'Germany', install_year: 2021, data_granularity: 'Total', machine_builder: null, nc_series: null, area: null, installed_count: 25, primary_flag: true, installed_count_accuracy: 'confirmed', note: null },
      { base_id: 'seed-de-area', site_code: 'DE001', country: 'Germany', install_year: 2021, data_granularity: 'Area', machine_builder: null, nc_series: null, area: 'Europe', installed_count: 25, primary_flag: false, installed_count_accuracy: 'estimated', note: null },
    ],
    maintenances: [
      { maintenance_id: 'seed-am-seed-jp-total-2022', base_id: 'seed-jp-total', report_year: 2022, previous_active_count: null, active_count: 38, inactive_count: 12, active_rate: 0.76, difference_from_previous: null, difference_rate: null, active_count_method: 'confirmed_by_site', active_count_accuracy: 'confirmed', status_confirmed_date: '2022-03-31', confirmed_by: 'Tanaka', change_reason: null, status: 'Approved', note: null },
      { maintenance_id: 'seed-am-seed-jp-total-2023', base_id: 'seed-jp-total', report_year: 2023, previous_active_count: 38, active_count: 40, inactive_count: 10, active_rate: 0.8, difference_from_previous: 2, difference_rate: 0.0526315789, active_count_method: 'confirmed_by_site', active_count_accuracy: 'confirmed', status_confirmed_date: '2023-03-31', confirmed_by: 'Tanaka', change_reason: null, status: 'Approved', note: null },
      { maintenance_id: 'seed-am-seed-jp-total-2024', base_id: 'seed-jp-total', report_year: 2024, previous_active_count: 40, active_count: 42, inactive_count: 8, active_rate: 0.84, difference_from_previous: 2, difference_rate: 0.05, active_count_method: 'confirmed_by_site', active_count_accuracy: 'confirmed', status_confirmed_date: '2024-03-31', confirmed_by: 'Tanaka', change_reason: null, status: 'Draft', note: null },
      { maintenance_id: 'seed-am-seed-jp-mtb-2022', base_id: 'seed-jp-mtb', report_year: 2022, previous_active_count: null, active_count: 22, inactive_count: 8, active_rate: 0.7333333333, difference_from_previous: null, difference_rate: null, active_count_method: 'confirmed_by_site', active_count_accuracy: 'confirmed', status_confirmed_date: '2022-03-31', confirmed_by: 'Tanaka', change_reason: null, status: 'Approved', note: null },
      { maintenance_id: 'seed-am-seed-jp-mtb-2023', base_id: 'seed-jp-mtb', report_year: 2023, previous_active_count: 22, active_count: 24, inactive_count: 6, active_rate: 0.8, difference_from_previous: 2, difference_rate: 0.0909090909, active_count_method: 'confirmed_by_site', active_count_accuracy: 'confirmed', status_confirmed_date: '2023-03-31', confirmed_by: 'Tanaka', change_reason: null, status: 'Submitted', note: null },
      { maintenance_id: 'seed-am-seed-us-total-2022', base_id: 'seed-us-total', report_year: 2022, previous_active_count: null, active_count: 28, inactive_count: 12, active_rate: 0.7, difference_from_previous: null, difference_rate: null, active_count_method: 'estimated_by_active_rate', active_count_accuracy: 'site_estimated', status_confirmed_date: '2022-03-31', confirmed_by: 'Smith', change_reason: null, status: 'Approved', note: null },
      { maintenance_id: 'seed-am-seed-us-total-2023', base_id: 'seed-us-total', report_year: 2023, previous_active_count: 28, active_count: 18, inactive_count: 22, active_rate: 0.45, difference_from_previous: -10, difference_rate: -0.3571428571, active_count_method: 'estimated_by_active_rate', active_count_accuracy: 'site_estimated', status_confirmed_date: '2023-03-31', confirmed_by: 'Smith', change_reason: null, status: 'Returned', note: null },
      { maintenance_id: 'seed-am-seed-us-total-2024', base_id: 'seed-us-total', report_year: 2024, previous_active_count: 28, active_count: 30, inactive_count: 10, active_rate: 0.75, difference_from_previous: 2, difference_rate: 0.0714285714, active_count_method: 'estimated_by_active_rate', active_count_accuracy: 'site_estimated', status_confirmed_date: '2024-03-31', confirmed_by: 'Smith', change_reason: 'New survey conducted', status: 'Draft', note: null },
      { maintenance_id: 'seed-am-seed-us-nc-2022', base_id: 'seed-us-nc', report_year: 2022, previous_active_count: null, active_count: 28, inactive_count: 12, active_rate: 0.7, difference_from_previous: null, difference_rate: null, active_count_method: 'calculated_from_status', active_count_accuracy: 'confirmed', status_confirmed_date: '2022-03-31', confirmed_by: 'Smith', change_reason: null, status: 'Locked', note: null },
      { maintenance_id: 'seed-am-seed-us-nc-2023', base_id: 'seed-us-nc', report_year: 2023, previous_active_count: 28, active_count: 30, inactive_count: 10, active_rate: 0.75, difference_from_previous: 2, difference_rate: 0.0714285714, active_count_method: 'calculated_from_status', active_count_accuracy: 'confirmed', status_confirmed_date: '2023-03-31', confirmed_by: 'Smith', change_reason: null, status: 'Approved', note: null },
      { maintenance_id: 'seed-am-seed-de-total-2022', base_id: 'seed-de-total', report_year: 2022, previous_active_count: null, active_count: 18, inactive_count: 7, active_rate: 0.72, difference_from_previous: null, difference_rate: null, active_count_method: 'confirmed_by_site', active_count_accuracy: 'confirmed', status_confirmed_date: '2022-03-31', confirmed_by: 'Mueller', change_reason: null, status: 'Locked', note: null },
      { maintenance_id: 'seed-am-seed-de-total-2023', base_id: 'seed-de-total', report_year: 2023, previous_active_count: 18, active_count: 20, inactive_count: 5, active_rate: 0.8, difference_from_previous: 2, difference_rate: 0.1111111111, active_count_method: 'confirmed_by_site', active_count_accuracy: 'confirmed', status_confirmed_date: '2023-03-31', confirmed_by: 'Mueller', change_reason: null, status: 'Approved', note: null },
      { maintenance_id: 'seed-am-seed-de-total-2024', base_id: 'seed-de-total', report_year: 2024, previous_active_count: 20, active_count: 21, inactive_count: 4, active_rate: 0.84, difference_from_previous: 1, difference_rate: 0.05, active_count_method: 'confirmed_by_site', active_count_accuracy: 'hq_estimated', status_confirmed_date: '2024-03-31', confirmed_by: 'Mueller', change_reason: null, status: 'Submitted', note: null },
      { maintenance_id: 'seed-am-seed-de-area-2023', base_id: 'seed-de-area', report_year: 2023, previous_active_count: null, active_count: 20, inactive_count: 5, active_rate: 0.8, difference_from_previous: null, difference_rate: null, active_count_method: 'estimated_by_active_rate', active_count_accuracy: 'hq_estimated', status_confirmed_date: '2023-03-31', confirmed_by: 'Mueller', change_reason: null, status: 'Draft', note: null },
    ],
    issues: [
      { issue_id: 'seed-issue-us-2023', maintenance_id: 'seed-am-seed-us-total-2023', issue_type: 'DataError', issue_detail: 'Active count dropped significantly (28→18, -36%) without change reason. Please verify and provide explanation.', requested_by: 'hq_user', status: 'Open' },
    ],
  }
}

function cloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState
}

function readState(): AppState {
  if (typeof window === 'undefined') return createSeedState()
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const seed = createSeedState()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
    return cloneState(seed)
  }
  try {
    const parsed = JSON.parse(raw) as AppState
    return cloneState(parsed)
  } catch {
    const seed = createSeedState()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
    return cloneState(seed)
  }
}

function writeState(state: AppState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function getSession(): UserSession | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserSession
  } catch {
    return null
  }
}

function setSession(session: UserSession | null) {
  if (typeof window === 'undefined') return
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY)
    return
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function getCurrentUser() {
  return getSession()
}

function unauthorized() {
  return jsonResponse(401, { error: 'Unauthorized' })
}

function forbidden() {
  return jsonResponse(403, { error: 'Forbidden' })
}

function toCsvRow(fields: unknown[]): string {
  return fields
    .map((value) => {
      const str = value == null ? '' : String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
    .join(',')
}

function byRoleSiteFilter<T extends { site_code: string }>(rows: T[], user: UserSession) {
  if (user.role === 'site_staff' && user.site_code) {
    return rows.filter((r) => r.site_code === user.site_code)
  }
  return rows
}

function withRelations(state: AppState, maintenance: ActiveMaintenanceRecord) {
  const installationBase = state.installations.find((i) => i.base_id === maintenance.base_id)
  const issues = state.issues.filter((issue) => issue.maintenance_id === maintenance.maintenance_id)
  return { ...maintenance, installation_base: installationBase!, issues }
}

interface ApiLikeResponse {
  ok: boolean
  status: number
  json: () => Promise<unknown>
  text: () => Promise<string>
}

function jsonResponse(status: number, body: unknown): ApiLikeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

function parseBody(body: BodyInit | null | undefined): unknown {
  if (!body) return {}
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      return {}
    }
  }
  return {}
}

function generateId(prefix: string) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function apiFetch(input: string, init?: RequestInit): Promise<ApiLikeResponse> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const url = new URL(input, 'http://localhost')
  const path = url.pathname

  if (path === '/api/auth/login' && method === 'POST') {
    const data = parseBody(init?.body) as { username?: string; password?: string }
    const state = readState()
    const user = state.users.find((u) => u.username === data.username)
    if (!user || user.password !== data.password) return jsonResponse(401, { error: 'Invalid credentials' })
    const session: UserSession = { id: user.id, username: user.username, role: user.role, site_code: user.site_code }
    setSession(session)
    return jsonResponse(200, { user: session })
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    setSession(null)
    return jsonResponse(200, { ok: true })
  }

  if (path === '/api/auth/me' && method === 'GET') {
    const session = getSession()
    if (!session) return jsonResponse(401, { user: null })
    return jsonResponse(200, { user: session })
  }

  const user = getSession()
  if (!user) return unauthorized()

  if (path === '/api/installation' && method === 'GET') {
    const state = readState()
    let rows = byRoleSiteFilter(state.installations, user)
    const siteCode = url.searchParams.get('site_code')
    const country = url.searchParams.get('country')
    const granularity = url.searchParams.get('data_granularity')
    if (siteCode) rows = rows.filter((r) => r.site_code === siteCode)
    if (country) rows = rows.filter((r) => r.country === country)
    if (granularity) rows = rows.filter((r) => r.data_granularity === granularity)
    rows.sort((a, b) => a.site_code.localeCompare(b.site_code) || a.install_year - b.install_year)
    return jsonResponse(200, rows)
  }

  if (path === '/api/installation' && method === 'POST') {
    const state = readState()
    const data = parseBody(init?.body) as Record<string, unknown>
    const errors = validateInstallationBase(data)
    if (errors.length > 0) return jsonResponse(400, { errors })
    const duplicate = state.installations.find(
      (r) =>
        r.site_code === data.site_code &&
        r.install_year === Number(data.install_year) &&
        r.data_granularity === data.data_granularity &&
        r.machine_builder === (data.machine_builder ?? null) &&
        r.nc_series === (data.nc_series ?? null) &&
        r.area === (data.area ?? null)
    )
    if (duplicate) return jsonResponse(409, { error: 'Duplicate record exists' })

    const record: InstallationBase = {
      base_id: generateId('base'),
      site_code: String(data.site_code),
      country: String(data.country),
      install_year: Number(data.install_year),
      data_granularity: String(data.data_granularity),
      machine_builder: (data.machine_builder as string) || null,
      nc_series: (data.nc_series as string) || null,
      area: (data.area as string) || null,
      installed_count: Number(data.installed_count),
      installed_count_accuracy: String(data.installed_count_accuracy),
      primary_flag: Boolean(data.primary_flag),
      note: (data.note as string) || null,
    }
    state.installations.push(record)
    writeState(state)
    return jsonResponse(201, record)
  }

  const installationMatch = path.match(/^\/api\/installation\/([^/]+)$/)
  if (installationMatch && method === 'PUT') {
    const baseId = installationMatch[1]
    const state = readState()
    const idx = state.installations.findIndex((r) => r.base_id === baseId)
    if (idx < 0) return jsonResponse(404, { error: 'Not found' })
    const data = parseBody(init?.body) as Record<string, unknown>
    const errors = validateInstallationBase(data)
    if (errors.length > 0) return jsonResponse(400, { errors })
    state.installations[idx] = {
      ...state.installations[idx],
      site_code: String(data.site_code),
      country: String(data.country),
      install_year: Number(data.install_year),
      data_granularity: String(data.data_granularity),
      machine_builder: (data.machine_builder as string) || null,
      nc_series: (data.nc_series as string) || null,
      area: (data.area as string) || null,
      installed_count: Number(data.installed_count),
      installed_count_accuracy: String(data.installed_count_accuracy),
      primary_flag: Boolean(data.primary_flag),
      note: (data.note as string) || null,
    }
    writeState(state)
    return jsonResponse(200, state.installations[idx])
  }

  if (installationMatch && method === 'DELETE') {
    const baseId = installationMatch[1]
    const state = readState()
    if (state.maintenances.some((m) => m.base_id === baseId)) {
      return jsonResponse(409, { error: 'Cannot delete: active maintenance records exist' })
    }
    state.installations = state.installations.filter((r) => r.base_id !== baseId)
    writeState(state)
    return jsonResponse(200, { ok: true })
  }

  if (path === '/api/active-maintenance' && method === 'GET') {
    const state = readState()
    let rows = state.maintenances.map((m) => withRelations(state, m))
    const reportYear = url.searchParams.get('report_year')
    const siteCode = url.searchParams.get('site_code')
    const baseId = url.searchParams.get('base_id')

    if (reportYear) rows = rows.filter((r) => r.report_year === Number(reportYear))
    if (baseId) rows = rows.filter((r) => r.base_id === baseId)
    if (user.role === 'site_staff' && user.site_code) {
      rows = rows.filter((r) => r.installation_base.site_code === user.site_code)
    } else if (siteCode) {
      rows = rows.filter((r) => r.installation_base.site_code === siteCode)
    }

    rows.sort((a, b) => b.report_year - a.report_year || a.base_id.localeCompare(b.base_id))
    return jsonResponse(200, rows)
  }

  if (path === '/api/active-maintenance' && method === 'POST') {
    const state = readState()
    const data = parseBody(init?.body) as Record<string, unknown>
    const base = state.installations.find((b) => b.base_id === data.base_id)
    if (!base) return jsonResponse(404, { error: 'Installation base not found' })

    const { errors } = validateActiveMaintenance({
      ...data,
      installed_count: base.installed_count,
      install_year: base.install_year,
    })
    if (errors.length > 0) return jsonResponse(400, { errors })

    if (state.maintenances.some((r) => r.base_id === data.base_id && r.report_year === Number(data.report_year))) {
      return jsonResponse(409, { error: 'Record already exists for this base and year' })
    }

    const { inactiveCount, activeRate, differenceFromPrevious, differenceRate } = calculateDerivedFields(
      base.installed_count,
      Number(data.active_count),
      data.previous_active_count != null && data.previous_active_count !== '' ? Number(data.previous_active_count) : null
    )

    const record: ActiveMaintenanceRecord = {
      maintenance_id: generateId('maintenance'),
      base_id: String(data.base_id),
      report_year: Number(data.report_year),
      previous_active_count:
        data.previous_active_count != null && data.previous_active_count !== '' ? Number(data.previous_active_count) : null,
      active_count: Number(data.active_count),
      inactive_count: inactiveCount,
      active_rate: activeRate,
      difference_from_previous: differenceFromPrevious,
      difference_rate: differenceRate,
      active_count_method: String(data.active_count_method),
      active_count_accuracy: String(data.active_count_accuracy),
      status_confirmed_date: String(data.status_confirmed_date),
      confirmed_by: (data.confirmed_by as string) || null,
      change_reason: (data.change_reason as string) || null,
      status: 'Draft',
      note: (data.note as string) || null,
    }

    state.maintenances.push(record)
    writeState(state)
    return jsonResponse(201, withRelations(state, record))
  }

  const maintenanceMatch = path.match(/^\/api\/active-maintenance\/([^/]+)$/)
  if (maintenanceMatch && method === 'PUT') {
    const id = maintenanceMatch[1]
    const state = readState()
    const index = state.maintenances.findIndex((r) => r.maintenance_id === id)
    if (index < 0) return jsonResponse(404, { error: 'Not found' })
    const record = state.maintenances[index]
    const base = state.installations.find((b) => b.base_id === record.base_id)
    if (!base) return jsonResponse(404, { error: 'Installation base not found' })

    if (user.role === 'site_staff' && !['Draft', 'Returned'].includes(record.status)) {
      return jsonResponse(403, { error: 'Cannot edit record in current status' })
    }

    const data = parseBody(init?.body) as Record<string, unknown>
    const { errors } = validateActiveMaintenance({
      ...data,
      installed_count: base.installed_count,
      install_year: base.install_year,
    })
    if (errors.length > 0) return jsonResponse(400, { errors })

    const { inactiveCount, activeRate, differenceFromPrevious, differenceRate } = calculateDerivedFields(
      base.installed_count,
      Number(data.active_count),
      data.previous_active_count != null ? Number(data.previous_active_count) : null
    )

    state.maintenances[index] = {
      ...record,
      previous_active_count: data.previous_active_count != null ? Number(data.previous_active_count) : null,
      active_count: Number(data.active_count),
      inactive_count: inactiveCount,
      active_rate: activeRate,
      difference_from_previous: differenceFromPrevious,
      difference_rate: differenceRate,
      active_count_method: String(data.active_count_method),
      active_count_accuracy: String(data.active_count_accuracy),
      status_confirmed_date: String(data.status_confirmed_date),
      confirmed_by: (data.confirmed_by as string) || null,
      change_reason: (data.change_reason as string) || null,
      note: (data.note as string) || null,
    }
    writeState(state)
    return jsonResponse(200, withRelations(state, state.maintenances[index]))
  }

  if (maintenanceMatch && method === 'DELETE') {
    const id = maintenanceMatch[1]
    const state = readState()
    const record = state.maintenances.find((r) => r.maintenance_id === id)
    if (!record) return jsonResponse(404, { error: 'Not found' })
    if (record.status !== 'Draft') return jsonResponse(403, { error: 'Only Draft records can be deleted' })
    state.maintenances = state.maintenances.filter((r) => r.maintenance_id !== id)
    state.issues = state.issues.filter((i) => i.maintenance_id !== id)
    writeState(state)
    return jsonResponse(200, { ok: true })
  }

  const submitMatch = path.match(/^\/api\/active-maintenance\/([^/]+)\/submit$/)
  if (submitMatch && method === 'POST') {
    const id = submitMatch[1]
    const state = readState()
    const record = state.maintenances.find((r) => r.maintenance_id === id)
    if (!record) return jsonResponse(404, { error: 'Not found' })
    if (!['Draft', 'Returned'].includes(record.status)) {
      return jsonResponse(400, { error: 'Only Draft or Returned records can be submitted' })
    }
    record.status = 'Submitted'
    writeState(state)
    return jsonResponse(200, record)
  }

  const approveMatch = path.match(/^\/api\/active-maintenance\/([^/]+)\/approve$/)
  if (approveMatch && method === 'POST') {
    if (user.role !== 'hq_staff' && user.role !== 'admin') return forbidden()
    const id = approveMatch[1]
    const state = readState()
    const record = state.maintenances.find((r) => r.maintenance_id === id)
    if (!record) return jsonResponse(404, { error: 'Not found' })
    if (!['Submitted', 'Under Review'].includes(record.status)) {
      return jsonResponse(400, { error: 'Record must be Submitted or Under Review to approve' })
    }
    record.status = 'Approved'
    writeState(state)
    return jsonResponse(200, record)
  }

  const returnMatch = path.match(/^\/api\/active-maintenance\/([^/]+)\/return$/)
  if (returnMatch && method === 'POST') {
    if (user.role !== 'hq_staff' && user.role !== 'admin') return forbidden()
    const id = returnMatch[1]
    const data = parseBody(init?.body) as { issue_type?: string; issue_detail?: string }
    if (!data.issue_type || !data.issue_detail) {
      return jsonResponse(400, { error: 'issue_type and issue_detail are required' })
    }
    const state = readState()
    const record = state.maintenances.find((r) => r.maintenance_id === id)
    if (!record) return jsonResponse(404, { error: 'Not found' })
    if (!['Submitted', 'Under Review'].includes(record.status)) {
      return jsonResponse(400, { error: 'Record must be Submitted or Under Review to return' })
    }
    record.status = 'Returned'
    const issue: IssueRecord = {
      issue_id: generateId('issue'),
      maintenance_id: id,
      issue_type: data.issue_type,
      issue_detail: data.issue_detail,
      requested_by: user.username,
      status: 'Open',
    }
    state.issues.push(issue)
    writeState(state)
    return jsonResponse(200, { status: 'Returned', issue })
  }

  const lockMatch = path.match(/^\/api\/active-maintenance\/([^/]+)\/lock$/)
  if (lockMatch && method === 'POST') {
    if (user.role !== 'admin') return forbidden()
    const id = lockMatch[1]
    const state = readState()
    const record = state.maintenances.find((r) => r.maintenance_id === id)
    if (!record) return jsonResponse(404, { error: 'Not found' })
    if (record.status !== 'Approved') {
      return jsonResponse(400, { error: 'Only Approved records can be locked' })
    }
    record.status = 'Locked'
    writeState(state)
    return jsonResponse(200, record)
  }

  if (path === '/api/check' && method === 'GET') {
    const state = readState()
    const items: Array<{
      type: 'error' | 'warning' | 'info'
      message: string
      site_code?: string
      base_id?: string
      maintenance_id?: string
      report_year?: number
    }> = []

    let bases = state.installations
    if (user.role === 'site_staff' && user.site_code) {
      bases = bases.filter((b) => b.site_code === user.site_code)
    }

    for (const b of bases) {
      if (!b.site_code || !b.country || !b.install_year || !b.data_granularity || b.installed_count == null || !b.installed_count_accuracy) {
        items.push({ type: 'error', message: 'Missing required fields in installation base', site_code: b.site_code, base_id: b.base_id })
      }
      if (b.data_granularity === 'MTB' && !b.machine_builder) {
        items.push({ type: 'error', message: 'MTB record missing machine builder', site_code: b.site_code, base_id: b.base_id })
      }
      if (b.data_granularity === 'NCSeries' && !b.nc_series) {
        items.push({ type: 'error', message: 'NCSeries record missing NC series', site_code: b.site_code, base_id: b.base_id })
      }
      if (b.data_granularity === 'Area' && !b.area) {
        items.push({ type: 'error', message: 'Area record missing area', site_code: b.site_code, base_id: b.base_id })
      }
    }

    let maintenances = state.maintenances
      .filter((m) => ['Draft', 'Returned'].includes(m.status))
      .map((m) => withRelations(state, m))
    if (user.role === 'site_staff' && user.site_code) {
      maintenances = maintenances.filter((m) => m.installation_base.site_code === user.site_code)
    }

    for (const m of maintenances) {
      const site = m.installation_base.site_code
      if (!m.active_count_method || !m.active_count_accuracy || !m.status_confirmed_date) {
        items.push({ type: 'error', message: 'Missing required fields in active maintenance', site_code: site, base_id: m.base_id, maintenance_id: m.maintenance_id, report_year: m.report_year })
      }
      if (m.active_count > m.installation_base.installed_count) {
        items.push({ type: 'error', message: `Active count (${m.active_count}) exceeds installed count (${m.installation_base.installed_count})`, site_code: site, base_id: m.base_id, maintenance_id: m.maintenance_id, report_year: m.report_year })
      }
      if (m.installation_base.installed_count > 0 && m.active_rate < 0.05) {
        items.push({ type: 'warning', message: `Active rate is very low (${(m.active_rate * 100).toFixed(1)}%) — please verify`, site_code: site, base_id: m.base_id, maintenance_id: m.maintenance_id, report_year: m.report_year })
      }
      if (m.previous_active_count != null && m.previous_active_count > 0) {
        const changeRate = Math.abs(m.active_count - m.previous_active_count) / m.previous_active_count
        if (changeRate >= 0.2 && (!m.change_reason || m.change_reason.trim() === '')) {
          items.push({ type: 'error', message: `Year-over-year change is ${(changeRate * 100).toFixed(0)}% but no change reason provided`, site_code: site, base_id: m.base_id, maintenance_id: m.maintenance_id, report_year: m.report_year })
        }
      }
      if (m.previous_active_count != null && m.active_count === m.previous_active_count) {
        items.push({ type: 'warning', message: 'Active count is same as previous year — please verify', site_code: site, base_id: m.base_id, maintenance_id: m.maintenance_id, report_year: m.report_year })
      }
    }

    return jsonResponse(200, items)
  }

  if (path === '/api/report' && method === 'GET') {
    if (user.role !== 'hq_staff' && user.role !== 'admin') return forbidden()
    const state = readState()
    const yearParam = url.searchParams.get('year')
    const country = url.searchParams.get('country')

    let records = state.maintenances
      .filter((r) => ['Approved', 'Locked'].includes(r.status))
      .map((r) => withRelations(state, r))
      .filter((r) => r.installation_base.primary_flag)

    if (yearParam) records = records.filter((r) => r.report_year === Number(yearParam))
    if (country) records = records.filter((r) => r.installation_base.country === country)

    const grouped = new Map<string, { country: string; year: number; total_installed: number; total_active: number; active_rate: number; record_count: number }>()
    for (const record of records) {
      const key = `${record.installation_base.country}__${record.report_year}`
      const current = grouped.get(key) ?? {
        country: record.installation_base.country,
        year: record.report_year,
        total_installed: 0,
        total_active: 0,
        active_rate: 0,
        record_count: 0,
      }
      current.total_installed += record.installation_base.installed_count
      current.total_active += record.active_count
      current.record_count += 1
      current.active_rate = current.total_installed > 0 ? current.total_active / current.total_installed : 0
      grouped.set(key, current)
    }

    return jsonResponse(200, { records, aggregated: Array.from(grouped.values()) })
  }

  if (path === '/api/report/export' && method === 'GET') {
    const state = readState()
    const type = url.searchParams.get('type') ?? 'installation'
    const yearParam = url.searchParams.get('year')
    const country = url.searchParams.get('country')
    let csv = ''

    if (type === 'installation') {
      let rows = byRoleSiteFilter(state.installations, user)
      if (country) rows = rows.filter((r) => r.country === country)
      csv = 'base_id,site_code,country,install_year,data_granularity,machine_builder,nc_series,area,installed_count,installed_count_accuracy,primary_flag,note\n'
      csv += rows
        .map((r) =>
          toCsvRow([
            r.base_id,
            r.site_code,
            r.country,
            r.install_year,
            r.data_granularity,
            r.machine_builder ?? '',
            r.nc_series ?? '',
            r.area ?? '',
            r.installed_count,
            r.installed_count_accuracy,
            r.primary_flag,
            r.note ?? '',
          ])
        )
        .join('\n')
    } else if (type === 'maintenance') {
      let rows = state.maintenances.map((m) => withRelations(state, m))
      if (yearParam) rows = rows.filter((r) => r.report_year === Number(yearParam))
      if (user.role === 'site_staff' && user.site_code) rows = rows.filter((r) => r.installation_base.site_code === user.site_code)
      csv = 'maintenance_id,base_id,site_code,country,install_year,report_year,active_count,inactive_count,active_rate,status,active_count_method,active_count_accuracy,status_confirmed_date\n'
      csv += rows
        .map((r) =>
          toCsvRow([
            r.maintenance_id,
            r.base_id,
            r.installation_base.site_code,
            r.installation_base.country,
            r.installation_base.install_year,
            r.report_year,
            r.active_count,
            r.inactive_count,
            r.active_rate.toFixed(4),
            r.status,
            r.active_count_method,
            r.active_count_accuracy,
            r.status_confirmed_date,
          ])
        )
        .join('\n')
    } else if (type === 'report') {
      let rows = state.maintenances
        .filter((r) => ['Approved', 'Locked'].includes(r.status))
        .map((r) => withRelations(state, r))
        .filter((r) => r.installation_base.primary_flag)
      if (yearParam) rows = rows.filter((r) => r.report_year === Number(yearParam))
      if (country) rows = rows.filter((r) => r.installation_base.country === country)
      csv = 'site_code,country,install_year,report_year,installed_count,active_count,inactive_count,active_rate,status\n'
      csv += rows
        .map((r) =>
          toCsvRow([
            r.installation_base.site_code,
            r.installation_base.country,
            r.installation_base.install_year,
            r.report_year,
            r.installation_base.installed_count,
            r.active_count,
            r.inactive_count,
            r.active_rate.toFixed(4),
            r.status,
          ])
        )
        .join('\n')
    }

    return jsonResponse(200, csv)
  }

  return jsonResponse(404, { error: 'Not found' })
}

export async function downloadCsvFromApi(url: string, filename: string) {
  const res = await apiFetch(url)
  if (!res.ok) {
    const data = (await res.json()) as { error?: string }
    throw new Error(data.error ?? 'Export failed')
  }
  const csv = await res.text()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}
