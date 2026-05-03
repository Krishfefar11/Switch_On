const FeatureFlag = require('../models/FeatureFlag');
const auditService = require('../services/auditService');
const sseService = require('../services/sseService');

const getFlags = async (req, res, next) => {
  try {
    const { environment = 'development', page = 1, limit = 50, search = '' } = req.query;
    const query = { deletedAt: null, environment };
    if (search) query.name = { $regex: search, $options: 'i' };

    const flags = await FeatureFlag.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await FeatureFlag.countDocuments(query);
    res.json({ flags, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

const getFlagById = async (req, res, next) => {
  try {
    const flag = await FeatureFlag.findOne({ _id: req.params.id, deletedAt: null });
    if (!flag) return res.status(404).json({ error: 'Flag not found' });
    res.json(flag);
  } catch (error) {
    next(error);
  }
};

const createFlag = async (req, res, next) => {
  try {
    const { name, description, enabled, rolloutPercentage, environment } = req.body;
    if (!/^[a-z0-9_-]+$/.test(name)) return res.status(400).json({ error: 'Invalid name slug' });

    const flag = await FeatureFlag.create({
      name, description, enabled, rolloutPercentage, environment,
      createdBy: req.user._id, updatedBy: req.user._id
    });

    await auditService.log({ userId: req.user._id, action: 'CREATE', resourceId: flag._id, resourceName: flag.name, after: flag });
    sseService.broadcast('FLAG_CREATED', { flag });

    res.status(201).json(flag);
  } catch (error) {
    next(error);
  }
};

const updateFlag = async (req, res, next) => {
  try {
    const { description, enabled, rolloutPercentage, environment } = req.body;
    const flag = await FeatureFlag.findOne({ _id: req.params.id, deletedAt: null });
    if (!flag) return res.status(404).json({ error: 'Flag not found' });

    const before = flag.toObject();
    if (description !== undefined) flag.description = description;
    if (enabled !== undefined) flag.enabled = enabled;
    if (rolloutPercentage !== undefined) flag.rolloutPercentage = rolloutPercentage;
    if (environment !== undefined) flag.environment = environment;

    flag.version += 1;
    flag.updatedBy = req.user._id;
    await flag.save();

    await auditService.log({ userId: req.user._id, action: 'UPDATE', resourceId: flag._id, resourceName: flag.name, before, after: flag });
    sseService.broadcast('FLAG_UPDATED', { flag });

    res.json(flag);
  } catch (error) {
    next(error);
  }
};

const toggleFlag = async (req, res, next) => {
  try {
    const flag = await FeatureFlag.findOne({ _id: req.params.id, deletedAt: null });
    if (!flag) return res.status(404).json({ error: 'Flag not found' });

    const before = flag.toObject();
    flag.enabled = !flag.enabled;
    flag.version += 1;
    flag.updatedBy = req.user._id;
    await flag.save();

    await auditService.log({ userId: req.user._id, action: 'TOGGLE', resourceId: flag._id, resourceName: flag.name, before, after: flag });
    sseService.broadcast('FLAG_TOGGLED', { flag });

    res.json(flag);
  } catch (error) {
    next(error);
  }
};

const deleteFlag = async (req, res, next) => {
  try {
    const flag = await FeatureFlag.findOne({ _id: req.params.id, deletedAt: null });
    if (!flag) return res.status(404).json({ error: 'Flag not found' });

    flag.deletedAt = new Date();
    flag.updatedBy = req.user._id;
    await flag.save();

    await auditService.log({ userId: req.user._id, action: 'DELETE', resourceId: flag._id, resourceName: flag.name, before: flag });
    sseService.broadcast('FLAG_DELETED', { flag });

    res.json({ message: 'Deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getFlags, getFlagById, createFlag, updateFlag, toggleFlag, deleteFlag };
