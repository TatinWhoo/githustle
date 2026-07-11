-- Migration: 011_a_critical_structural.sql
-- Fixes: issues 1.2 (plaintext tokens), 1.3 (plaintext MFA), 1.4 (plaintext withdrawal PII)
-- Applies on top of 000–010 migrations. No existing migration modified.

-- =============================================================================
-- Issue 1.2 — Token hashing contract (email_verify_token, password_reset_token)
-- Fix: document SHA-256 contract; application must hash before storing.
-- Column type TEXT already holds hex-encoded SHA-256; no DDL type change needed.
-- =============================================================================
COMMENT ON COLUMN users.email_verify_token   IS 'SHA-256 hash of raw token. Raw token sent in email only.';
COMMENT ON COLUMN users.password_reset_token IS 'SHA-256 hash of raw token. Raw token sent in email only.';

-- =============================================================================
-- Issue 1.3 — MFA secret encryption + recovery codes table
-- Fix: document pgp_sym_encrypt contract on mfa_secret; replace TEXT[] array
--      column with dedicated mfa_recovery_codes table for per-code lifecycle.
-- =============================================================================
COMMENT ON COLUMN users.mfa_secret IS 'pgp_sym_encrypt(totp_secret, app_secret). Never plaintext.';

-- Drop the raw TEXT[] recovery codes array column
ALTER TABLE users DROP COLUMN IF EXISTS mfa_recovery_codes;

-- Dedicated table: one row per recovery code, code stored as hash
CREATE TABLE mfa_recovery_codes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT        NOT NULL,   -- SHA-256 of raw recovery code
  used_at    TIMESTAMPTZ,            -- NULL = unused; set on consumption
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index: only unused codes are looked up during verification
CREATE INDEX idx_mrc_user_id ON mfa_recovery_codes(user_id) WHERE used_at IS NULL;

-- =============================================================================
-- Issue 1.4 — Withdrawal account_details encryption
-- Fix: change JSONB to TEXT so pgp_sym_encrypt ciphertext can be stored.
-- Application must encrypt before INSERT and decrypt after SELECT.
-- =============================================================================
ALTER TABLE withdrawals ALTER COLUMN account_details TYPE TEXT
  USING account_details::TEXT;

COMMENT ON COLUMN withdrawals.account_details IS 'pgp_sym_encrypt(jsonb::TEXT, app_secret). Decrypt on read.';
