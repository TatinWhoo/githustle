-- ================================================================
-- table_cleaner.sql
-- Wipe GitHustle data for a clean dev/test reset.
-- ================================================================
-- TWO MODES — pick one and comment out the other:
--
--   SECTION A: User data only
--     Truncates all transaction and user-generated tables.
--     Keeps seed data (skills, subscription_plans, fee_schedules).
--     Use this for a quick dev reset between test runs.
--
--   SECTION B: Full reset
--     Drops everything including seed data.
--     Requires re-running the seed INSERT blocks from the migration
--     before the app is usable again.
--     Use this before a clean migration re-run.
--
-- CASCADE handles all FK dependencies automatically.
-- RESTART IDENTITY resets the invoice_number_seq to 1.
-- ================================================================


-- ================================================================
-- SECTION A: User data only (seed data preserved)
-- ================================================================

TRUNCATE TABLE
  -- Gateway
  payment_gateway_events,

  -- Monetization (user data)
  subscription_invoices,
  tax_records,
  proposal_boosts,
  job_promotions,
  credit_ledger,
  platform_fees,
  user_subscriptions,

  -- Feature tables
  saved_freelancers,
  ai_proposal_usage,
  user_verifications,
  content_reports,
  contract_templates,
  team_members,
  teams,
  profile_views,

  -- Collaboration
  collab_whiteboard_snapshots,
  collab_whiteboard_elements,
  collab_whiteboards,
  collab_call_participants,
  collab_calls,
  reminders,
  sticky_notes,
  collab_board_versions,
  collab_board_elements,
  collab_boards,
  collab_document_versions,
  collab_documents,
  collab_spaces,

  -- System
  audit_logs,
  file_uploads,

  -- Reviews, notifications, disputes
  dispute_messages,
  disputes,
  notification_preferences,
  notifications,
  reviews,

  -- Financials
  time_entries,
  withdrawals,
  platform_fees,
  payments,
  invoice_items,
  invoices,

  -- Project lifecycle
  milestone_deliverables,
  messages,
  milestones,
  projects,

  -- Job marketplace
  saved_jobs,
  proposals,
  job_skills,
  job_postings,

  -- Profiles
  freelancer_skills,
  portfolio_items,
  client_profiles,
  freelancer_profiles,

  -- Auth
  mfa_recovery_codes,
  refresh_tokens,
  users

RESTART IDENTITY CASCADE;

-- Verify: all user tables should be empty, seed tables untouched.
SELECT 'users'              AS tbl, COUNT(*) FROM users
UNION ALL
SELECT 'projects',                  COUNT(*) FROM projects
UNION ALL
SELECT 'invoices',                  COUNT(*) FROM invoices
UNION ALL
SELECT 'payments',                  COUNT(*) FROM payments
UNION ALL
SELECT 'skills (seed)',             COUNT(*) FROM skills
UNION ALL
SELECT 'subscription_plans (seed)', COUNT(*) FROM subscription_plans
UNION ALL
SELECT 'fee_schedules (seed)',      COUNT(*) FROM fee_schedules;


-- ================================================================
-- SECTION B: Full reset (includes seed data)
-- Comment out Section A above and uncomment this block.
-- ================================================================

-- TRUNCATE TABLE
--   -- Gateway
--   payment_gateway_events,
--
--   -- Monetization
--   subscription_invoices,
--   tax_records,
--   proposal_boosts,
--   job_promotions,
--   credit_ledger,
--   platform_fees,
--   user_subscriptions,
--   fee_schedules,
--   subscription_plans,
--
--   -- Feature tables
--   saved_freelancers,
--   ai_proposal_usage,
--   user_verifications,
--   content_reports,
--   contract_templates,
--   team_members,
--   teams,
--   profile_views,
--
--   -- Collaboration
--   collab_whiteboard_snapshots,
--   collab_whiteboard_elements,
--   collab_whiteboards,
--   collab_call_participants,
--   collab_calls,
--   reminders,
--   sticky_notes,
--   collab_board_versions,
--   collab_board_elements,
--   collab_boards,
--   collab_document_versions,
--   collab_documents,
--   collab_spaces,
--
--   -- System
--   audit_logs,
--   file_uploads,
--
--   -- Reviews, notifications, disputes
--   dispute_messages,
--   disputes,
--   notification_preferences,
--   notifications,
--   reviews,
--
--   -- Financials
--   time_entries,
--   withdrawals,
--   payments,
--   invoice_items,
--   invoices,
--
--   -- Project lifecycle
--   milestone_deliverables,
--   messages,
--   milestones,
--   projects,
--
--   -- Job marketplace
--   saved_jobs,
--   proposals,
--   job_skills,
--   job_postings,
--
--   -- Profiles & skills
--   freelancer_skills,
--   portfolio_items,
--   client_profiles,
--   freelancer_profiles,
--   skills,
--
--   -- Auth
--   mfa_recovery_codes,
--   refresh_tokens,
--   users
--
-- RESTART IDENTITY CASCADE;
--
-- -- After a full reset, re-run the seed INSERT blocks from
-- -- 000_general_migration.sql (skills, subscription_plans, fee_schedules).