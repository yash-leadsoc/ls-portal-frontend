import { useEffect } from 'react';

export function Spinner({ sm }) {
  return <div className={`spinner ${sm ? 'sm' : ''}`} />;
}

export function LoadingPage() {
  return (
    <div className="loading-page">
      <Spinner />
    </div>
  );
}

export function Kpi({ value, label, icon }) {
  return (
    <div className="card kpi">
      {icon && <span className="ic">{icon}</span>}
      <div className="val">{value}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}

export function Badge({ children, kind = 'neutral' }) {
  return <span className={`badge ${kind}`}>{children}</span>;
}

export function Button({ variant = 'primary', size, block, children, ...rest }) {
  return (
    <button className={`btn ${variant} ${size || ''} ${block ? 'block' : ''}`} {...rest}>
      {children}
    </button>
  );
}

export function pctColors(pct) {
  if (pct == null || pct === 0) return { bg: 'var(--neutral-bg)', fg: '#9aa1b5' };
  if (pct < 30) return { bg: 'var(--warning-bg)', fg: 'var(--warning)' };
  if (pct < 70) return { bg: 'var(--info-bg)', fg: 'var(--info)' };
  return { bg: 'var(--success-bg)', fg: 'var(--success)' };
}

export function ProgressRow({ label, value, navy }) {
  const v = value ?? 0;
  return (
    <div className="prog-row">
      <div className="plabel">{label}</div>
      <div className="track">
        <div className={`fill ${navy ? 'navy' : ''}`} style={{ width: `${Math.min(100, v)}%` }} />
      </div>
      <div className="pval">{value == null ? '–' : `${value}%`}</div>
    </div>
  );
}

export function ScoreRing({ percent = 0, size = 104 }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const off = c - (c * Math.min(100, Math.max(0, percent))) / 100;
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={r} fill="none" stroke="#e4e8f0" strokeWidth="10" />
        <circle
          cx="52"
          cy="52"
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          transform="rotate(-90 52 52)"
          style={{ transition: 'stroke-dashoffset .5s ease' }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00a8c8" />
            <stop offset="100%" stopColor="#38c2dc" />
          </linearGradient>
        </defs>
      </svg>
      <div className="ring-num">{percent}%</div>
    </div>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ flex: 1 }}>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function initials(name = '') {
  const p = name.trim().split(/\s+/);
  if (!p[0]) return '?';
  return (p.length === 1 ? p[0][0] : p[0][0] + p[p.length - 1][0]).toUpperCase();
}
