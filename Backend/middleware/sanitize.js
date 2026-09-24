/**
 * Recursively removes keys starting with '$' or containing '.' to prevent NoSQL injection
 * Mutates in-place so it does not reassign req.query (which is a getter in Node 24)
 */
const sanitizeNoSQL = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeNoSQL(obj[key]);
    }
  }
};

/**
 * Middleware to enforce multi-tenancy parameter security & prevent NoSQL injection.
 * Strips tenantId from req.body, req.query, and req.params on ALL requests.
 * Recursively removes Mongo query operators like $gt, $ne, etc.
 */
const sanitizeRequest = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    delete req.body.tenantId;
    delete req.body._id;
    sanitizeNoSQL(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    delete req.query.tenantId;
    sanitizeNoSQL(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    delete req.params.tenantId;
    sanitizeNoSQL(req.params);
  }

  next();
};

module.exports = {
  sanitizeRequest,
  stripForbiddenFields: sanitizeRequest
};
