const express        = require('express');
const helmet         = require('helmet');
const cors           = require('cors');
const morgan         = require('morgan');
const mongoSanitize  = require('express-mongo-sanitize');
const cookieParser   = require('cookie-parser');
const env            = require('./config/env');
const { global: globalLimiter, evaluateIpGuard } = require('./middlewares/rateLimiter');

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/authRoutes');
const flagRoutes         = require('./routes/flagRoutes');
const userRoutes         = require('./routes/userRoutes');
const auditRoutes        = require('./routes/auditRoutes');
const evaluateRoute      = require('./routes/evaluateRoute');
const sseRoutes          = require('./routes/sseRoutes');
const analyticsRoutes    = require('./routes/analyticsRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const projectRoutes      = require('./routes/projectRoutes');
const invitationRoutes   = require('./routes/invitationRoutes');
const webhookRoutes      = require('./routes/webhookRoutes');

const app = express();

// ── CORS — two separate policies ──────────────────────────────────────────────
//
//  Policy 1: dashboardCors  (strict)
//  ─────────────────────────────────
//  Used by all admin/dashboard API routes (/api/auth, /api/flags, etc.)
//  • Only origins in ALLOWED_ORIGINS are permitted
//  • credentials: true  — allows httpOnly refresh-token cookies
//  • In production: set ALLOWED_ORIGINS=https://app.yourdomain.com
//
//  Policy 2: consumerCors  (open)
//  ────────────────────────────────
//  Used by SDK evaluation endpoints (/api/evaluate/*) and SSE (/sse/*)
//  • Allows ALL origins — customer apps can be on any domain
//  • credentials: false — auth is via X-Consumer-Key header, not cookies
//  • Safe because every request must carry a valid SDK key

const allowedOriginSet = new Set(
  env.cors.allowedOrigins.map(o => o.trim()).filter(Boolean)
);

function dashboardOriginFn(origin, callback) {
  // No origin = same-origin, curl, Postman, server-to-server → always allow
  if (!origin) return callback(null, true);
  if (allowedOriginSet.has(origin)) return callback(null, true);

  // In development, also allow any localhost port for convenience
  if (env.env !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    return callback(null, true);
  }

  const err = new Error(`CORS: origin "${origin}" is not in ALLOWED_ORIGINS`);
  err.status = 403;
  callback(err);
}

const dashboardCors = cors({
  origin:         dashboardOriginFn,
  credentials:    true,
  methods:        ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Project-Id'],
  exposedHeaders: ['X-Total-Count'],
  maxAge:         600,    // browser caches preflight for 10 minutes
});

const consumerCors = cors({
  origin:         '*',    // any domain may call SDK endpoints
  credentials:    false,  // no cookies — auth is X-Consumer-Key header
  methods:        ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Consumer-Key', 'Authorization'],
  maxAge:         86400,  // browser caches preflight for 24 hours
});

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(helmet({
  // Allow EventSource connections from any origin (needed for SDK SSE)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(morgan(env.env === 'production' ? 'combined' : 'dev'));
app.use(globalLimiter);

// ── Health check (no CORS restriction needed) ─────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', uptime: Math.floor(process.uptime()), env: env.env })
);

app.get('/api', (req, res) =>
  res.json({ message: 'SwitchOn Feature Flag API', version: '1.0.0' })
);

// ── Consumer / SDK endpoints — open CORS ─────────────────────────────────────
// These are called by customer applications on any domain.
// Authentication is via X-Consumer-Key header (no cookies).
// Two-layer rate limiting: per-SDK-key (main quota) + per-IP (DDoS guard).
app.use('/api/evaluate', consumerCors, evaluateIpGuard, evaluateRoute);
app.use('/sse',          consumerCors, evaluateIpGuard, sseRoutes);

// ── Dashboard / Admin endpoints — strict CORS ────────────────────────────────
// These are called by the SwitchOn admin dashboard only.
// Authentication uses httpOnly cookies (refresh token) + Bearer JWT.
app.use('/api/auth',          dashboardCors, authRoutes);
app.use('/api/flags',         dashboardCors, flagRoutes);
app.use('/api/users',         dashboardCors, userRoutes);
app.use('/api/audit',         dashboardCors, auditRoutes);
app.use('/api/analytics',     dashboardCors, analyticsRoutes);
app.use('/api/organizations', dashboardCors, organizationRoutes);
app.use('/api/projects',      dashboardCors, projectRoutes);
app.use('/api/invitations',   dashboardCors, invitationRoutes);
app.use('/api/webhooks',      dashboardCors, webhookRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {  // eslint-disable-line no-unused-vars
  // CORS origin errors → 403, not 500
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }

  const status  = err.statusCode || err.status || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';
  if (env.env !== 'production') console.error(err);
  res.status(status).json({ error: message });
});

module.exports = app;
