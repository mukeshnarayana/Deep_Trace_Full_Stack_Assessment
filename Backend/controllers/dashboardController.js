const User = require('../models/User');
const Campaign = require('../models/Campaign');
const SecurityEvent = require('../models/SecurityEvent');
const AuditLog = require('../models/AuditLog');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/dashboard
 * Aggregated tenant metrics and recent activity
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    // Campaign match condition depends on user role
    const campaignMatch = { tenantId };
    if (req.user.role === 'USER') {
      campaignMatch.assignedUsers = req.user._id;
    }

    const [
      usersCount,
      campaignsByStatusRaw,
      openEventsCount,
      criticalEventsCount,
      recentAuditLogs
    ] = await Promise.all([
      // 1. Total active users in tenant
      User.countDocuments({ tenantId, isActive: true }),

      // 2. Campaigns grouped by status using database aggregation
      Campaign.aggregate([
        { $match: campaignMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // 3. Open/Investigating security events
      SecurityEvent.countDocuments({
        tenantId,
        status: { $in: ['OPEN', 'INVESTIGATING'] }
      }),

      // 4. Critical security events count
      SecurityEvent.countDocuments({
        tenantId,
        severity: 'CRITICAL'
      }),

      // 5. Last 10 audit logs (Only provided for ADMIN / MANAGER)
      req.user.role !== 'USER'
        ? AuditLog.find({ tenantId })
            .sort({ timestamp: -1 })
            .limit(10)
            .populate('actorId', 'name email role')
        : Promise.resolve([])
    ]);

    // Format campaignsByStatus dictionary
    const campaignsByStatus = {
      DRAFT: 0,
      ACTIVE: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      total: 0
    };

    campaignsByStatusRaw.forEach((item) => {
      if (campaignsByStatus.hasOwnProperty(item._id)) {
        campaignsByStatus[item._id] = item.count;
      }
      campaignsByStatus.total += item.count;
    });

    const stats = {
      tenantId,
      metrics: {
        usersCount,
        campaignsByStatus,
        openEventsCount,
        criticalEventsCount
      },
      recentAuditLogs
    };

    return sendSuccess(res, 200, 'Dashboard statistics loaded successfully', stats);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats
};
