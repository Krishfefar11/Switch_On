const express = require('express');
const router = express.Router();
const flagController = require('../controllers/flagController');
const { auth } = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');

router.use(auth);

router.get('/', flagController.getFlags);
router.post('/', rbac(['admin', 'developer']), flagController.createFlag);
router.get('/:id', flagController.getFlagById);
router.patch('/:id', rbac(['admin', 'developer']), flagController.updateFlag);
router.patch('/:id/toggle', rbac(['admin', 'developer']), flagController.toggleFlag);
router.delete('/:id', rbac(['admin']), flagController.deleteFlag);

module.exports = router;
