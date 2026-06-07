const express  = require('express');
const router   = express.Router();
const { auth } = require('../middlewares/auth');
const rbac     = require('../middlewares/rbac');
const ctrl     = require('../controllers/projectController');

router.use(auth);

router.get('/',    ctrl.getProjects);
router.post('/',   rbac(['admin', 'developer']), ctrl.createProject);
router.get('/:id', ctrl.getProject);
router.patch('/:id', rbac(['admin', 'developer']), ctrl.updateProject);
router.delete('/:id', rbac(['admin']), ctrl.deleteProject);

// SDK key management
router.get('/:id/sdk-keys',                 ctrl.getSdkKeys);
router.post('/:id/sdk-keys',                rbac(['admin', 'developer']), ctrl.createSdkKey);
router.delete('/:id/sdk-keys/:keyId',       rbac(['admin']), ctrl.revokeSdkKey);

module.exports = router;
