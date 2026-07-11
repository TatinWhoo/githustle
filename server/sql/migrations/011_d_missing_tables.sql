-- ================================================================
-- 011_d_missing_tables.sql
-- Creates 8 feature tables + collab_board_versions
-- Fixes issues 1.13 (profile_views), 1.14 (teams + team_members),
--              1.15 (contract_templates), 1.16 (content_reports),
--              1.17 (user_verifications), 1.18 (ai_proposal_usage),
--              1.19 (saved_freelancers), 1.23 (collab_board_versions)
-- Depends on: 001, 002, 003, 009
-- Additive only — no existing tables modified
-- ================================================================

-- ----------------------------------------------------------------
-- Issue 1.13 — profile_views
-- ----------------------------------------------------------------
CREATE TABLE profile_views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID        NOT NULL REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
  viewer_id  UUID        REFERENCES users(id) ON DELETE SET NULL,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pv_profile_id ON profile_views(profile_id, viewed_at DESC);
CREATE INDEX idx_pv_viewer_id  ON profile_views(viewer_id)  WHERE viewer_id IS NOT NULL;

-- ----------------------------------------------------------------
-- Issue 1.14 — teams + team_members
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- Issue 1.15 — contract_templates
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- Issue 1.16 — content_reports
-- ----------------------------------------------------------------
CREATE TABLE content_reports (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID         NOT NULL REFERENCES users(id),
  entity_type VARCHAR(50)  NOT NULL,
  entity_id   UUID         NOT NULL,
  reason      VARCHAR(255) NOT NULL,
  description TEXT,
  status      VARCHAR(50)  NOT NULL DEFAULT 'pending',
  reviewed_by UUID         REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cr_entity ON content_reports(entity_type, entity_id);
CREATE INDEX idx_cr_status ON content_reports(status) WHERE status = 'pending';

-- ----------------------------------------------------------------
-- Issue 1.17 — user_verifications
-- ----------------------------------------------------------------
CREATE TABLE user_verifications (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL,
  status            VARCHAR(50) NOT NULL DEFAULT 'pending',
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_uv_user_id ON user_verifications(user_id, verification_type);

-- ----------------------------------------------------------------
-- Issue 1.18 — ai_proposal_usage
-- ----------------------------------------------------------------
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

-- ----------------------------------------------------------------
-- Issue 1.19 — saved_freelancers
-- ----------------------------------------------------------------
CREATE TABLE saved_freelancers (
  client_id             UUID        NOT NULL REFERENCES users(id)              ON DELETE CASCADE,
  freelancer_profile_id UUID        NOT NULL REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (client_id, freelancer_profile_id)
);
CREATE INDEX idx_sf_client_id ON saved_freelancers(client_id);

-- ----------------------------------------------------------------
-- Issue 1.23 — collab_board_versions
-- ----------------------------------------------------------------
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
