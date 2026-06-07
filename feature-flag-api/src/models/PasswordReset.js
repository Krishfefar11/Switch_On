const mongoose = require('mongoose');
const crypto   = require('crypto');

const PasswordResetSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token:     { type: String, required: true, unique: true },
  expiresAt: { type: Date,   required: true },
  usedAt:    { type: Date,   default: null },
}, { timestamps: true });

// TTL index — MongoDB automatically deletes expired reset documents
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Generate a secure 64-char hex token
PasswordResetSchema.statics.generate = function () {
  return crypto.randomBytes(32).toString('hex'); // 64 hex chars
};

module.exports = mongoose.model('PasswordReset', PasswordResetSchema);
