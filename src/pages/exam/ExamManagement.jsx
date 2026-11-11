import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminRequest } from './adminApi';
import ExamForm from './components/ExamForm';
import { Alert, Badge, Button, ConfirmDialog, Empty, Field, Icon, Loading, Modal, PageHeader, StatusBadge, fmtDate, fromLocalInput, toLocalInput, useToast } from './components/ExamUI';

const FILTERS = ['All', 'Live', 'Scheduled', 'Draft', 'Paused', 'Completed', 'Archived'];

export default function ExamManagement() {
  const toast = useToast();
  const [exams, setExams] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const [rl, setRl] = useState(null);

  const endedWindow = (e) => !!e.endsAt && new Date(e.endsAt) <= new Date();
  const goLive = (e) => (e.status === 'Completed' || endedWindow(e)
    ? setRl({ exam: e, mode: 'until', until: toLocalInput(new Date(Date.now() + 2 * 3600 * 1000).toISOString()), busy: false, err: '' })
    : setStatus(e, 'Live'));

  async function confirmRelive() {
    setRl((r) => ({ ...r, busy: true, err: '' }));
    try {
      const body = rl.mode === 'open' ? { status: 'Live', noEndTime: true } : { status: 'Live', endsAt: fromLocalInput(rl.until) };
      const out = await adminRequest(`admin/exams/${rl.exam._id}/status`, { method: 'PATCH', body });
      toast(out.note || `“${rl.exam.name}” is Live again`);
      setRl(null);
      load();
    } catch (x) { setRl((r) => ({ ...r, busy: false, err: x.message })); }
  }

  const load = useCallback(() => adminRequest('admin/exams').then(setExams).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => (exams || []).filter((e) =>
    (filter === 'All' || e.status === filter) && e.name.toLowerCase().includes(q.trim().toLowerCase())), [exams, filter, q]);

  async function create(body) {
    setBusy(true);
    try {
      await adminRequest('admin/exams', { method: 'POST', body });
      setCreating(false);
      toast('Exam created as Draft. Add a question set next.');
      load();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  }
  async function setStatus(e, status) {
    const out = await adminRequest(`admin/exams/${e._id}/status`, { method: 'PATCH', body: { status } });
    toast(out?.note || `“${e.name}” is now ${status}`);
    try { await adminRequest(`admin/exams/${e._id}/status`, { method: 'PATCH', body: { status } }); toast(`“${e.name}” is now ${status}`); load(); }
    catch (x) { toast(x.message, 'error'); }
  }
  async function remove() {
    setBusy(true);
    try { await adminRequest(`admin/exams/${del._id}`, { method: 'DELETE' }); toast('Exam deleted'); setDel(null); load(); }
    catch (x) { toast(x.message, 'error'); setDel(null); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Examinations" subtitle="Create exams, build question sets and control when candidates can take them."
        actions={<Button icon="plus" onClick={() => setCreating(true)}>New exam</Button>} />
      <Alert>{error}</Alert>
      <section className="ex-card ex-card--flush">
        <div className="ex-toolbar">
          <div className="ex-input-wrap"><Icon name="search" size={16} /><input className="ex-input" placeholder="Search exams…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exams" /></div>
          <div className="ex-tabs" role="tablist">{FILTERS.map((f) => <button key={f} type="button" className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div>
        </div>
        {!exams && !error ? <Loading /> : !shown.length ? (
          <Empty icon="file" title={exams?.length ? 'No exams match your filters' : 'No exams yet'}
            action={!exams?.length && <Button icon="plus" onClick={() => setCreating(true)}>Create your first exam</Button>}>
            {!exams?.length && 'Create an exam, add a question set, then take it live.'}
          </Empty>
        ) : (
          <div className="ex-table-wrap"><table className="ex-table">
            <thead><tr><th>Exam</th><th>Status</th><th>Schedule</th><th className="ex-num">Duration / Marks</th><th className="ex-num">Sets · Qs</th><th className="ex-num">Candidates</th><th /></tr></thead>
            <tbody>{shown.map((e) => (
              <tr key={e._id}>
                <td><Link className="ex-cell-title" to={`/exam/admin/exams/${e._id}`} style={{ textDecoration: 'none' }}>{e.name}</Link>
                  <div className="ex-cell-sub">{e.category || 'Uncategorised'}{e.proctoringEnabled !== false && <> · <Icon name="shield" size={11} /> {e.maxWarnings ?? 3} warnings</>}</div></td>
                <td><StatusBadge status={e.status} /></td>
                <td className="ex-cell-sub">{e.startsAt || e.endsAt ? <>{fmtDate(e.startsAt)}<br />→ {fmtDate(e.endsAt)}</> : 'Always open when Live'}</td>
                <td className="ex-num">{e.durationMinutes} min · {e.maximumMarks}</td>
                <td className="ex-num">{e.setCount} · {e.questionCount}</td>
                <td className="ex-num">{e.candidateCount}</td>
                <td><div className="ex-actions">
                  {e.status === 'Live'
                    ? <Button size="sm" variant="secondary" icon="pause" onClick={() => setStatus(e, 'Paused')}>Pause</Button>
                    : ['Draft', 'Scheduled', 'Paused', 'Completed'].includes(e.status) && <Button size="sm" variant="success" icon="play" onClick={() => goLive(e)}>{e.status === 'Completed' ? 'Re-live' : 'Go live'}</Button>}
                  <Link to={`/exam/admin/exams/${e._id}/sets`}><Button size="sm" variant="secondary" icon="layers">Sets</Button></Link>
                  <Link to={`/exam/admin/exams/${e._id}`}><Button size="sm" variant="ghost" className="ex-btn--icon" icon="edit" aria-label="Edit" /></Link>
                  <Button size="sm" variant="ghost" className="ex-btn--icon" icon="trash" aria-label="Delete" onClick={() => setDel(e)} />
                </div></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>

      <Modal open={creating} wide title="Create examination" onClose={() => setCreating(false)} dismissible={!busy}>
        <ExamForm onSubmit={create} onCancel={() => setCreating(false)} busy={busy} submitLabel="Create exam" />
      </Modal>

      <Modal open={!!rl} title={`Re-open “${rl?.exam?.name || ''}”`} onClose={() => !rl?.busy && setRl(null)}
        footer={<><Button variant="secondary" disabled={rl?.busy} onClick={() => setRl(null)}>Cancel</Button>
          <Button variant="success" icon="play" busy={rl?.busy} disabled={rl?.mode === 'until' && !rl?.until} onClick={confirmRelive}>Make Live</Button></>}>
        {rl && (
          <div style={{ display: 'grid', gap: 12 }}>
            <p className="ex-small">Its end time was <b>{rl.exam.endsAt ? fmtDate(rl.exam.endsAt) : '—'}</b>. Choose how long it should stay open:</p>
            <label className="ex-small"><input type="radio" checked={rl.mode === 'until'} onChange={() => setRl({ ...rl, mode: 'until' })} /> <b>Open until a new end time</b></label>
            {rl.mode === 'until' && <Field label="New end time"><input className="ex-input" type="datetime-local" value={rl.until} onChange={(e) => setRl({ ...rl, until: e.target.value })} /></Field>}
            <label className="ex-small"><input type="radio" checked={rl.mode === 'open'} onChange={() => setRl({ ...rl, mode: 'open' })} /> <b>No end time</b> — stays Live until you pause or complete it</label>
            <Alert>{rl.err}</Alert>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!del} danger title="Delete this exam?" confirmLabel="Delete" busy={busy} onCancel={() => setDel(null)} onConfirm={remove}>
        “{del?.name}”, its question sets and candidate registrations will be removed. Exams that already have attempts cannot be deleted — archive them instead.
      </ConfirmDialog>
    </>
  );
}
