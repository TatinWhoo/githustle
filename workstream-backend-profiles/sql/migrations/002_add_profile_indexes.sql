-- sql/migrations/002_add_profile_indexes.sql
-- ================================================================
-- Two indexes the original schema was missing, found by thinking
-- through Milestone 2's actual query patterns before writing them.
--
-- PostgreSQL does NOT automatically index foreign key columns (unlike
-- primary keys). Every foreign key is a candidate for an index — but
-- only add one once you know the column is actually queried by.
-- ================================================================

-- portfolio_items.freelancer_profile_id is read on EVERY freelancer
-- profile page view ("get all portfolio items for this freelancer").
-- Without this, that's a sequential scan over the whole table once it
-- grows past a few thousand rows.
CREATE INDEX IF NOT EXISTS idx_portfolio_items_freelancer_profile_id
  ON portfolio_items(freelancer_profile_id);

-- freelancer_skills has a composite primary key (freelancer_profile_id,
-- skill_id). That composite index helps "get all skills for this
-- freelancer" (freelancer_profile_id is the leading column) but does
-- NOT help the reverse direction: "find every freelancer who has skill
-- X" — which the freelancer search/browse endpoint needs. A composite
-- index only serves lookups on its leading column(s), not arbitrary
-- columns inside it.
CREATE INDEX IF NOT EXISTS idx_freelancer_skills_skill_id
  ON freelancer_skills(skill_id);
