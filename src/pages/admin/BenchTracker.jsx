import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { Badge, Button, Empty, LoadingPage, Modal, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { parseBenchWorkbook, exportBenchWorkbook, downloadImportResults } from '../../utils/benchExcel';
import BenchReports from './BenchReports';

const todayIso = () => new Date().toISOString().slice(0, 10);
const iso = (d) => (d ? String(d).slice(0, 10) : '');
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');
const fmtShort = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const mondayOf = (isoDate) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

const STATUS_KIND = {
  Open: 'info',
  'Open - Under Training': 'neutral',
  PO: 'success',
  YTO: 'warning',
  Resigned: 'danger',
  'Pending Exit': 'danger',
  Onboarded: 'success',
  Exited: 'neutral',
};

const ageColor = (d) => (d == null ? '#64748b' : d > 90 ? '#dc2626' : d > 60 ? '#d97706' : d > 30 ? '#0284a8' : '#059669');

const th = { padding: '9px 10px', fontSize: 11.5, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 };
const td = { padding: '8px 10px', fontSize: 12.5, verticalAlign: 'top', borderTop: '1px solid #eef2f7' };

function FilterSelect({ label, value, onChange, options }) {
  return (
    <select className="select" style={{ height: 36, minWidth: 130, width: 'auto' }} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{label}: All</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function RecordModal({ id, statuses, bus, onClose, onSaved }) {
  const { toast, toastError } = useToast();
  const [rec, setRec] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState({ date: mondayOf(todayIso()), text: '' });

  const fill = (r) => {
    setRec(r);
    setForm({
      name: r.name, buCode: r.buCode, businessUnit: r.businessUnit || '', status: r.status, clientName: r.clientName || '',
      benchStart: iso(r.benchStart), source: r.source || '', doj: iso(r.doj), expYears: r.expYears ?? '', skill: r.skill || '',
      buOwner: r.buOwner || '', interviewRejects: r.interviewRejects || '', interviewRejectCount: r.interviewRejectCount || 0,
      screenRejects: r.screenRejects || '', screenRejectCount: r.screenRejectCount || 0,
      locationPreference: r.locationPreference || '', salesEffort: r.salesEffort || '',
    });
  };

  useEffect(() => {
    api.benchGet(id).then((r) => fill(r.record)).catch((e) => { toastError(e); onClose(); });
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.benchUpdate(id, form);
      fill(r.record);
      onSaved(r.record);
      toast('Saved');
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  const addComment = async () => {
    if (!comment.text.trim()) return toastError('Write a comment first');
    try {
      const r = await api.benchAddComment(id, comment.date, comment.text);
      fill(r.record);
      onSaved(r.record);
      setComment({ ...comment, text: '' });
      toast('Comment saved');
    } catch (e) {
      toastError(e);
    }
  };

  const removeComment = async (c) => {
    if (!window.confirm(`Delete the comment for ${fmt(c.date)}?`)) return;
    try {
      const r = await api.benchDeleteComment(id, c._id);
      fill(r.record);
      onSaved(r.record);
    } catch (e) {
      toastError(e);
    }
  };

  const f = (key, props = {}) => ({
    className: 'input',
    value: form[key] ?? '',
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
    ...props,
  });

  return (
    <Modal
      title={rec ? `${rec.empId} · ${rec.name}` : 'Loading…'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="cyan" onClick={save} disabled={saving || !form}>{saving ? <Spinner sm /> : 'Save details'}</Button>
        </>
      }
    >
      {!form ? (
        <LoadingPage />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 18 }}>
          <div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
              <div className="field" style={{ margin: 0 }}><label>Candidate</label><input {...f('name')} /></div>
              <div className="field" style={{ margin: 0 }}><label>Status</label>
                <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}><label>BU code</label><input {...f('buCode')} /></div>
              <div className="field" style={{ margin: 0 }}><label>Business Unit (portal)</label>
                <select className="select" value={form.businessUnit} onChange={(e) => setForm({ ...form, businessUnit: e.target.value })}>
                  <option value="">— Select —</option>
                  {bus.map((b) => <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}><label>Client name</label><input {...f('clientName')} /></div>
              <div className="field" style={{ margin: 0 }}><label>Bench start date</label><input {...f('benchStart', { type: 'date', max: todayIso() })} /></div>
              <div className="field" style={{ margin: 0 }}><label>Source</label><input {...f('source')} /></div>
              <div className="field" style={{ margin: 0 }}><label>DOJ</label><input {...f('doj', { type: 'date' })} /></div>
              <div className="field" style={{ margin: 0 }}><label>Exp (years)</label><input {...f('expYears', { type: 'number', step: '0.1', min: 0 })} /></div>
              <div className="field" style={{ margin: 0 }}><label>Skill</label><input {...f('skill')} /></div>
              <div className="field" style={{ margin: 0 }}><label>BU owner</label><input {...f('buOwner')} /></div>
              <div className="field" style={{ margin: 0 }}><label>Location preference</label><input {...f('locationPreference')} /></div>
              <div className="field" style={{ margin: 0 }}><label>Interview rejects (companies)</label><input {...f('interviewRejects')} /></div>
              <div className="field" style={{ margin: 0 }}><label>No. of interview rejects</label><input {...f('interviewRejectCount', { type: 'number', min: 0 })} /></div>
              <div className="field" style={{ margin: 0 }}><label>Screen rejects (companies)</label><input {...f('screenRejects')} /></div>
              <div className="field" style={{ margin: 0 }}><label>No. of screen rejects</label><input {...f('screenRejectCount', { type: 'number', min: 0 })} /></div>
              <div className="field" style={{ margin: 0 }}><label>Sales effort (codes)</label><input {...f('salesEffort', { placeholder: 'e.g. SI,YN' })} /></div>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Ageing: <b style={{ color: ageColor(rec.ageing) }}>{rec.ageing ?? '—'} days</b>
              {rec.employee ? ' · Portal login linked' : ' · No portal login'}
            </div>
            {rec.history && rec.history.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--navy)', marginBottom: 6 }}>Change history</div>
                <div style={{ maxHeight: 180, overflowY: 'auto', fontSize: 12 }}>
                  {rec.history.map((h, i) => (
                    <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #eef2f7' }}>
                      <span className="muted">{fmt(h.at)}</span> · <b>{h.field}</b>: {h.from || '—'} → <b>{h.to || '—'}</b>
                      {h.byName ? <span className="muted"> ({h.byName})</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--navy)', marginBottom: 8 }}>Date-wise comments ({rec.comments.length})</div>
            <div className="card" style={{ padding: 12, background: '#f8fafc', marginBottom: 12 }}>
              <div className="row gap-8" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Date</label>
                  <input className="input" type="date" value={comment.date} onChange={(e) => setComment({ ...comment, date: e.target.value })} />
                </div>
                <Button size="sm" variant="ghost" onClick={() => setComment({ ...comment, date: mondayOf(todayIso()) })}>This week</Button>
              </div>
              <textarea className="textarea" rows={3} style={{ marginTop: 8 }} value={comment.text} placeholder="Update for this date…"
                onChange={(e) => setComment({ ...comment, text: e.target.value })} />
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                <span className="muted" style={{ fontSize: 11.5 }}>Saving on a date that already has a comment replaces it.</span>
                <Button size="sm" variant="cyan" onClick={addComment}>Save comment</Button>
              </div>
            </div>
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {rec.comments.length === 0 && <div className="muted" style={{ fontSize: 13 }}>No comments yet.</div>}
              {rec.comments.map((c) => (
                <div key={c._id} style={{ borderLeft: '3px solid var(--cyan)', padding: '6px 10px', marginBottom: 10, background: '#fff' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <b style={{ fontSize: 12.5, color: 'var(--navy)' }}>{fmt(c.date)}</b>
                    <button type="button" onClick={() => removeComment(c)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>Delete</button>
                  </div>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', marginTop: 2 }}>{c.text}</div>
                  {c.byName ? <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>by {c.byName}</div> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function CommentCellModal({ record, date, onClose, onSaved }) {
  const { toast, toastError } = useToast();
  const existing = (record.comments || []).find((c) => iso(c.date) === date);
  const [value, setValue] = useState(existing ? existing.text : '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!value.trim()) return toastError('Write a comment first');
    setBusy(true);
    try {
      const r = await api.benchAddComment(record.id, date, value);
      onSaved(r.record);
      toast('Comment saved');
      onClose();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`${record.name} — ${fmt(date)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="cyan" onClick={save} disabled={busy}>{busy ? <Spinner sm /> : 'Save'}</Button>
        </>
      }
    >
      <div style={{ maxWidth: 640 }}>
        <textarea className="textarea" rows={5} autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
    </Modal>
  );
}

function ImportModal({ bus, onClose, onDone }) {
  const { toast, toastError } = useToast();
  const input = useRef(null);
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState('');
  const [buMap, setBuMap] = useState({});
  const [createAccounts, setCreateAccounts] = useState(true);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const autoMap = (codes) => {
    const m = {};
    codes.forEach((code) => {
      const c = code.toLowerCase().replace(/[^a-z0-9]/g, '');
      const hit =
        bus.find((b) => String(b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') === c) ||
        bus.find((b) => String(b.categoryName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === c);
      if (hit) m[code] = hit.id || hit._id;
    });
    return m;
  };

  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    setPreview(null);
    setResult(null);
    setFileName(file.name);
    try {
      const p = parseBenchWorkbook(await file.arrayBuffer());
      if (!p.rows.length) throw new Error('No engineer rows were found in the Bench sheet.');
      setParsed(p);
      setBuMap(autoMap(p.buCodes));
    } catch (e) {
      toastError(e);
      setParsed(null);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const check = async () => {
    setBusy(true);
    try {
      setPreview(await api.benchImport(parsed.rows, buMap, true, createAccounts));
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    setBusy(true);
    try {
      const r = await api.benchImport(parsed.rows, buMap, false, createAccounts);
      setResult(r);
      toast(`Imported: ${r.created} new, ${r.updated} updated`);
      onDone();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const view = result || preview;
  const unmapped = parsed ? parsed.buCodes.filter((c) => !buMap[c]) : [];

  return (
    <Modal
      title="Import bench list (Excel)"
      onClose={onClose}
      footer={
        <>
          {result && <Button variant="ghost" onClick={() => downloadImportResults(result.results)}>⬇ Download results & passwords</Button>}
          {parsed && !preview && !result && (
            <Button variant="cyan" onClick={check} disabled={busy || unmapped.length > 0}>{busy ? <Spinner sm /> : 'Check rows'}</Button>
          )}
          {preview && !result && (
            <Button variant="cyan" onClick={run} disabled={busy || !preview.valid}>
              {busy ? <Spinner sm /> : `Import ${preview.valid} row${preview.valid === 1 ? '' : 's'}`}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>{result ? 'Done' : 'Cancel'}</Button>
        </>
      }
    >
      <div className="card" style={{ padding: 14, background: '#f8fafc', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
          Upload the bench workbook as it is. The <b>Bench</b> sheet is read: EMP ID, Candidates, BU, Status, Client, Bench Start Date,
          Source, DOJ, Exp, Skill, BU Owner, rejects, Location, Sales Effort, and every <b>dated column</b> as a date-wise comment.
          Re-uploading updates existing engineers by EMP ID and keeps all earlier comments.
        </div>
        <div className="row gap-8" style={{ marginTop: 10, flexWrap: 'wrap' }}>
          <input ref={input} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => pick(e.target.files[0])} />
          <Button variant="cyan" size="sm" onClick={() => input.current && input.current.click()} disabled={busy}>
            {busy && !parsed ? <Spinner sm /> : parsed ? 'Choose another file' : '📤 Choose Excel file'}
          </Button>
          {fileName && <span className="muted" style={{ fontSize: 12.5 }}>{fileName}</span>}
        </div>
      </div>

      {parsed && !result && (
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <div className="row gap-8" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
            <Badge kind="neutral">{parsed.rows.length} engineers</Badge>
            <Badge kind="info">{parsed.commentDates.length} comment dates</Badge>
            <Badge kind="info">{parsed.rows.reduce((a, r) => a + r.comments.length, 0)} comments</Badge>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Map each BU code to a portal Business Unit</div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {parsed.buCodes.map((code) => (
              <div key={code} className="field" style={{ margin: 0 }}>
                <label>{code} ({parsed.rows.filter((r) => r.buCode === code).length})</label>
                <select className="select" value={buMap[code] || ''} disabled={!!preview}
                  onChange={(e) => setBuMap({ ...buMap, [code]: e.target.value })}>
                  <option value="">— Select BU —</option>
                  {bus.map((b) => <option key={b.id || b._id} value={b.id || b._id}>{b.name}{b.categoryName ? ` (${b.categoryName})` : ''}</option>)}
                </select>
              </div>
            ))}
          </div>
          <label className="row gap-8" style={{ marginTop: 12, fontSize: 13 }}>
            <input type="checkbox" checked={createAccounts} disabled={!!preview} onChange={(e) => setCreateAccounts(e.target.checked)} />
            Register a portal login for engineers who don't have one yet (login = EMP ID, password generated)
          </label>
          {unmapped.length > 0 && <div style={{ color: '#b45309', fontSize: 12.5, marginTop: 8 }}>Map all BU codes to continue: {unmapped.join(', ')}</div>}
        </div>
      )}

      {view && (
        <>
          <div className="row gap-8" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
            {result ? (
              <>
                <Badge kind="success">{result.created} new</Badge>
                <Badge kind="info">{result.updated} updated</Badge>
                <Badge kind="success">{result.accounts} logins created</Badge>
                {result.skipped > 0 && <Badge kind="danger">{result.skipped} skipped</Badge>}
              </>
            ) : (
              <>
                <Badge kind="success">{preview.newRecords} new</Badge>
                <Badge kind="info">{preview.updates} updates</Badge>
                <Badge kind="success">{preview.newAccounts} logins to create</Badge>
                {preview.invalid > 0 && <Badge kind="danger">{preview.invalid} with errors</Badge>}
              </>
            )}
          </div>
          {result && result.accounts > 0 && (
            <div style={{ fontSize: 12.5, color: '#b45309', marginBottom: 10 }}>
              Download the results now — generated passwords are shown only once.
            </div>
          )}
          <div className="table-wrap" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
            <table className="data">
              <thead><tr><th>Row</th><th>EMP ID</th><th style={{ textAlign: 'left' }}>Candidate</th><th>BU</th><th>Result</th><th>Comments</th><th style={{ textAlign: 'left' }}>Details</th></tr></thead>
              <tbody>
                {view.results.map((r) => (
                  <tr key={`${r.row}-${r.empId}`}>
                    <td>{r.row}</td>
                    <td>{r.empId || '—'}</td>
                    <td style={{ textAlign: 'left' }}>{r.name || '—'}</td>
                    <td>{r.buCode}{r.buName ? ` → ${r.buName}` : ''}</td>
                    <td><Badge kind={r.errors && r.errors.length ? 'danger' : r.action === 'new' || r.action === 'created' ? 'success' : 'info'}>{r.action}</Badge></td>
                    <td>{r.comments}</td>
                    <td style={{ textAlign: 'left', whiteSpace: 'normal', fontSize: 12, color: r.errors && r.errors.length ? '#dc2626' : '#475569' }}>
                      {r.errors && r.errors.length ? r.errors.join('; ') : r.password ? `Login ${r.login} · ${r.password}` : r.account === 'linked' ? 'Existing login linked' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}

export default function BenchTracker() {
  const { toastError } = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'reports' ? 'reports' : 'list';
  const [records, setRecords] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [bus, setBus] = useState([]);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ bu: '', status: '', skill: '', owner: '', age: '', flag: '', onBench: 'yes' });
  const [weekly, setWeekly] = useState(true);
  const [extraDates, setExtraDates] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [cell, setCell] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    try {
      const r = await api.benchList();
      setRecords(r.records);
      setStatuses(r.statuses);
    } catch (e) {
      toastError(e);
      setRecords([]);
    }
  };

  useEffect(() => {
    load();
    api.listBUs().then((r) => setBus(r.bus || [])).catch(() => {});
  }, []);

  const replace = (rec) => setRecords((list) => list.map((r) => (r.id === rec.id ? { ...r, ...rec, comments: rec.comments.slice(0, 12) } : r)));

  const opts = useMemo(() => {
    const u = (k) => [...new Set((records || []).map((r) => r[k]).filter(Boolean))].sort();
    return { bu: u('buCode'), status: u('status'), skill: u('skill'), owner: u('buOwner') };
  }, [records]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (records || []).filter((r) => {
      if (filters.onBench === 'yes' && !r.onBench) return false;
      if (filters.onBench === 'no' && r.onBench) return false;
      if (filters.bu && r.buCode !== filters.bu) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.skill && r.skill !== filters.skill) return false;
      if (filters.owner && r.buOwner !== filters.owner) return false;
      if (filters.age === '30' && !(r.ageing > 30)) return false;
      if (filters.age === '60' && !(r.ageing > 60)) return false;
      if (filters.age === '90' && !(r.ageing > 90)) return false;
      if (filters.flag === 'rejects' && !((r.interviewRejectCount || 0) >= 3)) return false;
      if (filters.flag === 'noupdate') {
        const wk = mondayOf(todayIso());
        if ((r.comments || []).some((c) => iso(c.date) >= wk)) return false;
      }
      if (s && ![r.empId, r.name, r.skill, r.clientName, r.buOwner, r.locationPreference].some((v) => String(v || '').toLowerCase().includes(s))) return false;
      return true;
    });
  }, [records, filters, q]);

  const commentDates = useMemo(() => {
    const all = new Set([...extraDates, ...(records || []).flatMap((r) => (r.comments || []).map((c) => iso(c.date)))]);
    return [...all].sort().reverse().slice(0, 6);
  }, [records, extraDates]);

  const doExport = async () => {
    setExporting(true);
    try {
      const [full, rep] = await Promise.all([api.benchList(true), api.benchReport('week', todayIso())]);
      const ids = new Set(shown.map((r) => r.id));
      exportBenchWorkbook(full.records.filter((r) => ids.has(r.id)), rep);
    } catch (e) {
      toastError(e);
    } finally {
      setExporting(false);
    }
  };

  const setF = (k) => (v) => setFilters({ ...filters, [k]: v });

  return (
    <>
      <div className="page-head row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1>Bench Tracker</h1>
          <p>Bench engineers, weekly updates and reports — managed like the bench Excel.</p>
        </div>
        <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={() => setShowImport(true)}>📤 Import Excel</Button>
          <Button variant="cyan" onClick={doExport} disabled={exporting || !shown.length}>{exporting ? <Spinner sm /> : '⬇ Export Excel'}</Button>
        </div>
      </div>

      <div className="tabs" style={{ width: 'max-content', marginBottom: 12 }}>
        <button className={`tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setParams({})}>📋 Bench list</button>
        <button className={`tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setParams({ tab: 'reports' })}>📊 Reports</button>
      </div>

      {tab === 'reports' ? (
        <BenchReports />
      ) : !records ? (
        <LoadingPage />
      ) : records.length === 0 ? (
        <Empty>No bench data yet. Click “Import Excel” to upload the bench list.</Empty>
      ) : (
        <>
          <div className="card" style={{ padding: 12, marginBottom: 12 }}>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              <input className="input" style={{ height: 36, maxWidth: 240 }} placeholder="Search name, EMP ID, skill…" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className="select" style={{ height: 36, width: 'auto' }} value={filters.onBench} onChange={(e) => setF('onBench')(e.target.value)}>
                <option value="yes">On bench</option>
                <option value="no">Off bench (onboarded / exited)</option>
                <option value="">Everyone</option>
              </select>
              <FilterSelect label="BU" value={filters.bu} onChange={setF('bu')} options={opts.bu} />
              <FilterSelect label="Status" value={filters.status} onChange={setF('status')} options={opts.status} />
              <FilterSelect label="Skill" value={filters.skill} onChange={setF('skill')} options={opts.skill} />
              <FilterSelect label="BU owner" value={filters.owner} onChange={setF('owner')} options={opts.owner} />
              <select className="select" style={{ height: 36, width: 'auto' }} value={filters.age} onChange={(e) => setF('age')(e.target.value)}>
                <option value="">Ageing: All</option>
                <option value="30">Over 30 days</option>
                <option value="60">Over 60 days</option>
                <option value="90">Over 90 days</option>
              </select>
              <select className="select" style={{ height: 36, width: 'auto' }} value={filters.flag} onChange={(e) => setF('flag')(e.target.value)}>
                <option value="">Flags: All</option>
                <option value="rejects">3+ interview rejects</option>
                <option value="noupdate">No update this week</option>
              </select>
              <label className="row gap-8" style={{ fontSize: 12.5, marginLeft: 'auto' }}>
                <input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} /> Weekly comments view
              </label>
              {weekly && (
                <Button size="sm" variant="ghost" onClick={() => {
                  const d = window.prompt('Add a comment column for date (YYYY-MM-DD):', mondayOf(todayIso()));
                  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setExtraDates((x) => [...new Set([...x, d])]);
                }}>+ Date column</Button>
              )}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Showing {shown.length} of {records.length}. Click a name to edit details and full comment history{weekly ? '; click a comment cell to add or edit that week\'s update' : ''}.
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'auto', maxHeight: '70vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={th}>EMP ID</th><th style={th}>Candidate</th><th style={th}>BU</th><th style={th}>Status</th>
                  <th style={th}>Client</th><th style={th}>Bench start</th><th style={th}>Ageing</th><th style={th}>Exp</th>
                  <th style={th}>Skill</th><th style={th}>Owner</th><th style={th}>Int. rej.</th><th style={th}>Scr. rej.</th>
                  <th style={th}>Location</th><th style={th}>Sales</th>
                  {weekly ? commentDates.map((d) => <th key={d} style={{ ...th, minWidth: 190 }}>{fmtShort(d)}</th>) : <th style={th}>Latest update</th>}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const byDate = new Map((r.comments || []).map((c) => [iso(c.date), c.text]));
                  const latest = (r.comments || [])[0];
                  return (
                    <tr key={r.id}>
                      <td style={td}><Badge kind="neutral">{r.empId}</Badge></td>
                      <td style={td}>
                        <button type="button" onClick={() => setOpenId(r.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--navy)', fontWeight: 700, textAlign: 'left' }}>
                          {r.name}
                        </button>
                        {r.businessUnitName && <div className="muted" style={{ fontSize: 11 }}>{r.businessUnitName}</div>}
                      </td>
                      <td style={td}>{r.buCode}</td>
                      <td style={td}><Badge kind={STATUS_KIND[r.status] || 'neutral'}>{r.status}</Badge></td>
                      <td style={td}>{r.clientName || '—'}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmt(r.benchStart)}</td>
                      <td style={{ ...td, fontWeight: 700, color: ageColor(r.ageing) }}>{r.ageing ?? '—'}</td>
                      <td style={td}>{r.expYears ?? '—'}</td>
                      <td style={td}>{r.skill || '—'}</td>
                      <td style={td}>{r.buOwner || '—'}</td>
                      <td style={{ ...td, color: (r.interviewRejectCount || 0) >= 3 ? '#dc2626' : undefined }} title={r.interviewRejects}>{r.interviewRejectCount || 0}</td>
                      <td style={td} title={r.screenRejects}>{r.screenRejectCount || 0}</td>
                      <td style={td}>{r.locationPreference || '—'}</td>
                      <td style={td}>{r.salesEffort || '—'}</td>
                      {weekly ? (
                        commentDates.map((d) => (
                          <td key={d} style={{ ...td, cursor: 'pointer', maxWidth: 260, background: byDate.get(d) ? '#fff' : '#fcfcfd' }} onClick={() => setCell({ record: r, date: d })}>
                            <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, maxHeight: 72, overflow: 'hidden' }}>{byDate.get(d) || <span className="muted">+ add</span>}</div>
                          </td>
                        ))
                      ) : (
                        <td style={{ ...td, maxWidth: 320 }}>
                          {latest ? (<><b style={{ fontSize: 11.5 }}>{fmt(latest.date)}</b><div style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{latest.text}</div></>) : <span className="muted">No updates</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {openId && <RecordModal id={openId} statuses={statuses} bus={bus} onClose={() => setOpenId(null)} onSaved={replace} />}
      {cell && <CommentCellModal record={cell.record} date={cell.date} onClose={() => setCell(null)} onSaved={replace} />}
      {showImport && <ImportModal bus={bus} onClose={() => setShowImport(false)} onDone={load} />}
    </>
  );
}
