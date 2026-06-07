const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  slug:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan:    { type: String, enum: ['free', 'pro', 'team'], default: 'free' },
}, { timestamps: true });

OrganizationSchema.index({ ownerId: 1 });

module.exports = mongoose.model('Organization', OrganizationSchema);
