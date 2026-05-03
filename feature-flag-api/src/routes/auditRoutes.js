const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { auth } = require('../middlewares/auth');

router.get('/', auth, auditController.getLogs);

module.exports = router;
