const express = require('express');
const router = express.Router();
const evaluateController = require('../controllers/evaluateController');
const { consumerAuth } = require('../middlewares/auth');
const { evaluateLimiter } = require('../middlewares/rateLimiter');

// All evaluate endpoints are rate-limited per SDK key.
// Static routes must come before /:name to avoid route collisions.
router.get ('/_users', evaluateLimiter, consumerAuth, evaluateController.getDemoUsers);
router.get ('/_all',   evaluateLimiter, consumerAuth, evaluateController.evaluateAll);
router.post('/batch',  evaluateLimiter, consumerAuth, evaluateController.evaluateBatch);
router.get ('/:name',  evaluateLimiter, consumerAuth, evaluateController.evaluateFlag);

module.exports = router;
