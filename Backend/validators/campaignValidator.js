const { z } = require('zod');

const createCampaignSchema = z.object({
  name: z.string().min(2, { message: 'Campaign name must be at least 2 characters' }),
  description: z.string().optional().default(''),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional().default('DRAFT'),
  startDate: z.string().datetime({ message: 'Invalid start date format. Must be ISO timestamp' }),
  endDate: z.string().datetime({ message: 'Invalid end date format. Must be ISO timestamp' }),
  assignedUsers: z.array(z.string()).optional().default([])
}).strip();

const updateCampaignSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  assignedUsers: z.array(z.string()).optional()
}).strip();

const assignUserSchema = z.object({
  userId: z.string().min(1, { message: 'userId is required' })
}).strip();

module.exports = {
  createCampaignSchema,
  updateCampaignSchema,
  assignUserSchema
};
