# Multi-Tenant Security Management Platform (Backend)

A production-grade, multi-tenant backend architecture built with **Node.js, Express.js, and MongoDB (Mongoose)**. The platform strictly isolates tenant data, enforces granular Role-Based Access Control (RBAC), provides append-only audit logging, protects against NoSQL injection, and supports interactive API exploration via Swagger UI.

---

## 🚀 Quick Start

### 1. Environment Configuration
Credentials and settings are configured in `.env`. An example template is provided in `.env.example`:
```bash
PORT=5000
MONGODB_URL=mongodb+srv://mukeshnarayanapabolu:mukeshpabolu@cluster0.u2sos3y.mongodb.net/Multi_Tenant?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=Multi_Tenant
JWT_SECRET=super_secret_jwt_key_multi_tenant_security_platform_2026
JWT_EXPIRES_IN=1h
CORS_ORIGIN=*
NODE_ENV=development
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Seed Database with Sample Tenants
Populate the database with 2 tenants (*Acme Bank* and *Zen Retail*), roles (Admin, Manager, User), campaigns, 70+ security events, and audit logs:
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

A static OpenAPI spec file is also available at [`swagger/swagger.json`](file:///c:/Users/mukes/OneDrive/Desktop/assignment/swagger/swagger.json).

### 6. Run Test Suite (Jest + In-Memory MongoDB)
```bash
npm test
```

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
│   ├── db.js             # Mongoose connection with retry & options
│   └── env.js            # Environment loader (.env)
├── controllers/
│   ├── auditLogController.js      # Append-only audit log reader
│   ├── authController.js          # Authentication & token revocation
│   ├── campaignController.js      # Campaign CRUD & transitions
│   ├── dashboardController.js     # Server-side aggregation stats
│   ├── securityEventController.js # Security event management
│   └── userController.js          # Tenant-scoped user management
├── middleware/
│   ├── auth.js           # JWT verification & fresh user loader
│   ├── authorize.js      # Role-Based Access Control (RBAC)
│   ├── errorHandler.js   # Centralized error handler & status mapper
│   └── sanitize.js       # NoSQL operator and tenantId parameter sanitizer
├── models/
│   ├── AuditLog.js       # Append-only activity log
│   ├── Campaign.js       # Security campaigns & assignment
│   ├── SecurityEvent.js  # Incident & alert tracker
│   ├── Tenant.js         # Organization model
│   └── User.js           # Tenant user model (bcrypt 12 rounds)
├── routes/               # Modular Express routers
├── seed/
│   └── seed.js           # Multi-tenant data seed script
├── services/
│   └── auditService.js   # Centralized audit logger
├── swagger/
│   ├── swaggerSpec.js    # OpenAPI 3.0 specification definition
│   └── swagger.json      # Exported OpenAPI schema
├── tests/                # Automated Jest + Supertest suites
│   ├── campaignStatus.test.js
│   ├── rbac.test.js
│   ├── sanitization.test.js
│   ├── tenantIsolation.test.js
│   └── tokenRevocation.test.js
├── utils/
│   ├── apiResponse.js    # Uniform response & pagination format
│   ├── appError.js       # Custom operational error class
│   ├── tenantPlugin.js   # Mongoose multi-tenant schema plugin
│   └── tenantScope.js    # Query scoping & payload stripper
├── app.js                # Express application configuration
└── server.js             # Server entry point
```

---

## 🔒 Multi-Tenant Isolation Strategy

1. **Database Schema Enforcement**:
   - Every collection (except `Tenant`) defines a required, indexed `tenantId: ObjectId`.
   - The Mongoose plugin [`utils/tenantPlugin.js`](file:///c:/Users/mukes/OneDrive/Desktop/assignment/utils/tenantPlugin.js) guarantees `tenantId` indexing and adds query helper `.byTenant()`.
2. **Never Trust Incoming Payloads**:
   - `sanitizeRequest` middleware unconditionally deletes `tenantId` from `req.body`, `req.query`, and `req.params`.
   - The tenant ID is **only** resolved from the authenticated user (`req.user.tenantId`).
3. **Query-Level Scoping**:
   - Lookups and mutations always merge `{ tenantId: req.user.tenantId }`.
   - If a Tenant A user attempts to read, modify, or delete a Tenant B resource by ID, the database returns `null` and the API responds with **`404 Not Found`**, never leaking resource existence.
4. **Cross-Tenant Entity Validation**:
   - When assigning users to a campaign, the backend verifies that the candidate users exist within `req.user.tenantId`.

---

## 🛡 Security Highlights

- **Password Hashing**: Bcrypt with 12 salt rounds; password field omitted from JSON outputs.
- **JWT Revocation**: Tokens contain `userId` and `tokenVersion`. Calling `/api/auth/logout` or deactivating an account increments `tokenVersion`, invalidating tokens.
- **NoSQL Injection Defense**: Recursive in-place sanitizer strips MongoDB operator keys (`$gt`, `$ne`, `.` paths) without triggering Node.js 24 getter conflicts.
- **Rate Limiting**: Strict rate limits on `/api/auth/login` (15 req/15 min) and global limits on `/api/*`.
- **HTTP Hardening**: Helmet security headers, CORS origin whitelisting, and strict request body size caps (10kb).
- **Campaign State Machine**: Enforces strict lifecycle state transitions (`DRAFT` -> `ACTIVE` | `CANCELLED`, `ACTIVE` -> `COMPLETED` | `CANCELLED`).

---

## ❓ Architectural Questions & Answers

### 1. Scaling to 1,000 Tenants / 1 Million Users
- **Compound Indexing with `tenantId` Prefix**: All queries and indexes lead with `{ tenantId: 1, ... }` (e.g., `{ tenantId: 1, status: 1 }`, `{ tenantId: 1, createdAt: -1 }`). This ensures MongoDB uses index prefix compression and isolates query execution to the tenant's index slice.
- **Server-Side Pagination**: Hard caps on limit (max 100) and cursor/skip pagination prevent high-volume memory buffer exhaustion.
- **Sharding on `tenantId`**: Use `tenantId` as the shard key (hashed or ranged). All data for a tenant co-locates on specific shards, avoiding scatter-gather queries across the cluster.
- **Caching Layer**: Redis cluster caching frequently read tenant configuration, active campaign summaries, and permissions with short TTLs and tenant-namespaced keys (`tenant:<id>:...`).
- **Asynchronous Audit Queue**: Offload append-only audit logging and notification events to a message queue (BullMQ / RabbitMQ / Kafka) to keep core API response times sub-millisecond.

### 2. JWT Revocation Strategies
- **`tokenVersion` in Database (Implemented)**: The User model stores an integer `tokenVersion`. On logout, password change, or deactivation, `tokenVersion` increments by 1. Middleware compares token claims with the database record and rejects mismatches.
- **Short-Lived Access Tokens + Refresh Tokens**: Issue access tokens valid for 10–15 minutes and store refresh tokens in database/Redis. When revoking, remove the refresh token family.
- **Distributed Redis Denylist / Bloom Filter**: For immediate token blacklisting without database hits on every request, store revoked JWT JTI (JWT IDs) or signatures in Redis with a TTL equal to the remaining token lifetime.

### 3. Troubleshooting High-Frequency Production 500 Errors
- **Centralized Observability & Error Tracking**: Check Sentry / Datadog / OpenTelemetry to inspect the top crashing stack traces, affected service endpoints, and error frequencies.
- **Correlate with Recent Deployments**: Identify whether the error spike aligns with a new code release, schema migration, or dependency bump. Roll back the deployment immediately if a breaking regression is detected.
- **Database Health & Connection Pool Metrics**: Inspect MongoDB Atlas metrics for connection pool exhaustion, CPU/RAM spikes, unindexed queries causing collection scans (`COLLSCAN`), or replica set failovers.
- **Trace via Correlation / Request IDs**: Utilize `x-request-id` headers passed through ingress/API gateways to trace specific failed requests end-to-end through reverse proxies, application logs, and database logs.
- **Health Checks & Circuit Breaking**: Ensure automated liveness/readiness probes (`/health`) isolate degraded server instances and trigger automatic alerts via Slack/PagerDuty.
