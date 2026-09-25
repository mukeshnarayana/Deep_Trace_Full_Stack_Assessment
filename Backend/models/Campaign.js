const { query } = require('../config/db');
const User = require('./User');

class Campaign {
  constructor(data = {}) {
    this.id = data.id ? String(data.id) : undefined;
    this._id = this.id;
    this.tenantId = data.tenant_id ? String(data.tenant_id) : (data.tenantId ? String(data.tenantId) : undefined);
    this.name = data.name;
    this.description = data.description || '';
    this.status = data.status || 'DRAFT';
    this.startDate = data.start_date || data.startDate;
    this.endDate = data.end_date || data.endDate;
    
    // Parse assigned_users JSONB
    let users = data.assigned_users || data.assignedUsers || [];
    if (typeof users === 'string') {
      try {
        users = JSON.parse(users);
      } catch (e) {
        users = [];
      }
    }
    this.assignedUsers = Array.isArray(users) ? users.map((u) => (typeof u === 'object' && u ? u : String(u))) : [];

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
      name: this.name,
      description: this.description,
      status: this.status,
      startDate: this.startDate,
      endDate: this.endDate,
      assignedUsers: this.assignedUsers,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  toJSON() {
    return this.toObject();
  }

  async save() {
    // Flatten assignedUsers to array of ID strings for saving
    const userIds = this.assignedUsers.map((u) => (typeof u === 'object' && u ? (u.id || u._id || String(u)) : String(u)));

    const res = await query(
      `UPDATE campaigns
       SET name = $1,
           description = $2,
           status = $3,
           start_date = $4,
           end_date = $5,
           assigned_users = $6::jsonb,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *;`,
      [
        this.name,
        this.description,
        this.status,
        new Date(this.startDate),
        new Date(this.endDate),
        JSON.stringify(userIds),
        this.id
      ]
    );

    if (res.rows.length > 0) {
      this.updatedAt = res.rows[0].updated_at;
    }
    return this;
  }

  static async create(data) {
    const {
      tenantId,
      name,
      description = '',
      status = 'DRAFT',
      startDate,
      endDate,
      assignedUsers = [],
      createdBy
    } = data;

    const userIds = (assignedUsers || []).map((u) => (typeof u === 'object' && u ? (u.id || u._id || String(u)) : String(u)));

    const res = await query(
      `INSERT INTO campaigns (tenant_id, name, description, status, start_date, end_date, assigned_users, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, NOW(), NOW())
       RETURNING *;`,
      [
        String(tenantId),
        name,
        description,
        status,
        new Date(startDate),
        new Date(endDate),
        JSON.stringify(userIds),
        createdBy ? String(createdBy) : null
      ]
    );

    return new Campaign(res.rows[0]);
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
        const { sql, values } = buildCampaignFilter(this._criteria);
        const res = await query(`SELECT * FROM campaigns WHERE ${sql} LIMIT 1;`, values);
        if (res.rows.length === 0) return null;
        const item = new Campaign(res.rows[0]);
        await populateCampaigns([item], this._populates);
        return item;
      }
    };

    return builder;
  }

  static find(criteria = {}) {
    const builder = {
      _criteria: criteria,
      _sort: 'created_at DESC',
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
            const col = key === 'createdAt' ? 'created_at' : (key === 'startDate' ? 'start_date' : (key === 'endDate' ? 'end_date' : key));
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
        const { sql, values } = buildCampaignFilter(this._criteria);
        let idx = values.length + 1;
        const q = `SELECT * FROM campaigns WHERE ${sql} ORDER BY ${this._sort} OFFSET $${idx++} LIMIT $${idx++};`;
        values.push(this._skip, this._limit);
        const res = await query(q, values);
        const campaigns = res.rows.map((row) => new Campaign(row));
        await populateCampaigns(campaigns, this._populates);
        return campaigns;
      }
    };

    return builder;
  }

  static async countDocuments(criteria = {}) {
    const { sql, values } = buildCampaignFilter(criteria);
    const res = await query(`SELECT COUNT(*)::int AS count FROM campaigns WHERE ${sql};`, values);
    return res.rows[0].count;
  }

  static async findOneAndDelete(criteria = {}) {
    const { sql, values } = buildCampaignFilter(criteria);
    const res = await query(`DELETE FROM campaigns WHERE ${sql} RETURNING *;`, values);
    if (res.rows.length === 0) return null;
    return new Campaign(res.rows[0]);
  }

  static async aggregate(pipeline = []) {
    // Pipeline match & group by status
    let matchTenantId = null;
    let matchAssignedUser = null;

    for (const stage of pipeline) {
      if (stage.$match) {
        if (stage.$match.tenantId) matchTenantId = String(stage.$match.tenantId);
        if (stage.$match.assignedUsers) matchAssignedUser = String(stage.$match.assignedUsers);
      }
    }

    const clauses = [];
    const values = [];
    let idx = 1;

    if (matchTenantId) {
      clauses.push(`tenant_id = $${idx++}`);
      values.push(matchTenantId);
    }

    if (matchAssignedUser) {
      clauses.push(`assigned_users @> $${idx++}::jsonb`);
      values.push(JSON.stringify([matchAssignedUser]));
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `SELECT status AS "_id", COUNT(*)::int AS count FROM campaigns ${where} GROUP BY status;`;
    const res = await query(sql, values);
    return res.rows;
  }

  static async deleteMany() {
    await query('DELETE FROM campaigns CASCADE;');
    return { acknowledged: true };
  }
}

function buildCampaignFilter(criteria = {}) {
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

  if (criteria.status) {
    clauses.push(`status = $${idx++}`);
    values.push(criteria.status);
  }

  if (criteria.assignedUsers) {
    clauses.push(`assigned_users @> $${idx++}::jsonb`);
    values.push(JSON.stringify([String(criteria.assignedUsers)]));
  }

  if (criteria.$or && Array.isArray(criteria.$or)) {
    const orClauses = [];
    for (const cond of criteria.$or) {
      if (cond.name && cond.name.$regex) {
        orClauses.push(`name ILIKE $${idx++}`);
        values.push(`%${cond.name.$regex.replace(/\\/g, '')}%`);
      }
      if (cond.description && cond.description.$regex) {
        orClauses.push(`description ILIKE $${idx++}`);
        values.push(`%${cond.description.$regex.replace(/\\/g, '')}%`);
      }
    }
    if (orClauses.length > 0) {
      clauses.push(`(${orClauses.join(' OR ')})`);
    }
  }

  const sql = clauses.length > 0 ? clauses.join(' AND ') : '1=1';
  return { sql, values };
}

async function populateCampaigns(campaigns, populates = []) {
  if (!campaigns || campaigns.length === 0 || !populates || populates.length === 0) return;

  for (const pop of populates) {
    if (pop.field === 'createdBy') {
      const creatorIds = Array.from(new Set(campaigns.map((c) => c.createdBy).filter(Boolean)));
      if (creatorIds.length > 0) {
        const usersRes = await query(
          'SELECT id, name, email FROM users WHERE id = ANY($1::uuid[]);',
          [creatorIds]
        );
        const map = new Map(usersRes.rows.map((u) => [String(u.id), { id: String(u.id), _id: String(u.id), name: u.name, email: u.email }]));
        for (const camp of campaigns) {
          if (camp.createdBy && map.has(String(camp.createdBy))) {
            camp.createdBy = map.get(String(camp.createdBy));
          }
        }
      }
    } else if (pop.field === 'assignedUsers') {
      const allUserIds = new Set();
      for (const camp of campaigns) {
        for (const u of camp.assignedUsers) {
          const uId = typeof u === 'object' && u ? (u.id || u._id) : u;
          if (uId) allUserIds.add(String(uId));
        }
      }

      if (allUserIds.size > 0) {
        const usersRes = await query(
          'SELECT id, name, email, role FROM users WHERE id = ANY($1::uuid[]);',
          [Array.from(allUserIds)]
        );
        const map = new Map(usersRes.rows.map((u) => [String(u.id), { id: String(u.id), _id: String(u.id), name: u.name, email: u.email, role: u.role }]));
        for (const camp of campaigns) {
          camp.assignedUsers = camp.assignedUsers.map((u) => {
            const uId = typeof u === 'object' && u ? (u.id || u._id) : u;
            return map.get(String(uId)) || { id: String(uId), _id: String(uId) };
          });
        }
      }
    }
  }
}

module.exports = Campaign;
