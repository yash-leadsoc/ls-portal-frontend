import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminRequest } from './adminApi';
import ExamStatistics from './components/ExamStatistics';
import { Alert, Badge, Button, Empty, Loading, PageHeader, StatusBadge, fmtPct } from './components/ExamUI';

export default function ExamAdminDashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { adminRequest('admin/dashboard').then(setD).catch((e) => setError(e.message)); }, []);

  return (
    <>
      <PageHeader title="Examination dashboard" subtitle="A live overview of exams, candidates and results."
        actions={<Link to="/exam/admin/exams"><Button icon="plus">New exam</Button></Link>} />
      <Alert>{error}</Alert>
      {!d && !error && <Loading />}
      {d && (
        <>
          <ExamStatistics items={[
            { label: 'Live exams', value: d.activeExams, icon: 'play', tone: 'green' },
            { label: 'Scheduled', value: d.scheduledExams, icon: 'calendar', tone: 'blue' },
            { label: 'Total exams', value: d.totalExams, icon: 'file', tone: 'slate' },
            { label: 'Candidates', value: d.totalCandidates, icon: 'users', tone: 'cyan' },
            { label: 'Appearing now', value: d.appearing, icon: 'zap', tone: 'amber' },
            { label: 'Completed', value: d.completed, icon: 'check', tone: 'green' },
            { label: 'Average score', value: fmtPct(d.averageScore), icon: 'chart', tone: 'blue' },
            { label: 'Pass rate', value: fmtPct(d.passPercentage), icon: 'award', tone: 'green' },
          ]} />

          <div className="ex-two-col">
            <section className="ex-card ex-card--flush">
              <div className="ex-card__head"><h2>Recent submissions</h2><div className="ex-spacer" /><Link className="ex-link" to="/exam/admin/results">View all</Link></div>
              {!d.recent?.length ? <Empty icon="chart" title="No submissions yet">Results appear here as candidates finish.</Empty> : (
                <div className="ex-table-wrap"><table className="ex-table">
                  <thead><tr><th>Candidate</th><th>Exam</th><th className="ex-num">Score</th><th>Status</th></tr></thead>
                  <tbody>{d.recent.map((r) => (
                    <tr key={r._id}>
                      <td><Link className="ex-cell-title" to={`/exam/admin/results/${r.attempt?._id}`} style={{ textDecoration: 'none' }}>{r.candidate?.name || '—'}</Link><div className="ex-cell-sub">{r.candidate?.candidateId}</div></td>
                      <td>{r.exam?.name}</td>
                      <td className="ex-num">{r.obtainedMarks}/{r.maximumMarks}</td>
                      <td><StatusBadge status={r.status} />{r.attempt?.violationCount > 0 && <> <Badge tone="warn">⚠ {r.attempt.violationCount}</Badge></>}</td>
                    </tr>))}</tbody>
                </table></div>
              )}
            </section>

            <section className="ex-stack">
              <div className="ex-card">
                <div className="ex-card__head"><h2>Needs attention</h2></div>
                <ul className="ex-checklist">
                  <li className={d.pendingEvaluation ? '' : 'ok'}><span className="ex-tick">{d.pendingEvaluation || '✓'}</span>
                    {d.pendingEvaluation ? <span><Link className="ex-link" to="/exam/admin/evaluation">{d.pendingEvaluation} attempt{d.pendingEvaluation === 1 ? '' : 's'}</Link> waiting for manual evaluation</span> : 'No evaluations pending'}</li>
                  <li className={d.flagged ? '' : 'ok'}><span className="ex-tick">{d.flagged || '✓'}</span>
                    {d.flagged ? <span><Link className="ex-link" to="/exam/admin/results?flagged=true">{d.flagged} attempt{d.flagged === 1 ? '' : 's'}</Link> with tab-switch warnings</span> : 'No suspicious activity'}</li>
                  <li className={d.autoSubmitted ? '' : 'ok'}><span className="ex-tick">{d.autoSubmitted || '✓'}</span>
                    {d.autoSubmitted ? `${d.autoSubmitted} auto-submitted after too many warnings` : 'No proctoring auto-submits'}</li>
                </ul>
              </div>
              <div className="ex-card">
                <div className="ex-card__head"><h2>Quick actions</h2></div>
                <div className="ex-stack" style={{ gap: 10 }}>
                  <Link to="/exam/admin/exams"><Button variant="secondary" icon="file" block>Manage exams</Button></Link>
                  <Link to="/exam/admin/candidates"><Button variant="secondary" icon="users" block>View candidates</Button></Link>
                  <Link to="/exam"><Button variant="secondary" icon="eye" block>Open student portal</Button></Link>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
