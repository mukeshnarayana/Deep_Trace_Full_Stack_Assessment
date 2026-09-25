const { query } = require('../config/db');

class Tenant {
  constructor(data = {}) {
    this.id = data.id ? String(data.id) : undefined;
    this._id = this.id;
    this.name = data.name;
    this.domain = data.domain || null;
    this.status = data.status || 'ACTIVE';
    this.createdAt = data.created_at || data.createdAt || new Date();
    this.updatedAt = data.updated_at || data.updatedAt || new Date();
  }

  toString() {
    return this.id;
  }

  toJSON() {
    return {
      id: this.id,
      _id: this._id,
      name: this.name,
      domain: this.domain,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static async create(data) {
    const { name, domain = null, status = 'ACTIVE' } = data;
    const res = await query(
      `INSERT INTO tenants (name, domain, status, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *;`,
      [name, domain ? domain.toLowerCase() : null, status]
    );
    return new Tenant(res.rows[0]);
  }

  static findById(id) {
    const promise = (async () => {
      if (!id) return null;
      const res = await query('SELECT * FROM tenants WHERE id = $1 LIMIT 1;', [String(id)]);
      if (res.rows.length === 0) return null;
      return new Tenant(res.rows[0]);
    })();

    // Allow chaining .select(...)
    promise.select = function () {
      return promise;
    };

    return promise;
  }

  static async deleteMany() {
    await query('DELETE FROM tenants CASCADE;');
    return { acknowledged: true };
  }
}

module.exports = Tenant;
