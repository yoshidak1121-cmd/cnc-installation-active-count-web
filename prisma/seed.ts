import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import bcrypt from 'bcryptjs'

import 'dotenv/config'

const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
const adapter = new PrismaLibSql({ url })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database…')

  // Users
  const hashStaff = await bcrypt.hash('staff123', 10)
  const hashHq = await bcrypt.hash('hq123', 10)
  const hashAdmin = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({ where: { username: 'site_staff_jp' }, update: {}, create: { username: 'site_staff_jp', password: hashStaff, role: 'site_staff', site_code: 'JP001' } })
  await prisma.user.upsert({ where: { username: 'hq_user' }, update: {}, create: { username: 'hq_user', password: hashHq, role: 'hq_staff' } })
  await prisma.user.upsert({ where: { username: 'admin_user' }, update: {}, create: { username: 'admin_user', password: hashAdmin, role: 'admin' } })

  // InstallationBase records
  const jp_total = await prisma.installationBase.upsert({
    where: { base_id: 'seed-jp-total' },
    update: {},
    create: { base_id: 'seed-jp-total', site_code: 'JP001', country: 'Japan', install_year: 2020, data_granularity: 'Total', installed_count: 50, installed_count_accuracy: 'confirmed' },
  })
  const jp_mtb = await prisma.installationBase.upsert({
    where: { base_id: 'seed-jp-mtb' },
    update: {},
    create: { base_id: 'seed-jp-mtb', site_code: 'JP001', country: 'Japan', install_year: 2020, data_granularity: 'MTB', machine_builder: 'FANUC', installed_count: 30, installed_count_accuracy: 'confirmed' },
  })
  const us_total = await prisma.installationBase.upsert({
    where: { base_id: 'seed-us-total' },
    update: {},
    create: { base_id: 'seed-us-total', site_code: 'US001', country: 'USA', install_year: 2019, data_granularity: 'Total', installed_count: 40, installed_count_accuracy: 'estimated' },
  })
  const us_nc = await prisma.installationBase.upsert({
    where: { base_id: 'seed-us-nc' },
    update: {},
    create: { base_id: 'seed-us-nc', site_code: 'US001', country: 'USA', install_year: 2019, data_granularity: 'NCSeries', nc_series: '30i', installed_count: 40, installed_count_accuracy: 'estimated' },
  })
  const de_total = await prisma.installationBase.upsert({
    where: { base_id: 'seed-de-total' },
    update: {},
    create: { base_id: 'seed-de-total', site_code: 'DE001', country: 'Germany', install_year: 2021, data_granularity: 'Total', installed_count: 25, installed_count_accuracy: 'confirmed' },
  })
  const de_area = await prisma.installationBase.upsert({
    where: { base_id: 'seed-de-area' },
    update: {},
    create: { base_id: 'seed-de-area', site_code: 'DE001', country: 'Germany', install_year: 2021, data_granularity: 'Area', area: 'Europe', installed_count: 25, installed_count_accuracy: 'estimated' },
  })

  console.log('Created 3 users and 6 installation bases')

  // Helper to create active maintenance records
  async function createMaintenance(
    baseId: string,
    installedCount: number,
    year: number,
    activeCount: number,
    previousActive: number | null,
    method: string,
    accuracy: string,
    status: string,
    confirmedBy: string,
    changeReason?: string
  ) {
    const id = `seed-am-${baseId}-${year}`
    const inactiveCount = installedCount - activeCount
    const activeRate = installedCount > 0 ? activeCount / installedCount : 0
    const differenceFromPrevious = previousActive != null ? activeCount - previousActive : null
    const differenceRate = previousActive != null && previousActive > 0 ? differenceFromPrevious! / previousActive : null

    await prisma.activeMaintenance.upsert({
      where: { maintenance_id: id },
      update: {},
      create: {
        maintenance_id: id,
        base_id: baseId,
        report_year: year,
        previous_active_count: previousActive,
        active_count: activeCount,
        inactive_count: inactiveCount,
        active_rate: activeRate,
        difference_from_previous: differenceFromPrevious,
        difference_rate: differenceRate,
        active_count_method: method,
        active_count_accuracy: accuracy,
        status_confirmed_date: `${year}-03-31`,
        confirmed_by: confirmedBy,
        change_reason: changeReason ?? null,
        status,
      },
    })
    return id
  }

  // JP Total maintenance records
  await createMaintenance(jp_total.base_id, 50, 2022, 38, null, 'confirmed_by_site', 'confirmed', 'Locked', 'Tanaka')
  await createMaintenance(jp_total.base_id, 50, 2023, 40, 38, 'confirmed_by_site', 'confirmed', 'Locked', 'Tanaka')
  await createMaintenance(jp_total.base_id, 50, 2024, 42, 40, 'confirmed_by_site', 'confirmed', 'Draft', 'Tanaka')

  // JP MTB maintenance records
  await createMaintenance(jp_mtb.base_id, 30, 2022, 22, null, 'confirmed_by_site', 'confirmed', 'Locked', 'Tanaka')
  await createMaintenance(jp_mtb.base_id, 30, 2023, 24, 22, 'confirmed_by_site', 'confirmed', 'Submitted', 'Tanaka')

  // US Total maintenance records
  await createMaintenance(us_total.base_id, 40, 2022, 28, null, 'estimated_by_active_rate', 'site_estimated', 'Locked', 'Smith')
  await createMaintenance(us_total.base_id, 40, 2023, 18, 28, 'estimated_by_active_rate', 'site_estimated', 'Submitted', 'Smith')
  await createMaintenance(us_total.base_id, 40, 2024, 30, 28, 'estimated_by_active_rate', 'site_estimated', 'Draft', 'Smith', 'New survey conducted')

  // US NC maintenance
  await createMaintenance(us_nc.base_id, 40, 2022, 28, null, 'calculated_from_status', 'confirmed', 'Locked', 'Smith')
  await createMaintenance(us_nc.base_id, 40, 2023, 30, 28, 'calculated_from_status', 'confirmed', 'Locked', 'Smith')

  // DE Total maintenance
  await createMaintenance(de_total.base_id, 25, 2022, 18, null, 'confirmed_by_site', 'confirmed', 'Locked', 'Mueller')
  await createMaintenance(de_total.base_id, 25, 2023, 20, 18, 'confirmed_by_site', 'confirmed', 'Locked', 'Mueller')
  await createMaintenance(de_total.base_id, 25, 2024, 21, 20, 'confirmed_by_site', 'hq_estimated', 'Submitted', 'Mueller')

  // DE Area maintenance
  await createMaintenance(de_area.base_id, 25, 2023, 20, null, 'estimated_by_active_rate', 'hq_estimated', 'Draft', 'Mueller')

  console.log('Created active maintenance records')
  console.log('Seeding complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
