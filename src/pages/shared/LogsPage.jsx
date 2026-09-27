import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { LoadingPage, Empty, Badge, Button } from '../../components/ui';
import { useToast } from '../../components/Toast';
import LogInsights from './LogsInsights';

const ACTIONS = ['', 'create', 'update', 'delete', 'login', 'writeup.focus_lost'];
const ENTITIES = ['', 'checklist', 'writeup', 'document', 'domain', 'user', 'auth'];

const th = { padding: '10px 12px', fontSize: 11.5, fontWeight: 700, color: '#475569', textAlign: 'left', whiteSpace: 'nowrap' };
const td = { padding: '10px 12px', fontSize: 12.5, verticalAlign: 'top', borderTop: '1px solid #eef2f7' };

const actionColor = (a) =>
  a === 'delete' ? 'danger' : a === 'create' ? 'success' : a?.startsWith('writeup') ? 'warning' : 'neutral';

export default function LogsPage() {
  const { toastError } = useToast();
  const [data, setData] = useState({ rows: [], total: 0, page: 1, limit: 50 });
  const [loading, setLoading] = useState(true);

  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState('logs');
  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listAudit({ action, entity, q, from, to, page, limit: 50 });
      setData(res);
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [action, entity, from, to, page]);

  const applySearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const reset = () => {
    setAction(''); setEntity(''); setQ(''); setFrom(''); setTo(''); setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / (data.limit || 50)));

  return (
    <>
      <div className="page-head">
        <h1>Activity logs</h1>
        <p>Every create, update and delete — plus write-up focus events.</p>
      </div>
      <div className="tabs" style={{ marginBottom: 14 }}>
        <button className={`tab ${view === 'logs' ? 'active' : ''}`} onClick={() => setView('logs')}>Logs</button>
        <button className={`tab ${view === 'insights' ? 'active' : ''}`} onClick={() => setView('insights')}>Insights</button>
      </div>

{view === 'insights' ? (
  <LogInsights />
) : (<>

      <section className="card" style={{ padding: 14, marginBottom: 14 }}>
        <form onSubmit={applySearch} className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Action</label>
            <select className="select" value={action} onChange={(e) => { setPage(1); setAction(e.target.value); }}>
              {ACTIONS.map((a) => <option key={a} value={a}>{a || 'All actions'}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Entity</label>
            <select className="select" value={entity} onChange={(e) => { setPage(1); setEntity(e.target.value); }}>
              {ENTITIES.map((en) => <option key={en} value={en}>{en || 'All entities'}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>From</label>
            <input className="input" type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>To</label>
            <input className="input" type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} />
          </div>
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 180 }}>
            <label>Search (name / item)</label>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. STA, John…" />
          </div>
          <Button variant="cyan" type="submit">Search</Button>
          <Button variant="ghost" type="button" onClick={reset}>Reset</Button>
        </form>
      </section>

      {loading ? (
        <LoadingPage />
      ) : data.rows.length === 0 ? (
        <Empty>No logs match these filters.</Empty>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={th}>When</th>
                  <th style={th}>Who</th>
                  <th style={th}>Action</th>
                  <th style={th}>Entity</th>
                  <th style={th}>Item</th>
                  <th style={th}>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r._id}>
                    <td style={{ ...td, whiteSpace: 'nowrap', color: '#64748b' }}>
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td style={td}>
                      <div style={{ fontWeight: 700, color: '#102a56' }}>{r.actorName || '—'}</div>
                      <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{r.actorRole}</div>
                    </td>
                    <td style={td}><Badge kind={actionColor(r.action)}>{r.action}</Badge></td>
                    <td style={{ ...td, color: '#475569' }}>{r.entity || '—'}</td>
                    <td style={{ ...td, color: '#1e293b' }}>{r.entityLabel || '—'}</td>
                    <td style={{ ...td, color: '#64748b', maxWidth: 320 }}>
                      {r.meta && Object.keys(r.meta).length ? (
                        <code style={{ fontSize: 11 }}>{JSON.stringify(r.meta)}</code>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span className="muted" style={{ fontSize: 12 }}>{data.total} entries</span>
            <div className="row gap-8">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
              <span style={{ fontSize: 12.5, color: '#475569' }}>Page {page} / {totalPages}</span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
            </div>
          </div>
        </>
      )}

</>)}

    </>
  );
}
