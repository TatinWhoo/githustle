// src/modules/auth/auth.controller.js
const asyncHandler = require('../../middleware/asyncHandler');
const env = require('../../config/env');
const service = require('./auth.service');

const REFRESH_COOKIE_NAME = 'refreshToken';

const cookieOptions = {
  httpOnly: true, // JavaScript on the page can never read this cookie
  secure: env.NODE_ENV === 'production', // HTTPS-only outside local dev
  sameSite: 'strict', // not sent on cross-site requests — blocks CSRF via cookie theft
  maxAge: service.REFRESH_TOKEN_MAX_AGE_MS,
  path: '/api/v1/auth', // only sent back to auth routes, not every request
};

function setRefreshCookie(res, rawRefreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, cookieOptions);
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
}

const register = asyncHandler(async (req, res) => {
  const user = await service.register(req.body);
  res.status(201).json({
    status: 'success',
    message: 'Account created. Check your email to verify your address.',
    data: { user },
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const result = await service.verifyEmail(req.query.token);
  res.status(200).json({
    status: 'success',
    message: 'Email verified. You can now log in.',
    data: result,
  });
});

const resendVerification = asyncHandler(async (req, res) => {
  await service.resendVerification(req.body.email);
  res.status(200).json({
    status: 'success',
    message: 'If that email exists and is unverified, a new link has been sent.',
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, rawRefreshToken } = await service.login({
    email,
    password,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  setRefreshCookie(res, rawRefreshToken);

  res.status(200).json({
    status: 'success',
    data: { user, accessToken },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME];

  const { accessToken, rawRefreshToken: newRawRefreshToken } = await service.refresh({
    rawRefreshToken,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  setRefreshCookie(res, newRawRefreshToken);

  res.status(200).json({
    status: 'success',
    data: { accessToken },
  });
});

const logout = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME];
  await service.logout({ rawRefreshToken });
  clearRefreshCookie(res);

  res.status(200).json({ status: 'success', message: 'Logged out.' });
});

// Demonstrates the full pipeline end-to-end: authenticate middleware
// decodes the access token, then we re-fetch from PostgreSQL rather
// than trusting stale JWT claims for anything beyond identity.
const me = asyncHandler(async (req, res) => {
  const user = await service.getCurrentUser(req.user.id);
  res.status(200).json({ status: 'success', data: { user } });
});

module.exports = { register, verifyEmail, resendVerification, login, refresh, logout, me };
