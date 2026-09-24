const request = require('supertest');
const app = require('../app');
const Campaign = require('../models/Campaign');
const SecurityEvent = require('../models/SecurityEvent');
const { createTestTenantAndUsers } = require('./helpers');

describe('Multi-Tenant Isolation Tests', () => {
  let tenantA, tenantB;

  beforeEach(async () => {
    tenantA = await createTestTenantAndUsers('Tenant Alpha');
    tenantB = await createTestTenantAndUsers('Tenant Beta');
  });

  test('Cross-tenant GET campaign returns 404', async () => {
    // Create campaign in Tenant B
    const campaignB = await Campaign.create({
      tenantId: tenantB.tenant._id,
      name: 'Tenant B Secret Campaign',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-30'),
      createdBy: tenantB.admin._id
    });

    // Tenant A admin attempts GET /api/campaigns/<campaignB.id>
    const res = await request(app)
      .get(`/api/campaigns/${campaignB._id}`)
      .set('Authorization', `Bearer ${tenantA.adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not found');
  });

  test('Cross-tenant PATCH campaign returns 404', async () => {
    const campaignB = await Campaign.create({
      tenantId: tenantB.tenant._id,
      name: 'Tenant B Campaign',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-30'),
      createdBy: tenantB.admin._id
    });

    const res = await request(app)
      .patch(`/api/campaigns/${campaignB._id}`)
      .set('Authorization', `Bearer ${tenantA.adminToken}`)
      .send({ name: 'Hacked Name' });

    expect(res.status).toBe(404);

    // Verify Campaign B in database was NOT changed
    const freshB = await Campaign.findById(campaignB._id);
    expect(freshB.name).toBe('Tenant B Campaign');
  });

  test('Cross-tenant DELETE campaign returns 404', async () => {
    const campaignB = await Campaign.create({
      tenantId: tenantB.tenant._id,
      name: 'Tenant B Campaign',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-30'),
      createdBy: tenantB.admin._id
    });

    const res = await request(app)
      .delete(`/api/campaigns/${campaignB._id}`)
      .set('Authorization', `Bearer ${tenantA.adminToken}`);

    expect(res.status).toBe(404);

    // Verify Campaign B still exists
    const freshB = await Campaign.findById(campaignB._id);
    expect(freshB).not.toBeNull();
  });
});
