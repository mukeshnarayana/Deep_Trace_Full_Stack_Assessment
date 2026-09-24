const mongoose = require('mongoose');
const tenantPlugin = require('../utils/tenantPlugin');

const securityEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Event type is required'],
      trim: true
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: [true, 'Severity level is required']
    },
    status: {
      type: String,
      enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'],
      default: 'OPEN'
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Apply Tenant Plugin
securityEventSchema.plugin(tenantPlugin);

// Compound indexes
securityEventSchema.index({ tenantId: 1, severity: 1, status: 1 });
securityEventSchema.index({ tenantId: 1, createdAt: -1 });
securityEventSchema.index({ tenantId: 1, timestamp: -1 });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
