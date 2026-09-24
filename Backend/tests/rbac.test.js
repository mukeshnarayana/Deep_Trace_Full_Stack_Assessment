const request = require('supertest');
const app = require('../app');
const { createTestTenantAndUsers } = require('./helpers');

describe('RBAC Authorization Tests', () => {
  let tenantData;

  beforeEach(async () => {
    tenantData = await createTestTenantAndUsers('Role Tenant');
  });

  test('USER role is blocked from creating users (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tenantData.userToken}`)
      .send({
        name: 'Forbidden User',
        email: 'forbidden@roletenant.com',
        password: 'Password123!',
        role: 'USER'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Insufficient permissions');
  });

  test('USER role is blocked from audit logs (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${tenantData.userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('USER role is blocked from deleting campaigns (403 Forbidden)', async () => {
    const res = await request(app)
      .delete('/api/campaigns/60d5ecb8b5c9c81234567890')
      .set('Authorization', `Bearer ${tenantData.userToken}`);

    expect(res.status).toBe(403);
  });
});
