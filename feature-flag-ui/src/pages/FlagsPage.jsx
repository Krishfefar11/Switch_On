import { useEffect, useState, useCallback } from 'react';
import {
  getFlags, createFlag, updateFlag, toggleFlag, deleteFlag,
  archiveFlag, unarchiveFlag, promoteFlag as promoteFlagApi, bulkFlagAction,
} from '../api/flagApi';
import { getFlagAnalytics, getStaleFlags } from '../api/analyticsApi';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Plus, Search, Pencil, Trash2, X, ToggleLeft, RefreshCw,
  BarChart2, Tag, Layers, Target, Info,
  Archive, ArchiveRestore, ArrowUpRight, CheckSquare, Square,
  AlertTriangle, Flag, LayoutGrid, List, Zap, ChevronDown,
  ArrowRight,
} from 'lucide-react';

const ENVS       = ['development', 'staging', 'production'];
const FLAG_TYPES = ['boolean', 'string', 'number', 'json'];
const OPERATORS  = ['equals','notEquals','contains','startsWith','endsWith','greaterThan','lessThan','in','notIn'];

const TYPE_META = {
  boolean: { color: '#a5b4fc', bg: 'rgba(99,102,241,0.1)',  label: 'bool' },
  string:  { color: '#6ee7b7', bg: 'rgba(16,185,129,0.1)',  label: 'str'  },
  number:  { color: '#fcd34d', bg: 'rgba(245,158,11,0.1)',  label: 'num'  },
  json:    { color: '#f9a8d4', bg: 'rgba(236,72,153,0.1)',   label: 'json' },
};

/* ── Helpers ─────────────────────────────────────────────────── */
const Modal = ({ onClose, children, wide }) => (
  <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className={`modal${wide ? ' modal-wide' : ''}`}>{children}</div>
  </div>
);

const TypeBadge = ({ type }) => {
  const m = TYPE_META[type] || TYPE_META.boolean;
  return (
    <span style={{
      fontSize: '0.575rem', fontWeight: 700, padding: '0.15rem 0.375rem',
      borderRadius: 'var(--r-xs)', background: m.bg, color: m.color,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      flexShrink: 0,
    }}>{m.label}</span>
  );
};

const EnvDot = ({ env }) => {
  const colors = { development: '#93c5fd', staging: '#fcd34d', production: '#fca5a5' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6875rem', fontWeight: 600 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: colors[env] || 'var(--t4)', flexShrink: 0 }} />
      {env}
    </span>
  );
};

/* ── Analytics Modal ────────────────────────────────────────── */
const AnalyticsModal = ({ flag, onClose }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]       = useState(7);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={14} color="var(--accent-l)" />
            <span className="modal-title">{flag.name}</span>
          </div>
          <div className="modal-sub">Analytics</div>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`}>
              {d}d
            </button>
          ))}
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : !data ? (
        <div className="empty"><div className="empty-title">No data available</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {[
              { label: 'Evaluations',  val: (data.summary.total).toLocaleString(),        color: 'var(--accent-l)' },
              { label: 'Unique Users', val: (data.summary.uniqueUsers).toLocaleString(),  color: 'var(--blue-l)'   },
              { label: 'Enabled %',    val: `${data.summary.enabledPct}%`,               color: 'var(--green-l)'  },
              { label: 'Rule Matches', val: (data.summary.ruleMatches).toLocaleString(),  color: 'var(--yellow-l)' },
            ].map(c => (
              <div key={c.label} className="card card-p-sm">
                <div style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.04em', color: c.color, fontVariantNumeric: 'tabular-nums' }}>{c.val}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--t4)', marginTop: '0.2rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          {data.daily.length > 0 && (
            <div className="card card-p-sm">
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--t2)', marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>
                Daily Evaluations — {days}d
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 64 }}>
                {data.daily.map(d => (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                    title={`${d.date}: ${d.total.toLocaleString()}`}>
                    <div style={{
                      width: '100%',
                      background: 'linear-gradient(180deg, var(--accent-l), var(--accent))',
                      borderRadius: '2px 2px 0 0',
                      height: `${(d.total / maxDaily) * 100}%`,
                      minHeight: d.total > 0 ? 3 : 0,
                      opacity: 0.7,
                      transition: 'opacity var(--t-base)',
                    }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                    />
                    <div style={{ fontSize: '0.48rem', color: 'var(--t5)', whiteSpace: 'nowrap' }}>{d.date.slice(5)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Split + Reasons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div className="card card-p-sm">
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--t2)', marginBottom: '0.75rem' }}>Evaluation Split</div>
              {[
                { label: 'Enabled',  val: data.summary.enabled,  pct: data.summary.enabledPct,       color: 'var(--green)' },
                { label: 'Disabled', val: data.summary.disabled, pct: 100 - data.summary.enabledPct, color: 'var(--t5)' },
              ].map(row => (
                <div key={row.label} style={{ marginBottom: '0.625rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: row.color, fontWeight: 600 }}>{row.label}</span>
                    <span style={{ color: 'var(--t2)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{row.val.toLocaleString()}</span>
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: 99, height: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${row.pct}%`, background: row.color, height: '100%', borderRadius: 99, transition: 'width 0.4s var(--ease)' }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="card card-p-sm">
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--t2)', marginBottom: '0.75rem' }}>Evaluation Reasons</div>
              {data.reasons.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--t4)' }}>No reason data yet</div>
              ) : data.reasons.slice(0, 5).map(r => (
                <div key={r.reason} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', marginBottom: '0.375rem', gap: '0.5rem' }}>
                  <code style={{ fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</code>
                  <span style={{ fontWeight: 700, color: 'var(--t1)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{r.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Variations Editor ──────────────────────────────────────── */
const VariationsEditor = ({ variations, onChange, flagType }) => {
  const add    = () => onChange([...variations, { name: `Variation ${variations.length + 1}`, value: flagType === 'number' ? 0 : '', description: '' }]);
  const remove = (i) => onChange(variations.filter((_, idx) => idx !== i));
  const update = (i, key, val) => onChange(variations.map((v, idx) => idx === i ? { ...v, [key]: val } : v));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
        <label className="form-label" style={{ margin: 0 }}>Variations</label>
        <button type="button" className="btn btn-ghost btn-sm" onClick={add}><Plus size={12} /> Add</button>
      </div>
      {variations.length === 0 && (
        <div style={{
          padding: '1rem', background: 'rgba(255,255,255,0.02)',
          borderRadius: 'var(--r)', border: '1px dashed var(--border)',
          fontSize: '0.78rem', color: 'var(--t4)', textAlign: 'center',
        }}>
          No variations — click Add to define them
        </div>
      )}
      {variations.map((v, i) => (
        <div key={i} style={{
          display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem',
          background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--r)',
          padding: '0.5rem 0.625rem', border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--t4)', minWidth: 14, textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{i}</span>
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
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => remove(i)}><X size={12} /></button>
        </div>
      ))}
    </div>
  );
};

/* ── Rules Builder ──────────────────────────────────────────── */
const RulesBuilder = ({ rules, onChange, variations, flagType }) => {
  const addRule      = () => onChange([...rules, { description: '', conditions: [], serve: 0, rollout: 100 }]);
  const removeRule   = (i) => onChange(rules.filter((_, idx) => idx !== i));
  const updateRule   = (i, key, val) => onChange(rules.map((r, idx) => idx === i ? { ...r, [key]: val } : r));
  const addCondition = (ri) => onChange(rules.map((r, idx) => idx === ri
    ? { ...r, conditions: [...r.conditions, { attribute: '', operator: 'equals', value: '' }] } : r));
  const removeCondition = (ri, ci) => onChange(rules.map((r, idx) => idx === ri
    ? { ...r, conditions: r.conditions.filter((_, cidx) => cidx !== ci) } : r));
  const updateCondition = (ri, ci, key, val) => onChange(rules.map((r, idx) => idx === ri
    ? { ...r, conditions: r.conditions.map((c, cidx) => cidx === ci ? { ...c, [key]: val } : c) } : r));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
        <label className="form-label" style={{ margin: 0 }}>
          Targeting Rules
          <span style={{ fontSize: '0.68rem', color: 'var(--t4)', fontWeight: 400, marginLeft: 6 }}>
            evaluated before % rollout
          </span>
        </label>
        <button type="button" className="btn btn-ghost btn-sm" onClick={addRule}><Plus size={12} /> Add Rule</button>
      </div>

      {rules.length === 0 && (
        <div style={{
          padding: '1rem', background: 'rgba(255,255,255,0.02)',
          borderRadius: 'var(--r)', border: '1px dashed var(--border)',
          fontSize: '0.78rem', color: 'var(--t4)', textAlign: 'center',
        }}>
          No targeting rules — flag uses % rollout for all users
        </div>
      )}

      {rules.map((rule, ri) => (
        <div key={ri} style={{
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 'var(--r-md)', padding: '0.75rem', marginBottom: '0.625rem',
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--accent-l)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Rule {ri + 1}
            </span>
            <input className="input" style={{ flex: 1, fontSize: '0.78rem' }} placeholder="Description (optional)"
              value={rule.description} onChange={e => updateRule(ri, 'description', e.target.value)} />
            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => removeRule(ri)}><X size={12} /></button>
          </div>

          {rule.conditions.map((cond, ci) => (
            <div key={ci} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              {ci > 0 && <span style={{ fontSize: '0.6rem', color: 'var(--accent-l)', fontWeight: 700, minWidth: 30, flexShrink: 0 }}>AND</span>}
              <input className="input" style={{ flex: 1, minWidth: 80 }} placeholder="attribute (e.g. plan)"
                value={cond.attribute} onChange={e => updateCondition(ri, ci, 'attribute', e.target.value)} />
              <select className="input" style={{ minWidth: 120, flex: '0 0 auto' }} value={cond.operator}
                onChange={e => updateCondition(ri, ci, 'operator', e.target.value)}>
                {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
              <input className="input" style={{ flex: 1, minWidth: 80 }} placeholder="value"
                value={cond.value} onChange={e => updateCondition(ri, ci, 'value', e.target.value)} />
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => removeCondition(ri, ci)}><X size={11} /></button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}
            onClick={() => addCondition(ri)}>
            + Add condition
          </button>

          <div style={{
            display: 'flex', gap: '0.75rem', alignItems: 'center',
            borderTop: '1px solid rgba(99,102,241,0.12)',
            paddingTop: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--t3)', whiteSpace: 'nowrap' }}>Serve:</span>
              {flagType === 'boolean' ? (
                <select className="input" style={{ minWidth: 80 }} value={rule.serve}
                  onChange={e => updateRule(ri, 'serve', parseInt(e.target.value))}>
                  <option value={0}>true</option>
                  <option value={1}>false</option>
                </select>
              ) : (
                <select className="input" style={{ minWidth: 130 }} value={rule.serve}
                  onChange={e => updateRule(ri, 'serve', parseInt(e.target.value))}>
                  {(variations || []).map((v, vi) => (
                    <option key={vi} value={vi}>{v.name} ({String(v.value).slice(0, 14)})</option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 200 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--t3)', whiteSpace: 'nowrap' }}>Rollout:</span>
              <input type="range" min="0" max="100" value={rule.rollout}
                onChange={e => updateRule(ri, 'rollout', parseInt(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-l)', minWidth: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{rule.rollout}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Flag Form ──────────────────────────────────────────────── */
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
    { id: 'basic',      label: 'Basic',      icon: <Info size={12} /> },
    { id: 'variations', label: 'Variations',  icon: <Layers size={12} />, hide: form.type === 'boolean' },
    { id: 'rules',      label: `Rules${form.rules?.length ? ` (${form.rules.length})` : ''}`, icon: <Target size={12} /> },
    { id: 'tags',       label: 'Tags',        icon: <Tag size={12} /> },
  ].filter(t => !t.hide);

  return (
    <form onSubmit={submit}>
      <div className="modal-header">
        <div>
          <div className="modal-title">{isEdit ? 'Edit Flag' : 'Create Feature Flag'}</div>
          {isEdit && <div style={{ fontSize: '0.72rem', color: 'var(--t3)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em' }}>{initial.name}</div>}
        </div>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={14} /></button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.125rem' }}>
        {TABS.map(t => (
          <button key={t.id} type="button"
            className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
            style={{ borderRadius: 'var(--r-sm)' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="form-stack">
        {/* ── Basic ── */}
        {tab === 'basic' && <>
          <div className="form-field">
            <label className="form-label">Flag key</label>
            <input
              className="input"
              placeholder="e.g. feature-dark-mode"
              value={form.name}
              onChange={e => set('name', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              disabled={isEdit}
              required
              style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: '0.825rem' }}
            />
            {!isEdit && <div className="form-hint">Lowercase letters, numbers, hyphens and underscores only. Cannot be changed after creation.</div>}
          </div>

          <div className="form-field">
            <label className="form-label">Description <span style={{ fontWeight: 400, color: 'var(--t4)' }}>(optional)</span></label>
            <input className="input" placeholder="What does this flag control?"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-field">
              <label className="form-label">Environment</label>
              <select className="input" value={form.environment} onChange={e => set('environment', e.target.value)}>
                {ENVS.map(env => <option key={env} value={env}>{env}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Type</label>
              <select className="input" value={form.type}
                onChange={e => { set('type', e.target.value); if (e.target.value === 'boolean') set('variations', []); }}
                disabled={isEdit}>
                {FLAG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Enable toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.025)',
            borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
          }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--t1)' }}>Enable flag</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--t4)', marginTop: 2 }}>
                Currently{' '}
                <strong style={{ color: form.enabled ? 'var(--green-l)' : 'var(--t3)' }}>
                  {form.enabled ? 'enabled' : 'disabled'}
                </strong>
              </div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} />
              <span className="toggle-track" />
            </label>
          </div>

          {/* Rollout */}
          <div className="form-field">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Rollout Percentage
              <strong style={{ color: 'var(--accent-l)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{form.rolloutPercentage}%</strong>
            </label>
            <input type="range" min="0" max="100" value={form.rolloutPercentage}
              onChange={e => set('rolloutPercentage', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)', marginTop: '0.375rem' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--t5)', marginTop: '0.2rem' }}>
              <span>0% — no users</span>
              <span>50% — gradual</span>
              <span>100% — all users</span>
            </div>
          </div>

          {form.type !== 'boolean' && form.variations.length > 0 && (
            <div className="form-field">
              <label className="form-label">Default variation</label>
              <select className="input" value={form.defaultVariation}
                onChange={e => set('defaultVariation', parseInt(e.target.value))}>
                {form.variations.map((v, i) => <option key={i} value={i}>{v.name}</option>)}
              </select>
            </div>
          )}
        </>}

        {tab === 'variations' && (
          <VariationsEditor variations={form.variations} onChange={v => set('variations', v)} flagType={form.type} />
        )}
        {tab === 'rules' && (
          <RulesBuilder rules={form.rules} onChange={r => set('rules', r)} variations={form.variations} flagType={form.type} />
        )}
        {tab === 'tags' && (
          <div className="form-field">
            <label className="form-label">Tags <span style={{ fontWeight: 400, color: 'var(--t4)' }}>(comma-separated)</span></label>
            <input className="input" placeholder="e.g. checkout, experiment, mobile"
              value={(form.tags || []).join(', ')}
              onChange={e => set('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.625rem' }}>
              {(form.tags || []).map(t => (
                <span key={t} style={{
                  background: 'var(--accent-sub)', color: 'var(--accent-l)',
                  padding: '0.2rem 0.5rem', borderRadius: 'var(--r-full)',
                  fontSize: '0.72rem', border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}>
                  #{t}
                  <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1, display: 'flex' }}
                    onClick={() => set('tags', (form.tags || []).filter(x => x !== t))}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.75rem' }}>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, height: 38 }}>
          {saving
            ? <><span className="spinner spinner-sm" style={{ borderTopColor: 'rgba(255,255,255,0.8)' }} /> Saving…</>
            : isEdit ? 'Update Flag' : 'Create Flag'
          }
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
};

/* ── Promote Modal ──────────────────────────────────────────── */
const PromoteModal = ({ flag, currentEnv, onConfirm, onClose }) => {
  const [target, setTarget]   = useState(ENVS.find(e => e !== currentEnv) || 'staging');
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try { await onConfirm(target); onClose(); }
    finally { setLoading(false); }
  };
  return (
    <div>
      <div className="modal-header">
        <div>
          <div className="modal-title">Promote Flag</div>
          <div className="modal-sub">
            Copy <code>{flag.name}</code> to another environment — starts <strong style={{ color: 'var(--yellow-l)' }}>disabled</strong> there.
          </div>
        </div>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={14} /></button>
      </div>
      <div className="form-field" style={{ marginTop: '1rem' }}>
        <label className="form-label">Target environment</label>
        <select className="input" value={target} onChange={e => setTarget(e.target.value)}>
          {ENVS.filter(e => e !== currentEnv).map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
        <button className="btn btn-primary" onClick={handle} disabled={loading} style={{ flex: 1, height: 38 }}>
          {loading
            ? <><span className="spinner spinner-sm" style={{ borderTopColor: 'rgba(255,255,255,0.8)' }} /> Promoting…</>
            : `Promote to ${target}`
          }
        </button>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

/* ── Bulk Action Bar ────────────────────────────────────────── */
const BulkActionBar = ({ count, onAction, onClear, loading }) => (
  <div className="bulk-bar">
    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent-l)' }}>
      {count} selected
    </span>
    <div style={{ width: 1, height: 16, background: 'var(--border-h)', margin: '0 0.25rem', flexShrink: 0 }} />
    {[
      { label: 'Enable',  action: 'enable',  cls: 'btn-ghost' },
      { label: 'Disable', action: 'disable', cls: 'btn-ghost' },
      { label: 'Archive', action: 'archive', cls: 'btn-ghost' },
      { label: 'Delete',  action: 'delete',  cls: 'btn-danger' },
    ].map(({ label, action, cls }) => (
      <button key={action} disabled={loading} className={`btn ${cls} btn-sm`}
        onClick={() => onAction(action)}>
        {label}
      </button>
    ))}
    <button className="btn btn-ghost btn-sm btn-icon" onClick={onClear} style={{ marginLeft: '0.125rem' }}>
      <X size={13} />
    </button>
  </div>
);

/* ── Flag Card (grid) ───────────────────────────────────────── */
const FlagCard = ({ f, canEdit, isAdmin, isStale, isSelected, onToggle, onEdit,
                    onDelete, onAnalytics, onArchive, onPromote, onSelect }) => (
  <div
    className={`card flag-card flag-${f.enabled ? 'enabled' : f.archived ? 'archived' : 'disabled'}`}
    style={{
      position: 'relative',
      outline: isSelected ? '2px solid var(--accent)' : 'none',
      outlineOffset: 1,
      opacity: f.archived ? 0.6 : 1,
      transition: 'opacity var(--t-base), border-color var(--t-base)',
    }}
  >
    {/* Select checkbox */}
    {canEdit && (
      <button
        onClick={() => onSelect(f._id)}
        style={{
          position: 'absolute', top: '0.625rem', left: '0.75rem',
          background: 'none', border: 'none', cursor: 'pointer',
          color: isSelected ? 'var(--accent-l)' : 'var(--t4)',
          padding: 0, display: 'flex', transition: 'color var(--t-fast)',
        }}
      >
        {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
      </button>
    )}

    {/* Top row */}
    <div className="flag-card-top" style={{ paddingLeft: canEdit ? '1.5rem' : 0 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.325rem', flexWrap: 'wrap' }}>
          <span className="flag-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
            {f.name}
          </span>
          <TypeBadge type={f.type || 'boolean'} />
          {f.archived && <span className="badge badge-muted" style={{ fontSize: '0.575rem' }}>archived</span>}
          {isStale && !f.archived && (
            <span title="No evaluations in 30 days" style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              fontSize: '0.575rem', fontWeight: 700,
              background: 'var(--yellow-bg)', color: 'var(--yellow-l)',
              border: '1px solid var(--yellow-bd)', borderRadius: 'var(--r-xs)',
              padding: '0.1rem 0.35rem',
            }}>
              <AlertTriangle size={7} /> stale
            </span>
          )}
          {f.rules?.length > 0 && (
            <span style={{
              fontSize: '0.575rem', fontWeight: 700,
              background: 'var(--accent-sub)', color: 'var(--accent-l)',
              border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--r-xs)',
              padding: '0.1rem 0.35rem',
            }}>
              {f.rules.length}r
            </span>
          )}
        </div>
        <div className="flag-desc" style={{ marginTop: '0.2rem' }}>
          {f.description || <span style={{ fontStyle: 'italic', color: 'var(--t5)' }}>No description</span>}
        </div>
      </div>
      <label className="toggle" style={{ cursor: canEdit && !f.archived ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
        <input type="checkbox" readOnly checked={f.enabled} onChange={() => canEdit && !f.archived && onToggle(f)} />
        <span className="toggle-track" onClick={() => canEdit && !f.archived && onToggle(f)} />
      </label>
    </div>

    {/* Meta row */}
    <div className="flag-meta">
      <span className={`env-${f.environment}`}><EnvDot env={f.environment} /></span>
      {f.enabled
        ? <span className="badge badge-green">Enabled</span>
        : <span className="badge badge-muted">Disabled</span>
      }
      {f.tags?.length > 0 && f.tags.slice(0, 2).map(t => (
        <span key={t} style={{
          fontSize: '0.58rem', background: 'var(--accent-sub)', color: 'var(--accent-l)',
          padding: '0.1rem 0.375rem', borderRadius: 'var(--r-full)',
          border: '1px solid rgba(99,102,241,0.15)',
        }}>#{t}</span>
      ))}
      <span style={{ fontSize: '0.62rem', color: 'var(--t5)', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>v{f.version}</span>
    </div>

    {/* Rollout */}
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--t3)', marginBottom: '0.3rem' }}>
        <span>Rollout</span>
        <span style={{ fontWeight: 700, color: f.rolloutPercentage > 0 ? 'var(--t1)' : 'var(--t5)', fontVariantNumeric: 'tabular-nums' }}>
          {f.rolloutPercentage}%
        </span>
      </div>
      <div className="rollout-bar">
        <div className="rollout-fill" style={{ width: `${f.rolloutPercentage}%` }} />
      </div>
    </div>

    {/* Variations preview */}
    {f.type !== 'boolean' && f.variations?.length > 0 && (
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
        {f.variations.slice(0, 3).map((v, i) => (
          <span key={i} style={{
            fontSize: '0.6rem',
            background: i === (f.defaultVariation ?? 0) ? 'var(--accent-sub)' : 'rgba(255,255,255,0.03)',
            color: i === (f.defaultVariation ?? 0) ? 'var(--accent-l)' : 'var(--t4)',
            padding: '0.1rem 0.375rem', borderRadius: 'var(--r-xs)',
            border: `1px solid ${i === (f.defaultVariation ?? 0) ? 'rgba(99,102,241,0.2)' : 'var(--border)'}`,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}>{v.name}: {String(v.value).slice(0, 12)}</span>
        ))}
        {f.variations.length > 3 && (
          <span style={{ fontSize: '0.6rem', color: 'var(--t4)' }}>+{f.variations.length - 3}</span>
        )}
      </div>
    )}

    {/* Actions */}
    {canEdit && (
      <div className="flag-actions">
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onAnalytics(f)} title="Analytics"><BarChart2 size={13} /></button>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onPromote(f)}   title="Promote to env"><ArrowUpRight size={13} /></button>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onArchive(f)}   title={f.archived ? 'Unarchive' : 'Archive'}>
          {f.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
        </button>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onEdit(f)} title="Edit"><Pencil size={13} /></button>
        {isAdmin && (
          <button className="btn btn-danger btn-sm btn-icon" onClick={() => onDelete(f)} title="Delete">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    )}
  </div>
);

/* ── Flag Row (list view) ───────────────────────────────────── */
const FlagRow = ({ f, canEdit, isAdmin, isStale, isSelected, onToggle, onEdit,
                   onDelete, onAnalytics, onArchive, onPromote, onSelect }) => (
  <tr style={{ opacity: f.archived ? 0.6 : 1 }}>
    {canEdit && (
      <td style={{ width: 36, paddingLeft: '0.875rem' }}>
        <button onClick={() => onSelect(f._id)} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex',
          color: isSelected ? 'var(--accent-l)' : 'var(--t4)',
        }}>
          {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
        </button>
      </td>
    )}
    <td style={{ maxWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <span className="flag-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{f.name}</span>
        <TypeBadge type={f.type || 'boolean'} />
        {isStale && !f.archived && (
          <span title="Stale — no evaluations in 30 days"><AlertTriangle size={11} color="var(--yellow)" /></span>
        )}
        {f.archived && <span className="badge badge-muted" style={{ fontSize: '0.575rem' }}>archived</span>}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--t4)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
        {f.description || '—'}
      </div>
    </td>
    <td><EnvDot env={f.environment} /></td>
    <td>
      {f.enabled
        ? <span className="badge badge-green">Enabled</span>
        : <span className="badge badge-muted">Disabled</span>
      }
    </td>
    <td>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 100 }}>
        <div style={{ flex: 1, background: 'var(--border)', borderRadius: 99, height: 3, overflow: 'hidden' }}>
          <div style={{ width: `${f.rolloutPercentage}%`, background: 'linear-gradient(90deg, var(--accent-d), var(--accent))', height: '100%', borderRadius: 99 }} />
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--t2)', fontWeight: 600, minWidth: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{f.rolloutPercentage}%</span>
      </div>
    </td>
    <td style={{ fontSize: '0.72rem', color: 'var(--t5)', fontVariantNumeric: 'tabular-nums' }}>v{f.version}</td>
    {canEdit && (
      <td>
        <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'flex-end' }}>
          <label className="toggle" style={{ cursor: !f.archived ? 'pointer' : 'not-allowed' }}>
            <input type="checkbox" readOnly checked={f.enabled} onChange={() => !f.archived && onToggle(f)} />
            <span className="toggle-track" onClick={() => !f.archived && onToggle(f)} />
          </label>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onAnalytics(f)} title="Analytics"><BarChart2 size={12} /></button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onPromote(f)}   title="Promote"><ArrowUpRight size={12} /></button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onArchive(f)}   title={f.archived ? 'Unarchive' : 'Archive'}>
            {f.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onEdit(f)} title="Edit"><Pencil size={12} /></button>
          {isAdmin && (
            <button className="btn btn-danger btn-sm btn-icon" onClick={() => onDelete(f)} title="Delete"><Trash2 size={12} /></button>
          )}
        </div>
      </td>
    )}
  </tr>
);

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
const FlagsPage = () => {
  const { user } = useAuth();
  const [flags,         setFlags]         = useState([]);
  const [staleIds,      setStaleIds]      = useState(new Set());
  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [env,           setEnv]           = useState('development');
  const [search,        setSearch]        = useState('');
  const [modal,         setModal]         = useState(null);
  const [analyticsFlag, setAnalyticsFlag] = useState(null);
  const [promoteFlag,   setPromoteFlag]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [bulkLoading,   setBulkLoading]   = useState(false);
  const [typeFilter,    setTypeFilter]    = useState('all');
  const [showArchived,  setShowArchived]  = useState(false);
  const [viewMode,      setViewMode]      = useState('grid');

  const canEdit = ['admin', 'developer'].includes(user?.role);
  const isAdmin = user?.role === 'admin';

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getFlags({ environment: env, search, limit: 100, archived: showArchived }),
      getStaleFlags({ environment: env, days: 30 }),
    ])
      .then(([fr, sr]) => {
        setFlags(fr.data.flags ?? []);
        setStaleIds(new Set((sr.data.stale ?? []).map(s => String(s.id))));
      })
      .catch(() => toast.error('Failed to load flags'))
      .finally(() => setLoading(false));
  }, [env, search, showArchived]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggle = async (f) => {
    try { await toggleFlag(f._id); load(); toast.success(`${f.name} ${f.enabled ? 'disabled' : 'enabled'}`); }
    catch { toast.error('Toggle failed'); }
  };

  const handleDelete = async (f) => {
    if (!confirm(`Delete "${f.name}"? This cannot be undone.`)) return;
    try { await deleteFlag(f._id); load(); toast.success('Flag deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const handleArchive = async (f) => {
    try {
      if (f.archived) { await unarchiveFlag(f._id); toast.success(`${f.name} unarchived`); }
      else            { await archiveFlag(f._id);   toast.success(`${f.name} archived`); }
      load();
    } catch { toast.error('Archive failed'); }
  };

  const handlePromoteConfirm = async (targetEnv) => {
    if (!promoteFlag) return;
    try {
      await promoteFlagApi(promoteFlag._id, { targetEnvironment: targetEnv });
      toast.success(`"${promoteFlag.name}" promoted to ${targetEnv}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Promote failed');
      throw err;
    }
  };

  const handleBulk = async (action) => {
    if (selectedIds.size === 0) return;
    if (action === 'delete' && !confirm(`Delete ${selectedIds.size} flag(s)? Cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      await bulkFlagAction(action, [...selectedIds]);
      toast.success(`Bulk ${action}: ${selectedIds.size} flag(s)`);
      setSelectedIds(new Set());
      load();
    } catch { toast.error(`Bulk ${action} failed`); }
    finally { setBulkLoading(false); }
  };

  const filtered = typeFilter === 'all' ? flags : flags.filter(f => (f.type || 'boolean') === typeFilter);

  const enabledCount  = flags.filter(f => f.enabled).length;
  const disabledCount = flags.length - enabledCount;

  const flagProps = (f) => ({
    f, canEdit, isAdmin,
    isStale:    staleIds.has(String(f._id)),
    isSelected: selectedIds.has(f._id),
    onToggle:   handleToggle,
    onEdit:     fl => setModal(fl),
    onDelete:   handleDelete,
    onAnalytics:fl => setAnalyticsFlag(fl),
    onArchive:  handleArchive,
    onPromote:  fl => setPromoteFlag(fl),
    onSelect:   toggleSelect,
  });

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', paddingBottom: selectedIds.size > 0 ? '5rem' : 0 }}>

      {/* Modals */}
      {modal && (
        <Modal onClose={() => setModal(null)} wide>
          <FlagForm initial={modal === 'create' ? null : modal}
            onSave={() => { setModal(null); load(); }}
            onClose={() => setModal(null)} />
        </Modal>
      )}
      {analyticsFlag && (
        <Modal onClose={() => setAnalyticsFlag(null)} wide>
          <AnalyticsModal flag={analyticsFlag} onClose={() => setAnalyticsFlag(null)} />
        </Modal>
      )}
      {promoteFlag && (
        <Modal onClose={() => setPromoteFlag(null)}>
          <PromoteModal flag={promoteFlag} currentEnv={env}
            onConfirm={handlePromoteConfirm} onClose={() => setPromoteFlag(null)} />
        </Modal>
      )}

      {/* ── Page Header ── */}
      <div className="ph">
        <div>
          <h1>
            <Flag size={17} style={{ color: 'var(--accent-l)', opacity: 0.85 }} />
            Feature Flags
          </h1>
          <div className="ph-sub">
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{flags.length} total</span>
            <span style={{ color: 'var(--border-h)' }}>·</span>
            <span style={{ color: 'var(--green-l)', fontVariantNumeric: 'tabular-nums' }}>{enabledCount} on</span>
            <span style={{ color: 'var(--border-h)' }}>·</span>
            <span style={{ color: 'var(--t4)', fontVariantNumeric: 'tabular-nums' }}>{disabledCount} off</span>
            {staleIds.size > 0 && (
              <>
                <span style={{ color: 'var(--border-h)' }}>·</span>
                <span style={{ color: 'var(--yellow-l)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertTriangle size={11} />{staleIds.size} stale
                </span>
              </>
            )}
          </div>
        </div>

        <div className="ph-actions">
          {/* View toggle */}
          <div className="view-toggle">
            {[
              { mode: 'grid', icon: <LayoutGrid size={13} /> },
              { mode: 'list', icon: <List size={13} /> },
            ].map(({ mode, icon }) => (
              <button key={mode}
                className={`view-toggle-btn${viewMode === mode ? ' active' : ''}`}
                onClick={() => setViewMode(mode)}
                title={`${mode} view`}>
                {icon}
              </button>
            ))}
          </div>

          <button
            className={`btn btn-sm ${showArchived ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setShowArchived(s => !s); setSelectedIds(new Set()); }}
            title="Show archived flags">
            <Archive size={13} />
            <span className="hide-mobile">{showArchived ? 'Archived' : 'Archived'}</span>
          </button>

          <button className="btn btn-secondary btn-sm btn-icon" onClick={load} title="Refresh">
            <RefreshCw size={13} />
          </button>

          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={() => setModal('create')}>
              <Plus size={13} /> New Flag
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="toolbar">
        {/* Env tabs */}
        <div className="tabs" style={{ flexShrink: 0 }}>
          {ENVS.map(e => (
            <button key={e} className={`tab${env === e ? ' active' : ''}`} onClick={() => setEnv(e)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <EnvDot env={e} />
              <span className="hide-mobile">{e}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="search-bar" style={{ flex: 1, maxWidth: 280 }}>
          <Search size={13} style={{ color: 'var(--t4)', flexShrink: 0 }} />
          <input placeholder="Search flags…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: '0.1rem', borderRadius: 'var(--r-sm)' }}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Type filter pills ── */}
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${typeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTypeFilter('all')}>
          All <span style={{ opacity: 0.65, marginLeft: 2, fontVariantNumeric: 'tabular-nums' }}>({flags.length})</span>
        </button>
        {FLAG_TYPES.map(t => {
          const count = flags.filter(f => (f.type || 'boolean') === t).length;
          if (count === 0) return null;
          const m = TYPE_META[t];
          return (
            <button key={t}
              className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTypeFilter(t)}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
              {t} <span style={{ opacity: 0.65, marginLeft: 2, fontVariantNumeric: 'tabular-nums' }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      {loading ? (
        /* Skeleton loading */
        viewMode === 'grid' ? (
          <div className="flag-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card" style={{ padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <div className="skeleton skeleton-text" style={{ width: '72%', height: 13 }} />
                    <div className="skeleton skeleton-text" style={{ width: '50%', height: 10 }} />
                  </div>
                  <div className="skeleton" style={{ width: 38, height: 22, borderRadius: 99, flexShrink: 0 }} />
                </div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <div className="skeleton" style={{ width: 75, height: 18, borderRadius: 99 }} />
                  <div className="skeleton" style={{ width: 56, height: 18, borderRadius: 99 }} />
                </div>
                <div className="skeleton" style={{ width: '100%', height: 3, borderRadius: 99 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-s)', alignItems: 'center' }}>
                <div className="skeleton skeleton-text" style={{ width: '20%', minWidth: 80 }} />
                <div className="skeleton skeleton-text" style={{ width: '8%', minWidth: 40 }} />
                <div className="skeleton skeleton-text" style={{ width: '10%', minWidth: 50 }} />
                <div className="skeleton skeleton-text" style={{ flex: 1 }} />
              </div>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">
            {showArchived ? <Archive size={20} /> : search ? <Search size={20} /> : <Flag size={20} />}
          </div>
          <div className="empty-title">
            {showArchived ? 'No archived flags' : search ? `No results for "${search}"` : 'No flags yet'}
          </div>
          <div className="empty-text">
            {showArchived
              ? 'Archive a flag from its card menu to move it here.'
              : search
                ? 'Try adjusting your search term or clear the filter.'
                : canEdit
                  ? 'Create your first feature flag to start controlling feature rollouts.'
                  : 'No flags have been created for this environment yet.'}
          </div>
          {!showArchived && !search && canEdit && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => setModal('create')}>
              <Plus size={13} /> Create Flag
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="flag-grid">
          {filtered.map((f, i) => (
            <div key={f._id} style={{ animation: `fadeUp 0.25s ease ${i * 0.02}s both` }}>
              <FlagCard {...flagProps(f)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {canEdit && <th style={{ width: 36 }} />}
                  <th>Flag</th>
                  <th>Environment</th>
                  <th>Status</th>
                  <th>Rollout</th>
                  <th>Version</th>
                  {canEdit && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => <FlagRow key={f._id} {...flagProps(f)} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onAction={handleBulk}
          onClear={() => setSelectedIds(new Set())}
          loading={bulkLoading}
        />
      )}
    </div>
  );
};

export default FlagsPage;
