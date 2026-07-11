-- Migration: 011_b_trigger_fixes.sql
-- Fixes: issues 1.5 (counter triggers), 1.6 (role-aware rating), 1.7 (derived balance view)
-- Applies on top of 000–011_a migrations. No existing migration modified.
-- Requirements: 2.5, 2.6, 2.7, 3.3, 3.4

-- =============================================================================
-- Issue 1.5 — jobs_posted INSERT trigger + jobs_completed column on client_profiles
--
-- Bug: fn_sync_jobs_completed incorrectly incremented client_profiles.jobs_posted
--      on project completion instead of a jobs_completed counter. No INSERT trigger
--      on job_postings ever incremented jobs_posted at the right time.
-- Fix: (a) Add jobs_completed column to client_profiles.
--      (b) New fn_sync_jobs_posted() + trg_jobs_posted on job_postings AFTER INSERT.
--      (c) Replace fn_sync_jobs_completed() to increment jobs_completed (not jobs_posted)
--          on both freelancer_profiles and client_profiles when project completes.
--      Existing trg_jobs_completed on projects picks up the replaced function automatically.
-- =============================================================================

ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS jobs_completed INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION fn_sync_jobs_posted()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE client_profiles SET jobs_posted = jobs_posted + 1 WHERE user_id = NEW.client_id;
  RETURN NULL;
END;
$$;

-- Guard: drop trigger first so CREATE does not error if migration reruns
DROP TRIGGER IF EXISTS trg_jobs_posted ON job_postings;

CREATE TRIGGER trg_jobs_posted
  AFTER INSERT ON job_postings
  FOR EACH ROW EXECUTE FUNCTION fn_sync_jobs_posted();

-- Replace fn_sync_jobs_completed: increment jobs_completed on client, not jobs_posted
-- Preservation (Req 3.3): non-completion transitions remain no-op (IF guard unchanged)
CREATE OR REPLACE FUNCTION fn_sync_jobs_completed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE freelancer_profiles SET jobs_completed = jobs_completed + 1 WHERE user_id = NEW.freelancer_id;
    UPDATE client_profiles     SET jobs_completed = jobs_completed + 1 WHERE user_id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;
-- trg_jobs_completed already exists on projects; function replacement takes effect immediately.

-- =============================================================================
-- Issue 1.6 — Role-aware average rating recalculation
--
-- Bug: fn_recalc_average_rating issued UPDATE against both freelancer_profiles AND
--      client_profiles unconditionally for every review, doubling write cost and
--      producing spurious xmin changes on the wrong profile table.
-- Fix: Determine reviewee role from users.role; update only the matching profile table.
--      Existing trg_average_rating on reviews picks up the replaced function automatically.
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_recalc_average_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM users WHERE id = NEW.reviewee_id;

  IF v_role = 'freelancer' THEN
    UPDATE freelancer_profiles SET
      average_rating = (
        SELECT ROUND(AVG(rating)::NUMERIC, 2)
        FROM reviews
        WHERE reviewee_id = NEW.reviewee_id AND is_public = TRUE
      ),
      total_reviews  = (
        SELECT COUNT(*)
        FROM reviews
        WHERE reviewee_id = NEW.reviewee_id AND is_public = TRUE
      )
    WHERE user_id = NEW.reviewee_id;

  ELSIF v_role = 'client' THEN
    UPDATE client_profiles SET
      average_rating = (
        SELECT ROUND(AVG(rating)::NUMERIC, 2)
        FROM reviews
        WHERE reviewee_id = NEW.reviewee_id AND is_public = TRUE
      ),
      total_reviews  = (
        SELECT COUNT(*)
        FROM reviews
        WHERE reviewee_id = NEW.reviewee_id AND is_public = TRUE
      )
    WHERE user_id = NEW.reviewee_id;
  END IF;

  RETURN NEW;
END;
$$;
-- trg_average_rating already exists on reviews; function replacement takes effect immediately.

-- =============================================================================
-- Issue 1.7 — Remove mutable available_balance; replace with derived view
--
-- Bug: available_balance mutated in place by two independent triggers
--      (trg_update_balance_on_payment, trg_deduct_withdrawal). Can drift from
--      ground truth under concurrent writes or partial trigger failures.
-- Fix: Drop both triggers and their functions, drop the mutable column, and
--      replace v_freelancer_balance with a derived view following the
--      credit_ledger / v_credit_balances append-only pattern.
-- Preservation (Req 3.4): fn_sync_financial_stats (total_earned / total_spent)
--      is NOT touched — it lives in a separate trigger and remains unchanged.
-- =============================================================================

DROP TRIGGER IF EXISTS trg_update_balance_on_payment ON payments;
DROP TRIGGER IF EXISTS trg_deduct_withdrawal         ON withdrawals;
DROP FUNCTION IF EXISTS fn_update_freelancer_balance();
DROP FUNCTION IF EXISTS fn_deduct_withdrawal();

ALTER TABLE freelancer_profiles DROP COLUMN IF EXISTS available_balance;

-- Replace v_freelancer_balance: derive available_balance from pre-aggregated subqueries.
-- Pre-aggregating payments and withdrawals separately before joining prevents
-- the N×M Cartesian product that would inflate SUM results when both tables
-- have multiple rows per freelancer.
CREATE OR REPLACE VIEW v_freelancer_balance AS
SELECT
  fp.user_id    AS freelancer_id,
  fp.display_name,
  fp.total_earned,
  COALESCE(pay.total_received, 0) - COALESCE(wd.total_withdrawn, 0) AS available_balance,
  COALESCE(wd.total_withdrawn, 0)                                    AS total_withdrawn,
  COALESCE(wd.total_pending, 0)                                      AS pending_withdrawal,
  COALESCE(wd.pending_count, 0)                                      AS pending_withdrawal_count
FROM freelancer_profiles fp
LEFT JOIN (
  SELECT payee_id, SUM(amount) AS total_received
  FROM payments
  WHERE status = 'completed'
  GROUP BY payee_id
) pay ON pay.payee_id = fp.user_id
LEFT JOIN (
  SELECT
    freelancer_id,
    SUM(amount) FILTER (WHERE status = 'completed')                AS total_withdrawn,
    SUM(amount) FILTER (WHERE status IN ('pending', 'processing')) AS total_pending,
    COUNT(*)    FILTER (WHERE status = 'pending')                  AS pending_count
  FROM withdrawals
  GROUP BY freelancer_id
) wd ON wd.freelancer_id = fp.user_id;

-- Reconciliation helper: returns derived balance for a single freelancer.
-- Uses the same pre-aggregation pattern to avoid Cartesian product.
CREATE OR REPLACE FUNCTION fn_reconcile_freelancer_balance(p_user_id UUID)
RETURNS TABLE(freelancer_id UUID, derived_balance NUMERIC)
LANGUAGE sql AS $$
  SELECT
    fp.user_id,
    COALESCE(pay.total_received, 0) - COALESCE(wd.total_withdrawn, 0)
  FROM freelancer_profiles fp
  LEFT JOIN (
    SELECT SUM(amount) AS total_received
    FROM payments
    WHERE payee_id = p_user_id AND status = 'completed'
  ) pay ON TRUE
  LEFT JOIN (
    SELECT SUM(amount) FILTER (WHERE status = 'completed') AS total_withdrawn
    FROM withdrawals
    WHERE freelancer_id = p_user_id
  ) wd ON TRUE
  WHERE fp.user_id = p_user_id;
$$;

-- =============================================================================
-- Subtask 5.4 — Verification queries (run manually or in CI)
--
-- These are reference assertions to confirm correctness after applying this file.
-- Execute in a connected psql session or test harness.
--
-- 1. client_profiles.jobs_completed column exists:
--    SELECT column_name
--    FROM information_schema.columns
--    WHERE table_name = 'client_profiles' AND column_name = 'jobs_completed';
--    -- Expected: 1 row
--
-- 2. freelancer_profiles.available_balance column absent:
--    SELECT column_name
--    FROM information_schema.columns
--    WHERE table_name = 'freelancer_profiles' AND column_name = 'available_balance';
--    -- Expected: 0 rows
--
-- 3. trg_jobs_posted trigger exists on job_postings:
--    SELECT trigger_name
--    FROM information_schema.triggers
--    WHERE event_object_table = 'job_postings' AND trigger_name = 'trg_jobs_posted';
--    -- Expected: 1 row
--
-- 4. v_freelancer_balance derives available_balance from payments/withdrawals (not a column):
--    SELECT pg_get_viewdef('v_freelancer_balance', TRUE);
--    -- Expected: definition references payments and withdrawals tables; no available_balance column ref
--
-- 5. fn_recalc_average_rating contains role check (never updates both tables):
--    SELECT prosrc FROM pg_proc WHERE proname = 'fn_recalc_average_rating';
--    -- Expected: source contains 'v_role' and 'ELSIF' branch, not two unconditional UPDATEs
--
-- 6. fn_sync_jobs_completed increments jobs_completed (not jobs_posted) on client_profiles:
--    SELECT prosrc FROM pg_proc WHERE proname = 'fn_sync_jobs_completed';
--    -- Expected: source references 'jobs_completed' for both freelancer_profiles and client_profiles
-- =============================================================================
