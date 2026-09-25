const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

class User {
  constructor(data = {}) {
    this.id = data.id ? String(data.id) : undefined;
    this._id = this.id;
    this.tenantId = data.tenant_id ? String(data.tenant_id) : (data.tenantId ? String(data.tenantId) : undefined);
    this.name = data.name;
    this.email = data.email ? data.email.toLowerCase() : undefined;
    this.password = data.password;
    this.role = data.role || 'USER';
    this.isActive = data.is_active !== undefined ? Boolean(data.is_active) : (data.isActive !== undefined ? Boolean(data.isActive) : true);
    this.tokenVersion = data.token_version !== undefined ? Number(data.token_version) : (data.tokenVersion !== undefined ? Number(data.tokenVersion) : 0);
    this.createdAt = data.created_at || data.createdAt || new Date();
    this.updatedAt = data.updated_at || data.updatedAt || new Date();
  }

  toString() {
    return this.id;
  }

  async matchPassword(enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
  }

  async save() {
    let hashedPassword = this.password;
    // If password is not a bcrypt hash (doesn't start with $2a$ or $2b$), hash it
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(12);
      hashedPassword = await bcrypt.hash(this.password, salt);
      this.password = hashedPassword;
    }

    const res = await query(
      `UPDATE users
       SET name = $1,
           email = $2,
           password = $3,
           role = $4,
           is_active = $5,
           token_version = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *;`,
      [this.name, this.email, hashedPassword, this.role, this.isActive, this.tokenVersion, this.id]
    );

    if (res.rows.length > 0) {
      const updated = res.rows[0];
      this.updatedAt = updated.updated_at;
    }
    return this;
  }

  toObject() {
    return {
      id: this.id,
      _id: this._id,
      tenantId: this.tenantId,
      name: this.name,
      email: this.email,
      role: this.role,
      isActive: this.isActive,
      tokenVersion: this.tokenVersion,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  toJSON() {
    return this.toObject();
  }

  static async create(data) {
    const {
      tenantId,
      name,
      email,
      password,
      role = 'USER',
      isActive = true,
      tokenVersion = 0
    } = data;

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const res = await query(
      `INSERT INTO users (tenant_id, name, email, password, role, is_active, token_version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *;`,
      [String(tenantId), name, email.toLowerCase(), hashedPassword, role, isActive, tokenVersion]
    );

    return new User(res.rows[0]);
  }

  static findById(id) {
    const promise = (async () => {
      if (!id) return null;
      const res = await query('SELECT * FROM users WHERE id = $1 LIMIT 1;', [String(id)]);
      if (res.rows.length === 0) return null;
      return new User(res.rows[0]);
    })();

    promise.select = function () {
      return promise;
    };

    return promise;
  }

  static findOne(criteria = {}) {
    const promise = (async () => {
      const { sql, values } = buildUserFilter(criteria);
      const res = await query(`SELECT * FROM users WHERE ${sql} LIMIT 1;`, values);
      if (res.rows.length === 0) return null;
      return new User(res.rows[0]);
    })();

    promise.select = function () {
      return promise;
    };

    return promise;
  }

  static async findByIdAndUpdate(id, update = {}) {
    if (!id) return null;

    if (update.$inc && update.$inc.tokenVersion) {
      const res = await query(
        `UPDATE users
         SET token_version = token_version + $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *;`,
        [update.$inc.tokenVersion, String(id)]
      );
      if (res.rows.length === 0) return null;
      return new User(res.rows[0]);
    }

    // Generic update
    const sets = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(update)) {
      if (key.startsWith('$')) continue;
      const col = key === 'isActive' ? 'is_active' : (key === 'tokenVersion' ? 'token_version' : key);
      sets.push(`${col} = $${idx++}`);
      values.push(val);
    }

    if (sets.length === 0) {
      return this.findById(id);
    }

    values.push(String(id));
    const res = await query(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *;`,
      values
    );

    if (res.rows.length === 0) return null;
    return new User(res.rows[0]);
  }

  static async findOneAndDelete(criteria = {}) {
    const { sql, values } = buildUserFilter(criteria);
    const res = await query(`DELETE FROM users WHERE ${sql} RETURNING *;`, values);
    if (res.rows.length === 0) return null;
    return new User(res.rows[0]);
  }

  static async countDocuments(criteria = {}) {
    const { sql, values } = buildUserFilter(criteria);
    const res = await query(`SELECT COUNT(*)::int AS count FROM users WHERE ${sql};`, values);
    return res.rows[0].count;
  }

  static find(criteria = {}) {
    const builder = {
      _criteria: criteria,
      _sort: 'created_at DESC',
      _skip: 0,
      _limit: 100,
      sort(sortObj) {
        if (sortObj) {
          const parts = [];
          for (const [key, dir] of Object.entries(sortObj)) {
            const col = key === 'createdAt' ? 'created_at' : (key === 'name' ? 'name' : (key === 'email' ? 'email' : key));
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
        const { sql, values } = buildUserFilter(this._criteria);
        let idx = values.length + 1;
        const q = `SELECT * FROM users WHERE ${sql} ORDER BY ${this._sort} OFFSET $${idx++} LIMIT $${idx++};`;
        values.push(this._skip, this._limit);
        const res = await query(q, values);
        return res.rows.map((row) => new User(row));
      }
    };

    return builder;
  }

  static async deleteMany() {
    await query('DELETE FROM users CASCADE;');
    return { acknowledged: true };
  }
}

function buildUserFilter(criteria = {}) {
  const clauses = [];
  const values = [];
  let idx = 1;

  if (criteria.tenantId) {
    clauses.push(`tenant_id = $${idx++}`);
    values.push(String(criteria.tenantId));
  }

  if (criteria.email) {
    clauses.push(`email = $${idx++}`);
    values.push(criteria.email.toLowerCase());
  }

  if (criteria._id) {
    if (criteria._id.$in && Array.isArray(criteria._id.$in)) {
      const ids = criteria._id.$in.map((id) => String(id));
      clauses.push(`id = ANY($${idx++}::uuid[])`);
      values.push(ids);
    } else {
      clauses.push(`id = $${idx++}`);
      values.push(String(criteria._id));
    }
  } else if (criteria.id) {
    clauses.push(`id = $${idx++}`);
    values.push(String(criteria.id));
  }

  if (criteria.role) {
    clauses.push(`role = $${idx++}`);
    values.push(criteria.role);
  }

  if (criteria.isActive !== undefined) {
    clauses.push(`is_active = $${idx++}`);
    values.push(Boolean(criteria.isActive));
  }

  if (criteria.$or && Array.isArray(criteria.$or)) {
    const orClauses = [];
    for (const cond of criteria.$or) {
      if (cond.name && cond.name.$regex) {
        orClauses.push(`name ILIKE $${idx++}`);
        values.push(`%${cond.name.$regex.replace(/\\/g, '')}%`);
      }
      if (cond.email && cond.email.$regex) {
        orClauses.push(`email ILIKE $${idx++}`);
        values.push(`%${cond.email.$regex.replace(/\\/g, '')}%`);
      }
    }
    if (orClauses.length > 0) {
      clauses.push(`(${orClauses.join(' OR ')})`);
    }
  }

  const sql = clauses.length > 0 ? clauses.join(' AND ') : '1=1';
  return { sql, values };
}

module.exports = User;
