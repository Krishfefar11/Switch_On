const FeatureFlag    = require('../models/FeatureFlag');
const FlagImpression = require('../models/FlagImpression');
const User           = require('../models/User');
const { evaluate }   = require('../services/evaluationEngine');

// ── Colour palette assigned by index ─────────────────────────────────
const DEMO_COLOURS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#06b6d4'];

// Derive a display name from an email: "priya.sharma@…" → "Priya Sharma"
function displayName(email) {
  const local = email.split('@')[0];
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Derive initials: "Priya Sharma" → "PS"
function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// Map dashboard role → customer plan tier (used as userAttribute for targeting)
const ROLE_TO_PLAN = { admin: 'enterprise', developer: 'pro', viewer: 'free' };

// ── GET /api/evaluate/_users ──────────────────────────────────────────
// Returns active dashboard users in a safe, demo-ready format.
// Authenticated via consumer key (same as flag evaluation).
const getDemoUsers = async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true }).select('_id email role createdAt').sort({ createdAt: 1 }).lean();

    const formatted = users.map((u, i) => {
      const name = displayName(u.email);
      return {
        id:          u._id.toString(),
        email:       u.email,
        name,
        initials:    initials(name),
        role:        u.role,
        plan:        ROLE_TO_PLAN[u.role] ?? 'free',
        color:       DEMO_COLOURS[i % DEMO_COLOURS.length],
        // A stable short key usable in URL params
        urlKey:      String(i),
      };
    });

    res.json({ users: formatted });
  } catch (error) {
    next(error);
  }
};

const evaluateFlag = async (req, res, next) => {
  try {
    const { name } = req.params;
    const { userId, environment = 'development' } = req.query;

    // userAttributes can be passed as a JSON query param for targeting rules
    // e.g. ?userId=abc&userAttributes={"plan":"premium","country":"IN"}
    let userAttributes = {};
    if (req.query.userAttributes) {
      try { userAttributes = JSON.parse(req.query.userAttributes); } catch {}
    }

    if (!userId) return res.status(400).json({ error: 'userId required' });

    const flag = await FeatureFlag.findOne({ name, environment, deletedAt: null });
    if (!flag) return res.status(404).json({ error: 'Flag not found' });

    const result = evaluate(flag, userId, userAttributes);

    // ── Log impression asynchronously (non-blocking) ──────────────────
    FlagImpression.create({
      flagId:         flag._id,
      flagName:       flag.name,
      userId,
      enabled:        result.enabled,
      value:          result.value,
      reason:         result.reason,
      variationIndex: result.variationIndex,
      environment,
    }).catch(() => {}); // never let analytics errors affect the response

    res.json({
      flagName:          flag.name,
      type:              flag.type,
      enabled:           result.enabled,
      value:             result.value,
      rolloutPercentage: flag.rolloutPercentage,
      result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { evaluateFlag, getDemoUsers };
