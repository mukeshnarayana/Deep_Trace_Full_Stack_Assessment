const request = require('supertest');
const app = require('../app');
const { createTestTenantAndUsers } = require('./helpers');

describe('JWT Revocation Tests', () => {
  let tenantData;

  beforeEach(async () => {
    tenantData = await createTestTenantAndUsers('Revocation Tenant');
  });

  test('Calling /api/auth/logout revokes JWT token (subsequent request returns 401)', async () => {
    // 1. Verify token works before logout
    const preRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tenantData.adminToken}`);

    expect(preRes.status).toBe(200);

    // 2. Perform Logout to bump tokenVersion
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${tenantData.adminToken}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // 3. Attempt accessing protected endpoint with same token
    const postRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tenantData.adminToken}`);

    expect(postRes.status).toBe(401);
    expect(postRes.body.message).toContain('revoked');
  });
});
