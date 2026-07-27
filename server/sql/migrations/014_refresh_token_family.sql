-- ================================================================
-- 014_refresh_token_family.sql
-- Refresh token family state machine + audit_log enrichment
-- Depends on: 002, 007, 011_e
-- ================================================================

-- ----------------------------------------------------------------
-- refresh_tokens — add token_family_id, parent_id, state, etc.
-- Old columns (family, is_revoked) kept for dual-write compatibility.
-- DEPRECATED: family, is_revoked — use token_family_id, state instead
-- ----------------------------------------------------------------

DO $$ BEGIN
  ALTER TABLE refresh_tokens ADD COLUMN token_family_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE refresh_tokens ADD COLUMN parent_id UUID REFERENCES refresh_tokens(id);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE refresh_tokens ADD COLUMN state TEXT NOT NULL DEFAULT 'active'
    CHECK (state IN ('active', 'rotated', 'revoked'));
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE refresh_tokens ADD COLUMN issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE refresh_tokens ADD COLUMN revoked_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Backfill token_family_id from legacy family column and state from is_revoked
UPDATE refresh_tokens
SET
  token_family_id = family,
  state = CASE WHEN is_revoked THEN 'revoked' ELSE 'active' END
WHERE token_family_id IS NULL;

-- Now safe to add NOT NULL on token_family_id
DO $$ BEGIN
  ALTER TABLE refresh_tokens ALTER COLUMN token_family_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

-- Drop the partial index on is_revoked — replaced by state-based index
DROP INDEX IF EXISTS idx_rt_active;

-- Unique constraint on token_hash (idx_rt_token_hash from 011_e covers lookup;
-- add unique constraint if not already present)
DO $$ BEGIN
  ALTER TABLE refresh_tokens ADD CONSTRAINT uq_rt_token_hash UNIQUE (token_hash);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL; END $$;

-- Partial index: active tokens by user_id
CREATE INDEX IF NOT EXISTS idx_rt_user_active ON refresh_tokens(user_id) WHERE state = 'active';

-- Index on token_family_id for family-wide revocation
CREATE INDEX IF NOT EXISTS idx_rt_token_family_id ON refresh_tokens(token_family_id);

-- ----------------------------------------------------------------
-- audit_logs — add enrichment columns
-- Existing: id, user_id, action, entity_type, entity_id,
--           old_value, new_value, ip_address, user_agent, created_at
-- ----------------------------------------------------------------

DO $$ BEGIN
  ALTER TABLE audit_logs ADD COLUMN request_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE audit_logs ADD COLUMN event_type VARCHAR(100);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE audit_logs ADD COLUMN outcome TEXT CHECK (outcome IN ('success', 'failure'));
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE audit_logs ADD COLUMN occurred_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE audit_logs ADD COLUMN metadata JSONB;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Index on request_id for correlation ID lookups
CREATE INDEX IF NOT EXISTS idx_al_request_id ON audit_logs(request_id) WHERE request_id IS NOT NULL;
