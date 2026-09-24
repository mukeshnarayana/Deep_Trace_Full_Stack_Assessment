const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const env = require('../config/env');

/**
 * Helper to seed a tenant and users for testing
 */
const createTestTenantAndUsers = async (tenantName = 'Test Tenant') => {
  const tenant = await Tenant.create({ name: tenantName });

  const admin = await User.create({
    tenantId: tenant._id,
    name: `${tenantName} Admin`,
    email: `admin@${tenantName.toLowerCase().replace(/\s+/g, '')}.com`,
    password: 'Password123!',
    role: 'ADMIN'
  });

  const manager = await User.create({
    tenantId: tenant._id,
    name: `${tenantName} Manager`,
    email: `manager@${tenantName.toLowerCase().replace(/\s+/g, '')}.com`,
    password: 'Password123!',
    role: 'MANAGER'
  });

  const user = await User.create({
    tenantId: tenant._id,
    name: `${tenantName} User`,
    email: `user@${tenantName.toLowerCase().replace(/\s+/g, '')}.com`,
    password: 'Password123!',
    role: 'USER'
  });

  const adminToken = jwt.sign(
    { userId: admin._id, tokenVersion: admin.tokenVersion },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  const managerToken = jwt.sign(
    { userId: manager._id, tokenVersion: manager.tokenVersion },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  const userToken = jwt.sign(
    { userId: user._id, tokenVersion: user.tokenVersion },
    env.jwtSecret,
    { expiresIn: '1h' }
  );

  return {
    tenant,
    admin,
    manager,
    user,
    adminToken,
    managerToken,
    userToken
  };
};

module.exports = {
  createTestTenantAndUsers
};
