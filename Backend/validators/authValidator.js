const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email({ message: 'Must be a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' })
}).strip();

module.exports = {
  loginSchema
};
