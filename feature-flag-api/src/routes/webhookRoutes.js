const express  = require('express');
const router   = express.Router();
const { auth } = require('../middlewares/auth');
const rbac     = require('../middlewares/rbac');
const ctrl     = require('../controllers/webhookController');

router.use(auth);

router.get  ('/',                    ctrl.listWebhooks);
router.post ('/',                    rbac(['admin', 'developer']), ctrl.createWebhook);
router.patch('/:id',                 rbac(['admin', 'developer']), ctrl.updateWebhook);
router.delete('/:id',                rbac(['admin']),              ctrl.deleteWebhook);
router.post ('/:id/rotate-secret',   rbac(['admin']),              ctrl.rotateSecret);

module.exports = router;
