const AppError = require('../utils/appError');

/**
 * Authorization middleware to restrict route access based on user role
 * @param  {...String} allowedRoles - List of permitted roles (e.g., 'ADMIN', 'MANAGER')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(`Forbidden: Insufficient permissions. Role '${req.user.role}' is not authorized to access this resource.`, 403)
      );
    }

    next();
  };
};

module.exports = authorize;
