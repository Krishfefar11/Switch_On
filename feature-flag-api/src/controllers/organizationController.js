const Organization = require('../models/Organization');
const Project      = require('../models/Project');
const SdkKey       = require('../models/SdkKey');
const FeatureFlag  = require('../models/FeatureFlag');
const Webhook      = require('../models/Webhook');
const Invitation   = require('../models/Invitation');
const User         = require('../models/User');

// GET /api/organizations/me
const getMyOrg = async (req, res, next) => {
  try {
    if (!req.user.organizationId) return res.status(404).json({ error: 'No organization found' });
    const org = await Organization.findById(req.user.organizationId).lean();
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json({ organization: { ...org, id: org._id } });
  } catch (e) { next(e); }
};

// PATCH /api/organizations/me
const updateMyOrg = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!req.user.organizationId) return res.status(404).json({ error: 'No organization found' });

    const org = await Organization.findById(req.user.organizationId);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    if (name) org.name = name;
    await org.save();
    const updated = org.toObject();
    res.json({ organization: { ...updated, id: updated._id } });
  } catch (e) { next(e); }
};

// DELETE /api/organizations/me
// Cascades: projects → SDK keys → flags → webhooks → invitations → member org links
const deleteMyOrg = async (req, res, next) => {
  try {
    if (!req.user.organizationId) return res.status(404).json({ error: 'No organization found' });

    const org = await Organization.findById(req.user.organizationId);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    // Only the owner can delete the org
    if (String(org.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Only the organization owner can delete it' });
    }

    const orgId = org._id;

    // 1. Find all projects
    const projects = await Project.find({ organizationId: orgId }).select('_id').lean();
    const projectIds = projects.map(p => p._id);

    // 2. Cascade delete all project-linked data
    await SdkKey.deleteMany({ projectId: { $in: projectIds } });
    await FeatureFlag.deleteMany({ projectId: { $in: projectIds } });
    await Webhook.deleteMany({ projectId: { $in: projectIds } });
    await Invitation.deleteMany({ organizationId: orgId });
    await Project.deleteMany({ organizationId: orgId });

    // 3. Unlink all org members (don't delete users — they keep their accounts)
    await User.updateMany({ organizationId: orgId }, { $unset: { organizationId: 1 } });

    // 4. Delete the org itself
    await org.deleteOne();

    res.clearCookie('refreshToken');
    res.json({ message: 'Organization and all associated data have been deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyOrg, updateMyOrg, deleteMyOrg };
