const mongoose = require('mongoose');
const tenantPlugin = require('../utils/tenantPlugin');

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT'
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    assignedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user ID is required']
    }
  },
  {
    timestamps: true
  }
);

// Apply Tenant Plugin
campaignSchema.plugin(tenantPlugin);

// Required indexes
campaignSchema.index({ tenantId: 1, status: 1 });
campaignSchema.index({ tenantId: 1, createdAt: -1 });
campaignSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Campaign', campaignSchema);
