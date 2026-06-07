const Webhook = require('../models/Webhook');
const Project = require('../models/Project');

// Verify the project belongs to the requesting user's org
async function assertProjectAccess(req, projectId) {
  if (!req.user.organizationId) return false;
  const p = await Project.findOne({ _id: projectId, organizationId: req.user.organizationId }).lean();
  return !!p;
}

// GET /api/webhooks?projectId=...
const listWebhooks = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId query param required' });
    if (!await assertProjectAccess(req, projectId)) return res.status(403).json({ error: 'Forbidden' });

    const hooks = await Webhook.find({ projectId }).lean();
    // Never expose the raw secret — return a masked version
    res.json({ webhooks: hooks.map(h => ({ ...h, secret: `${h.secret.slice(0, 6)}…` })) });
  } catch (e) { next(e); }
};

// POST /api/webhooks
const createWebhook = async (req, res, next) => {
  try {
    const { projectId, url, label = '', events } = req.body;
    if (!projectId || !url) return res.status(400).json({ error: 'projectId and url required' });
    if (!await assertProjectAccess(req, projectId)) return res.status(403).json({ error: 'Forbidden' });

    const secret = Webhook.generateSecret();
    const hook   = await Webhook.create({
      projectId, url, label,
      secret,
      events: Array.isArray(events) && events.length ? events : Webhook.FLAG_EVENTS,
    });

    // Return the full secret only on creation — user must copy it now
    res.status(201).json({
      webhook: { ...hook.toObject(), secret },
      message: 'Save your signing secret — it will not be shown again.',
    });
  } catch (e) { next(e); }
};

// PATCH /api/webhooks/:id
const updateWebhook = async (req, res, next) => {
  try {
    const hook = await Webhook.findById(req.params.id);
    if (!hook) return res.status(404).json({ error: 'Webhook not found' });
    if (!await assertProjectAccess(req, hook.projectId)) return res.status(403).json({ error: 'Forbidden' });

    const { url, label, events, isActive } = req.body;
    if (url      !== undefined) hook.url      = url;
    if (label    !== undefined) hook.label    = label;
    if (events   !== undefined) hook.events   = events;
    if (isActive !== undefined) hook.isActive = isActive;
    await hook.save();

    res.json({ webhook: { ...hook.toObject(), secret: `${hook.secret.slice(0, 6)}…` } });
  } catch (e) { next(e); }
};

// DELETE /api/webhooks/:id
const deleteWebhook = async (req, res, next) => {
  try {
    const hook = await Webhook.findById(req.params.id);
    if (!hook) return res.status(404).json({ error: 'Webhook not found' });
    if (!await assertProjectAccess(req, hook.projectId)) return res.status(403).json({ error: 'Forbidden' });

    await hook.deleteOne();
    res.json({ message: 'Webhook deleted' });
  } catch (e) { next(e); }
};

// POST /api/webhooks/:id/rotate-secret — regenerate signing secret
const rotateSecret = async (req, res, next) => {
  try {
    const hook = await Webhook.findById(req.params.id);
    if (!hook) return res.status(404).json({ error: 'Webhook not found' });
    if (!await assertProjectAccess(req, hook.projectId)) return res.status(403).json({ error: 'Forbidden' });

    hook.secret = Webhook.generateSecret();
    await hook.save();
    res.json({ secret: hook.secret, message: 'Save your new signing secret.' });
  } catch (e) { next(e); }
};

module.exports = { listWebhooks, createWebhook, updateWebhook, deleteWebhook, rotateSecret };
