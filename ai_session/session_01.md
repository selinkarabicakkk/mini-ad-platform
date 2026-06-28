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
