# Mini Ad Platform

## Project Purpose
Campaign management platform. Backend Go, Frontend React + TypeScript.

## Architecture
Monorepo: /backend (Go) + /frontend (React + TS) + docker-compose at root.

## Tech Stack
- Backend: Go 1.22, chi router, pgx/v5, PostgreSQL 15
- Frontend: React 18, TypeScript, Vite, TanStack Query v5, React Hook Form, Zod, Tailwind CSS
- Load test: k6

## Critical Rules — NEVER VIOLATE
1. Budget must NEVER go negative under any condition.
2. Use single atomic UPDATE for impression deduction — no SELECT then UPDATE.
3. All campaign queries must include WHERE deleted_at IS NULL (soft delete).
4. No ORM — raw SQL via pgx only.
5. Never physically delete campaigns — soft delete only.

## Commit Convention
type(scope): description
Types: feat, fix, refactor, test, chore, docs

## Testing
- Backend: ./...
- Load test: k6 run load-test/impression_load.js

## Environment
Copy .env.example to .env before starting.
Run everything: docker-compose up --build

## Session Logging
- After every completed feature, append a log entry to ai_session/session_01.md
- Log format: ### Prompt N — Feature Name, then: Prompt, Outcome, AI Decision or Error, My Fix
- All log entries in English
- Log must be updated before every commit
