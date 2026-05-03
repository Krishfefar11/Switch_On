const express = require('express');
const router = express.Router();
const { consumerAuth } = require('../middlewares/auth');
const sseService = require('../services/sseService');
const FeatureFlag = require('../models/FeatureFlag');

router.get('/flags', consumerAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disables nginx buffering

  const clientId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
  sseService.addClient(clientId, res);

  try {
    const environment = req.query.environment || 'development';
    const flags = await FeatureFlag.find({ deletedAt: null, environment });
    res.write(`event: FLAG_SNAPSHOT\ndata: ${JSON.stringify({ flags })}\n\n`);
  } catch (err) {
    console.error('SSE Error fetching flags snapshot:', err);
  }

  // Heartbeat every 25s
  const intervalId = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  req.on('close', () => {
    sseService.removeClient(clientId);
    clearInterval(intervalId);
  });
});

module.exports = router;
