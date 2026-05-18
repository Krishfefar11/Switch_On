const mongoose = require('mongoose');

const VariationSchema = new mongoose.Schema({
  value:       { type: mongoose.Schema.Types.Mixed, required: true },
  name:        { type: String, required: true },
  description: { type: String, default: '' },
}, { _id: false });

const RuleConditionSchema = new mongoose.Schema({
  attribute: { type: String, required: true },
  operator:  {
    type: String, required: true,
    enum: ['equals','notEquals','contains','startsWith','endsWith','greaterThan','lessThan','in','notIn']
  },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { _id: false });

const TargetingRuleSchema = new mongoose.Schema({
  description: { type: String, default: '' },
  conditions:  { type: [RuleConditionSchema], default: [] },
  serve:       { type: Number, default: 0 },
  rollout:     { type: Number, min: 0, max: 100, default: 100 },
}, { _id: false });

const FeatureFlagSchema = new mongoose.Schema({
  name:              { type: String, required: true, unique: true, trim: true, lowercase: true },
  description:       { type: String, default: '' },
  type:              { type: String, enum: ['boolean','string','number','json'], default: 'boolean' },
  enabled:           { type: Boolean, default: false },
  rolloutPercentage: { type: Number, min: 0, max: 100, default: 0 },
  variations:        { type: [VariationSchema], default: [] },
  defaultVariation:  { type: Number, default: 0 },
  rules:             { type: [TargetingRuleSchema], default: [] },
  tags:              { type: [String], default: [] },
  environment:       { type: String, enum: ['development','staging','production'], default: 'development' },
  version:           { type: Number, default: 1 },
  deletedAt:         { type: Date, default: null },
  createdBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

FeatureFlagSchema.index({ name: 1, environment: 1 });
FeatureFlagSchema.index({ deletedAt: 1 });
FeatureFlagSchema.index({ tags: 1 });

module.exports = mongoose.model('FeatureFlag', FeatureFlagSchema);
