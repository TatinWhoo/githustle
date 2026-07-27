-- ================================================================
-- 015_least_privilege_role.sql
-- Least-privilege application role for runtime DB access (Req 16.4)
-- Depends on: all prior migrations (tables must exist)
-- ================================================================
--
-- Creates role `githustle_app` and grants only the DML operations
-- the application needs.  No CREATE, DROP, TRUNCATE, or superuser.
--
-- Production DATABASE_URL should connect as this role.
-- ================================================================

-- Create role if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'githustle_app') THEN
    CREATE ROLE githustle_app WITH LOGIN;
  END IF;
END
$$;

-- Ensure the role cannot create databases or roles
ALTER ROLE githustle_app NOCREATEDB NOCREATEROLE;

-- Grant USAGE on the public schema so the role can reference objects
GRANT USAGE ON SCHEMA public TO githustle_app;

-- Grant DML on every application table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  ai_proposal_usage,
  audit_logs,
  client_profiles,
  collab_board_elements,
  collab_board_versions,
  collab_boards,
  collab_call_participants,
  collab_calls,
  collab_document_versions,
  collab_documents,
  collab_spaces,
  collab_whiteboard_elements,
  collab_whiteboard_snapshots,
  collab_whiteboards,
  content_reports,
  contract_templates,
  credit_ledger,
  dispute_messages,
  disputes,
  fee_schedules,
  file_uploads,
  freelancer_profiles,
  freelancer_skills,
  invoice_items,
  invoices,
  job_postings,
  job_promotions,
  job_skills,
  messages,
  mfa_recovery_codes,
  milestone_deliverables,
  milestones,
  notification_preferences,
  notifications,
  payment_gateway_events,
  payments,
  platform_fees,
  portfolio_items,
  profile_views,
  projects,
  proposal_boosts,
  proposals,
  refresh_tokens,
  reminders,
  reviews,
  saved_freelancers,
  saved_jobs,
  skills,
  sticky_notes,
  subscription_invoices,
  subscription_plans,
  tax_records,
  team_members,
  teams,
  time_entries,
  user_subscriptions,
  user_verifications,
  users,
  withdrawals
TO githustle_app;

-- Grant USAGE on all sequences so INSERT with serial/UUID-default columns works
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO githustle_app;

-- Future tables/sequences created by superuser migrations will also be accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO githustle_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO githustle_app;

-- Explicitly revoke dangerous DDL abilities (defense-in-depth)
REVOKE CREATE ON SCHEMA public FROM githustle_app;
