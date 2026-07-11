-- ================================================================
-- 005_projects_milestones.sql
-- projects, milestones, milestone_deliverables
-- Depends on: 004
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
