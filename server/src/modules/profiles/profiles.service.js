// src/modules/profiles/profiles.service.js
const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const { isValidImageBuffer, saveBuffer, deleteFile } = require('../../utils/fileStorage');
const repo = require('./profiles.repository');

// Profile completion scoring
const COMPLETION_WEIGHTS = {
  tagline: 10,
  bio: 15,
  avatarUrl: 15,
  hourlyRate: 10,
  experienceLevel: 5,
  availableHoursPerWeek: 5,
  location: 5,
  languages: 5,
  hasAtLeastOneSkill: 10,
  hasAtLeastThreePortfolioItems: 10,
};
const BASE_SCORE_FOR_EXISTING_PROFILE = 10;

function calculateFreelancerCompletion(profile, skillCount, portfolioCount) {
  let score = BASE_SCORE_FOR_EXISTING_PROFILE;
  if (profile.tagline) score += COMPLETION_WEIGHTS.tagline;
  if (profile.bio && profile.bio.length > 20) score += COMPLETION_WEIGHTS.bio;
  if (profile.avatar_url) score += COMPLETION_WEIGHTS.avatarUrl;
  if (profile.hourly_rate !== null) score += COMPLETION_WEIGHTS.hourlyRate;
  if (profile.experience_level) score += COMPLETION_WEIGHTS.experienceLevel;
  if (profile.available_hours_per_week !== null) score += COMPLETION_WEIGHTS.availableHoursPerWeek;
  if (profile.location) score += COMPLETION_WEIGHTS.location;
  if (profile.languages && profile.languages.length > 0) score += COMPLETION_WEIGHTS.languages;
  if (skillCount >= 1) score += COMPLETION_WEIGHTS.hasAtLeastOneSkill;
  if (portfolioCount >= 3) score += COMPLETION_WEIGHTS.hasAtLeastThreePortfolioItems;
  return Math.min(score, 100);
}

async function recalculateFreelancerCompletion(freelancerProfileId) {
  const profile = await repo.findFreelancerProfileById(freelancerProfileId);
  const [skillCount, portfolioCount] = await Promise.all([
    repo.countFreelancerSkills(freelancerProfileId),
    repo.countPortfolioItems(freelancerProfileId),
  ]);
  const completion = calculateFreelancerCompletion(profile, skillCount, portfolioCount);
  await repo.updateFreelancerCompletion(freelancerProfileId, completion);
  return completion;
}

function toFreelancerDTO(profile) {
  return {
    id: profile.id,
    userId: profile.user_id,
    displayName: profile.display_name,
    tagline: profile.tagline,
    bio: profile.bio,
    avatarUrl: profile.avatar_url,
    hourlyRate: profile.hourly_rate !== null ? Number(profile.hourly_rate) : null,
    experienceLevel: profile.experience_level,
    availableHoursPerWeek: profile.available_hours_per_week,
    isAvailable: profile.is_available,
    portfolioUrl: profile.portfolio_url,
    location: profile.location,
    timezone: profile.timezone,
    languages: profile.languages,
    totalEarned: Number(profile.total_earned),
    jobsCompleted: profile.jobs_completed,
    averageRating: profile.average_rating !== null ? Number(profile.average_rating) : null,
    totalReviews: profile.total_reviews,
    profileCompletion: profile.profile_completion,
    createdAt: profile.created_at,
  };
}

async function createFreelancerProfile(userId, data) {
  const existing = await repo.findFreelancerProfileByUserId(userId);
  if (existing) throw new AppError('Freelancer profile already exists for this account.', 409);

  const profile = await repo.createFreelancerProfile(userId, data);
  await recalculateFreelancerCompletion(profile.id);

  const fresh = await repo.findFreelancerProfileByUserId(userId);
  return toFreelancerDTO(fresh);
}

async function getOwnFreelancerProfile(userId) {
  const profile = await repo.findFreelancerProfileByUserId(userId);
  if (!profile) throw new AppError('No freelancer profile found for this account yet.', 404);
  const skills = await repo.listFreelancerSkills(profile.id);
  const portfolio = await repo.listPortfolioItems(profile.id);
  return { ...toFreelancerDTO(profile), skills, portfolio };
}

async function getPublicFreelancerProfile(userId) {
  const profile = await repo.findFreelancerProfileByUserId(userId);
  if (!profile) throw new AppError('Freelancer profile not found.', 404);
  const skills = await repo.listFreelancerSkills(profile.id);
  const portfolio = await repo.listPortfolioItems(profile.id);
  return { ...toFreelancerDTO(profile), skills, portfolio };
}

async function updateFreelancerProfile(userId, data) {
  const existing = await repo.findFreelancerProfileByUserId(userId);
  if (!existing) throw new AppError('No freelancer profile found for this account yet.', 404);

  const updated = await repo.updateFreelancerProfile(userId, data);
  await recalculateFreelancerCompletion(updated.id);

  const fresh = await repo.findFreelancerProfileByUserId(userId);
  return toFreelancerDTO(fresh);
}

async function searchFreelancers(filters) {
  const rows = await repo.searchFreelancers(filters);
  const hasMore = rows.length > filters.limit;
  const page = hasMore ? rows.slice(0, filters.limit) : rows;

  return {
    results: page.map((p) => ({
      userId: p.user_id,
      displayName: p.display_name,
      tagline: p.tagline,
      avatarUrl: p.avatar_url,
      hourlyRate: p.hourly_rate !== null ? Number(p.hourly_rate) : null,
      experienceLevel: p.experience_level,
      isAvailable: p.is_available,
      location: p.location,
      averageRating: p.average_rating !== null ? Number(p.average_rating) : null,
      totalReviews: p.total_reviews,
      jobsCompleted: p.jobs_completed,
      profileCompletion: p.profile_completion,
    })),
    page: filters.page,
    limit: filters.limit,
    hasMore,
  };
}

function toClientDTO(profile) {
  return {
    id: profile.id,
    userId: profile.user_id,
    displayName: profile.display_name,
    companyName: profile.company_name,
    companySize: profile.company_size,
    industry: profile.industry,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    websiteUrl: profile.website_url,
    location: profile.location,
    timezone: profile.timezone,
    totalSpent: Number(profile.total_spent),
    jobsPosted: profile.jobs_posted,
    averageRating: profile.average_rating !== null ? Number(profile.average_rating) : null,
    totalReviews: profile.total_reviews,
    paymentVerified: profile.payment_verified,
    createdAt: profile.created_at,
  };
}

async function createClientProfile(userId, data) {
  const existing = await repo.findClientProfileByUserId(userId);
  if (existing) throw new AppError('Client profile already exists for this account.', 409);
  const profile = await repo.createClientProfile(userId, data);
  return toClientDTO(profile);
}

async function getOwnClientProfile(userId) {
  const profile = await repo.findClientProfileByUserId(userId);
  if (!profile) throw new AppError('No client profile found for this account yet.', 404);
  return toClientDTO(profile);
}

async function getPublicClientProfile(userId) {
  const profile = await repo.findClientProfileByUserId(userId);
  if (!profile) throw new AppError('Client profile not found.', 404);
  return toClientDTO(profile);
}

async function updateClientProfile(userId, data) {
  const existing = await repo.findClientProfileByUserId(userId);
  if (!existing) throw new AppError('No client profile found for this account yet.', 404);
  const updated = await repo.updateClientProfile(userId, data);
  return toClientDTO(updated);
}

async function listSkills(category) {
  return repo.listActiveSkills(category);
}

async function replaceFreelancerSkills(userId, skills) {
  const profile = await repo.findFreelancerProfileByUserId(userId);
  if (!profile) throw new AppError('Create your freelancer profile before adding skills.', 404);

  if (skills.length > 0) {
    const validIds = await repo.findSkillsByIds(skills.map((s) => s.skillId));
    const invalid = skills.filter((s) => !validIds.includes(s.skillId));
    if (invalid.length > 0) {
      throw new AppError(
        `These skill IDs are invalid or inactive: ${invalid.map((s) => s.skillId).join(', ')}`,
        422
      );
    }
  }

  await repo.replaceFreelancerSkills(profile.id, skills);
  await recalculateFreelancerCompletion(profile.id);
  return repo.listFreelancerSkills(profile.id);
}

function toPortfolioDTO(item) {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    projectUrl: item.project_url,
    imageUrl: item.image_url,
    tags: item.tags,
    orderIndex: item.order_index,
    createdAt: item.created_at,
  };
}

async function assertOwnsPortfolioItem(userId, itemId) {
  const profile = await repo.findFreelancerProfileByUserId(userId);
  if (!profile) throw new AppError('No freelancer profile found for this account.', 404);

  const item = await repo.findPortfolioItemById(itemId);
  if (!item || item.freelancer_profile_id !== profile.id) {
    throw new AppError('Portfolio item not found.', 404);
  }
  return { profile, item };
}

async function addPortfolioItem(userId, data) {
  const profile = await repo.findFreelancerProfileByUserId(userId);
  if (!profile) throw new AppError('Create your freelancer profile before adding portfolio items.', 404);

  const item = await repo.createPortfolioItem(profile.id, data);
  await recalculateFreelancerCompletion(profile.id);
  return toPortfolioDTO(item);
}

async function updatePortfolioItem(userId, itemId, data) {
  await assertOwnsPortfolioItem(userId, itemId);
  const updated = await repo.updatePortfolioItem(itemId, data);
  return toPortfolioDTO(updated);
}

async function deletePortfolioItem(userId, itemId) {
  const { profile } = await assertOwnsPortfolioItem(userId, itemId);
  await repo.deletePortfolioItem(itemId);
  await recalculateFreelancerCompletion(profile.id);
}

async function processImageUpload({ buffer, declaredMimeType, originalName, subdir, uploaderId, entityType }) {
  if (!isValidImageBuffer(buffer, declaredMimeType)) {
    throw new AppError('File content does not match a valid image format.', 422);
  }
  const saved = await saveBuffer(buffer, subdir, declaredMimeType);
  await repo.insertFileUpload({
    uploaderId,
    fileName: saved.filename,
    originalName,
    fileUrl: saved.url,
    fileSizeBytes: buffer.length,
    mimeType: declaredMimeType,
    entityType,
    entityId: null,
  });
  return saved;
}

async function uploadFreelancerAvatar(userId, file) {
  const existing = await repo.findFreelancerProfileByUserId(userId);
  if (!existing) throw new AppError('Create your freelancer profile before uploading an avatar.', 404);

  const saved = await processImageUpload({
    buffer: file.buffer,
    declaredMimeType: file.mimetype,
    originalName: file.originalname,
    subdir: 'avatars',
    uploaderId: userId,
    entityType: 'avatar',
  });

  const oldRelativePath = existing.avatar_url
    ? existing.avatar_url.split(`/${env.UPLOAD_DIR}/`)[1]
    : null;

  await repo.updateFreelancerAvatar(userId, saved.url);
  if (oldRelativePath) await deleteFile(oldRelativePath);
  await recalculateFreelancerCompletion(existing.id);

  return { avatarUrl: saved.url };
}

async function uploadClientAvatar(userId, file) {
  const existing = await repo.findClientProfileByUserId(userId);
  if (!existing) throw new AppError('Create your client profile before uploading an avatar.', 404);

  const saved = await processImageUpload({
    buffer: file.buffer,
    declaredMimeType: file.mimetype,
    originalName: file.originalname,
    subdir: 'avatars',
    uploaderId: userId,
    entityType: 'avatar',
  });

  const oldRelativePath = existing.avatar_url
    ? existing.avatar_url.split(`/${env.UPLOAD_DIR}/`)[1]
    : null;

  await repo.updateClientAvatar(userId, saved.url);
  if (oldRelativePath) await deleteFile(oldRelativePath);

  return { avatarUrl: saved.url };
}

async function uploadPortfolioImage(userId, file) {
  const existing = await repo.findFreelancerProfileByUserId(userId);
  if (!existing) throw new AppError('Create your freelancer profile before uploading images.', 404);

  const saved = await processImageUpload({
    buffer: file.buffer,
    declaredMimeType: file.mimetype,
    originalName: file.originalname,
    subdir: 'portfolio',
    uploaderId: userId,
    entityType: 'portfolio',
  });

  return { imageUrl: saved.url };
}

module.exports = {
  createFreelancerProfile,
  getOwnFreelancerProfile,
  getPublicFreelancerProfile,
  updateFreelancerProfile,
  searchFreelancers,
  createClientProfile,
  getOwnClientProfile,
  getPublicClientProfile,
  updateClientProfile,
  listSkills,
  replaceFreelancerSkills,
  addPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  uploadFreelancerAvatar,
  uploadClientAvatar,
  uploadPortfolioImage,
};
