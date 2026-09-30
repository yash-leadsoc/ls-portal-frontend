import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api } from '../../api/client';
import { Badge, Button, Empty, LoadingPage, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { exportBenchReport } from '../../utils/benchExcel';

const COLORS = ['#08a6c7', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#94a3b8'];
const NAVY = '#102a56';
const todayIso = () => new Date().toISOString().slice(0, 10);
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');

function shiftDate(isoDate, kind, dir) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (kind === 'month') d.setUTCMonth(d.getUTCMonth() + dir);
  else d.setUTCDate(d.getUTCDate() + 7 * dir);
  return d.toISOString().slice(0, 10);
}

function Kpi({ label, value, sub, tone }) {
  const color = tone === 'bad' ? '#dc2626' : tone === 'warn' ? '#d97706' : tone === 'good' ? '#059669' : NAVY;
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>{label}</div>
      {sub ? <div className="muted" style={{ fontSize: 11 }}>{sub}</div> : null}
    </div>
  );
}

function Panel({ title, children, wide }) {
  return (
    <div className="card" style={{ padding: 16, gridColumn: wide ? '1 / -1' : undefined }}>
      <div style={{ fontSize: 13.5, fontWeight: 750, color: NAVY, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function SimpleTable({ head, rows, empty = 'Nothing to show.', total }) {
  if (!rows.length) return <div className="muted" style={{ fontSize: 13 }}>{empty}</div>;
  return (
    <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
      <table className="data">
        <thead><tr>{head.map((h, i) => <th key={i} style={{ textAlign: i === 0 ? 'left' : 'center' }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={total && i === rows.length - 1 ? { fontWeight: 700, background: '#f8fafc' } : undefined}>
              {r.map((c, j) => <td key={j} style={{ textAlign: j === 0 ? 'left' : 'center', whiteSpace: j === 0 ? 'nowrap' : 'normal' }}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const colTotals = (rows, n) => Array.from({ length: n }, (_, i) => rows.reduce((a, r) => a + (r[i] || 0), 0));

export default function BenchReports() {
  const { toastError } = useToast();
  const [kind, setKind] = useState('week');
  const [date, setDate] = useState(todayIso());
  const [rep, setRep] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRep(null);
    api.benchReport(kind, date).then(setRep).catch((e) => { toastError(e); setRep({ error: true }); });
  }, [kind, date]);

  const download = async () => {
    setBusy(true);
    try {
      const full = await api.benchList(true);
      exportBenchReport(rep, full.records);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const k = rep && !rep.error ? rep.kpis : null;

  return (
    <>
      <div className="card" style={{ padding: 12, marginBottom: 14 }}>
        <div className="row gap-8" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <button className={`chip ${kind === 'week' ? 'active' : ''}`} onClick={() => setKind('week')}>Weekly</button>
          <button className={`chip ${kind === 'month' ? 'active' : ''}`} onClick={() => setKind('month')}>Monthly</button>
          <Button size="sm" variant="ghost" onClick={() => setDate(shiftDate(date, kind, -1))}>◀ Previous</Button>
          <input className="input" type="date" style={{ height: 34, width: 160 }} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <Button size="sm" variant="ghost" onClick={() => setDate(shiftDate(date, kind, 1))}>Next ▶</Button>
          <Button size="sm" variant="ghost" onClick={() => setDate(todayIso())}>Current</Button>
          {rep && rep.period && <b style={{ color: NAVY, marginLeft: 8 }}>{rep.period.label}</b>}
          <div style={{ marginLeft: 'auto' }} className="row gap-8">
            <Button size="sm" variant="ghost" onClick={() => window.print()} disabled={!k}>🖨 Print</Button>
            <Button size="sm" variant="cyan" onClick={download} disabled={!k || busy}>{busy ? <Spinner sm /> : '⬇ Download detailed report'}</Button>
          </div>
        </div>
      </div>

      {!rep ? (
        <LoadingPage />
      ) : rep.error ? (
        <Empty>Could not load the report.</Empty>
      ) : (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 12, marginBottom: 16 }}>
            <Kpi label="On bench now" value={k.onBench} sub={`avg ageing ${k.avgAgeing} days`} />
            <Kpi label="Open" value={k.open} />
            <Kpi label="Under training" value={k.underTraining} />
            <Kpi label="Pending onboarding (PO)" value={k.pendingOnboarding} tone="good" />
            <Kpi label="Yet to offboard (YTO)" value={k.yetToOffboard} />
            <Kpi label="Resigned / pending exit" value={k.exits} tone={k.exits ? 'warn' : undefined} />
            <Kpi label="Above 90 days" value={k.over90} tone={k.over90 ? 'bad' : 'good'} />
            <Kpi label={`Joined bench this ${kind}`} value={k.joinedInPeriod} />
            <Kpi label={`Status changes this ${kind}`} value={k.statusChangesInPeriod} />
            <Kpi label={`Updates this ${kind}`} value={k.commentsInPeriod} sub={`${k.updatedInPeriod} engineers updated`} />
            <Kpi label="No update this period" value={k.notUpdatedInPeriod} tone={k.notUpdatedInPeriod ? 'warn' : 'good'} />
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 14, marginBottom: 14 }}>
            <Panel title="Summary of bench (current)" wide>
              <SimpleTable head={['', ...rep.buCodes, 'Total']} rows={rep.matrix.map((m) => [m.label, ...m.cells, m.total])} />
            </Panel>

            <Panel title={`Bench trend (${kind === 'month' ? 'last 12 months' : 'last 12 weeks'})`} wide>
              <div style={{ height: 260 }}>
                <ResponsiveContainer>
                  <LineChart data={rep.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="onBench" name="On bench" stroke={COLORS[0]} strokeWidth={2} />
                    <Line type="monotone" dataKey="joined" name="Joined bench" stroke={COLORS[1]} strokeWidth={2} />
                    <Line type="monotone" dataKey="movedOff" name="Moved off bench" stroke={COLORS[2]} strokeWidth={2} />
                    <Line type="monotone" dataKey="comments" name="Updates" stroke={COLORS[3]} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Experience range split">
              <SimpleTable
                total
                head={['BU', ...rep.expBuckets, 'Total']}
                rows={[
                  ...rep.expSplit.map((e) => [e.bu, ...e.cells, e.total]),
                  ['Total', ...colTotals(rep.expSplit.map((e) => [...e.cells, e.total]), rep.expBuckets.length + 1)],
                ]}
              />
            </Panel>

            <Panel title="Red flags">
              <SimpleTable
                total
                head={['BU', 'Above 90 days', '3+ interview rejects']}
                rows={[
                  ...rep.redFlags.map((f) => [f.bu, f.over90, f.rejects3]),
                  ['Total', ...colTotals(rep.redFlags.map((f) => [f.over90, f.rejects3]), 2)],
                ]}
              />
            </Panel>

            <Panel title="Bench ageing">
              <div style={{ height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={rep.ageing}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Engineers" fill={COLORS[3]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Status split (all records)">
              <div style={{ height: 240 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={rep.statusCounts} dataKey="value" nameKey="name" outerRadius={85} label={({ name, value }) => `${name}: ${value}`}>
                      {rep.statusCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="BU / skill split" wide>
              <SimpleTable head={['BU', 'Skill', ...rep.expBuckets, 'Total']} rows={rep.skills.map((s) => [s.bu, s.skill, ...s.cells, s.total])} />
            </Panel>

            <Panel title="Sales effort towards bench profiles">
              <SimpleTable
                head={['Sales code', 'Profiles worked', `Effort % (of ${rep.salesBase})`]}
                rows={rep.sales.map((s) => [s.code, s.count, `${s.pct}%`])}
                empty="No sales effort codes recorded."
              />
            </Panel>

            <Panel title="Location preference">
              <SimpleTable head={['Location', 'Engineers']} rows={rep.locations.map((l) => [l.name, l.value])} />
            </Panel>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 14 }}>
            <Panel title={`Joined bench this ${kind} (${rep.joined.length})`}>
              <SimpleTable
                head={['Candidate', 'EMP ID', 'BU', 'Bench start', 'Skill']}
                rows={rep.joined.map((j) => [j.name, j.empId, j.buCode, fmt(j.benchStart), j.skill || '—'])}
                empty="No one joined the bench in this period."
              />
            </Panel>

            <Panel title={`Status changes this ${kind} (${rep.changes.length})`}>
              <SimpleTable
                head={['Candidate', 'BU', 'Change', 'When', 'By']}
                rows={rep.changes.map((c) => [c.name, c.buCode, `${c.field}: ${c.from || '—'} → ${c.to || '—'}`, fmt(c.at), c.byName || '—'])}
                empty="No status changes in this period."
              />
            </Panel>

            <Panel title={`Updates this ${kind} (${rep.comments.length})`} wide>
              {rep.comments.length === 0 ? (
                <div className="muted" style={{ fontSize: 13 }}>No updates recorded in this period.</div>
              ) : (
                <div style={{ maxHeight: 460, overflowY: 'auto' }}>
                  {rep.comments.map((c, i) => (
                    <div key={i} style={{ borderLeft: '3px solid var(--cyan)', padding: '6px 10px', marginBottom: 8 }}>
                      <div className="row gap-8" style={{ flexWrap: 'wrap', fontSize: 12.5 }}>
                        <b style={{ color: NAVY }}>{c.name}</b>
                        <Badge kind="neutral">{c.empId}</Badge>
                        <span className="muted">{c.buCode} · {c.status} · {fmt(c.date)}</span>
                      </div>
                      <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', marginTop: 2 }}>{c.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title={`No update this ${kind} (${rep.notUpdated.length})`} wide>
              <SimpleTable
                head={['Candidate', 'EMP ID', 'BU', 'Status', 'Ageing (days)', 'Last update']}
                rows={rep.notUpdated.map((n) => [n.name, n.empId, n.buCode, n.status, n.ageing ?? '—', fmt(n.lastUpdate)])}
                empty="Every engineer on the bench was updated in this period."
              />
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
