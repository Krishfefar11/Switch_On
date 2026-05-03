const crypto = require('crypto');

/**
 * Deterministically evaluates whether a user is in the rollout bucket.
 *
 * Algorithm:
 *   1. Concatenate featureName + ':' + userId
 *   2. Compute MD5 hash (fast, uniform distribution, not security-critical here)
 *   3. Take first 8 hex chars → parse as uint32
 *   4. bucket = (hashInt / MAX_UINT32) * 100  → float 0–100
 *   5. User is IN if bucket < rolloutPercentage AND flag.enabled === true
 *
 * Properties:
 *   - Same user always gets same bucket for a given flag name
 *   - Uniform distribution: ~1% of users per percentage point
 *   - Changing flag name = different distribution (intentional)
 *
 * @param {Object} flag - FeatureFlag document
 * @param {string} userId - Any stable string identifier
 * @returns {{ enabled: boolean, bucket: number, reason: string }}
 */
function evaluate(flag, userId) {
  if (!flag.enabled) {
    return { enabled: false, bucket: null, reason: 'FLAG_DISABLED' };
  }

  if (flag.rolloutPercentage === 100) {
    return { enabled: true, bucket: 100, reason: 'FULL_ROLLOUT' };
  }

  if (flag.rolloutPercentage === 0) {
    return { enabled: false, bucket: 0, reason: 'ZERO_ROLLOUT' };
  }

  const input  = `${flag.name}:${userId}`;
  const hash   = crypto.createHash('md5').update(input).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);            // 0 – 4294967295
  const bucket  = (hashInt / 0xFFFFFFFF) * 100;                  // 0.0 – 100.0

  return {
    enabled: bucket < flag.rolloutPercentage,
    bucket:  parseFloat(bucket.toFixed(4)),
    reason:  bucket < flag.rolloutPercentage ? 'IN_ROLLOUT' : 'OUT_OF_ROLLOUT',
  };
}

module.exports = { evaluate };
