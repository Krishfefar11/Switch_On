const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash:   { type: String, required: true },
  role:           { type: String, enum: ['admin','developer','viewer'], default: 'viewer' },
  isActive:       { type: Boolean, default: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
}, { timestamps: true });
 
// Indexes:
UserSchema.index({ organizationId: 1 });

module.exports = mongoose.model('User', UserSchema);
