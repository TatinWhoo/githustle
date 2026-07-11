-- ================================================================
-- 011_e_indexes_minor.sql
-- Minor index additions and ENUM type migrations
-- Fixes issues 1.20 (idx_rt_token_hash), 1.21 (idx_rev_reviewer),
--              1.22 (payment_tx_type, platform_fee_type ENUMs)
-- Depends on: 002, 006, 007, 010
-- Additive only for indexes; alters payments.payment_type and
-- platform_fees.fee_type columns to ENUM (functionally equivalent)
-- ================================================================

-- ----------------------------------------------------------------
-- Issue 1.20 — idx_rt_token_hash on refresh_tokens
-- Enables Index Scan on token_hash lookups (was Seq Scan).
-- Existing indexes idx_rt_user_id, idx_rt_family, idx_rt_expires,
-- idx_rt_active are unaffected; this is purely additive.
-- ----------------------------------------------------------------
CREATE INDEX idx_rt_token_hash ON refresh_tokens(token_hash);

-- ----------------------------------------------------------------
-- Issue 1.21 — idx_rev_reviewer on reviews
-- Enables efficient lookups by reviewer_id (e.g. "reviews I wrote").
-- ----------------------------------------------------------------
CREATE INDEX idx_rev_reviewer ON reviews(reviewer_id);

-- ----------------------------------------------------------------
-- Issue 1.22 — payment_tx_type and platform_fee_type ENUMs
-- Migrates VARCHAR(20) columns to proper ENUM types, consistent
-- with the 27 other ENUMs defined in 001_extensions_enums_utils.sql.
-- Valid values are identical to the former CHECK constraints, so
-- behavior is functionally equivalent. The redundant chk_payment_type
-- CHECK constraint is dropped after the column type change.
-- ----------------------------------------------------------------
CREATE TYPE payment_tx_type AS ENUM ('charge', 'refund', 'adjustment');

CREATE TYPE platform_fee_type AS ENUM (
  'freelancer_commission',
  'client_processing',
  'subscription',
  'promotion'
);

ALTER TABLE payments
  ALTER COLUMN payment_type TYPE payment_tx_type
  USING payment_type::payment_tx_type;

ALTER TABLE platform_fees
  ALTER COLUMN fee_type TYPE platform_fee_type
  USING fee_type::platform_fee_type;

-- CHECK constraint now redundant — ENUM enforces valid values
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payment_type;
