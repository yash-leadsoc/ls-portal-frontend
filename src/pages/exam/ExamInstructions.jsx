import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { examApi } from './examApi';
import StudentShell, { Stepper } from './components/StudentShell';
import { Alert, Button, Icon, Loading } from './components/ExamUI';
import ProctoringGate from './proctoring/ProctoringGate';

export default function ExamInstructions() {
  const { attemptId } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiReady, setAiReady] = useState(false);

  useEffect(() => {
    examApi.instructions(attemptId).then((d) => {
      if (['Submitted', 'Auto Submitted', 'Under Evaluation', 'Evaluated'].includes(d.status)) nav(`/exam/submitted/${attemptId}`, { replace: true });
      else setData(d);
    }).catch((e) => setError(e.message));
  }, [attemptId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    setBusy(true);
    setError('');
    // Fullscreen must be requested from this click (a user gesture); SPA navigation keeps it.
    if (ai?.config?.requireFullscreen) { try { await document.documentElement.requestFullscreen?.(); } catch { /* optional */ } }
    try {
      await examApi.start(attemptId);
      nav(`/exam/attempt/${attemptId}`);
    } catch (e) {
      if (e.data?.status) nav(`/exam/submitted/${attemptId}`, { replace: true });
      else setError(e.message);
      setBusy(false);
    }
  }

  const resumed = data?.status === 'In Progress';
  const ai = data?.aiProctoring;
  const gateNeeded = !!ai?.config?.enabled && !resumed; // a resumed attempt already passed the gate
  const exam = data?.exam;
  const p = data?.proctoring;

  return (
    <StudentShell narrow>
      <Stepper step={1} />
      {!data && !error && <Loading />}
      {error && !data && (
        <div className="ex-card"><Alert title="We couldn't open your attempt">{error}</Alert>
          <Button variant="secondary" style={{ marginTop: 16 }} onClick={() => nav('/exam')}>Back to exams</Button></div>
      )}
      {data && (
        <div className="ex-card" style={{ padding: 32 }}>
          {data.candidate && <p className="ex-muted ex-small">Hello, <b>{data.candidate.name}</b> · ID {data.candidate.candidateId}</p>}
          <h1 style={{ fontSize: '1.7rem', marginTop: 6 }}>{exam.name}</h1>

          <div className="ex-facts">
            <div className="ex-fact"><small>Duration</small><b>{exam.durationMinutes} <span>min</span></b></div>
            <div className="ex-fact"><small>Maximum marks</small><b>{exam.maximumMarks}</b></div>
            <div className="ex-fact"><small>Passing marks</small><b>{exam.passingMarks || '—'}</b></div>
          </div>

          {exam.instructions && (<><h3>Instructions</h3><p className="ex-prose" style={{ marginTop: 8 }}>{exam.instructions}</p></>)}

          <h3 style={{ marginTop: 22 }}>Please note</h3>
          <ul className="ex-rules">
            <li><Icon name="clock" size={18} /><span>Your timer starts the moment you press <b>{resumed ? 'Resume' : 'Start examination'}</b> and cannot be paused.</span></li>
            <li><Icon name="save" size={18} /><span>Answers are saved automatically. The exam is submitted automatically when time runs out.</span></li>
            {exam.negativeMarking && <li><Icon name="alert" size={18} /><span>This examination has negative marking for wrong answers.</span></li>}
            {p?.enabled && (
              <li className="is-warn"><Icon name="shield" size={18} />
                <span><b>Stay on this window.</b> If you minimise it, switch tabs or open another application you will get a warning. You are allowed <b>{p.maxWarnings} warnings</b>; leaving again after that <b>submits your exam automatically</b>.
                  {resumed && p.violationCount > 0 && <> You have already used <b>{p.violationCount}</b>.</>}</span></li>
            )}
          </ul>

          {gateNeeded && <ProctoringGate attemptId={attemptId} config={ai.config} session={ai.session} onReady={setAiReady} />}
          {resumed && ai?.config?.enabled && (
            <p className="ex-muted ex-small" style={{ marginTop: 12 }}>This exam uses AI-assisted integrity monitoring (analysed on your device; no video is recorded). Your camera may be requested again.</p>
          )}

          <label className="ex-agree"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I have read and understood the instructions and I am ready to begin.</span></label>
          <div style={{ marginTop: 16 }}><Alert>{error}</Alert></div>
          <Button variant="accent" size="lg" block style={{ marginTop: 18 }} disabled={!agree || (gateNeeded && !aiReady)} busy={busy} onClick={start}>
            <Icon name="play" size={17} /> {resumed ? 'Resume examination' : 'Start examination'}
          </Button>
        </div>
      )}
    </StudentShell>
  );
}
