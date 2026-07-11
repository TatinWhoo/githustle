-- ================================================================
-- 003_profiles_skills.sql
-- freelancer_profiles, client_profiles, skills,
-- freelancer_skills, portfolio_items
-- Depends on: 002
-- ================================================================

CREATE TABLE freelancer_profiles (
  id                       UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID             NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name             VARCHAR(100)     NOT NULL,
  tagline                  VARCHAR(255),
  bio                      TEXT,
  avatar_url               TEXT,
  hourly_rate              NUMERIC(10,2)    CHECK (hourly_rate >= 0),
  experience_level         experience_level,
  available_hours_per_week SMALLINT         CHECK (available_hours_per_week BETWEEN 1 AND 168),
  is_available             BOOLEAN          NOT NULL DEFAULT TRUE,
  portfolio_url            TEXT,
  location                 VARCHAR(100),
  timezone                 VARCHAR(50),
  languages                TEXT[]           NOT NULL DEFAULT '{}',
  total_earned             NUMERIC(14,2)    NOT NULL DEFAULT 0,
  available_balance        NUMERIC(14,2)    NOT NULL DEFAULT 0,
  jobs_completed           INTEGER          NOT NULL DEFAULT 0,
  average_rating           NUMERIC(3,2)     CHECK (average_rating BETWEEN 1 AND 5),
  total_reviews            INTEGER          NOT NULL DEFAULT 0,
  response_time_hours      SMALLINT,
  profile_completion       SMALLINT         NOT NULL DEFAULT 0 CHECK (profile_completion BETWEEN 0 AND 100),
  search_vector            tsvector,
  created_at               TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('freelancer_profiles');
CREATE INDEX idx_fp_search      ON freelancer_profiles USING GIN(search_vector);
CREATE INDEX idx_fp_available   ON freelancer_profiles(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_fp_hourly_rate ON freelancer_profiles(hourly_rate);
CREATE INDEX idx_fp_rating      ON freelancer_profiles(average_rating DESC NULLS LAST);
CREATE INDEX idx_fp_location    ON freelancer_profiles(location);

CREATE TABLE client_profiles (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name     VARCHAR(100)  NOT NULL,
  company_name     VARCHAR(255),
  company_size     VARCHAR(20),
  industry         VARCHAR(100),
  avatar_url       TEXT,
  bio              TEXT,
  website_url      TEXT,
  location         VARCHAR(100),
  timezone         VARCHAR(50),
  total_spent      NUMERIC(14,2) NOT NULL DEFAULT 0,
  jobs_posted      INTEGER       NOT NULL DEFAULT 0,
  average_rating   NUMERIC(3,2)  CHECK (average_rating BETWEEN 1 AND 5),
  total_reviews    INTEGER       NOT NULL DEFAULT 0,
  payment_verified BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('client_profiles');

CREATE TABLE skills (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL UNIQUE,
  category   VARCHAR(100),
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE freelancer_skills (
  freelancer_profile_id UUID         NOT NULL REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
  skill_id              UUID         NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level     SMALLINT     NOT NULL DEFAULT 3 CHECK (proficiency_level BETWEEN 1 AND 5),
  years_experience      NUMERIC(4,1) CHECK (years_experience >= 0),
  PRIMARY KEY (freelancer_profile_id, skill_id)
);

CREATE TABLE portfolio_items (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_profile_id UUID         NOT NULL REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
  title                 VARCHAR(255) NOT NULL,
  description           TEXT,
  project_url           TEXT,
  image_url             TEXT,
  tags                  TEXT[]       NOT NULL DEFAULT '{}',
  order_index           SMALLINT     NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

SELECT apply_updated_at('portfolio_items');
