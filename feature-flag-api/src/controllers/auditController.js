const AuditLog = require('../models/AuditLog');
const Project  = require('../models/Project');

const getLogs = async (req, res, next) => {
  try {
    const { resourceId, userId, action, from, to, page = 1, limit = 50 } = req.query;

    const query = {};
    if (resourceId) query.resourceId = resourceId;
    if (userId)     query.userId     = userId;
    if (action)     query.action     = action;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to)   query.createdAt.$lte = new Date(to);
    }

    // Scope to the org's projects — viewers only see their own actions
    if (req.user.role === 'viewer') {
      query.userId = req.user._id;
    } else if (req.user.organizationId) {
      // Restrict to project IDs that belong to this org
      const orgProjects = await Project.find({ organizationId: req.user.organizationId }).select('_id').lean();
      const projectIds  = orgProjects.map(p => p._id);
      // Show logs where projectId is in the org's projects OR where userId is in the org
      query.$or = [
        { projectId: { $in: projectIds } },
        { projectId: null }, // legacy logs with no projectId — visible to all (for now)
      ];
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'email')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await AuditLog.countDocuments(query);
    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLogs };
