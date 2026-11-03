import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminRequest } from './adminApi';
import { evaluationBadge } from './ExamResults';
import { Alert, Button, Empty, Loading, PageHeader, fmtDate, useToast } from './components/ExamUI';

export default function ExamEvaluation() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [ai, setAi] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => adminRequest('results?status=Pending%20Evaluation').then(setRows).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); adminRequest('results/ai-status').then(setAi).catch(() => {}); }, [load]);

  const grading = rows?.some((r) => ['pending', 'running'].includes(r.attempt?.aiEvaluation?.status));
  useEffect(() => {
    if (!grading) return undefined;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [grading, load]);

  async function runAll() {
    setBusy(true);
    try { const r = await adminRequest('results/ai-evaluate-pending', { method: 'POST', body: {} }); toast(r.message); setTimeout(load, 1500); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Evaluation queue" subtitle="Written answers are graded by AI automatically. Anything that failed or has no AI available shows up here."
        actions={<Button icon="zap" busy={busy} disabled={!ai?.enabled || !rows?.length} onClick={runAll}>Evaluate all with AI</Button>} />
      {ai && !ai.enabled && (
        <div style={{ marginBottom: 16 }}><Alert tone="warn" title="AI evaluation is not set up">
          Add <b>ANTHROPIC_API_KEY</b> to the server environment and restart the backend. Until then written answers wait here for manual marking.</Alert></div>
      )}
      <Alert>{error}</Alert>
      <section className="ex-card ex-card--flush">
        {!rows && !error ? <Loading /> : !rows?.length ? <Empty icon="checkSquare" title="You're all caught up">There are no attempts waiting for evaluation.</Empty> : (
          <div className="ex-table-wrap"><table className="ex-table">
            <thead><tr><th>Candidate</th><th>Exam</th><th>Submitted</th><th>Evaluation</th><th className="ex-num">Marks so far</th><th /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r._id}>
                <td><div className="ex-cell-title">{r.candidate?.name}</div><div className="ex-cell-sub">{r.candidate?.candidateId}</div></td>
                <td>{r.exam?.name}</td>
                <td className="ex-cell-sub">{fmtDate(r.attempt?.submittedAt)}</td>
                <td>{evaluationBadge(r)}</td>
                <td className="ex-num">{r.obtainedMarks}/{r.maximumMarks}</td>
                <td><div className="ex-actions"><Link to={`/exam/admin/results/${r.attempt?._id}`}><Button size="sm" icon="checkSquare">Open</Button></Link></div></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
