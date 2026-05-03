const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 200,          // 200 req/min global
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const evaluateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,          // 100 req/min on /evaluate
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,           // 10 req/min on /auth
});

module.exports = { global: globalLimiter, evaluateLimiter, authLimiter };
