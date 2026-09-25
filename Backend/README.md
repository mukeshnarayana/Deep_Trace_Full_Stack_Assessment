# Multi-Tenant Security Management Platform (Backend)

A production-grade, multi-tenant backend architecture built with **Node.js, Express.js, and PostgreSQL (hosted on Neon Cloud Serverless PostgreSQL)**. The platform strictly isolates tenant data, enforces granular Role-Based Access Control (RBAC), provides append-only audit logging, protects against SQL/NoSQL injection, and supports interactive API exploration via Swagger UI.

---

## 🚀 Quick Start

### 1. Environment Configuration
Credentials and settings are configured in `.env`. An example template is provided in `.env.example`:
```bash
PORT=5000
DATABASE_URL=postgresql://neondb_owner:npg_K1PzFW7tXxLN@ep-calm-smoke-b48escjw-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=super_secret_jwt_key_multi_tenant_security_platform_2026
JWT_EXPIRES_IN=1h
CORS_ORIGIN=*
NODE_ENV=development
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Seed PostgreSQL Database with Sample Tenants
Populate Neon PostgreSQL with 2 tenants (*Acme Bank* and *Zen Retail*), roles (Admin, Manager, User), campaigns, 70+ security events, and audit logs:
```bash
npm run seed
```

### 4. Run Server
```bash
# Production mode
npm start

# Development mode (with live reload)
npm run dev
```

### 5. Interactive Swagger API Testing
Open your browser and navigate to:
**`http://localhost:5000/api-docs`**

A static OpenAPI spec file is also available at [`swagger/swagger.json`](file:///c:/Users/mukes/OneDrive/Desktop/assignment/Backend/swagger/swagger.json).

---

## 👥 Seed Credentials

> **Default Password for all seed accounts:** `Password123!`

| Tenant | Role | Email | Permissions Summary |
| :--- | :--- | :--- | :--- |
| **Acme Bank** | `ADMIN` | `admin@acmebank.com` | Full tenant control, User CRUD, Audit logs |
| **Acme Bank** | `MANAGER` | `manager@acmebank.com` | Campaigns & Events CRUD, View Users, Assign |
| **Acme Bank** | `USER` | `user1@acmebank.com` | View assigned campaigns & security events |
| **Acme Bank** | `USER` | `user2@acmebank.com` | View assigned campaigns & security events |
| **Zen Retail** | `ADMIN` | `admin@zenretail.io` | Full tenant control, User CRUD, Audit logs |
| **Zen Retail** | `MANAGER` | `manager@zenretail.io` | Campaigns & Events CRUD, View Users, Assign |
| **Zen Retail** | `USER` | `user1@zenretail.io` | View assigned campaigns & security events |

---

## 🏛 Architecture & Project Layout

```text
├── config/
│   ├── db.js             # Neon PostgreSQL connection pool & auto DDL schema migration
│   └── env.js            # Environment loader (.env)
├── controllers/
│   ├── auditLogController.js      # Append-only audit log reader
│   ├── authController.js          # Authentication & token revocation
│   ├── campaignController.js      # Campaign CRUD & state transitions
│   ├── dashboardController.js     # Server-side aggregation stats
│   ├── securityEventController.js # Security event management
│   └── userController.js          # Tenant-scoped user management
├── middleware/
│   ├── auth.js           # JWT verification & fresh user loader
│   ├── authorize.js      # Role-Based Access Control (RBAC)
│   ├── errorHandler.js   # Centralized error handler & status mapper
│   └── sanitize.js       # Payload & tenantId parameter sanitizer
├── models/
│   ├── AuditLog.js       # Relational audit log model with JSONB metadata
│   ├── Campaign.js       # Campaign model with JSONB assigned_users & population
│   ├── SecurityEvent.js  # Incident & alert model with batch inserts
│   ├── Tenant.js         # Organization model (UUID primary key)
│   └── User.js           # Tenant user model (bcrypt 12 rounds & token revocation)
├── routes/               # Modular Express routers
├── seed/
│   └── seed.js           # Multi-tenant PostgreSQL data seed script
├── services/
│   └── auditService.js   # Centralized append-only audit logger
├── swagger/
│   ├── swaggerSpec.js    # OpenAPI 3.0 specification definition
│   └── swagger.json      # Exported OpenAPI schema
├── tests/                # Automated Jest + Supertest suites
├── utils/
│   ├── apiResponse.js    # Uniform response & pagination format
│   ├── appError.js       # Custom operational error class
│   ├── tenantPlugin.js   # Multi-tenancy helper utilities
│   └── tenantScope.js    # Query scoping & payload stripper
├── app.js                # Express application configuration
└── server.js             # Server entry point
```

---

## 🗄 PostgreSQL Schema & Tables (Neon Cloud)

The database schema automatically creates the following tables and compound indexes on server startup:

1. **`tenants`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `name`: `VARCHAR(255) NOT NULL`
   - `domain`: `VARCHAR(255)`
   - `status`: `VARCHAR(50) DEFAULT 'ACTIVE'`
   - `created_at` / `updated_at`: `TIMESTAMPTZ DEFAULT NOW()`

2. **`users`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `tenant_id`: `UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
   - `name`: `VARCHAR(255) NOT NULL`
   - `email`: `VARCHAR(255) NOT NULL`
   - `password`: `VARCHAR(255) NOT NULL` (Bcrypt 12 rounds)
   - `role`: `VARCHAR(50) DEFAULT 'USER'` (`ADMIN`, `MANAGER`, `USER`)
   - `is_active`: `BOOLEAN DEFAULT TRUE`
   - `token_version`: `INTEGER DEFAULT 0`
   - `CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)`
   - Index: `idx_users_tenant_created (tenant_id, created_at DESC)`

3. **`campaigns`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `tenant_id`: `UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
   - `name`: `VARCHAR(255) NOT NULL`
   - `description`: `TEXT`
   - `status`: `VARCHAR(50) DEFAULT 'DRAFT'` (`DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED`)
   - `start_date` / `end_date`: `TIMESTAMPTZ NOT NULL`
   - `assigned_users`: `JSONB DEFAULT '[]'::jsonb`
   - `created_by`: `UUID REFERENCES users(id) ON DELETE SET NULL`
   - Indexes: `idx_campaigns_tenant_status (tenant_id, status)`, `idx_campaigns_tenant_created (tenant_id, created_at DESC)`

4. **`security_events`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `tenant_id`: `UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
   - `type`: `VARCHAR(100) NOT NULL`
   - `severity`: `VARCHAR(50) NOT NULL` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
   - `status`: `VARCHAR(50) DEFAULT 'OPEN'` (`OPEN`, `INVESTIGATING`, `RESOLVED`, `CLOSED`)
   - `description`: `TEXT NOT NULL`
   - `timestamp`: `TIMESTAMPTZ DEFAULT NOW()`
   - `created_by`: `UUID REFERENCES users(id) ON DELETE SET NULL`
   - Indexes: `idx_security_events_tenant_status (tenant_id, severity, status)`, `idx_security_events_tenant_timestamp (tenant_id, timestamp DESC)`

5. **`audit_logs`**
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `tenant_id`: `UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
   - `actor_id`: `UUID REFERENCES users(id) ON DELETE SET NULL`
   - `action`: `VARCHAR(100) NOT NULL`
   - `entity_type`: `VARCHAR(100) NOT NULL`
   - `entity_id`: `VARCHAR(255)`
   - `metadata`: `JSONB DEFAULT '{}'::jsonb`
   - `ip`: `VARCHAR(100) DEFAULT 'N/A'`
   - `timestamp`: `TIMESTAMPTZ DEFAULT NOW()`
   - Indexes: `idx_audit_logs_tenant_created (tenant_id, created_at DESC)`, `idx_audit_logs_tenant_action (tenant_id, action)`

---

## 🔒 Multi-Tenant Isolation Strategy

1. **Relational Foreign Key Constraints**:
   - Every table references `tenants(id) ON DELETE CASCADE` with a dedicated UUID foreign key.
   - User emails are constrained to be unique *per tenant* via `UNIQUE (tenant_id, email)`.
2. **Never Trust Incoming Payloads**:
   - `sanitizeRequest` middleware unconditionally deletes `tenantId` from `req.body`, `req.query`, and `req.params`.
   - The tenant ID is **only** resolved from the verified JWT claims and database record (`req.user.tenantId`).
3. **Query-Level Scoping with Parameterized SQL**:
   - Lookups and mutations always merge `WHERE tenant_id = $1`.
   - If a Tenant A user attempts to read, modify, or delete a Tenant B resource by ID, the database returns no rows and the API responds with **`404 Not Found`**, never leaking cross-tenant existence.
4. **Cross-Tenant Entity Validation**:
   - When assigning users to a campaign, the backend queries `WHERE tenant_id = $1 AND id = ANY($2)` to ensure candidate users belong to the calling tenant before persistence.

---

## 🛡 Security Highlights

- **SQL Injection Defense**: Strict use of parameterized prepared queries (`$1, $2, ...`) across all data access operations.
- **Password Hashing**: Bcrypt with 12 salt rounds; password field excluded from all JSON serialization.
- **JWT Revocation**: Tokens contain `userId` and `tokenVersion`. Calling `/api/auth/logout` or deactivating an account increments `token_version` in PostgreSQL, instantly invalidating active tokens.
- **Rate Limiting**: Strict rate limits on `/api/auth/login` (15 req/15 min) and global limits on `/api/*`.
- **HTTP Hardening**: Helmet security headers, CORS origin whitelisting, and strict request body size caps (10kb).
- **Campaign State Machine**: Enforces strict lifecycle state transitions (`DRAFT` -> `ACTIVE` | `CANCELLED`, `ACTIVE` -> `COMPLETED` | `CANCELLED`).

---

## ❓ Architectural Questions & Answers

### 1. Scaling to 1,000 Tenants / 1 Million Users
- **B-Tree Indexing with `tenant_id` Prefix**: All queries and indexes lead with `(tenant_id, ...)` (e.g., `(tenant_id, status)`, `(tenant_id, created_at DESC)`). This keeps index size small per tenant and enables fast index-range scans.
- **Neon Serverless Autoscaling & PgBouncer Pooling**: Neon's connection pooler allows thousands of concurrent clients to connect safely without overwhelming PostgreSQL backend workers.
- **PostgreSQL Table Partitioning**: For enterprise scaling beyond 1M users, partition high-volume tables (`security_events`, `audit_logs`) by `tenant_id` (list/hash partitioning) or date ranges.
- **Server-Side Pagination**: Hard caps on limit (max 100) and `OFFSET` / cursor pagination prevent memory exhaustion.
- **Caching Layer**: Redis cluster caching frequently read tenant configuration, active campaign summaries, and permissions with short TTLs and tenant-namespaced keys (`tenant:<id>:...`).
- **Asynchronous Audit Queue**: Offload append-only audit logging to a message queue (BullMQ / RabbitMQ / Kafka) to keep API response times sub-millisecond.

### 2. JWT Revocation Strategies
- **`token_version` in Database (Implemented)**: The User model stores an integer `token_version`. On logout, password change, or deactivation, `token_version` increments by 1. Auth middleware compares token claims with the database record and rejects mismatches.
- **Short-Lived Access Tokens + Refresh Tokens**: Issue access tokens valid for 10–15 minutes and store refresh tokens in database/Redis. When revoking, remove the refresh token family.
- **Distributed Redis Denylist / Bloom Filter**: For immediate token blacklisting without database hits on every request, store revoked JWT JTI (JWT IDs) or signatures in Redis with a TTL equal to the remaining token lifetime.

### 3. Troubleshooting High-Frequency Production 500 Errors
- **Centralized Observability & Error Tracking**: Check Sentry / Datadog / OpenTelemetry to inspect the top crashing stack traces, affected service endpoints, and error frequencies.
- **Correlate with Recent Deployments**: Identify whether the error spike aligns with a new code release, schema migration, or dependency bump. Roll back the deployment immediately if a breaking regression is detected.
- **Database Health & Connection Pool Metrics**: Inspect Neon Cloud metrics for connection pool exhaustion, CPU/RAM spikes, slow queries, lock contention, or statement timeouts. Use PostgreSQL `EXPLAIN ANALYZE` on suspect queries.
- **Trace via Correlation / Request IDs**: Utilize `x-request-id` headers passed through ingress/API gateways to trace specific failed requests end-to-end through reverse proxies, application logs, and database logs.
- **Health Checks & Circuit Breaking**: Ensure automated liveness/readiness probes (`/health`) isolate degraded server instances and trigger automatic alerts via Slack/PagerDuty.
