const Invitation    = require('../models/Invitation');
const Organization  = require('../models/Organization');
const User          = require('../models/User');
const bcrypt        = require('bcryptjs');
const jwt           = require('jsonwebtoken');
const env           = require('../config/env');
const auditService  = require('../services/auditService');

const INVITE_TTL_HOURS = 72; // invitations expire after 72 hours

// POST /api/invitations
// Admin creates an invitation. Returns a link containing the token.
const createInvitation = async (req, res, next) => {
  try {
    if (!req.user.organizationId) {
      return res.status(400).json({ error: 'You must belong to an organization to invite teammates' });
    }

    const { email = '', role = 'developer' } = req.body;

    const token     = Invitation.generate();
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

    const invitation = await Invitation.create({
      organizationId: req.user.organizationId,
      invitedBy:      req.user._id,
      email,
      token,
      role,
      expiresAt,
    });

    // Construct the accept URL (the UI will handle this route)
    const baseUrl   = req.headers.origin || env.cors.allowedOrigins[0] || 'http://localhost:5173';
    const inviteUrl = `${baseUrl}/invite/${token}`;

    await auditService.log({
      userId:       req.user._id,
      projectId:    null,
      action:       'CREATE',
      resourceType: 'Invitation',
      resourceId:   invitation._id,
      resourceName: email || 'open invitation',
    });

    res.status(201).json({
      invitation: {
        id:        invitation._id,
        token,
        email:     invitation.email,
        role:      invitation.role,
        expiresAt: invitation.expiresAt,
        inviteUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/invitations — list pending invitations for the org
const listInvitations = async (req, res, next) => {
  try {
    if (!req.user.organizationId) return res.json({ invitations: [] });

    const invitations = await Invitation.find({
      organizationId: req.user.organizationId,
      status:         'pending',
      expiresAt:      { $gt: new Date() },
    })
      .populate('invitedBy', 'email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ invitations });
  } catch (error) {
    next(error);
  }
};

// GET /api/invitations/:token — public: verify token before showing accept form
const verifyToken = async (req, res, next) => {
  try {
    const inv = await Invitation.findOne({
      token:     req.params.token,
      status:    'pending',
      expiresAt: { $gt: new Date() },
    }).populate('organizationId', 'name').lean();

    if (!inv) return res.status(404).json({ error: 'Invitation not found or expired' });

    res.json({
      valid:        true,
      email:        inv.email,
      role:         inv.role,
      organization: { id: inv.organizationId._id, name: inv.organizationId.name },
      expiresAt:    inv.expiresAt,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/invitations/:token/accept — register + join the org in one step
const acceptInvitation = async (req, res, next) => {
  try {
    const inv = await Invitation.findOne({
      token:     req.params.token,
      status:    'pending',
      expiresAt: { $gt: new Date() },
    });

    if (!inv) return res.status(404).json({ error: 'Invitation not found or expired' });

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    // Check for duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered. Please log in.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      passwordHash,
      role:           inv.role,
      organizationId: inv.organizationId,
    });

    // Mark invitation as accepted
    inv.status = 'accepted';
    await inv.save();

    // Issue tokens
    const accessToken  = jwt.sign({ id: user._id }, env.jwt.secret,        { expiresIn: env.jwt.expiresIn });
    const refreshToken = jwt.sign({ id: user._id }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });

    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict' });

    await auditService.log({
      userId:       user._id,
      action:       'CREATE',
      resourceType: 'User',
      resourceId:   user._id,
      resourceName: user.email,
    });

    res.status(201).json({ accessToken });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/invitations/:id — revoke a pending invitation
const revokeInvitation = async (req, res, next) => {
  try {
    const inv = await Invitation.findOne({
      _id:            req.params.id,
      organizationId: req.user.organizationId,
      status:         'pending',
    });

    if (!inv) return res.status(404).json({ error: 'Invitation not found' });

    inv.status = 'revoked';
    await inv.save();

    res.json({ message: 'Invitation revoked' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createInvitation, listInvitations, verifyToken, acceptInvitation, revokeInvitation };
