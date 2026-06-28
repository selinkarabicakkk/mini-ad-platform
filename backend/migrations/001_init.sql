CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE campaigns (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    budget      INTEGER      NOT NULL CHECK (budget >= 0),
    start_date  DATE         NOT NULL,
    end_date    DATE         NOT NULL,
    status      VARCHAR      NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'paused', 'completed')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_campaigns_deleted_at ON campaigns (deleted_at);
CREATE INDEX idx_campaigns_status     ON campaigns (status);
