-- ================================================================
-- 002_users_auth.sql
-- users, refresh_tokens
-- Depends on: 001
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
  mfa_recovery_codes        TEXT[],
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at                TIMESTAMPTZ
);

SELECT apply_updated_at('users');
CREATE INDEX idx_users_role       ON users(role);
CREATE INDEX idx_users_status     ON users(status)     WHERE status != 'active';
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TABLE refresh_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT        NOT NULL,
  family     UUID        NOT NULL,
  is_revoked BOOLEAN     NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rt_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_rt_family  ON refresh_tokens(family);
CREATE INDEX idx_rt_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_rt_active  ON refresh_tokens(is_revoked) WHERE is_revoked = FALSE;
