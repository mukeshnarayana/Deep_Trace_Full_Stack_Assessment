const AuditLog = require('../models/AuditLog');

/**
 * Creates an append-only audit log entry
 */
const logAudit = async ({ req, tenantId, actorId, action, entityType, entityId, metadata = {} }) => {
  try {
    const resolvedTenantId = tenantId || req?.user?.tenantId;
    const resolvedActorId = actorId || req?.user?.id || req?.user?._id || null;
    
    // Extract IP address safely
    let ip = 'N/A';
    if (req) {
      ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'N/A';
      if (typeof ip === 'string' && ip.includes(',')) {
        ip = ip.split(',')[0].trim();
      }
    }

    // Sanitize metadata to remove any potential sensitive fields
    const sanitizedMetadata = { ...metadata };
    delete sanitizedMetadata.password;
    delete sanitizedMetadata.token;
    delete sanitizedMetadata.secret;
    delete sanitizedMetadata.hash;

    if (!resolvedTenantId) {
      console.warn('[Audit Log Warning] Attempted to create audit log without tenantId');
      return null;
    }

    const auditEntry = await AuditLog.create({
      tenantId: resolvedTenantId,
      actorId: resolvedActorId,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      metadata: sanitizedMetadata,
      ip
    });

    return auditEntry;
  } catch (error) {
    console.error('[Audit Log Error] Failed to persist audit log:', error.message);
    // Audit log failure should not crash the main business operation, but log error
    return null;
  }
};

module.exports = {
  logAudit
};
