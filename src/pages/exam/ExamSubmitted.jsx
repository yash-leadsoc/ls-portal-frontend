import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { attemptSession, examApi } from './examApi';
import StudentShell from './components/StudentShell';
import { Alert, Button, Icon, Spinner, fmtPct } from './components/ExamUI';

// Shows the candidate's score when the exam allows it. Written answers are graded
// in the background, so poll for a short while until the result is ready.
function ScoreCard({ attemptId }) {
  const [res, setRes] = useState(null);
  useEffect(() => {
    let stop = false;
    let tries = 0;
    const tick = async () => {
      try {
        const r = await examApi.result(attemptId);
        if (stop) return;
        setRes(r);
        if (r.visible && !r.ready && r.state === 'evaluating' && ++tries < 40) setTimeout(tick, 3000);
      } catch { /* token missing or offline – just don't show a score */ }
    };
    tick();
    return () => { stop = true; };
  }, [attemptId]);

  if (!res?.visible) return null;
  if (!res.ready) {
    return (
      <div className="ex-scorecard is-wait">
        {res.state === 'evaluating' ? <><Spinner /> <span>Evaluating your written answers… your score will appear here in a moment.</span></>
          : <><Icon name="clock" size={18} /> <span>Your answers are being reviewed. The LeadSoc team will share your result.</span></>}
      </div>
    );
  }
  return (
    <div className={`ex-scorecard ${res.passed ? 'is-pass' : 'is-fail'}`}>
      <div className="ex-scorecard__num"><b>{res.obtainedMarks}</b><span>/ {res.maximumMarks}</span></div>
      <div>
        <div className="ex-scorecard__pct">{fmtPct(res.percentage)}</div>
        <div className="ex-scorecard__tag">{res.passed ? 'Congratulations — you passed' : 'Not passed this time'}</div>
      </div>
    </div>
  );
}

export default function ExamSubmitted() {
  const { state } = useLocation();
  const { attemptId } = useParams();
  const nav = useNavigate();
  const [candidateId] = useState(() => state?.candidateId || attemptSession.candidateId());
  const [copied, setCopied] = useState(false);
  const reason = state?.reason;

  const copy = async () => {
    try { await navigator.clipboard.writeText(candidateId); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };

  return (
    <StudentShell narrow>
      <section className="ex-card ex-done">
        <div className={`ex-done__check ${reason === 'PROCTORING_VIOLATIONS' ? 'ex-done__check--warn' : ''}`}>
          <Icon name={reason === 'PROCTORING_VIOLATIONS' ? 'alert' : 'check'} size={38} strokeWidth={2.6} />
        </div>
        <h1>{reason === 'PROCTORING_VIOLATIONS' ? 'Your exam was submitted automatically' : 'Thank you for completing the examination!'}</h1>
        {reason === 'PROCTORING_VIOLATIONS' && (
          <div style={{ textAlign: 'left', margin: '14px 0' }}>
            <Alert tone="warn" title="Why did this happen?">You left the exam window more times than the allowed number of warnings. The answers you had saved were submitted.</Alert>
          </div>
        )}
        {reason === 'TIME_EXPIRED' && (
          <div style={{ textAlign: 'left', margin: '14px 0' }}><Alert tone="info">Your time ran out, so the exam was submitted automatically with your saved answers.</Alert></div>
        )}
        <p className="ex-muted">We have successfully received your examination.</p>
        <ScoreCard attemptId={attemptId} />
        {candidateId && (
          <div className="ex-idbox"><small>Your candidate ID</small><b>{candidateId}</b>
            <Button variant="ghost" size="sm" icon={copied ? 'check' : 'copy'} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button></div>
        )}
        <div className="ex-next">
          <div><i>1</i><span>A confirmation email is on its way to the address you registered with.</span></div>
          <div><i>2</i><span>Your answers are evaluated automatically and checked by the LeadSoc team.</span></div>
          <div><i>3</i><span>We will contact you with the next steps. You may now close this page.</span></div>
        </div>
        <Button variant="secondary" style={{ marginTop: 26 }} onClick={() => { attemptSession.clear(); nav('/exam'); }}>Back to portal home</Button>
      </section>
    </StudentShell>
  );
}
