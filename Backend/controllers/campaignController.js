const Campaign = require('../models/Campaign');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');
const { scopeTenantQuery, sanitizePayload } = require('../utils/tenantScope');
const { logAudit } = require('../services/auditService');

// Valid status transition graph
const VALID_TRANSITIONS = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

/**
 * POST /api/campaigns
 * Create a new campaign (ADMIN, MANAGER)
 */
const createCampaign = async (req, res, next) => {
  try {
    const sanitized = sanitizePayload(req.body);
    const { name, description, status = 'DRAFT', startDate, endDate, assignedUsers = [] } = sanitized;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(new AppError('Invalid date format for startDate or endDate.', 400));
    }

    if (end < start) {
      return next(new AppError('endDate cannot be earlier than startDate.', 400));
    }

    // Verify assigned users belong to current tenant
    if (assignedUsers.length > 0) {
      const validUsersCount = await User.countDocuments({
        _id: { $in: assignedUsers },
        tenantId: req.user.tenantId
      });

      if (validUsersCount !== assignedUsers.length) {
        return next(
          new AppError('One or more assigned users do not belong to this organization.', 400)
        );
      }
    }

    const campaign = await Campaign.create({
      tenantId: req.user.tenantId,
      name,
      description,
      status,
      startDate: start,
      endDate: end,
      assignedUsers,
      createdBy: req.user.id
    });

    await logAudit({
      req,
      action: 'CAMPAIGN_CREATE',
      entityType: 'Campaign',
      entityId: campaign._id,
      metadata: { name: campaign.name, status: campaign.status }
    });

    return sendSuccess(res, 201, 'Campaign created successfully', campaign);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/campaigns
 * Get campaigns (ADMIN, MANAGER, USER)
 * Server-side search, status filter, sorting, pagination
 * USER role sees only assigned campaigns
 */
const getCampaigns = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = scopeTenantQuery(req);

    // If USER role, enforce assignedUsers filter
    if (req.user.role === 'USER') {
      query.assignedUsers = req.user.id;
    }

    if (status) {
      query.status = status.toUpperCase();
    }

    if (search) {
      const safeSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    // Allowed sort fields whitelist to prevent injection
    const allowedSortFields = ['createdAt', 'name', 'startDate', 'endDate', 'status'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .sort({ [safeSortBy]: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .populate('assignedUsers', 'name email role')
        .populate('createdBy', 'name email'),
      Campaign.countDocuments(query)
    ]);

    return sendPaginated(res, campaigns, parsedPage, parsedLimit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/campaigns/:id
 */
const getCampaignById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = scopeTenantQuery(req, { _id: id });

    // USER role can only see if assigned
    if (req.user.role === 'USER') {
      query.assignedUsers = req.user.id;
    }

    const campaign = await Campaign.findOne(query)
      .populate('assignedUsers', 'name email role')
      .populate('createdBy', 'name email');

    if (!campaign) {
      return next(new AppError('Campaign not found.', 404));
    }

    return sendSuccess(res, 200, 'Campaign retrieved successfully', campaign);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/campaigns/:id
 * Update campaign details / transition status (ADMIN, MANAGER)
 */
const updateCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sanitized = sanitizePayload(req.body);

    const campaign = await Campaign.findOne({ _id: id, tenantId: req.user.tenantId });
    if (!campaign) {
      return next(new AppError('Campaign not found.', 404));
    }

    // Status transition validation
    if (sanitized.status && sanitized.status !== campaign.status) {
      const targetStatus = sanitized.status.toUpperCase();
      const currentStatus = campaign.status;

      const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
      if (!allowedNext.includes(targetStatus)) {
        return next(
          new AppError(
            `Invalid status transition from ${currentStatus} to ${targetStatus}. Allowed next states from ${currentStatus}: [${allowedNext.join(', ')}]`,
            400
          )
        );
      }
      campaign.status = targetStatus;
    }

    // Date validation
    const newStart = sanitized.startDate ? new Date(sanitized.startDate) : campaign.startDate;
    const newEnd = sanitized.endDate ? new Date(sanitized.endDate) : campaign.endDate;

    if (newEnd < newStart) {
      return next(new AppError('endDate cannot be earlier than startDate.', 400));
    }

    campaign.startDate = newStart;
    campaign.endDate = newEnd;

    if (sanitized.name) campaign.name = sanitized.name;
    if (sanitized.description !== undefined) campaign.description = sanitized.description;

    // Assigned users validation if supplied
    if (Array.isArray(sanitized.assignedUsers)) {
      if (sanitized.assignedUsers.length > 0) {
        const validUsersCount = await User.countDocuments({
          _id: { $in: sanitized.assignedUsers },
          tenantId: req.user.tenantId
        });

        if (validUsersCount !== sanitized.assignedUsers.length) {
          return next(
            new AppError('One or more assigned users do not belong to this organization.', 400)
          );
        }
      }
      campaign.assignedUsers = sanitized.assignedUsers;
    }

    await campaign.save();

    await logAudit({
      req,
      action: 'CAMPAIGN_UPDATE',
      entityType: 'Campaign',
      entityId: campaign._id,
      metadata: { updatedFields: Object.keys(sanitized), status: campaign.status }
    });

    return sendSuccess(res, 200, 'Campaign updated successfully', campaign);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/campaigns/:id
 * Delete campaign (ADMIN only)
 */
const deleteCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOneAndDelete({ _id: id, tenantId: req.user.tenantId });
    if (!campaign) {
      return next(new AppError('Campaign not found.', 404));
    }

    await logAudit({
      req,
      action: 'CAMPAIGN_DELETE',
      entityType: 'Campaign',
      entityId: id,
      metadata: { name: campaign.name }
    });

    return sendSuccess(res, 200, 'Campaign deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/campaigns/:id/users
 * Assign a user to campaign (ADMIN, MANAGER)
 */
const assignUserToCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const campaign = await Campaign.findOne({ _id: id, tenantId: req.user.tenantId });
    if (!campaign) {
      return next(new AppError('Campaign not found.', 404));
    }

    // Verify user belongs to SAME tenant
    const targetUser = await User.findOne({ _id: userId, tenantId: req.user.tenantId });
    if (!targetUser) {
      return next(
        new AppError('User does not exist or does not belong to this organization.', 400)
      );
    }

    // Add if not already assigned
    const userExists = campaign.assignedUsers.some((uId) => uId.toString() === userId);
    if (!userExists) {
      campaign.assignedUsers.push(userId);
      await campaign.save();
    }

    await logAudit({
      req,
      action: 'USER_ASSIGNED',
      entityType: 'Campaign',
      entityId: campaign._id,
      metadata: { userId, campaignName: campaign.name }
    });

    return sendSuccess(res, 200, 'User assigned to campaign successfully', campaign);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/campaigns/:id/users/:userId
 * Remove a user from campaign (ADMIN, MANAGER)
 */
const removeUserFromCampaign = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    const campaign = await Campaign.findOne({ _id: id, tenantId: req.user.tenantId });
    if (!campaign) {
      return next(new AppError('Campaign not found.', 404));
    }

    campaign.assignedUsers = campaign.assignedUsers.filter(
      (uId) => uId.toString() !== userId
    );

    await campaign.save();

    await logAudit({
      req,
      action: 'USER_REMOVED',
      entityType: 'Campaign',
      entityId: campaign._id,
      metadata: { userId, campaignName: campaign.name }
    });

    return sendSuccess(res, 200, 'User removed from campaign successfully', campaign);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  assignUserToCampaign,
  removeUserFromCampaign
};
