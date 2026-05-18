const express    = require('express');
const router     = express.Router();
const { getFlagAnalytics, getAnalyticsOverview } = require('../controllers/analyticsController');
const { auth }   = require('../middlewares/auth');

router.use(auth);

router.get('/overview',       getAnalyticsOverview);
router.get('/flags/:id',      getFlagAnalytics);

module.exports = router;
