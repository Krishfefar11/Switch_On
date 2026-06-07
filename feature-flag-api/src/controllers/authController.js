const User          = require('../models/User');
const Organization  = require('../models/Organization');
const Project       = require('../models/Project');
const SdkKey        = require('../models/SdkKey');
const PasswordReset = require('../models/PasswordReset');
const bcrypt        = require('bcryptjs');
const jwt           = require('jsonwebtoken');
const env           = require('../config/env');
const auditService  = require('../services/auditService');
const emailService  = require('../services/emailService');

// Derives a URL-safe slug from an email local part
function emailToSlug(email) {
  const local = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${local}-${Date.now().toString(36)}`;
}

// Creates Organization + default Project + 3 SdkKeys in one go
async function provisionTenant(user) {
  const org = await Organization.create({
    name:    `${user.email.split('@')[0]}'s Org`,
    slug:    emailToSlug(user.email),
    ownerId: user._id,
    plan:    'free',
  });

  const project = await Project.create({
    name:           'My Project',
    slug:           'my-project',
    organizationId: org._id,
  });

  const environments = ['development', 'staging', 'production'];
  const sdkKeys = await Promise.all(
    environments.map(e => SdkKey.create({
      key:         SdkKey.generate(e),
      projectId:   project._id,
      environment: e,
      label:       `Default ${e} key`,
    }))
  );

  // Link user to the new org
  user.organizationId = org._id;
  await user.save();

  return { org, project, sdkKeys };
}

function issueTokens(userId) {
  const accessToken  = jwt.sign({ id: userId }, env.jwt.secret,        { expiresIn: env.jwt.expiresIn });
  const refreshToken = jwt.sign({ id: userId }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });
  return { accessToken, refreshToken };
}

const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Self-registered users are always admin of their own org.
    // Invited-user flows (future) will set role at invite time.
    const role = 'admin';

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, role });

    const { org, project, sdkKeys } = await provisionTenant(user);

    const { accessToken, refreshToken } = issueTokens(user._id);
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict' });

    await auditService.log({
      userId:       user._id,
      action:       'CREATE',
      resourceType: 'User',
      resourceId:   user._id,
      resourceName: user.email,
    });

    res.status(201).json({
      accessToken,
      organization: { id: org._id, name: org.name, slug: org.slug, plan: org.plan },
      project:      { id: project._id, name: project.name, slug: project.slug },
      sdkKeys:      sdkKeys.map(k => ({ id: k._id, key: k.key, environment: k.environment, label: k.label })),
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const { accessToken, refreshToken } = issueTokens(user._id);
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict' });
    res.json({ accessToken });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    const decoded = jwt.verify(token, env.jwt.refreshSecret);
    const user    = await User.findById(decoded.id);
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid user' });

    const accessToken = jwt.sign({ id: user._id }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

const logout = (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
};

const me = async (req, res, next) => {
  try {
    const user = req.user;
    let org     = null;
    let project = null;
    let sdkKeys = [];

    if (user.organizationId) {
      org = await Organization.findById(user.organizationId).lean();
      // Return the first project (the one they work in by default)
      project = await Project.findOne({ organizationId: user.organizationId }).lean();
      if (project) {
        sdkKeys = await SdkKey.find({ projectId: project._id, isActive: true }).lean();
      }
    }

    res.json({
      id:           user._id,
      email:        user.email,
      role:         user.role,
      createdAt:    user.createdAt,
      organization: org     ? { id: org._id,     name: org.name,     slug: org.slug,     plan: org.plan } : null,
      project:      project ? { id: project._id, name: project.name, slug: project.slug }                 : null,
      sdkKeys:      sdkKeys.map(k => ({ id: k._id, key: k.key, environment: k.environment, label: k.label })),
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/auth/account  — delete own account
const deleteAccount = async (req, res, next) => {
  try {
    const user = req.user;

    // If user owns an org, refuse until they transfer or delete the org first
    if (user.organizationId) {
      const org = await Organization.findById(user.organizationId);
      if (org && String(org.ownerId) === String(user._id)) {
        return res.status(400).json({
          error: 'You own an organization. Delete the organization first via DELETE /api/organizations/me',
        });
      }
    }

    // Remove user from the DB and clear session
    await User.findByIdAndDelete(user._id);
    res.clearCookie('refreshToken');
    res.json({ message: 'Account deleted' });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
// Accepts an email, generates a reset token, sends the reset link.
// Always responds 200 so we don't reveal whether the email exists.
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond the same way regardless of whether email exists (security)
    if (!user || !user.isActive) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    // Invalidate any existing unused tokens for this user
    await PasswordReset.deleteMany({ userId: user._id });

    const token     = PasswordReset.generate();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await PasswordReset.create({ userId: user._id, token, expiresAt });

    // Build the reset URL — points to the frontend
    const frontendUrl = env.frontendUrl || (req.headers.origin) || 'http://localhost:5173';
    const resetUrl    = `${frontendUrl}/reset-password?token=${token}`;

    await emailService.sendPasswordReset(user.email, resetUrl);

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/reset-password ────────────────────────────────────────────
// Validates the token and sets a new password.
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'token and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const reset = await PasswordReset.findOne({
      token,
      usedAt:    null,
      expiresAt: { $gt: new Date() },
    });

    if (!reset) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
    }

    const user = await User.findById(reset.userId);
    if (!user || !user.isActive) {
      return res.status(400).json({ error: 'Account not found.' });
    }

    // Update password
    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();

    // Mark token as used (prevent reuse)
    reset.usedAt = new Date();
    await reset.save();

    await auditService.log({
      userId:       user._id,
      action:       'UPDATE',
      resourceType: 'User',
      resourceId:   user._id,
      resourceName: user.email + ' (password reset)',
    });

    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/auth/reset-password/verify?token=xxx ────────────────────────────
// Frontend calls this to check if a token is still valid before showing the form.
const verifyResetToken = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ valid: false, error: 'token is required' });

    const reset = await PasswordReset.findOne({
      token,
      usedAt:    null,
      expiresAt: { $gt: new Date() },
    });

    if (!reset) return res.json({ valid: false, error: 'Link is invalid or has expired.' });

    res.json({ valid: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refresh, logout, me, deleteAccount, forgotPassword, resetPassword, verifyResetToken };
