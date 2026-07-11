-- ================================================================
-- 007_reviews_notifications_disputes_audit.sql
-- reviews, notifications, notification_preferences,
-- disputes, dispute_messages, audit_logs, file_uploads
-- Depends on: 006
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

CREATE TABLE notification_preferences (
  user_id UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type    notification_type NOT NULL,
  in_app  BOOLEAN           NOT NULL DEFAULT TRUE,
  email   BOOLEAN           NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, type)
);

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
