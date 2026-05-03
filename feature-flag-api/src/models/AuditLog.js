const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:       { type: String, enum: ['CREATE','UPDATE','DELETE','TOGGLE'], required: true },
  resourceType: { type: String, default: 'FeatureFlag' },
  resourceId:   { type: mongoose.Schema.Types.ObjectId },
  resourceName: { type: String },
  diff:         { type: mongoose.Schema.Types.Mixed },  // { before: {}, after: {} }
  ipAddress:    { type: String },
  userAgent:    { type: String },
}, { timestamps: true });
 
// IMPORTANT: No pre/post hooks that allow updates. Collection is append-only.
// Indexes:
AuditLogSchema.index({ resourceId: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });  // default sort for audit viewer

module.exports = mongoose.model('AuditLog', AuditLogSchema);
