const mongoose = require('mongoose');

/**
 * Mongoose Schema Plugin for Multi-Tenancy
 * Ensures schema has indexed tenantId and adds query helpers.
 */
function tenantPlugin(schema) {
  // Ensure tenantId exists if not already added
  if (!schema.path('tenantId')) {
    schema.add({
      tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
      }
    });
  }

  // Add query helper method: Query.byTenant(tenantId)
  schema.query.byTenant = function(tenantId) {
    if (!tenantId) {
      throw new Error('[TenantPlugin Error] tenantId is required for tenant-scoped queries.');
    }
    return this.where({ tenantId });
  };
}

module.exports = tenantPlugin;
