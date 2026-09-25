const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]', err);
});

/**
 * Execute parameterized query
 */
const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL === 'true') {
    console.log('[SQL]', { text, params, duration: `${duration}ms`, rows: res.rowCount });
  }
  return res;
};

/**
 * Initialize Database Tables and Indexes
 */
const initSchema = async () => {
  const ddl = `
    -- Tenants table
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      domain VARCHAR(255),
      status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'USER',
      is_active BOOLEAN DEFAULT TRUE,
      token_version INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
    );

    -- Campaigns table
    CREATE TABLE IF NOT EXISTS campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'DRAFT',
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      assigned_users JSONB DEFAULT '[]'::jsonb,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Security Events table
    CREATE TABLE IF NOT EXISTS security_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      severity VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'OPEN',
      description TEXT NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Audit Logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id VARCHAR(255),
      metadata JSONB DEFAULT '{}'::jsonb,
      ip VARCHAR(100) DEFAULT 'N/A',
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_users_tenant_created ON users(tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status ON campaigns(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_created ON campaigns(tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_security_events_tenant_status ON security_events(tenant_id, severity, status);
    CREATE INDEX IF NOT EXISTS idx_security_events_tenant_created ON security_events(tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_security_events_tenant_timestamp ON security_events(tenant_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_action ON audit_logs(tenant_id, action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_actor ON audit_logs(tenant_id, actor_id);
  `;

  await pool.query(ddl);
};

const connectDB = async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT current_database(), current_user, version()');
    client.release();

    console.log(`[Database] PostgreSQL (Neon) Connected: database=${res.rows[0].current_database}, user=${res.rows[0].current_user}`);
    
    // Automatically initialize schema tables and indexes
    await initSchema();
    console.log('[Database] PostgreSQL Schema Verified & Initialized.');

    return pool;
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.pool = pool;
module.exports.query = query;
