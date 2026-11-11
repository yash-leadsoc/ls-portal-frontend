import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminRequest } from './adminApi';
import { Alert, Badge, Button, Loading, PageHeader, fmtDate, useToast } from './components/ExamUI';
import './proctoring/proctoring.css';

const LABEL = {
  TAB_SWITCH: 'Left the exam tab', WINDOW_BLUR: 'Window lost focus', FULLSCREEN_EXIT: 'Exited full screen', COPY_ATTEMPT: 'Copy attempt', CUT_ATTEMPT: 'Cut attempt',
  PASTE_ATTEMPT: 'Paste attempt', RESTRICTED_SHORTCUT: 'Restricted shortcut', CONTEXT_MENU: 'Context menu', FACE_NOT_DETECTED: 'Face not visible', MULTIPLE_FACES: 'Multiple faces visible',
  HEAD_DIRECTION_AWAY: 'Head turned away', CAMERA_DISCONNECTED: 'Camera disconnected', CAMERA_PERMISSION_DENIED: 'Camera blocked', PROCTORING_UNAVAILABLE: 'Analysis unavailable', PHONE_DETECTED: 'Phone detected', AUDIO_ACTIVITY: 'Audio activity',
};
const CATEGORY = (t) => (['FACE_NOT_DETECTED', 'MULTIPLE_FACES', 'HEAD_DIRECTION_AWAY', 'PHONE_DETECTED'].includes(t) ? 'Camera analysis' : t.startsWith('CAMERA') || t === 'PROCTORING_UNAVAILABLE' ? 'Camera status' : t === 'AUDIO_ACTIVITY' ? 'Audio' : 'Browser activity');
const fmtDur = (ms) => (ms == null ? '—' : ms < 1000 ? '<1 s' : ms < 60000 ? `${Math.round(ms / 1000)} s` : `${Math.floor(ms / 60000)} m ${Math.round((ms % 60000) / 1000)} s`);
const metaText = (m) => (m ? Object.entries(m).map(([k, v]) => `${k}: ${v}`).join(', ') : '');

export default function ProctoringCandidateDetails() {
  const { attemptId } = useParams();
  const toast = useToast();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [caseNote, setCaseNote] = useState('');
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState('');

  const load = useCallback(() => adminRequest(`admin/proctoring/candidates/${attemptId}`).then((r) => { setD(r); setCaseNote(r.session?.review?.note || ''); setError(''); }).catch((e) => setError(e.message)), [attemptId]);
  useEffect(() => { load(); }, [load]);

  async function review(ev, status) {
    setBusy(ev._id);
    try {
      const note = notes[ev._id] ?? ev.review?.note ?? '';
      await adminRequest(`admin/proctoring/events/${ev._id}/review`, { method: 'PATCH', body: { status, note } });
      toast(status === 'Pending' ? 'Reopened.' : `Marked ${status.toLowerCase()}.`); await load();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  }
  async function setCase(status) {
    setBusy('case');
    try { await adminRequest(`admin/proctoring/candidates/${attemptId}/case`, { method: 'PATCH', body: { status, note: caseNote } }); toast(`Case set to “${status}”.`); await load(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  }

  if (error && !d) return <Alert>{error}</Alert>;
  if (!d) return <Loading />;
  const s = d.session;
  const status = s?.review?.status || 'Clear';
  const c = s?.counts || {};

  return (
    <>
      <PageHeader title={d.candidate?.name || 'Candidate'} subtitle={`${d.candidate?.candidateId || ''} · ${d.exam?.name || ''} · Attempt: ${d.attempt.status}`}
        crumbs={[{ label: 'Proctoring', to: '/exam/admin/proctoring' }]} actions={<Link className="ex-btn ex-btn--secondary ex-btn--sm" to="/exam/admin/proctoring">Back</Link>} />
      <p className="pa-note">These events are automated review indicators, not evidence of misconduct. Natural movement, poor lighting, shared spaces and camera problems all cause false positives. Left/right directions are as seen by the camera.</p>
      <Alert tone="warn">{d.truncated ? 'Only the first events are shown.' : ''}</Alert>

      <div className="pa-grid">
        {[['Tab switches', c.tabSwitches], ['Window blurs', c.windowBlurs], ['Fullscreen exits', c.fullscreenExits], ['Face missing', c.faceMissing], ['Multiple faces', c.multipleFaces], ['Head turned away', c.headAway], ['Clipboard attempts', c.clipboard], ['Camera issues', c.cameraIssues]].map(([l, v]) => (
          <div className="pa-stat" key={l}><small>{l}</small><b>{v || 0}</b></div>))}
      </div>

      <div className="ex-card" style={{ marginBottom: 16 }}>
        <h3>Case status: <Badge tone={{ Clear: 'success', 'Needs Review': 'warn', 'Under Review': 'info', Escalated: 'danger', Resolved: 'neutral' }[status]}>{status}</Badge></h3>
        <p className="ex-small ex-muted">Consent: {s?.consent?.given ? `given ${fmtDate(s.consent.at)}` : 'not recorded'} · Camera: {s?.camera?.state || 'unknown'} · Accommodation: {s?.accommodation?.status || 'None'}</p>
        {s?.review?.at && <p className="ex-small ex-muted">Last updated {fmtDate(s.review.at)}</p>}
        <div className="pa-evnote" style={{ margin: '10px 0' }}>
          <input aria-label="Case note" placeholder="Case note (required to resolve or escalate)" maxLength={1000} value={caseNote} onChange={(e) => setCaseNote(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button size="sm" variant="secondary" busy={busy === 'case'} onClick={() => setCase('Under Review')}>Mark under review</Button>
          <Button size="sm" busy={busy === 'case'} onClick={() => setCase('Resolved')}>Resolve (no action)</Button>
          <Button size="sm" variant="danger" busy={busy === 'case'} onClick={() => setCase('Escalated')}>Escalate</Button>
          <Button size="sm" variant="ghost" busy={busy === 'case'} onClick={() => setCase('Clear')}>Reset to clear</Button>
        </div>
        <p className="ex-small ex-muted" style={{ marginTop: 8 }}>No automatic penalty is ever applied from these events. Resolving or escalating needs the Exam Admin role.</p>
      </div>

      <div className="ex-card pa-table-wrap" style={{ padding: 0 }}>
        <table className="pa-table">
          <thead><tr><th>Time</th><th>Event</th><th>Category</th><th>Severity</th><th className="num">Duration</th><th className="num">Confidence</th><th>Details</th><th>Review</th></tr></thead>
          <tbody>
            {d.events.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>No events recorded.</td></tr>}
            {d.events.map((ev) => (
              <tr key={ev._id}>
                <td>{fmtDate(ev.at)}</td><td>{LABEL[ev.type] || ev.type}</td><td>{CATEGORY(ev.type)}</td><td className={`pa-sev-${ev.severity}`}>{ev.severity}</td>
                <td className="num">{fmtDur(ev.durationMs)}</td><td className="num">{ev.confidence != null ? `${Math.round(ev.confidence * 100)}%` : '—'}</td><td>{metaText(ev.meta)}</td>
                <td>
                  <div className="pa-evnote">
                    <Badge tone={ev.review?.status === 'Reviewed' ? 'success' : ev.review?.status === 'Dismissed' ? 'neutral' : 'warn'}>{ev.review?.status || 'Pending'}</Badge>
                    <input aria-label="Review note" placeholder="Note" maxLength={1000} defaultValue={ev.review?.note || ''} onChange={(e) => setNotes((n) => ({ ...n, [ev._id]: e.target.value }))} />
                    <Button size="sm" variant="secondary" busy={busy === ev._id} onClick={() => review(ev, 'Reviewed')}>Reviewed</Button>
                    <Button size="sm" variant="ghost" busy={busy === ev._id} onClick={() => review(ev, 'Dismissed')}>Dismiss</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
