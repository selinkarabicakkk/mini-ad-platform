# AI Context — Mini Ad Platform Case Study

## Project
Mini Campaign Management Platform. Take-home case study for an AI-Native Full Stack Developer role at a retail media company.

## Stack Decisions
- Backend: Go 1.22, chi router, pgx/v5, PostgreSQL 15
- Frontend: React 18, TypeScript, Vite, TanStack Query v5, React Hook Form, Zod, Tailwind CSS
- Load test: k6
- Infrastructure: Docker Compose

## Why These Choices
- chi: lightweight, stdlib-compatible, no magic
- pgx direct (no ORM): full control over SQL, critical for atomic race condition handling
- TanStack Query: handles cache + polling for live stats naturally
- Zod: runtime validation co-located with TypeScript types

## Critical Constraints
1. Budget NEVER goes negative — enforced at DB level with atomic UPDATE
2. Soft delete only — deleted_at column, never physical DELETE
3. Campaign status auto-transitions to 'paused' when budget hits 0
4. POST /impression/:id must be safe under hundreds of concurrent requests

## Race Condition Approach
Sitomic SQL statement — no SELECT+UPDATE pattern:
  UPDATE campaigns
  SET budget = budget - 1,
      status = CASE WHEN budget - 1 <= 0 THEN 'paused' ELSE status END
  WHERE id = $1 AND budget > 0 AND deleted_at IS NULL
  RETURNING id, budget, status;
If 0 rows affected → return 409 Conflict (budget exhausted).

## Out of Scope
Auth, payments, multnancy, advanced analytics.
