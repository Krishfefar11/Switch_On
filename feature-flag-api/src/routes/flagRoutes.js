const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/flagController');
const { auth } = require('../middlewares/auth');
const rbac    = require('../middlewares/rbac');

router.use(auth);

// Bulk operation — must be before /:id to avoid route collision
router.post('/bulk', rbac(['admin', 'developer']), ctrl.bulkAction);

// Standard CRUD
router.get('/',    ctrl.getFlags);
router.post('/',   rbac(['admin', 'developer']), ctrl.createFlag);
router.get('/:id', ctrl.getFlagById);
router.patch('/:id', rbac(['admin', 'developer']), ctrl.updateFlag);

// Sub-resource actions
router.patch('/:id/toggle',    rbac(['admin', 'developer']), ctrl.toggleFlag);
router.patch('/:id/archive',   rbac(['admin', 'developer']), ctrl.archiveFlag);
router.patch('/:id/unarchive', rbac(['admin', 'developer']), ctrl.unarchiveFlag);
router.post ('/:id/promote',   rbac(['admin', 'developer']), ctrl.promoteFlag);

router.delete('/:id', rbac(['admin']), ctrl.deleteFlag);

module.exports = router;
