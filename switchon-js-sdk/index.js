/**
 * SwitchOn JavaScript SDK
 * Connects to a SwitchOn feature flag server, streams real-time flag updates
 * via SSE, and evaluates flags per-user with optional attribute targeting.
 *
 * Usage:
 *   const client = new SwitchOnClient({
 *     apiUrl:      'https://your-api.render.com',
 *     consumerKey: 'your-consumer-api-key',
 *     environment: 'production',
 *   });
 *
 *   await client.init('user-123', { plan: 'premium', country: 'IN' });
 *
 *   const showBuyNow = client.variation('feature-buy-now', false);
 *   const ctaText    = client.variation('checkout-cta-text', 'Add to Cart');
 *
 *   client.on('change', (flagName, newValue) => {
 *     console.log(`${flagName} changed to`, newValue);
 *   });
 */

class SwitchOnClient {
  constructor({ apiUrl, consumerKey, environment = 'development', debug = false }) {
    if (!apiUrl)      throw new Error('[SwitchOn] apiUrl is required');
    if (!consumerKey) throw new Error('[SwitchOn] consumerKey is required');

    this._apiUrl      = apiUrl.replace(/\/$/, '');
    this._consumerKey = consumerKey;
    this._environment = environment;
    this._debug       = debug;

    this._userId         = null;
    this._userAttributes = {};
    this._flags          = {};     // raw flag objects { name → flagObj }
    this._evaluated      = {};     // per-user results  { name → value }
    this._listeners      = {};     // event listeners   { event → [fn] }
    this._es             = null;   // EventSource
    this._ready          = false;
  }

  // ── Init ────────────────────────────────────────────────────────────
  async init(userId, userAttributes = {}) {
    this._userId         = userId;
    this._userAttributes = userAttributes;

    await this._loadAllFlags();
    this._connectSSE();

    this._ready = true;
    this._log('Initialized for user:', userId);
    return this;
  }

  // ── Flag evaluation ─────────────────────────────────────────────────
  // Returns the evaluated value for the current user, or defaultValue if unavailable
  variation(flagName, defaultValue = false) {
    if (!this._ready) {
      this._log('warn: SDK not initialized, returning default for', flagName);
      return defaultValue;
    }
    if (flagName in this._evaluated) return this._evaluated[flagName];
    return defaultValue;
  }

  // Convenience: returns boolean true/false (for boolean-type flags)
  isEnabled(flagName) {
    return this.variation(flagName, false) === true;
  }

  // ── Re-identify (switch user) ───────────────────────────────────────
  async identify(userId, userAttributes = {}) {
    this._userId         = userId;
    this._userAttributes = userAttributes;
    this._evaluated      = {};
    await this._evaluateAll();
    this._emit('ready', this._evaluated);
  }

  // ── Event system ────────────────────────────────────────────────────
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return this;
  }

  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  }

  _emit(event, ...args) {
    (this._listeners[event] || []).forEach(fn => fn(...args));
  }

  // ── Destroy ─────────────────────────────────────────────────────────
  destroy() {
    if (this._es) { this._es.close(); this._es = null; }
    this._ready = false;
    this._log('Destroyed');
  }

  // ── Internal: load all flags via evaluate endpoint ──────────────────
  async _loadAllFlags() {
    try {
      // Fetch flag list first
      const url  = `${this._apiUrl}/api/evaluate/_all?environment=${this._environment}`;
      const resp = await fetch(url, { headers: { 'X-Consumer-Key': this._consumerKey } });

      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.flags)) {
          data.flags.forEach(f => { this._flags[f.name] = f; });
        }
      }
      await this._evaluateAll();
    } catch (e) {
      this._log('warn: Could not pre-load flags:', e.message);
    }
  }

  // ── Internal: evaluate all known flags for current user in parallel ─
  async _evaluateAll() {
    const names = Object.keys(this._flags);
    if (names.length === 0) return;

    const results = await Promise.all(names.map(name => this._evaluateOne(name)));
    names.forEach((name, i) => {
      const prev = this._evaluated[name];
      this._evaluated[name] = results[i];
      if (prev !== undefined && prev !== results[i]) {
        this._emit('change', name, results[i], prev);
      }
    });

    this._emit('ready', this._evaluated);
  }

  // ── Internal: evaluate a single flag via REST ───────────────────────
  async _evaluateOne(flagName) {
    try {
      const attrs = encodeURIComponent(JSON.stringify(this._userAttributes));
      const url   = `${this._apiUrl}/api/evaluate/${flagName}?userId=${encodeURIComponent(this._userId)}&environment=${this._environment}&userAttributes=${attrs}`;
      const resp  = await fetch(url, { headers: { 'X-Consumer-Key': this._consumerKey } });
      if (!resp.ok) return this._flags[flagName]?.enabled ?? false;
      const data = await resp.json();
      // Return variation value for multivariate, boolean enabled for boolean
      return data.type === 'boolean' ? data.enabled : data.value;
    } catch {
      return this._flags[flagName]?.enabled ?? false;
    }
  }

  // ── Internal: SSE connection for real-time updates ──────────────────
  _connectSSE() {
    if (this._es) this._es.close();

    const url = `${this._apiUrl}/sse/flags?environment=${this._environment}`;

    // SSE requires the consumer key — pass via URL param since EventSource can't set headers
    const sseUrl = `${url}&consumerKey=${this._consumerKey}`;

    try {
      this._es = new EventSource(sseUrl);

      this._es.addEventListener('FLAG_SNAPSHOT', async (e) => {
        const data = JSON.parse(e.data);
        data.flags.forEach(f => { this._flags[f.name] = f; });
        await this._evaluateAll();
        this._emit('snapshot', this._evaluated);
      });

      ['FLAG_CREATED', 'FLAG_UPDATED', 'FLAG_DELETED', 'FLAG_TOGGLED'].forEach(evt => {
        this._es.addEventListener(evt, async (e) => {
          const { flag } = JSON.parse(e.data);
          if (evt === 'FLAG_DELETED') {
            delete this._flags[flag.name];
            delete this._evaluated[flag.name];
            this._emit('change', flag.name, undefined);
          } else {
            this._flags[flag.name] = flag;
            const newVal = await this._evaluateOne(flag.name);
            const oldVal = this._evaluated[flag.name];
            this._evaluated[flag.name] = newVal;
            if (oldVal !== newVal) this._emit('change', flag.name, newVal, oldVal);
          }
          this._emit('flagUpdate', flag, evt);
        });
      });

      this._es.onopen  = () => { this._emit('connected'); this._log('SSE connected'); };
      this._es.onerror = () => { this._emit('disconnected'); this._log('SSE disconnected'); };

    } catch (e) {
      this._log('SSE not available:', e.message);
    }
  }

  _log(...args) {
    if (this._debug) console.log('[SwitchOn]', ...args);
  }
}

// ── Export ────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SwitchOnClient;
} else if (typeof window !== 'undefined') {
  window.SwitchOnClient = SwitchOnClient;
}
