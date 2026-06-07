const joi = require('joi');

// ── Placeholder values from .env.example ─────────────────────────────────────
// If someone copies .env.example without replacing values, fail fast.
const PLACEHOLDER_VALUES = new Set([
  'replace_with_64_char_random_hex',
  'replace_with_different_64_char_random_hex',
  'replace_with_48_char_random_hex',
]);

function notPlaceholder(value, helpers) {
  if (PLACEHOLDER_VALUES.has(value)) {
    return helpers.error('any.invalid', {
      message: `${helpers.state.path.join('.')} still contains a placeholder value from .env.example — generate a real secret with: node scripts/generate-secrets.js`,
    });
  }
  return value;
}

const envVarsSchema = joi.object({
  NODE_ENV:                  joi.string().valid('production', 'development', 'staging').default('development'),
  PORT:                      joi.number().default(5000),
  MONGO_URI:                 joi.string().required().description('MongoDB connection string'),

  // JWT secrets — minimum 32 chars in all environments, 64 recommended for production
  JWT_SECRET:                joi.string().required().min(32).custom(notPlaceholder)
                               .description('JWT signing secret — generate with: node scripts/generate-secrets.js'),
  JWT_EXPIRES_IN:            joi.string().default('15m'),

  REFRESH_TOKEN_SECRET:      joi.string().required().min(32).custom(notPlaceholder)
                               .description('Refresh token secret — must differ from JWT_SECRET'),
  REFRESH_TOKEN_EXPIRES_IN:  joi.string().default('7d'),

  ALLOWED_ORIGINS:           joi.string().required().description('CORS allowed origins'),
  CONSUMER_API_KEY:          joi.string().required().description('Legacy SDK key for demo app'),

  // Email — optional, falls back to console logging in dev
  RESEND_API_KEY:            joi.string().optional().description('Resend API key for transactional emails'),
  RESEND_FROM_EMAIL:         joi.string().optional().description('From address for emails'),
  APP_NAME:                  joi.string().default('SwitchOn').description('App name shown in emails'),

  // Frontend URL — used to build password reset links
  FRONTEND_URL:              joi.string().optional().description('Public frontend URL, e.g. https://app.switchon.com'),
}).unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// ── Production-only warnings ──────────────────────────────────────────────────
if (envVars.NODE_ENV === 'production') {
  if (!envVars.RESEND_API_KEY) {
    console.warn('[WARN] RESEND_API_KEY is not set — password reset emails will NOT be sent in production.');
    console.warn('[WARN] Sign up free at https://resend.com and set RESEND_API_KEY to enable email.');
  }
  if (!envVars.FRONTEND_URL) {
    console.warn('[WARN] FRONTEND_URL is not set — password reset links will use request origin as fallback.');
  }
}

module.exports = {
  env:         envVars.NODE_ENV,
  port:        envVars.PORT,
  frontendUrl: envVars.FRONTEND_URL || null,
  mongoose: {
    url: envVars.MONGO_URI,
  },
  jwt: {
    secret:           envVars.JWT_SECRET,
    expiresIn:        envVars.JWT_EXPIRES_IN,
    refreshSecret:    envVars.REFRESH_TOKEN_SECRET,
    refreshExpiresIn: envVars.REFRESH_TOKEN_EXPIRES_IN,
  },
  cors: {
    allowedOrigins: envVars.ALLOWED_ORIGINS.split(','),
  },
  consumerApiKey: envVars.CONSUMER_API_KEY,
  email: {
    resendApiKey:  envVars.RESEND_API_KEY  || null,
    fromEmail:     envVars.RESEND_FROM_EMAIL || 'SwitchOn <noreply@switchon.dev>',
    appName:       envVars.APP_NAME,
  },
};
