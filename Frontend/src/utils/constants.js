export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  USER: 'USER',
};

// Campaign lifecycle state machine transitions
export const CAMPAIGN_STATUSES = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const CAMPAIGN_TRANSITIONS = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// Security Event definitions
export const EVENT_SEVERITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

export const EVENT_STATUSES = {
  OPEN: 'OPEN',
  INVESTIGATING: 'INVESTIGATING',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
};

export const EVENT_TYPES = [
  'SUSPICIOUS_LOGIN',
  'UNAUTHORIZED_ACCESS',
  'BRUTE_FORCE_ATTEMPT',
  'MALWARE_DETECTED',
  'DATA_EXFILTRATION_ALERT',
  'PRIVILEGE_ESCALATION',
  'POLICY_VIOLATION',
  'API_ANOMALY',
];

// Seed credentials helper for quick login testing
export const SEED_ACCOUNTS = [
  {
    tenant: 'Acme Bank',
    role: 'ADMIN',
    email: 'admin@acmebank.com',
    label: 'Acme Bank (Admin)',
    desc: 'Full tenant control & Audit logs',
  },
  {
    tenant: 'Acme Bank',
    role: 'MANAGER',
    email: 'manager@acmebank.com',
    label: 'Acme Bank (Manager)',
    desc: 'Campaigns & Events CRUD, View Users',
  },
  {
    tenant: 'Acme Bank',
    role: 'USER',
    email: 'user1@acmebank.com',
    label: 'Acme Bank (User)',
    desc: 'Read-only assigned campaigns & events',
  },
  {
    tenant: 'Zen Retail',
    role: 'ADMIN',
    email: 'admin@zenretail.io',
    label: 'Zen Retail (Admin)',
    desc: 'Full tenant control for Tenant 2',
  },
];
