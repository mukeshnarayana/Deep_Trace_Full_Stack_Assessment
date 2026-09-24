const request = require('supertest');
const app = require('../app');
const Campaign = require('../models/Campaign');
const { createTestTenantAndUsers } = require('./helpers');

describe('Campaign Status Transition Tests', () => {
  let tenantData, draftCampaign, completedCampaign;

  beforeEach(async () => {
    tenantData = await createTestTenantAndUsers('Status Tenant');

    draftCampaign = await Campaign.create({
      tenantId: tenantData.tenant._id,
      name: 'Draft Campaign',
      status: 'DRAFT',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-10-30'),
      createdBy: tenantData.admin._id
    });

    completedCampaign = await Campaign.create({
      tenantId: tenantData.tenant._id,
      name: 'Completed Campaign',
      status: 'COMPLETED',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-08-30'),
      createdBy: tenantData.admin._id
    });
  });

  test('Invalid transition DRAFT -> COMPLETED returns 400 Bad Request', async () => {
    const res = await request(app)
      .patch(`/api/campaigns/${draftCampaign._id}`)
      .set('Authorization', `Bearer ${tenantData.adminToken}`)
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid status transition');
  });

  test('Invalid transition from COMPLETED -> ACTIVE returns 400 Bad Request', async () => {
    const res = await request(app)
      .patch(`/api/campaigns/${completedCampaign._id}`)
      .set('Authorization', `Bearer ${tenantData.adminToken}`)
      .send({ status: 'ACTIVE' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid status transition');
  });

  test('Valid transition DRAFT -> ACTIVE returns 200 OK', async () => {
    const res = await request(app)
      .patch(`/api/campaigns/${draftCampaign._id}`)
      .set('Authorization', `Bearer ${tenantData.adminToken}`)
      .send({ status: 'ACTIVE' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
  });
});
