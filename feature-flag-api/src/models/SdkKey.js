const mongoose = require('mongoose');
const crypto   = require('crypto');

const SdkKeySchema = new mongoose.Schema({
  key:         { type: String, required: true, unique: true },
  projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  environment: { type: String, enum: ['development', 'staging', 'production'], required: true },
  label:       { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  lastUsedAt:  { type: Date, default: null },
}, { timestamps: true });

SdkKeySchema.index({ projectId: 1, environment: 1 });

// sdk-dev-<32 hex chars>, sdk-stg-..., sdk-prod-...
SdkKeySchema.statics.generate = function (environment) {
  const prefix = { production: 'sdk-prod', staging: 'sdk-stg', development: 'sdk-dev' }[environment] || 'sdk-dev';
  return `${prefix}-${crypto.randomBytes(16).toString('hex')}`;
};

module.exports = mongoose.model('SdkKey', SdkKeySchema);
