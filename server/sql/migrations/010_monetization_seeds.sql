-- ================================================================
-- 010_monetization_seeds.sql
-- subscription_plans, user_subscriptions, fee_schedules,
-- platform_fees, credit_ledger, job_promotions, proposal_boosts,
-- tax_records, subscription_invoices
-- + 3 monetization views
-- + seed data (plans, fee schedules, skills)
-- Depends on: 008
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
CREATE INDEX idx_us_period_end ON user_subscriptions(current_period_end)
  WHERE status IN ('active', 'trialing');

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
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID          NOT NULL REFERENCES payments(id),
  fee_schedule_id UUID          REFERENCES fee_schedules(id),
  payer_id        UUID          NOT NULL REFERENCES users(id),
  fee_type        VARCHAR(50)   NOT NULL,
  gross_amount    NUMERIC(12,2) NOT NULL,
  fee_rate_pct    NUMERIC(5,2)  NOT NULL,
  fee_amount      NUMERIC(12,2) NOT NULL CHECK (fee_amount >= 0),
  currency        CHAR(3)       NOT NULL DEFAULT 'PHP',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
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
CREATE INDEX idx_cl_expiry     ON credit_ledger(expires_at)
  WHERE expires_at IS NOT NULL AND tx_type = 'earned';

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
-- VIEWS
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
-- SEED DATA: Subscription Plans
-- ================================================================

INSERT INTO subscription_plans (name, display_name, description, price_monthly, currency,
  ai_proposals_unlimited, profile_analytics, verified_badge,
  multi_user_team, advanced_contracts, priority_support, max_active_jobs, max_team_members)
VALUES
  ('free',            'Free',             'Core job matching and milestone tracking.',              0,   'PHP', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 5,    1),
  ('pro_freelancer',  'GitHustle Pro',    'For serious freelancers who want every edge.',           299, 'PHP', TRUE,  TRUE,  TRUE,  FALSE, FALSE, TRUE,  NULL, 1),
  ('business_client', 'GitHustle Business','For teams and agencies managing multiple contractors.', 799, 'PHP', FALSE, TRUE,  FALSE, TRUE,  TRUE,  TRUE,  NULL, NULL);

-- ================================================================
-- SEED DATA: Fee Schedules
-- ================================================================

INSERT INTO fee_schedules (name, description, is_active, freelancer_rate_pct, client_processing_pct, min_fee_amount, valid_from)
VALUES
  ('Beta Launch — Zero Fee',  'Zero-fee beta period. Deactivate when ready.', TRUE,  0,    0,    0,  NOW()),
  ('Standard — 5% / 2%',     'Post-beta rates. Activate after beta ends.',   FALSE, 5.00, 2.00, 10, NOW());

-- ================================================================
-- SEED DATA: Skills
-- ================================================================

INSERT INTO skills (name, category) VALUES
  ('JavaScript','Development'),('TypeScript','Development'),('React','Development'),
  ('Vue.js','Development'),('Angular','Development'),('Node.js','Development'),
  ('Python','Development'),('Django','Development'),('FastAPI','Development'),
  ('PostgreSQL','Development'),('MongoDB','Development'),('Redis','Development'),
  ('Docker','Development'),('Kubernetes','Development'),('REST API Design','Development'),
  ('GraphQL','Development'),('PHP','Development'),('Laravel','Development'),
  ('WordPress','Development'),('React Native','Development'),('Flutter','Development'),
  ('Swift','Development'),('Kotlin','Development'),
  ('UI/UX Design','Design'),('Figma','Design'),('Adobe XD','Design'),
  ('Graphic Design','Design'),('Logo Design','Design'),('Motion Design','Design'),
  ('Brand Identity','Design'),('Illustration','Design'),
  ('Content Writing','Writing'),('Copywriting','Writing'),('Technical Writing','Writing'),
  ('Blog Writing','Writing'),('Proofreading','Writing'),('Translation','Writing'),
  ('SEO','Marketing'),('Social Media','Marketing'),('Email Marketing','Marketing'),
  ('Google Ads','Marketing'),('Facebook Ads','Marketing'),('Content Strategy','Marketing'),
  ('Video Editing','Media'),('Photography','Media'),('Podcast Editing','Media'),
  ('Animation','Media'),('3D Modeling','Media');
