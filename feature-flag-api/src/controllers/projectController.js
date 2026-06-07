const Project  = require('../models/Project');
const SdkKey   = require('../models/SdkKey');

function nameToSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// GET /api/projects
const getProjects = async (req, res, next) => {
  try {
    if (!req.user.organizationId) return res.json({ projects: [] });
    const projects = await Project.find({ organizationId: req.user.organizationId }).lean();
    res.json({ projects: projects.map(p => ({ ...p, id: p._id })) });
  } catch (e) { next(e); }
};

// POST /api/projects
const createProject = async (req, res, next) => {
  try {
    if (!req.user.organizationId) return res.status(400).json({ error: 'User has no organization' });

    const { name, description = '' } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const slug = nameToSlug(name);
    const project = await Project.create({
      name, slug, description,
      organizationId: req.user.organizationId,
    });

    // Auto-create SDK keys for all 3 environments
    const environments = ['development', 'staging', 'production'];
    const sdkKeys = await Promise.all(
      environments.map(e => SdkKey.create({
        key:         SdkKey.generate(e),
        projectId:   project._id,
        environment: e,
        label:       `Default ${e} key`,
      }))
    );

    const p = project.toObject();
    res.status(201).json({
      project:  { ...p, id: p._id },
      sdkKeys: sdkKeys.map(k => ({ id: k._id, key: k.key, environment: k.environment, label: k.label })),
    });
  } catch (e) { next(e); }
};

// GET /api/projects/:id
const getProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, organizationId: req.user.organizationId }).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ project: { ...project, id: project._id } });
  } catch (e) { next(e); }
};

// PATCH /api/projects/:id
const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { name, description } = req.body;
    if (name)        { project.name = name; project.slug = nameToSlug(name); }
    if (description !== undefined) project.description = description;
    await project.save();
    const updated = project.toObject();
    res.json({ project: { ...updated, id: updated._id } });
  } catch (e) { next(e); }
};

// DELETE /api/projects/:id
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Deactivate all SDK keys for this project
    await SdkKey.updateMany({ projectId: project._id }, { isActive: false });
    await project.deleteOne();

    res.json({ message: 'Project deleted' });
  } catch (e) { next(e); }
};

// GET /api/projects/:id/sdk-keys
const getSdkKeys = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, organizationId: req.user.organizationId }).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const keys = await SdkKey.find({ projectId: project._id }).lean();
    res.json({ keys });
  } catch (e) { next(e); }
};

// POST /api/projects/:id/sdk-keys  — generate a new key for an environment
const createSdkKey = async (req, res, next) => {
  try {
    const { environment, label = '' } = req.body;
    if (!['development', 'staging', 'production'].includes(environment)) {
      return res.status(400).json({ error: 'environment must be development | staging | production' });
    }

    const project = await Project.findOne({ _id: req.params.id, organizationId: req.user.organizationId }).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const key = await SdkKey.create({
      key:         SdkKey.generate(environment),
      projectId:   project._id,
      environment,
      label,
    });

    res.status(201).json({ key: { id: key._id, key: key.key, environment: key.environment, label: key.label } });
  } catch (e) { next(e); }
};

// DELETE /api/projects/:id/sdk-keys/:keyId  — revoke a key
const revokeSdkKey = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, organizationId: req.user.organizationId }).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const key = await SdkKey.findOne({ _id: req.params.keyId, projectId: project._id });
    if (!key) return res.status(404).json({ error: 'SDK key not found' });

    key.isActive = false;
    await key.save();

    res.json({ message: 'SDK key revoked' });
  } catch (e) { next(e); }
};

module.exports = { getProjects, createProject, getProject, updateProject, deleteProject, getSdkKeys, createSdkKey, revokeSdkKey };
