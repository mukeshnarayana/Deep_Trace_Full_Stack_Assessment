const User = require('../models/User');
const AppError = require('../utils/appError');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');
const { scopeTenantQuery, sanitizePayload } = require('../utils/tenantScope');
const { logAudit } = require('../services/auditService');

/**
 * GET /api/users
 * Tenant-scoped paginated user list
 */
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query = scopeTenantQuery(req);

    if (search) {
      const safeSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parsedLimit),
      User.countDocuments(query)
    ]);

    return sendPaginated(res, users, parsedPage, parsedLimit, total);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users
 * Create user within tenant (ADMIN only)
 */
const createUser = async (req, res, next) => {
  try {
    // Strip tenantId to enforce current tenant
    const sanitized = sanitizePayload(req.body, true);
    const { name, email, password, role = 'USER' } = sanitized;

    // Check email uniqueness within tenant
    const existingUser = await User.findOne({
      tenantId: req.user.tenantId,
      email: email.toLowerCase()
    });

    if (existingUser) {
      return next(new AppError('A user with this email already exists in your organization.', 409));
    }

    const newUser = await User.create({
      tenantId: req.user.tenantId,
      name,
      email: email.toLowerCase(),
      password,
      role
    });

    await logAudit({
      req,
      action: 'USER_CREATE',
      entityType: 'User',
      entityId: newUser._id,
      metadata: { email: newUser.email, role: newUser.role }
    });

    return sendSuccess(res, 201, 'User created successfully', newUser);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:id
 * Update user details or role (ADMIN only)
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sanitized = sanitizePayload(req.body, true);

    const user = await User.findOne({ _id: id, tenantId: req.user.tenantId });
    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    // Protection for Last Admin: cannot demote or deactivate last active admin
    if (user.role === 'ADMIN') {
      const isDemotion = sanitized.role && sanitized.role !== 'ADMIN';
      const isDeactivation = sanitized.isActive === false;

      if (isDemotion || isDeactivation) {
        const adminCount = await User.countDocuments({
          tenantId: req.user.tenantId,
          role: 'ADMIN',
          isActive: true
        });

        if (adminCount <= 1) {
          return next(
            new AppError('Cannot demote or deactivate the last remaining admin of the organization.', 400)
          );
        }
      }
    }

    let roleChanged = false;
    if (sanitized.role && sanitized.role !== user.role) {
      roleChanged = true;
    }

    // Update fields
    if (sanitized.name) user.name = sanitized.name;
    if (sanitized.role) user.role = sanitized.role;
    if (typeof sanitized.isActive === 'boolean') {
      user.isActive = sanitized.isActive;
      // If user is deactivated, bump tokenVersion to invalidate existing tokens
      if (!user.isActive) {
        user.tokenVersion += 1;
      }
    }

    await user.save();

    await logAudit({
      req,
      action: roleChanged ? 'ROLE_CHANGE' : 'USER_UPDATE',
      entityType: 'User',
      entityId: user._id,
      metadata: { updatedFields: Object.keys(sanitized), newRole: user.role, isActive: user.isActive }
    });

    return sendSuccess(res, 200, 'User updated successfully', user);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id
 * Delete or deactivate user (ADMIN only)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ _id: id, tenantId: req.user.tenantId });
    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    // Protection for Last Admin
    if (user.role === 'ADMIN') {
      const adminCount = await User.countDocuments({
        tenantId: req.user.tenantId,
        role: 'ADMIN',
        isActive: true
      });

      if (adminCount <= 1) {
        return next(
          new AppError('Cannot delete the last remaining admin of the organization.', 400)
        );
      }
    }

    await User.findOneAndDelete({ _id: id, tenantId: req.user.tenantId });

    await logAudit({
      req,
      action: 'USER_DELETE',
      entityType: 'User',
      entityId: id,
      metadata: { deletedEmail: user.email }
    });

    return sendSuccess(res, 200, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
