const FeatureFlag    = require('../models/FeatureFlag');
const Project        = require('../models/Project');
const auditService   = require('../services/auditService');
const sseService     = require('../services/sseService');
const webhookService = require('../services/webhookService');

// Resolve the projectId to scope a request.
// Priority: explicit query/body param → user's first project (if authed admin user)
async function resolveProjectId(req) {
  const explicit = req.query.projectId || req.body?.projectId || req.headers['x-project-id'];
  if (explicit) return explicit;

  if (req.user?.organizationId) {
    const project = await Project.findOne({ organizationId: req.user.organizationId }).lean();
    return project?._id ?? null;
  }
  return null;
}

const getFlags = async (req, res, next) => {
  try {
    const { environment = 'development', page = 1, limit = 50, search = '', tag = '' } = req.query;

    const { archived = 'false' } = req.query;
    const showArchived = archived === 'true';

    const query = { deletedAt: null, environment, archived: showArchived };
    if (search) query.name = { $regex: search, $options: 'i' };
    if (tag)    query.tags = tag;

    const projectId = await resolveProjectId(req);
    if (projectId) query.projectId = projectId;

    const flags = await FeatureFlag.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await FeatureFlag.countDocuments(query);
    res.json({ flags, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

const getFlagById = async (req, res, next) => {
  try {
    const flag = await FeatureFlag.findOne({ _id: req.params.id, deletedAt: null });
    if (!flag) return res.status(404).json({ error: 'Flag not found' });
    res.json(flag);
  } catch (error) { next(error); }
};

const createFlag = async (req, res, next) => {
  try {
    const { name, description, type = 'boolean', enabled, rolloutPercentage,
            environment, variations = [], defaultVariation = 0, rules = [], tags = [] } = req.body;

    if (!/^[a-z0-9_-]+$/.test(name)) return res.status(400).json({ error: 'Invalid name slug' });

    if (type !== 'boolean' && (!variations || variations.length === 0)) {
      return res.status(400).json({ error: `Multivariate flags (${type}) require at least one variation` });
    }

    const projectId = await resolveProjectId(req);

    const flag = await FeatureFlag.create({
      name, description, type, enabled, rolloutPercentage, environment,
      variations, defaultVariation, rules, tags,
      projectId,
      createdBy: req.user._id, updatedBy: req.user._id,
    });

    await auditService.log({ userId: req.user._id, projectId, action: 'CREATE', resourceId: flag._id, resourceName: flag.name, after: flag });
    sseService.broadcast('FLAG_CREATED', { flag });
    webhookService.dispatch('FLAG_CREATED', flag);

    res.status(201).json(flag);
  } catch (error) { next(error); }
};

const updateFlag = async (req, res, next) => {
  try {
    const { description, enabled, rolloutPercentage, environment,
            variations, defaultVariation, rules, tags } = req.body;

    const flag = await FeatureFlag.findOne({ _id: req.params.id, deletedAt: null });
    if (!flag) return res.status(404).json({ error: 'Flag not found' });

    const before = flag.toObject();

    if (description       !== undefined) flag.description      = description;
    if (enabled           !== undefined) flag.enabled          = enabled;
    if (rolloutPercentage !== undefined) flag.rolloutPercentage = rolloutPercentage;
    if (environment       !== undefined) flag.environment      = environment;
    if (variations        !== undefined) flag.variations       = variations;
    if (defaultVariation  !== undefined) flag.defaultVariation = defaultVariation;
    if (rules             !== undefined) flag.rules            = rules;
    if (tags              !== undefined) flag.tags             = tags;

    flag.version  += 1;
    flag.updatedBy = req.user._id;
    await flag.save();

    await auditService.log({ userId: req.user._id, projectId: flag.projectId, action: 'UPDATE', resourceId: flag._id, resourceName: flag.name, before, after: flag });
    sseService.broadcast('FLAG_UPDATED', { flag });
    webhookService.dispatch('FLAG_UPDATED', flag);

    res.json(flag);
  } catch (error) { next(error); }
};

const toggleFlag = async (req, res, next) => {
  try {
    const flag = await FeatureFlag.findOne({ _id: req.params.id, deletedAt: null });
    if (!flag) return res.status(404).json({ error: 'Flag not found' });

    const before   = flag.toObject();
    flag.enabled   = !flag.enabled;
    flag.version  += 1;
    flag.updatedBy = req.user._id;
    await flag.save();

    await auditService.log({ userId: req.user._id, projectId: flag.projectId, action: 'TOGGLE', resourceId: flag._id, resourceName: flag.name, before, after: flag });
    sseService.broadcast('FLAG_TOGGLED', { flag });
    webhookService.dispatch('FLAG_TOGGLED', flag);

    res.json(flag);
  } catch (error) { next(error); }
};

const deleteFlag = async (req, res, next) => {
  try {
    const flag = await FeatureFlag.findOne({ _id: req.params.id, deletedAt: null });
    if (!flag) return res.status(404).json({ error: 'Flag not found' });

    flag.deletedAt = new Date();
    flag.updatedBy = req.user._id;
    await flag.save();

    await auditService.log({ userId: req.user._id, projectId: flag.projectId, action: 'DELETE', resourceId: flag._id, resourceName: flag.name, before: flag });
    sseService.broadcast('FLAG_DELETED', { flag });
    webhookService.dispatch('FLAG_DELETED', flag);

    res.json({ message: 'Deleted' });
  } catch (error) { next(error); }
};

// ── Archive / Unarchive ───────────────────────────────────────────────────
const archiveFlag = async (req, res, next) => {
  try {
    const flag = await FeatureFlag.findOne({ _id: req.params.id, deletedAt: null });
    if (!flag) return res.status(404).json({ error: 'Flag not found' });

    flag.archived   = true;
    flag.archivedAt = new Date();
    flag.enabled    = false;   // disable when archiving
    flag.version   += 1;
    flag.updatedBy  = req.user._id;
    await flag.save();

    await auditService.log({ userId: req.user._id, projectId: flag.projectId, action: 'UPDATE', resourceId: flag._id, resourceName: flag.name, after: flag });
    sseService.broadcast('FLAG_UPDATED', { flag });

    res.json(flag);
  } catch (error) { next(error); }
};

const unarchiveFlag = async (req, res, next) => {
  try {
    const flag = await FeatureFlag.findOne({ _id: req.params.id, deletedAt: null });
    if (!flag) return res.status(404).json({ error: 'Flag not found' });

    flag.archived   = false;
    flag.archivedAt = null;
    flag.version   += 1;
    flag.updatedBy  = req.user._id;
    await flag.save();

    await auditService.log({ userId: req.user._id, projectId: flag.projectId, action: 'UPDATE', resourceId: flag._id, resourceName: flag.name, after: flag });
    sseService.broadcast('FLAG_UPDATED', { flag });

    res.json(flag);
  } catch (error) { next(error); }
};

// ── Promote to another environment ───────────────────────────────────────
const promoteFlag = async (req, res, next) => {
  try {
    const { targetEnvironment } = req.body;
    const validEnvs = ['development', 'staging', 'production'];
    if (!validEnvs.includes(targetEnvironment)) {
      return res.status(400).json({ error: 'targetEnvironment must be development | staging | production' });
    }

    const source = await FeatureFlag.findOne({ _id: req.params.id, deletedAt: null });
    if (!source) return res.status(404).json({ error: 'Flag not found' });
    if (source.environment === targetEnvironment) {
      return res.status(400).json({ error: 'Source and target environment are the same' });
    }

    // Upsert: update if exists in target env, create if not
    const existing = await FeatureFlag.findOne({
      name:        source.name,
      environment: targetEnvironment,
      projectId:   source.projectId,
      deletedAt:   null,
    });

    let promoted;
    if (existing) {
      // Copy rules, variations, rollout — keep target's enabled state
      existing.description    = source.description;
      existing.type           = source.type;
      existing.rolloutPercentage = source.rolloutPercentage;
      existing.variations     = source.variations;
      existing.defaultVariation = source.defaultVariation;
      existing.rules          = source.rules;
      existing.tags           = source.tags;
      existing.version       += 1;
      existing.updatedBy      = req.user._id;
      await existing.save();
      promoted = existing;
    } else {
      promoted = await FeatureFlag.create({
        name:              source.name,
        description:       source.description,
        type:              source.type,
        enabled:           false,            // start disabled in target env
        rolloutPercentage: source.rolloutPercentage,
        variations:        source.variations,
        defaultVariation:  source.defaultVariation,
        rules:             source.rules,
        tags:              source.tags,
        environment:       targetEnvironment,
        projectId:         source.projectId,
        createdBy:         req.user._id,
        updatedBy:         req.user._id,
      });
    }

    await auditService.log({
      userId: req.user._id, projectId: promoted.projectId, action: 'CREATE',
      resourceId: promoted._id, resourceName: `${promoted.name} (promoted to ${targetEnvironment})`,
      after: promoted,
    });
    sseService.broadcast('FLAG_CREATED', { flag: promoted });

    res.status(existing ? 200 : 201).json({ flag: promoted, promoted: true, targetEnvironment });
  } catch (error) { next(error); }
};

// ── Bulk action ───────────────────────────────────────────────────────────
const bulkAction = async (req, res, next) => {
  try {
    const { action, ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids must be a non-empty array' });
    if (ids.length > 100) return res.status(400).json({ error: 'Max 100 flags per bulk operation' });

    const validActions = ['enable', 'disable', 'delete', 'archive', 'unarchive'];
    if (!validActions.includes(action)) return res.status(400).json({ error: `action must be one of: ${validActions.join(', ')}` });

    const projectId = await resolveProjectId(req);
    const baseQuery = { _id: { $in: ids }, deletedAt: null };
    if (projectId) baseQuery.projectId = projectId;

    let update, auditAction;

    switch (action) {
      case 'enable':    update = { enabled: true,  $inc: { version: 1 }, updatedBy: req.user._id }; auditAction = 'UPDATE'; break;
      case 'disable':   update = { enabled: false, $inc: { version: 1 }, updatedBy: req.user._id }; auditAction = 'UPDATE'; break;
      case 'archive':   update = { archived: true,  archivedAt: new Date(), enabled: false, $inc: { version: 1 }, updatedBy: req.user._id }; auditAction = 'UPDATE'; break;
      case 'unarchive': update = { archived: false, archivedAt: null, $inc: { version: 1 }, updatedBy: req.user._id }; auditAction = 'UPDATE'; break;
      case 'delete':    update = { deletedAt: new Date(), updatedBy: req.user._id }; auditAction = 'DELETE'; break;
    }

    const result = await FeatureFlag.updateMany(baseQuery, update);
    const affected = await FeatureFlag.find({ _id: { $in: ids } }).lean();

    // Broadcast individual events so SSE clients update correctly
    const sseEvent = action === 'delete' ? 'FLAG_DELETED' : 'FLAG_UPDATED';
    affected.forEach(flag => sseService.broadcast(sseEvent, { flag }));

    await auditService.log({
      userId: req.user._id, projectId, action: auditAction,
      resourceName: `bulk ${action} (${ids.length} flags)`,
    });

    res.json({ action, affected: result.modifiedCount });
  } catch (error) { next(error); }
};

module.exports = { getFlags, getFlagById, createFlag, updateFlag, toggleFlag, deleteFlag, archiveFlag, unarchiveFlag, promoteFlag, bulkAction };
