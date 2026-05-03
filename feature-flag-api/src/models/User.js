const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['admin','developer','viewer'], default: 'viewer' },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });
 
// Indexes:
UserSchema.index({ email: 1 });          // unique login lookup

module.exports = mongoose.model('User', UserSchema);
