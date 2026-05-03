const joi = require('joi');

const envVarsSchema = joi.object({
  NODE_ENV: joi.string().valid('production', 'development', 'staging').default('development'),
  PORT: joi.number().default(5000),
  MONGO_URI: joi.string().required().description('MongoDB connection string'),
  JWT_SECRET: joi.string().required().description('JWT Secret required to sign'),
  JWT_EXPIRES_IN: joi.string().default('15m'),
  REFRESH_TOKEN_SECRET: joi.string().required().description('Refresh token secret'),
  REFRESH_TOKEN_EXPIRES_IN: joi.string().default('7d'),
  ALLOWED_ORIGINS: joi.string().required().description('CORS allowed origins'),
  CONSUMER_API_KEY: joi.string().required().description('API Key for consumers'),
}).unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGO_URI,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshSecret: envVars.REFRESH_TOKEN_SECRET,
    refreshExpiresIn: envVars.REFRESH_TOKEN_EXPIRES_IN,
  },
  cors: {
    allowedOrigins: envVars.ALLOWED_ORIGINS.split(','),
  },
  consumerApiKey: envVars.CONSUMER_API_KEY,
};
