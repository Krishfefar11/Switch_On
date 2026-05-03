const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const auditService = require('../services/auditService');

const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const count = await User.countDocuments();
    const role = count === 0 ? 'admin' : 'viewer';

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, role });

    const accessToken = jwt.sign({ id: user._id }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
    const refreshToken = jwt.sign({ id: user._id }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });

    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict' });
    
    await auditService.log({ userId: user._id, action: 'CREATE', resourceType: 'User', resourceId: user._id, resourceName: user.email });

    res.status(201).json({ accessToken });
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

    const accessToken = jwt.sign({ id: user._id }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
    const refreshToken = jwt.sign({ id: user._id }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });

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
    const user = await User.findById(decoded.id);
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

const me = (req, res) => {
  res.json({ id: req.user._id, email: req.user.email, role: req.user.role, createdAt: req.user.createdAt });
};

module.exports = { register, login, refresh, logout, me };
