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
