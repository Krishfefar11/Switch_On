import { useEffect, useState, useCallback } from 'react';
import { getFlags, createFlag, updateFlag, toggleFlag, deleteFlag } from '../api/flagApi';
import { getFlagAnalytics } from '../api/analyticsApi';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Plus, Search, Pencil, Trash2, X, ToggleLeft, RefreshCw,
  ChevronDown, ChevronUp, BarChart2, Tag, Layers, Target, Info
} from 'lucide-react';

const ENVS       = ['development', 'staging', 'production'];
const FLAG_TYPES = ['boolean', 'string', 'number', 'json'];
const OPERATORS  = ['equals','notEquals','contains','startsWith','endsWith','greaterThan','lessThan','in','notIn'];
const TYPE_COLORS = { boolean: '#6366f1', string: '#10b981', number: '#f59e0b', json: '#ec4899' };

// ── Helpers ───────────────────────────────────────────────────────────
const Modal = ({ onClose, children, wide }) => (
  <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal" style={wide ? { maxWidth: 760 } : {}}>{children}</div>
  </div>
);

const TypeBadge = ({ type }) => (
  <span style={{
    fontSize: '0.62rem', fontWeight: 700, padding: '0.15rem 0.45rem',
    borderRadius: 4, background: `${TYPE_COLORS[type] || '#6366f1'}22`,
    color: TYPE_COLORS[type] || '#6366f1', letterSpacing: '0.04em', textTransform: 'uppercase',
  }}>{type}</span>
);

// ── Analytics Modal ───────────────────────────────────────────────────
const AnalyticsModal = ({ flag, onClose }) => {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]     = useState(7);

  useEffect(() => {
    setLoading(true);
    getFlagAnalytics(flag._id, days)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [flag._id, days]);

  const maxDaily = data?.daily?.length ? Math.max(...data.daily.map(d => d.total), 1) : 1;

  return (
    <div>
      <div className="modal-header">
        <div>
          <div className="modal-title">📊 {flag.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--t3)', marginTop: 2 }}>Flag Analytics</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-ghost'}`}>
              {d}d
            </button>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
      </div>

      {loading ? (
        <div className="spinner-wrap" style={{ padding: '3rem' }}><div className="spinner" /></div>
      ) : !data ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--t3)' }}>No data</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem' }}>
            {[
              { label: 'Evaluations', val: data.summary.total.toLocaleString(), icon: '🔢' },
              { label: 'Unique Users',  val: data.summary.uniqueUsers.toLocaleString(), icon: '👤' },
              { label: 'Enabled %',     val: `${data.summary.enabledPct}%`, icon: '✅' },
              { label: 'Rule Matches',  val: data.summary.ruleMatches.toLocaleString(), icon: '🎯' },
            ].map(c => (
              <div key={c.label} className="card" style={{ padding: '0.85rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}>{c.icon}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{c.val}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--t3)', marginTop: 2 }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Daily trend bar chart */}
          {data.daily.length > 0 && (
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>Daily Evaluations — last {days} days</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 80 }}>
                {data.daily.map(d => (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} title={`${d.date}: ${d.total} evals`}>
                    <div style={{ width: '100%', background: 'var(--accent)', borderRadius: '3px 3px 0 0', height: `${(d.total / maxDaily) * 100}%`, minHeight: d.total > 0 ? 4 : 0, opacity: 0.85 }} />
                    <div style={{ fontSize: '0.55rem', color: 'var(--t3)', whiteSpace: 'nowrap' }}>{d.date.slice(5)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enabled vs Disabled */}
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>Evaluation Split</div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                  <span style={{ color: '#10b981' }}>● Enabled</span>
                  <span>{data.summary.enabled.toLocaleString()}</span>
                </div>
                <div style={{ background: 'var(--border)', borderRadius: 4, height: 8 }}>
                  <div style={{ width: `${data.summary.enabledPct}%`, background: '#10b981', height: '100%', borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--t3)' }}>● Disabled</span>
                  <span>{data.summary.disabled.toLocaleString()}</span>
                </div>
                <div style={{ background: 'var(--border)', borderRadius: 4, height: 8 }}>
                  <div style={{ width: `${100 - data.summary.enabledPct}%`, background: 'var(--border)', height: '100%', borderRadius: 4, filter: 'brightness(0.6)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Reasons & Variations */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {data.reasons.length > 0 && (
              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>Evaluation Reasons</div>
                {data.reasons.map(r => (
                  <div key={r.reason} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--t2)', fontFamily: 'monospace', fontSize: '0.7rem' }}>{r.reason}</span>
                    <span style={{ fontWeight: 600 }}>{r.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            {data.variations.length > 0 && (
              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem' }}>Variation Served</div>
                {data.variations.map(v => (
                  <div key={v.index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--t2)' }}>{v.name}</span>
                    <span style={{ fontWeight: 600 }}>{v.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

// ── Variations Editor ─────────────────────────────────────────────────
const VariationsEditor = ({ variations, onChange, flagType }) => {
  const add = () => onChange([...variations, { name: `Variation ${variations.length + 1}`, value: flagType === 'number' ? 0 : '', description: '' }]);
  const remove = (i) => onChange(variations.filter((_, idx) => idx !== i));
  const update = (i, key, val) => onChange(variations.map((v, idx) => idx === i ? { ...v, [key]: val } : v));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <label className="form-label" style={{ margin: 0 }}>Variations</label>
        <button type="button" className="btn btn-ghost btn-sm" onClick={add}><Plus size={12} /> Add</button>
      </div>
      {variations.length === 0 && (
        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r)', border: '1px dashed var(--border)', fontSize: '0.78rem', color: 'var(--t3)', textAlign: 'center' }}>
          No variations yet — click Add
        </div>
      )}
      {variations.map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r)', padding: '0.5rem', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--t3)', minWidth: 20, textAlign: 'center' }}>{i}</div>
          <input className="input" style={{ flex: 1 }} placeholder="Name" value={v.name}
            onChange={e => update(i, 'name', e.target.value)} />
          <input className="input" style={{ flex: 1 }} placeholder="Value"
            value={flagType === 'json' ? (typeof v.value === 'object' ? JSON.stringify(v.value) : v.value) : v.value}
            type={flagType === 'number' ? 'number' : 'text'}
            onChange={e => {
              let val = e.target.value;
              if (flagType === 'number') val = parseFloat(val) || 0;
              if (flagType === 'json') { try { val = JSON.parse(val); } catch { val = e.target.value; } }
              update(i, 'value', val);
            }} />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(i)}><X size={12} /></button>
        </div>
      ))}
    </div>
  );
};

// ── Rules Builder ─────────────────────────────────────────────────────
const RulesBuilder = ({ rules, onChange, variations, flagType }) => {
  const addRule = () => onChange([...rules, { description: '', conditions: [], serve: 0, rollout: 100 }]);
  const removeRule = (i) => onChange(rules.filter((_, idx) => idx !== i));
  const updateRule = (i, key, val) => onChange(rules.map((r, idx) => idx === i ? { ...r, [key]: val } : r));

  const addCondition = (ri) => {
    const updated = rules.map((r, idx) => idx === ri
      ? { ...r, conditions: [...r.conditions, { attribute: '', operator: 'equals', value: '' }] }
      : r);
    onChange(updated);
  };
  const removeCondition = (ri, ci) => {
    const updated = rules.map((r, idx) => idx === ri
      ? { ...r, conditions: r.conditions.filter((_, cidx) => cidx !== ci) }
      : r);
    onChange(updated);
  };
  const updateCondition = (ri, ci, key, val) => {
    const updated = rules.map((r, idx) => idx === ri
      ? { ...r, conditions: r.conditions.map((c, cidx) => cidx === ci ? { ...c, [key]: val } : c) }
      : r);
    onChange(updated);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <label className="form-label" style={{ margin: 0 }}>
          Targeting Rules
          <span style={{ fontSize: '0.68rem', color: 'var(--t3)', fontWeight: 400, marginLeft: 6 }}>evaluated before % rollout</span>
        </label>
        <button type="button" className="btn btn-ghost btn-sm" onClick={addRule}><Plus size={12} /> Add Rule</button>
      </div>

      {rules.length === 0 && (
        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r)', border: '1px dashed var(--border)', fontSize: '0.78rem', color: 'var(--t3)', textAlign: 'center' }}>
          No targeting rules — flag uses % rollout only
        </div>
      )}

      {rules.map((rule, ri) => (
        <div key={ri} style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--r)', padding: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-l)', fontWeight: 700 }}>RULE {ri + 1}</span>
            <input className="input" style={{ flex: 1, fontSize: '0.78rem' }} placeholder="Description (optional)"
              value={rule.description} onChange={e => updateRule(ri, 'description', e.target.value)} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeRule(ri)}><X size={12} /></button>
          </div>

          {/* Conditions */}
          <div style={{ marginBottom: '0.5rem' }}>
            {rule.conditions.map((cond, ci) => (
              <div key={ci} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                {ci > 0 && <span style={{ fontSize: '0.68rem', color: 'var(--accent-l)', fontWeight: 700, minWidth: 30 }}>AND</span>}
                <input className="input" style={{ flex: 1, minWidth: 100 }} placeholder="attribute (e.g. plan)"
                  value={cond.attribute} onChange={e => updateCondition(ri, ci, 'attribute', e.target.value)} />
                <select className="input" style={{ minWidth: 120 }} value={cond.operator}
                  onChange={e => updateCondition(ri, ci, 'operator', e.target.value)}>
                  {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                </select>
                <input className="input" style={{ flex: 1, minWidth: 100 }} placeholder="value"
                  value={cond.value} onChange={e => updateCondition(ri, ci, 'value', e.target.value)} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeCondition(ri, ci)}><X size={11} /></button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }} onClick={() => addCondition(ri)}>
              + Add condition
            </button>
          </div>

          {/* Serve + Rollout within rule */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', borderTop: '1px solid rgba(99,102,241,0.15)', paddingTop: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--t3)' }}>Serve:</span>
              {flagType === 'boolean' ? (
                <select className="input" style={{ minWidth: 90 }} value={rule.serve}
                  onChange={e => updateRule(ri, 'serve', parseInt(e.target.value))}>
                  <option value={0}>true</option>
                  <option value={1}>false</option>
                </select>
              ) : (
                <select className="input" style={{ minWidth: 130 }} value={rule.serve}
                  onChange={e => updateRule(ri, 'serve', parseInt(e.target.value))}>
                  {(variations || []).map((v, vi) => <option key={vi} value={vi}>{v.name} ({String(v.value).slice(0,20)})</option>)}
                </select>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--t3)', whiteSpace: 'nowrap' }}>Rule rollout:</span>
              <input type="range" min="0" max="100" value={rule.rollout}
                onChange={e => updateRule(ri, 'rollout', parseInt(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-l)', minWidth: 32 }}>{rule.rollout}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Flag Form ─────────────────────────────────────────────────────────
const FlagForm = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || {
    name: '', description: '', environment: 'development',
    type: 'boolean', enabled: false, rolloutPercentage: 0,
    variations: [], defaultVariation: 0, rules: [], tags: [],
  });
  const [tab, setTab]       = useState('basic');
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?._id;

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await updateFlag(initial._id, {
          description: form.description, enabled: form.enabled,
          rolloutPercentage: form.rolloutPercentage, environment: form.environment,
          variations: form.variations, defaultVariation: form.defaultVariation,
          rules: form.rules, tags: form.tags,
        });
        toast.success('Flag updated');
      } else {
        await createFlag(form);
        toast.success('Flag created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving flag');
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { id: 'basic',      label: 'Basic',      icon: <Info size={13} /> },
    { id: 'variations', label: 'Variations',  icon: <Layers size={13} />, hide: form.type === 'boolean' },
    { id: 'rules',      label: `Rules ${form.rules?.length ? `(${form.rules.length})` : ''}`, icon: <Target size={13} /> },
    { id: 'tags',       label: 'Tags',        icon: <Tag size={13} /> },
  ].filter(t => !t.hide);

  return (
    <form onSubmit={submit}>
      <div className="modal-header">
        <div className="modal-title">{isEdit ? 'Edit Flag' : 'New Flag'}</div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '1.25rem' }}>
        {TABS.map(t => (
          <button key={t.id} type="button" className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="form-stack">

        {/* ── Basic Tab ─── */}
        {tab === 'basic' && <>
          <div className="form-field">
            <label className="form-label">Name (slug)</label>
            <input className="input" placeholder="e.g. feature-dark-mode" value={form.name}
              onChange={e => set('name', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              disabled={isEdit} required style={{ fontFamily: 'monospace' }} />
          </div>
          <div className="form-field">
            <label className="form-label">Description</label>
            <input className="input" placeholder="What does this flag control?" value={form.description}
              onChange={e => set('description', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-field">
              <label className="form-label">Environment</label>
              <select className="input" value={form.environment} onChange={e => set('environment', e.target.value)}>
                {ENVS.map(env => <option key={env} value={env}>{env}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Flag Type</label>
              <select className="input" value={form.type} onChange={e => { set('type', e.target.value); if (e.target.value === 'boolean') set('variations', []); }}
                disabled={isEdit}>
                {FLAG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Enabled</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--t3)' }}>Flag is {form.enabled ? 'active' : 'inactive'}</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} />
              <span className="toggle-track" />
            </label>
          </div>
          <div className="form-field">
            <label className="form-label">Rollout — <strong style={{ color: 'var(--accent-l)' }}>{form.rolloutPercentage}%</strong></label>
            <input type="range" min="0" max="100" value={form.rolloutPercentage}
              onChange={e => set('rolloutPercentage', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--t3)' }}>
              <span>0% — no users</span><span>100% — all users</span>
            </div>
          </div>
          {form.type !== 'boolean' && form.variations.length > 0 && (
            <div className="form-field">
              <label className="form-label">Default Variation (used for % rollout)</label>
              <select className="input" value={form.defaultVariation}
                onChange={e => set('defaultVariation', parseInt(e.target.value))}>
                {form.variations.map((v, i) => <option key={i} value={i}>{v.name}</option>)}
              </select>
            </div>
          )}
        </>}

        {/* ── Variations Tab ─── */}
        {tab === 'variations' && (
          <VariationsEditor
            variations={form.variations}
            onChange={v => set('variations', v)}
            flagType={form.type}
          />
        )}

        {/* ── Rules Tab ─── */}
        {tab === 'rules' && (
          <RulesBuilder
            rules={form.rules}
            onChange={r => set('rules', r)}
            variations={form.variations}
            flagType={form.type}
          />
        )}

        {/* ── Tags Tab ─── */}
        {tab === 'tags' && (
          <div className="form-field">
            <label className="form-label">Tags <span style={{ fontWeight: 400, color: 'var(--t3)' }}>(comma-separated)</span></label>
            <input className="input" placeholder="e.g. checkout, experiment, mobile"
              value={(form.tags || []).join(', ')}
              onChange={e => set('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
              {(form.tags || []).map(t => (
                <span key={t} style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-l)', padding: '0.15rem 0.5rem', borderRadius: 20, fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  #{t}
                  <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: '0.8rem' }}
                    onClick={() => set('tags', (form.tags || []).filter(x => x !== t))}>×</button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
          {saving ? 'Saving…' : isEdit ? 'Update Flag' : 'Create Flag'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
};

// ── Flag Card ─────────────────────────────────────────────────────────
const FlagCard = ({ f, canEdit, isAdmin, onToggle, onEdit, onDelete, onAnalytics }) => (
  <div className="card flag-card" style={{ position: 'relative' }}>
    <div className="flag-card-top">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <div className="flag-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
          <TypeBadge type={f.type || 'boolean'} />
          {f.rules?.length > 0 && (
            <span style={{ fontSize: '0.62rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '0.1rem 0.4rem', borderRadius: 4, fontWeight: 700 }}>
              {f.rules.length} rule{f.rules.length > 1 ? 's' : ''}
            </span>
          )}
          {f.tags?.length > 0 && f.tags.slice(0,2).map(t => (
            <span key={t} style={{ fontSize: '0.6rem', background: 'rgba(99,102,241,0.1)', color: 'var(--accent-l)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>#{t}</span>
          ))}
        </div>
        <div className="flag-desc" style={{ marginTop: '0.2rem' }}>{f.description || <span style={{ fontStyle: 'italic' }}>No description</span>}</div>
      </div>
      <label className="toggle" style={{ cursor: canEdit ? 'pointer' : 'not-allowed' }}>
        <input type="checkbox" readOnly checked={f.enabled} onChange={() => canEdit && onToggle(f)} />
        <span className="toggle-track" onClick={() => canEdit && onToggle(f)} />
      </label>
    </div>

    <div className="flag-meta">
      <span className={`env-${f.environment}`}>{f.environment}</span>
      {f.enabled
        ? <span className="badge badge-green">● Enabled</span>
        : <span className="badge badge-muted">● Disabled</span>}
      <span style={{ fontSize: '0.7rem', color: 'var(--t3)', marginLeft: 'auto' }}>v{f.version}</span>
    </div>

    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--t3)', marginBottom: '0.3rem' }}>
        <span>Rollout</span>
        <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{f.rolloutPercentage}%</span>
      </div>
      <div className="rollout-bar">
        <div className="rollout-fill" style={{ width: `${f.rolloutPercentage}%` }} />
      </div>
    </div>

    {/* Multivariate preview */}
    {f.type !== 'boolean' && f.variations?.length > 0 && (
      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
        {f.variations.slice(0, 3).map((v, i) => (
          <span key={i} style={{
            fontSize: '0.65rem', background: i === (f.defaultVariation ?? 0) ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
            color: i === (f.defaultVariation ?? 0) ? 'var(--accent-l)' : 'var(--t3)',
            padding: '0.1rem 0.45rem', borderRadius: 4, border: '1px solid var(--border)',
          }}>{v.name}: {String(v.value).slice(0, 12)}</span>
        ))}
        {f.variations.length > 3 && <span style={{ fontSize: '0.65rem', color: 'var(--t3)' }}>+{f.variations.length - 3} more</span>}
      </div>
    )}

    {canEdit && (
      <div className="flag-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => onToggle(f)} title="Toggle"><ToggleLeft size={13} /></button>
        <button className="btn btn-ghost btn-sm" onClick={() => onAnalytics(f)} title="Analytics"><BarChart2 size={13} /></button>
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(f)} title="Edit"><Pencil size={13} /></button>
        {isAdmin && (
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(f)} title="Delete"><Trash2 size={13} /></button>
        )}
      </div>
    )}
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────
const FlagsPage = () => {
  const { user }          = useAuth();
  const [flags, setFlags]         = useState([]);
  const [env, setEnv]             = useState('development');
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState(null);
  const [analyticsFlag, setAnalyticsFlag] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  const canEdit = ['admin','developer'].includes(user?.role);

  const load = useCallback(() => {
    setLoading(true);
    getFlags({ environment: env, search, limit: 100 })
      .then(r => setFlags(r.data.flags))
      .catch(() => toast.error('Failed to load flags'))
      .finally(() => setLoading(false));
  }, [env, search]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (f) => {
    try { await toggleFlag(f._id); load(); toast.success(`${f.name} ${f.enabled ? 'disabled' : 'enabled'}`); }
    catch { toast.error('Toggle failed'); }
  };

  const handleDelete = async (f) => {
    if (!confirm(`Delete "${f.name}"?`)) return;
    try { await deleteFlag(f._id); load(); toast.success('Flag deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const filtered = typeFilter === 'all' ? flags : flags.filter(f => (f.type || 'boolean') === typeFilter);

  const counts = FLAG_TYPES.reduce((acc, t) => {
    acc[t] = flags.filter(f => (f.type || 'boolean') === t).length; return acc;
  }, {});

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {modal && (
        <Modal onClose={() => setModal(null)} wide>
          <FlagForm
            initial={modal === 'create' ? null : modal}
            onSave={() => { setModal(null); load(); }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {analyticsFlag && (
        <Modal onClose={() => setAnalyticsFlag(null)} wide>
          <AnalyticsModal flag={analyticsFlag} onClose={() => setAnalyticsFlag(null)} />
        </Modal>
      )}

      {/* Header */}
      <div className="ph">
        <div>
          <h1>Feature Flags</h1>
          <div className="ph-sub">{filtered.length} flag{filtered.length !== 1 ? 's' : ''} · {env}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /></button>
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={() => setModal('create')}>
              <Plus size={14} /> New Flag
            </button>
          )}
        </div>
      </div>

      {/* Env + search */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="tabs">
          {ENVS.map(e => <button key={e} className={`tab${env === e ? ' active' : ''}`} onClick={() => setEnv(e)}>{e}</button>)}
        </div>
        <div className="input-wrap" style={{ flex: 1, maxWidth: 280 }}>
          <Search size={14} className="input-icon" />
          <input className="input" placeholder="Search flags…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Type filter pills */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button className={`btn btn-sm ${typeFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTypeFilter('all')}>
          All ({flags.length})
        </button>
        {FLAG_TYPES.map(t => counts[t] > 0 && (
          <button key={t} className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTypeFilter(t)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <TypeBadge type={t} /> {counts[t]}
          </button>
        ))}
      </div>

      {/* Flags grid */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--t3)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.4 }}>🚩</div>
          <div style={{ fontWeight: 500 }}>No flags found</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
            {search ? 'Try a different search' : 'Create your first flag to get started'}
          </div>
        </div>
      ) : (
        <div className="flag-grid">
          {filtered.map((f, i) => (
            <div key={f._id} style={{ animation: `fadeUp 0.3s ease ${i * 0.03}s both` }}>
              <FlagCard
                f={f}
                canEdit={canEdit}
                isAdmin={user?.role === 'admin'}
                onToggle={handleToggle}
                onEdit={f => setModal(f)}
                onDelete={handleDelete}
                onAnalytics={f => setAnalyticsFlag(f)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlagsPage;
