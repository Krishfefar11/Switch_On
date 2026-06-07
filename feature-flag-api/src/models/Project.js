const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  slug:           { type: String, required: true, lowercase: true, trim: true },
  description:    { type: String, default: '' },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

ProjectSchema.index({ organizationId: 1 });
// slug is unique within an org, not globally
ProjectSchema.index({ organizationId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Project', ProjectSchema);
