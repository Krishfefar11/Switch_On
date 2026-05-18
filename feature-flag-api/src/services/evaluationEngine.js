const crypto = require('crypto');

// ── Bucketing ─────────────────────────────────────────────────────────
// MD5(flagName:userId) → uint32 → normalise to 0-100
// Same user always gets the same bucket for a given flag name.
function getBucket(flagName, userId) {
  const hash    = crypto.createHash('md5').update(`${flagName}:${userId}`).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return (hashInt / 0xFFFFFFFF) * 100;
}

// ── Targeting rule condition matching ─────────────────────────────────
function matchesCondition(condition, userAttributes) {
  const attrValue = userAttributes[condition.attribute];
  if (attrValue === undefined || attrValue === null) return false;

  const attr = String(attrValue).toLowerCase();
  const val  = condition.value;

  switch (condition.operator) {
    case 'equals':      return attr === String(val).toLowerCase();
    case 'notEquals':   return attr !== String(val).toLowerCase();
    case 'contains':    return attr.includes(String(val).toLowerCase());
    case 'startsWith':  return attr.startsWith(String(val).toLowerCase());
    case 'endsWith':    return attr.endsWith(String(val).toLowerCase());
    case 'greaterThan': return Number(attrValue) > Number(val);
    case 'lessThan':    return Number(attrValue) < Number(val);
    case 'in': {
      const list = Array.isArray(val) ? val : String(val).split(',');
      return list.map(x => String(x).trim().toLowerCase()).includes(attr);
    }
    case 'notIn': {
      const list = Array.isArray(val) ? val : String(val).split(',');
      return !list.map(x => String(x).trim().toLowerCase()).includes(attr);
    }
    default: return false;
  }
}

function matchesRule(rule, userAttributes) {
  if (!rule.conditions || rule.conditions.length === 0) return false;
  return rule.conditions.every(c => matchesCondition(c, userAttributes));
}

// ── Variation value resolver ──────────────────────────────────────────
function getVariationValue(flag, index) {
  if (flag.type === 'boolean') {
    return index === 0 ? true : false;
  }
  return flag.variations?.[index]?.value ?? null;
}

// ── Main evaluation function ──────────────────────────────────────────
/**
 * Evaluate a feature flag for a specific user.
 *
 * Evaluation order (matches LaunchDarkly's model):
 *   1. FLAG_DISABLED   — enabled=false → always false/null
 *   2. RULE_MATCH      — targeting rules (by user attributes) → serve specific variation
 *   3. FULL_ROLLOUT    — rolloutPercentage=100 → everyone gets default variation
 *   4. ZERO_ROLLOUT    — rolloutPercentage=0  → no one gets it
 *   5. IN/OUT_ROLLOUT  — MD5 bucket < rolloutPercentage → default variation
 *
 * @param {Object} flag           - FeatureFlag document
 * @param {string} userId         - Stable user identifier
 * @param {Object} userAttributes - Key/value attributes for targeting rules
 * @returns {{ enabled, value, bucket, reason, variationIndex }}
 */
function evaluate(flag, userId, userAttributes = {}) {
  // 1. Master switch
  if (!flag.enabled) {
    return { enabled: false, value: null, bucket: null, reason: 'FLAG_DISABLED', variationIndex: null };
  }

  // 2. Targeting rules — checked before percentage rollout
  if (flag.rules && flag.rules.length > 0) {
    for (const rule of flag.rules) {
      if (matchesRule(rule, userAttributes)) {
        const bucket  = getBucket(flag.name, userId);
        const rollout = rule.rollout ?? 100;
        if (bucket < rollout) {
          const variationIndex = rule.serve ?? 0;
          const value          = getVariationValue(flag, variationIndex);
          return {
            enabled: flag.type === 'boolean' ? value === true : true,
            value,
            bucket:         parseFloat(bucket.toFixed(4)),
            reason:         'RULE_MATCH',
            ruleDescription: rule.description || '',
            variationIndex,
          };
        }
      }
    }
  }

  // 3. Full rollout short-circuit
  if (flag.rolloutPercentage === 100) {
    const variationIndex = flag.defaultVariation ?? 0;
    const value          = getVariationValue(flag, variationIndex);
    return {
      enabled: flag.type === 'boolean' ? value === true : true,
      value,
      bucket:         100,
      reason:         'FULL_ROLLOUT',
      variationIndex,
    };
  }

  // 4. Zero rollout short-circuit
  if (flag.rolloutPercentage === 0) {
    return { enabled: false, value: null, bucket: 0, reason: 'ZERO_ROLLOUT', variationIndex: null };
  }

  // 5. Percentage rollout via MD5 bucketing
  const bucket     = getBucket(flag.name, userId);
  const inRollout  = bucket < flag.rolloutPercentage;
  const variationIndex = inRollout ? (flag.defaultVariation ?? 0) : null;
  const value          = inRollout ? getVariationValue(flag, variationIndex) : null;

  return {
    enabled:        inRollout && (flag.type === 'boolean' ? value === true : true),
    value,
    bucket:         parseFloat(bucket.toFixed(4)),
    reason:         inRollout ? 'IN_ROLLOUT' : 'OUT_OF_ROLLOUT',
    variationIndex,
  };
}

module.exports = { evaluate, getBucket, matchesCondition, matchesRule };
