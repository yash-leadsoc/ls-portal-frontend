import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminRequest, downloadFile, qs } from './adminApi';
import DateRangeFilter, { rangeOf } from './components/DateRangeFilter';
import ExamStatistics from './components/ExamStatistics';
import { Alert, Badge, Button, Empty, Icon, Loading, PageHeader, StatusBadge, fmtPct, fmtShort, useToast } from './components/ExamUI';

const STATUSES = ['', 'Pass', 'Fail', 'Pending Evaluation'];

export function evaluationBadge(r) {
  const at = r.attempt || {};
  const ai = at.aiEvaluation?.status;
  if (r.status === 'Pending Evaluation') {
    if (ai === 'pending' || ai === 'running') return <Badge tone="info"><span className="ex-spinner" style={{ width: 11, height: 11, borderWidth: 2 }} /> AI evaluating…</Badge>;
    if (ai === 'failed') return <Badge tone="danger">AI failed · review manually</Badge>;
    return <Badge tone="warn">Awaiting manual review</Badge>;
  }
  const src = new Set((at.evaluations || []).map((e) => e.source));
  if (src.has('AI') && src.has('Manual')) return <Badge tone="brand">AI + manual</Badge>;
  if (src.has('AI')) return <Badge tone="brand">AI graded</Badge>;
  if (src.has('Manual')) return <Badge tone="info">Manual</Badge>;
  return <Badge>Auto-scored</Badge>;
}

export default function ExamResults() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const flagged = params.get('flagged') === 'true';
  const [rows, setRows] = useState(null);
  const [exams, setExams] = useState([]);
  const [exam, setExam] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [range, setRange] = useState({ preset: flagged ? 'all' : 'today', from: '', to: '' });
  const [error, setError] = useState('');

  useEffect(() => { adminRequest('admin/exams').then(setExams).catch(() => {}); }, []);
  const { from, to } = useMemo(() => rangeOf(range), [range]);
  const query = qs({ exam, status, q, from, to, flagged: flagged ? 'true' : '' });

  const load = useCallback(() => adminRequest(`results${query}`).then((r) => { setRows(r); setError(''); }).catch((e) => setError(e.message)), [query]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  // keep refreshing while the AI is still grading some attempts
  const grading = rows?.some((r) => ['pending', 'running'].includes(r.attempt?.aiEvaluation?.status) && r.status === 'Pending Evaluation');
  useEffect(() => {
    if (!grading) return undefined;
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, [grading, load]);

  const stats = useMemo(() => {
    const r = rows || [];
    const done = r.filter((x) => ['Pass', 'Fail'].includes(x.status));
    return {
      total: r.length, pass: r.filter((x) => x.status === 'Pass').length, fail: r.filter((x) => x.status === 'Fail').length,
      pending: r.filter((x) => x.status === 'Pending Evaluation').length,
      avg: done.length ? done.reduce((n, x) => n + (x.percentage || 0), 0) / done.length : 0,
    };
  }, [rows]);

  async function recalc() {
    try { const r = await adminRequest(`results/exam/${exam}/recalculate`, { method: 'POST', body: {} }); toast(r.message); } catch (e) { toast(e.message, 'error'); }
  }
  const label = { today: "Today's results", yesterday: "Yesterday's results", week: 'Results — last 7 days', month: 'Results — this month', all: 'All results', custom: 'Results — custom range' }[range.preset];

  return (
    <>
      <PageHeader title={label} subtitle="Scores and results are calculated automatically — written answers are graded by AI after submission."
        actions={<>
          {exam && <Button variant="secondary" icon="refresh" onClick={recalc}>Save ranks</Button>}
          <Button variant="secondary" icon="download" onClick={() => downloadFile(`results/export${query}`, 'exam-results.csv').catch((e) => toast(e.message, 'error'))}>Export CSV</Button>
        </>} />
      <Alert>{error}</Alert>

      {rows && (
        <ExamStatistics items={[
          { label: 'Submissions', value: stats.total, icon: 'users', tone: 'cyan' },
          { label: 'Passed', value: stats.pass, icon: 'award', tone: 'green' },
          { label: 'Failed', value: stats.fail, icon: 'x', tone: 'red' },
          { label: 'Awaiting evaluation', value: stats.pending, icon: 'clock', tone: 'amber' },
          { label: 'Average score', value: fmtPct(stats.avg), icon: 'chart', tone: 'blue' },
        ]} />
      )}

      <section className="ex-card ex-card--flush">
        <div className="ex-toolbar"><DateRangeFilter value={range} onChange={setRange} /></div>
        <div className="ex-toolbar">
          <div className="ex-input-wrap"><Icon name="search" size={16} /><input className="ex-input" placeholder="Search candidate…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search results" /></div>
          <select className="ex-select" value={exam} onChange={(e) => setExam(e.target.value)} aria-label="Filter by exam"><option value="">All exams</option>{exams.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}</select>
          <select className="ex-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">{STATUSES.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}</select>
          <label className="ex-row ex-small" style={{ cursor: 'pointer', gap: 8 }}>
            <input type="checkbox" checked={flagged} onChange={(e) => setParams(e.target.checked ? { flagged: 'true' } : {})} style={{ accentColor: 'var(--ex-warn)' }} /> Only flagged
          </label>
        </div>
        {!rows && !error ? <Loading /> : !rows?.length ? (
          <Empty icon="chart" title="No results for this selection"
            action={range.preset !== 'all' && <Button variant="secondary" onClick={() => setRange({ preset: 'all', from: '', to: '' })}>Show all time</Button>}>
            Results appear as soon as candidates submit.
          </Empty>
        ) : (
          <div className="ex-table-wrap"><table className="ex-table ex-table--compact">
            <thead><tr><th>Rank</th><th>Candidate</th><th>Exam</th><th className="ex-num">Score</th><th className="ex-num">%</th><th>Result</th><th>Evaluation</th><th>Proctoring</th><th>Submitted</th><th /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r._id}>
                <td className="ex-tnum"><b>{r.rank ? `#${r.rank}` : '—'}</b></td>
                <td className="ex-nowrap"><div className="ex-cell-title">{r.candidate?.name}</div><div className="ex-cell-sub">{r.candidate?.candidateId}</div></td>
                <td>{r.exam?.name}</td>
                <td className="ex-num ex-nowrap">{r.obtainedMarks}/{r.maximumMarks}</td>
                <td className="ex-num">{fmtPct(r.percentage)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{evaluationBadge(r)}</td>
                <td>{r.attempt?.autoSubmitReason === 'PROCTORING_VIOLATIONS' ? <Badge tone="danger">Auto-submitted</Badge>
                  : r.attempt?.violationCount > 0 ? <Badge tone="warn">⚠ {r.attempt.violationCount}</Badge>
                  : r.attempt?.autoSubmitReason === 'TIME_EXPIRED' ? <Badge>Time expired</Badge> : <span className="ex-muted">—</span>}</td>
                <td className="ex-cell-sub ex-nowrap">{fmtShort(r.attempt?.submittedAt)}</td>
                <td><Link to={`/exam/admin/results/${r.attempt?._id}`}><Button size="sm" variant="secondary" className="ex-btn--icon" icon="eye" aria-label="Open report" title="Open report" /></Link></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
