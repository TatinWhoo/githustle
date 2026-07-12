-- ================================================================
-- GitHustle — Reference Data Seed
-- server/sql/seeds/000_seed.sql
-- ================================================================
-- Run AFTER 000_general_migration.sql on a fresh database.
-- Safe to re-run: uses ON CONFLICT DO NOTHING.
--
-- Usage:
--   psql -U postgres -d githustle_dev -f "server/sql/seeds/000_seed.sql"
-- ================================================================

-- ================================================================
-- SEED: Subscription Plans
-- ================================================================

INSERT INTO subscription_plans (
  name, display_name, description, price_monthly, currency,
  ai_proposals_unlimited, profile_analytics, verified_badge,
  multi_user_team, advanced_contracts, priority_support,
  max_active_jobs, max_team_members
) VALUES
  (
    'free', 'Free',
    'Core job matching and milestone tracking.',
    0, 'PHP',
    FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 5, 1
  ),
  (
    'pro_freelancer', 'GitHustle Pro',
    'For serious freelancers who want every edge.',
    299, 'PHP',
    TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, NULL, 1
  ),
  (
    'business_client', 'GitHustle Business',
    'For teams and agencies managing multiple contractors.',
    799, 'PHP',
    FALSE, TRUE, FALSE, TRUE, TRUE, TRUE, NULL, NULL
  )
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- SEED: Fee Schedules
-- ================================================================

INSERT INTO fee_schedules (
  name, description, is_active,
  freelancer_rate_pct, client_processing_pct, min_fee_amount, valid_from
) VALUES
  (
    'Beta Launch — Zero Fee',
    'Zero-fee beta period. Deactivate when ready for standard fees.',
    TRUE, 0, 0, 0, NOW()
  ),
  (
    'Standard — 5% / 2%',
    'Post-beta standard rates. Activate after beta ends.',
    FALSE, 5.00, 2.00, 10, NOW()
  )
ON CONFLICT DO NOTHING;

-- ================================================================
-- SEED: Skills
-- ================================================================

INSERT INTO skills (name, category) VALUES
  -- Development
  ('JavaScript',      'Development'),
  ('TypeScript',      'Development'),
  ('React',           'Development'),
  ('Vue.js',          'Development'),
  ('Angular',         'Development'),
  ('Node.js',         'Development'),
  ('Python',          'Development'),
  ('Django',          'Development'),
  ('FastAPI',         'Development'),
  ('PostgreSQL',      'Development'),
  ('MongoDB',         'Development'),
  ('Redis',           'Development'),
  ('Docker',          'Development'),
  ('Kubernetes',      'Development'),
  ('REST API Design', 'Development'),
  ('GraphQL',         'Development'),
  ('PHP',             'Development'),
  ('Laravel',         'Development'),
  ('WordPress',       'Development'),
  ('React Native',    'Development'),
  ('Flutter',         'Development'),
  ('Swift',           'Development'),
  ('Kotlin',          'Development'),
  -- Design
  ('UI/UX Design',    'Design'),
  ('Figma',           'Design'),
  ('Adobe XD',        'Design'),
  ('Graphic Design',  'Design'),
  ('Logo Design',     'Design'),
  ('Motion Design',   'Design'),
  ('Brand Identity',  'Design'),
  ('Illustration',    'Design'),
  -- Writing
  ('Content Writing', 'Writing'),
  ('Copywriting',     'Writing'),
  ('Technical Writing','Writing'),
  ('Blog Writing',    'Writing'),
  ('Proofreading',    'Writing'),
  ('Translation',     'Writing'),
  -- Marketing
  ('SEO',             'Marketing'),
  ('Social Media',    'Marketing'),
  ('Email Marketing', 'Marketing'),
  ('Google Ads',      'Marketing'),
  ('Facebook Ads',    'Marketing'),
  ('Content Strategy','Marketing'),
  -- Media
  ('Video Editing',   'Media'),
  ('Photography',     'Media'),
  ('Podcast Editing', 'Media'),
  ('Animation',       'Media'),
  ('3D Modeling',     'Media')
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- END: 000_seed.sql
-- 3 subscription plans · 2 fee schedules · 48 skills
-- ================================================================
