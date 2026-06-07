/**
 * SwitchOn Node.js Server SDK
 *
 * Server-side counterpart to the browser SDK. Designed for use in Express,
 * Next.js API routes, or any Node.js back-end.
 *
 * Key differences vs. the browser SDK:
 *   - Evaluates flags LOCALLY (no HTTP call per evaluation — instant).
 *   - userId is passed per-call (not stored on the client instance).
 *   - Keeps flags fresh via background HTTP polling (no SSE).
 *   - Includes an Express middleware helper.
 *
 * Quick start:
 *   const { SwitchOnServer } = require('@switchon/js-sdk/node');
 *
 *   const flags = new SwitchOnServer({
 *     apiUrl:       'https://flags.yourapp.com',
 *     sdkKey:       'sdk-prod-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
 *     environment:  'production',
 *     pollInterval: 30_000,  // ms — how often to refresh flag configs
 *   });
 *
 *   await flags.init();
 *
 *   // In a request handler:
 *   const show = flags.isEnabled('new-checkout', req.user.id, { plan: req.user.plan });
 *   const text = flags.variation('cta-text', req.user.id, {}, 'Buy Now');
 *
 *   // As Express middleware:
 *   app.use(flags.middleware());   // adds req.flags.isEnabled / req.flags.variation
 */

'use strict';

var crypto = require('crypto');
var https  = require('https');
var http   = require('http');
var url    = require('url');

// ── Default options ────────────────────────────────────────────────────────────
var DEFAULTS = {
  environment:  'production',
  pollInterval: 30000,   // 30s
  debug:        false,
};

// ── Evaluation engine (mirrors feature-flag-api/src/services/evaluationEngine.js)
// Must stay in sync with the backend. Both use MD5(flagName:userId) bucketing.
// ──────────────────────────────────────────────────────────────────────────────

function getBucket(flagName, userId) {
  var hash    = crypto.createHash('md5').update(flagName + ':' + userId).digest('hex');
  var hashInt = parseInt(hash.substring(0, 8), 16);
  return (hashInt / 0xFFFFFFFF) * 100;
}

function matchesCondition(condition, userAttributes) {
  var attrValue = userAttributes[condition.attribute];
  if (attrValue === undefined || attrValue === null) return false;

  var attr = String(attrValue).toLowerCase();
  var val  = condition.value;

  switch (condition.operator) {
    case 'equals':      return attr === String(val).toLowerCase();
    case 'notEquals':   return attr !== String(val).toLowerCase();
    case 'contains':    return attr.indexOf(String(val).toLowerCase()) !== -1;
    case 'startsWith':  return attr.indexOf(String(val).toLowerCase()) === 0;
    case 'endsWith':    return attr.slice(-String(val).length) === String(val).toLowerCase();
    case 'greaterThan': return Number(attrValue) > Number(val);
    case 'lessThan':    return Number(attrValue) < Number(val);
    case 'in': {
      var list = Array.isArray(val) ? val : String(val).split(',');
      return list.map(function (x) { return String(x).trim().toLowerCase(); }).indexOf(attr) !== -1;
    }
    case 'notIn': {
      var list2 = Array.isArray(val) ? val : String(val).split(',');
      return list2.map(function (x) { return String(x).trim().toLowerCase(); }).indexOf(attr) === -1;
    }
    default: return false;
  }
}

function matchesRule(rule, userAttributes) {
  if (!rule.conditions || rule.conditions.length === 0) return false;
  return rule.conditions.every(function (c) { return matchesCondition(c, userAttributes); });
}

function getVariationValue(flag, index) {
  if (flag.type === 'boolean') return index === 0 ? true : false;
  return (flag.variations && flag.variations[index]) ? flag.variations[index].value : null;
}

/**
 * Evaluate a single flag for a given user. Matches the server-side algorithm exactly.
 * @returns {{ enabled, value, reason, bucket, variationIndex }}
 */
function evaluate(flag, userId, userAttributes) {
  userAttributes = userAttributes || {};

  if (!flag.enabled) {
    return { enabled: false, value: null, bucket: null, reason: 'FLAG_DISABLED', variationIndex: null };
  }

  if (flag.rules && flag.rules.length > 0) {
    for (var i = 0; i < flag.rules.length; i++) {
      var rule = flag.rules[i];
      if (matchesRule(rule, userAttributes)) {
        var bucket  = getBucket(flag.name, userId);
        var rollout = (rule.rollout !== undefined ? rule.rollout : 100);
        if (bucket < rollout) {
          var vi    = (rule.serve !== undefined ? rule.serve : 0);
          var value = getVariationValue(flag, vi);
          return {
            enabled:         flag.type === 'boolean' ? value === true : true,
            value:           value,
            bucket:          parseFloat(bucket.toFixed(4)),
            reason:          'RULE_MATCH',
            ruleDescription: rule.description || '',
            variationIndex:  vi,
          };
        }
      }
    }
  }

  if (flag.rolloutPercentage === 100) {
    var vi2    = (flag.defaultVariation !== undefined ? flag.defaultVariation : 0);
    var value2 = getVariationValue(flag, vi2);
    return {
      enabled:        flag.type === 'boolean' ? value2 === true : true,
      value:          value2,
      bucket:         100,
      reason:         'FULL_ROLLOUT',
      variationIndex: vi2,
    };
  }

  if (flag.rolloutPercentage === 0) {
    return { enabled: false, value: null, bucket: 0, reason: 'ZERO_ROLLOUT', variationIndex: null };
  }

  var bucket2  = getBucket(flag.name, userId);
  var inRollout = bucket2 < flag.rolloutPercentage;
  var vi3       = inRollout ? (flag.defaultVariation !== undefined ? flag.defaultVariation : 0) : null;
  var value3    = inRollout ? getVariationValue(flag, vi3) : null;

  return {
    enabled:        inRollout && (flag.type === 'boolean' ? value3 === true : true),
    value:          value3,
    bucket:         parseFloat(bucket2.toFixed(4)),
    reason:         inRollout ? 'IN_ROLLOUT' : 'OUT_OF_ROLLOUT',
    variationIndex: vi3,
  };
}

// ── HTTP helper — uses native Node http/https (no extra deps) ─────────────────
function httpGet(targetUrl, headers) {
  return new Promise(function (resolve, reject) {
    var parsed  = url.parse(targetUrl);
    var lib     = parsed.protocol === 'https:' ? https : http;
    var options = {
      hostname: parsed.hostname,
      port:     parsed.port,
      path:     parsed.path,
      method:   'GET',
      headers:  headers || {},
    };

    var req = lib.request(options, function (res) {
      var body = '';
      res.on('data', function (chunk) { body += chunk; });
      res.on('end', function () {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Could not parse JSON response')); }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, function () { req.destroy(new Error('Request timed out')); });
    req.end();
  });
}

// ── SwitchOnServer ────────────────────────────────────────────────────────────
function SwitchOnServer(opts) {
  if (!opts || !opts.apiUrl)  throw new Error('[SwitchOn] apiUrl is required');
  if (!opts || !opts.sdkKey)  throw new Error('[SwitchOn] sdkKey is required');

  this._apiUrl      = opts.apiUrl.replace(/\/$/, '');
  this._sdkKey      = opts.sdkKey;
  this._environment = opts.environment  || DEFAULTS.environment;
  this._pollInterval= opts.pollInterval || DEFAULTS.pollInterval;
  this._debug       = opts.debug        || DEFAULTS.debug;

  this._flags      = {};   // name → flag document
  this._pollTimer  = null;
  this._ready      = false;
}

// ── Public: init() ────────────────────────────────────────────────────────────
SwitchOnServer.prototype.init = function () {
  var self = this;
  return this._fetchFlags().then(function () {
    self._ready = true;
    self._startPolling();
    self._log('Server SDK initialized,', Object.keys(self._flags).length, 'flags loaded');
    return self;
  });
};

// ── Public: variation(flagName, userId, userAttributes, defaultValue) ─────────
SwitchOnServer.prototype.variation = function (flagName, userId, userAttributes, defaultValue) {
  if (defaultValue === undefined) defaultValue = false;
  if (!this._ready) {
    this._log('warn: SDK not initialized, returning default for', flagName);
    return defaultValue;
  }
  var flag = this._flags[flagName];
  if (!flag) return defaultValue;

  var result = evaluate(flag, userId, userAttributes || {});
  if (flag.type === 'boolean') return result.enabled;
  return result.value !== null && result.value !== undefined ? result.value : defaultValue;
};

// ── Public: isEnabled(flagName, userId, userAttributes) ───────────────────────
SwitchOnServer.prototype.isEnabled = function (flagName, userId, userAttributes) {
  return this.variation(flagName, userId, userAttributes, false) === true;
};

// ── Public: evaluateAll(userId, userAttributes) ───────────────────────────────
// Evaluate every known flag for a user in one call. Returns a plain object:
// { flagName: value, … }
SwitchOnServer.prototype.evaluateAll = function (userId, userAttributes) {
  var self = this;
  var out  = {};
  Object.keys(this._flags).forEach(function (name) {
    out[name] = self.variation(name, userId, userAttributes);
  });
  return out;
};

// ── Public: flagNames() ───────────────────────────────────────────────────────
SwitchOnServer.prototype.flagNames = function () {
  return Object.keys(this._flags);
};

// ── Public: middleware([options]) ─────────────────────────────────────────────
// Express / Connect middleware. Adds `req.flags` with isEnabled() and variation().
// By default, userId is taken from req.user.id or req.user._id (most auth libs),
// then from the X-User-Id header, falling back to 'anonymous'.
//
// Customise:
//   app.use(flagClient.middleware({
//     getUserId:    (req) => req.auth.sub,
//     getAttributes:(req) => ({ plan: req.auth.plan }),
//   }))
SwitchOnServer.prototype.middleware = function (opts) {
  var self       = this;
  var getUserId  = (opts && opts.getUserId)     || defaultGetUserId;
  var getAttrs   = (opts && opts.getAttributes) || defaultGetAttributes;

  return function switchOnMiddleware(req, _res, next) {
    var userId = getUserId(req);
    var attrs  = getAttrs(req);

    req.flags = {
      isEnabled:  function (name)                { return self.isEnabled(name, userId, attrs); },
      variation:  function (name, defaultValue)  { return self.variation(name, userId, attrs, defaultValue); },
      evaluateAll:function ()                    { return self.evaluateAll(userId, attrs); },
      userId:     userId,
      attributes: attrs,
    };

    next();
  };
};

// ── Public: close() ───────────────────────────────────────────────────────────
SwitchOnServer.prototype.close = function () {
  if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
  this._ready = false;
  this._log('Server SDK closed');
};

// ── Internal: fetch all flag configs from the API ─────────────────────────────
SwitchOnServer.prototype._fetchFlags = function () {
  var self = this;
  var endpoint = this._apiUrl + '/api/evaluate/_all?environment=' + encodeURIComponent(this._environment);

  return httpGet(endpoint, { 'X-Consumer-Key': this._sdkKey })
    .then(function (data) {
      var newFlags = {};
      (data.flags || []).forEach(function (f) { newFlags[f.name] = f; });
      self._flags = newFlags;
      self._log('Flags refreshed:', Object.keys(newFlags).length, 'loaded');
    })
    .catch(function (err) {
      self._log('warn: Failed to fetch flags:', err.message);
    });
};

// ── Internal: background polling ──────────────────────────────────────────────
SwitchOnServer.prototype._startPolling = function () {
  var self = this;
  this._pollTimer = setInterval(function () {
    self._fetchFlags();
  }, this._pollInterval);

  // Don't keep the Node process alive just for polling
  if (this._pollTimer.unref) this._pollTimer.unref();
};

// ── Internal: logger ──────────────────────────────────────────────────────────
SwitchOnServer.prototype._log = function () {
  if (this._debug) {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[SwitchOn/node]');
    console.log.apply(console, args);
  }
};

// ── Default middleware helpers ────────────────────────────────────────────────
function defaultGetUserId(req) {
  if (req.user) return String(req.user.id || req.user._id || req.user.sub || 'anonymous');
  return req.headers['x-user-id'] || 'anonymous';
}

function defaultGetAttributes(req) {
  if (!req.user) return {};
  return {
    plan:    req.user.plan    || req.user.tier   || undefined,
    role:    req.user.role    || undefined,
    country: req.user.country || undefined,
    email:   req.user.email   || undefined,
  };
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports               = SwitchOnServer;
module.exports.SwitchOnServer= SwitchOnServer;
module.exports.evaluate      = evaluate;   // expose for custom use cases
module.exports.getBucket     = getBucket;
