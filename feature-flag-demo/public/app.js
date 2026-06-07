// ── Demo Users ────────────────────────────────────────────────────────
// Loaded dynamically from /api/evaluate/_users (real dashboard users).
// Falls back to these defaults if the API is unreachable.
const FALLBACK_USERS = [
  { id: 'shopon-demo-uid-001', label: 'Priya Sharma',  email: 'priya.sharma@gmail.com',   color: '#6366f1', initial: 'PS', plan: 'enterprise', role: 'admin',     note: 'Admin' },
  { id: 'shopon-demo-uid-002', label: 'James Carter',  email: 'james.carter@outlook.com', color: '#ec4899', initial: 'JC', plan: 'pro',        role: 'developer', note: 'Developer' },
  { id: 'shopon-demo-uid-018', label: 'Yuki Tanaka',   email: 'yuki.tanaka@yahoo.co.jp',  color: '#f59e0b', initial: 'YT', plan: 'free',       role: 'viewer',    note: 'Viewer' },
];

// Will be populated by loadDemoUsers() before initApp() is called
let DEMO_USERS = [];

// ── Products Data ─────────────────────────────────────────────────────
const PRODUCTS = [
  { id: 1,  name: 'Air Flux Pro',          category: 'Footwear',    price: 160,  original: 200,  rating: 4.9, reviews: 8241,  emoji: '👟', bg: 'linear-gradient(135deg,#0a0a0a,#1a1a1a)', badge: 'Best Seller', badgeClass: '',      emi: 14  },
  { id: 2,  name: 'Speed Force Runner',    category: 'Footwear',    price: 140,  original: 175,  rating: 4.7, reviews: 5312,  emoji: '🏃', bg: 'linear-gradient(135deg,#111,#2a2a2a)',     badge: 'New',         badgeClass: 'new-badge',  emi: null },
  { id: 3,  name: 'Cloud Stride X',        category: 'Footwear',    price: 120,  original: 150,  rating: 4.6, reviews: 3890,  emoji: '🥾', bg: 'linear-gradient(135deg,#1a1a2e,#0f3460)', badge: null,          badgeClass: '',      emi: null },
  { id: 4,  name: 'Court Elite Low',       category: 'Footwear',    price: 95,   original: 120,  rating: 4.4, reviews: 2107,  emoji: '👞', bg: 'linear-gradient(135deg,#1e293b,#334155)', badge: 'Sale',        badgeClass: 'sale-badge', emi: null },
  { id: 5,  name: 'Wind Runner Jacket',    category: 'Apparel',     price: 130,  original: 170,  rating: 4.8, reviews: 4521,  emoji: '🧥', bg: 'linear-gradient(135deg,#0f0f0f,#282828)', badge: 'Top Rated',   badgeClass: '',      emi: 11  },
  { id: 6,  name: 'Performance Hoodie',    category: 'Apparel',     price: 85,   original: 110,  rating: 4.5, reviews: 6703,  emoji: '🥷', bg: 'linear-gradient(135deg,#1c1c1c,#2d2d2d)', badge: null,          badgeClass: '',      emi: null },
  { id: 7,  name: 'Pro Training Tee',      category: 'Apparel',     price: 45,   original: 60,   rating: 4.3, reviews: 9210,  emoji: '👕', bg: 'linear-gradient(135deg,#0d1b2a,#1b263b)', badge: null,          badgeClass: '',      emi: null },
  { id: 8,  name: 'Compression Tights',   category: 'Apparel',     price: 65,   original: 85,   rating: 4.6, reviews: 3341,  emoji: '🩱', bg: 'linear-gradient(135deg,#111,#1e1e1e)',     badge: 'New',         badgeClass: 'new-badge',  emi: null },
  { id: 9,  name: 'Apex Speed Cap',        category: 'Accessories', price: 35,   original: 45,   rating: 4.7, reviews: 7823,  emoji: '🧢', bg: 'linear-gradient(135deg,#0a0a0a,#222)',     badge: null,          badgeClass: '',      emi: null },
  { id: 10, name: 'Pro Gym Bag 30L',       category: 'Accessories', price: 80,   original: 105,  rating: 4.5, reviews: 2985,  emoji: '🎒', bg: 'linear-gradient(135deg,#1a1a1a,#333)',     badge: null,          badgeClass: '',      emi: null },
  { id: 11, name: 'Hydro Flask 32oz',      category: 'Accessories', price: 42,   original: 55,   rating: 4.8, reviews: 11200, emoji: '🫙', bg: 'linear-gradient(135deg,#0f2027,#203a43)',  badge: 'Best Seller', badgeClass: '',      emi: null },
  { id: 12, name: 'Resistance Band Kit',   category: 'Accessories', price: 38,   original: 50,   rating: 4.4, reviews: 4102,  emoji: '💪', bg: 'linear-gradient(135deg,#1a1a2e,#16213e)', badge: 'Sale',        badgeClass: 'sale-badge', emi: null },
];

const RECO_PRODUCTS = [
  { name: 'Trail Blazer Pro',   emoji: '🏔️', price: '$180', match: '98% match' },
  { name: 'Run Sock 6-Pack',    emoji: '🧦', price: '$28',  match: '96% match' },
  { name: 'Speed Belt Bag',     emoji: '👝', price: '$45',  match: '93% match' },
  { name: 'Recovery Slides',    emoji: '🩴', price: '$55',  match: '90% match' },
  { name: 'Sports Sunglasses',  emoji: '🕶️', price: '$70',  match: '87% match' },
  { name: 'Volt Energy Gel',    emoji: '⚡', price: '$22',  match: '84% match' },
];

// ── App State ─────────────────────────────────────────────────────────
let currentFilter   = 'all';
let cartCount       = 2;
let wishlistItems   = new Set();
let flashCountdown  = 2 * 3600 + 47 * 60 + 33;
let toastTimer;
let userMenuOpen    = false;

// ── URL param: ?user=0 | 1 | 2 | … (index into DEMO_USERS) ──────────
// When set, this window is locked to that user (used by split.html iframes).
const _urlUser  = new URLSearchParams(location.search).get('user');
let _lockedUser = false;
let currentUserIdx = 0;

// Called after DEMO_USERS is populated to resolve the URL param
function resolveUrlUser() {
  if (!_urlUser) return;
  _lockedUser = true;
  const idx = parseInt(_urlUser, 10);
  currentUserIdx = isNaN(idx) ? 0 : Math.min(Math.max(idx, 0), DEMO_USERS.length - 1);
}

function currentUser() { return DEMO_USERS[currentUserIdx] || FALLBACK_USERS[0]; }

// ── Flag state ────────────────────────────────────────────────────────
let _flags     = {};   // raw flag objects from SSE  { name → flagObj }
let _evaluated = {};   // per-user evaluated results  { name → boolean }
let _env       = 'development';

// isOn() uses per-user evaluated result.
// Falls back to global enabled if evaluation hasn't run yet.
function isOn(name) {
  if (name in _evaluated) return _evaluated[name];
  if (name in _flags)     return _flags[name].enabled;
  return true; // flag not in dashboard → show by default
}

// ── Per-user evaluation via batch API ────────────────────────────────
// One POST /api/evaluate/batch call instead of N individual GET requests.
// This prevents rate-limit exhaustion on the split-screen view where
// multiple iframes each evaluate all flags simultaneously.
async function evaluateAllFlags() {
  const names = Object.keys(_flags);
  if (names.length === 0) return;

  try {
    const u = currentUser();
    const r = await fetch('/api/evaluate/batch', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        flags:          names,
        userId:         u.id,
        environment:    _env,
        userAttributes: { plan: u.plan, country: u.country || '', email: u.email },
      }),
    });

    if (!r.ok) throw new Error(`batch ${r.status}`);
    const d = await r.json();

    names.forEach(name => {
      const res = d.results?.[name];
      if (!res || !res.found) {
        _evaluated[name] = _flags[name]?.enabled ?? true;
        return;
      }
      // Boolean flags → use enabled; multivariate → use value
      _evaluated[name] = res.type === 'boolean' ? res.enabled : res.value;
    });
  } catch {
    // Network/rate error — fall back to the global enabled state from SSE snapshot
    names.forEach(name => { _evaluated[name] = _flags[name]?.enabled ?? true; });
  }

  applyFlags();
  renderFlagPanel();
}

// ── Startup: load config → load real users → boot app ────────────────
async function loadDemoUsers() {
  try {
    const r    = await fetch('/api/evaluate/_users');
    const data = await r.json();
    if (Array.isArray(data.users) && data.users.length > 0) {
      DEMO_USERS = data.users.map(u => ({
        id:      u.id,
        label:   u.name,
        email:   u.email,
        color:   u.color,
        initial: u.initials,
        plan:    u.plan,
        role:    u.role,
        note:    u.role.charAt(0).toUpperCase() + u.role.slice(1),
        // country not stored in DB — default to empty string
        country: '',
      }));
      return;
    }
  } catch {}
  // Fallback to hardcoded defaults
  DEMO_USERS = [...FALLBACK_USERS];
}

async function startup() {
  // 1. Load config (dashboard URL, environment)
  let cfg = {};
  try { cfg = await (await fetch('/config.json')).json(); } catch {}

  if (cfg.dashboardUrl) {
    const link   = document.getElementById('so-dashboard-link');
    const mlink  = document.getElementById('mobile-dashboard-link');
    if (link)  link.href  = cfg.dashboardUrl;
    if (mlink) mlink.href = cfg.dashboardUrl;
  }
  _env = cfg.environment || 'development';

  // 2. Load real users from the API (or fall back)
  await loadDemoUsers();

  // 3. Resolve ?user= URL param now that DEMO_USERS is populated
  resolveUrlUser();

  // 4. Boot the app
  initApp();
}

startup();

// ── App initialisation ────────────────────────────────────────────────
function initApp() {
  // In iframe/locked mode: hide chrome that clutters the embedded view
  if (_lockedUser) {
    const toHide = ['so-bar', 'so-guide', 'flag-widget'];
    toHide.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    document.body.style.paddingTop = '0';
    document.body.style.paddingBottom = '0';
  }

  renderUserSwitcher();
  renderProducts(PRODUCTS);
  renderRecos();
  startFlashTimer();
  startHeroCountdown();

  // ── SSE connection ────────────────────────────────────────────────
  const es = new EventSource(`/sse/flags?environment=${_env}`);

  function setSseStatus(connected) {
    const el = document.getElementById('sse-status');
    if (!el) return;
    el.innerHTML = connected
      ? '<div class="sse-dot"></div><span>Live — updates instant</span>'
      : '<div class="sse-dot" style="background:#ef4444;animation:none"></div><span>Reconnecting…</span>';
  }

  es.addEventListener('FLAG_SNAPSHOT', e => {
    const data = JSON.parse(e.data);
    data.flags.forEach(f => { _flags[f.name] = f; });
    setSseStatus(true);
    evaluateAllFlags(); // evaluate per-user, then apply + render
  });

  ['FLAG_CREATED', 'FLAG_UPDATED', 'FLAG_DELETED', 'FLAG_TOGGLED'].forEach(evt => {
    es.addEventListener(evt, e => {
      const { flag } = JSON.parse(e.data);
      if (evt === 'FLAG_DELETED') { delete _flags[flag.name]; delete _evaluated[flag.name]; }
      else _flags[flag.name] = flag;
      evaluateAllFlags();
    });
  });

  es.onopen  = () => setSseStatus(true);
  es.onerror = () => setSseStatus(false);

  // Search
  document.getElementById('search-input')?.addEventListener('input', e => {
    const q    = e.target.value.toLowerCase();
    const base = currentFilter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === currentFilter);
    const filtered = base.filter(p =>
      p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
    const sub = document.getElementById('products-sub');
    if (sub) sub.textContent = q
      ? `${filtered.length} results for "${e.target.value}"`
      : 'Showing all products';
    renderProducts(filtered);
  });

  // Close user menu on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.user-switcher')) closeUserMenu();
  });
}

// ── Apply flags to DOM ────────────────────────────────────────────────
function applyFlags() {
  setVisible('hero-section',            isOn('feature-hero-banner'),     'flex');
  setVisible('flash-section',           isOn('feature-flash-deal'),      'block');
  setVisible('promo-banner',            isOn('feature-promo-banner'),    'block');
  setVisible('recommendations-section', isOn('feature-recommendations'), 'block');
  setVisible('reviews-section',         isOn('feature-reviews'),         'block');
  setVisible('search-container',        isOn('feature-search-bar'),      'block');
  setVisible('loyalty-badge',           isOn('feature-loyalty-points'),  'flex');
  setVisible('wishlist-count',          isOn('feature-wishlist'),        'flex');
  document.body.classList.toggle('theme-dark-mode', isOn('theme-dark-mode'));
  renderProducts(getFilteredProducts());
}

function setVisible(id, show, displayVal = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = show ? displayVal : 'none';
}

// ── Flag panel — shows global state + per-user result ─────────────────
function renderFlagPanel() {
  const list = document.getElementById('flag-status-list');
  if (!list) return;

  const entries = Object.values(_flags);
  if (entries.length === 0) {
    list.innerHTML = '<div class="flag-status-loading">No flags yet.</div>';
    return;
  }

  const user = currentUser();

  // Header showing which user is being evaluated
  const header = `
    <div class="flag-panel-user">
      <span class="fp-user-dot" style="background:${user.color}"></span>
      <div>
        <strong>${user.label}</strong>
        <div style="font-size:0.68rem;color:var(--t3);margin-top:1px">${user.email}</div>
      </div>
    </div>
    <div class="flag-panel-legend">
      <span class="fp-legend-item"><span style="color:#10b981">●</span> Global ON</span>
      <span class="fp-legend-item"><span style="color:#d1d5db">●</span> Global OFF</span>
      <span class="fp-legend-item">✓/✗ = this user</span>
    </div>`;

  const rows = entries
    .sort((a, b) => (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0))
    .map(f => {
      const globalOn  = f.enabled;
      const userOn    = _evaluated[f.name];
      const evaluated = f.name in _evaluated;
      const userIcon  = evaluated ? (userOn ? '✓' : '✗') : '…';
      const userColor = evaluated ? (userOn ? '#10b981' : '#ef4444') : '#9ca3af';
      return `
        <div class="flag-status-item ${globalOn ? 'on' : ''}">
          <span class="flag-dot ${globalOn ? 'on' : 'off'}"></span>
          <span class="flag-status-name" title="${f.name}">${f.name}</span>
          <span class="flag-pct">${f.rolloutPercentage}%</span>
          <span class="flag-user-result" style="color:${userColor}" title="${user.label}: ${userOn ? 'IN' : 'OUT'}">${userIcon}</span>
        </div>`;
    }).join('');

  list.innerHTML = header + rows;
}

// ── User Switcher ─────────────────────────────────────────────────────
function renderUserSwitcher() {
  const container = document.getElementById('user-switcher');
  if (!container) return;
  const user = currentUser();

  // When loaded via ?user= param (i.e. inside split.html iframe),
  // show a slim identity badge instead of the full switcher.
  if (_lockedUser) {
    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.5rem;padding:0.3rem 0.75rem;border-radius:99px;background:${user.color}22;border:1px solid ${user.color}44">
        <div style="width:26px;height:26px;border-radius:50%;background:${user.color};display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;color:#fff">${user.initial}</div>
        <div>
          <div style="font-size:0.78rem;font-weight:600;color:${user.color}">${user.label}</div>
          <div style="font-size:0.66rem;color:var(--t3)">${user.plan} · ${user.country}</div>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="user-avatar-btn" style="background:${user.color}" onclick="toggleUserMenu(event)">
      ${user.initial}
      <span class="user-avatar-label">${user.label}</span>
    </div>
    <div class="user-menu" id="user-menu" style="display:none;">
      <div class="user-menu-title">👤 Switch Demo User</div>
      <div class="user-menu-sub">See how flags evaluate differently per user</div>
      ${DEMO_USERS.map((u, i) => `
        <div class="user-menu-item ${i === currentUserIdx ? 'active' : ''}" onclick="switchUser(${i})">
          <div class="user-menu-avatar" style="background:${u.color}">${u.initial}</div>
          <div class="user-menu-info">
            <div class="user-menu-name">${u.label} ${u.note ? `<span class="user-menu-note">${u.note}</span>` : ''}</div>
            <div class="user-menu-id">${u.email}</div>
          </div>
          ${i === currentUserIdx ? '<span class="user-menu-check">✓</span>' : ''}
        </div>`).join('')}
      <div class="user-menu-tip">💡 These users have different plans &amp; countries — targeting rules fire differently for each</div>
    </div>`;
}

function toggleUserMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('user-menu');
  if (!menu) return;
  userMenuOpen = !userMenuOpen;
  menu.style.display = userMenuOpen ? 'block' : 'none';
}

function closeUserMenu() {
  const menu = document.getElementById('user-menu');
  if (menu) menu.style.display = 'none';
  userMenuOpen = false;
}

async function switchUser(idx) {
  currentUserIdx = idx;
  _evaluated = {}; // clear old evaluations
  wishlistItems  = new Set();
  cartCount      = 2;

  // Update cart count in UI
  const cc = document.getElementById('cart-count');
  if (cc) cc.textContent = cartCount;

  closeUserMenu();
  renderUserSwitcher();

  // Re-evaluate all flags for new user
  showToast(`Switched to ${currentUser().label} — re-evaluating flags… ⚡`);
  await evaluateAllFlags();
}

// ── Render Products ───────────────────────────────────────────────────
function getFilteredProducts() {
  if (currentFilter === 'all') return PRODUCTS;
  return PRODUCTS.filter(p => p.category === currentFilter);
}

function renderProducts(list) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const showBuyNow = isOn('feature-buy-now');
  const showEmi    = isOn('feature-emi-options');
  const showWish   = isOn('feature-wishlist');
  const showDeliv  = isOn('feature-free-delivery');

  if (list.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-3);font-size:0.9rem;">No products found</div>';
    return;
  }

  grid.innerHTML = list.map(p => {
    const discount  = Math.round((1 - p.price / p.original) * 100);
    const fullStars = Math.floor(p.rating);
    const stars     = '★'.repeat(fullStars) + (p.rating - fullStars >= 0.5 ? '½' : '') +
                      '☆'.repeat(5 - fullStars - (p.rating - fullStars >= 0.5 ? 1 : 0));
    const wished    = wishlistItems.has(p.id);
    return `
    <div class="product-card">
      <div class="product-img" style="background:${p.bg};">
        <span class="product-img-emoji">${p.emoji}</span>
        ${p.badge ? `<span class="product-badge ${p.badgeClass}">${p.badge}</span>` : ''}
        <button class="wishlist-btn ${wished ? 'wishlisted' : ''}"
          style="display:${showWish ? 'flex' : 'none'}"
          onclick="toggleWishlist(event,${p.id})">${wished ? '❤️' : '🤍'}</button>
      </div>
      <div class="product-info">
        <div class="product-category">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-rating">
          <span class="stars">${stars}</span>
          <span class="rating-count">${p.rating} · ${p.reviews.toLocaleString()}</span>
        </div>
        <div class="product-price-row">
          <span class="product-price">$${p.price.toLocaleString()}</span>
          <span class="product-original">$${p.original.toLocaleString()}</span>
          <span class="product-discount">-${discount}%</span>
        </div>
        ${showEmi && p.emi ? `<div class="product-emi" style="display:block">0% EMI from $${p.emi}/mo</div>` : ''}
        ${showDeliv ? `<div class="product-delivery" style="display:block">✓ Free delivery · Ships in 2 days</div>` : ''}
        <div class="product-actions">
          <button class="btn-add-cart" onclick="addToCart('${p.name}')">Add to Bag</button>
          <button class="btn-buy-now" style="display:${showBuyNow ? 'block' : 'none'}"
            onclick="buyNow('${p.name}')">Buy Now</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Render Recommendations ────────────────────────────────────────────
function renderRecos() {
  const grid = document.getElementById('reco-grid');
  if (!grid) return;
  grid.innerHTML = RECO_PRODUCTS.map(r => `
    <div class="reco-card" onclick="addToCart('${r.name}')">
      <div class="reco-emoji">${r.emoji}</div>
      <div class="reco-name">${r.name}</div>
      <div class="reco-price">${r.price}</div>
      <div class="reco-match">${r.match}</div>
    </div>`
  ).join('');
}

// ── Filter ────────────────────────────────────────────────────────────
function filterProducts(cat, btn) {
  currentFilter = cat;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const filtered = getFilteredProducts();
  const sub = document.getElementById('products-sub');
  if (sub) sub.textContent = cat === 'all'
    ? `Showing all ${PRODUCTS.length} products`
    : `Showing ${filtered.length} ${cat} products`;
  renderProducts(filtered);
}

// ── Cart / Wishlist ───────────────────────────────────────────────────
function addToCart(name) {
  cartCount++;
  const cc = document.getElementById('cart-count');
  if (cc) cc.textContent = cartCount;
  showToast(`"${name}" added to cart 🛒`);
}

function buyNow(name) {
  showToast(`Proceeding to checkout for "${name}" ⚡`);
}

function toggleWishlist(event, id) {
  event.stopPropagation();
  if (wishlistItems.has(id)) wishlistItems.delete(id);
  else wishlistItems.add(id);
  const wc = document.getElementById('wishlist-count');
  if (wc) wc.textContent = wishlistItems.size;
  showToast(wishlistItems.has(id) ? 'Added to wishlist ❤️' : 'Removed from wishlist');
  renderProducts(getFilteredProducts());
}

// ── Toast ─────────────────────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('cart-toast');
  const text  = document.getElementById('cart-toast-text');
  if (!toast || !text) return;
  text.textContent = msg;
  toast.style.display = 'flex';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 2400);
}

// ── Flash Deal Countdown ──────────────────────────────────────────────
function startFlashTimer() {
  function tick() {
    if (flashCountdown <= 0) flashCountdown = 3 * 3600;
    flashCountdown--;
    const h = Math.floor(flashCountdown / 3600);
    const m = Math.floor((flashCountdown % 3600) / 60);
    const s = flashCountdown % 60;
    const fh = document.getElementById('flash-h');
    const fm = document.getElementById('flash-m');
    const fs = document.getElementById('flash-s');
    if (fh) fh.textContent = String(h).padStart(2, '0');
    if (fm) fm.textContent = String(m).padStart(2, '0');
    if (fs) fs.textContent = String(s).padStart(2, '0');
  }
  tick();
  setInterval(tick, 1000);
}

// ── Hero Countdown ────────────────────────────────────────────────────
function startHeroCountdown() {
  let heroSecs = 11 * 3600 + 59 * 60 + 42;
  function tick() {
    if (heroSecs <= 0) heroSecs = 86400;
    heroSecs--;
    const h = Math.floor(heroSecs / 3600);
    const m = Math.floor((heroSecs % 3600) / 60);
    const s = heroSecs % 60;
    const eh = document.getElementById('hero-countdown-h');
    const em = document.getElementById('hero-countdown-m');
    const es = document.getElementById('hero-countdown-s');
    if (eh) eh.textContent = String(h).padStart(2, '0');
    if (em) em.textContent = String(m).padStart(2, '0');
    if (es) es.textContent = String(s).padStart(2, '0');
  }
  tick();
  setInterval(tick, 1000);
}

// ── Expose globals ────────────────────────────────────────────────────
window.filterProducts = filterProducts;
window.addToCart      = addToCart;
window.buyNow         = buyNow;
window.toggleWishlist = toggleWishlist;
window.showToast      = showToast;
window.switchUser     = switchUser;
window.toggleUserMenu = toggleUserMenu;
