const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const AppError = require('../utils/appError');
const { sendSuccess } = require('../utils/apiResponse');
const { logAudit } = require('../services/auditService');

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      if (user) {
        await logAudit({
          req,
          tenantId: user.tenantId,
          actorId: user._id,
          action: 'LOGIN_FAILED',
          entityType: 'Auth',
          entityId: user._id,
          metadata: { email, reason: 'Invalid password' }
        });
      }
      return next(new AppError('Invalid email or password.', 401));
    }

    if (!user.isActive) {
      await logAudit({
        req,
        tenantId: user.tenantId,
        actorId: user._id,
        action: 'LOGIN_FAILED',
        entityType: 'Auth',
        entityId: user._id,
        metadata: { email, reason: 'Account deactivated' }
      });
      return next(new AppError('Account is deactivated. Contact administrator.', 401));
    }

    // Sign JWT token containing only userId and tokenVersion
    const token = jwt.sign(
      {
        userId: user._id,
        tokenVersion: user.tokenVersion
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    await logAudit({
      req,
      tenantId: user.tenantId,
      actorId: user._id,
      action: 'LOGIN_SUCCESS',
      entityType: 'Auth',
      entityId: user._id,
      metadata: { email }
    });

    const tenant = await Tenant.findById(user.tenantId).select('name domain');

    return sendSuccess(res, 200, 'Login successful', {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenant: tenant ? { id: tenant._id.toString(), name: tenant.name, domain: tenant.domain } : { id: user.tenantId.toString(), name: 'Default Tenant' }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.user.tenantId).select('name domain');
    const userPayload = {
      ...req.user,
      tenant: tenant ? { id: tenant._id.toString(), name: tenant.name, domain: tenant.domain } : { id: req.user.tenantId.toString(), name: 'Default Tenant' }
    };
    return sendSuccess(res, 200, 'Current user profile retrieved', { user: userPayload });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    // Bump tokenVersion to invalidate current JWT
    await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });

    await logAudit({
      req,
      action: 'LOGOUT',
      entityType: 'Auth',
      entityId: req.user.id
    });

    return sendSuccess(res, 200, 'Logged out successfully. Token revoked.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  logout
};
