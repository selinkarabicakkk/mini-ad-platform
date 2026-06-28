# Mini Ad Platform

## Overview

A B2B campaign management platform for tracking ad budgets and recording impressions. The backend enforces atomic budget deduction under concurrent load — hundreds of simultaneous impression requests cannot double-spend budget. The frontend provides a dashboard for creating and monitoring campaigns in real time.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.22, chi router, pgx/v5, PostgreSQL 15 |
| Frontend | React 19, TypeScript, Vite, TanStack Query v5, React Hook Form, Zod, Tailwind CSS v4 |
| Infrastructure | Docker Compose, nginx |
| Load test | k6 |

## Architecture Decisions

### Race Condition Safety

The impression endpoint (`POST /api/impression/:id`) is designed to be safe under hundreds of concurrent requests. It uses a single atomic SQL statement with no read-before-write:

```sql
UPDATE campaigns
SET budget = budget - 1,
    status = CASE WHEN budget - 1 <= 0 THEN 'paused' ELSE status END
WHERE id = $1 AND budget > 0 AND deleted_at IS NULL
RETURNING id, budget, status
```

**Why not SELECT then UPDATE?** Any gap between the SELECT and the UPDATE creates a window where two concurrent goroutines can both read `budget = 1`, both decide to proceed, and both write — spending one unit of budget twice. The single-statement approach eliminates this window entirely. The `WHERE budget > 0` guard ensures the update only succeeds if budget remains positive at the moment of write, and `RETURNING` confirms whether the row was actually modified (zero rows returned = budget was already 0 = 409 Conflict).

### Soft Delete

Campaigns are never physically removed. A `deleted_at TIMESTAMPTZ` column marks deletion, and every query includes `WHERE deleted_at IS NULL`. This preserves the audit trail and prevents foreign-key or reference issues with historical impression data.

### Layer Structure

```
HTTP request
    ↓
handler  — parses request, validates input, writes HTTP response
    ↓
service  — enforces business rules, orchestrates calls
    ↓
repository — executes SQL, owns atomicity guarantees
```

Each layer owns a clear concern. The handler never writes SQL. The repository never knows about HTTP. Business invariants (budget must never go negative) live at the database level via SQL constraints and atomic writes — not in application code where concurrent goroutines can race.

### Why No ORM

Raw SQL via pgx gives full control over every statement. The atomic impression deduction requires a `CASE WHEN budget - 1 <= 0 THEN 'paused'` expression inline inside the `SET` clause — something an ORM cannot express or would silently rewrite into a two-step read/update. pgx also provides direct access to `pgconn.PgError` for distinguishing constraint violations, and `pgx.ErrNoRows` for detecting zero-row updates without an extra query.

## Quick Start (Docker)

```bash
git clone https://github.com/selinkarabicakkk/mini-ad-platform.git
cd mini-ad-platform
cp .env.example .env
docker-compose up --build
```

Open **http://localhost:5173** for the dashboard. The API is available at **http://localhost:8080/api**.

On first start, PostgreSQL automatically applies `backend/migrations/001_init.sql` from `/docker-entrypoint-initdb.d/`.

## Manual Setup

### Backend

**Prerequisites:** Go 1.22+, PostgreSQL 15 running locally.

```bash
cd backend
go mod download

export DATABASE_URL="postgres://postgres:postgres@localhost:5432/mini_ad_platform?sslmode=disable"
export PORT=8080

go run ./cmd/server
```

Apply the schema before first run:
```bash
psql $DATABASE_URL -f migrations/001_init.sql
```

### Frontend

**Prerequisites:** Node 20+.

```bash
cd frontend
npm install

# Point at your backend
export VITE_API_URL=http://localhost:8080/api

npm run dev
```

Open **http://localhost:5173**.

## API Reference

All responses use `Content-Type: application/json`. Errors return `{"error": "message"}`.

| Method | Path | Description | Success | Errors |
|--------|------|-------------|---------|--------|
| `GET` | `/api/campaigns` | List all campaigns. Optional `?status=active\|paused\|completed` filter. | 200 | 422, 500 |
| `POST` | `/api/campaigns` | Create a campaign. Body: `{title, budget, start_date, end_date, status?}` | 201 | 422, 500 |
| `GET` | `/api/campaigns/:id` | Get a single campaign by ID. | 200 | 404, 500 |
| `PUT` | `/api/campaigns/:id` | Update a campaign. Body: any subset of create fields. | 200 | 404, 422, 500 |
| `DELETE` | `/api/campaigns/:id` | Soft-delete a campaign. | 204 | 404, 500 |
| `POST` | `/api/impression/:id` | Record one impression — atomically deducts 1 from budget. Returns `{"remaining_budget": n}`. | 200 | 404, 409, 500 |
| `GET` | `/api/stats/:id` | Get campaign stats. Returns `{total_impressions, spent_budget, remaining_budget}`. | 200 | 404, 500 |

**409 Conflict** on `POST /api/impression/:id` means budget is exhausted — this is expected behavior under load, not an error.

## Running Tests

```bash
cd backend

# Unit and integration tests
go test ./...

# With race detector (recommended before shipping)
go test -race ./...
```

The concurrent impression test (`TestRecordImpression_Concurrent`) launches 100 goroutines against a budget-50 mock and asserts exactly 50 succeed and 50 return `ErrBudgetExhausted` — zero other outcomes.

## Load Test

```bash
brew install k6

# Start the full stack first
docker-compose up --build

# Get a campaign ID from the UI or API, then:
k6 run \
  -e CAMPAIGN_ID=<your-campaign-uuid> \
  -e BASE_URL=http://localhost:8080 \
  load-test/impression_load.js
```

The script ramps to 200 virtual users over 10 seconds, holds for 30 seconds, then ramps down. Every response must be `200` (impression recorded) or `409` (budget exhausted). Any `500` fails the `unexpected_errors` threshold and causes the test to exit non-zero — proving the atomic UPDATE holds under real concurrent load.

See `load-test/README.md` for full details on interpreting results.
