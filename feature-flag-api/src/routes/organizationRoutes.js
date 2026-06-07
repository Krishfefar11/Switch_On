const express = require('express');
const router  = express.Router();
const { auth } = require('../middlewares/auth');
const rbac    = require('../middlewares/rbac');
const orgCtrl = require('../controllers/organizationController');

router.use(auth);

router.get   ('/me', orgCtrl.getMyOrg);
router.patch ('/me', orgCtrl.updateMyOrg);
router.delete('/me', rbac(['admin']), orgCtrl.deleteMyOrg);

module.exports = router;
