// src/modules/profiles/profiles.repository.js
const { query, withTransaction } = require('../../config/database');

// ── Freelancer profiles ──────────────────────────────────────

async function findFreelancerProfileByUserId(userId) {
  const { rows } = await query(`SELECT * FROM freelancer_profiles WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

async function findFreelancerProfileById(id) {
  const { rows } = await query(`SELECT * FROM freelancer_profiles WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createFreelancerProfile(userId, data) {
  const { rows } = await query(
    `INSERT INTO freelancer_profiles
       (user_id, display_name, tagline, bio, hourly_rate, experience_level,
        available_hours_per_week, portfolio_url, location, timezone, languages)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      userId,
      data.displayName,
      data.tagline ?? null,
      data.bio ?? null,
      data.hourlyRate ?? null,
      data.experienceLevel ?? null,
      data.availableHoursPerWeek ?? null,
      data.portfolioUrl || null,
      data.location ?? null,
      data.timezone ?? null,
      data.languages ?? [],
    ]
  );
  return rows[0];
}

async function updateFreelancerProfile(userId, data) {
  const fieldMap = {
    displayName: 'display_name',
    tagline: 'tagline',
    bio: 'bio',
    hourlyRate: 'hourly_rate',
    experienceLevel: 'experience_level',
    availableHoursPerWeek: 'available_hours_per_week',
    portfolioUrl: 'portfolio_url',
    location: 'location',
    timezone: 'timezone',
    languages: 'languages',
  };

  const setClauses = [];
  const values = [];
  let i = 1;

  for (const [key, column] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      setClauses.push(`${column} = $${i}`);
      values.push(data[key] === '' ? null : data[key]);
      i += 1;
    }
  }

  if (setClauses.length === 0) return findFreelancerProfileByUserId(userId);

  values.push(userId);
  const { rows } = await query(
    `UPDATE freelancer_profiles SET ${setClauses.join(', ')} WHERE user_id = $${i} RETURNING *`,
    values
  );
  return rows[0];
}

async function updateFreelancerAvatar(userId, avatarUrl) {
  const { rows } = await query(
    `UPDATE freelancer_profiles SET avatar_url = $2 WHERE user_id = $1 RETURNING *`,
    [userId, avatarUrl]
  );
  return rows[0];
}

async function updateFreelancerCompletion(freelancerProfileId, completion) {
  await query(`UPDATE freelancer_profiles SET profile_completion = $2 WHERE id = $1`, [
    freelancerProfileId,
    completion,
  ]);
}

async function searchFreelancers(filters) {
  const conditions = [];
  const values = [];
  let i = 1;
  let rankSelect = '';
  let orderBy = 'fp.average_rating DESC NULLS LAST, fp.created_at DESC';

  if (filters.q) {
    rankSelect = `, ts_rank(fp.search_vector, plainto_tsquery('english', $${i})) AS rank`;
    conditions.push(`fp.search_vector @@ plainto_tsquery('english', $${i})`);
    values.push(filters.q);
    i += 1;
    orderBy = 'rank DESC, fp.average_rating DESC NULLS LAST';
  }

  if (filters.skill) {
    conditions.push(
      `EXISTS (SELECT 1 FROM freelancer_skills fs WHERE fs.freelancer_profile_id = fp.id AND fs.skill_id = $${i})`
    );
    values.push(filters.skill);
    i += 1;
  }

  if (filters.minRate !== undefined) { conditions.push(`fp.hourly_rate >= $${i}`); values.push(filters.minRate); i += 1; }
  if (filters.maxRate !== undefined) { conditions.push(`fp.hourly_rate <= $${i}`); values.push(filters.maxRate); i += 1; }
  if (filters.available !== undefined) { conditions.push(`fp.is_available = $${i}`); values.push(filters.available); i += 1; }
  if (filters.location) { conditions.push(`fp.location ILIKE $${i}`); values.push(`%${filters.location}%`); i += 1; }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitPlusOne = filters.limit + 1;
  const offset = (filters.page - 1) * filters.limit;
  values.push(limitPlusOne, offset);

  const { rows } = await query(
    `SELECT fp.id, fp.user_id, fp.display_name, fp.tagline, fp.avatar_url, fp.hourly_rate,
            fp.experience_level, fp.is_available, fp.location, fp.average_rating,
            fp.total_reviews, fp.jobs_completed, fp.profile_completion ${rankSelect}
     FROM freelancer_profiles fp
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT $${i} OFFSET $${i + 1}`,
    values
  );
  return rows;
}

// ── Client profiles ──────────────────────────────────────────

async function findClientProfileByUserId(userId) {
  const { rows } = await query(`SELECT * FROM client_profiles WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

async function createClientProfile(userId, data) {
  const { rows } = await query(
    `INSERT INTO client_profiles
       (user_id, display_name, company_name, company_size, industry, bio, website_url, location, timezone)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      userId,
      data.displayName,
      data.companyName ?? null,
      data.companySize ?? null,
      data.industry ?? null,
      data.bio ?? null,
      data.websiteUrl || null,
      data.location ?? null,
      data.timezone ?? null,
    ]
  );
  return rows[0];
}

async function updateClientProfile(userId, data) {
  const fieldMap = {
    displayName: 'display_name',
    companyName: 'company_name',
    companySize: 'company_size',
    industry: 'industry',
    bio: 'bio',
    websiteUrl: 'website_url',
    location: 'location',
    timezone: 'timezone',
  };

  const setClauses = [];
  const values = [];
  let i = 1;

  for (const [key, column] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      setClauses.push(`${column} = $${i}`);
      values.push(data[key] === '' ? null : data[key]);
      i += 1;
    }
  }

  if (setClauses.length === 0) return findClientProfileByUserId(userId);

  values.push(userId);
  const { rows } = await query(
    `UPDATE client_profiles SET ${setClauses.join(', ')} WHERE user_id = $${i} RETURNING *`,
    values
  );
  return rows[0];
}

async function updateClientAvatar(userId, avatarUrl) {
  const { rows } = await query(
    `UPDATE client_profiles SET avatar_url = $2 WHERE user_id = $1 RETURNING *`,
    [userId, avatarUrl]
  );
  return rows[0];
}

// ── Skills ────────────────────────────────────────────────────

async function listActiveSkills(category) {
  if (category) {
    const { rows } = await query(
      `SELECT id, name, category FROM skills WHERE is_active = TRUE AND category = $1 ORDER BY name`,
      [category]
    );
    return rows;
  }
  const { rows } = await query(
    `SELECT id, name, category FROM skills WHERE is_active = TRUE ORDER BY category, name`
  );
  return rows;
}

async function findSkillsByIds(skillIds) {
  if (skillIds.length === 0) return [];
  const { rows } = await query(
    `SELECT id FROM skills WHERE id = ANY($1::uuid[]) AND is_active = TRUE`,
    [skillIds]
  );
  return rows.map((r) => r.id);
}

async function listFreelancerSkills(freelancerProfileId) {
  const { rows } = await query(
    `SELECT s.id, s.name, s.category, fs.proficiency_level, fs.years_experience
     FROM freelancer_skills fs
     JOIN skills s ON s.id = fs.skill_id
     WHERE fs.freelancer_profile_id = $1
     ORDER BY fs.proficiency_level DESC, s.name`,
    [freelancerProfileId]
  );
  return rows;
}

async function countFreelancerSkills(freelancerProfileId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM freelancer_skills WHERE freelancer_profile_id = $1`,
    [freelancerProfileId]
  );
  return rows[0].count;
}

async function replaceFreelancerSkills(freelancerProfileId, skills) {
  return withTransaction(async (client) => {
    await client.query(`DELETE FROM freelancer_skills WHERE freelancer_profile_id = $1`, [
      freelancerProfileId,
    ]);
    for (const skill of skills) {
      await client.query(
        `INSERT INTO freelancer_skills (freelancer_profile_id, skill_id, proficiency_level, years_experience)
         VALUES ($1, $2, $3, $4)`,
        [freelancerProfileId, skill.skillId, skill.proficiencyLevel, skill.yearsExperience ?? null]
      );
    }
  });
}

// ── Portfolio items ───────────────────────────────────────────

async function listPortfolioItems(freelancerProfileId) {
  const { rows } = await query(
    `SELECT * FROM portfolio_items WHERE freelancer_profile_id = $1 ORDER BY order_index, created_at`,
    [freelancerProfileId]
  );
  return rows;
}

async function countPortfolioItems(freelancerProfileId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM portfolio_items WHERE freelancer_profile_id = $1`,
    [freelancerProfileId]
  );
  return rows[0].count;
}

async function findPortfolioItemById(id) {
  const { rows } = await query(`SELECT * FROM portfolio_items WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createPortfolioItem(freelancerProfileId, data) {
  const { rows } = await query(
    `INSERT INTO portfolio_items
       (freelancer_profile_id, title, description, project_url, image_url, tags, order_index)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      freelancerProfileId,
      data.title,
      data.description ?? null,
      data.projectUrl || null,
      data.imageUrl ?? null,
      data.tags ?? [],
      data.orderIndex ?? 0,
    ]
  );
  return rows[0];
}

async function updatePortfolioItem(id, data) {
  const fieldMap = {
    title: 'title',
    description: 'description',
    projectUrl: 'project_url',
    imageUrl: 'image_url',
    tags: 'tags',
    orderIndex: 'order_index',
  };

  const setClauses = [];
  const values = [];
  let i = 1;

  for (const [key, column] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      setClauses.push(`${column} = $${i}`);
      values.push(data[key] === '' ? null : data[key]);
      i += 1;
    }
  }

  if (setClauses.length === 0) return findPortfolioItemById(id);

  values.push(id);
  const { rows } = await query(
    `UPDATE portfolio_items SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0];
}

async function deletePortfolioItem(id) {
  await query(`DELETE FROM portfolio_items WHERE id = $1`, [id]);
}

// ── File uploads ──────────────────────────────────────────────

async function insertFileUpload({ uploaderId, fileName, originalName, fileUrl, fileSizeBytes, mimeType, entityType, entityId }) {
  const { rows } = await query(
    `INSERT INTO file_uploads
       (uploader_id, file_name, original_name, file_url, file_size_bytes, mime_type, entity_type, entity_id, is_public)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
     RETURNING *`,
    [uploaderId, fileName, originalName, fileUrl, fileSizeBytes, mimeType, entityType, entityId]
  );
  return rows[0];
}

module.exports = {
  findFreelancerProfileByUserId,
  findFreelancerProfileById,
  createFreelancerProfile,
  updateFreelancerProfile,
  updateFreelancerAvatar,
  updateFreelancerCompletion,
  searchFreelancers,
  findClientProfileByUserId,
  createClientProfile,
  updateClientProfile,
  updateClientAvatar,
  listActiveSkills,
  findSkillsByIds,
  listFreelancerSkills,
  countFreelancerSkills,
  replaceFreelancerSkills,
  listPortfolioItems,
  countPortfolioItems,
  findPortfolioItemById,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  insertFileUpload,
};
