const env = require('../config/env');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Multi-Tenant Security Management Platform API',
    version: '1.0.0',
    description: `Production-ready REST API for Multi-Tenant Security Platform.
Enforces strict database-level multi-tenant isolation, Role-Based Access Control (RBAC), JWT token revocation, append-only audit logging, and input sanitization.

### Base Configuration
- **Server Port**: ${env.port}
- **Environment**: ${env.nodeEnv}
- **Database**: ${env.dbName}

### Roles & Access Matrix
- **ADMIN**: Complete authority over tenant data, user management, campaigns, security events, and audit logs.
- **MANAGER**: Full control over campaigns, security events, user assignments, and viewing users.
- **USER**: Read-only view of assigned campaigns and security events. No access to audit logs or user management.`
  },
  servers: [
    {
      url: `http://localhost:${env.port}`,
      description: 'Local Environment Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token obtained from POST /api/auth/login'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Invalid credentials or resource not found.' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenantId: { type: 'string' },
          name: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', example: 'jane@acmebank.com' },
          role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'USER'] },
          isActive: { type: 'boolean', example: true }
        }
      },
      Campaign: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenantId: { type: 'string' },
          name: { type: 'string', example: 'Phishing Awareness Q3' },
          description: { type: 'string', example: 'Quarterly phishing training' },
          status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'] },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          assignedUsers: { type: 'array', items: { type: 'string' } },
          createdBy: { type: 'string' }
        }
      },
      SecurityEvent: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenantId: { type: 'string' },
          type: { type: 'string', example: 'SUSPICIOUS_LOGIN' },
          severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          status: { type: 'string', enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] },
          description: { type: 'string', example: 'Multiple failed logins detected from unmapped IP' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenantId: { type: 'string' },
          actorId: { type: 'string' },
          action: { type: 'string', example: 'CAMPAIGN_CREATE' },
          entityType: { type: 'string', example: 'Campaign' },
          entityId: { type: 'string' },
          metadata: { type: 'object' },
          ip: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  paths: {
    '/api/auth/login': {
      post: {
        summary: 'Authenticate User & Receive JWT',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@acme.com' },
                  password: { type: 'string', example: 'AdminPassword123!' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Authenticated successfully' },
          401: { description: 'Invalid email or password' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        summary: 'Get Authenticated User Context',
        tags: ['Authentication'],
        responses: {
          200: { description: 'Returns req.user loaded from DB' },
          401: { description: 'Unauthenticated' }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        summary: 'Logout & Revoke Token (Bumps tokenVersion)',
        tags: ['Authentication'],
        responses: {
          200: { description: 'Logged out successfully' },
          401: { description: 'Unauthenticated' }
        }
      }
    },
    '/api/users': {
      get: {
        summary: 'List Organization Users (ADMIN, MANAGER)',
        tags: ['Users'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Paginated user list' },
          403: { description: 'Forbidden' }
        }
      },
      post: {
        summary: 'Create User in Organization (ADMIN only)',
        tags: ['Users'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Alice Smith' },
                  email: { type: 'string', example: 'alice@acme.com' },
                  password: { type: 'string', example: 'SecureUserPass123!' },
                  role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'USER'], default: 'USER' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'User created' },
          409: { description: 'Email already registered in tenant' }
        }
      }
    },
    '/api/campaigns': {
      get: {
        summary: 'List Organization Campaigns (ADMIN, MANAGER, USER)',
        tags: ['Campaigns'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Paginated campaign list' }
        }
      },
      post: {
        summary: 'Create Campaign (ADMIN, MANAGER)',
        tags: ['Campaigns'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'startDate', 'endDate'],
                properties: {
                  name: { type: 'string', example: 'Q4 Phishing Drill' },
                  description: { type: 'string', example: 'Simulated phishing test' },
                  status: { type: 'string', enum: ['DRAFT', 'ACTIVE'], default: 'DRAFT' },
                  startDate: { type: 'string', format: 'date-time', example: '2026-10-01T00:00:00.000Z' },
                  endDate: { type: 'string', format: 'date-time', example: '2026-10-31T23:59:59.000Z' },
                  assignedUsers: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Campaign created' },
          400: { description: 'Invalid status transition or end date earlier than start date' }
        }
      }
    },
    '/api/campaigns/{id}': {
      get: {
        summary: 'Get Campaign By ID (Tenant-Scoped)',
        tags: ['Campaigns'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Campaign details' },
          404: { description: 'Campaign not found (or not assigned if USER role)' }
        }
      },
      patch: {
        summary: 'Update Campaign / Status Transition (ADMIN, MANAGER)',
        tags: ['Campaigns'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  status: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
                  startDate: { type: 'string', format: 'date-time' },
                  endDate: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Campaign updated' },
          400: { description: 'Invalid status transition' },
          404: { description: 'Campaign not found' }
        }
      },
      delete: {
        summary: 'Delete Campaign (ADMIN only)',
        tags: ['Campaigns'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Campaign deleted' },
          403: { description: 'Forbidden' },
          404: { description: 'Campaign not found' }
        }
      }
    },
    '/api/campaigns/{id}/users': {
      post: {
        summary: 'Assign User to Campaign (ADMIN, MANAGER)',
        tags: ['Campaigns'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId'],
                properties: {
                  userId: { type: 'string', example: '60d5ecb8b5c9c81234567890' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'User assigned to campaign' },
          400: { description: 'User not found in tenant' },
          404: { description: 'Campaign not found' }
        }
      }
    },
    '/api/campaigns/{id}/users/{userId}': {
      delete: {
        summary: 'Remove User from Campaign (ADMIN, MANAGER)',
        tags: ['Campaigns'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'User removed from campaign' },
          404: { description: 'Campaign not found' }
        }
      }
    },
    '/api/users/{id}': {
      patch: {
        summary: 'Update User Details or Role (ADMIN only)',
        tags: ['Users'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'USER'] },
                  isActive: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'User updated' },
          400: { description: 'Cannot demote last admin' },
          404: { description: 'User not found' }
        }
      },
      delete: {
        summary: 'Delete or Deactivate User (ADMIN only)',
        tags: ['Users'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'User deleted' },
          400: { description: 'Cannot delete last admin' },
          404: { description: 'User not found' }
        }
      }
    },
    '/api/security-events/{id}': {
      get: {
        summary: 'Get Security Event By ID (Tenant-Scoped)',
        tags: ['Security Events'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Security event details' },
          404: { description: 'Event not found' }
        }
      },
      patch: {
        summary: 'Update Security Event Status / Details (ADMIN, MANAGER)',
        tags: ['Security Events'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] },
                  severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                  description: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Security event updated' },
          404: { description: 'Event not found' }
        }
      }
    },
    '/api/security-events': {
      get: {
        summary: 'List Security Events (ADMIN, MANAGER, USER)',
        tags: ['Security Events'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'severity', in: 'query', schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] } }
        ],
        responses: {
          200: { description: 'Paginated security events' }
        }
      },
      post: {
        summary: 'Create Security Event (ADMIN, MANAGER)',
        tags: ['Security Events'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'severity', 'description'],
                properties: {
                  type: { type: 'string', example: 'SUSPICIOUS_LOGIN' },
                  severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                  status: { type: 'string', enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'], default: 'OPEN' },
                  description: { type: 'string', example: 'Multiple failed logins detected from unmapped IP' },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Security event created' },
          400: { description: 'Validation error' }
        }
      }
    },
    '/api/audit-logs': {
      get: {
        summary: 'List Append-Only Audit Logs (ADMIN only)',
        tags: ['Audit Logs'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'action', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Paginated audit logs' },
          403: { description: 'Forbidden for non-admin' }
        }
      }
    },
    '/api/dashboard': {
      get: {
        summary: 'Get Tenant Aggregated Dashboard Stats',
        tags: ['Dashboard'],
        responses: {
          200: { description: 'Returns tenant-scoped metric counts & recent audit log' }
        }
      }
    }
  }
};

module.exports = swaggerDefinition;
