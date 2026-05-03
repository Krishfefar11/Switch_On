const mongoose = require('mongoose');

const FeatureFlagSchema = new mongoose.Schema({
  name:               { type: String, required: true, unique: true, trim: true, lowercase: true },
  description:        { type: String, default: '' },
  enabled:            { type: Boolean, default: false },
  rolloutPercentage:  { type: Number, min: 0, max: 100, default: 0 },
  environment:        { type: String, enum: ['development','staging','production'], default: 'development' },
  version:            { type: Number, default: 1 },    // increments on every update
  deletedAt:          { type: Date, default: null },   // soft delete
  createdBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
 
// Indexes:
FeatureFlagSchema.index({ name: 1, environment: 1 });   // evaluation hot path
FeatureFlagSchema.index({ deletedAt: 1 });              // filter active flags

module.exports = mongoose.model('FeatureFlag', FeatureFlagSchema);
