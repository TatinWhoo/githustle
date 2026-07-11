-- ================================================================
-- 013_fix_v_freelancer_earnings.sql
-- Fix: v_freelancer_earnings Cartesian product bug
-- Applies on top of 000–012 migrations.
-- ================================================================
-- Root cause: joining freelancer_profiles to both projects and invoices
-- flat in a single query produces N×M rows when a freelancer has N projects
-- and M invoices. COUNT(DISTINCT ...) survives this but SUM(inv.total_amount)
-- does not — each invoice amount gets multiplied by the project count.
--
-- Same root cause as the v_freelancer_balance bug (fixed in 011_b).
-- Rule: pre-aggregate every independent one-to-many relationship into a
-- subquery before joining to the base table.
-- ================================================================

CREATE OR REPLACE VIEW v_freelancer_earnings AS
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
