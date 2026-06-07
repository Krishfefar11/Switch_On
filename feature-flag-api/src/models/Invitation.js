const mongoose = require('mongoose');
const crypto   = require('crypto');

const InvitationSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  invitedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',         required: true },
  email:          { type: String, lowercase: true, trim: true, default: '' }, // optional hint
  token:          { type: String, required: true, unique: true },
  role:           { type: String, enum: ['admin', 'developer', 'viewer'], default: 'developer' },
  status:         { type: String, enum: ['pending', 'accepted', 'revoked'],    default: 'pending' },
  expiresAt:      { type: Date, required: true },
}, { timestamps: true });

InvitationSchema.index({ organizationId: 1, status: 1 });

InvitationSchema.statics.generate = function () {
  return crypto.randomBytes(24).toString('hex');
};

module.exports = mongoose.model('Invitation', InvitationSchema);
