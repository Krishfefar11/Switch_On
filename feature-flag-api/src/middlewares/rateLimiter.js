'use strict';

const rateLimit = require('express-rate-limit');

// ── Key extractors ────────────────────────────────────────────────────────────

// Extract the SDK key from the request (header or query param for SSE)
function getSdkKey(req) {
  return req.headers['x-consumer-key'] || req.query.consumerKey || null;
}

// Build a stable rate-limit key from the SDK key when present, IP as fallback.
// Prefixed so keys from different strategies never collide in the store.
function sdkOrIpKey(req) {
  const sdk = getSdkKey(req);
  if (sdk) return `sdk:${sdk}`;
  return `ip:${req.ip}`;
}

// ── 1. Global limiter — IP-based ─────────────────────────────────────────────
// Coarse guard on every route. Stops runaway scrapers and vulnerability scans.
const globalLimiter = rateLimit({
  windowMs:        60 * 1000,
  limit:           200,         // 200 req/min per IP across the whole API
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  keyGenerator:    req => `ip:${req.ip}`,
  message:         { error: 'Too many requests, please slow down.' },
});

// ── 2. Evaluate limiter — per SDK key ────────────────────────────────────────
// Primary limiter on /api/evaluate/* and /sse/*
//
// Buckets by SDK key so every customer/tenant gets their own independent quota.
// This means two customers sharing a NAT (same public IP) don't affect each other.
//
// Fallback to IP for requests without an SDK key (e.g. JWT-authenticated admin calls).
const evaluateLimiter = rateLimit({
  windowMs:        60 * 1000,
  limit:           600,         // 600 req/min per SDK key (10 req/sec)
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  keyGenerator:    sdkOrIpKey,
  message:         { error: 'Evaluation rate limit exceeded. Limit: 600 requests/minute per SDK key.' },
  // Skip rate limiting if the key is obviously invalid — bad keys are rejected
  // by consumerAuth before they can consume quota
  skip: req => false,
});

// ── 3. Evaluate IP guard — per IP (DDoS backstop) ───────────────────────────
// Secondary guard on evaluate endpoints only.
// Prevents a single IP from flooding by cycling through many fake SDK keys.
// Set high enough (5× the per-key limit) to never affect legitimate traffic.
const evaluateIpGuard = rateLimit({
  windowMs:        60 * 1000,
  limit:           3000,        // 3000 req/min per IP — only stops floods
  standardHeaders: false,       // don't expose this guard's headers
  legacyHeaders:   false,
  keyGenerator:    req => `ip:${req.ip}`,
  message:         { error: 'Too many requests from your IP. Please contact support.' },
});

// ── 4. Auth limiter — IP-based ───────────────────────────────────────────────
// Must stay IP-based — auth endpoints don't have SDK keys.
// Protects against credential stuffing / brute-force login attempts.
const authLimiter = rateLimit({
  windowMs:        60 * 1000,
  limit:           20,          // 20 req/min per IP (real reset flow needs ~4)
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  keyGenerator:    req => `ip:${req.ip}`,
  message:         { error: 'Too many auth attempts. Please wait a minute and try again.' },
});

module.exports = { global: globalLimiter, evaluateLimiter, evaluateIpGuard, authLimiter };
