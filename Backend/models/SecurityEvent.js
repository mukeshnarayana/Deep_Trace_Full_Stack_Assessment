const { query } = require('../config/db');

class SecurityEvent {
  constructor(data = {}) {
    this.id = data.id ? String(data.id) : undefined;
    this._id = this.id;
    this.tenantId = data.tenant_id ? String(data.tenant_id) : (data.tenantId ? String(data.tenantId) : undefined);
    this.type = data.type;
    this.severity = data.severity;
    this.status = data.status || 'OPEN';
    this.description = data.description;
    this.timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
    this.createdBy = data.created_by ? String(data.created_by) : (data.createdBy ? String(data.createdBy) : undefined);
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
      type: this.type,
      severity: this.severity,
      status: this.status,
      description: this.description,
      timestamp: this.timestamp,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  toJSON() {
    return this.toObject();
  }

  async save() {
    const res = await query(
      `UPDATE security_events
       SET type = $1,
           severity = $2,
           status = $3,
           description = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *;`,
      [this.type, this.severity, this.status, this.description, this.id]
    );

    if (res.rows.length > 0) {
      this.updatedAt = res.rows[0].updated_at;
    }
    return this;
  }

  static async create(data) {
    if (Array.isArray(data)) {
      return this.insertMany(data);
    }

    const {
      tenantId,
      type,
      severity,
      status = 'OPEN',
      description,
      timestamp = new Date(),
      createdBy
    } = data;

    const res = await query(
      `INSERT INTO security_events (tenant_id, type, severity, status, description, timestamp, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *;`,
      [
        String(tenantId),
        type,
        severity,
        status,
        description,
        new Date(timestamp),
        createdBy ? String(createdBy) : null
      ]
    );

    return new SecurityEvent(res.rows[0]);
  }

  static async insertMany(events = []) {
    if (!events || events.length === 0) return [];

    const values = [];
    const rowClauses = [];
    let idx = 1;

    for (const ev of events) {
      rowClauses.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, NOW(), NOW())`);
      values.push(
        String(ev.tenantId),
        ev.type,
        ev.severity,
        ev.status || 'OPEN',
        ev.description,
        new Date(ev.timestamp || Date.now()),
        ev.createdBy ? String(ev.createdBy) : null
      );
    }

    const res = await query(
      `INSERT INTO security_events (tenant_id, type, severity, status, description, timestamp, created_by, created_at, updated_at)
       VALUES ${rowClauses.join(', ')}
       RETURNING *;`,
      values
    );

    return res.rows.map((r) => new SecurityEvent(r));
  }

  static findOne(criteria = {}) {
    const builder = {
      _criteria: criteria,
      _populates: [],
      populate(field, fields) {
        this._populates.push({ field, fields });
        return this;
      },
      then(resolve, reject) {
        return this.exec().then(resolve, reject);
      },
      async exec() {
        const { sql, values } = buildEventFilter(this._criteria);
        const res = await query(`SELECT * FROM security_events WHERE ${sql} LIMIT 1;`, values);
        if (res.rows.length === 0) return null;
        const item = new SecurityEvent(res.rows[0]);
        await populateEvents([item], this._populates);
        return item;
      }
    };

    return builder;
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
            const col = key === 'createdAt' ? 'created_at' : (key === 'timestamp' ? 'timestamp' : (key === 'severity' ? 'severity' : (key === 'status' ? 'status' : 'type')));
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
        const { sql, values } = buildEventFilter(this._criteria);
        let idx = values.length + 1;
        const q = `SELECT * FROM security_events WHERE ${sql} ORDER BY ${this._sort} OFFSET $${idx++} LIMIT $${idx++};`;
        values.push(this._skip, this._limit);
        const res = await query(q, values);
        const items = res.rows.map((row) => new SecurityEvent(row));
        await populateEvents(items, this._populates);
        return items;
      }
    };

    return builder;
  }

  static async countDocuments(criteria = {}) {
    const { sql, values } = buildEventFilter(criteria);
    const res = await query(`SELECT COUNT(*)::int AS count FROM security_events WHERE ${sql};`, values);
    return res.rows[0].count;
  }

  static async deleteMany() {
    await query('DELETE FROM security_events CASCADE;');
    return { acknowledged: true };
  }
}

function buildEventFilter(criteria = {}) {
  const clauses = [];
  const values = [];
  let idx = 1;

  if (criteria.tenantId) {
    clauses.push(`tenant_id = $${idx++}`);
    values.push(String(criteria.tenantId));
  }

  if (criteria._id) {
    clauses.push(`id = $${idx++}`);
    values.push(String(criteria._id));
  } else if (criteria.id) {
    clauses.push(`id = $${idx++}`);
    values.push(String(criteria.id));
  }

  if (criteria.severity) {
    clauses.push(`severity = $${idx++}`);
    values.push(criteria.severity);
  }

  if (criteria.status) {
    if (criteria.status.$in && Array.isArray(criteria.status.$in)) {
      clauses.push(`status = ANY($${idx++})`);
      values.push(criteria.status.$in);
    } else {
      clauses.push(`status = $${idx++}`);
      values.push(criteria.status);
    }
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

async function populateEvents(events, populates = []) {
  if (!events || events.length === 0 || !populates || populates.length === 0) return;

  for (const pop of populates) {
    if (pop.field === 'createdBy') {
      const creatorIds = Array.from(new Set(events.map((e) => e.createdBy).filter(Boolean)));
      if (creatorIds.length > 0) {
        const usersRes = await query(
          'SELECT id, name, email FROM users WHERE id = ANY($1::uuid[]);',
          [creatorIds]
        );
        const map = new Map(usersRes.rows.map((u) => [String(u.id), { id: String(u.id), _id: String(u.id), name: u.name, email: u.email }]));
        for (const ev of events) {
          if (ev.createdBy && map.has(String(ev.createdBy))) {
            ev.createdBy = map.get(String(ev.createdBy));
          }
        }
      }
    }
  }
}

module.exports = SecurityEvent;
