-- ================================================================
-- 004_jobs_proposals.sql
-- job_postings, job_skills, saved_jobs, proposals
-- Depends on: 003
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

CREATE TABLE job_skills (
  job_id      UUID    NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  skill_id    UUID    NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE saved_jobs (
  freelancer_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id        UUID        NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (freelancer_id, job_id)
);

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
