-- ================================================================
-- table_checker.sql
-- Verify all expected tables, enums, indexes, triggers, and views
-- exist after running migrations.
-- Run in Supabase SQL Editor after executing 000 or 001–010.
-- ================================================================

-- ================================================================
-- 1. TABLE COUNT (expect 46)
-- ================================================================

SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type   = 'BASE TABLE';

-- ================================================================
-- 2. ALL TABLES (alphabetical)
-- ================================================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type   = 'BASE TABLE'
ORDER BY table_name;

-- ================================================================
-- 3. EXPECTED TABLES CHECKLIST
-- Shows 'MISSING' for any table that did not get created
-- ================================================================

WITH expected AS (
  SELECT unnest(ARRAY[
    'audit_logs',
    'client_profiles',
    'collab_board_elements',
    'collab_boards',
    'collab_call_participants',
    'collab_calls',
    'collab_document_versions',
    'collab_documents',
    'collab_spaces',
    'collab_whiteboard_elements',
    'collab_whiteboard_snapshots',
    'collab_whiteboards',
    'credit_ledger',
    'dispute_messages',
    'disputes',
    'fee_schedules',
    'file_uploads',
    'freelancer_profiles',
    'freelancer_skills',
    'invoice_items',
    'invoices',
    'job_postings',
    'job_promotions',
    'job_skills',
    'messages',
    'milestone_deliverables',
    'milestones',
    'notification_preferences',
    'notifications',
    'payments',
    'platform_fees',
    'portfolio_items',
    'projects',
    'proposal_boosts',
    'proposals',
    'refresh_tokens',
    'reminders',
    'reviews',
    'saved_jobs',
    'skills',
    'sticky_notes',
    'subscription_invoices',
    'subscription_plans',
    'tax_records',
    'time_entries',
    'user_subscriptions',
    'users',
    'withdrawals'
  ]) AS table_name
)
SELECT
  e.table_name,
  CASE WHEN t.table_name IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END AS status
FROM expected e
LEFT JOIN information_schema.tables t
  ON t.table_name  = e.table_name
  AND t.table_schema = 'public'
  AND t.table_type   = 'BASE TABLE'
ORDER BY status, e.table_name;

-- ================================================================
-- 4. ENUM TYPES (expect 27)
-- ================================================================

SELECT typname AS enum_name
FROM pg_type
WHERE typcategory = 'E'
ORDER BY typname;

-- ================================================================
-- 5. VIEWS (expect 10)
-- ================================================================

SELECT table_name AS view_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ================================================================
-- 6. TRIGGERS (expect 11 business triggers + updated_at per table)
-- ================================================================

SELECT
  trigger_name,
  event_object_table AS on_table,
  event_manipulation AS event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ================================================================
-- 7. INDEXES (row count per table — spot check)
-- ================================================================

SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ================================================================
-- 8. ROW LEVEL SECURITY STATUS
-- ================================================================

SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
  AND relname IN (
    'projects', 'messages', 'invoices',
    'milestones', 'notifications', 'milestone_deliverables'
  )
ORDER BY relname;

-- ================================================================
-- 9. SEED DATA VERIFICATION
-- ================================================================

-- Skills count (expect 47)
SELECT COUNT(*) AS skill_count FROM skills;

-- Subscription plans (expect 3: free, pro_freelancer, business_client)
SELECT name, display_name, price_monthly FROM subscription_plans ORDER BY price_monthly;

-- Fee schedules (expect 2: beta zero-fee + standard)
SELECT name, is_active, freelancer_rate_pct, client_processing_pct FROM fee_schedules ORDER BY is_active DESC;

-- ================================================================
-- 10. SEQUENCE CHECK
-- ================================================================

SELECT sequence_name, start_value, last_value
FROM information_schema.sequences s
JOIN pg_sequences ps ON ps.sequencename = s.sequence_name
WHERE s.sequence_schema = 'public';
