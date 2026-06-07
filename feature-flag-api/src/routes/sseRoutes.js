const express     = require('express');
const router      = express.Router();
const { consumerAuth } = require('../middlewares/auth');
const sseService  = require('../services/sseService');
const FeatureFlag = require('../models/FeatureFlag');

router.get('/flags', consumerAuth, async (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering

  const clientId  = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  // For SDK-key clients req.projectId is set by consumerAuth.
  // For JWT dashboard clients it is not set — accept it as a query param instead.
  const projectId = req.projectId ?? req.query.projectId ?? null;

  sseService.addClient(clientId, res, projectId);

  // Send the initial snapshot scoped to this client's project
  try {
    const environment = req.query.environment || 'development';
    const query = { deletedAt: null, environment };
    if (projectId) query.projectId = projectId;

    const flags = await FeatureFlag.find(query).lean();
    res.write(`event: FLAG_SNAPSHOT\ndata: ${JSON.stringify({ flags })}\n\n`);
  } catch (err) {
    console.error('SSE snapshot error:', err.message);
  }

  // Heartbeat every 25 s to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    try { res.write(': keep-alive\n\n'); } catch { clearInterval(heartbeat); }
  }, 25000);

  req.on('close', () => {
    sseService.removeClient(clientId);
    clearInterval(heartbeat);
  });
});

module.exports = router;
