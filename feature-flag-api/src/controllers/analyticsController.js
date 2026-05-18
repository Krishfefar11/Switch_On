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
// Summary stats across all flags for the dashboard
const getAnalyticsOverview = async (req, res, next) => {
  try {
    const { environment = 'development' } = req.query;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const totalEvaluations  = await FlagImpression.countDocuments({ environment, createdAt: { $gte: since } });
    const uniqueUsers       = await FlagImpression.distinct('userId', { environment, createdAt: { $gte: since } });

    // Top 5 most evaluated flags
    const topFlags = await FlagImpression.aggregate([
      { $match: { environment, createdAt: { $gte: since } } },
      { $group: { _id: '$flagName', count: { $sum: 1 }, enabled: { $sum: { $cond: ['$enabled', 1, 0] } } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Rule matches
    const ruleMatches = await FlagImpression.countDocuments({ environment, reason: 'RULE_MATCH', createdAt: { $gte: since } });

    res.json({
      period:       '7d',
      evaluations:  totalEvaluations,
      uniqueUsers:  uniqueUsers.length,
      ruleMatches,
      topFlags:     topFlags.map(f => ({ name: f._id, count: f.count, enabled: f.enabled })),
    });
  } catch (error) { next(error); }
};

module.exports = { getFlagAnalytics, getAnalyticsOverview };
