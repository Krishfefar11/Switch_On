const express  = require('express');
const router   = express.Router();
const { auth } = require('../middlewares/auth');
const rbac     = require('../middlewares/rbac');
const ctrl     = require('../controllers/invitationController');

// Public — no auth needed to verify or accept an invite
router.get('/:token/verify',  ctrl.verifyToken);
router.post('/:token/accept', ctrl.acceptInvitation);

// Authenticated — must be logged in and an admin to manage invitations
router.use(auth);
router.get('/',      ctrl.listInvitations);
router.post('/',     rbac(['admin']), ctrl.createInvitation);
router.delete('/:id', rbac(['admin']), ctrl.revokeInvitation);

module.exports = router;
