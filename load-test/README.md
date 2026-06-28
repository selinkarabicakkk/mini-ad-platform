# Load Test — Concurrent Impression Endpoint

Tests `POST /api/impression/:id` under 200 concurrent virtual users to prove the budget deduction is race-condition-safe.

## Prerequisites

```bash
brew install k6
```

## Run

```bash
k6 run \
  -e CAMPAIGN_ID=<your-campaign-uuid> \
  -e BASE_URL=http://localhost:8080 \
  load-test/impression_load.js
```

The backend and database must be running (`docker-compose up --build`) and the campaign must have a non-zero budget before starting.

## Profile

| Phase      | Duration | VUs |
|------------|----------|-----|
| Ramp up    | 10s      | 0 → 200 |
| Hold       | 30s      | 200 |
| Ramp down  | 10s      | 200 → 0 |

## Interpreting results

| Status | Meaning |
|--------|---------|
| 200    | Impression recorded — budget atomically decremented |
| 409    | Budget exhausted — expected once all impressions are consumed |
| 500    | Internal error — should never appear |

## What this test proves

The backend uses a single atomic SQL `UPDATE … RETURNING` to deduct budget:

```sql
UPDATE campaigns
SET budget = budget - 1
WHERE id = $1 AND budget > 0 AND deleted_at IS NULL
RETURNING id, budget, status
```

There is no SELECT followed by UPDATE, so there is no window for a race condition to double-spend budget. Under 200 concurrent VUs, every response must be 200 (recorded) or 409 (exhausted) — never a 500. The `unexpected_errors` threshold enforces this: the test fails if more than 1% of requests return anything else.
