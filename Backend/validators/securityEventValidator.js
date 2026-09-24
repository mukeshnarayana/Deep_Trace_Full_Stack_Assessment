const { z } = require('zod');

const createSecurityEventSchema = z.object({
  type: z.string().min(2, { message: 'Event type is required' }),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
    errorMap: () => ({ message: 'Severity must be LOW, MEDIUM, HIGH, or CRITICAL' })
  }),
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']).optional().default('OPEN'),
  description: z.string().min(5, { message: 'Description must be at least 5 characters' }),
  timestamp: z.string().datetime().optional()
}).strip();

const updateSecurityEventSchema = z.object({
  type: z.string().min(2).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']).optional(),
  description: z.string().min(5).optional()
}).strip();

module.exports = {
  createSecurityEventSchema,
  updateSecurityEventSchema
};
