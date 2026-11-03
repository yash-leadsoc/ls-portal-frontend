import { Link } from 'react-router-dom';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import '../exam.css';

/* ---------------- Icons (inline, stroke based) ---------------- */
const P = {
  home: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  users: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', { c: [9, 7, 4] }, 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  chart: ['M18 20V10', 'M12 20V4', 'M6 20v-6'],
  check: ['M20 6L9 17l-5-5'],
  checkSquare: ['M9 11l3 3L22 4', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
  clock: [{ c: [12, 12, 10] }, 'M12 6v6l4 2'],
  alert: ['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01'],
  plus: ['M12 5v14', 'M5 12h14'],
  edit: ['M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'],
  trash: ['M3 6h18', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6', 'M10 11v6', 'M14 11v6', 'M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2'],
  eye: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', { c: [12, 12, 3] }],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  search: [{ c: [11, 11, 8] }, 'M21 21l-4.35-4.35'],
  back: ['M19 12H5', 'M12 19l-7-7 7-7'],
  chevron: ['M9 18l6-6-6-6'],
  flag: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  play: ['M5 3l14 9-14 9z'],
  pause: ['M6 4h4v16H6z', 'M14 4h4v16h-4z'],
  layers: ['M12 2L2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
  award: [{ c: [12, 8, 7] }, 'M8.21 13.89L7 23l5-3 5 3-1.21-9.12'],
  refresh: ['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  calendar: [{ r: [3, 4, 18, 18, 2] }, 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  image: [{ r: [3, 3, 18, 18, 2] }, { c: [8.5, 8.5, 1.5] }, 'M21 15l-5-5L5 21'],
  up: ['M12 19V5', 'M5 12l7-7 7 7'],
  down: ['M12 5v14', 'M19 12l-7 7-7-7'],
  menu: ['M3 12h18', 'M3 6h18', 'M3 18h18'],
  info: [{ c: [12, 12, 10] }, 'M12 16v-4', 'M12 8h.01'],
  target: [{ c: [12, 12, 10] }, { c: [12, 12, 6] }, { c: [12, 12, 2] }],
  zap: ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  wifi: ['M5 12.55a11 11 0 0 1 14.08 0', 'M1.42 9a16 16 0 0 1 21.16 0', 'M8.53 16.11a6 6 0 0 1 6.95 0', 'M12 20h.01'],
  lock: [{ r: [3, 11, 18, 11, 2] }, 'M7 11V7a5 5 0 0 1 10 0v4'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  copy: [{ r: [9, 9, 13, 13, 2] }, 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
  mail: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M22 6l-10 7L2 6'],
  phone: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z'],
  save: ['M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z', 'M17 21v-8H7v8', 'M7 3v5h8'],
};

export function Icon({ name, size = 18, className = '', strokeWidth = 2 }) {
  const parts = P[name] || [];
  return (
    <svg className={`ex-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {parts.map((p, i) =>
        typeof p === 'string' ? <path key={i} d={p} /> : p.c ? <circle key={i} cx={p.c[0]} cy={p.c[1]} r={p.c[2]} /> :
        <rect key={i} x={p.r[0]} y={p.r[1]} width={p.r[2]} height={p.r[3]} rx={p.r[4]} />
      )}
    </svg>
  );
}

/* ---------------- Small building blocks ---------------- */
const TONES = {
  Live: 'success', Pass: 'success', Evaluated: 'success', Correct: 'success', Submitted: 'info',
  Scheduled: 'info', 'In Progress': 'info', Registered: 'neutral', Draft: 'neutral', Archived: 'neutral',
  Paused: 'warn', 'Pending Evaluation': 'warn', 'Under Evaluation': 'warn', Pending: 'warn',
  Fail: 'danger', Incorrect: 'danger', 'Auto Submitted': 'warn', Completed: 'neutral', Unanswered: 'neutral',
};
export function StatusBadge({ status, children }) {
  return <span className={`ex-badge ex-badge--${TONES[status] || 'neutral'}`}><i className="ex-dot" />{children || status}</span>;
}
export function Badge({ tone = 'neutral', children }) {
  return <span className={`ex-badge ex-badge--${tone}`}>{children}</span>;
}
export function Spinner() { return <span className="ex-spinner" role="status" aria-label="Loading" />; }
export function Loading({ text = 'Loading…' }) {
  return <div className="ex-center"><Spinner /><span>{text}</span></div>;
}
export function Alert({ tone = 'error', title, children, icon }) {
  if (!children && !title) return null;
  return (
    <div className={`ex-alert ex-alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={icon || (tone === 'error' || tone === 'warn' ? 'alert' : tone === 'success' ? 'check' : 'info')} />
      <div>{title && <b>{title}</b>}{children}</div>
    </div>
  );
}
export function Empty({ icon = 'file', title, children, action }) {
  return (
    <div className="ex-empty">
      <div className="ex-empty__icon"><Icon name={icon} size={24} /></div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
export function Button({ variant = 'primary', size, icon, busy, block, children, className = '', ...rest }) {
  return (
    <button type="button" {...rest} disabled={rest.disabled || busy}
      className={`ex-btn ex-btn--${variant} ${size ? `ex-btn--${size}` : ''} ${block ? 'ex-btn--block' : ''} ${className}`}>
      {busy ? <span className="ex-spinner" /> : icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} /> : null}
      {children}
    </button>
  );
}
export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`ex-field ${className}`}>
      {label && <span className="ex-label">{label}</span>}
      {children}
      {hint && <span className="ex-hint">{hint}</span>}
    </label>
  );
}
export function Switch({ checked, onChange, title, desc }) {
  return (
    <label className="ex-switch">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="ex-switch__track" />
      <span><b>{title}</b>{desc && <small>{desc}</small>}</span>
    </label>
  );
}
export function PageHeader({ title, subtitle, crumbs, actions }) {
  return (
    <div className="ex-pagehead">
      <div style={{ minWidth: 0 }}>
        {crumbs && (
          <nav className="ex-crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Icon name="chevron" size={13} />}
                {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="ex-spacer" />
      {actions && <div className="ex-row ex-row--wrap">{actions}</div>}
    </div>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({ open, title, onClose, children, footer, wide, dismissible = true, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape' && dismissible) onClose?.(); };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => ref.current?.querySelector('[data-autofocus],input,textarea,select,button')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); prev?.focus?.(); };
  }, [open, dismissible, onClose]);
  if (!open) return null;
  return (
    <div className="ex-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && dismissible) onClose?.(); }}>
      <section ref={ref} className={`ex-modal ${wide ? 'ex-modal--wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        {title && (
          <div className="ex-modal__head">
            <h2>{title}</h2>
            {dismissible && <button type="button" className="ex-btn ex-btn--ghost ex-btn--icon" onClick={onClose} aria-label="Close"><Icon name="x" /></button>}
          </div>
        )}
        <div className="ex-modal__body">{children}</div>
        {footer && <div className="ex-modal__foot">{footer}</div>}
      </section>
    </div>
  );
}
export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger, busy, onCancel, onConfirm }) {
  return (
    <Modal open={open} title={title} onClose={onCancel}
      footer={<><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} busy={busy} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <div className="ex-muted">{children}</div>
    </Modal>
  );
}

/* ---------------- Toasts ---------------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x, { id, message, tone }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="ex-toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`ex-toast ex-toast--${t.tone}`}>
            <Icon name={t.tone === 'error' ? 'alert' : 'check'} size={17} />{t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- Helpers ---------------- */
export const fmtDate = (d) => (d ? new Date(d).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtShort = (d) => (d ? new Date(d).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;
export const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);
export const TYPE_LABELS = { MCQ: 'Single choice', MULTI_SELECT: 'Multiple choice', TRUE_FALSE: 'True / False', SHORT_ANSWER: 'Short answer', LONG_ANSWER: 'Long answer' };
export const isAnswered = (v) => v != null && v !== '' && (!Array.isArray(v) || v.length > 0) && (typeof v !== 'string' || v.trim() !== '');
