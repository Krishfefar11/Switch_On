const mongoose = require('mongoose');

// Append-only analytics store — one document per flag evaluation
const FlagImpressionSchema = new mongoose.Schema({
  flagId:         { type: mongoose.Schema.Types.ObjectId, ref: 'FeatureFlag', required: true },
  flagName:       { type: String, required: true },
  userId:         { type: String, required: true },
  enabled:        { type: Boolean, required: true },
  value:          { type: mongoose.Schema.Types.Mixed, default: null },
  reason:         { type: String, default: '' },
  variationIndex: { type: Number, default: null },
  environment:    { type: String, default: 'development' },
}, { timestamps: true, versionKey: false });

FlagImpressionSchema.index({ flagId: 1, createdAt: -1 });
FlagImpressionSchema.index({ flagName: 1, environment: 1, createdAt: -1 });
FlagImpressionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('FlagImpression', FlagImpressionSchema);
