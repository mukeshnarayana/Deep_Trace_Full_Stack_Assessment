const { query } = require('../config/db');

class AuditLog {
  constructor(data = {}) {
    this.id = data.id ? String(data.id) : undefined;
    this._id = this.id;
    this.tenantId = data.tenant_id ? String(data.tenant_id) : (data.tenantId ? String(data.tenantId) : undefined);
    this.actorId = data.actor_id ? String(data.actor_id) : (data.actorId ? String(data.actorId) : null);
    this.action = data.action;
    this.entityType = data.entity_type || data.entityType;
    this.entityId = data.entity_id || data.entityId || null;

    let meta = data.metadata || {};
    if (typeof meta === 'string') {
      try {
        meta = JSON.parse(meta);
      } catch (e) {
        meta = {};
      }
    }
    this.metadata = meta;

    this.ip = data.ip || 'N/A';
    this.timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
    this.createdAt = data.created_at || data.createdAt || new Date();
    this.updatedAt = data.updated_at || data.updatedAt || new Date();
  }

  toString() {
    return this.id;
  }

  toObject() {
    return {
      id: this.id,
      _id: this._id,
      tenantId: this.tenantId,
      actorId: this.actorId,
      action: this.action,
      entityType: this.entityType,
      entityId: this.entityId,
      metadata: this.metadata,
      ip: this.ip,
      timestamp: this.timestamp,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  toJSON() {
    return this.toObject();
  }

  static async create(data) {
    if (Array.isArray(data)) {
      if (data.length === 0) return [];
      const values = [];
      const rowClauses = [];
      let idx = 1;

      for (const item of data) {
        rowClauses.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}::jsonb, $${idx++}, $${idx++}, NOW(), NOW())`);
        values.push(
          String(item.tenantId),
          item.actorId ? String(item.actorId) : null,
          item.action,
          item.entityType,
          item.entityId ? String(item.entityId) : null,
          JSON.stringify(item.metadata || {}),
          item.ip || 'N/A',
          new Date(item.timestamp || Date.now())
        );
      }

      const res = await query(
        `INSERT INTO audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata, ip, timestamp, created_at, updated_at)
         VALUES ${rowClauses.join(', ')}
         RETURNING *;`,
        values
      );

      return res.rows.map((r) => new AuditLog(r));
    }

    const {
      tenantId,
      actorId = null,
      action,
      entityType,
      entityId = null,
      metadata = {},
      ip = 'N/A',
      timestamp = new Date()
    } = data;

    const res = await query(
      `INSERT INTO audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata, ip, timestamp, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, NOW(), NOW())
       RETURNING *;`,
      [
        String(tenantId),
        actorId ? String(actorId) : null,
        action,
        entityType,
        entityId ? String(entityId) : null,
        JSON.stringify(metadata || {}),
        ip,
        new Date(timestamp)
      ]
    );

    return new AuditLog(res.rows[0]);
  }

  static find(criteria = {}) {
    const builder = {
      _criteria: criteria,
      _sort: 'timestamp DESC',
      _skip: 0,
      _limit: 100,
      _populates: [],
      populate(field, fields) {
        this._populates.push({ field, fields });
        return this;
      },
      sort(sortObj) {
        if (sortObj) {
          const parts = [];
          for (const [key, dir] of Object.entries(sortObj)) {
            const col = key === 'createdAt' ? 'created_at' : (key === 'timestamp' ? 'timestamp' : (key === 'action' ? 'action' : 'created_at'));
            const direction = dir === 1 || dir === 'asc' ? 'ASC' : 'DESC';
            parts.push(`${col} ${direction}`);
          }
          if (parts.length > 0) this._sort = parts.join(', ');
        }
        return this;
      },
      skip(n) {
        this._skip = Math.max(0, parseInt(n, 10) || 0);
        return this;
      },
      limit(n) {
        this._limit = Math.max(1, parseInt(n, 10) || 10);
        return this;
      },
      then(resolve, reject) {
        return this.exec().then(resolve, reject);
      },
      async exec() {
        const { sql, values } = buildAuditFilter(this._criteria);
        let idx = values.length + 1;
        const q = `SELECT * FROM audit_logs WHERE ${sql} ORDER BY ${this._sort} OFFSET $${idx++} LIMIT $${idx++};`;
        values.push(this._skip, this._limit);
        const res = await query(q, values);
        const items = res.rows.map((row) => new AuditLog(row));
        await populateAuditLogs(items, this._populates);
        return items;
      }
    };

    return builder;
  }

  static async countDocuments(criteria = {}) {
    const { sql, values } = buildAuditFilter(criteria);
    const res = await query(`SELECT COUNT(*)::int AS count FROM audit_logs WHERE ${sql};`, values);
    return res.rows[0].count;
  }

  static async deleteMany() {
    await query('DELETE FROM audit_logs CASCADE;');
    return { acknowledged: true };
  }
}

function buildAuditFilter(criteria = {}) {
  const clauses = [];
  const values = [];
  let idx = 1;

  if (criteria.tenantId) {
    clauses.push(`tenant_id = $${idx++}`);
    values.push(String(criteria.tenantId));
  }

  if (criteria.action) {
    clauses.push(`action = $${idx++}`);
    values.push(criteria.action);
  }

  if (criteria.actorId) {
    clauses.push(`actor_id = $${idx++}`);
    values.push(String(criteria.actorId));
  }

  if (criteria.timestamp && typeof criteria.timestamp === 'object') {
    if (criteria.timestamp.$gte) {
      clauses.push(`timestamp >= $${idx++}`);
      values.push(new Date(criteria.timestamp.$gte));
    }
    if (criteria.timestamp.$lte) {
      clauses.push(`timestamp <= $${idx++}`);
      values.push(new Date(criteria.timestamp.$lte));
    }
  }

  const sql = clauses.length > 0 ? clauses.join(' AND ') : '1=1';
  return { sql, values };
}

async function populateAuditLogs(logs, populates = []) {
  if (!logs || logs.length === 0 || !populates || populates.length === 0) return;

  for (const pop of populates) {
    if (pop.field === 'actorId') {
      const actorIds = Array.from(new Set(logs.map((l) => l.actorId).filter(Boolean)));
      if (actorIds.length > 0) {
        const usersRes = await query(
          'SELECT id, name, email, role FROM users WHERE id = ANY($1::uuid[]);',
          [actorIds]
        );
        const map = new Map(usersRes.rows.map((u) => [String(u.id), { id: String(u.id), _id: String(u.id), name: u.name, email: u.email, role: u.role }]));
        for (const log of logs) {
          if (log.actorId && map.has(String(log.actorId))) {
            log.actorId = map.get(String(log.actorId));
          }
        }
      }
    }
  }
}

module.exports = AuditLog;
