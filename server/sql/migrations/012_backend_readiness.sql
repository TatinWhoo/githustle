-- ================================================================
-- 012_backend_readiness.sql
-- Pre-backend fixes from readiness assessment
-- Applies on top of 000–011_* migrations.
-- ================================================================
-- Changes:
--   1. githustle_admin role with BYPASSRLS (admin RLS bypass strategy)
--   2. payment_gateway_events table (webhook idempotency log)
--   3. CHECK constraints on content_reports.status and
--      user_verifications.status (were bare VARCHAR with no guard)
-- ================================================================

-- ================================================================
-- 1. Admin role — BYPASSRLS strategy (Option A from assessment)
-- ================================================================
-- Create a dedicated PostgreSQL role that bypasses all RLS policies.
-- Admin backend routes connect via a separate connection pool
-- authenticated as this role. No changes to existing RLS policies needed.
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'githustle_admin') THEN
    CREATE ROLE githustle_admin BYPASSRLS;
  END IF;
END;
$$;

COMMENT ON ROLE githustle_admin IS
  'Service role for admin backend. BYPASSRLS skips all row-level security.
   Connect via a separate pool — never expose to user-facing routes.';

-- ================================================================
-- 2. payment_gateway_events — webhook idempotency log
-- ================================================================
-- Required before integrating Stripe, GCash, Maya, or PayPal.
-- event_id UNIQUE = idempotency key; prevents double-processing
--   duplicate webhook deliveries (gateways retry on timeout).
-- processed = FALSE partial index = webhook worker queue.
-- ================================================================

CREATE TABLE payment_gateway_events (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway      VARCHAR(50)  NOT NULL,                    -- 'stripe', 'gcash', 'maya', 'paypal'
  event_id     VARCHAR(255) NOT NULL UNIQUE,             -- gateway's own event/webhook ID
  event_type   VARCHAR(100) NOT NULL,                    -- e.g. 'payment_intent.succeeded'
  payload      JSONB        NOT NULL,                    -- full raw webhook payload
  payment_id   UUID         REFERENCES payments(id),     -- NULL until matched to a payment
  processed    BOOLEAN      NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error        TEXT,                                     -- set if processing failed
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pge_event_id    ON payment_gateway_events(event_id);
CREATE INDEX idx_pge_unprocessed ON payment_gateway_events(processed) WHERE processed = FALSE;
CREATE INDEX idx_pge_payment_id  ON payment_gateway_events(payment_id) WHERE payment_id IS NOT NULL;

-- ================================================================
-- 3. CHECK constraints on content_reports.status and
--    user_verifications.status
-- ================================================================
-- Both were bare VARCHAR(50) with no constraint — every other status
-- column in the schema is either an ENUM or constrained.
-- Adding CHECK keeps the column type (compatible with existing data)
-- while preventing silent typos.
-- ================================================================

ALTER TABLE content_reports
  ADD CONSTRAINT chk_content_report_status
  CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed'));

ALTER TABLE user_verifications
  ADD CONSTRAINT chk_user_verification_status
  CHECK (status IN ('pending', 'verified', 'rejected', 'expired'));
