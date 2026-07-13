// src/modules/jobs/jobs.repository.js
const { query, withTransaction } = require('../../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// JOB POSTINGS — WRITE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Insert a new job_postings row.
// RETURNING * gives us back the full row (including generated id, created_at, etc.)
// so the service doesn't need to do a second SELECT after every insert.
async function createJob(clientId, data) {
    const {
        title, description, budgetType,
        budgetMin, budgetMax, hourlyRateMin, hourlyRateMax,
        experienceLevel, estimatedWeeks, deadlineAt,
    } = data;

    const { rows } = await query(
        `INSERT INTO job_postings
       (client_id, title, description, budget_type,
        budget_min, budget_max, hourly_rate_min, hourly_rate_max,
        experience_level, estimated_weeks, deadline_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
        [
            clientId, title, description, budgetType,
            budgetMin ?? null, budgetMax ?? null,         // null for unused budget type
            hourlyRateMin ?? null, hourlyRateMax ?? null, // null for unused budget type
            experienceLevel ?? null, estimatedWeeks ?? null, deadlineAt ?? null,
        ]
    );
    return rows[0];
}

// Purpose: Fetch a single job by id, excluding soft-deleted rows.
// `deleted_at IS NULL` ensures soft-deleted jobs are invisible everywhere.
async function findJobById(jobId) {
    const { rows } = await query(
        `SELECT * FROM job_postings WHERE id = $1 AND deleted_at IS NULL`,
        [jobId]
    );
    return rows[0] || null; // return null (not undefined) so callers can do `if (!job)`
}

// Purpose: Dynamic partial update — only update columns that were provided.
// Why dynamic? We don't want to overwrite fields the client didn't send.
// The fieldMap translates camelCase JS keys to snake_case DB column names.
async function updateJob(jobId, data) {
    const fieldMap = {
        title: 'title',
        description: 'description',
        budgetMin: 'budget_min',
        budgetMax: 'budget_max',
        hourlyRateMin: 'hourly_rate_min',
        hourlyRateMax: 'hourly_rate_max',
        experienceLevel: 'experience_level',
        estimatedWeeks: 'estimated_weeks',
        deadlineAt: 'deadline_at',
        status: 'status',
    };

    const setClauses = [];
    const values = [];
    let i = 1;

    for (const [key, col] of Object.entries(fieldMap)) {
        if (data[key] !== undefined) {
            setClauses.push(`${col} = $${i}`);
            values.push(data[key] === '' ? null : data[key]); // empty string → null (same pattern as profiles)
            i += 1;
        }
    }

    // If nothing changed, skip the UPDATE and return current state
    if (setClauses.length === 0) return findJobById(jobId);

    values.push(jobId);
    const { rows } = await query(
        // Also guards `deleted_at IS NULL` — can't update a deleted job
        `UPDATE job_postings SET ${setClauses.join(', ')} WHERE id = $${i} AND deleted_at IS NULL RETURNING *`,
        values
    );
    return rows[0] || null;
}

// Purpose: Soft delete — sets deleted_at timestamp instead of hard DELETE.
// Why soft delete? Preserves audit history, lets proposals reference the job,
// and allows potential "restore" functionality later.
// We also mark status = 'cancelled' so the job disappears from open listings.
async function softDeleteJob(jobId) {
    await query(
        `UPDATE job_postings SET deleted_at = NOW(), status = 'cancelled'
     WHERE id = $1 AND deleted_at IS NULL`,
        [jobId]
    );
}

// Purpose: Increment the views counter by 1 each time the job detail page is loaded.
// Called fire-and-forget (not awaited in service) so it doesn't slow down the response.
async function incrementJobViews(jobId) {
    await query(
        `UPDATE job_postings SET views_count = views_count + 1 WHERE id = $1`,
        [jobId]
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB POSTINGS — BROWSE (PUBLIC, CURSOR-BASED)
//
// Purpose: Power the public job board with filtering + full-text search.
//
// How cursor pagination works:
//   We always ORDER BY created_at DESC.
//   On the first page, no cursor → return the 20 newest jobs.
//   On the next page, cursor = created_at of job #20 → return only jobs
//   created BEFORE that timestamp (i.e., older ones).
//   This is stable even if new jobs are posted between page loads.
//
// How full-text search works:
//   `plainto_tsquery` converts a plain user string ("react developer") into a
//   tsquery ('react' & 'developer') safely, without any syntax errors.
//   `ts_rank` scores each result by relevance. If `q` is provided, we sort
//   by rank first (most relevant), then by recency as a tiebreaker.
//   The GIN index `idx_jp_search` makes this query fast even on large tables.
//
// Why fetch limit+1?
//   We ask for one extra row. If we get it, we know there's a next page and
//   can set hasMore=true + extract nextCursor. If not, this is the last page.
// ─────────────────────────────────────────────────────────────────────────────

async function browseJobs(filters) {
    // Always show only open, non-deleted jobs on the public board
    const conditions = [`jp.deleted_at IS NULL`, `jp.status = 'open'`];
    const values = [];
    let i = 1;
    let rankSelect = '';
    let orderBy = 'jp.created_at DESC'; // default: newest first

    if (filters.q) {
        // Add relevance score column when searching
        rankSelect = `, ts_rank(jp.search_vector, plainto_tsquery('english', $${i})) AS rank`;
        // Filter: job's search_vector must match the query
        conditions.push(`jp.search_vector @@ plainto_tsquery('english', $${i})`);
        values.push(filters.q);
        i += 1;
        orderBy = 'rank DESC, jp.created_at DESC'; // most relevant first when searching
    }

    if (filters.budgetType) {
        conditions.push(`jp.budget_type = $${i}`);
        values.push(filters.budgetType);
        i += 1;
    }

    if (filters.budgetMin !== undefined) {
        // COALESCE handles both fixed and hourly jobs with one condition
        conditions.push(`COALESCE(jp.budget_min, jp.hourly_rate_min) >= $${i}`);
        values.push(filters.budgetMin);
        i += 1;
    }

    if (filters.budgetMax !== undefined) {
        conditions.push(`COALESCE(jp.budget_max, jp.hourly_rate_max) <= $${i}`);
        values.push(filters.budgetMax);
        i += 1;
    }

    if (filters.experienceLevel) {
        conditions.push(`jp.experience_level = $${i}`);
        values.push(filters.experienceLevel);
        i += 1;
    }

    if (filters.skillId) {
        // EXISTS subquery: check if the job requires the given skill
        // Faster than a JOIN when the job_skills table is large
        conditions.push(
            `EXISTS (SELECT 1 FROM job_skills js WHERE js.job_id = jp.id AND js.skill_id = $${i})`
        );
        values.push(filters.skillId);
        i += 1;
    }

    if (filters.cursor) {
        // The cursor is the created_at of the last job on the previous page.
        // We only return jobs OLDER than that point.
        conditions.push(`jp.created_at < $${i}`);
        values.push(filters.cursor);
        i += 1;
    }

    values.push(filters.limit + 1); // fetch one extra to detect hasMore

    const { rows } = await query(
        `SELECT jp.id, jp.client_id, jp.title, jp.description,
            jp.budget_type, jp.budget_min, jp.budget_max,
            jp.hourly_rate_min, jp.hourly_rate_max,
            jp.experience_level, jp.estimated_weeks, jp.deadline_at,
            jp.proposals_count, jp.views_count, jp.created_at ${rankSelect}
     FROM job_postings jp
     WHERE ${conditions.join(' AND ')}
     ORDER BY ${orderBy}
     LIMIT $${i}`,
        values
    );
    return rows;
}

// Purpose: Client's own jobs dashboard. Filtered by status, cursor-paginated.
async function findJobsByClient(clientId, filters) {
    const conditions = [`jp.client_id = $1`, `jp.deleted_at IS NULL`];
    const values = [clientId];
    let i = 2;

    if (filters.status) {
        conditions.push(`jp.status = $${i}`);
        values.push(filters.status);
        i += 1;
    }

    if (filters.cursor) {
        conditions.push(`jp.created_at < $${i}`);
        values.push(filters.cursor);
        i += 1;
    }

    values.push(filters.limit + 1);

    const { rows } = await query(
        `SELECT jp.id, jp.title, jp.status, jp.budget_type,
            jp.budget_min, jp.budget_max, jp.hourly_rate_min, jp.hourly_rate_max,
            jp.proposals_count, jp.views_count, jp.deadline_at, jp.created_at
     FROM job_postings jp
     WHERE ${conditions.join(' AND ')}
     ORDER BY jp.created_at DESC
     LIMIT $${i}`,
        values
    );
    return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB SKILLS
//
// Purpose: Manage which skills a job requires.
// We use a replace-all strategy (delete then insert in one transaction)
// rather than diffing old vs new. Simpler, atomic, and avoids partial states.
// withTransaction ensures both the DELETE and INSERT succeed or both fail.
// ─────────────────────────────────────────────────────────────────────────────

async function replaceJobSkills(jobId, skills) {
    return withTransaction(async (client) => {
        await client.query(`DELETE FROM job_skills WHERE job_id = $1`, [jobId]);
        for (const skill of skills) {
            await client.query(
                `INSERT INTO job_skills (job_id, skill_id, is_required) VALUES ($1, $2, $3)`,
                [jobId, skill.skillId, skill.isRequired]
            );
        }
    });
}

// Purpose: Fetch skill details joined with the pivot table.
// is_required DESC puts must-have skills at the top of the list.
async function listJobSkills(jobId) {
    const { rows } = await query(
        `SELECT s.id, s.name, s.category, js.is_required
     FROM job_skills js
     JOIN skills s ON s.id = js.skill_id
     WHERE js.job_id = $1
     ORDER BY js.is_required DESC, s.name`,
        [jobId]
    );
    return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVED JOBS
//
// Purpose: Freelancers bookmark jobs they're interested in.
// ON CONFLICT DO NOTHING makes saveJob idempotent — calling it twice
// on the same job is safe and returns no error (no duplicate rows).
// ─────────────────────────────────────────────────────────────────────────────

async function saveJob(freelancerId, jobId) {
    await query(
        `INSERT INTO saved_jobs (freelancer_id, job_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [freelancerId, jobId]
    );
}

async function unsaveJob(freelancerId, jobId) {
    // Simple DELETE — no error if row doesn't exist (idempotent)
    await query(
        `DELETE FROM saved_jobs WHERE freelancer_id = $1 AND job_id = $2`,
        [freelancerId, jobId]
    );
}

// Purpose: List saved jobs for a freelancer, cursor-paginated by save date.
// JOINs with job_postings to get full job details in one query.
// `jp.deleted_at IS NULL` hides saved jobs that were later deleted by clients.
async function listSavedJobs(freelancerId, cursor, limit) {
    const conditions = [`sj.freelancer_id = $1`, `jp.deleted_at IS NULL`];
    const values = [freelancerId];
    let i = 2;

    if (cursor) {
        // Cursor on save date (not job created_at) — keeps the saved list stable
        conditions.push(`sj.created_at < $${i}`);
        values.push(cursor);
        i += 1;
    }

    values.push(limit + 1);

    const { rows } = await query(
        `SELECT jp.id, jp.title, jp.status, jp.budget_type,
            jp.budget_min, jp.budget_max, jp.hourly_rate_min, jp.hourly_rate_max,
            jp.proposals_count, jp.deadline_at, jp.created_at,
            sj.created_at AS saved_at  -- when the freelancer saved it
     FROM saved_jobs sj
     JOIN job_postings jp ON jp.id = sj.job_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY sj.created_at DESC       -- most recently saved first
     LIMIT $${i}`,
        values
    );
    return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPOSALS — WRITE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Check if a freelancer already submitted a proposal for this job.
// Used by the service to enforce the UNIQUE constraint before hitting the DB.
// (The DB also has UNIQUE (job_id, freelancer_id) — this is an early check.)
async function findProposalByJobAndFreelancer(jobId, freelancerId) {
    const { rows } = await query(
        `SELECT * FROM proposals WHERE job_id = $1 AND freelancer_id = $2`,
        [jobId, freelancerId]
    );
    return rows[0] || null;
}

async function findProposalById(proposalId) {
    const { rows } = await query(
        `SELECT * FROM proposals WHERE id = $1`,
        [proposalId]
    );
    return rows[0] || null;
}

// Purpose: Insert a new proposal row with default status = 'pending'.
async function createProposal(jobId, freelancerId, data) {
    const { rows } = await query(
        `INSERT INTO proposals
       (job_id, freelancer_id, cover_letter, proposed_rate, proposed_weeks, ai_generated)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
        [jobId, freelancerId, data.coverLetter, data.proposedRate, data.proposedWeeks ?? null, data.aiGenerated]
    );
    return rows[0];
}

// Purpose: Dynamic partial update for proposal fields (same pattern as updateJob).
async function updateProposal(proposalId, data) {
    const fieldMap = {
        coverLetter: 'cover_letter',
        proposedRate: 'proposed_rate',
        proposedWeeks: 'proposed_weeks',
    };

    const setClauses = [];
    const values = [];
    let i = 1;

    for (const [key, col] of Object.entries(fieldMap)) {
        if (data[key] !== undefined) {
            setClauses.push(`${col} = $${i}`);
            values.push(data[key]);
            i += 1;
        }
    }

    if (setClauses.length === 0) return findProposalById(proposalId);

    values.push(proposalId);
    const { rows } = await query(
        `UPDATE proposals SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
        values
    );
    return rows[0];
}

// Purpose: Move proposal to a new status (accepted/rejected/withdrawn).
// client_note is optional feedback — useful for rejected proposals so freelancers
// know why they weren't chosen.
async function updateProposalStatus(proposalId, status, clientNote) {
    const { rows } = await query(
        `UPDATE proposals SET status = $2, client_note = $3 WHERE id = $1 RETURNING *`,
        [proposalId, status, clientNote ?? null]
    );
    return rows[0];
}

// Purpose: Record when a client first views a proposal (for analytics/transparency).
// `AND client_viewed_at IS NULL` means we only set it once (first view).
// This lets freelancers see "viewed" vs "not yet seen" on their dashboard.
async function markProposalViewed(proposalId) {
    await query(
        `UPDATE proposals SET client_viewed_at = NOW()
     WHERE id = $1 AND client_viewed_at IS NULL`,
        [proposalId]
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPOSALS — READ OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

// Purpose: Client views all proposals on their job with freelancer profile info.
// JOIN on freelancer_profiles pulls display_name, avatar, rating, jobs_completed
// in one query so the proposal list card has everything it needs without extra calls.
async function listProposalsForJob(jobId, cursor, limit) {
    const conditions = [`p.job_id = $1`];
    const values = [jobId];
    let i = 2;

    if (cursor) {
        conditions.push(`p.created_at < $${i}`);
        values.push(cursor);
        i += 1;
    }

    values.push(limit + 1);

    const { rows } = await query(
        `SELECT p.id, p.freelancer_id, p.cover_letter, p.proposed_rate,
            p.proposed_weeks, p.status, p.ai_generated,
            p.client_viewed_at, p.client_note, p.created_at,
            fp.display_name AS freelancer_name,   -- denormalized for the list card
            fp.avatar_url,
            fp.average_rating,
            fp.jobs_completed
     FROM proposals p
     JOIN freelancer_profiles fp ON fp.user_id = p.freelancer_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.created_at DESC
     LIMIT $${i}`,
        values
    );
    return rows;
}

// Purpose: Freelancer views all their submitted proposals with job context.
// JOIN on job_postings shows job title + status so freelancers know if a
// job they applied for was cancelled or completed.
async function listProposalsByFreelancer(freelancerId, cursor, limit) {
    const conditions = [`p.freelancer_id = $1`];
    const values = [freelancerId];
    let i = 2;

    if (cursor) {
        conditions.push(`p.created_at < $${i}`);
        values.push(cursor);
        i += 1;
    }

    values.push(limit + 1);

    const { rows } = await query(
        `SELECT p.id, p.job_id, p.cover_letter, p.proposed_rate,
            p.proposed_weeks, p.status, p.ai_generated, p.created_at,
            jp.title AS job_title,               -- what job is this for?
            jp.status AS job_status,             -- is the job still open?
            jp.budget_type,
            jp.budget_min, jp.budget_max,
            jp.hourly_rate_min, jp.hourly_rate_max
     FROM proposals p
     JOIN job_postings jp ON jp.id = p.job_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.created_at DESC
     LIMIT $${i}`,
        values
    );
    return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNTER HELPERS
//
// Purpose: Keep proposals_count on job_postings in sync.
// Why maintain a denormalized counter instead of COUNT(*)?
//   COUNT(*) on proposals requires a full scan or index scan every time the
//   job card is rendered. proposals_count is just a read of a single column.
//   Much faster for lists with many jobs.
// GREATEST(..., 0) prevents the count from going negative due to race conditions.
// ─────────────────────────────────────────────────────────────────────────────

async function incrementProposalsCount(jobId) {
    await query(
        `UPDATE job_postings SET proposals_count = proposals_count + 1 WHERE id = $1`,
        [jobId]
    );
}

async function decrementProposalsCount(jobId) {
    await query(
        `UPDATE job_postings SET proposals_count = GREATEST(proposals_count - 1, 0) WHERE id = $1`,
        [jobId]
    );
}

module.exports = {
    createJob, findJobById, updateJob, softDeleteJob, incrementJobViews,
    browseJobs, findJobsByClient,
    replaceJobSkills, listJobSkills,
    saveJob, unsaveJob, listSavedJobs,
    findProposalByJobAndFreelancer, findProposalById,
    createProposal, updateProposal, updateProposalStatus, markProposalViewed,
    listProposalsForJob, listProposalsByFreelancer,
    incrementProposalsCount, decrementProposalsCount,
};
