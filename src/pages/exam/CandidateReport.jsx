import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { adminRequest } from './adminApi';
import { Alert, Badge, Button, Field, Icon, Loading, PageHeader, StatusBadge, TYPE_LABELS, fmtDate, fmtPct, useToast } from './components/ExamUI';

const KIND = { TAB_HIDDEN: 'Switched tab / minimised', WINDOW_BLUR: 'Switched to another window', OTHER: 'Left exam window' };
const CONF = { high: ['success', 'High confidence'], medium: ['info', 'Medium confidence'], low: ['warn', 'Low confidence — please review'] };
const show = (q, v) => {
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return null;
  const arr = Array.isArray(v) ? v : [v];
  if (!['MCQ', 'MULTI_SELECT', 'TRUE_FALSE'].includes(q.type)) return String(v);
  return arr.map((x) => (q.options || []).find((o) => o.value === x)?.label ?? x).join(', ');
};

function EvalBox({ attemptId, item, onSaved }) {
  const toast = useToast();
  const ev = item.evaluation;
  const isAI = ev?.source === 'AI';
  const [marks, setMarks] = useState(ev?.marks ?? '');
  const [comment, setComment] = useState(ev && !isAI ? ev.comment || '' : '');
  const [busy, setBusy] = useState(false);
  const max = item.question.marks;

  async function save() {
    setBusy(true);
    try {
      await adminRequest(`results/${attemptId}/answers/${item.question._id}`, { method: 'PATCH', body: { marks, comment: comment || (isAI ? `Adjusted from AI grade (${ev.marks}/${max}).` : '') } });
      toast('Marks saved');
      onSaved();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  }
  return (
    <div className="ex-evalbox">
      {isAI && (
        <div className="ex-aibox">
          <div className="ex-row ex-row--wrap" style={{ gap: 8 }}>
            <Badge tone="brand"><Icon name="zap" size={12} /> AI graded</Badge>
            <b>{ev.marks} / {max}</b>
            {ev.confidence && <Badge tone={CONF[ev.confidence][0]}>{CONF[ev.confidence][1]}</Badge>}
          </div>
          {ev.comment && <p className="ex-small" style={{ marginTop: 6 }}>{ev.comment}</p>}
        </div>
      )}
      {ev && !isAI && <div className="ex-row"><Badge tone="info">Graded manually</Badge>{ev.comment && <span className="ex-small ex-muted">{ev.comment}</span>}</div>}
      {(item.question.modelAnswer || item.question.evaluationGuidelines) && (
        <div className="ex-small">
          {item.question.modelAnswer && <p><b>Model answer:</b> <span className="ex-muted" style={{ whiteSpace: 'pre-wrap' }}>{item.question.modelAnswer}</span></p>}
          {item.question.evaluationGuidelines && <p style={{ marginTop: 4 }}><b>Guidelines:</b> <span className="ex-muted" style={{ whiteSpace: 'pre-wrap' }}>{item.question.evaluationGuidelines}</span></p>}
        </div>)}
      <div className="ex-row" style={{ alignItems: 'flex-end' }}>
        <Field label={isAI ? `Override marks (0–${max})` : `Marks (0–${max})`}><input className="ex-input" type="number" min="0" max={max} step="0.5" value={marks} onChange={(e) => setMarks(e.target.value)} /></Field>
        <Field label="Comment" className="ex-grow"><input className="ex-input" value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} placeholder="Optional feedback" /></Field>
        <Button busy={busy} icon="save" disabled={marks === ''} onClick={save}>{isAI ? 'Override' : 'Save'}</Button>
      </div>
    </div>
  );
}

export default function CandidateReport() {
  const { attemptId } = useParams();
  const toast = useToast();
  const [d, setD] = useState(null);
  const [ai, setAi] = useState(null);
  const [error, setError] = useState('');
  const [grading, setGrading] = useState(false);
  const load = useCallback(() => adminRequest(`results/${attemptId}`).then(setD).catch((e) => setError(e.message)), [attemptId]);
  useEffect(() => { load(); adminRequest('results/ai-status').then(setAi).catch(() => {}); }, [load]);

  const aiState = d?.attempt?.aiEvaluation?.status;
  const aiRunning = aiState === 'pending' || aiState === 'running';
  useEffect(() => {
    if (!aiRunning) return undefined;
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [aiRunning, load]);

  async function runAi(force) {
    setGrading(true);
    try {
      const r = await adminRequest(`results/${attemptId}/ai-evaluate`, { method: 'POST', body: { force } });
      toast(r.failures ? `${r.graded} graded, ${r.failures} failed` : `AI graded ${r.graded} answer${r.graded === 1 ? '' : 's'}`, r.failures ? 'error' : 'success');
      await load();
    } catch (e) { toast(e.message, 'error'); } finally { setGrading(false); }
  }

  if (error) return <Alert>{error}</Alert>;
  if (!d) return <Loading />;
  const { attempt: a, result: r, questions } = d;
  const pct = r?.percentage || 0;
  const pass = r?.status === 'Pass';
  const mins = a.startedAt && a.submittedAt ? Math.max(1, Math.round((new Date(a.submittedAt) - new Date(a.startedAt)) / 60000)) : null;
  const written = questions.filter((x) => ['SHORT_ANSWER', 'LONG_ANSWER'].includes(x.question.type) && x.response?.answer);
  const hasAiGrades = written.some((x) => x.evaluation?.source === 'AI');
  const needsReview = written.filter((x) => x.evaluation?.source === 'AI' && x.evaluation.confidence === 'low').length;

  return (
    <>
      <PageHeader crumbs={[{ label: 'Results', to: '/exam/admin/results' }, { label: a.candidate?.name || 'Report' }]} title={a.candidate?.name || 'Candidate report'}
        subtitle={`${a.exam?.name} · ${a.examSet?.name || ''}`}
        actions={<>
          {written.length > 0 && ai?.enabled && (
            <Button variant="secondary" icon="zap" busy={grading || aiRunning} onClick={() => runAi(hasAiGrades)}>
              {aiRunning ? 'AI is grading…' : hasAiGrades ? 'Re-grade with AI' : 'Grade with AI'}
            </Button>)}
          <Button variant="secondary" icon="refresh" onClick={load}>Refresh</Button>
        </>} />

      {written.length > 0 && ai && !ai.enabled && !hasAiGrades && (
        <div style={{ marginBottom: 16 }}><Alert tone="warn" title="AI evaluation is not set up">Set ANTHROPIC_API_KEY on the server to grade written answers automatically. You can still mark them manually below.</Alert></div>)}
      {aiState === 'failed' && <div style={{ marginBottom: 16 }}><Alert tone="error" title="AI grading did not finish">{a.aiEvaluation?.lastError || 'Some answers could not be graded.'} Use “Grade with AI” to retry, or mark manually.</Alert></div>}
      {needsReview > 0 && <div style={{ marginBottom: 16 }}><Alert tone="warn" title={`${needsReview} AI grade${needsReview === 1 ? '' : 's'} with low confidence`}>Worth a quick look — you can override the marks below.</Alert></div>}

      <section className="ex-card" style={{ marginBottom: 20 }}>
        <div className="ex-report-head">
          <div>
            <div className="ex-row ex-row--wrap">{r && <StatusBadge status={r.status} />}<StatusBadge status={a.status} />
              {hasAiGrades && <Badge tone="brand"><Icon name="zap" size={12} /> AI graded</Badge>}
              {a.autoSubmitReason === 'PROCTORING_VIOLATIONS' && <Badge tone="danger">Auto-submitted: too many warnings</Badge>}
              {a.autoSubmitReason === 'TIME_EXPIRED' && <Badge>Auto-submitted: time expired</Badge>}</div>
            <div className="ex-kv">
              <div><small>Candidate ID</small><b>{a.candidate?.candidateId}</b></div>
              <div><small>Email</small><b>{a.candidate?.email}</b></div>
              <div><small>Phone</small><b>{a.candidate?.phone}</b></div>
              <div><small>Rank</small><b>{r?.rank ? `#${r.rank}` : '—'}</b></div>
              <div><small>Started</small><b>{fmtDate(a.startedAt)}</b></div>
              <div><small>Submitted</small><b>{fmtDate(a.submittedAt)}</b></div>
              <div><small>Time taken</small><b>{mins ? `${mins} min` : '—'}</b></div>
              <div><small>Correct / Wrong / Skipped</small><b>{r ? `${r.correctAnswers} / ${r.incorrectAnswers} / ${r.unanswered}` : '—'}</b></div>
            </div>
          </div>
          <div className="ex-scorering" style={{ '--p': Math.min(100, pct), '--ring': r?.status === 'Fail' ? 'var(--ex-danger)' : pass ? 'var(--ex-success)' : 'var(--ex-cyan)' }}>
            <div><b>{r ? r.obtainedMarks : 0}</b><small>of {r?.maximumMarks ?? 0} · {fmtPct(pct)}</small></div>
          </div>
        </div>
      </section>

      <section className="ex-card" style={{ marginBottom: 20 }}>
        <div className="ex-card__head"><Icon name="shield" /><h2>Proctoring</h2><div className="ex-spacer" />
          {a.violationCount ? <Badge tone="warn">{a.violationCount} warning{a.violationCount === 1 ? '' : 's'}</Badge> : <Badge tone="success">No violations</Badge>}</div>
        {a.violations?.length ? (
          <ul className="ex-timeline">{a.violations.map((v, i) => <li key={i}><span><b>{KIND[v.kind] || KIND.OTHER}</b> <span className="ex-muted">· {fmtDate(v.at)}</span></span></li>)}</ul>
        ) : <p className="ex-muted ex-small">The candidate stayed on the exam window for the whole attempt.</p>}
        <p className="ex-muted ex-small" style={{ marginTop: 8 }}>Page reloads: {a.refreshCount || 0}{a.ipAddress ? ` · IP ${a.ipAddress}` : ''}</p>
      </section>

      <div className="ex-card__head" style={{ marginBottom: 6 }}><h2>Answer review</h2></div>
      <div className="ex-review">
        {questions.map((it, i) => {
          const q = it.question;
          const cls = it.verdict === 'Correct' ? 'is-correct' : it.verdict === 'Incorrect' ? 'is-incorrect' : it.verdict === 'Pending' ? 'is-pending' : '';
          const objective = ['MCQ', 'MULTI_SELECT', 'TRUE_FALSE'].includes(q.type);
          const given = show(q, it.response?.answer);
          return (
            <article key={q._id} className={`ex-reviewitem ${cls}`}>
              <div className="ex-row ex-row--wrap" style={{ marginBottom: 8 }}>
                <b>Q{i + 1}</b><Badge tone="brand">{TYPE_LABELS[q.type]}</Badge><StatusBadge status={it.verdict} />
                {it.response?.markedForReview && <Badge tone="warn">Marked for review</Badge>}
                <div className="ex-spacer" /><b className="ex-tnum">{it.awarded} / {q.marks}</b>
              </div>
              <div style={{ fontWeight: 600, whiteSpace: 'pre-wrap', color: 'var(--ex-ink)' }}>{q.title}</div>
              <div className="ex-small ex-muted" style={{ marginTop: 12 }}>Candidate's answer</div>
              <div className="ex-answer">{given ?? <span className="ex-muted">Not answered</span>}</div>
              {objective && (<><div className="ex-small ex-muted" style={{ marginTop: 10 }}>Correct answer</div><div className="ex-answer ex-answer--ok">{show(q, q.correctAnswers)}</div></>)}
              {!objective && it.response && given && <EvalBox key={q._id + (it.evaluation?.evaluatedAt || '') + (it.evaluation?.source || '')} attemptId={attemptId} item={it} onSaved={load} />}
              {q.explanation && <p className="ex-small ex-muted" style={{ marginTop: 8 }}>Explanation: {q.explanation}</p>}
            </article>
          );
        })}
      </div>
    </>
  );
}
