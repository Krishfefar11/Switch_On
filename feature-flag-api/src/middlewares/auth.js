const jwt    = require('jsonwebtoken');
const env    = require('../config/env');
const User   = require('../models/User');
const SdkKey = require('../models/SdkKey');

const auth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

    const decoded = jwt.verify(token, env.jwt.secret);
    const user    = await User.findById(decoded.id).select('-passwordHash');
    if (!user || !user.isActive) return res.status(401).json({ error: 'Unauthorized: Invalid user' });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Consumer auth: SDK key (DB) → env-var fallback → URL token (SSE) → JWT header
const consumerAuth = async (req, res, next) => {
  const apiKey = req.headers['x-consumer-key'] || req.query.consumerKey;

  if (apiKey) {
    // 1. Try DB lookup — sets req.sdkKey + req.projectId for scoped queries
    try {
      const sdkKey = await SdkKey.findOne({ key: apiKey, isActive: true });
      if (sdkKey) {
        SdkKey.updateOne({ _id: sdkKey._id }, { lastUsedAt: new Date() }).catch(() => {});
        req.sdkKey    = sdkKey;
        req.projectId = sdkKey.projectId;
        return next();
      }
    } catch { /* DB error — fall through */ }

    // 2. Legacy env-var key (backward compat for demo app)
    if (apiKey === env.consumerApiKey) {
      return next();
    }

    return res.status(401).json({ error: 'Invalid consumer key' });
  }

  // 3. Short-lived JWT in ?token= query param — used by admin dashboard EventSource
  //    (EventSource cannot send Authorization headers)
  if (req.query.token) {
    try {
      const decoded = jwt.verify(req.query.token, env.jwt.secret);
      const user    = await User.findById(decoded.id).select('-passwordHash');
      if (user && user.isActive) {
        req.user = user;
        return next();
      }
    } catch { /* invalid token */ }
    return res.status(401).json({ error: 'Invalid token' });
  }

  // 4. Fall back to Bearer JWT (standard API calls)
  return auth(req, res, next);
};

module.exports = { auth, consumerAuth };
