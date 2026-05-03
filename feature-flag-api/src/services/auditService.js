const AuditLog = require('../models/AuditLog');

const log = async ({ userId, action, resourceType = 'FeatureFlag', resourceId, resourceName, before = null, after = null, ipAddress = null, userAgent = null }) => {
  try {
    const diff = { before, after };
    await AuditLog.create({
      userId,
      action,
      resourceType,
      resourceId,
      resourceName,
      diff,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // Audit log writes must never be skipped but never blocks the main response
    console.error('AuditLog writing failed:', error);
  }
};

module.exports = { log };
