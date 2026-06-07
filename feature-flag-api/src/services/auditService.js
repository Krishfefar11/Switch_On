const AuditLog = require('../models/AuditLog');

const log = async ({
  userId,
  projectId    = null,
  action,
  resourceType = 'FeatureFlag',
  resourceId,
  resourceName,
  before       = null,
  after        = null,
  ipAddress    = null,
  userAgent    = null,
}) => {
  try {
    await AuditLog.create({
      userId,
      projectId,
      action,
      resourceType,
      resourceId,
      resourceName,
      diff: { before, after },
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // Audit log writes must never be skipped but never block the main response
    console.error('AuditLog writing failed:', error);
  }
};

module.exports = { log };
