// src/modules/auth/auth.routes.js
const express = require('express');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/authenticate');
const { loginLimiter, registerLimiter } = require('../../middleware/rateLimiter');
const controller = require('./auth.controller');
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} = require('./auth.validation');

const router = express.Router();

router.post('/register', registerLimiter, validate(registerSchema), controller.register);
router.get('/verify-email', validate(verifyEmailSchema, 'query'), controller.verifyEmail);
router.post('/resend-verification', registerLimiter, validate(resendVerificationSchema), controller.resendVerification);
router.post('/login', loginLimiter, validate(loginSchema), controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);

module.exports = router;
