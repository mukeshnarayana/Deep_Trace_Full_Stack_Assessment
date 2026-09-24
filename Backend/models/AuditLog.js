const mongoose = require('mongoose');
const tenantPlugin = require('../utils/tenantPlugin');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    action: {
      type: String,
      required: [true, 'Audit log action is required']
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required']
    },
    entityId: {
      type: String,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ip: {
      type: String,
      default: 'N/A'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Apply Tenant Plugin
auditLogSchema.plugin(tenantPlugin);

// Required indexes
auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, action: 1 });
auditLogSchema.index({ tenantId: 1, actorId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
