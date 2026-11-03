import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminRequest, downloadFile, qs } from './adminApi';
import DateRangeFilter, { rangeOf } from './components/DateRangeFilter';
import { Alert, Badge, Button, Empty, Icon, Loading, PageHeader, StatusBadge, fmtDate, useToast } from './components/ExamUI';

export default function CandidateManagement() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [exams, setExams] = useState([]);
  const [exam, setExam] = useState('');
  const [q, setQ] = useState('');
  const [range, setRange] = useState({ preset: 'all', from: '', to: '' });
  const { from, to } = useMemo(() => rangeOf(range), [range]);
  const [error, setError] = useState('');

  useEffect(() => { adminRequest('admin/exams').then(setExams).catch(() => {}); }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      adminRequest(`admin/candidates${qs({ exam, q, from, to })}`).then((r) => { setRows(r); setError(''); }).catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [exam, q, from, to]);

  return (
    <>
      <PageHeader title="Candidates" subtitle="Everyone who has registered for an examination."
        actions={<Button variant="secondary" icon="download" onClick={() => downloadFile(`admin/candidates/export${qs({ exam, q, from, to })}`, 'exam-candidates.csv').catch((e) => toast(e.message, 'error'))}>Export CSV</Button>} />
      <Alert>{error}</Alert>
      <section className="ex-card ex-card--flush">
        <div className="ex-toolbar"><DateRangeFilter value={range} onChange={setRange} /></div>
        <div className="ex-toolbar">
          <div className="ex-input-wrap"><Icon name="search" size={16} /><input className="ex-input" placeholder="Search name, email, phone or ID…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search candidates" /></div>
          <select className="ex-select" value={exam} onChange={(e) => setExam(e.target.value)} aria-label="Filter by exam">
            <option value="">All exams</option>{exams.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}
          </select>
          {rows && <span className="ex-muted ex-small">{rows.length} candidate{rows.length === 1 ? '' : 's'}</span>}
        </div>
        {!rows && !error ? <Loading /> : !rows?.length ? <Empty icon="users" title="No candidates found">Candidates appear here once they register for an exam.</Empty> : (
          <div className="ex-table-wrap"><table className="ex-table">
            <thead><tr><th>Candidate</th><th>Contact</th><th>Exam</th><th>Status</th><th className="ex-num">Score</th><th>Registered</th><th /></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c._id}>
                <td><div className="ex-cell-title">{c.name}</div><div className="ex-cell-sub">{c.candidateId}</div></td>
                <td><div>{c.email}</div><div className="ex-cell-sub">{c.phone}</div></td>
                <td>{c.exam?.name || '—'}</td>
                <td>{c.attempt ? <StatusBadge status={c.attempt.status} /> : <Badge>Not started</Badge>}
                  {c.attempt?.violationCount > 0 && <> <Badge tone="warn">⚠ {c.attempt.violationCount}</Badge></>}</td>
                <td className="ex-num">{c.result ? `${c.result.obtainedMarks}/${c.result.maximumMarks}` : '—'}</td>
                <td className="ex-cell-sub">{fmtDate(c.createdAt)}</td>
                <td>{c.attempt && c.result && <Link to={`/exam/admin/results/${c.attempt._id}`}><Button size="sm" variant="secondary" icon="eye">Report</Button></Link>}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
