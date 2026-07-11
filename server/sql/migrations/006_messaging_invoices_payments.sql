-- ================================================================
-- 006_messaging_invoices_payments.sql
-- messages, invoices, invoice_items, payments,
-- time_entries, withdrawals
-- Depends on: 005
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

CREATE INDEX idx_msg_project ON messages(project_id, created_at DESC);
CREATE INDEX idx_msg_unread  ON messages(project_id, is_read) WHERE is_read = FALSE AND is_deleted = FALSE;

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

CREATE TABLE payments (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          UUID           NOT NULL REFERENCES invoices(id),
  payer_id            UUID           NOT NULL REFERENCES users(id),
  payee_id            UUID           NOT NULL REFERENCES users(id),
  amount              NUMERIC(12,2)  NOT NULL CHECK (amount > 0),
  currency            CHAR(3)        NOT NULL DEFAULT 'PHP',
  status              payment_status NOT NULL DEFAULT 'pending',
  payment_method      VARCHAR(50),
  external_payment_id VARCHAR(255),
  failure_reason      TEXT,
  payment_type        VARCHAR(20)    NOT NULL DEFAULT 'charge',
  refunds_payment_id  UUID           REFERENCES payments(id) ON DELETE SET NULL,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_payment_type CHECK (payment_type IN ('charge', 'refund', 'adjustment')),
  CONSTRAINT chk_refund_link  CHECK (
    (payment_type = 'refund' AND refunds_payment_id IS NOT NULL) OR
    (payment_type != 'refund')
  )
);

SELECT apply_updated_at('payments');
CREATE INDEX idx_pay_refunds ON payments(refunds_payment_id) WHERE payment_type = 'refund';

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

CREATE TABLE withdrawals (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id         UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount                NUMERIC(12,2)     NOT NULL CHECK (amount > 0),
  currency              CHAR(3)           NOT NULL DEFAULT 'PHP',
  status                withdrawal_status NOT NULL DEFAULT 'pending',
  payment_method        VARCHAR(50)       NOT NULL,
  account_details       JSONB,
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
CREATE INDEX idx_wd_freelancer ON withdrawals(freelancer_id);
CREATE INDEX idx_wd_status     ON withdrawals(status);
CREATE INDEX idx_wd_requested  ON withdrawals(requested_at DESC);
CREATE INDEX idx_wd_pending    ON withdrawals(requested_at) WHERE status = 'pending';
