export function validateInstallationBase(data: {
  site_code?: string
  country?: string
  install_year?: number
  data_granularity?: string
  installed_count?: number
  installed_count_accuracy?: string
  machine_builder?: string
  nc_series?: string
  area?: string
}): string[] {
  const errors: string[] = []

  if (!data.site_code || data.site_code.trim() === '') errors.push('Site code is required')
  if (!data.country || data.country.trim() === '') errors.push('Country is required')
  if (data.install_year == null) errors.push('Install year is required')
  if (data.install_year != null && (data.install_year < 1990 || data.install_year > new Date().getFullYear())) {
    errors.push(`Install year must be between 1990 and ${new Date().getFullYear()}`)
  }
  if (!data.data_granularity || data.data_granularity.trim() === '') errors.push('Data granularity is required')
  if (data.installed_count == null) errors.push('Installed count is required')
  if (data.installed_count != null && data.installed_count < 0) errors.push('Installed count must be non-negative')
  if (!data.installed_count_accuracy || data.installed_count_accuracy.trim() === '') {
    errors.push('Installed count accuracy is required')
  }

  if (data.data_granularity === 'MTB' && (!data.machine_builder || data.machine_builder.trim() === '')) {
    errors.push('Machine builder is required for MTB granularity')
  }
  if (data.data_granularity === 'NCSeries' && (!data.nc_series || data.nc_series.trim() === '')) {
    errors.push('NC series is required for NCSeries granularity')
  }
  if (data.data_granularity === 'Area' && (!data.area || data.area.trim() === '')) {
    errors.push('Area is required for Area granularity')
  }

  return errors
}

export function validateActiveMaintenance(data: {
  report_year?: number
  active_count?: number
  active_count_method?: string
  active_count_accuracy?: string
  installed_count?: number
  install_year?: number
  previous_active_count?: number | null
}): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  if (data.report_year == null) errors.push('Report year is required')
  if (data.report_year != null && data.install_year != null && data.report_year < data.install_year) {
    errors.push('Report year cannot be before install year')
  }
  if (data.active_count == null) errors.push('Active count is required')
  if (data.active_count != null && data.active_count < 0) errors.push('Active count must be non-negative')
  if (!data.active_count_method || data.active_count_method.trim() === '') {
    errors.push('Active count method is required')
  }
  if (!data.active_count_accuracy || data.active_count_accuracy.trim() === '') {
    errors.push('Active count accuracy is required')
  }

  if (data.active_count != null && data.installed_count != null) {
    if (data.active_count > data.installed_count) {
      errors.push('Active count cannot exceed installed count')
    }

    const activeRate = data.installed_count > 0 ? data.active_count / data.installed_count : 0
    if (activeRate < 0.05 && data.installed_count > 0) {
      warnings.push('Active rate is below 5% — please verify the data')
    }
  }

  return { errors, warnings }
}
