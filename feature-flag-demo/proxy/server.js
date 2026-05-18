require('dotenv').config();
const path = require('path');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app    = express();
const TARGET = process.env.API_URL || 'http://localhost:5000';

// ── Config endpoint — exposes safe public config to the browser client
app.get('/config.json', (req, res) => {
  res.json({
    dashboardUrl: process.env.DASHBOARD_URL || '',
    environment:  process.env.FLAG_ENVIRONMENT || 'development',
  });
});

app.use(express.static(path.join(__dirname, '../public')));

// Proxy: inject consumer API key, relay SSE stream
app.use('/api', createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader('X-Consumer-Key', process.env.CONSUMER_API_KEY || '');
  }
}));

app.use('/sse', createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  ws: false,
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader('X-Consumer-Key', process.env.CONSUMER_API_KEY || '');
  }
}));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Consumer proxy on :${PORT}`));
