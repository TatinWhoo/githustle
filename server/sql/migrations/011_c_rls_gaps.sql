-- ================================================================
-- 011_c_rls_gaps.sql
-- Enable RLS and add access policies on 6 tables missing from 008
-- Fixes issues 1.8 (proposals), 1.9 (withdrawals), 1.10 (disputes),
--              1.11 (dispute_messages + time_entries), 1.12 (reviews)
-- Pattern: current_setting('app.current_user_id', TRUE)::UUID
--          (consistent with 008_triggers_views_rls.sql)
-- Depends on: 008
-- ================================================================

-- Issue 1.8 — proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY pol_proposals_access ON proposals USING (
  freelancer_id = current_setting('app.current_user_id', TRUE)::UUID
  OR job_id IN (
    SELECT id FROM job_postings
    WHERE client_id = current_setting('app.current_user_id', TRUE)::UUID
  )
);

-- Issue 1.9 — withdrawals
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY pol_withdrawals_access ON withdrawals USING (
  freelancer_id = current_setting('app.current_user_id', TRUE)::UUID
);

-- Issue 1.10 — disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY pol_disputes_access ON disputes USING (
  opened_by_id  = current_setting('app.current_user_id', TRUE)::UUID OR
  respondent_id = current_setting('app.current_user_id', TRUE)::UUID
);

-- Issue 1.11a — dispute_messages (subquery through disputes for party check)
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY pol_dispute_messages_access ON dispute_messages USING (
  dispute_id IN (
    SELECT id FROM disputes WHERE
      opened_by_id  = current_setting('app.current_user_id', TRUE)::UUID OR
      respondent_id = current_setting('app.current_user_id', TRUE)::UUID
  )
);

-- Issue 1.11b — time_entries
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY pol_time_entries_access ON time_entries USING (
  freelancer_id = current_setting('app.current_user_id', TRUE)::UUID
  OR project_id IN (
    SELECT id FROM projects
    WHERE client_id = current_setting('app.current_user_id', TRUE)::UUID
  )
);

-- Issue 1.12 — reviews (public rows visible to all; private restricted to participants)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY pol_reviews_access ON reviews USING (
  is_public   = TRUE
  OR reviewer_id = current_setting('app.current_user_id', TRUE)::UUID
  OR reviewee_id = current_setting('app.current_user_id', TRUE)::UUID
);
