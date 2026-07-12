-- ================================================================
-- GitHustle — Complete Database Schema
-- 000_general_migration.sql
-- ================================================================
-- PostgreSQL 15+
-- Run once on a fresh database.
-- For incremental setup, use 001–010 instead.
-- ================================================================

-- ================================================================
-- EXTENSIONS
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ================================================================
-- ENUMS
-- ================================================================

CREATE TYPE user_role           AS ENUM ('client', 'freelancer', 'admin');
CREATE TYPE user_status         AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE job_status          AS ENUM ('open', 'in_progress', 'completed', 'cancelled', 'paused');
CREATE TYPE proposal_status     AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE project_status      AS ENUM ('active', 'on_hold', 'completed', 'cancelled', 'disputed');
CREATE TYPE milestone_status    AS ENUM ('pending', 'in_progress', 'submitted', 'in_review', 'approved', 'rejected', 'paid');
CREATE TYPE invoice_status      AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'disputed');
CREATE TYPE payment_status      AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE notification_type   AS ENUM ('message', 'proposal', 'milestone', 'invoice', 'payment', 'review', 'system', 'dispute', 'collab_mention', 'collab_edit', 'call_incoming', 'reminder', 'subscription_renewal', 'subscription_expiry', 'credits_low', 'promotion_expiring', 'tax_record_ready');
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
CREATE TYPE payment_tx_type     AS ENUM ('charge', 'refund', 'adjustment');
CREATE TYPE platform_fee_type   AS ENUM ('freelancer_commission', 'client_processing', 'subscription', 'promotion');

-- ================================================================
-- UTILITY FUNCTIONS
-- ================================================================

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
    'CREATE TRIGGER trg_%s_updated_at
     BEFORE UPDATE ON %I
     FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
    tbl, tbl
  );
END;
$$;

-- ================================================================
-- SEQUENCE
-- ================================================================

CREATE SEQUENCE invoice_number_seq START 1;

-- ================================================================
-- TABLE: users
-- ================================================================

CREATE TABLE users (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email                     VARCHAR(255) NOT NULL UNIQUE,
  password_hash             TEXT         NOT NULL,
  role                      user_role    NOT NULL,
  status                    user_status  NOT NULL DEFAULT 'active',
  email_verified            BOOLEAN      NOT NULL DEFAULT FALSE,
  email_verify_token        TEXT,
  email_verify_expires_at   TIMESTAMPTZ,
  password_reset_token      TEXT,
  password_reset_expires_at TIMESTAMPTZ,
  failed_login_attempts     SMALLINT     NOT NULL DEFAULT 0,
  locked_until              TIMESTAMPTZ,
  last_login_at             TIMESTAMPTZ,
  last_login_ip             INET,
  mfa_enabled               BOOLEAN      NOT NULL DEFAULT FALSE,
  mfa_secret                TEXT,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at                TIMESTAMPTZ
);

SELECT apply_updated_at('users');
COMMENT ON COLUMN users.email_verify_token   IS 'SHA-256 hash of raw token. Raw token sent in email only.';
COMMENT ON COLUMN users.password_reset_token IS 'SHA-256 hash of raw token. Raw token sent in email only.';
COMMENT ON COLUMN users.mfa_secret           IS 'pgp_sym_encrypt(totp_secret, app_secret). Never plaintext.';
CREATE INDEX idx_users_role       ON users(role);
CREATE INDEX idx_users_status     ON users(status)     WHERE status != 'active';
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- ================================================================
-- TABLE: refresh_tokens
-- ================================================================

CREATE TABLE refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL,
  family      UUID        NOT NULL,
  is_revoked  BOOLEAN     NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rt_user_id    ON refresh_tokens(user_id);
CREATE INDEX idx_rt_family     ON refresh_tokens(family);
CREATE INDEX idx_rt_expires    ON refresh_tokens(expires_at);
CREATE INDEX idx_rt_active     ON refresh_tokens(is_revoked) WHERE is_revoked = FALSE;
CREATE INDEX idx_rt_token_hash ON refresh_tokens(token_hash);

-- ================================================================
-- TABLE: mfa_recovery_codes
-- ================================================================

CREATE TABLE mfa_recovery_codes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT        NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mrc_user_id ON mfa_recovery_codes(user_id) WHERE used_at IS NULL;

-- ================================================================
-- TABLE: freelancer_profiles
-- ================================================================

CREATE TABLE freelancer_profiles (
  id                       UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID             NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name             VARCHAR(100)     NOT NULL,
  tagline                  VARCHAR(255),
  bio                      TEXT,
  avatar_url               TEXT,
  hourly_rate              NUMERIC(10,2)    CHECK (hourly_rate >= 0),
  experience_level         experience_level,
  available_hours_per_week SMALLINT         CHECK (available_hours_per_week BETWEEN 1 AND 168),
  is_available             BOOLEAN          NOT NULL DEFAULT TRUE,
  portfolio_url            TEXT,
  location                 VARCHAR(100),
  timezone                 VARCHAR(50),
  languages                TEXT[]           NOT NULL DEFAULT '{}',
  total_earned             NUMERIC(14,2)    NOT NULL DEFAULT 0,
  jobs_completed           INTEGER          NOT NULL DEFAULT 0,
  average_rating           NUMERIC(3,2)     CHECK (average_rating BETWEEN 1 AND 5),
  total_reviews            INTEGER          NOT NULL DEFAULT 0,
  response_time_hours      SMALLINT,
  profile_completion       SMALLINT         NOT NULL DEFAULT 0 CHECK (profile_completion BETWEEN 0 AND 100),
  search_vector            tsvector,
  created_at               TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('freelancer_profiles');
CREATE INDEX idx_fp_search      ON freelancer_profiles USING GIN(search_vector);
CREATE INDEX idx_fp_available   ON freelancer_profiles(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_fp_hourly_rate ON freelancer_profiles(hourly_rate);
CREATE INDEX idx_fp_rating      ON freelancer_profiles(average_rating DESC NULLS LAST);
CREATE INDEX idx_fp_location    ON freelancer_profiles(location);

-- ================================================================
-- TABLE: client_profiles
-- ================================================================

CREATE TABLE client_profiles (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name     VARCHAR(100) NOT NULL,
  company_name     VARCHAR(255),
  company_size     VARCHAR(20),
  industry         VARCHAR(100),
  avatar_url       TEXT,
  bio              TEXT,
  website_url      TEXT,
  location         VARCHAR(100),
  timezone         VARCHAR(50),
  total_spent      NUMERIC(14,2) NOT NULL DEFAULT 0,
  jobs_posted      INTEGER       NOT NULL DEFAULT 0,
  jobs_completed   INTEGER       NOT NULL DEFAULT 0,
  average_rating   NUMERIC(3,2)  CHECK (average_rating BETWEEN 1 AND 5),
  total_reviews    INTEGER       NOT NULL DEFAULT 0,
  payment_verified BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('client_profiles');

-- ================================================================
-- TABLE: skills
-- ================================================================

CREATE TABLE skills (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL UNIQUE,
  category   VARCHAR(100),
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: freelancer_skills
-- ================================================================

CREATE TABLE freelancer_skills (
  freelancer_profile_id UUID         NOT NULL REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
  skill_id              UUID         NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level     SMALLINT     NOT NULL DEFAULT 3 CHECK (proficiency_level BETWEEN 1 AND 5),
  years_experience      NUMERIC(4,1) CHECK (years_experience >= 0),
  PRIMARY KEY (freelancer_profile_id, skill_id)
);

-- ================================================================
-- TABLE: portfolio_items
-- ================================================================

CREATE TABLE portfolio_items (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_profile_id UUID         NOT NULL REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
  title                 VARCHAR(255) NOT NULL,
  description           TEXT,
  project_url           TEXT,
  image_url             TEXT,
  tags                  TEXT[]       NOT NULL DEFAULT '{}',
  order_index           SMALLINT     NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('portfolio_items');

-- ================================================================
-- TABLE: job_postings
-- ================================================================

CREATE TABLE job_postings (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(255)    NOT NULL,
  description      TEXT            NOT NULL,
  budget_type      budget_type     NOT NULL,
  budget_min       NUMERIC(10,2)   CHECK (budget_min >= 0),
  budget_max       NUMERIC(10,2)   CHECK (budget_max >= budget_min),
  hourly_rate_min  NUMERIC(10,2)   CHECK (hourly_rate_min >= 0),
  hourly_rate_max  NUMERIC(10,2)   CHECK (hourly_rate_max >= hourly_rate_min),
  experience_level experience_level,
  estimated_weeks  SMALLINT        CHECK (estimated_weeks > 0),
  status           job_status      NOT NULL DEFAULT 'open',
  proposals_count  INTEGER         NOT NULL DEFAULT 0,
  views_count      INTEGER         NOT NULL DEFAULT 0,
  deadline_at      TIMESTAMPTZ,
  search_vector    tsvector,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  CONSTRAINT chk_budget CHECK (
    (budget_type = 'fixed'  AND budget_min IS NOT NULL AND budget_max IS NOT NULL) OR
    (budget_type = 'hourly' AND hourly_rate_min IS NOT NULL AND hourly_rate_max IS NOT NULL)
  )
);

SELECT apply_updated_at('job_postings');
CREATE INDEX idx_jp_client_id    ON job_postings(client_id);
CREATE INDEX idx_jp_status       ON job_postings(status);
CREATE INDEX idx_jp_search       ON job_postings USING GIN(search_vector);
CREATE INDEX idx_jp_created_at   ON job_postings(created_at DESC);
CREATE INDEX idx_jp_open         ON job_postings(created_at DESC) WHERE deleted_at IS NULL AND status = 'open';
CREATE INDEX idx_jp_budget_fixed ON job_postings(budget_min, budget_max) WHERE budget_type = 'fixed';
CREATE INDEX idx_jp_budget_hrly  ON job_postings(hourly_rate_min, hourly_rate_max) WHERE budget_type = 'hourly';

-- ================================================================
-- TABLE: job_skills
-- ================================================================

CREATE TABLE job_skills (
  job_id      UUID    NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  skill_id    UUID    NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (job_id, skill_id)
);

-- ================================================================
-- TABLE: saved_jobs
-- ================================================================

CREATE TABLE saved_jobs (
  freelancer_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id        UUID        NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (freelancer_id, job_id)
);

-- ================================================================
-- TABLE: proposals
-- ================================================================

CREATE TABLE proposals (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           UUID            NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  freelancer_id    UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cover_letter     TEXT            NOT NULL,
  proposed_rate    NUMERIC(10,2)   NOT NULL CHECK (proposed_rate > 0),
  proposed_weeks   SMALLINT        CHECK (proposed_weeks > 0),
  status           proposal_status NOT NULL DEFAULT 'pending',
  ai_generated     BOOLEAN         NOT NULL DEFAULT FALSE,
  client_viewed_at TIMESTAMPTZ,
  client_note      TEXT,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, freelancer_id)
);

SELECT apply_updated_at('proposals');
CREATE INDEX idx_prop_job_id     ON proposals(job_id);
CREATE INDEX idx_prop_freelancer ON proposals(freelancer_id);
CREATE INDEX idx_prop_status     ON proposals(status);

-- ================================================================
-- TABLE: projects
-- ================================================================

CREATE TABLE projects (
  id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                  UUID           REFERENCES job_postings(id) ON DELETE SET NULL,
  proposal_id             UUID           UNIQUE REFERENCES proposals(id) ON DELETE SET NULL,
  client_id               UUID           NOT NULL REFERENCES users(id),
  freelancer_id           UUID           NOT NULL REFERENCES users(id),
  title                   VARCHAR(255)   NOT NULL,
  description             TEXT,
  budget_type             budget_type    NOT NULL,
  agreed_rate             NUMERIC(10,2)  NOT NULL CHECK (agreed_rate > 0),
  total_budget            NUMERIC(14,2),
  start_date              DATE,
  end_date                DATE,
  status                  project_status NOT NULL DEFAULT 'active',
  client_completed_at     TIMESTAMPTZ,
  freelancer_completed_at TIMESTAMPTZ,
  created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('projects');
CREATE INDEX idx_proj_client_id  ON projects(client_id);
CREATE INDEX idx_proj_freelancer ON projects(freelancer_id);
CREATE INDEX idx_proj_status     ON projects(status);
CREATE INDEX idx_proj_active     ON projects(client_id, freelancer_id) WHERE status = 'active';

-- ================================================================
-- TABLE: milestones
-- ================================================================

CREATE TABLE milestones (
  id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID             NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title            VARCHAR(255)     NOT NULL,
  description      TEXT,
  amount           NUMERIC(10,2)    NOT NULL CHECK (amount > 0),
  due_date         DATE,
  order_index      SMALLINT         NOT NULL DEFAULT 0,
  status           milestone_status NOT NULL DEFAULT 'pending',
  started_at       TIMESTAMPTZ,
  submitted_at     TIMESTAMPTZ,
  approved_at      TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('milestones');
CREATE INDEX idx_ms_project_id ON milestones(project_id);
CREATE INDEX idx_ms_status     ON milestones(status);
CREATE INDEX idx_ms_due_date   ON milestones(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_ms_order      ON milestones(project_id, order_index);

-- ================================================================
-- TABLE: milestone_deliverables
-- ================================================================

CREATE TABLE milestone_deliverables (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id    UUID         NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  uploader_id     UUID         NOT NULL REFERENCES users(id),
  file_name       VARCHAR(255) NOT NULL,
  original_name   VARCHAR(255) NOT NULL,
  file_url        TEXT         NOT NULL,
  file_size_bytes BIGINT       CHECK (file_size_bytes > 0),
  mime_type       VARCHAR(100),
  note            TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: messages
-- ================================================================

CREATE TABLE messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES users(id),
  content         TEXT,
  msg_type        msg_type    NOT NULL DEFAULT 'text',
  file_url        TEXT,
  file_name       VARCHAR(255),
  file_size_bytes BIGINT,
  mime_type       VARCHAR(100),
  is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,
  reply_to_id     UUID        REFERENCES messages(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_message_content CHECK (
    (msg_type = 'text'   AND content  IS NOT NULL) OR
    (msg_type = 'file'   AND file_url IS NOT NULL) OR
    (msg_type = 'system' AND content  IS NOT NULL)
  )
);

CREATE INDEX idx_msg_project_id ON messages(project_id, created_at DESC);
CREATE INDEX idx_msg_unread     ON messages(project_id, is_read) WHERE is_read = FALSE AND is_deleted = FALSE;

-- ================================================================
-- TABLE: invoices
-- ================================================================

CREATE TABLE invoices (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number   VARCHAR(20)    NOT NULL UNIQUE,
  project_id       UUID           NOT NULL REFERENCES projects(id),
  milestone_id     UUID           REFERENCES milestones(id) ON DELETE SET NULL,
  freelancer_id    UUID           NOT NULL REFERENCES users(id),
  client_id        UUID           NOT NULL REFERENCES users(id),
  subtotal         NUMERIC(12,2)  NOT NULL CHECK (subtotal >= 0),
  tax_rate         NUMERIC(5,2)   NOT NULL DEFAULT 0 CHECK (tax_rate BETWEEN 0 AND 100),
  tax_amount       NUMERIC(12,2)  NOT NULL DEFAULT 0,
  total_amount     NUMERIC(12,2)  NOT NULL CHECK (total_amount >= 0),
  currency         CHAR(3)        NOT NULL DEFAULT 'PHP',
  status           invoice_status NOT NULL DEFAULT 'draft',
  due_date         DATE           NOT NULL,
  notes            TEXT,
  terms            TEXT,
  sent_at          TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  reminder_count   SMALLINT       NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_invoice_total CHECK (total_amount = subtotal + tax_amount)
);

SELECT apply_updated_at('invoices');
CREATE INDEX idx_inv_freelancer ON invoices(freelancer_id);
CREATE INDEX idx_inv_client     ON invoices(client_id);
CREATE INDEX idx_inv_status     ON invoices(status);
CREATE INDEX idx_inv_reminder   ON invoices(due_date, reminder_count) WHERE status IN ('sent', 'overdue');

-- ================================================================
-- TABLE: invoice_items
-- ================================================================

CREATE TABLE invoice_items (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT          NOT NULL,
  quantity    NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  amount      NUMERIC(12,2) NOT NULL,
  order_index SMALLINT      NOT NULL DEFAULT 0,
  CONSTRAINT chk_item_amount CHECK (amount = quantity * unit_price)
);

-- ================================================================
-- TABLE: payments
-- ================================================================

CREATE TABLE payments (
  id                  UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          UUID              NOT NULL REFERENCES invoices(id),
  payer_id            UUID              NOT NULL REFERENCES users(id),
  payee_id            UUID              NOT NULL REFERENCES users(id),
  amount              NUMERIC(12,2)     NOT NULL CHECK (amount > 0),
  currency            CHAR(3)           NOT NULL DEFAULT 'PHP',
  status              payment_status    NOT NULL DEFAULT 'pending',
  payment_method      VARCHAR(50),
  external_payment_id VARCHAR(255),
  failure_reason      TEXT,
  payment_type        payment_tx_type   NOT NULL DEFAULT 'charge',
  refunds_payment_id  UUID              REFERENCES payments(id) ON DELETE SET NULL,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_refund_link CHECK (
    (payment_type = 'refund' AND refunds_payment_id IS NOT NULL) OR
    (payment_type != 'refund')
  )
);

SELECT apply_updated_at('payments');
CREATE INDEX idx_pay_refunds ON payments(refunds_payment_id) WHERE payment_type = 'refund';

-- ================================================================
-- TABLE: time_entries
-- ================================================================

CREATE TABLE time_entries (
  id             UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID              NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  freelancer_id  UUID              NOT NULL REFERENCES users(id),
  milestone_id   UUID              REFERENCES milestones(id) ON DELETE SET NULL,
  description    TEXT              NOT NULL,
  start_time     TIMESTAMPTZ       NOT NULL,
  end_time       TIMESTAMPTZ,
  hours          NUMERIC(5,2)      CHECK (hours > 0 AND hours <= 24),
  is_billable    BOOLEAN           NOT NULL DEFAULT TRUE,
  status         time_entry_status NOT NULL DEFAULT 'draft',
  submitted_at   TIMESTAMPTZ,
  approved_by_id UUID              REFERENCES users(id),
  approved_at    TIMESTAMPTZ,
  rejection_note TEXT,
  invoice_id     UUID              REFERENCES invoices(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_time_range     CHECK (end_time IS NULL OR end_time > start_time),
  CONSTRAINT chk_hours_required CHECK ((end_time IS NULL) OR (hours IS NOT NULL))
);

SELECT apply_updated_at('time_entries');
CREATE INDEX idx_te_project_id    ON time_entries(project_id);
CREATE INDEX idx_te_freelancer_id ON time_entries(freelancer_id);
CREATE INDEX idx_te_milestone_id  ON time_entries(milestone_id);
CREATE INDEX idx_te_status        ON time_entries(status);
CREATE INDEX idx_te_date_range    ON time_entries(start_time, end_time);
CREATE INDEX idx_te_pending       ON time_entries(project_id, submitted_at) WHERE status = 'submitted';

-- ================================================================
-- TABLE: withdrawals
-- ================================================================

CREATE TABLE withdrawals (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id         UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount                NUMERIC(12,2)     NOT NULL CHECK (amount > 0),
  currency              CHAR(3)           NOT NULL DEFAULT 'PHP',
  status                withdrawal_status NOT NULL DEFAULT 'pending',
  payment_method        VARCHAR(50)       NOT NULL,
  account_details       TEXT,
  external_ref          VARCHAR(255),
  requested_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  failed_at             TIMESTAMPTZ,
  failure_reason        TEXT,
  admin_note            TEXT,
  processed_by_id       UUID              REFERENCES users(id),
  created_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('withdrawals');
COMMENT ON COLUMN withdrawals.account_details IS 'pgp_sym_encrypt(jsonb::TEXT, app_secret). Decrypt on read.';
CREATE INDEX idx_wd_freelancer ON withdrawals(freelancer_id);
CREATE INDEX idx_wd_status     ON withdrawals(status);
CREATE INDEX idx_wd_requested  ON withdrawals(requested_at DESC);
CREATE INDEX idx_wd_pending    ON withdrawals(requested_at) WHERE status = 'pending';

-- ================================================================
-- TABLE: reviews
-- ================================================================

CREATE TABLE reviews (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID        NOT NULL REFERENCES projects(id),
  reviewer_id          UUID        NOT NULL REFERENCES users(id),
  reviewee_id          UUID        NOT NULL REFERENCES users(id),
  rating               SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                VARCHAR(255),
  body                 TEXT,
  communication_rating SMALLINT    CHECK (communication_rating BETWEEN 1 AND 5),
  quality_rating       SMALLINT    CHECK (quality_rating BETWEEN 1 AND 5),
  timeliness_rating    SMALLINT    CHECK (timeliness_rating BETWEEN 1 AND 5),
  is_public            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, reviewer_id)
);

CREATE INDEX idx_rev_reviewee ON reviews(reviewee_id);
CREATE INDEX idx_rev_project  ON reviews(project_id);
CREATE INDEX idx_rev_reviewer ON reviews(reviewer_id);

-- ================================================================
-- TABLE: notifications
-- ================================================================

CREATE TABLE notifications (
  id         UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      VARCHAR(255)      NOT NULL,
  body       TEXT,
  data       JSONB,
  is_read    BOOLEAN           NOT NULL DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  action_url TEXT,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user   ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notif_unread ON notifications(user_id) WHERE is_read = FALSE;

-- ================================================================
-- TABLE: notification_preferences
-- ================================================================

CREATE TABLE notification_preferences (
  user_id UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type    notification_type NOT NULL,
  in_app  BOOLEAN           NOT NULL DEFAULT TRUE,
  email   BOOLEAN           NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, type)
);

-- ================================================================
-- TABLE: disputes
-- ================================================================

CREATE TABLE disputes (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID           NOT NULL REFERENCES projects(id),
  opened_by_id        UUID           NOT NULL REFERENCES users(id),
  respondent_id       UUID           NOT NULL REFERENCES users(id),
  reason              VARCHAR(255)   NOT NULL,
  description         TEXT           NOT NULL,
  status              dispute_status NOT NULL DEFAULT 'open',
  resolution          TEXT,
  resolved_by_id      UUID           REFERENCES users(id),
  resolved_at         TIMESTAMPTZ,
  is_priority         BOOLEAN        NOT NULL DEFAULT FALSE,
  priority_fee_paid   BOOLEAN        NOT NULL DEFAULT FALSE,
  sla_deadline        TIMESTAMPTZ,
  priority_payment_id UUID           REFERENCES payments(id),
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('disputes');
CREATE INDEX idx_disp_priority ON disputes(sla_deadline)
  WHERE is_priority = TRUE AND status IN ('open', 'under_review');

-- ================================================================
-- TABLE: dispute_messages
-- ================================================================

CREATE TABLE dispute_messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id       UUID        NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id        UUID        NOT NULL REFERENCES users(id),
  content          TEXT        NOT NULL,
  is_admin_message BOOLEAN     NOT NULL DEFAULT FALSE,
  attachments      JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dm_dispute_id ON dispute_messages(dispute_id);

-- ================================================================
-- TABLE: audit_logs
-- ================================================================

CREATE TABLE audit_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   UUID,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_al_user_id    ON audit_logs(user_id);
CREATE INDEX idx_al_entity     ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_al_action     ON audit_logs(action);
CREATE INDEX idx_al_created_at ON audit_logs(created_at DESC);

-- ================================================================
-- TABLE: file_uploads
-- ================================================================

CREATE TABLE file_uploads (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id     UUID         NOT NULL REFERENCES users(id),
  file_name       VARCHAR(255) NOT NULL,
  original_name   VARCHAR(255) NOT NULL,
  file_url        TEXT         NOT NULL,
  file_size_bytes BIGINT       NOT NULL CHECK (file_size_bytes > 0),
  mime_type       VARCHAR(100) NOT NULL,
  entity_type     VARCHAR(50),
  entity_id       UUID,
  is_public       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fu_entity   ON file_uploads(entity_type, entity_id);
CREATE INDEX idx_fu_uploader ON file_uploads(uploader_id);

-- ================================================================
-- TRIGGER FUNCTIONS
-- ================================================================

CREATE OR REPLACE FUNCTION fn_update_job_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')),       'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_job_search
  BEFORE INSERT OR UPDATE ON job_postings
  FOR EACH ROW EXECUTE FUNCTION fn_update_job_search_vector();

CREATE OR REPLACE FUNCTION fn_update_freelancer_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.tagline, '')),      'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')),          'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_freelancer_search
  BEFORE INSERT OR UPDATE ON freelancer_profiles
  FOR EACH ROW EXECUTE FUNCTION fn_update_freelancer_search_vector();

CREATE OR REPLACE FUNCTION fn_sync_proposals_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE job_postings SET proposals_count = proposals_count + 1 WHERE id = NEW.job_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE job_postings SET proposals_count = GREATEST(proposals_count - 1, 0) WHERE id = OLD.job_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_proposals_count
  AFTER INSERT OR DELETE ON proposals
  FOR EACH ROW EXECUTE FUNCTION fn_sync_proposals_count();

CREATE OR REPLACE FUNCTION fn_generate_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.invoice_number :=
    'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(nextval('invoice_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION fn_generate_invoice_number();

CREATE OR REPLACE FUNCTION fn_sync_financial_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE freelancer_profiles SET total_earned = total_earned + NEW.amount WHERE user_id = NEW.payee_id;
    UPDATE client_profiles     SET total_spent  = total_spent  + NEW.amount WHERE user_id = NEW.payer_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_financial_stats
  AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION fn_sync_financial_stats();

CREATE OR REPLACE FUNCTION fn_sync_jobs_posted()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE client_profiles SET jobs_posted = jobs_posted + 1 WHERE user_id = NEW.client_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_jobs_posted
  AFTER INSERT ON job_postings
  FOR EACH ROW EXECUTE FUNCTION fn_sync_jobs_posted();

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

CREATE TRIGGER trg_jobs_completed
  AFTER UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION fn_sync_jobs_completed();

CREATE OR REPLACE FUNCTION fn_recalc_average_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM users WHERE id = NEW.reviewee_id;
  IF v_role = 'freelancer' THEN
    UPDATE freelancer_profiles SET
      average_rating = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE reviewee_id = NEW.reviewee_id AND is_public = TRUE),
      total_reviews  = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = NEW.reviewee_id AND is_public = TRUE)
    WHERE user_id = NEW.reviewee_id;
  ELSIF v_role = 'client' THEN
    UPDATE client_profiles SET
      average_rating = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE reviewee_id = NEW.reviewee_id AND is_public = TRUE),
      total_reviews  = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = NEW.reviewee_id AND is_public = TRUE)
    WHERE user_id = NEW.reviewee_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_average_rating
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION fn_recalc_average_rating();

CREATE OR REPLACE FUNCTION fn_calculate_time_entry_hours()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.end_time IS NOT NULL AND NEW.hours IS NULL THEN
    NEW.hours := ROUND(EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600, 2);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calculate_hours
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION fn_calculate_time_entry_hours();

CREATE OR REPLACE FUNCTION fn_enforce_project_budget()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_project_budget  NUMERIC(14,2);
  v_milestone_total NUMERIC(14,2);
BEGIN
  SELECT total_budget INTO v_project_budget FROM projects WHERE id = NEW.project_id;
  IF v_project_budget IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_milestone_total
  FROM milestones WHERE project_id = NEW.project_id AND status != 'rejected' AND id != NEW.id;
  v_milestone_total := v_milestone_total + NEW.amount;
  IF v_milestone_total > v_project_budget THEN
    RAISE EXCEPTION 'Milestone total ($%) exceeds project budget ($%). Remaining: $%.',
      v_milestone_total, v_project_budget, v_project_budget - (v_milestone_total - NEW.amount)
    USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_budget
  BEFORE INSERT OR UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION fn_enforce_project_budget();

-- ================================================================
-- VIEWS
-- ================================================================

CREATE VIEW v_job_listings AS
SELECT jp.id, jp.title, jp.description, jp.budget_type, jp.budget_min, jp.budget_max,
  jp.hourly_rate_min, jp.hourly_rate_max, jp.experience_level, jp.estimated_weeks,
  jp.status, jp.proposals_count, jp.views_count, jp.deadline_at, jp.created_at, jp.search_vector,
  cp.display_name AS client_name, cp.avatar_url AS client_avatar, cp.company_name,
  cp.average_rating AS client_rating, cp.payment_verified,
  ARRAY_AGG(s.name ORDER BY s.name) FILTER (WHERE s.id IS NOT NULL) AS skill_names
FROM job_postings jp
JOIN client_profiles cp ON cp.user_id = jp.client_id
LEFT JOIN job_skills js ON js.job_id  = jp.id
LEFT JOIN skills     s  ON s.id       = js.skill_id
WHERE jp.deleted_at IS NULL
GROUP BY jp.id, cp.display_name, cp.avatar_url, cp.company_name, cp.average_rating, cp.payment_verified;

CREATE VIEW v_project_overview AS
SELECT p.id, p.title, p.status, p.budget_type, p.agreed_rate, p.total_budget,
  p.start_date, p.end_date, p.created_at,
  cp.display_name AS client_name, cp.avatar_url AS client_avatar,
  fp.display_name AS freelancer_name, fp.avatar_url AS freelancer_avatar,
  COUNT(m.id) AS total_milestones,
  COUNT(m.id) FILTER (WHERE m.status = 'approved') AS approved_milestones,
  COUNT(m.id) FILTER (WHERE m.status = 'paid')     AS paid_milestones,
  COALESCE(SUM(m.amount) FILTER (WHERE m.status = 'paid'), 0) AS total_paid,
  (SELECT COUNT(*) FROM messages msg WHERE msg.project_id = p.id AND msg.is_deleted = FALSE) AS message_count
FROM projects p
JOIN client_profiles     cp ON cp.user_id    = p.client_id
JOIN freelancer_profiles fp ON fp.user_id    = p.freelancer_id
LEFT JOIN milestones      m  ON m.project_id = p.id
GROUP BY p.id, cp.display_name, cp.avatar_url, fp.display_name, fp.avatar_url;

-- v_freelancer_earnings: pre-aggregate projects and invoices into subqueries
-- before joining to freelancer_profiles. Joining both flat onto the same base
-- table produces N×M rows (one per project-invoice pair), inflating
-- SUM(inv.total_amount) by the project count. Pre-aggregation reduces each
-- side to one row per freelancer_id before the join, eliminating the product.
CREATE VIEW v_freelancer_earnings AS
SELECT
  fp.user_id        AS freelancer_id,
  fp.display_name,
  fp.total_earned,
  fp.jobs_completed,
  fp.average_rating,
  fp.total_reviews,
  COALESCE(proj.active_projects, 0)      AS active_projects,
  COALESCE(inv.overdue_invoices, 0)      AS overdue_invoices,
  COALESCE(inv.pending_invoice_total, 0) AS pending_invoice_total
FROM freelancer_profiles fp
LEFT JOIN (
  SELECT freelancer_id,
    COUNT(*) FILTER (WHERE status = 'active') AS active_projects
  FROM projects
  GROUP BY freelancer_id
) proj ON proj.freelancer_id = fp.user_id
LEFT JOIN (
  SELECT freelancer_id,
    COUNT(*)          FILTER (WHERE status = 'overdue') AS overdue_invoices,
    SUM(total_amount) FILTER (WHERE status = 'sent')    AS pending_invoice_total
  FROM invoices
  GROUP BY freelancer_id
) inv ON inv.freelancer_id = fp.user_id;

CREATE VIEW v_project_time_summary AS
SELECT te.project_id, te.freelancer_id, COUNT(*) AS total_entries,
  SUM(te.hours) FILTER (WHERE te.is_billable = TRUE)               AS billable_hours,
  SUM(te.hours) FILTER (WHERE te.is_billable = FALSE)              AS non_billable_hours,
  SUM(te.hours) FILTER (WHERE te.status = 'approved')              AS approved_hours,
  SUM(te.hours) FILTER (WHERE te.status = 'billed')                AS billed_hours,
  SUM(te.hours) FILTER (WHERE te.status IN ('draft', 'submitted')) AS pending_hours,
  p.agreed_rate,
  SUM(te.hours) FILTER (WHERE te.status = 'approved') * p.agreed_rate AS approved_amount
FROM time_entries te
JOIN projects p ON p.id = te.project_id
GROUP BY te.project_id, te.freelancer_id, p.agreed_rate;

CREATE VIEW v_freelancer_balance AS
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

CREATE VIEW v_project_budget_status AS
SELECT p.id AS project_id, p.title, p.total_budget, p.budget_type,
  COALESCE(SUM(m.amount) FILTER (WHERE m.status != 'rejected'), 0) AS allocated_amount,
  p.total_budget - COALESCE(SUM(m.amount) FILTER (WHERE m.status != 'rejected'), 0) AS remaining_budget,
  COALESCE(SUM(m.amount) FILTER (WHERE m.status = 'paid'), 0) AS paid_amount,
  COUNT(m.id) FILTER (WHERE m.status != 'rejected') AS total_milestones,
  COUNT(m.id) FILTER (WHERE m.status = 'paid')      AS paid_milestones,
  CASE WHEN p.total_budget IS NULL OR p.total_budget = 0 THEN NULL
    ELSE ROUND((COALESCE(SUM(m.amount) FILTER (WHERE m.status != 'rejected'), 0) / p.total_budget) * 100, 2)
  END AS budget_utilization_percent
FROM projects p LEFT JOIN milestones m ON m.project_id = p.id
GROUP BY p.id, p.title, p.total_budget, p.budget_type;

CREATE VIEW v_payment_history AS
SELECT p.id, p.invoice_id, p.payer_id, p.payee_id, p.amount, p.currency, p.status,
  p.payment_type, p.payment_method, p.completed_at, p.created_at,
  CASE WHEN p.payment_type = 'refund' THEN refunded.id     ELSE NULL END AS original_payment_id,
  CASE WHEN p.payment_type = 'refund' THEN refunded.amount ELSE NULL END AS original_amount,
  p.amount - COALESCE(
    (SELECT SUM(r.amount) FROM payments r WHERE r.refunds_payment_id = p.id AND r.status = 'completed'), 0
  ) AS net_amount
FROM payments p LEFT JOIN payments refunded ON refunded.id = p.refunds_payment_id;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE projects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                ENABLE ROW LEVEL SECURITY;

CREATE POLICY pol_projects_access ON projects USING (
  client_id     = current_setting('app.current_user_id', TRUE)::UUID OR
  freelancer_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY pol_messages_access ON messages USING (
  project_id IN (SELECT id FROM projects WHERE
    client_id     = current_setting('app.current_user_id', TRUE)::UUID OR
    freelancer_id = current_setting('app.current_user_id', TRUE)::UUID));

CREATE POLICY pol_invoices_access ON invoices USING (
  freelancer_id = current_setting('app.current_user_id', TRUE)::UUID OR
  client_id     = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY pol_milestones_access ON milestones USING (
  project_id IN (SELECT id FROM projects WHERE
    client_id     = current_setting('app.current_user_id', TRUE)::UUID OR
    freelancer_id = current_setting('app.current_user_id', TRUE)::UUID));

CREATE POLICY pol_notifications_access ON notifications USING (
  user_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY pol_deliverables_access ON milestone_deliverables USING (
  milestone_id IN (
    SELECT m.id FROM milestones m JOIN projects p ON p.id = m.project_id WHERE
      p.client_id     = current_setting('app.current_user_id', TRUE)::UUID OR
      p.freelancer_id = current_setting('app.current_user_id', TRUE)::UUID));

CREATE POLICY pol_proposals_access ON proposals USING (
  freelancer_id = current_setting('app.current_user_id', TRUE)::UUID
  OR job_id IN (SELECT id FROM job_postings WHERE client_id = current_setting('app.current_user_id', TRUE)::UUID)
);

CREATE POLICY pol_withdrawals_access ON withdrawals USING (
  freelancer_id = current_setting('app.current_user_id', TRUE)::UUID
);

CREATE POLICY pol_disputes_access ON disputes USING (
  opened_by_id  = current_setting('app.current_user_id', TRUE)::UUID OR
  respondent_id = current_setting('app.current_user_id', TRUE)::UUID
);

CREATE POLICY pol_dispute_messages_access ON dispute_messages USING (
  dispute_id IN (
    SELECT id FROM disputes WHERE
      opened_by_id  = current_setting('app.current_user_id', TRUE)::UUID OR
      respondent_id = current_setting('app.current_user_id', TRUE)::UUID
  )
);

CREATE POLICY pol_time_entries_access ON time_entries USING (
  freelancer_id = current_setting('app.current_user_id', TRUE)::UUID
  OR project_id IN (SELECT id FROM projects WHERE client_id = current_setting('app.current_user_id', TRUE)::UUID)
);

CREATE POLICY pol_reviews_access ON reviews USING (
  is_public   = TRUE
  OR reviewer_id = current_setting('app.current_user_id', TRUE)::UUID
  OR reviewee_id = current_setting('app.current_user_id', TRUE)::UUID
);

-- ================================================================
-- COLLABORATION TABLES
-- ================================================================

CREATE TABLE collab_spaces (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at('collab_spaces');
CREATE INDEX idx_cs_project_id ON collab_spaces(project_id);

CREATE TABLE collab_documents (
  id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_space_id   UUID              NOT NULL REFERENCES collab_spaces(id) ON DELETE CASCADE,
  created_by_id     UUID              NOT NULL REFERENCES users(id),
  title             VARCHAR(255)      NOT NULL DEFAULT 'Untitled Document',
  content           JSONB,
  status            collab_doc_status NOT NULL DEFAULT 'active',
  version           INTEGER           NOT NULL DEFAULT 1,
  last_edited_by_id UUID              REFERENCES users(id),
  last_edited_at    TIMESTAMPTZ,
  order_index       SMALLINT          NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at('collab_documents');
CREATE INDEX idx_cd_space_id ON collab_documents(collab_space_id);
CREATE INDEX idx_cd_status   ON collab_documents(status) WHERE status = 'active';

CREATE TABLE collab_document_versions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID        NOT NULL REFERENCES collab_documents(id) ON DELETE CASCADE,
  version     INTEGER     NOT NULL,
  content     JSONB       NOT NULL,
  saved_by_id UUID        NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, version)
);
CREATE INDEX idx_cdv_document_id ON collab_document_versions(document_id);
CREATE INDEX idx_cdv_version     ON collab_document_versions(document_id, version DESC);

CREATE TABLE collab_boards (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_space_id UUID              NOT NULL REFERENCES collab_spaces(id) ON DELETE CASCADE,
  created_by_id   UUID              NOT NULL REFERENCES users(id),
  title           VARCHAR(255)      NOT NULL DEFAULT 'Untitled Board',
  description     TEXT,
  thumbnail_url   TEXT,
  version         INTEGER           NOT NULL DEFAULT 1,
  status          collab_doc_status NOT NULL DEFAULT 'active',
  order_index     SMALLINT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at('collab_boards');
CREATE INDEX idx_cb_space_id ON collab_boards(collab_space_id);

CREATE TABLE collab_board_elements (
  id            UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id      UUID               NOT NULL REFERENCES collab_boards(id) ON DELETE CASCADE,
  created_by_id UUID               NOT NULL REFERENCES users(id),
  element_type  board_element_type NOT NULL,
  x             NUMERIC(10,2)      NOT NULL DEFAULT 0,
  y             NUMERIC(10,2)      NOT NULL DEFAULT 0,
  width         NUMERIC(10,2),
  height        NUMERIC(10,2),
  rotation      NUMERIC(6,2)       NOT NULL DEFAULT 0,
  content       TEXT,
  style         JSONB,
  data          JSONB,
  z_index       INTEGER            NOT NULL DEFAULT 0,
  source_id     UUID               REFERENCES collab_board_elements(id) ON DELETE SET NULL,
  target_id     UUID               REFERENCES collab_board_elements(id) ON DELETE SET NULL,
  is_locked     BOOLEAN            NOT NULL DEFAULT FALSE,
  is_deleted    BOOLEAN            NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at('collab_board_elements');
CREATE INDEX idx_cbe_board_id ON collab_board_elements(board_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_cbe_z_index  ON collab_board_elements(board_id, z_index);

CREATE TABLE sticky_notes (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collab_space_id UUID              REFERENCES collab_spaces(id) ON DELETE CASCADE,
  scope           sticky_note_scope NOT NULL DEFAULT 'personal',
  content         TEXT              NOT NULL,
  color           VARCHAR(20)       NOT NULL DEFAULT '#FEFF9C',
  position_x      NUMERIC(10,2),
  position_y      NUMERIC(10,2),
  is_pinned       BOOLEAN           NOT NULL DEFAULT FALSE,
  is_archived     BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_shared_scope CHECK (scope = 'personal' OR (scope = 'shared' AND collab_space_id IS NOT NULL))
);
SELECT apply_updated_at('sticky_notes');
CREATE INDEX idx_sn_owner_id ON sticky_notes(owner_id)        WHERE is_archived = FALSE;
CREATE INDEX idx_sn_space_id ON sticky_notes(collab_space_id) WHERE scope = 'shared';

CREATE TABLE reminders (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID            NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  collab_space_id UUID            REFERENCES collab_spaces(id)    ON DELETE SET NULL,
  project_id      UUID            REFERENCES projects(id)         ON DELETE SET NULL,
  milestone_id    UUID            REFERENCES milestones(id)       ON DELETE SET NULL,
  title           VARCHAR(255)    NOT NULL,
  notes           TEXT,
  due_at          TIMESTAMPTZ     NOT NULL,
  status          reminder_status NOT NULL DEFAULT 'pending',
  sent_at         TIMESTAMPTZ,
  dismissed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at('reminders');
CREATE INDEX idx_rem_owner_id ON reminders(owner_id);
CREATE INDEX idx_rem_due_at   ON reminders(due_at) WHERE status = 'pending';

CREATE TABLE collab_calls (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collab_space_id UUID        NOT NULL REFERENCES collab_spaces(id) ON DELETE CASCADE,
  initiated_by_id UUID        NOT NULL REFERENCES users(id),
  call_type       call_type   NOT NULL DEFAULT 'video',
  status          call_status NOT NULL DEFAULT 'initiated',
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration_seconds INTEGER    CHECK (duration_seconds >= 0),
  room_id         VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at('collab_calls');
CREATE INDEX idx_cc_space_id ON collab_calls(collab_space_id);
CREATE INDEX idx_cc_status   ON collab_calls(status);

CREATE TABLE collab_call_participants (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id   UUID        NOT NULL REFERENCES collab_calls(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES users(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at   TIMESTAMPTZ,
  UNIQUE (call_id, user_id)
);
CREATE INDEX idx_ccp_call_id ON collab_call_participants(call_id);
CREATE INDEX idx_ccp_user_id ON collab_call_participants(user_id);

CREATE TABLE collab_whiteboards (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id         UUID        NOT NULL UNIQUE REFERENCES collab_calls(id) ON DELETE CASCADE,
  collab_space_id UUID        NOT NULL REFERENCES collab_spaces(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at('collab_whiteboards');

CREATE TABLE collab_whiteboard_elements (
  id            UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id UUID               NOT NULL REFERENCES collab_whiteboards(id) ON DELETE CASCADE,
  drawn_by_id   UUID               NOT NULL REFERENCES users(id),
  element_type  board_element_type NOT NULL,
  x             NUMERIC(10,2)      NOT NULL DEFAULT 0,
  y             NUMERIC(10,2)      NOT NULL DEFAULT 0,
  width         NUMERIC(10,2),
  height        NUMERIC(10,2),
  rotation      NUMERIC(6,2)       NOT NULL DEFAULT 0,
  content       TEXT,
  style         JSONB,
  data          JSONB,
  z_index       INTEGER            NOT NULL DEFAULT 0,
  is_deleted    BOOLEAN            NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at('collab_whiteboard_elements');
CREATE INDEX idx_cwe_whiteboard_id ON collab_whiteboard_elements(whiteboard_id) WHERE is_deleted = FALSE;

CREATE TABLE collab_whiteboard_snapshots (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id  UUID        NOT NULL REFERENCES collab_whiteboards(id) ON DELETE CASCADE,
  captured_by_id UUID        NOT NULL REFERENCES users(id),
  snapshot_url   TEXT        NOT NULL,
  elements_state JSONB,
  label          VARCHAR(255),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cws_whiteboard_id ON collab_whiteboard_snapshots(whiteboard_id);

-- ================================================================
-- FEATURE TABLES
-- ================================================================

CREATE TABLE profile_views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID        NOT NULL REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
  viewer_id  UUID        REFERENCES users(id) ON DELETE SET NULL,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pv_profile_id ON profile_views(profile_id, viewed_at DESC);
CREATE INDEX idx_pv_viewer_id  ON profile_views(viewer_id)  WHERE viewer_id IS NOT NULL;

CREATE TABLE teams (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at('teams');
CREATE INDEX idx_teams_owner_id ON teams(owner_id);

CREATE TABLE team_members (
  team_id   UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      VARCHAR(50) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX idx_tm_user_id ON team_members(user_id);

CREATE TABLE contract_templates (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  body       TEXT         NOT NULL,
  is_nda     BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at('contract_templates');
CREATE INDEX idx_ct_owner_id ON contract_templates(owner_id) WHERE is_active = TRUE;

CREATE TABLE content_reports (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID         NOT NULL REFERENCES users(id),
  entity_type VARCHAR(50)  NOT NULL,
  entity_id   UUID         NOT NULL,
  reason      VARCHAR(255) NOT NULL,
  description TEXT,
  status      VARCHAR(50)  NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
  reviewed_by UUID         REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cr_entity ON content_reports(entity_type, entity_id);
CREATE INDEX idx_cr_status ON content_reports(status) WHERE status = 'pending';

CREATE TABLE user_verifications (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL,
  status            VARCHAR(50) NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_uv_user_id ON user_verifications(user_id, verification_type);

CREATE TABLE ai_proposal_usage (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_month DATE        NOT NULL,
  count        INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period_month)
);
SELECT apply_updated_at('ai_proposal_usage');
CREATE INDEX idx_apu_user_month ON ai_proposal_usage(user_id, period_month DESC);

CREATE TABLE saved_freelancers (
  client_id             UUID        NOT NULL REFERENCES users(id)               ON DELETE CASCADE,
  freelancer_profile_id UUID        NOT NULL REFERENCES freelancer_profiles(id)  ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (client_id, freelancer_profile_id)
);
CREATE INDEX idx_sf_client_id ON saved_freelancers(client_id);

CREATE TABLE collab_board_versions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id       UUID        NOT NULL REFERENCES collab_boards(id) ON DELETE CASCADE,
  version        INTEGER     NOT NULL,
  elements_state JSONB,
  saved_by_id    UUID        NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (board_id, version)
);
CREATE INDEX idx_cbv_board_id ON collab_board_versions(board_id, version DESC);

-- ================================================================
-- MONETIZATION TABLES
-- ================================================================

CREATE TABLE subscription_plans (
  id                     UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   subscription_plan NOT NULL UNIQUE,
  display_name           VARCHAR(100)      NOT NULL,
  description            TEXT,
  price_monthly          NUMERIC(10,2)     NOT NULL DEFAULT 0,
  price_quarterly        NUMERIC(10,2),
  price_annual           NUMERIC(10,2),
  currency               CHAR(3)           NOT NULL DEFAULT 'PHP',
  is_active              BOOLEAN           NOT NULL DEFAULT TRUE,
  ai_proposals_unlimited BOOLEAN           NOT NULL DEFAULT FALSE,
  profile_analytics      BOOLEAN           NOT NULL DEFAULT FALSE,
  verified_badge         BOOLEAN           NOT NULL DEFAULT FALSE,
  multi_user_team        BOOLEAN           NOT NULL DEFAULT FALSE,
  advanced_contracts     BOOLEAN           NOT NULL DEFAULT FALSE,
  priority_support       BOOLEAN           NOT NULL DEFAULT FALSE,
  max_active_jobs        SMALLINT,
  max_team_members       SMALLINT,
  created_at             TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at('subscription_plans');

CREATE TABLE user_subscriptions (
  id                   UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id              UUID                NOT NULL REFERENCES subscription_plans(id),
  status               subscription_status NOT NULL DEFAULT 'trialing',
  billing_interval     billing_interval    NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ         NOT NULL,
  current_period_end   TIMESTAMPTZ         NOT NULL,
  trial_ends_at        TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,
  cancellation_reason  TEXT,
  external_sub_id      VARCHAR(255),
  payment_method       VARCHAR(50),
  created_at           TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at('user_subscriptions');
CREATE INDEX idx_us_user_id    ON user_subscriptions(user_id);
CREATE INDEX idx_us_status     ON user_subscriptions(status);
CREATE INDEX idx_us_period_end ON user_subscriptions(current_period_end) WHERE status IN ('active', 'trialing');

CREATE TABLE fee_schedules (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(100)  NOT NULL,
  description           TEXT,
  is_active             BOOLEAN       NOT NULL DEFAULT FALSE,
  freelancer_rate_pct   NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (freelancer_rate_pct  BETWEEN 0 AND 50),
  client_processing_pct NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (client_processing_pct BETWEEN 0 AND 20),
  min_fee_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_fee_amount        NUMERIC(10,2),
  valid_from            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  valid_until           TIMESTAMPTZ,
  created_by_id         UUID          REFERENCES users(id),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at('fee_schedules');
CREATE INDEX idx_fs_active ON fee_schedules(is_active) WHERE is_active = TRUE;

CREATE TABLE platform_fees (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID              NOT NULL REFERENCES payments(id),
  fee_schedule_id UUID              REFERENCES fee_schedules(id),
  payer_id        UUID              NOT NULL REFERENCES users(id),
  fee_type        platform_fee_type NOT NULL,
  gross_amount    NUMERIC(12,2)     NOT NULL,
  fee_rate_pct    NUMERIC(5,2)      NOT NULL,
  fee_amount      NUMERIC(12,2)     NOT NULL CHECK (fee_amount >= 0),
  currency        CHAR(3)           NOT NULL DEFAULT 'PHP',
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pf_payment_id ON platform_fees(payment_id);
CREATE INDEX idx_pf_payer_id   ON platform_fees(payer_id);
CREATE INDEX idx_pf_created_at ON platform_fees(created_at DESC);

CREATE TABLE credit_ledger (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tx_type       credit_tx_type NOT NULL,
  amount        INTEGER        NOT NULL,
  balance_after INTEGER        NOT NULL,
  description   TEXT           NOT NULL,
  ref_type      VARCHAR(50),
  ref_id        UUID,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cl_user_id    ON credit_ledger(user_id);
CREATE INDEX idx_cl_created_at ON credit_ledger(user_id, created_at DESC);

CREATE TABLE job_promotions (
  id             UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID             NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  promoted_by_id UUID             NOT NULL REFERENCES users(id),
  status         promotion_status NOT NULL DEFAULT 'pending',
  fee_amount     NUMERIC(10,2)    NOT NULL CHECK (fee_amount >= 0),
  currency       CHAR(3)          NOT NULL DEFAULT 'PHP',
  payment_id     UUID             REFERENCES payments(id),
  starts_at      TIMESTAMPTZ,
  ends_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at('job_promotions');
CREATE INDEX idx_jp_promo_job    ON job_promotions(job_id);
CREATE INDEX idx_jp_promo_active ON job_promotions(ends_at) WHERE status = 'active';

CREATE TABLE proposal_boosts (
  id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id      UUID             NOT NULL UNIQUE REFERENCES proposals(id) ON DELETE CASCADE,
  freelancer_id    UUID             NOT NULL REFERENCES users(id),
  status           promotion_status NOT NULL DEFAULT 'pending',
  credits_spent    INTEGER          NOT NULL CHECK (credits_spent > 0),
  credit_ledger_id UUID             REFERENCES credit_ledger(id),
  activated_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pb_freelancer_id ON proposal_boosts(freelancer_id);
CREATE INDEX idx_pb_active        ON proposal_boosts(expires_at) WHERE status = 'active';

CREATE TABLE tax_records (
  id               UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tax_period_start DATE              NOT NULL,
  tax_period_end   DATE              NOT NULL,
  total_income     NUMERIC(14,2)     NOT NULL DEFAULT 0,
  total_fees_paid  NUMERIC(12,2)     NOT NULL DEFAULT 0,
  net_taxable      NUMERIC(14,2)     NOT NULL DEFAULT 0,
  tax_rate_pct     NUMERIC(5,2),
  estimated_tax    NUMERIC(12,2),
  currency         CHAR(3)           NOT NULL DEFAULT 'PHP',
  filing_status    tax_filing_status NOT NULL DEFAULT 'draft',
  external_ref     VARCHAR(255),
  notes            TEXT,
  generated_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  filed_at         TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tax_period_start, tax_period_end)
);
SELECT apply_updated_at('tax_records');
CREATE INDEX idx_tr_user_id       ON tax_records(user_id);
CREATE INDEX idx_tr_period        ON tax_records(tax_period_start, tax_period_end);
CREATE INDEX idx_tr_filing_status ON tax_records(filing_status);

CREATE TABLE subscription_invoices (
  id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id      UUID           NOT NULL REFERENCES user_subscriptions(id),
  amount               NUMERIC(10,2)  NOT NULL CHECK (amount >= 0),
  currency             CHAR(3)        NOT NULL DEFAULT 'PHP',
  status               invoice_status NOT NULL DEFAULT 'draft',
  billing_period_start TIMESTAMPTZ    NOT NULL,
  billing_period_end   TIMESTAMPTZ    NOT NULL,
  paid_at              TIMESTAMPTZ,
  external_inv_id      VARCHAR(255),
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at('subscription_invoices');
CREATE INDEX idx_si_user_id         ON subscription_invoices(user_id);
CREATE INDEX idx_si_subscription_id ON subscription_invoices(subscription_id);
CREATE INDEX idx_si_status          ON subscription_invoices(status);

-- ================================================================
-- MONETIZATION VIEWS
-- ================================================================

CREATE VIEW v_platform_revenue AS
SELECT DATE_TRUNC('month', pf.created_at) AS month, pf.fee_type,
  COUNT(*) AS transaction_count, SUM(pf.fee_amount) AS total_fees,
  AVG(pf.fee_rate_pct) AS avg_rate_pct, SUM(pf.gross_amount) AS total_gross_volume
FROM platform_fees pf
GROUP BY DATE_TRUNC('month', pf.created_at), pf.fee_type ORDER BY month DESC, fee_type;

CREATE VIEW v_user_subscription_status AS
SELECT us.user_id, sp.name AS plan_name, sp.display_name AS plan_display_name,
  us.status AS sub_status, us.current_period_end, us.trial_ends_at,
  sp.ai_proposals_unlimited, sp.profile_analytics, sp.verified_badge,
  sp.multi_user_team, sp.advanced_contracts, sp.priority_support,
  sp.max_active_jobs, sp.max_team_members
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.status IN ('active', 'trialing');

CREATE VIEW v_credit_balances AS
SELECT user_id,
  SUM(amount) AS current_balance,
  SUM(amount) FILTER (WHERE tx_type = 'purchase') AS total_purchased,
  SUM(amount) FILTER (WHERE tx_type = 'earned')   AS total_earned,
  ABS(SUM(amount) FILTER (WHERE amount < 0))       AS total_spent,
  MAX(created_at) AS last_tx_at
FROM credit_ledger GROUP BY user_id;

-- ================================================================
-- ADMIN ROLE: githustle_admin (BYPASSRLS)
-- ================================================================
-- Service role for admin backend routes.
-- Uses BYPASSRLS so all RLS policies are skipped — no policy changes needed.
-- Admin routes connect via a separate connection pool authenticated as this role.
-- Regular user routes use a different pool (default app role).
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
-- TABLE: payment_gateway_events
-- ================================================================
-- Webhook idempotency log for Stripe, GCash, Maya, PayPal.
-- event_id UNIQUE prevents double-processing of duplicate deliveries.
-- processed = FALSE partial index is the queue the webhook worker polls.
-- ================================================================

CREATE TABLE payment_gateway_events (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway      VARCHAR(50)  NOT NULL,
  event_id     VARCHAR(255) NOT NULL UNIQUE,
  event_type   VARCHAR(100) NOT NULL,
  payload      JSONB        NOT NULL,
  payment_id   UUID         REFERENCES payments(id),
  processed    BOOLEAN      NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pge_event_id    ON payment_gateway_events(event_id);
CREATE INDEX idx_pge_unprocessed ON payment_gateway_events(processed) WHERE processed = FALSE;
CREATE INDEX idx_pge_payment_id  ON payment_gateway_events(payment_id) WHERE payment_id IS NOT NULL;

-- ================================================================
-- END: 000_general_migration.sql
-- 59 tables · 29 enums · 10 explicit triggers + apply_updated_at triggers · 10 views · 1 function · 1 admin role
-- Run seeds separately: server/sql/seeds/000_seed.sql
-- ================================================================
