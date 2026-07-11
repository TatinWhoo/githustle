-- ================================================================
-- 008_triggers_views_rls.sql
-- All 11 trigger functions + triggers, 7 views, 6 RLS policies
-- Depends on: 007
-- ================================================================

-- ================================================================
-- TRIGGER FUNCTIONS
-- ================================================================

CREATE OR REPLACE FUNCTION fn_update_job_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')),       'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_job_search
  BEFORE INSERT OR UPDATE ON job_postings
  FOR EACH ROW EXECUTE FUNCTION fn_update_job_search_vector();

CREATE OR REPLACE FUNCTION fn_update_freelancer_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.tagline, '')),      'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')),          'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_freelancer_search
  BEFORE INSERT OR UPDATE ON freelancer_profiles
  FOR EACH ROW EXECUTE FUNCTION fn_update_freelancer_search_vector();

CREATE OR REPLACE FUNCTION fn_sync_proposals_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE job_postings SET proposals_count = proposals_count + 1 WHERE id = NEW.job_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE job_postings SET proposals_count = GREATEST(proposals_count - 1, 0) WHERE id = OLD.job_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_proposals_count
  AFTER INSERT OR DELETE ON proposals
  FOR EACH ROW EXECUTE FUNCTION fn_sync_proposals_count();

CREATE OR REPLACE FUNCTION fn_generate_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.invoice_number :=
    'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(nextval('invoice_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION fn_generate_invoice_number();

CREATE OR REPLACE FUNCTION fn_sync_financial_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE freelancer_profiles SET total_earned = total_earned + NEW.amount WHERE user_id = NEW.payee_id;
    UPDATE client_profiles     SET total_spent  = total_spent  + NEW.amount WHERE user_id = NEW.payer_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_financial_stats
  AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION fn_sync_financial_stats();

CREATE OR REPLACE FUNCTION fn_update_freelancer_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE freelancer_profiles SET available_balance = available_balance + NEW.amount WHERE user_id = NEW.payee_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_balance_on_payment
  AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION fn_update_freelancer_balance();

CREATE OR REPLACE FUNCTION fn_deduct_withdrawal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE freelancer_profiles SET available_balance = available_balance - NEW.amount WHERE user_id = NEW.freelancer_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deduct_withdrawal
  AFTER UPDATE ON withdrawals
  FOR EACH ROW EXECUTE FUNCTION fn_deduct_withdrawal();

CREATE OR REPLACE FUNCTION fn_sync_jobs_completed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE freelancer_profiles SET jobs_completed = jobs_completed + 1 WHERE user_id = NEW.freelancer_id;
    UPDATE client_profiles     SET jobs_posted    = jobs_posted + 1    WHERE user_id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_jobs_completed
  AFTER UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION fn_sync_jobs_completed();

CREATE OR REPLACE FUNCTION fn_recalc_average_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE freelancer_profiles SET
    average_rating = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE reviewee_id = NEW.reviewee_id AND is_public = TRUE),
    total_reviews  = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = NEW.reviewee_id AND is_public = TRUE)
  WHERE user_id = NEW.reviewee_id;
  UPDATE client_profiles SET
    average_rating = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE reviewee_id = NEW.reviewee_id AND is_public = TRUE),
    total_reviews  = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = NEW.reviewee_id AND is_public = TRUE)
  WHERE user_id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_average_rating
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION fn_recalc_average_rating();

CREATE OR REPLACE FUNCTION fn_calculate_time_entry_hours()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.end_time IS NOT NULL AND NEW.hours IS NULL THEN
    NEW.hours := ROUND(EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600, 2);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calculate_hours
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION fn_calculate_time_entry_hours();

CREATE OR REPLACE FUNCTION fn_enforce_project_budget()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_project_budget  NUMERIC(14,2);
  v_milestone_total NUMERIC(14,2);
BEGIN
  SELECT total_budget INTO v_project_budget FROM projects WHERE id = NEW.project_id;
  IF v_project_budget IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_milestone_total
  FROM milestones WHERE project_id = NEW.project_id AND status != 'rejected' AND id != NEW.id;
  v_milestone_total := v_milestone_total + NEW.amount;
  IF v_milestone_total > v_project_budget THEN
    RAISE EXCEPTION 'Milestone total ($%) exceeds project budget ($%). Remaining: $%.',
      v_milestone_total, v_project_budget, v_project_budget - (v_milestone_total - NEW.amount)
    USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_budget
  BEFORE INSERT OR UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION fn_enforce_project_budget();

-- ================================================================
-- VIEWS
-- ================================================================

CREATE VIEW v_job_listings AS
SELECT jp.id, jp.title, jp.description, jp.budget_type, jp.budget_min, jp.budget_max,
  jp.hourly_rate_min, jp.hourly_rate_max, jp.experience_level, jp.estimated_weeks,
  jp.status, jp.proposals_count, jp.views_count, jp.deadline_at, jp.created_at, jp.search_vector,
  cp.display_name AS client_name, cp.avatar_url AS client_avatar, cp.company_name,
  cp.average_rating AS client_rating, cp.payment_verified,
  ARRAY_AGG(s.name ORDER BY s.name) FILTER (WHERE s.id IS NOT NULL) AS skill_names
FROM job_postings jp
JOIN client_profiles cp ON cp.user_id = jp.client_id
LEFT JOIN job_skills js ON js.job_id  = jp.id
LEFT JOIN skills     s  ON s.id       = js.skill_id
WHERE jp.deleted_at IS NULL
GROUP BY jp.id, cp.display_name, cp.avatar_url, cp.company_name, cp.average_rating, cp.payment_verified;

CREATE VIEW v_project_overview AS
SELECT p.id, p.title, p.status, p.budget_type, p.agreed_rate, p.total_budget,
  p.start_date, p.end_date, p.created_at,
  cp.display_name AS client_name,     cp.avatar_url AS client_avatar,
  fp.display_name AS freelancer_name, fp.avatar_url AS freelancer_avatar,
  COUNT(m.id) AS total_milestones,
  COUNT(m.id) FILTER (WHERE m.status = 'approved') AS approved_milestones,
  COUNT(m.id) FILTER (WHERE m.status = 'paid')     AS paid_milestones,
  COALESCE(SUM(m.amount) FILTER (WHERE m.status = 'paid'), 0) AS total_paid,
  (SELECT COUNT(*) FROM messages msg WHERE msg.project_id = p.id AND msg.is_deleted = FALSE) AS message_count
FROM projects p
JOIN client_profiles     cp ON cp.user_id    = p.client_id
JOIN freelancer_profiles fp ON fp.user_id    = p.freelancer_id
LEFT JOIN milestones      m  ON m.project_id = p.id
GROUP BY p.id, cp.display_name, cp.avatar_url, fp.display_name, fp.avatar_url;

-- v_freelancer_earnings: pre-aggregate projects and invoices into subqueries
-- before joining to freelancer_profiles. Joining both flat onto the same base
-- table produces N×M rows (one per project-invoice pair), inflating
-- SUM(inv.total_amount) by the project count. Pre-aggregation reduces each
-- side to one row per freelancer_id before the join, eliminating the product.
CREATE VIEW v_freelancer_earnings AS
SELECT
  fp.user_id        AS freelancer_id,
  fp.display_name,
  fp.total_earned,
  fp.jobs_completed,
  fp.average_rating,
  fp.total_reviews,
  COALESCE(proj.active_projects, 0)      AS active_projects,
  COALESCE(inv.overdue_invoices, 0)      AS overdue_invoices,
  COALESCE(inv.pending_invoice_total, 0) AS pending_invoice_total
FROM freelancer_profiles fp
LEFT JOIN (
  SELECT freelancer_id,
    COUNT(*) FILTER (WHERE status = 'active') AS active_projects
  FROM projects
  GROUP BY freelancer_id
) proj ON proj.freelancer_id = fp.user_id
LEFT JOIN (
  SELECT freelancer_id,
    COUNT(*)          FILTER (WHERE status = 'overdue') AS overdue_invoices,
    SUM(total_amount) FILTER (WHERE status = 'sent')    AS pending_invoice_total
  FROM invoices
  GROUP BY freelancer_id
) inv ON inv.freelancer_id = fp.user_id;

CREATE VIEW v_project_time_summary AS
SELECT te.project_id, te.freelancer_id, COUNT(*) AS total_entries,
  SUM(te.hours) FILTER (WHERE te.is_billable = TRUE)               AS billable_hours,
  SUM(te.hours) FILTER (WHERE te.is_billable = FALSE)              AS non_billable_hours,
  SUM(te.hours) FILTER (WHERE te.status = 'approved')              AS approved_hours,
  SUM(te.hours) FILTER (WHERE te.status = 'billed')                AS billed_hours,
  SUM(te.hours) FILTER (WHERE te.status IN ('draft', 'submitted')) AS pending_hours,
  p.agreed_rate,
  SUM(te.hours) FILTER (WHERE te.status = 'approved') * p.agreed_rate AS approved_amount
FROM time_entries te JOIN projects p ON p.id = te.project_id
GROUP BY te.project_id, te.freelancer_id, p.agreed_rate;

CREATE VIEW v_freelancer_balance AS
SELECT fp.user_id AS freelancer_id, fp.display_name, fp.total_earned, fp.available_balance,
  COALESCE(SUM(w.amount) FILTER (WHERE w.status = 'completed'), 0)               AS total_withdrawn,
  COALESCE(SUM(w.amount) FILTER (WHERE w.status IN ('pending', 'processing')), 0) AS pending_withdrawal,
  COUNT(w.id) FILTER (WHERE w.status = 'pending')                                AS pending_withdrawal_count
FROM freelancer_profiles fp LEFT JOIN withdrawals w ON w.freelancer_id = fp.user_id
GROUP BY fp.user_id, fp.display_name, fp.total_earned, fp.available_balance;

CREATE VIEW v_project_budget_status AS
SELECT p.id AS project_id, p.title, p.total_budget, p.budget_type,
  COALESCE(SUM(m.amount) FILTER (WHERE m.status != 'rejected'), 0) AS allocated_amount,
  p.total_budget - COALESCE(SUM(m.amount) FILTER (WHERE m.status != 'rejected'), 0) AS remaining_budget,
  COALESCE(SUM(m.amount) FILTER (WHERE m.status = 'paid'), 0) AS paid_amount,
  COUNT(m.id) FILTER (WHERE m.status != 'rejected') AS total_milestones,
  COUNT(m.id) FILTER (WHERE m.status = 'paid')      AS paid_milestones,
  CASE WHEN p.total_budget IS NULL OR p.total_budget = 0 THEN NULL
    ELSE ROUND((COALESCE(SUM(m.amount) FILTER (WHERE m.status != 'rejected'), 0) / p.total_budget) * 100, 2)
  END AS budget_utilization_percent
FROM projects p LEFT JOIN milestones m ON m.project_id = p.id
GROUP BY p.id, p.title, p.total_budget, p.budget_type;

CREATE VIEW v_payment_history AS
SELECT p.id, p.invoice_id, p.payer_id, p.payee_id, p.amount, p.currency, p.status,
  p.payment_type, p.payment_method, p.completed_at, p.created_at,
  CASE WHEN p.payment_type = 'refund' THEN refunded.id     ELSE NULL END AS original_payment_id,
  CASE WHEN p.payment_type = 'refund' THEN refunded.amount ELSE NULL END AS original_amount,
  p.amount - COALESCE(
    (SELECT SUM(r.amount) FROM payments r WHERE r.refunds_payment_id = p.id AND r.status = 'completed'), 0
  ) AS net_amount
FROM payments p LEFT JOIN payments refunded ON refunded.id = p.refunds_payment_id;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE projects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY pol_projects_access ON projects USING (
  client_id     = current_setting('app.current_user_id', TRUE)::UUID OR
  freelancer_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY pol_messages_access ON messages USING (
  project_id IN (SELECT id FROM projects WHERE
    client_id     = current_setting('app.current_user_id', TRUE)::UUID OR
    freelancer_id = current_setting('app.current_user_id', TRUE)::UUID));

CREATE POLICY pol_invoices_access ON invoices USING (
  freelancer_id = current_setting('app.current_user_id', TRUE)::UUID OR
  client_id     = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY pol_milestones_access ON milestones USING (
  project_id IN (SELECT id FROM projects WHERE
    client_id     = current_setting('app.current_user_id', TRUE)::UUID OR
    freelancer_id = current_setting('app.current_user_id', TRUE)::UUID));

CREATE POLICY pol_notifications_access ON notifications USING (
  user_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY pol_deliverables_access ON milestone_deliverables USING (
  milestone_id IN (
    SELECT m.id FROM milestones m JOIN projects p ON p.id = m.project_id WHERE
      p.client_id     = current_setting('app.current_user_id', TRUE)::UUID OR
      p.freelancer_id = current_setting('app.current_user_id', TRUE)::UUID));
