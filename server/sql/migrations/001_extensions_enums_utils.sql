-- ================================================================
-- 001_extensions_enums_utils.sql
-- Extensions, all enums, utility functions, invoice sequence
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

CREATE TYPE user_role           AS ENUM ('client', 'freelancer', 'admin');
CREATE TYPE user_status         AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE job_status          AS ENUM ('open', 'in_progress', 'completed', 'cancelled', 'paused');
CREATE TYPE proposal_status     AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE project_status      AS ENUM ('active', 'on_hold', 'completed', 'cancelled', 'disputed');
CREATE TYPE milestone_status    AS ENUM ('pending', 'in_progress', 'submitted', 'in_review', 'approved', 'rejected', 'paid');
CREATE TYPE invoice_status      AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'disputed');
CREATE TYPE payment_status      AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE notification_type   AS ENUM (
  'message', 'proposal', 'milestone', 'invoice', 'payment', 'review',
  'system', 'dispute', 'collab_mention', 'collab_edit', 'call_incoming',
  'reminder', 'subscription_renewal', 'subscription_expiry', 'credits_low',
  'promotion_expiring', 'tax_record_ready'
);
CREATE TYPE dispute_status      AS ENUM ('open', 'under_review', 'resolved', 'closed');
CREATE TYPE experience_level    AS ENUM ('entry', 'intermediate', 'expert');
CREATE TYPE budget_type         AS ENUM ('fixed', 'hourly');
CREATE TYPE msg_type            AS ENUM ('text', 'file', 'system');
CREATE TYPE time_entry_status   AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'billed');
CREATE TYPE withdrawal_status   AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE collab_doc_status   AS ENUM ('active', 'archived', 'deleted');
CREATE TYPE board_element_type  AS ENUM ('shape', 'arrow', 'text', 'image', 'sticky', 'frame');
CREATE TYPE sticky_note_scope   AS ENUM ('personal', 'shared');
CREATE TYPE call_status         AS ENUM ('initiated', 'ongoing', 'ended', 'missed', 'failed');
CREATE TYPE call_type           AS ENUM ('voice', 'video');
CREATE TYPE reminder_status     AS ENUM ('pending', 'sent', 'dismissed');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'expired');
CREATE TYPE subscription_plan   AS ENUM ('free', 'pro_freelancer', 'business_client');
CREATE TYPE credit_tx_type      AS ENUM ('purchase', 'earned', 'spent', 'refunded', 'expired', 'admin_adjustment');
CREATE TYPE promotion_status    AS ENUM ('pending', 'active', 'expired', 'cancelled');
CREATE TYPE tax_filing_status   AS ENUM ('draft', 'ready', 'filed', 'accepted', 'rejected');
CREATE TYPE billing_interval    AS ENUM ('monthly', 'quarterly', 'annual');

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION apply_updated_at(tbl TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE FORMAT(
    'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
    tbl, tbl
  );
END;
$$;

CREATE SEQUENCE invoice_number_seq START 1;
