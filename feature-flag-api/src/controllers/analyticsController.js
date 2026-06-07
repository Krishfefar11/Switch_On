const FlagImpression = require('../models/FlagImpression');
const FeatureFlag    = require('../models/FeatureFlag');

// GET /api/analytics/flags/:id
// Returns impression stats for a single flag over the last N days
const getFlagAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const days   = parseInt(req.query.days) || 7;

    const flag = await FeatureFlag.findOne({ _id: id, deletedAt: null });
    if (!flag) return res.status(404).json({ error: 'Flag not found' });

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Total impressions
    const total = await FlagImpression.countDocuments({ flagId: id, createdAt: { $gte: since } });

    // Enabled vs disabled breakdown
    const enabledCount  = await FlagImpression.countDocuments({ flagId: id, enabled: true,  createdAt: { $gte: since } });
    const disabledCount = total - enabledCount;

    // Unique users
    const uniqueUsers = await FlagImpression.distinct('userId', { flagId: id, createdAt: { $gte: since } });

    // Reason breakdown
    const reasonAgg = await FlagImpression.aggregate([
      { $match: { flagId: flag._id, createdAt: { $gte: since } } },
      { $group: { _id: '$reason', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Variation breakdown (for multivariate flags)
    const variationAgg = await FlagImpression.aggregate([
      { $match: { flagId: flag._id, createdAt: { $gte: since } } },
      { $group: { _id: '$variationIndex', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Daily trend (impressions per day)
    const dailyAgg = await FlagImpression.aggregate([
      { $match: { flagId: flag._id, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total:   { $sum: 1 },
          enabled: { $sum: { $cond: ['$enabled', 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Rule match breakdown
    const ruleMatchCount = await FlagImpression.countDocuments({
      flagId: id, reason: 'RULE_MATCH', createdAt: { $gte: since },
    });

    res.json({
      flagId:   id,
      flagName: flag.name,
      period:   `${days}d`,
      summary: {
        total,
        enabled:     enabledCount,
        disabled:    disabledCount,
        uniqueUsers: uniqueUsers.length,
        ruleMatches: ruleMatchCount,
        enabledPct:  total > 0 ? Math.round((enabledCount / total) * 100) : 0,
      },
      reasons:    reasonAgg.map(r => ({ reason: r._id, count: r.count })),
      variations: variationAgg.map(v => ({
        index: v._id,
        name:  flag.variations?.[v._id]?.name || (v._id === 0 ? 'true' : 'false'),
        count: v.count,
      })),
      daily: dailyAgg.map(d => ({ date: d._id, total: d.total, enabled: d.enabled })),
    });
  } catch (error) { next(error); }
};

// GET /api/analytics/overview
// Summary stats for the dashboard — scoped to the user's projects
const getAnalyticsOverview = async (req, res, next) => {
  try {
    const { environment = 'development' } = req.query;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Scope to the org's projects when the user is authenticated via JWT
    const baseMatch = { environment, createdAt: { $gte: since } };
    if (req.user?.organizationId) {
      const FeatureFlag = require('../models/FeatureFlag');
      const Project = require('../models/Project');
      const orgProjects = await Project.find({ organizationId: req.user.organizationId }).select('_id').lean();
      const projectIds  = orgProjects.map(p => p._id);
      baseMatch.$or = [{ projectId: { $in: projectIds } }, { projectId: null }];
    }

    const totalEvaluations  = await FlagImpression.countDocuments(baseMatch);
    const uniqueUsers       = await FlagImpression.distinct('userId', baseMatch);

    // Top 5 most evaluated flags
    const topFlags = await FlagImpression.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$flagName', count: { $sum: 1 }, enabled: { $sum: { $cond: ['$enabled', 1, 0] } } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Rule matches
    const ruleMatches = await FlagImpression.countDocuments({ ...baseMatch, reason: 'RULE_MATCH' });

    res.json({
      period:          '7d',
      evaluations:     totalEvaluations,   // total impressions logged
      totalEvaluations,                    // alias for backward compat
      uniqueUsers:     uniqueUsers.length,
      ruleMatches,
      flagsEvaluated:  topFlags.length,    // distinct flags that received traffic
      topFlags:        topFlags.map(f => ({ name: f._id, flagName: f._id, count: f.count, enabled: f.enabled })),
    });
  } catch (error) { next(error); }
};

// GET /api/analytics/stale?environment=development&days=30
// Returns flags that are enabled but have received 0 evaluations in the last N days.
// Helps teams identify flags that are safe to clean up.
const getStaleFlagIds = async (req, res, next) => {
  try {
    const { environment = 'development', days = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    // Scope to user's org projects
    const flagQuery = { deletedAt: null, archived: false, environment };
    if (req.user?.organizationId) {
      const Project = require('../models/Project');
      const orgProjects = await Project.find({ organizationId: req.user.organizationId }).select('_id').lean();
      flagQuery.$or = [{ projectId: { $in: orgProjects.map(p => p._id) } }, { projectId: null }];
    }

    // Get all active flags in scope
    const flags = await FeatureFlag.find(flagQuery).select('_id name enabled createdAt environment projectId').lean();
    if (!flags.length) return res.json({ stale: [], count: 0, days: parseInt(days), environment });

    const flagIds = flags.map(f => f._id);

    // Find which flags DID receive evaluations recently
    const recentlyEvaluated = await FlagImpression.distinct('flagId', {
      flagId:    { $in: flagIds },
      createdAt: { $gte: since },
    });

    const recentSet = new Set(recentlyEvaluated.map(id => String(id)));

    // A flag is stale if: enabled + older than N days + no evaluations in last N days
    const stale = flags.filter(f =>
      f.enabled &&
      new Date(f.createdAt) < since &&
      !recentSet.has(String(f._id))
    );

    res.json({
      stale: stale.map(f => ({ id: f._id, name: f.name, environment: f.environment, createdAt: f.createdAt })),
      count: stale.length,
      days:  parseInt(days),
      environment,
    });
  } catch (error) { next(error); }
};

module.exports = { getFlagAnalytics, getAnalyticsOverview, getStaleFlagIds };
