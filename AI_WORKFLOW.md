# AI Workflow

## Tools Used

- **Claude Code** (claude-sonnet-4-6) — plan mode for every feature, auto-approved read-only operations, manual approval for all writes and commits
- **Session logs:** see `ai_session/session_01.md` for the full prompt-by-prompt record

## How I Used AI

Every feature followed the same pattern: enter plan mode → AI explores the codebase and writes a plan file → I review the plan → approve or reject → AI executes. No code was written until the plan was explicitly approved.

For critical invariants (atomic budget deduction, soft delete, no ORM), I encoded the constraints in `CLAUDE.md` before any code was written. This meant the AI had the rules as hard constraints rather than suggestions it could trade off against convenience. `/clear` was run between major phases (backend → frontend → Docker) to avoid context drift.

The full prompt history with outcomes is in `ai_session/session_01.md`.

## Where AI Was Wrong — and What I Fixed

### 1. Race Condition Approach (Most Critical)

This is the most important correctness requirement in the project. Without the explicit rule in `CLAUDE.md`, an AI generating a budget deduction could reasonably produce:

```go
// WRONG — classic TOCTOU race condition
campaign, err := repo.GetByID(ctx, id)   // read
if campaign.Budget <= 0 { return ErrBudgetExhausted }
repo.Update(ctx, id, budget-1)            // write — gap here
```

Between the SELECT and the UPDATE, two concurrent goroutines can both read `budget = 1`, both pass the check, and both write — spending one unit twice. This is a time-of-check/time-of-use (TOCTOU) race.

The rule in `CLAUDE.md` required a single atomic SQL statement:

```sql
UPDATE campaigns
SET budget = budget - 1,
    status = CASE WHEN budget - 1 <= 0 THEN 'paused' ELSE status END
WHERE id = $1 AND budget > 0 AND deleted_at IS NULL
RETURNING id, budget, status
```

The `WHERE budget > 0` guard and the `UPDATE` happen atomically inside PostgreSQL. If `budget` reached 0 between two concurrent requests, only one UPDATE succeeds (returns a row); the other returns zero rows → `ErrBudgetExhausted`. The `RETURNING` clause tells us which outcome happened without an extra query.

**Result:** AI implemented this correctly because it was a hard constraint in `CLAUDE.md`. I verified it explicitly at Prompt 4 before proceeding.

---

### 2. SERVER\_PORT vs PORT Bug

The AI-generated `docker-compose.yml` (Prompt 1) set:

```yaml
environment:
  SERVER_PORT: ${SERVER_PORT}
```

But `cmd/server/main.go` reads the `PORT` environment variable (not `SERVER_PORT`). The backend container would have started with no `PORT` set, defaulting to 8080 — which happens to work — but the env var passed was silently unused.

**Fix (Prompt 14):** Changed to `PORT: ${PORT}` in docker-compose.yml and renamed `SERVER_PORT` to `PORT` in `.env.example`.

---

### 3. Route Double-Prefix

When implementing `cmd/server/main.go` (Prompt 7), the AI noticed that `RegisterRoutes` in `campaign_handler.go` registered paths as `/api/campaigns`, `/api/campaigns/{id}`, etc. But `main.go` mounted the router under `r.Route("/api", ...)` — which would have produced `/api/api/campaigns`.

**Fix (Prompt 7):** AI caught this itself during planning and stripped the `/api` prefix from all 7 route paths in `campaign_handler.go` before generating `main.go`. The final registered URLs were unchanged.

---

### 4. initial\_budget Schema Gap

The original schema had a single `budget INTEGER` column that gets decremented on every impression. There was no way to compute total impressions consumed (initial budget - current budget) because the starting value was lost.

**Fix (Prompt 4):** AI identified this gap proactively and added an `initial_budget INTEGER NOT NULL DEFAULT 0` column to both the migration SQL and the Go model. This was the correct call — accepted.

---

### 5. React Hook Form Three-Generic Signature

When implementing the New Campaign form (Prompt 11), the first build failed:

```
Type 'Resolver<{ budget: unknown; ... }>' is not assignable to type 'Resolver<{ budget: number; ... }>'
```

The cause: `z.coerce.number()` splits Zod's schema into separate input type (`unknown`) and output type (`number`). A single-type `useForm<FormValues>` cannot reconcile this — React Hook Form expects the generic to describe both field values and transformed values.

**Fix (Prompt 11):** AI corrected immediately after the build failure by splitting into explicit input/output types:

```ts
type FormInput  = z.input<typeof schema>   // budget: unknown (raw input)
type FormValues = z.output<typeof schema>  // budget: number (after coerce)

useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(schema) })
```

No manual intervention needed — AI diagnosed and fixed on the same turn.

---

### 6. PATCH vs PUT

The initial `src/api/campaigns.ts` scaffold (Prompt 9) used `api.patch(...)` for `updateCampaign`. The backend route is `PUT /api/campaigns/:id`.

**Fix (Prompt 10):** Caught by me when reading the new prompt requirements. One-line fix: `patch` → `put`.

---

### 7. Non-interactive Vite Scaffolding

`npm create vite@latest . -- --template react-ts` cancelled silently when run in a non-interactive shell (the `@clack/prompts` library used by create-vite requires a TTY).

**Fix (Prompt 9):** AI scaffolded into `/tmp/mini-ad-frontend` first (which worked because it's a new directory, not an existing one), then copied the output into `frontend/`. Workaround was clean and left no artifacts.

## What AI Did Well

- **Proactive correctness checks.** The double-prefix bug (Prompt 7), initial_budget gap (Prompt 4), and `go test -race` inclusion (Prompt 8) were all AI-identified improvements that weren't in the prompt.
- **Maintained CLAUDE.md constraints consistently.** Once the atomic SQL rule was written down, AI never deviated from it across the repository layer, service layer, tests, and documentation.
- **Session log discipline.** After the rule was added to CLAUDE.md in Prompt 5, every subsequent prompt included a session log entry without being reminded.
- **Self-correction on build failures.** The Zod/React Hook Form type error (Prompt 11) was diagnosed and fixed on the same turn without any hints.
- **Race detector by default.** `go test -race ./...` was included in the test suite unprompted — appropriate for a system specifically designed to handle concurrent writes safely.

## Code Ownership Split

| Decision | Owner |
|----------|-------|
| Stack selection (Go, chi, pgx, React, TanStack Query, Tailwind) | Me |
| Atomic SQL constraint — no SELECT+UPDATE, use RETURNING | Me (via CLAUDE.md) |
| Soft delete rule — never physical delete | Me (via CLAUDE.md) |
| No ORM — raw pgx only | Me (via CLAUDE.md) |
| Budget never goes negative — DB-level constraint | Me (via CLAUDE.md) |
| Plan review and approval before every execution | Me |
| initial_budget column addition | AI (accepted) |
| Typed UpdateCampaignParams over map[string]any | AI (accepted) |
| Secondary GetCampaign on impression error path | AI (accepted) |
| nginx proxy architecture in Docker | AI (accepted) |
| All Go, TypeScript, SQL, YAML code (~90% of lines) | AI |

The honest summary: AI wrote almost all the code, but the correctness properties that matter most — race-safe budget deduction, data integrity — were enforced through explicit rules written before any code was generated. The AI's job was to implement those rules correctly, which it did. My job was to define the constraints, review the plans, and catch the cases where the AI's output diverged from intent.

## AI Session Logs

Full prompt-by-prompt history: `ai_session/session_01.md`

14 prompts total, covering: project structure, database schema, Go module + model, repository (atomic budget deduction), service layer, HTTP handlers, main server, tests, frontend scaffold, campaign list page, new campaign form, campaign detail page, k6 load test, Docker setup, migrations, README, and this document.
