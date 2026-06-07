/**
 * SwitchOn Browser SDK
 *
 * Connects to a SwitchOn feature-flag server, evaluates flags per user in a
 * single batch round-trip, then keeps them live via Server-Sent Events (SSE).
 *
 * Quick start:
 *   const client = new SwitchOnClient({
 *     apiUrl:      'https://flags.yourapp.com',
 *     sdkKey:      'sdk-prod-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
 *     environment: 'production',
 *   });
 *
 *   await client.init('user-123', { plan: 'pro', country: 'IN' });
 *
 *   if (client.isEnabled('new-checkout')) { ... }
 *   const label = client.variation('cta-text', 'Buy Now');
 *
 *   client.on('change', (flagName, newValue, oldValue) => {
 *     // re-render affected component
 *   });
 */

'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────
var SSE_RECONNECT_BASE  = 1000;   // ms — initial backoff
var SSE_RECONNECT_MAX   = 30000;  // ms — cap
var SSE_EVENTS          = ['FLAG_CREATED', 'FLAG_UPDATED', 'FLAG_DELETED', 'FLAG_TOGGLED'];

// ── SwitchOnClient ────────────────────────────────────────────────────────────
function SwitchOnClient(opts) {
  if (!opts || !opts.apiUrl)  throw new Error('[SwitchOn] apiUrl is required');
  if (!opts || !opts.sdkKey)  throw new Error('[SwitchOn] sdkKey is required');

  this._apiUrl      = opts.apiUrl.replace(/\/$/, '');
  this._sdkKey      = opts.sdkKey;
  this._environment = opts.environment || 'production';
  this._debug       = opts.debug       || false;

  this._userId         = null;
  this._userAttributes = {};
  this._flags          = {};      // name → raw flag document
  this._evaluated      = {};      // name → current value for this user
  this._listeners      = {};
  this._es             = null;    // EventSource
  this._sseBackoff     = SSE_RECONNECT_BASE;
  this._sseTimer       = null;
  this._ready          = false;
  this._readyPromise   = null;
  this._resolveReady   = null;

  // Promise that resolves after the first successful init()
  var self = this;
  this._readyPromise = new Promise(function (resolve) {
    self._resolveReady = resolve;
  });
}

// ── Public: init(userId, attributes) ────────────────────────────────────────
SwitchOnClient.prototype.init = function (userId, userAttributes) {
  this._userId         = userId;
  this._userAttributes = userAttributes || {};

  var self = this;
  return this._loadAndEvaluate().then(function () {
    self._connectSSE();
    self._ready = true;
    self._resolveReady(self._evaluated);
    self._log('Initialized for user:', userId);
    return self;
  });
};

// ── Public: waitUntilReady() ─────────────────────────────────────────────────
// Returns a promise that resolves (with the evaluated flags map) once init()
// completes. Safe to call before init() is called.
SwitchOnClient.prototype.waitUntilReady = function () {
  return this._readyPromise;
};

// ── Public: variation(flagName, defaultValue) ────────────────────────────────
// Returns the evaluated value for the current user, or defaultValue if the flag
// is not found or the SDK is not yet ready.
SwitchOnClient.prototype.variation = function (flagName, defaultValue) {
  if (defaultValue === undefined) defaultValue = false;
  if (!this._ready) {
    this._log('warn: SDK not initialized, returning default for', flagName);
    return defaultValue;
  }
  return (flagName in this._evaluated) ? this._evaluated[flagName] : defaultValue;
};

// ── Public: isEnabled(flagName) ─────────────────────────────────────────────
// Convenience method for boolean flags.
SwitchOnClient.prototype.isEnabled = function (flagName) {
  return this.variation(flagName, false) === true;
};

// ── Public: allFlags() ──────────────────────────────────────────────────────
// Returns a shallow copy of the current evaluated-flags map.
SwitchOnClient.prototype.allFlags = function () {
  return Object.assign({}, this._evaluated);
};

// ── Public: identify(userId, attributes) ────────────────────────────────────
// Re-evaluate all flags for a different user (e.g. after login).
SwitchOnClient.prototype.identify = function (userId, userAttributes) {
  this._userId         = userId;
  this._userAttributes = userAttributes || {};
  this._evaluated      = {};
  var self = this;
  return this._evaluateBatch(Object.keys(this._flags)).then(function (results) {
    self._applyResults(results);
    self._emit('ready', self._evaluated);
    return self._evaluated;
  });
};

// ── Public: on / off ────────────────────────────────────────────────────────
SwitchOnClient.prototype.on = function (event, fn) {
  if (!this._listeners[event]) this._listeners[event] = [];
  this._listeners[event].push(fn);
  return this;
};

SwitchOnClient.prototype.off = function (event, fn) {
  if (!this._listeners[event]) return;
  this._listeners[event] = this._listeners[event].filter(function (f) { return f !== fn; });
};

// ── Public: destroy() ───────────────────────────────────────────────────────
SwitchOnClient.prototype.destroy = function () {
  if (this._sseTimer) { clearTimeout(this._sseTimer); this._sseTimer = null; }
  if (this._es)       { this._es.close(); this._es = null; }
  this._ready = false;
  this._log('Destroyed');
};

// ── Internal: load all flag configs then batch-evaluate ──────────────────────
SwitchOnClient.prototype._loadAndEvaluate = function () {
  var self = this;
  var url  = this._apiUrl + '/api/evaluate/_all?environment=' + encodeURIComponent(this._environment);

  return fetch(url, { headers: { 'X-Consumer-Key': this._sdkKey } })
    .then(function (res) { return res.ok ? res.json() : { flags: [] }; })
    .then(function (data) {
      (data.flags || []).forEach(function (f) { self._flags[f.name] = f; });
      return self._evaluateBatch(Object.keys(self._flags));
    })
    .then(function (results) {
      self._applyResults(results);
    })
    .catch(function (err) {
      self._log('warn: Could not load flags:', err.message);
    });
};

// ── Internal: call POST /api/evaluate/batch ──────────────────────────────────
SwitchOnClient.prototype._evaluateBatch = function (names) {
  if (!names || names.length === 0) return Promise.resolve({});
  var self = this;
  var url  = this._apiUrl + '/api/evaluate/batch';

  return fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':   'application/json',
      'X-Consumer-Key': this._sdkKey,
    },
    body: JSON.stringify({
      flags:          names,
      userId:         this._userId,
      environment:    this._environment,
      userAttributes: this._userAttributes,
    }),
  })
    .then(function (res) { return res.ok ? res.json() : { results: {} }; })
    .then(function (data) { return data.results || {}; })
    .catch(function (err) {
      self._log('warn: Batch evaluation failed:', err.message);
      return {};
    });
};

// ── Internal: apply batch results, fire 'change' for any that shifted ────────
SwitchOnClient.prototype._applyResults = function (results) {
  var self = this;
  Object.keys(results).forEach(function (name) {
    var r       = results[name];
    var newVal  = r.type === 'boolean' ? r.enabled : (r.value !== undefined ? r.value : r.enabled);
    var oldVal  = self._evaluated[name];
    self._evaluated[name] = newVal;
    if (oldVal !== undefined && oldVal !== newVal) {
      self._emit('change', name, newVal, oldVal);
    }
  });
};

// ── Internal: SSE connection with exponential backoff ───────────────────────
SwitchOnClient.prototype._connectSSE = function () {
  if (this._es) { this._es.close(); this._es = null; }

  var sseUrl = this._apiUrl + '/sse/flags'
    + '?environment=' + encodeURIComponent(this._environment)
    + '&consumerKey='  + encodeURIComponent(this._sdkKey);

  var self = this;

  try {
    var es = new EventSource(sseUrl);
    this._es = es;

    es.addEventListener('FLAG_SNAPSHOT', function (e) {
      try {
        var data = JSON.parse(e.data);
        (data.flags || []).forEach(function (f) { self._flags[f.name] = f; });
        self._evaluateBatch(Object.keys(self._flags)).then(function (results) {
          self._applyResults(results);
          self._emit('snapshot', self._evaluated);
        });
      } catch (err) { self._log('warn: SNAPSHOT parse error', err); }
    });

    SSE_EVENTS.forEach(function (evt) {
      es.addEventListener(evt, function (e) {
        try {
          var payload = JSON.parse(e.data);
          var flag    = payload.flag;
          if (!flag) return;

          if (evt === 'FLAG_DELETED') {
            delete self._flags[flag.name];
            var old = self._evaluated[flag.name];
            delete self._evaluated[flag.name];
            self._emit('change', flag.name, undefined, old);
          } else {
            self._flags[flag.name] = flag;
            self._evaluateBatch([flag.name]).then(function (results) {
              self._applyResults(results);
            });
          }
          self._emit('flagUpdate', flag, evt);
        } catch (err) { self._log('warn: SSE parse error', err); }
      });
    });

    es.onopen = function () {
      self._sseBackoff = SSE_RECONNECT_BASE; // reset on successful connect
      self._emit('connected');
      self._log('SSE connected');
    };

    es.onerror = function () {
      self._emit('disconnected');
      self._log('SSE error, reconnecting in', self._sseBackoff, 'ms');
      es.close();
      self._es = null;
      self._sseTimer = setTimeout(function () {
        self._sseBackoff = Math.min(self._sseBackoff * 2, SSE_RECONNECT_MAX);
        self._connectSSE();
      }, self._sseBackoff);
    };

  } catch (err) {
    this._log('SSE unavailable:', err.message);
  }
};

// ── Internal: event emitter ──────────────────────────────────────────────────
SwitchOnClient.prototype._emit = function (event) {
  var args = Array.prototype.slice.call(arguments, 1);
  var fns  = this._listeners[event] || [];
  fns.forEach(function (fn) { fn.apply(null, args); });
};

SwitchOnClient.prototype._log = function () {
  if (this._debug) {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[SwitchOn]');
    console.log.apply(console, args);
  }
};

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = SwitchOnClient;
module.exports.SwitchOnClient = SwitchOnClient;
module.exports.default         = SwitchOnClient;
