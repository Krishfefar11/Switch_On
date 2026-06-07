const mongoose = require('mongoose');
const crypto   = require('crypto');

const FLAG_EVENTS = ['FLAG_CREATED', 'FLAG_UPDATED', 'FLAG_DELETED', 'FLAG_TOGGLED'];

const WebhookSchema = new mongoose.Schema({
  projectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  url:          { type: String, required: true },
  secret:       { type: String, required: true },  // HMAC-SHA256 signing key
  label:        { type: String, default: '' },
  events:       { type: [String], default: FLAG_EVENTS },
  isActive:     { type: Boolean, default: true },
  lastCalledAt: { type: Date,    default: null },
  lastStatus:   { type: Number,  default: null }, // HTTP status of last delivery
}, { timestamps: true });

WebhookSchema.index({ projectId: 1, isActive: 1 });

WebhookSchema.statics.FLAG_EVENTS = FLAG_EVENTS;

WebhookSchema.statics.generateSecret = function () {
  return crypto.randomBytes(24).toString('hex');
};

module.exports = mongoose.model('Webhook', WebhookSchema);
