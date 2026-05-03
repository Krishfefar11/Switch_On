const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { global: globalLimiter } = require('./middlewares/rateLimiter');

// Routes
const authRoutes = require('./routes/authRoutes');
const flagRoutes = require('./routes/flagRoutes');
const userRoutes = require('./routes/userRoutes');
const auditRoutes = require('./routes/auditRoutes');
const evaluateRoute = require('./routes/evaluateRoute');
const sseRoutes = require('./routes/sseRoutes');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.cors.allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(morgan('combined'));
app.use(globalLimiter);

app.get('/api', (req, res) => {
  res.json({ message: 'Feature Flag API is running!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/flags', flagRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/evaluate', evaluateRoute);
app.use('/sse', sseRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';
  if (env.env !== 'production') console.error(err);
  res.status(status).json({ error: message });
});

module.exports = app;
