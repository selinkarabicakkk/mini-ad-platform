# Session 01 — 2026-06-28

## Overview
Building the Mini Ad Platform backend in Go. Using Claude Code (claude-sonnet-4-6).

## Prompts & Outcomes

### Prompt 1 — Project Structure
**Prompt:** Create full project structure with CLAUDE.md files, backend skeleton, docker-compose, .env.example.
**Outcome:** 13 files/dirs created. CLAUDE.md at root and backend/, docker-compose.yml with postgres+backend+frontend, .env.example with DB vars.
**Notes:** Straightforward scaffold, no issues.

### Prompt 2 — Database Schema
**Prompt:** Implement 001_init.sql with campaigns table, constraints, indexes.
**Outcome:** Schema created with budget CHECK >= 0, deleted_at for soft delete, indexes on deleted_at and status.
**Notes:** AI correctly added pgcrypto extension for UUID generation.

### Prompt 3 — Go Module + Campaign Model
**Prompt:** Initialize Go module, install chi and pgx, implement Campaign strutcome:** go.mod, go.sum, campaign.go with CampaignStatus type and constants created.
**AI Error:** Go was not installed. AI detected this and offered to install via brew. Installed successfully and continued.
**My Fix:** N/A — AI handled it correctly.

### Prompt 4 — Campaign Repository
**Prompt:** Implement repository layer with all 7 methods including atomic DeductBudget.
**Outcome:** campaign_repository.go with interface + postgresRepo, ErrBudgetExhausted sentinel, Stats type, UpdateCampaignParams struct.
**AI Decision I Accepted:** AI added initial_budget column to schema because the original schema had no way to compute TotalImpressions (budget is mutable). Correct observation — accepted.
**AI Decision I Accepted:** AI used typed UpdateCampaignParams struct instead of map[string]any to avoid SQL injection risk. Correct approach — accepted.
**Critical Check:** DeductBudget uses exactly the required atomic UPDATE with RETURNING — no SELECT+UPDATE pattern. Verified correct.

### Prompt 5 — Campaign Service Layer
**Prompt:** Implement service layer wrapping repository. Add session logging rule to CLAUDE.md.
**Outcome:** campaign_service.go created with 7 methods. Session logging section added to root CLAUDE.md.
**Notes:** Service is intentionally thin — all invariants enforced at DB level per architecture rules. RecordImpression propagates ErrBudgetExhausted from repository unchanged.

### Prompt 6 — HTTP Handlers
**Prompt:** Implement all HTTP handlers in campaign_handler.go using chi router. 7 endpoints including POST /impression/:id with 409/404 distinction.
**Outcome:** campaign_handler.go with CampaignHandler, RegisterRoutes, 7 handler methods, request structs, and helper functions. json tags added to model.Campaign.
**AI Decision I Accepted:** For POST /impression/:id, DeductBudget returns ErrBudgetExhausted for both "not found" and "budget is 0" cases (indistinguishable at SQL level). AI performs a secondary GetCampaign call on the error path only to distinguish 404 vs 409. Happy path (atomic deduction) is unaffected.
**AI Decision I Accepted:** chi was listed as indirect in go.mod — AI promoted it to direct via go get after the import was added to the handler.

### Prompt 7 — Main Server + Graceful Shutdown
**Prompt:** Implement cmd/server/main.go with env config, pgxpool, chi router with middleware, and graceful shutdown on SIGTERM/SIGINT.
**Outcome:** main.go implemented with full startup sequence and 30s graceful shutdown. Chi middleware stack: RequestID, RealIP, Logger, Recoverer.
**AI Fix Applied:** RegisterRoutes had /api prefix in all paths — would have double-prefixed to /api/api/... when used with r.Route("/api", ...). Stripped /api from the 7 route paths in campaign_handler.go. Final URLs unchanged.
**Notes:** DATABASE_URL is required (log.Fatal if missing). PORT defaults to 8080.

### Prompt 8 — Go Tests (Concurrent + Service)
**Prompt:** Write tests in backend/tests/ for concurrent impression deduction and basic service methods. Stdlib only.
**Outcome:** campaign_service_test.go with 3 tests. All pass including race detector (go test -race ./...).
**Notes:** Used function-field mock struct implementing CampaignRepository. TestRecordImpression_Concurrent launches 100 goroutines against a budget-50 mock; asserts exactly 50 succeed and 50 get ErrBudgetExhausted with zero other errors.

### Prompt 9 — Frontend: Vite + React + TypeScript Scaffold
**Prompt:** Scaffold frontend/ with Vite (react-ts template), install TanStack Query v5, axios, react-router-dom, react-hook-form, zod, @hookform/resolvers, tailwindcss. Configure Tailwind v4 via @tailwindcss/vite plugin. Set up QueryClientProvider in main.tsx, React Router with 3 routes in App.tsx. Create src/types/campaign.ts mirroring backend model and src/api/campaigns.ts with axios instance reading VITE_API_URL.
**Outcome:** Frontend scaffolded. All dependencies installed (87 packages, 0 vulnerabilities). TypeScript build passes (tsc -b && vite build) with no errors. 3 placeholder page components created.
**AI Decision:** `npm create vite@latest . --` cancelled when run non-interactively (create-vite uses @clack/prompts which requires a TTY). Scaffolded into /tmp/mini-ad-frontend first, then copied into frontend/. No other issues.
**Notes:** Using Tailwind v4 approach: @tailwindcss/vite plugin in vite.config.ts + @import "tailwindcss" in index.css — no tailwind.config.js needed.

### Prompt 10 — Campaign List Page + API Fix
**Prompt:** Fix updateCampaign from PATCH to PUT to match the backend route. Implement CampaignList.tsx as a full page: useQuery, table with Title/Status/Budget/Start Date/End Date/Actions columns, status colored badges (green/yellow/gray), filter tabs (All/Active/Paused/Completed), New Campaign button, View button per row, loading/error/empty states. Tailwind CSS styling.
**Outcome:** updateCampaign fixed (patch → put). CampaignList.tsx fully implemented with all required features. TypeScript build passes (tsc -b && vite build) with 0 errors.
**Notes:** Filter is client-side (one useQuery, filter the array in the component). Date formatting uses toLocaleDateString('en-CA') to get YYYY-MM-DD output from ISO strings.

### Prompt 11 — New Campaign Form Page
**Prompt:** Implement NewCampaign.tsx with React Hook Form + Zod validation (title min 1, budget coerced integer min 1, start_date/end_date required with end > start cross-field refine, status enum active|paused). useMutation calling createCampaign, navigate('/') on success, error extracted from Axios response body. Loading state on submit button.
**Outcome:** Full form implemented with all validation rules. TypeScript build passes with 0 errors.
**AI Error:** First build failed — `z.coerce.number()` causes a type mismatch between Zod's input type (`unknown`) and output type (`number`), which conflicts with `useForm<FormValues>` expecting a single type. Fixed by splitting into `z.input<typeof schema>` / `z.output<typeof schema>` and using the three-generic `useForm<FormInput, unknown, FormValues>` signature.
**My Fix:** N/A — AI detected and corrected immediately on build failure.

### Prompt 12 — Campaign Detail Page with Live Stats
**Prompt:** Implement CampaignDetail.tsx — useParams for id, useQuery for campaign data, useQuery with refetchInterval: 3000 for stats (GET /stats/:id). Display campaign heading + status badge, info card (Start Date, End Date, Initial Budget), and stats section with 3 large-number cards (Total Impressions, Spent Budget, Remaining Budget). Add getStats to api/campaigns.ts and CampaignStats to types/campaign.ts.
**Outcome:** All three files updated. TypeScript build passes with 0 errors.
**Notes:** Stats query is independent from the campaign query — shows `—` while loading, then live-updates every 3s via refetchInterval. Both queries share the same `id` from useParams.

### Prompt 13 — k6 Load Test: Concurrent Impression Endpoint
**Prompt:** Create load-test/impression_load.js targeting POST /api/impression/:id. Ramp to 200 VUs over 10s, hold 30s, ramp down. Thresholds: unexpected_errors < 1% and http_req_failed < 1%. 200 = recorded, 409 = expected exhaustion (not counted as error), anything else = unexpected error logged to console. Also create load-test/README.md.
**Outcome:** Both files created. k6 not installed locally so dry-run skipped; script uses standard k6 APIs (http, check, Rate from k6/metrics).
**Notes:** Custom Rate metric `unexpected_errors` cleanly handles both requirements ("never 500" and "error rate < 1% excluding 409s") in a single threshold. k6's check() shows per-outcome counts in the end-of-run summary without per-VU console noise.

### Prompt 14 — Docker Compose: One-Command Startup
**Prompt:** Create backend/Dockerfile (multi-stage Go), frontend/Dockerfile (node builder + nginx runtime), frontend/nginx.conf (proxy /api to backend:8080, SPA fallback). Update docker-compose.yml and .env.example. Create .env for local dev.
**Outcome:** All files created/updated. `docker compose config` validates successfully.
**AI Decision:** Frontend Dockerfile bakes VITE_API_URL=/api at build time (ARG), so browser API calls go through nginx proxy on port 5173. .env.example keeps http://localhost:8080/api for local vite dev mode.
**AI Fix Applied:** docker-compose.yml had SERVER_PORT passed to the backend container, but main.go reads PORT. Fixed to PORT. Frontend port mapping changed from 5173:5173 to 5173:80 (nginx listens on 80 inside the container).
**Notes:** Database migrations are not run automatically — must be applied manually via `docker exec` or a migration tool before first use.
