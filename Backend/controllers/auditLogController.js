const AuditLog = require('../models/AuditLog');
const { sendPaginated } = require('../utils/apiResponse');
const { scopeTenantQuery } = require('../utils/tenantScope');

/**
 * GET /api/audit-logs
 * Read-only audit log list (ADMIN only)
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, action, actorId, startDate, endDate } = req.query;

    const query = scopeTenantQuery(req);

    if (action) {
      query.action = action.toUpperCase();
    }

    if (actorId) {
      query.actorId = actorId;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate('actorId', 'name email role'),
      AuditLog.countDocuments(query)
    ]);

    return sendPaginated(res, logs, parsedPage, parsedLimit, total);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs
};
