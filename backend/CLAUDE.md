# Backend Context

## Language
Go 1.22+. Explicit error handling always. No panic in handlers.

## Router
chi — lightweight, stdlib-compatible.

## Database
pgx/v5 direct. No ORM. Connection pool via pgxpool.

## Race Condition — CRITICAL
Impression endpoint uses ONE atomic UPDATE:

  UPDATE campaigns
  SET budget = budget - 1,
      status = CASE WHEN budget - 1 <= 0 THEN 'paused' ELSE status END
  WHERE id = $1 AND budget > 0 AND deleted_at IS NULL
  RETURNING id, budget, status;

If 0 rows affected → 409 Conflict. NEVER use SELECT then UPDATE.

## Soft Delete
All tables: deleted_at TIMESTAMP NULL.
All SELECT queries: WHERE deleted_at IS NULL.
DELETE = UPDATE SET deleted_at = NOW().

## Error Responses
Always JSON: {"error": "message"}
Status codes: 404 not found, 409 conflict, 422 validation, 500 server error.

## Layer Structure
handler → service → repository
- handler: HTTP only, no business logic
- service: business logic
- repository: SQL only, returns domain models
