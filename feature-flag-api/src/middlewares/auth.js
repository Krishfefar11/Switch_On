const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const decoded = jwt.verify(token, env.jwt.secret);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Unauthorized: Invalid user' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

const consumerAuth = (req, res, next) => {
  const apiKey = req.headers['x-consumer-key'];
  if (apiKey && apiKey === env.consumerApiKey) {
    return next();
  }
  
  // Fallback to JWT if no API key
  return auth(req, res, next);
};

module.exports = { auth, consumerAuth };
