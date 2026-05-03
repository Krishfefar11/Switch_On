// ── Stable user ID ───────────────────────────────────────────────────────────
const userId = localStorage.getItem('ff_userId') || crypto.randomUUID();
localStorage.setItem('ff_userId', userId);

// ── SSE connection ────────────────────────────────────────────────────────────
const es = new EventSource('/sse/flags?environment=development');
const flags = {};   // flagName → flag object

function setSseStatus(connected) {
  const el = document.getElementById('sse-status');
  if (!el) return;
  el.innerHTML = connected
    ? '<div class="sse-dot"></div><span>Live — updates instant</span>'
    : '<div class="sse-dot" style="background:#ef4444;animation:none"></div><span>Reconnecting…</span>';
}

es.addEventListener('FLAG_SNAPSHOT', e => {
  const data = JSON.parse(e.data);
  data.flags.forEach(f => flags[f.name] = f);
  setSseStatus(true);
  applyFlags();
  renderFlagPanel();
});

['FLAG_CREATED','FLAG_UPDATED','FLAG_DELETED','FLAG_TOGGLED'].forEach(evt => {
  es.addEventListener(evt, e => {
    const { flag } = JSON.parse(e.data);
    if (evt === 'FLAG_DELETED') delete flags[flag.name];
    else flags[flag.name] = flag;
    applyFlags();
    renderFlagPanel();
  });
});

es.onopen  = () => setSseStatus(true);
es.onerror = () => setSseStatus(false);

// ── Evaluate a flag for this user ─────────────────────────────────────────────
async function evaluate(flagName) {
  try {
    const r = await fetch(`/api/evaluate/${flagName}?userId=${userId}&environment=development`);
    const data = await r.json();
    return data.result ? data.result.enabled : data.enabled;
  } catch {
    return false;
  }
}

// ── Flag → DOM element mapping ────────────────────────────────────────────────
const toggleMap = {
  'feature-search-bar':       'search-container',
  'feature-trash-bin':        'trash-link',
  'premium-cloud-sync':       'cloud-sync-btn',
  'feature-export-pdf':       'export-pdf-btn',
  'feature-share-notes':      'share-notes-btn',
  'feature-rich-text':        'rich-text-toolbar',
  'feature-image-attachments':'attach-img-btn',
  'feature-voice-notes':      'voice-note-btn',
  'feature-categories-tags':  'tags-container',
  'feature-word-count':       'word-count',
  'feature-auto-save':        'auto-save-indicator',
  'reminder-snooze-button':   'snooze-btn',
  'reminder-email-sync':      'email-sync-btn',
};

const classMap = {
  'theme-dark-mode':  'theme-dark-mode',
  'ui-custom-fonts':  'ui-custom-fonts',
  'ui-compact-view':  'ui-compact-view',
  'ui-animations':    'ui-animations',
};

// ── Apply all flags to the DOM ────────────────────────────────────────────────
async function applyFlags() {
  const evaluated = {};
  for (const name of Object.keys(flags)) {
    evaluated[name] = await evaluate(name);
  }
  window.featureFlagsState = evaluated;

  // CSS class flags on body
  for (const [flagName, className] of Object.entries(classMap)) {
    document.body.classList.toggle(className, !!evaluated[flagName]);
  }

  // Custom font link enable/disable
  const fontLink = document.getElementById('custom-font-link');
  if (fontLink) fontLink.disabled = !evaluated['ui-custom-fonts'];

  // Show/hide DOM elements
  for (const [flagName, elementId] of Object.entries(toggleMap)) {
    const el = document.getElementById(elementId);
    if (el) el.classList.toggle('hidden', !evaluated[flagName]);
  }

  renderNotes();
}

// ── Flag status panel in sidebar ──────────────────────────────────────────────
function renderFlagPanel() {
  const list = document.getElementById('flag-status-list');
  if (!list) return;

  const entries = Object.values(flags);
  if (entries.length === 0) {
    list.innerHTML = '<div style="font-size:0.68rem;color:rgba(255,255,255,0.2);padding:0.25rem 0.5rem">No flags loaded</div>';
    return;
  }

  list.innerHTML = entries.map(f => {
    const on  = f.enabled;
    const pct = f.rolloutPercentage;
    return `
      <div class="flag-status-item ${on ? 'on' : ''}">
        <span class="flag-dot ${on ? 'on' : 'off'}"></span>
        <span class="flag-status-name" title="${f.name}">${f.name}</span>
        <span class="flag-pct">${pct}%</span>
      </div>`;
  }).join('');
}

// ── Notes app logic ───────────────────────────────────────────────────────────
let notes = [];

function createNewNote() {
  document.getElementById('note-title').value   = '';
  document.getElementById('note-content').value = '';
  document.getElementById('reminder-select').value = '0';
  document.getElementById('note-title').focus();
}

function saveNote() {
  const title   = document.getElementById('note-title').value.trim() || 'Untitled';
  const content = document.getElementById('note-content').value.trim();
  if (!content) return;

  const reminderTime = parseInt(document.getElementById('reminder-select').value);
  const note = { id: Date.now(), title, content };
  notes.unshift(note);

  if (reminderTime > 0) setTimeout(() => triggerReminder(note), reminderTime);

  createNewNote();
  renderNotes();
}

window.createNewNote  = createNewNote;
window.saveNote       = saveNote;
window.dismissReminder = dismissReminder;
window.snoozeReminder  = snoozeReminder;

function renderNotes(notesToRender = notes) {
  const grid  = document.getElementById('notes-grid');
  const count = document.getElementById('notes-count');
  const showPin = window.featureFlagsState?.['feature-pin-notes'];

  if (count) count.textContent = `${notesToRender.length} note${notesToRender.length !== 1 ? 's' : ''}`;

  if (notesToRender.length === 0) {
    grid.innerHTML = `<div class="note-empty"><div class="note-empty-icon">📭</div><div>No notes yet — write your first one!</div></div>`;
    return;
  }

  grid.innerHTML = notesToRender.map(note => `
    <div class="note-card">
      ${showPin ? '<span class="pin-icon">📌</span>' : ''}
      <h3>${escHtml(note.title)}</h3>
      <p>${escHtml(note.content)}</p>
    </div>
  `).join('');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Reminder ──────────────────────────────────────────────────────────────────
function triggerReminder(note) {
  document.getElementById('reminder-text').textContent = `Reminder: "${note.title}"`;
  document.getElementById('reminder-modal').classList.remove('hidden');

  const fs = window.featureFlagsState || {};
  if (fs['reminder-sound-alert']) {
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audio.play().catch(() => {});
  }
  if (fs['reminder-vibration'] && navigator.vibrate) navigator.vibrate([200, 100, 200]);
  if (fs['reminder-screen-flash']) {
    document.body.classList.add('flash-active');
    setTimeout(() => document.body.classList.remove('flash-active'), 3000);
  }
}

function dismissReminder() {
  document.getElementById('reminder-modal').classList.add('hidden');
  document.body.classList.remove('flash-active');
}

function snoozeReminder() {
  const text = document.getElementById('reminder-text').textContent;
  dismissReminder();
  setTimeout(() => triggerReminder({ title: text }), 5000);
}

// ── Word count + auto-save ────────────────────────────────────────────────────
document.getElementById('note-content').addEventListener('input', () => {
  const fs = window.featureFlagsState || {};

  if (fs['feature-word-count']) {
    const text  = document.getElementById('note-content').value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const wc    = document.getElementById('word-count');
    if (wc) wc.textContent = `${words} word${words !== 1 ? 's' : ''}`;
  }

  if (fs['feature-auto-save']) {
    const ind = document.getElementById('auto-save-indicator');
    if (ind) {
      ind.textContent = 'Saving…';
      setTimeout(() => { ind.textContent = 'Saved ✓'; }, 900);
    }
  }
});

// ── Feature Implementations ───────────────────────────────────────────────────

// Search Bar
document.getElementById('search-input')?.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm) || 
    n.content.toLowerCase().includes(searchTerm)
  );
  renderNotes(filteredNotes);
});

// Email Sync
document.getElementById('email-sync-btn')?.addEventListener('click', () => {
  const text = document.getElementById('reminder-text').textContent;
  alert(`Email sync triggered for: ${text}`);
  dismissReminder();
});

// Export PDF
document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
  window.print();
});

// Share Notes
document.getElementById('share-notes-btn')?.addEventListener('click', () => {
  if (navigator.share) {
    navigator.share({
      title: 'My Notes',
      text: 'Check out my notes!',
      url: window.location.href
    }).catch(err => console.error(err));
  } else {
    alert('Sharing is not supported on this browser.');
  }
});

// Image Attachment
document.getElementById('attach-img-btn')?.addEventListener('click', () => {
  const url = prompt('Enter image URL:');
  if (url) {
    const content = document.getElementById('note-content');
    content.value += `\n![Image](${url})`;
    content.dispatchEvent(new Event('input')); // trigger word count
  }
});

// Voice Note
document.getElementById('voice-note-btn')?.addEventListener('click', () => {
  alert('Recording voice note... (Simulation: Microphone access requested)');
});

// Rich Text Toolbar
document.getElementById('rich-text-toolbar')?.addEventListener('click', (e) => {
  if(e.target.closest('.toolbar-btn')) {
    alert('Rich text formatting applied! (Demo mode)');
  }
});
