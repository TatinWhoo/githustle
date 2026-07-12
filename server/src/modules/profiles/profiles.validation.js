// src/modules/profiles/profiles.validation.js
const { z } = require('zod');

const createFreelancerProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  tagline: z.string().trim().max(255).optional(),
  bio: z.string().trim().max(5000).optional(),
  hourlyRate: z.coerce.number().min(0).max(100000).optional(),
  experienceLevel: z.enum(['entry', 'intermediate', 'expert']).optional(),
  availableHoursPerWeek: z.coerce.number().int().min(1).max(168).optional(),
  portfolioUrl: z.string().trim().url().optional().or(z.literal('')),
  location: z.string().trim().max(100).optional(),
  timezone: z.string().trim().max(50).optional(),
  languages: z.array(z.string().trim().min(1)).max(20).optional(),
});

const updateFreelancerProfileSchema = createFreelancerProfileSchema.partial();

const createClientProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  companyName: z.string().trim().max(255).optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '200+']).optional(),
  industry: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(5000).optional(),
  websiteUrl: z.string().trim().url().optional().or(z.literal('')),
  location: z.string().trim().max(100).optional(),
  timezone: z.string().trim().max(50).optional(),
});

const updateClientProfileSchema = createClientProfileSchema.partial();

const replaceSkillsSchema = z.object({
  skills: z
    .array(
      z.object({
        skillId: z.string().uuid('Each skillId must be a valid UUID'),
        proficiencyLevel: z.coerce.number().int().min(1).max(5).default(3),
        yearsExperience: z.coerce.number().min(0).max(60).optional(),
      })
    )
    .max(30, 'A profile can have at most 30 skills')
    .refine(
      (skills) => new Set(skills.map((s) => s.skillId)).size === skills.length,
      'Duplicate skillId in the list'
    ),
});

const createPortfolioItemSchema = z.object({
  title: z.string().trim().min(2).max(255),
  description: z.string().trim().max(2000).optional(),
  projectUrl: z.string().trim().url().optional().or(z.literal('')),
  imageUrl: z.string().trim().url().optional(),
  tags: z.array(z.string().trim().min(1)).max(15).optional(),
  orderIndex: z.coerce.number().int().min(0).optional(),
});

const updatePortfolioItemSchema = createPortfolioItemSchema.partial();

const portfolioItemIdParamSchema = z.object({
  id: z.string().uuid('Invalid portfolio item id'),
});

const searchFreelancersQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  skill: z.string().uuid().optional(),
  minRate: z.coerce.number().min(0).optional(),
  maxRate: z.coerce.number().min(0).optional(),
  available: z.coerce.boolean().optional(),
  location: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user id'),
});

module.exports = {
  createFreelancerProfileSchema,
  updateFreelancerProfileSchema,
  createClientProfileSchema,
  updateClientProfileSchema,
  replaceSkillsSchema,
  createPortfolioItemSchema,
  updatePortfolioItemSchema,
  portfolioItemIdParamSchema,
  searchFreelancersQuerySchema,
  userIdParamSchema,
};
