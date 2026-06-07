const express    = require('express');
const router     = express.Router();
const { getFlagAnalytics, getAnalyticsOverview, getStaleFlagIds } = require('../controllers/analyticsController');
const { auth }   = require('../middlewares/auth');

router.use(auth);

router.get('/overview',       getAnalyticsOverview);
router.get('/stale',          getStaleFlagIds);
router.get('/flags/:id',      getFlagAnalytics);

module.exports = router;
