const FeatureFlag = require('../models/FeatureFlag');
const { evaluate } = require('../services/evaluationEngine');

const evaluateFlag = async (req, res, next) => {
  try {
    const { name } = req.params;
    const { userId, environment = 'development' } = req.query;

    if (!userId) return res.status(400).json({ error: 'userId required' });

    const flag = await FeatureFlag.findOne({ name, environment, deletedAt: null });
    if (!flag) return res.status(404).json({ error: 'Flag not found' });

    const result = evaluate(flag, userId);
    res.json({
      name: flag.name,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { evaluateFlag };
