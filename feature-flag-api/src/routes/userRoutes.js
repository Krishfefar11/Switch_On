const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');

router.use(auth, rbac(['admin']));

router.get('/', userController.getUsers);
router.patch('/:id/role', userController.updateRole);
router.patch('/:id/deactivate', userController.deactivateUser);

module.exports = router;
