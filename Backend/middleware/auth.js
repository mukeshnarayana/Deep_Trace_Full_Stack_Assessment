const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/appError');

const authenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Authentication required. Missing token.', 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch (err) {
      return next(new AppError('Invalid or expired authentication token.', 401));
    }

    const { userId, tokenVersion } = decoded;

    if (!userId) {
      return next(new AppError('Invalid token payload.', 401));
    }

    // Load user from database to ensure fresh state & tenantId
    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError('User belonging to this token no longer exists.', 401));
    }

    if (!user.isActive) {
      return next(new AppError('User account has been deactivated.', 401));
    }

    // JWT Revocation check
    if (tokenVersion === undefined || tokenVersion !== user.tokenVersion) {
      return next(new AppError('Token has been revoked. Please log in again.', 401));
    }

    // Attach req.user from DB record
    req.user = {
      id: user._id.toString(),
      _id: user._id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      name: user.name,
      tokenVersion: user.tokenVersion
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
