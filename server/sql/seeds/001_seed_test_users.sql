-- ================================================================
-- GitHustle — Test Users Seed
-- server/sql/seeds/001_seed_test_users.sql
-- ================================================================
-- Seeds 5 freelancers, 5 clients, 2 admins for local/dev testing.
-- All accounts:
--   - email_verified = TRUE  (no verification email flow needed)
--   - status         = 'active'
--
-- Passwords (bcryptjs, 12 rounds — matches BCRYPT_SALT_ROUNDS in .env):
--   All freelancers + clients  →  GitHustle_2025!
--   Both admins                →  Admin_GitHustle_2025!
--
-- Usage:
--   psql "$env:DATABASE_URL" -f "server/sql/seeds/001_seed_test_users.sql"
--
-- Safe to re-run: ON CONFLICT (email) DO NOTHING.
-- ================================================================

INSERT INTO users (email, password_hash, role, status, email_verified) VALUES
  -- ── Freelancers (password:  ) ────────────────────────────────
  ('carlo.mendoza@githustle.dev',  '$2b$12$neDpyB/dE2O2XDiTMgg4W.hcmppyrH/MVysn1NK1Ew.2CpfEen/ZO', 'freelancer', 'active', TRUE),
  ('mia.santos@githustle.dev',     '$2b$12$neDpyB/dE2O2XDiTMgg4W.hcmppyrH/MVysn1NK1Ew.2CpfEen/ZO', 'freelancer', 'active', TRUE),
  ('rafa.villaruel@githustle.dev', '$2b$12$neDpyB/dE2O2XDiTMgg4W.hcmppyrH/MVysn1NK1Ew.2CpfEen/ZO', 'freelancer', 'active', TRUE),
  ('kim.dela.cruz@githustle.dev',  '$2b$12$neDpyB/dE2O2XDiTMgg4W.hcmppyrH/MVysn1NK1Ew.2CpfEen/ZO', 'freelancer', 'active', TRUE),
  ('noel.aquino@githustle.dev',    '$2b$12$neDpyB/dE2O2XDiTMgg4W.hcmppyrH/MVysn1NK1Ew.2CpfEen/ZO', 'freelancer', 'active', TRUE),

  -- ── Clients (password: GitHustle_2025!) ────────────────────────────────────
  ('juan.reyes@kargoph.dev',       '$2b$12$neDpyB/dE2O2XDiTMgg4W.hcmppyrH/MVysn1NK1Ew.2CpfEen/ZO', 'client',     'active', TRUE),
  ('elena.tuazon@brewhaus.dev',    '$2b$12$neDpyB/dE2O2XDiTMgg4W.hcmppyrH/MVysn1NK1Ew.2CpfEen/ZO', 'client',     'active', TRUE),
  ('marco.lim@stellarpay.dev',     '$2b$12$neDpyB/dE2O2XDiTMgg4W.hcmppyrH/MVysn1NK1Ew.2CpfEen/ZO', 'client',     'active', TRUE),
  ('bianca.roxas@northcap.dev',    '$2b$12$neDpyB/dE2O2XDiTMgg4W.hcmppyrH/MVysn1NK1Ew.2CpfEen/ZO', 'client',     'active', TRUE),
  ('theo.pangan@bayanihan.dev',    '$2b$12$neDpyB/dE2O2XDiTMgg4W.hcmppyrH/MVysn1NK1Ew.2CpfEen/ZO', 'client',     'active', TRUE),

  -- ── Admins (password: Admin_GitHustle_2025!) ───────────────────────────────
  ('root@githustle.dev',           '$2b$12$9UvSa1asGDN/ucIFHFPZz.UjSwKHWhmA/p//VpKQQGcwNK/hj6HA6', 'admin',      'active', TRUE),
  ('audit@githustle.dev',          '$2b$12$9UvSa1asGDN/ucIFHFPZz.UjSwKHWhmA/p//VpKQQGcwNK/hj6HA6', 'admin',      'active', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ================================================================
-- Verification query (optional — run after seed to confirm)
-- ================================================================
-- SELECT email, role, status, email_verified FROM users ORDER BY role, email;
