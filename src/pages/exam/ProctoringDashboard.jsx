import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminRequest, qs } from './adminApi';
import { Alert, Badge, Button, Empty, Loading, PageHeader, fmtShort, useToast } from './components/ExamUI';
import './proctoring/proctoring.css';

const REVIEW_TONE = { Clear: 'success', 'Needs Review': 'warn', 'Under Review': 'info', Escalated: 'danger', Resolved: 'neutral' };
const CAMERA_LABEL = { ok: 'OK', denied: 'Blocked', unavailable: 'No camera', disconnected: 'Disconnected', unknown: '—', not_required: 'Not required' };

export default function ProctoringDashboard() {
  const toast = useToast();
  const nav = useNavigate();
  const [exams, setExams] = useState([]);
  const [exam, setExam] = useState('');
  const [q, setQ] = useState('');
  const [review, setReview] = useState('');
  const [overview, setOverview] = useState(null);
  const [rows, setRows] = useState(null);
  const [acc, setAcc] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { adminRequest('admin/exams').then(setExams).catch(() => {}); }, []);

  const load = useCallback(async () => {
    try {
      const [o, c, a] = await Promise.all([
        adminRequest(`admin/proctoring/overview${qs({ exam })}`),
        adminRequest(`admin/proctoring/candidates${qs({ exam, q, review })}`),
        adminRequest(`admin/proctoring/accommodations${qs({ exam, status: 'Pending' })}`),
      ]);
      setOverview(o); setRows(c.rows); setAcc(a); setError('');
    } catch (e) { setError(e.message); }
  }, [exam, q, review]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  // Light auto-refresh while the page is visible (one small request set every 30 s per admin).
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) load(); }, 30000);
    return () => clearInterval(id);
  }, [load]);

  async function decide(attemptId, decision) {
    const note = decision === 'Denied' ? window.prompt('Optional note shown to the candidate:') || '' : '';
    try { await adminRequest(`admin/proctoring/candidates/${attemptId}/accommodation`, { method: 'PATCH', body: { decision, note } }); toast(`Request ${decision.toLowerCase()}.`); load(); } catch (e) { toast(e.message, 'error'); }
  }

  const stats = overview && [
    ['Total candidates', overview.totalCandidates], ['Taking exam now', overview.currentlyTaking], ['No suspicious events', overview.noSuspiciousEvents],
    ['Flagged for review', overview.flaggedForReview], ['Total events', overview.totalEvents],
  ];

  return (
    <>
      <PageHeader title="Proctoring" subtitle="Review indicators from AI-assisted monitoring. These are not findings of misconduct; every event needs human review." />
      <p className="pa-note">Face and head-direction analysis runs on each candidate's device; only short event records reach this dashboard — no video or images. Browsers cannot detect other devices, other applications or screenshots.</p>
      <Alert>{error}</Alert>

      {stats && <div className="pa-grid">{stats.map(([l, v]) => <div className="pa-stat" key={l}><small>{l}</small><b>{v}</b></div>)}</div>}

      {acc.length > 0 && (
        <div className="ex-card" style={{ marginBottom: 16 }}>
          <h3>Pending accommodation requests ({acc.length})</h3>
          <div className="pa-table-wrap"><table className="pa-table"><thead><tr><th>Candidate</th><th>Reason</th><th>Requested</th><th /></tr></thead><tbody>
            {acc.map((a) => (
              <tr key={a.attemptId}><td>{a.candidateName} <small className="ex-muted">{a.candidateId}</small></td><td style={{ whiteSpace: 'normal', maxWidth: 380 }}>{a.reason}</td><td>{fmtShort(a.requestedAt)}</td>
                <td><Button size="sm" onClick={() => decide(a.attemptId, 'Approved')}>Approve</Button> <Button size="sm" variant="secondary" onClick={() => decide(a.attemptId, 'Denied')}>Deny</Button></td></tr>
            ))}
          </tbody></table></div>
        </div>
      )}

      <div className="pa-toolbar">
        <select value={exam} onChange={(e) => setExam(e.target.value)} aria-label="Exam"><option value="">All exams</option>{exams.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}</select>
        <input placeholder="Search name, email or candidate ID" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={review} onChange={(e) => setReview(e.target.value)} aria-label="Review status"><option value="">All review states</option>{['Clear', 'Needs Review', 'Under Review', 'Escalated', 'Resolved'].map((s) => <option key={s}>{s}</option>)}</select>
        <Button variant="secondary" size="sm" icon="refresh" onClick={load}>Refresh</Button>
      </div>

      {!rows && !error && <Loading />}
      {rows && rows.length === 0 && <Empty icon="shield" title="No candidates found">Adjust the filters, or wait for candidates to start.</Empty>}
      {rows && rows.length > 0 && (
        <div className="ex-card pa-table-wrap" style={{ padding: 0 }}>
          <table className="pa-table">
            <thead><tr><th>Candidate</th><th>ID</th><th>Exam</th><th>Attempt</th><th className="num">Tab switches</th><th className="num">Fullscreen exits</th><th className="num">Face missing</th><th className="num">Multiple faces</th><th>Camera</th><th>Review</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.attemptId} className="pa-row" tabIndex={0} onClick={() => nav(`/exam/admin/proctoring/${r.attemptId}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/exam/admin/proctoring/${r.attemptId}`)}>
                  <td>{r.candidateName}</td><td>{r.candidateId}</td><td>{r.examName}</td><td>{r.attemptStatus}</td>
                  <td className="num">{r.counts.tabSwitches}</td><td className="num">{r.counts.fullscreenExits}</td><td className="num">{r.counts.faceMissing}</td><td className="num">{r.counts.multipleFaces}</td>
                  <td>{CAMERA_LABEL[r.cameraState] || r.cameraState}{r.accommodation === 'Approved' && ' (accommodated)'}</td>
                  <td><Badge tone={REVIEW_TONE[r.reviewStatus] || 'neutral'}>{r.reviewStatus}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
