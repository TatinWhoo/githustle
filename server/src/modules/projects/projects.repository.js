// src/modules/projects/projects.repository.js
const { query } = require('../../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS — WRITE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Create a project row from a proposal + job data bundle.
// All core fields (client, freelancer, rate, budget_type) come from the
// proposal — the caller enriches with job title + optional date overrides.
async function createProject(data) {
    const {
        jobId, proposalId, clientId, freelancerId,
        title, description, budgetType, agreedRate, totalBudget,
        startDate, endDate,
    } = data;

    const { rows } = await query(
        `INSERT INTO projects
       (job_id, proposal_id, client_id, freelancer_id,
        title, description, budget_type, agreed_rate, total_budget,
        start_date, end_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
        [
            jobId ?? null, proposalId, clientId, freelancerId,
            title, description ?? null, budgetType, agreedRate,
            totalBudget ?? null, startDate ?? null, endDate ?? null,
        ]
    );
    return rows[0];
}

// Purpose: Find a project by id.
// No soft-delete on projects — they're long-lived contracts.
async function findProjectById(projectId) {
    const { rows } = await query(
        `SELECT * FROM projects WHERE id = $1`,
        [projectId]
    );
    return rows[0] || null;
}

// Purpose: Find a project by its source proposal (UNIQUE constraint on proposal_id).
// Used to check if a project was already created from a given proposal
// before creating a duplicate.
async function findProjectByProposalId(proposalId) {
    const { rows } = await query(
        `SELECT * FROM projects WHERE proposal_id = $1`,
        [proposalId]
    );
    return rows[0] || null;
}

// Purpose: Update the project's top-level status field + optional timestamp columns.
// We pass individual timestamp columns (client_completed_at, freelancer_completed_at)
// separately to avoid clobbering them in a generic update.
async function updateProjectStatus(projectId, status, completedByRole) {
    // Determine which completion timestamp to set, if any
    let extraSet = '';
    if (completedByRole === 'client') extraSet = ', client_completed_at = NOW()';
    if (completedByRole === 'freelancer') extraSet = ', freelancer_completed_at = NOW()';

    const { rows } = await query(
        `UPDATE projects SET status = $2${extraSet} WHERE id = $1 RETURNING *`,
        [projectId, status]
    );
    return rows[0];
}

// Purpose: List a user's projects. Works for both client and freelancer:
//   - client:     WHERE client_id = userId
//   - freelancer: WHERE freelancer_id = userId
// Cursor-paginated by created_at DESC.
async function findProjectsByUser(userId, role, filters) {
    const roleColumn = role === 'client' ? 'p.client_id' : 'p.freelancer_id';
    const conditions = [`${roleColumn} = $1`];
    const values = [userId];
    let i = 2;

    if (filters.status) {
        conditions.push(`p.status = $${i}`);
        values.push(filters.status);
        i += 1;
    }

    if (filters.cursor) {
        conditions.push(`p.created_at < $${i}`);
        values.push(filters.cursor);
        i += 1;
    }

    values.push(filters.limit + 1); // limit+1 for hasMore detection

    const { rows } = await query(
        `SELECT p.id, p.title, p.status, p.budget_type, p.agreed_rate, p.total_budget,
            p.start_date, p.end_date, p.created_at,
            -- Inline partner info to avoid a second round-trip
            CASE WHEN p.client_id = $1
              THEN fp.display_name ELSE cp.display_name END AS partner_name,
            CASE WHEN p.client_id = $1
              THEN fp.avatar_url ELSE cp.avatar_url END AS partner_avatar,
            COUNT(m.id) AS total_milestones,
            COUNT(m.id) FILTER (WHERE m.status = 'paid') AS paid_milestones
     FROM projects p
     JOIN client_profiles cp     ON cp.user_id = p.client_id
     JOIN freelancer_profiles fp ON fp.user_id = p.freelancer_id
     LEFT JOIN milestones m      ON m.project_id = p.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY p.id, cp.display_name, cp.avatar_url, fp.display_name, fp.avatar_url
     ORDER BY p.created_at DESC
     LIMIT $${i}`,
        values
    );
    return rows;
}

// Purpose: Full project detail — uses v_project_overview view for aggregated stats.
// The view pre-computes milestone counts, paid totals, and message count.
async function findProjectDetail(projectId) {
    const { rows } = await query(
        `SELECT * FROM v_project_overview WHERE id = $1`,
        [projectId]
    );
    return rows[0] || null;
}

// Purpose: Budget utilisation from the v_project_budget_status view.
async function findProjectBudgetStatus(projectId) {
    const { rows } = await query(
        `SELECT * FROM v_project_budget_status WHERE project_id = $1`,
        [projectId]
    );
    return rows[0] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONES — WRITE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Insert a new milestone.
// Note: The DB trigger `trg_enforce_budget` fires BEFORE INSERT and will raise
// an exception (SQLSTATE 23514) if milestone totals exceed project.total_budget.
// We catch that in the service and convert it to a clean 422 AppError.
async function createMilestone(projectId, data) {
    const { rows } = await query(
        `INSERT INTO milestones
       (project_id, title, description, amount, due_date, order_index)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
        [
            projectId,
            data.title,
            data.description ?? null,
            data.amount,
            data.dueDate ?? null,
            data.orderIndex ?? 0,
        ]
    );
    return rows[0];
}

// Purpose: Find a single milestone by id, including its project_id for ownership checks.
async function findMilestoneById(milestoneId) {
    const { rows } = await query(
        `SELECT * FROM milestones WHERE id = $1`,
        [milestoneId]
    );
    return rows[0] || null;
}

// Purpose: Dynamic partial update for milestone fields (pending-state edits only).
async function updateMilestone(milestoneId, data) {
    const fieldMap = {
        title: 'title',
        description: 'description',
        amount: 'amount',
        dueDate: 'due_date',
        orderIndex: 'order_index',
    };

    const setClauses = [];
    const values = [];
    let i = 1;

    for (const [key, col] of Object.entries(fieldMap)) {
        if (data[key] !== undefined) {
            setClauses.push(`${col} = $${i}`);
            values.push(data[key] === '' ? null : data[key]);
            i += 1;
        }
    }

    if (setClauses.length === 0) return findMilestoneById(milestoneId);

    values.push(milestoneId);
    const { rows } = await query(
        `UPDATE milestones SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
        values
    );
    return rows[0];
}

// Purpose: Advance milestone to the next status with optional metadata timestamps.
// Each status has its own timestamp column (started_at, submitted_at, etc.)
// so we know exactly when each phase happened — useful for SLA tracking.
async function updateMilestoneStatus(milestoneId, status, extra = {}) {
    // Build the extra SET clauses for status-specific timestamps / rejection_reason
    const extraClauses = [];
    const extraValues = [];

    if (status === 'in_progress' && !extra.rejectionReason) {
        // Only set started_at on first transition to in_progress
        extraClauses.push('started_at = COALESCE(started_at, NOW())');
    }
    if (status === 'submitted') {
        extraClauses.push('submitted_at = NOW()');
    }
    if (status === 'approved') {
        extraClauses.push('approved_at = NOW()');
    }
    if (status === 'rejected') {
        extraClauses.push('rejection_reason = $3');
        extraValues.push(extra.rejectionReason ?? null);
    }
    if (status === 'paid') {
        extraClauses.push('paid_at = NOW()');
    }

    const setClause = [`status = $2`, ...extraClauses].join(', ');
    const values = [milestoneId, status, ...extraValues];

    const { rows } = await query(
        `UPDATE milestones SET ${setClause} WHERE id = $1 RETURNING *`,
        values
    );
    return rows[0];
}

// Purpose: Hard delete a milestone (only allowed while pending — enforced in service).
async function deleteMilestone(milestoneId) {
    await query(`DELETE FROM milestones WHERE id = $1`, [milestoneId]);
}

// Purpose: List all milestones for a project, ordered by order_index then created_at.
async function listMilestones(projectId) {
    const { rows } = await query(
        `SELECT id, project_id, title, description, amount, due_date, order_index,
            status, started_at, submitted_at, approved_at, paid_at,
            rejection_reason, created_at, updated_at
     FROM milestones
     WHERE project_id = $1
     ORDER BY order_index ASC, created_at ASC`,
        [projectId]
    );
    return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE DELIVERABLES
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Insert a deliverable record after the file has been saved to disk.
// file_url is the public URL returned by saveBuffer() in fileStorage.js.
async function createDeliverable(milestoneId, uploaderId, fileData) {
    const { rows } = await query(
        `INSERT INTO milestone_deliverables
       (milestone_id, uploader_id, file_name, original_name,
        file_url, file_size_bytes, mime_type, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
        [
            milestoneId,
            uploaderId,
            fileData.fileName,
            fileData.originalName,
            fileData.fileUrl,
            fileData.fileSizeBytes,
            fileData.mimeType,
            fileData.note ?? null,
        ]
    );
    return rows[0];
}

// Purpose: Find a single deliverable (used for ownership check before delete).
async function findDeliverableById(deliverableId) {
    const { rows } = await query(
        `SELECT * FROM milestone_deliverables WHERE id = $1`,
        [deliverableId]
    );
    return rows[0] || null;
}

// Purpose: Hard delete a deliverable row.
// The physical file deletion is handled separately in the service via deleteFile().
async function deleteDeliverable(deliverableId) {
    await query(`DELETE FROM milestone_deliverables WHERE id = $1`, [deliverableId]);
}

// Purpose: List all deliverables for a milestone, newest first.
async function listDeliverables(milestoneId) {
    const { rows } = await query(
        `SELECT id, uploader_id, file_name, original_name, file_url,
            file_size_bytes, mime_type, note, created_at
     FROM milestone_deliverables
     WHERE milestone_id = $1
     ORDER BY created_at DESC`,
        [milestoneId]
    );
    return rows;
}

// Purpose: Look up the client who originally posted a job, bypassing the soft-delete
// filter. Used only in createProjectFromProposal for ownership verification when
// the job was deleted after the proposal was accepted — job_postings.client_id is
// still there even if deleted_at is set. findJobById would return null in this case.
async function findJobClientId(jobId) {
    const { rows } = await query(
        `SELECT client_id FROM job_postings WHERE id = $1`,
        [jobId]
    );
    return rows[0]?.client_id || null;
}

module.exports = {
    createProject, findProjectById, findProjectByProposalId,
    updateProjectStatus, findProjectsByUser, findProjectDetail, findProjectBudgetStatus,
    findJobClientId,
    // Milestones
    createMilestone, findMilestoneById, updateMilestone,
    updateMilestoneStatus, deleteMilestone, listMilestones,
    // Deliverables
    createDeliverable, findDeliverableById, deleteDeliverable, listDeliverables,
};
