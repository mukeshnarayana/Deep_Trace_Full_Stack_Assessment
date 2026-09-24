const SecurityEvent = require('../models/SecurityEvent');
const AppError = require('../utils/appError');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');
const { scopeTenantQuery, sanitizePayload } = require('../utils/tenantScope');
const { logAudit } = require('../services/auditService');

/**
 * POST /api/security-events
 * Create security event (ADMIN, MANAGER)
 */
const createSecurityEvent = async (req, res, next) => {
  try {
    const sanitized = sanitizePayload(req.body);
    const { type, severity, status = 'OPEN', description, timestamp } = sanitized;

    const event = await SecurityEvent.create({
      tenantId: req.user.tenantId,
      type,
      severity,
      status,
      description,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      createdBy: req.user.id
    });

    await logAudit({
      req,
      action: 'SECURITY_EVENT_CREATE',
      entityType: 'SecurityEvent',
      entityId: event._id,
      metadata: { type: event.type, severity: event.severity }
    });

    return sendSuccess(res, 201, 'Security event created successfully', event);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/security-events
 * Server-side filtered, sorted, paginated security events
 */
const getSecurityEvents = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      severity,
      status,
      startDate,
      endDate,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    const query = scopeTenantQuery(req);

    if (severity) {
      query.severity = severity.toUpperCase();
    }

    if (status) {
      query.status = status.toUpperCase();
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const allowedSortFields = ['timestamp', 'createdAt', 'severity', 'status', 'type'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'timestamp';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const [events, total] = await Promise.all([
      SecurityEvent.find(query)
        .sort({ [safeSortBy]: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .populate('createdBy', 'name email'),
      SecurityEvent.countDocuments(query)
    ]);

    return sendPaginated(res, events, parsedPage, parsedLimit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/security-events/:id
 */
const getSecurityEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await SecurityEvent.findOne({
      _id: id,
      tenantId: req.user.tenantId
    }).populate('createdBy', 'name email');

    if (!event) {
      return next(new AppError('Security event not found.', 404));
    }

    return sendSuccess(res, 200, 'Security event retrieved successfully', event);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/security-events/:id
 * Update security event status or details (ADMIN, MANAGER)
 */
const updateSecurityEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sanitized = sanitizePayload(req.body);

    const event = await SecurityEvent.findOne({
      _id: id,
      tenantId: req.user.tenantId
    });

    if (!event) {
      return next(new AppError('Security event not found.', 404));
    }

    if (sanitized.status) event.status = sanitized.status.toUpperCase();
    if (sanitized.severity) event.severity = sanitized.severity.toUpperCase();
    if (sanitized.description) event.description = sanitized.description;
    if (sanitized.type) event.type = sanitized.type;

    await event.save();

    await logAudit({
      req,
      action: 'SECURITY_EVENT_UPDATE',
      entityType: 'SecurityEvent',
      entityId: event._id,
      metadata: { newStatus: event.status, updatedFields: Object.keys(sanitized) }
    });

    return sendSuccess(res, 200, 'Security event updated successfully', event);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSecurityEvent,
  getSecurityEvents,
  getSecurityEventById,
  updateSecurityEvent
};
