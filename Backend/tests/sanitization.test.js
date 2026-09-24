const request = require('supertest');
const app = require('../app');
const Campaign = require('../models/Campaign');
const { createTestTenantAndUsers } = require('./helpers');
const mongoose = require('mongoose');

describe('Parameter Sanitization & Security Tests', () => {
  let tenantA;

  beforeEach(async () => {
    tenantA = await createTestTenantAndUsers('Sanitize Tenant');
  });

  test('tenantId passed in body is stripped/ignored and forced to user tenantId', async () => {
    const fakeTenantId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${tenantA.adminToken}`)
      .send({
        tenantId: fakeTenantId, // Malicious injection attempt
        name: 'Injected Campaign',
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-30T23:59:59.000Z'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.tenantId.toString()).toBe(tenantA.tenant._id.toString());
    expect(res.body.data.tenantId.toString()).not.toBe(fakeTenantId);
  });
});
