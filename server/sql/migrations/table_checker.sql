-- ================================================================
-- table_checker.sql
-- Verify all expected tables, enums, indexes, triggers, views,
-- RLS policies, functions, roles, and seed data exist after
-- running 000_general_migration.sql.
-- Run in Supabase SQL Editor after executing the migration.
-- ================================================================


-- ================================================================
-- 1. EXTENSIONS (expect 3: pgcrypto, pg_trgm, unaccent)
-- ================================================================

SELECT extname AS extension, extversion AS version
FROM pg_extension
WHERE extname IN ('pgcrypto', 'pg_trgm', 'unaccent')
ORDER BY extname;


-- ================================================================
-- 2. TABLE COUNT (expect 59)
-- ================================================================

SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type   = 'BASE TABLE';


-- ================================================================
-- 3. EXPECTED TABLES CHECKLIST
-- Shows '✗ MISSING' for any table that did not get created.
-- Grouped by domain for readability.
-- ================================================================

WITH expected AS (
  SELECT unnest(ARRAY[
    -- Core: Auth & Users
    'users',
    'refresh_tokens',
    'mfa_recovery_codes',
    -- Core: Profiles
    'freelancer_profiles',
    'client_profiles',
    'skills',
    'freelancer_skills',
    'portfolio_items',
    -- Core: Job Marketplace
    'job_postings',
    'job_skills',
    'saved_jobs',
    'proposals',
    -- Core: Project Lifecycle
    'projects',
    'milestones',
    'milestone_deliverables',
    'messages',
    -- Core: Financials
    'invoices',
    'invoice_items',
    'payments',
    'time_entries',
    'withdrawals',
    'payment_gateway_events',
    -- Core: Reviews, Notifications, Disputes
    'reviews',
    'notifications',
    'notification_preferences',
    'disputes',
    'dispute_messages',
    -- Core: System
    'audit_logs',
    'file_uploads',
    -- Collaboration
    'collab_spaces',
    'collab_documents',
    'collab_document_versions',
    'collab_boards',
    'collab_board_elements',
    'collab_board_versions',
    'sticky_notes',
    'reminders',
    'collab_calls',
    'collab_call_participants',
    'collab_whiteboards',
    'collab_whiteboard_elements',
    'collab_whiteboard_snapshots',
    -- Feature Tables
    'profile_views',
    'teams',
    'team_members',
    'contract_templates',
    'content_reports',
    'user_verifications',
    'ai_proposal_usage',
    'saved_freelancers',
    -- Monetization
    'subscription_plans',
    'user_subscriptions',
    'fee_schedules',
    'platform_fees',
    'credit_ledger',
    'job_promotions',
    'proposal_boosts',
    'tax_records',
    'subscription_invoices'
  ]) AS table_name
)
SELECT
  e.table_name,
  CASE WHEN t.table_name IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END AS status
FROM expected e
LEFT JOIN information_schema.tables t
  ON  t.table_name   = e.table_name
  AND t.table_schema = 'public'
  AND t.table_type   = 'BASE TABLE'
ORDER BY status DESC, e.table_name;


-- ================================================================
-- 4. ENUM TYPES (expect 29)
-- ================================================================

SELECT typname AS enum_name
FROM pg_type
WHERE typcategory = 'E'
ORDER BY typname;


-- ================================================================
-- 5. EXPECTED ENUMS CHECKLIST
-- ================================================================

WITH expected AS (
  SELECT unnest(ARRAY[
    'billing_interval',
    'board_element_type',
    'budget_type',
    'call_status',
    'call_type',
    'collab_doc_status',
    'credit_tx_type',
    'dispute_status',
    'experience_level',
    'invoice_status',
    'job_status',
    'milestone_status',
    'msg_type',
    'notification_type',
    'payment_status',
    'payment_tx_type',
    'platform_fee_type',
    'project_status',
    'promotion_status',
    'proposal_status',
    'reminder_status',
    'sticky_note_scope',
    'subscription_plan',
    'subscription_status',
    'tax_filing_status',
    'time_entry_status',
    'user_role',
    'user_status',
    'withdrawal_status'
  ]) AS enum_name
)
SELECT
  e.enum_name,
  CASE WHEN t.typname IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END AS status
FROM expected e
LEFT JOIN pg_type t
  ON  t.typname      = e.enum_name
  AND t.typcategory  = 'E'
ORDER BY status DESC, e.enum_name;


-- ================================================================
-- 6. VIEWS (expect 10)
-- ================================================================

WITH expected AS (
  SELECT unnest(ARRAY[
    'v_credit_balances',
    'v_freelancer_balance',
    'v_freelancer_earnings',
    'v_job_listings',
    'v_payment_history',
    'v_platform_revenue',
    'v_project_budget_status',
    'v_project_overview',
    'v_project_time_summary',
    'v_user_subscription_status'
  ]) AS view_name
)
SELECT
  e.view_name,
  CASE WHEN v.table_name IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END AS status
FROM expected e
LEFT JOIN information_schema.views v
  ON  v.table_name   = e.view_name
  AND v.table_schema = 'public'
ORDER BY status DESC, e.view_name;


-- ================================================================
-- 7. FUNCTIONS (expect fn_reconcile_freelancer_balance + utility)
-- ================================================================

SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type   = 'FUNCTION'
ORDER BY routine_name;


-- ================================================================
-- 8. BUSINESS TRIGGERS (expect 11 explicit + updated_at per table)
-- ================================================================

WITH expected_triggers AS (
  SELECT unnest(ARRAY[
    'trg_average_rating',
    'trg_calculate_hours',
    'trg_enforce_budget',
    'trg_financial_stats',
    'trg_freelancer_search',
    'trg_invoice_number',
    'trg_job_search',
    'trg_jobs_completed',
    'trg_jobs_posted',
    'trg_proposals_count'
  ]) AS trigger_name
)
SELECT
  e.trigger_name,
  CASE WHEN t.trigger_name IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END AS status
FROM expected_triggers e
LEFT JOIN information_schema.triggers t
  ON  t.trigger_name   = e.trigger_name
  AND t.trigger_schema = 'public'
ORDER BY status DESC, e.trigger_name;

-- Full trigger list (all triggers including updated_at)
SELECT
  trigger_name,
  event_object_table AS on_table,
  event_manipulation AS event,
  action_timing      AS timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;


-- ================================================================
-- 9. ROW LEVEL SECURITY STATUS (expect all 12 tables enabled)
-- ================================================================

WITH expected_rls AS (
  SELECT unnest(ARRAY[
    'dispute_messages',
    'disputes',
    'invoices',
    'messages',
    'milestone_deliverables',
    'milestones',
    'notifications',
    'projects',
    'proposals',
    'reviews',
    'time_entries',
    'withdrawals'
  ]) AS table_name
)
SELECT
  e.table_name,
  CASE
    WHEN c.relrowsecurity = TRUE THEN '✓ RLS ON'
    WHEN c.relname IS NOT NULL   THEN '✗ RLS OFF'
    ELSE                              '✗ TABLE MISSING'
  END AS rls_status
FROM expected_rls e
LEFT JOIN pg_class c
  ON  c.relname      = e.table_name
  AND c.relnamespace = 'public'::regnamespace
  AND c.relkind      = 'r'
ORDER BY rls_status DESC, e.table_name;

-- RLS policy names per table
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ================================================================
-- 10. ADMIN ROLE CHECK (expect githustle_admin with BYPASSRLS)
-- ================================================================

SELECT
  rolname,
  rolbypassrls,
  CASE WHEN rolbypassrls THEN '✓ BYPASSRLS SET' ELSE '✗ BYPASSRLS MISSING' END AS bypass_status
FROM pg_roles
WHERE rolname = 'githustle_admin';


-- ================================================================
-- 11. SEQUENCE CHECK
-- ================================================================

SELECT
  sequencename    AS sequence_name,
  start_value,
  last_value,
  increment_by
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;


-- ================================================================
-- 12. INDEXES (full list grouped by table)
-- ================================================================

SELECT
  tablename   AS table_name,
  indexname   AS index_name,
  indexdef    AS definition
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- ================================================================
-- 13. SEED DATA VERIFICATION
-- ================================================================

-- Skills count (expect 47)
SELECT COUNT(*) AS skill_count FROM skills;

-- Skills by category
SELECT category, COUNT(*) AS count
FROM skills
GROUP BY category
ORDER BY category;

-- Subscription plans (expect 3)
SELECT name, display_name, price_monthly,
  ai_proposals_unlimited, profile_analytics, verified_badge,
  multi_user_team, advanced_contracts, priority_support,
  max_active_jobs, max_team_members
FROM subscription_plans
ORDER BY price_monthly;

-- Fee schedules (expect 2: beta zero-fee active, standard inactive)
SELECT name, is_active, freelancer_rate_pct, client_processing_pct, min_fee_amount
FROM fee_schedules
ORDER BY is_active DESC;


-- ================================================================
-- 14. COLUMN COMMENT VERIFICATION (security contracts)
-- Confirms encryption/hashing contracts are documented.
-- ================================================================

SELECT
  c.table_name,
  c.column_name,
  pgd.description AS comment
FROM information_schema.columns c
JOIN pg_class       pc  ON pc.relname   = c.table_name
JOIN pg_attribute   pa  ON pa.attrelid  = pc.oid AND pa.attname = c.column_name
LEFT JOIN pg_description pgd ON pgd.objoid = pc.oid AND pgd.objsubid = pa.attnum
WHERE c.table_schema = 'public'
  AND c.table_name  IN ('users', 'withdrawals')
  AND c.column_name IN ('email_verify_token', 'password_reset_token', 'mfa_secret', 'account_details')
ORDER BY c.table_name, c.column_name;


-- ================================================================
-- 15. SUMMARY DASHBOARD
-- One row per check category with pass/fail counts.
-- ================================================================

WITH
table_check AS (
  SELECT
    SUM(CASE WHEN t.table_name IS NOT NULL THEN 1 ELSE 0 END) AS found,
    COUNT(*) AS expected
  FROM (SELECT unnest(ARRAY[
    'users','refresh_tokens','mfa_recovery_codes','freelancer_profiles','client_profiles',
    'skills','freelancer_skills','portfolio_items','job_postings','job_skills','saved_jobs',
    'proposals','projects','milestones','milestone_deliverables','messages','invoices',
    'invoice_items','payments','time_entries','withdrawals','payment_gateway_events',
    'reviews','notifications','notification_preferences','disputes','dispute_messages',
    'audit_logs','file_uploads','collab_spaces','collab_documents','collab_document_versions',
    'collab_boards','collab_board_elements','collab_board_versions','sticky_notes','reminders',
    'collab_calls','collab_call_participants','collab_whiteboards','collab_whiteboard_elements',
    'collab_whiteboard_snapshots','profile_views','teams','team_members','contract_templates',
    'content_reports','user_verifications','ai_proposal_usage','saved_freelancers',
    'subscription_plans','user_subscriptions','fee_schedules','platform_fees','credit_ledger',
    'job_promotions','proposal_boosts','tax_records','subscription_invoices'
  ]) AS table_name) e
  LEFT JOIN information_schema.tables t
    ON t.table_name = e.table_name AND t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
),
enum_check AS (
  SELECT
    SUM(CASE WHEN pt.typname IS NOT NULL THEN 1 ELSE 0 END) AS found,
    COUNT(*) AS expected
  FROM (SELECT unnest(ARRAY[
    'billing_interval','board_element_type','budget_type','call_status','call_type',
    'collab_doc_status','credit_tx_type','dispute_status','experience_level','invoice_status',
    'job_status','milestone_status','msg_type','notification_type','payment_status',
    'payment_tx_type','platform_fee_type','project_status','promotion_status','proposal_status',
    'reminder_status','sticky_note_scope','subscription_plan','subscription_status',
    'tax_filing_status','time_entry_status','user_role','user_status','withdrawal_status'
  ]) AS enum_name) e
  LEFT JOIN pg_type pt ON pt.typname = e.enum_name AND pt.typcategory = 'E'
),
view_check AS (
  SELECT
    SUM(CASE WHEN v.table_name IS NOT NULL THEN 1 ELSE 0 END) AS found,
    COUNT(*) AS expected
  FROM (SELECT unnest(ARRAY[
    'v_credit_balances','v_freelancer_balance','v_freelancer_earnings','v_job_listings',
    'v_payment_history','v_platform_revenue','v_project_budget_status','v_project_overview',
    'v_project_time_summary','v_user_subscription_status'
  ]) AS view_name) e
  LEFT JOIN information_schema.views v ON v.table_name = e.view_name AND v.table_schema = 'public'
),
rls_check AS (
  SELECT
    SUM(CASE WHEN c.relrowsecurity = TRUE THEN 1 ELSE 0 END) AS found,
    COUNT(*) AS expected
  FROM (SELECT unnest(ARRAY[
    'dispute_messages','disputes','invoices','messages','milestone_deliverables',
    'milestones','notifications','projects','proposals','reviews','time_entries','withdrawals'
  ]) AS table_name) e
  LEFT JOIN pg_class c
    ON c.relname = e.table_name AND c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
),
role_check AS (
  SELECT
    SUM(CASE WHEN rolbypassrls THEN 1 ELSE 0 END) AS found,
    1 AS expected
  FROM pg_roles WHERE rolname = 'githustle_admin'
)
SELECT 'Tables'        AS category, found::TEXT || ' / ' || expected::TEXT AS result,
  CASE WHEN found = expected THEN '✓ PASS' ELSE '✗ FAIL' END AS status FROM table_check
UNION ALL
SELECT 'Enums'         AS category, found::TEXT || ' / ' || expected::TEXT,
  CASE WHEN found = expected THEN '✓ PASS' ELSE '✗ FAIL' END FROM enum_check
UNION ALL
SELECT 'Views'         AS category, found::TEXT || ' / ' || expected::TEXT,
  CASE WHEN found = expected THEN '✓ PASS' ELSE '✗ FAIL' END FROM view_check
UNION ALL
SELECT 'RLS Policies'  AS category, found::TEXT || ' / ' || expected::TEXT,
  CASE WHEN found = expected THEN '✓ PASS' ELSE '✗ FAIL' END FROM rls_check
UNION ALL
SELECT 'Admin Role'    AS category, found::TEXT || ' / ' || expected::TEXT,
  CASE WHEN found = expected THEN '✓ PASS' ELSE '✗ FAIL' END FROM role_check
ORDER BY status, category;