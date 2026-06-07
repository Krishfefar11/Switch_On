const User = require('../models/User');

const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    // Scope to current user's organization — admins only see their own org's members
    const orgFilter = req.user.organizationId
      ? { organizationId: req.user.organizationId }
      : { _id: req.user._id }; // fallback: show only self if no org

    const users = await User.find(orgFilter)
      .select('-passwordHash')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(orgFilter);
    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['developer', 'viewer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const targetUserId = req.params.id;
    if (targetUserId === req.user.id) return res.status(403).json({ error: 'Cannot change own role' });

    const user = await User.findById(targetUserId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.role = role;
    await user.save();
    res.json({ message: 'Role updated', user: { id: user._id, email: user.email, role: user.role } });
  } catch (error) {
    next(error);
  }
};

const deactivateUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    if (targetUserId === req.user.id) return res.status(403).json({ error: 'Cannot deactivate self' });

    const user = await User.findById(targetUserId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isActive = false;
    await user.save();
    res.json({ message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, updateRole, deactivateUser };
