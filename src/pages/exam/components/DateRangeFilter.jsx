import React from 'react';
import { Icon } from './ExamUI';

const PRESETS = [['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'Last 7 days'], ['month', 'This month'], ['all', 'All time'], ['custom', 'Custom']];
const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const eod = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const daysAgo = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return x; };

/** { preset, from, to } -> { from, to } as ISO strings, using the browser's local day boundaries. */
export function rangeOf({ preset, from, to }) {
  const now = new Date();
  let a; let b;
  if (preset === 'today') { a = sod(now); b = eod(now); }
  else if (preset === 'yesterday') { a = sod(daysAgo(1)); b = eod(daysAgo(1)); }
  else if (preset === 'week') { a = sod(daysAgo(6)); b = eod(now); }
  else if (preset === 'month') { a = new Date(now.getFullYear(), now.getMonth(), 1); b = eod(now); }
  else if (preset === 'custom') {
    if (from) a = sod(new Date(`${from}T00:00`));
    if (to) b = eod(new Date(`${to}T00:00`));
  }
  return { from: a ? a.toISOString() : '', to: b ? b.toISOString() : '' };
}

export default function DateRangeFilter({ value, onChange }) {
  return (
    <div className="ex-row ex-row--wrap" style={{ gap: 10 }}>
      <Icon name="calendar" size={16} />
      <div className="ex-tabs" role="tablist" aria-label="Date range">
        {PRESETS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={value.preset === k} className={value.preset === k ? 'on' : ''} onClick={() => onChange({ ...value, preset: k })}>{label}</button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <>
          <input className="ex-input" type="date" style={{ width: 160 }} value={value.from || ''} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} aria-label="From date" />
          <span className="ex-muted ex-small">to</span>
          <input className="ex-input" type="date" style={{ width: 160 }} value={value.to || ''} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} aria-label="To date" />
        </>
      )}
    </div>
  );
}
