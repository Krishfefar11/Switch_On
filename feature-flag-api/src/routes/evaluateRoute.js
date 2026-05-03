const express = require('express');
const router = express.Router();
const evaluateController = require('../controllers/evaluateController');
const { consumerAuth } = require('../middlewares/auth');
const { evaluateLimiter } = require('../middlewares/rateLimiter');

router.get('/:name', evaluateLimiter, consumerAuth, evaluateController.evaluateFlag);

module.exports = router;
