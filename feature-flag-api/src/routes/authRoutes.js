const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const { auth } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');

router.post('/register', authLimiter, authController.register);
router.post('/login',    authLimiter, authController.login);
router.post('/refresh',  authLimiter, authController.refresh);
router.post('/logout',               authController.logout);
router.get   ('/me',      auth,       authController.me);
router.delete('/account', auth,       authController.deleteAccount);

// Password reset — public endpoints (no auth needed)
router.post('/forgot-password',          authLimiter, authController.forgotPassword);
router.post('/reset-password',           authLimiter, authController.resetPassword);
router.get ('/reset-password/verify',                 authController.verifyResetToken);

module.exports = router;
