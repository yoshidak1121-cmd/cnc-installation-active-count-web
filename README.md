# CNC Installation Active Count Web

A Next.js 14 web application for tracking CNC machine installation data and active maintenance counts across multiple sites.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **ORM**: Prisma with SQLite
- **Auth**: Cookie-based session (bcryptjs)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

The default value uses a local SQLite file:

```env
DATABASE_URL="file:./dev.db"
```

### 3. Create database schema

```bash
npx prisma db push
```

### 4. Seed initial data

```bash
npx prisma db seed
```

This creates:
- 3 users (see below)
- 6 installation base records (JP001, US001, DE001)
- Active maintenance records for 2022–2024

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Default Users

| Username | Password | Role | Site |
|---|---|---|---|
| `site_staff_jp` | `staff123` | site_staff | JP001 |
| `hq_user` | `hq123` | hq_staff | — |
| `admin_user` | `admin123` | admin | — |

## Features

### Installation Data (`/installation`)
- View, add, edit, delete installation base records
- Filter by site code, country, granularity
- CSV import / export
- Granularity types: Total, MTB (by machine builder), NCSeries, Area

### Active Maintenance (`/active-maintenance`)
- Enter active count data by year per installation base
- Auto-calculates: inactive_count, active_rate, difference from previous year
- Status workflow: Draft → Submitted → Locked
- Copy records from previous year (bulk)

### Input Check (`/input-check`)
- Validates all records and shows errors, warnings, info items
- Checks: missing required fields, active count > installed count, active rate < 5%, year-over-year change ≥ 20% without reason

### Aggregate Report (`/report`) — hq_staff, admin
- Summary by country/year from submitted+locked records
- Detail record view
- CSV export

## Role Permissions

| Feature | site_staff | hq_staff | admin |
|---|---|---|---|
| View own site data | ✓ | ✓ | ✓ |
| View all sites | — | ✓ | ✓ |
| Submit records | ✓ | — | — |
| Lock records | — | ✓ | ✓ |
| View report | — | ✓ | ✓ |

## API Routes

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/installation` | List/create installations |
| PUT/DELETE | `/api/installation/[id]` | Update/delete installation |
| GET/POST | `/api/active-maintenance` | List/create maintenance records |
| PUT/DELETE | `/api/active-maintenance/[id]` | Update/delete |
| POST | `/api/active-maintenance/[id]/submit` | Submit |
| POST | `/api/active-maintenance/[id]/lock` | Lock |
| GET | `/api/check` | Run input validation checks |
| GET | `/api/report` | Aggregated report data |
| GET | `/api/report/export` | CSV export (type: installation\|maintenance\|report) |

## Build

```bash
npm run build
```
