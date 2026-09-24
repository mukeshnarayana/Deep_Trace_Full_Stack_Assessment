const { z } = require('zod');

const createUserSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }),
  email: z.string().email({ message: 'Must be a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).default('USER')
}).strip();

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']).optional(),
  isActive: z.boolean().optional()
}).strip();

module.exports = {
  createUserSchema,
  updateUserSchema
};
