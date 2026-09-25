const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const SecurityEvent = require('../models/SecurityEvent');
const AuditLog = require('../models/AuditLog');

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to PostgreSQL (Neon)...');
    await connectDB();

    console.log('[Seed] Wiping existing database collections...');
    await Promise.all([
      Tenant.deleteMany({}),
      User.deleteMany({}),
      Campaign.deleteMany({}),
      SecurityEvent.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    console.log('[Seed] Creating Tenants...');
    const acmeTenant = await Tenant.create({
      name: 'Acme Bank',
      domain: 'acmebank.com',
      status: 'ACTIVE'
    });

    const zenTenant = await Tenant.create({
      name: 'Zen Retail',
      domain: 'zenretail.io',
      status: 'ACTIVE'
    });

    const defaultPassword = 'Password123!';

    console.log('[Seed] Seeding Users for Acme Bank...');
    const acmeAdmin = await User.create({
      tenantId: acmeTenant._id,
      name: 'Acme Admin',
      email: 'admin@acmebank.com',
      password: defaultPassword,
      role: 'ADMIN',
      isActive: true
    });

    const acmeManager = await User.create({
      tenantId: acmeTenant._id,
      name: 'Acme Manager',
      email: 'manager@acmebank.com',
      password: defaultPassword,
      role: 'MANAGER',
      isActive: true
    });

    const acmeUser1 = await User.create({
      tenantId: acmeTenant._id,
      name: 'Acme User One',
      email: 'user1@acmebank.com',
      password: defaultPassword,
      role: 'USER',
      isActive: true
    });

    const acmeUser2 = await User.create({
      tenantId: acmeTenant._id,
      name: 'Acme User Two',
      email: 'user2@acmebank.com',
      password: defaultPassword,
      role: 'USER',
      isActive: true
    });

    console.log('[Seed] Seeding Users for Zen Retail...');
    const zenAdmin = await User.create({
      tenantId: zenTenant._id,
      name: 'Zen Admin',
      email: 'admin@zenretail.io',
      password: defaultPassword,
      role: 'ADMIN',
      isActive: true
    });

    const zenManager = await User.create({
      tenantId: zenTenant._id,
      name: 'Zen Manager',
      email: 'manager@zenretail.io',
      password: defaultPassword,
      role: 'MANAGER',
      isActive: true
    });

    const zenUser1 = await User.create({
      tenantId: zenTenant._id,
      name: 'Zen User One',
      email: 'user1@zenretail.io',
      password: defaultPassword,
      role: 'USER',
      isActive: true
    });

    console.log('[Seed] Seeding Campaigns...');
    // Acme Campaigns
    const acmeCamp1 = await Campaign.create({
      tenantId: acmeTenant._id,
      name: 'Phishing Awareness Training Q3',
      description: 'Quarterly phishing simulation test for core banking staff',
      status: 'ACTIVE',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-10-15'),
      assignedUsers: [acmeUser1._id, acmeUser2._id],
      createdBy: acmeAdmin._id
    });

    const acmeCamp2 = await Campaign.create({
      tenantId: acmeTenant._id,
      name: 'Ransomware Preparedness Drill',
      description: 'Incident response drill simulating ransomware intrusion',
      status: 'DRAFT',
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-30'),
      assignedUsers: [acmeUser1._id],
      createdBy: acmeManager._id
    });

    const acmeCamp3 = await Campaign.create({
      tenantId: acmeTenant._id,
      name: 'Zero-Trust Access Migration',
      description: 'Migrating legacy VPN users to Zero-Trust Network Access',
      status: 'COMPLETED',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-08-31'),
      assignedUsers: [acmeUser1._id, acmeUser2._id],
      createdBy: acmeAdmin._id
    });

    await Campaign.create({
      tenantId: acmeTenant._id,
      name: 'Legacy Firewall Sunset',
      description: 'Decommissioning legacy hardware firewalls',
      status: 'CANCELLED',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-15'),
      assignedUsers: [],
      createdBy: acmeManager._id
    });

    // Zen Campaigns
    await Campaign.create({
      tenantId: zenTenant._id,
      name: 'PCI-DSS 4.0 Compliance Audit 2026',
      description: 'Annual payment card industry security standard audit',
      status: 'ACTIVE',
      startDate: new Date('2026-09-10'),
      endDate: new Date('2026-12-01'),
      assignedUsers: [zenUser1._id],
      createdBy: zenAdmin._id
    });

    await Campaign.create({
      tenantId: zenTenant._id,
      name: 'E-Commerce Payment Gateway Hardening',
      description: 'API security hardening for point-of-sale systems',
      status: 'DRAFT',
      startDate: new Date('2026-10-15'),
      endDate: new Date('2026-11-15'),
      assignedUsers: [zenUser1._id],
      createdBy: zenManager._id
    });

    console.log('[Seed] Seeding 35+ Security Events per tenant...');
    const eventTypes = [
      'SUSPICIOUS_LOGIN',
      'MALWARE_DETECTED',
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'DATA_EXFILTRATION_ALERT',
      'PORT_SCAN_DETECTED',
      'BRUTE_FORCE_ATTEMPT',
      'API_RATE_LIMIT_EXCEEDED'
    ];
    const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const statuses = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

    const generateEvents = (tenantId, creatorId) => {
      const events = [];
      for (let i = 1; i <= 35; i++) {
        const type = eventTypes[i % eventTypes.length];
        const severity = severities[i % severities.length];
        const status = statuses[i % statuses.length];
        const daysAgo = i % 25;
        const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

        events.push({
          tenantId,
          type,
          severity,
          status,
          description: `Automated security alert #${i}: ${type} identified with severity ${severity}.`,
          timestamp,
          createdBy: creatorId
        });
      }
      return events;
    };

    await SecurityEvent.insertMany(generateEvents(acmeTenant._id, acmeAdmin._id));
    await SecurityEvent.insertMany(generateEvents(zenTenant._id, zenAdmin._id));

    console.log('[Seed] Creating initial Audit Logs...');
    await AuditLog.create([
      {
        tenantId: acmeTenant._id,
        actorId: acmeAdmin._id,
        action: 'TENANT_INITIALIZED',
        entityType: 'Tenant',
        entityId: acmeTenant._id.toString(),
        metadata: { name: acmeTenant.name },
        ip: '127.0.0.1'
      },
      {
        tenantId: acmeTenant._id,
        actorId: acmeAdmin._id,
        action: 'CAMPAIGN_CREATE',
        entityType: 'Campaign',
        entityId: acmeCamp1._id.toString(),
        metadata: { name: acmeCamp1.name },
        ip: '127.0.0.1'
      },
      {
        tenantId: zenTenant._id,
        actorId: zenAdmin._id,
        action: 'TENANT_INITIALIZED',
        entityType: 'Tenant',
        entityId: zenTenant._id.toString(),
        metadata: { name: zenTenant.name },
        ip: '127.0.0.1'
      }
    ]);

    console.log('\n===================================================================');
    console.log('                 SEED DATA SUCCESSFULLY CREATED                    ');
    console.log('===================================================================');
    console.log('\nSample Logins (Password for all users: Password123!):\n');
    console.table([
      { Tenant: 'Acme Bank', Role: 'ADMIN', Email: 'admin@acmebank.com', Password: 'Password123!' },
      { Tenant: 'Acme Bank', Role: 'MANAGER', Email: 'manager@acmebank.com', Password: 'Password123!' },
      { Tenant: 'Acme Bank', Role: 'USER', Email: 'user1@acmebank.com', Password: 'Password123!' },
      { Tenant: 'Acme Bank', Role: 'USER', Email: 'user2@acmebank.com', Password: 'Password123!' },
      { Tenant: 'Zen Retail', Role: 'ADMIN', Email: 'admin@zenretail.io', Password: 'Password123!' },
      { Tenant: 'Zen Retail', Role: 'MANAGER', Email: 'manager@zenretail.io', Password: 'Password123!' },
      { Tenant: 'Zen Retail', Role: 'USER', Email: 'user1@zenretail.io', Password: 'Password123!' }
    ]);
    console.log('===================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    process.exit(1);
  }
};

seedData();
