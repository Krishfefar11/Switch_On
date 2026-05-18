const express = require('express');
const router = express.Router();
const evaluateController = require('../controllers/evaluateController');
const { consumerAuth } = require('../middlewares/auth');
const { evaluateLimiter } = require('../middlewares/rateLimiter');

// Must be declared before /:name to avoid matching "_users" as a flag name
router.get('/_users', consumerAuth, evaluateController.getDemoUsers);

router.get('/:name', evaluateLimiter, consumerAuth, evaluateController.evaluateFlag);

module.exports = router;
