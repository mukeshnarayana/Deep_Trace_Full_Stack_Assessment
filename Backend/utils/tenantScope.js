/**
 * Builds a query object guaranteed to include tenantId from req.user
 * @param {Object} req - Express request object
 * @param {Object} extraQuery - Additional filter parameters
 * @returns {Object} Query object merged with tenantId
 */
const scopeTenantQuery = (req, extraQuery = {}) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    throw new Error('[TenantScope Error] Request user tenantId is missing.');
  }
  return {
    ...extraQuery,
    tenantId
  };
};

/**
 * Sanitizes incoming request payloads by removing tenantId and role fields
 * unless explicitly allowed (e.g., ADMIN modifying roles).
 * @param {Object} body - Request body or params
 * @param {Boolean} allowRole - Whether role field is allowed
 * @returns {Object} Sanitized copy of object
 */
const sanitizePayload = (body = {}, allowRole = false) => {
  if (typeof body !== 'object' || body === null) return {};
  const copy = { ...body };
  delete copy.tenantId;
  delete copy._id;
  delete copy.id;
  if (!allowRole) {
    delete copy.role;
  }
  return copy;
};

module.exports = {
  scopeTenantQuery,
  sanitizePayload
};
