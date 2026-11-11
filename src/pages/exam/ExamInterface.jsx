import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { attemptSession, examApi } from './examApi';
import useProctor from './hooks/useProctor';
import Timer from './components/ExamTimer';
import QuestionCard from './components/QuestionCard';
import Navigator from './components/QuestionNavigator';
import Confirm from './components/SubmitConfirmation';
import ProctorWarning from './components/ProctorWarning';
import { AutosaveQueue } from './hooks/autosaveQueue';
import { useProctoring } from './proctoring/useProctoring';
import ProctoringWarning from './proctoring/ProctoringWarning';
import { Alert, Button, Icon, Loading, isAnswered } from './components/ExamUI';
import './exam.css';

const FINAL = ['Submitted', 'Auto Submitted', 'Under Evaluation', 'Evaluated'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OBJECTIVE = ['MCQ', 'MULTI_SELECT', 'TRUE_FALSE'];

export default function ExamInterface() {
  const { attemptId } = useParams();
  const nav = useNavigate();

  const [meta, setMeta] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [current, setCurrent] = useState(0);
  const [deadline, setDeadline] = useState(null); // performance.now() based
  const [proctor, setProctor] = useState({ enabled: false, maxWarnings: 3, count: 0 });
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('saved'); // saved | saving | error (offline, retrying) | failed (rejected by server)
  const [aiCfg, setAiCfg] = useState(null); // AI proctoring config for this exam (null = off)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [warn, setWarn] = useState(null); // { count } while the warning dialog is open
  const [ending, setEnding] = useState(null); // { reason } while the final submit is in progress

  /* ---------- refs: things that must not trigger re-renders ---------- */
  const responsesRef = useRef({});
  const queueRef = useRef(null); // AutosaveQueue (created below)
  const endedRef = useRef(() => {});
  const statusInflight = useRef(false);
  const finishing = useRef(false);
  const violationCount = useRef(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; queueRef.current?.resume(); return () => { mounted.current = false; queueRef.current?.destroy(); }; }, []);

  if (!queueRef.current) {
    queueRef.current = new AutosaveQueue({
      send: async (qid, payload) => {
        try {
          return await examApi.save(attemptId, { questionId: qid, ...payload });
        } catch (e) {
          if (e.status === 409 || e.status === 410) endedRef.current(); // exam already ended server-side
          throw e;
        }
      },
      debounceMs: 400,      // objective answers & review flags: coalesce rapid toggles
      textDebounceMs: 900,  // written answers: wait for a typing pause
      storage: window.sessionStorage,
      storageKey: `ls_exam_pending_${attemptId}`,
      onChange: (st) => { if (mounted.current) setSaveState(st.status === 'idle' ? 'saved' : st.status); },
    });
  }

  // Keep `navigate` in a ref so callbacks (and the paper-loading effect) never depend on its identity.
  const navRef = useRef(nav);
  navRef.current = nav;
  const goSubmitted = useCallback((info = {}) => {
    finishing.current = true;
    navRef.current(`/exam/submitted/${attemptId}`, { replace: true, state: { reason: info.reason || (info.autoSubmitted ? 'TIME_EXPIRED' : null), candidateId: info.candidateId } });
  }, [attemptId]);

  const handleAIProctoringResult = useCallback((result = {}) => {

  // Synchronize the warning counter with the backend.
  if (typeof result.count === 'number') {
    violationCount.current = result.count;

    setProctor((prev) => ({
      ...prev,
      count: result.count
    }));
  }

  // Backend has already finalized the examination.
  if (
    result.autoSubmitted ||
    result.finished ||
    FINAL.includes(result.status)
  ) {
    goSubmitted({
      ...result,
      reason: result.reason || 'PROCTORING_VIOLATIONS'
    });
  }

}, [goSubmitted]);

  /* ---------- load the paper ---------- */
  useEffect(() => {
    let cancelled = false;
    examApi.paper(attemptId).then((r) => {
      if (cancelled) return;
      const map = {};
      const queue = queueRef.current;
      (r.responses || []).forEach((x) => { map[x.question] = { answer: x.answer, markedForReview: !!x.markedForReview }; queue.seedSeq(x.question, x.seq || 0); });
      // Answers typed just before a reload/crash that never reached the server: re-send & repaint.
      if (queue.restore()) queue.pendingPayloads().forEach((p, qid) => { map[qid] = { answer: p.answer, markedForReview: !!p.markedForReview }; });
      responsesRef.current = map;
      setResponses(map);
      setQuestions(r.questions || []);
      setMeta(r.exam);
      setAiCfg(r.aiProctoring?.enabled ? r.aiProctoring : null);
      setDeadline(performance.now() + r.remainingSeconds * 1000);
      violationCount.current = r.proctoring?.violationCount || 0;
      setProctor({ enabled: !!r.proctoring?.enabled, maxWarnings: r.proctoring?.maxWarnings ?? 3, count: violationCount.current });
    }).catch((e) => {
      if (cancelled) return;
      if (e.data?.status && FINAL.includes(e.data.status)) goSubmitted(e.data);
      else setLoadError(e.message);
    });
    return () => { cancelled = true; };
  }, [attemptId, goSubmitted]);

  /* ---------- keep the countdown in sync with the server ---------- */
  // The server owns the clock; this only corrects drift and learns that the exam ended.
  // 60-90 s randomised interval (200 candidates must not poll in lock-step), never two
  // requests at once, and no request while the tab is hidden.
  useEffect(() => {
    if (deadline == null) return undefined;
    let stop = false;
    let t;
    const sync = async () => {
      if (stop || finishing.current || statusInflight.current || document.hidden) return;
      statusInflight.current = true;
      try {
        const s = await examApi.status(attemptId);
        if (FINAL.includes(s.status)) return goSubmitted(s);
        if (s.remainingSeconds != null) setDeadline(performance.now() + s.remainingSeconds * 1000);
      } catch { /* offline – local timer keeps running */ } finally { statusInflight.current = false; }
    };
    const loop = () => { t = setTimeout(async () => { await sync(); if (!stop) loop(); }, 60000 + Math.random() * 30000); };
    loop();
    const onVisible = () => { if (!document.hidden) sync(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stop = true; clearTimeout(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [deadline == null, attemptId, goSubmitted]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- auto-save (ordered, debounced, retried) ---------- */
  const endedByServer = useCallback(async () => {
    try {
      const s = await examApi.status(attemptId);
      if (FINAL.includes(s.status)) goSubmitted(s);
    } catch { /* ignore */ }
  }, [attemptId, goSubmitted]);

  endedRef.current = endedByServer;

  // objective answers / review flags -> 400 ms debounce; written answers -> 900 ms.
  const queueSave = useCallback((qid, answer, review, objective) => {
    queueRef.current.enqueue(qid, { answer, markedForReview: review }, { text: !objective });
  }, []);

  const flushAll = useCallback(() => queueRef.current.flush({ timeoutMs: 15000 }), []);

  const patch = (qid, changes) => {
    const next = { ...responsesRef.current, [qid]: { ...responsesRef.current[qid], ...changes } };
    responsesRef.current = next;
    setResponses(next);
    return next[qid];
  };
  const q = questions[current];
  const onAnswer = (value) => {
    const r = patch(q.id, { answer: value });
    queueSave(q.id, value, !!r.markedForReview, OBJECTIVE.includes(q.type));
  };
  const toggleReview = () => {
    const r = patch(q.id, { markedForReview: !responsesRef.current[q.id]?.markedForReview });
    queueSave(q.id, r.answer ?? null, r.markedForReview, true);
  };
  const clearAnswer = () => {
    const r = patch(q.id, { answer: null });
    queueSave(q.id, null, !!r.markedForReview, true);
  };

  /* ---------- final submit (manual, timer or proctoring) ---------- */
  const proctoringRef = useRef(null);
  const proctoring = { flush: () => proctoringRef.current?.flush?.() };
  const finish = useCallback(async (reason = 'manual') => {
    if (finishing.current) return;
    finishing.current = true;
    setConfirmOpen(false);
    setWarn(null);
    setEnding({ reason });
    let flushed = { ok: true, pending: 0 };
    try { flushed = await flushAll(); } catch { /* handled below */ }
    if (flushed.pending > 0 && reason === 'manual') {
      // Never submit over unsaved answers when the candidate still has time: keep them queued and let them retry.
      finishing.current = false;
      setEnding(null);
      setError('Some of your latest answers could not be saved yet (connection problem). Please check your internet and press Submit again.');
      return;
    }
    // Proctoring events must reach the server BEFORE the attempt closes (bounded wait; never blocks submission).
    try { await proctoring.flush(); } catch { /* ignore */ }
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const r = await examApi.submit(attemptId);
        return goSubmitted({ ...r, reason: r.reason || (reason === 'violations' ? 'PROCTORING_VIOLATIONS' : reason === 'time' ? 'TIME_EXPIRED' : null) });
      } catch (e) {
        if (e.status && e.status < 500) { // definitive answer from the server
          finishing.current = false;
          setEnding(null);
          setError(e.message);
          return endedByServer();
        }
        await sleep(1500 * (attempt + 1));
      }
    }
    finishing.current = false;
    setEnding(null);
    setError('We could not reach the server to submit. Check your connection and press Submit again.');
  }, [attemptId, flushAll, goSubmitted, endedByServer]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- proctoring: leaving the exam window ---------- */
  const onLeave = useCallback(async (kind) => {
    if (finishing.current) return;
    const local = violationCount.current + 1;
    violationCount.current = local;
    setProctor((p) => ({ ...p, count: local }));
    const overLimit = local > proctor.maxWarnings;
    if (overLimit) setEnding({ reason: 'violations' }); else setWarn({ count: local });

    try {
      const r = await examApi.violation(attemptId, { kind });
      if (r.finished) { finishing.current = true; return goSubmitted({ ...r, reason: r.reason || 'PROCTORING_VIOLATIONS' }); }
      if (typeof r.count === 'number') {
        violationCount.current = r.count;
        setProctor((p) => ({ ...p, count: r.count }));
        if (!overLimit) setWarn({ count: r.count });
      }
      if (overLimit) finish('violations');
    } catch (e) {
      if (e.status === 409) return endedByServer();
      if (overLimit) finish('violations'); // server unreachable – enforce locally
    }
  }, [attemptId, proctor.maxWarnings, goSubmitted, finish, endedByServer]);

  useProctor({ active: proctor.enabled && !loadError && questions.length > 0 && !ending, onLeave });

  // AI-assisted integrity monitoring (browser-side, metadata only). Independent of the warning policy
  // above: its events are review indicators and can never submit or end the exam.
  // `active` deliberately ignores `ending` so camera/event delivery survives until the final flush.
  const ai = useProctoring({
  attemptId,
  config: aiCfg,
  active: !!aiCfg && !loadError && questions.length > 0,
  onViolationResult: handleAIProctoringResult
});
  proctoringRef.current = ai;

  /* ---------- guard against accidental refresh/close, add arrow-key nav ---------- */
  useEffect(() => {
    if (!questions.length || ending) return undefined;
    const before = (e) => { e.preventDefault(); e.returnValue = ''; };
    const keys = (e) => {
      if (/^(TEXTAREA|INPUT)$/.test(e.target.tagName) || confirmOpen || warn) return;
      if (e.key === 'ArrowRight') setCurrent((c) => Math.min(c + 1, questions.length - 1));
      if (e.key === 'ArrowLeft') setCurrent((c) => Math.max(c - 1, 0));
    };
    window.addEventListener('beforeunload', before);
    window.addEventListener('keydown', keys);
    return () => { window.removeEventListener('beforeunload', before); window.removeEventListener('keydown', keys); };
  }, [questions.length, ending, confirmOpen, warn]);

  const answered = useMemo(() => questions.filter((x) => isAnswered(responses[x.id]?.answer)).length, [questions, responses]);
  const reviewCount = useMemo(() => questions.filter((x) => responses[x.id]?.markedForReview).length, [questions, responses]);

  /* ---------- render ---------- */
  if (loadError) {
    return (
      <div className="ex-root ex-student"><div className="ex-container ex-container--narrow" style={{ paddingTop: 60 }}>
        <div className="ex-card"><Alert title="Can't open the examination">{loadError}</Alert>
          <p className="ex-muted ex-small" style={{ margin: '14px 0' }}>If you closed the exam window earlier, contact your examination coordinator.</p>
          <Button variant="secondary" onClick={() => { attemptSession.clear(); nav('/exam'); }}>Back to portal home</Button></div>
      </div></div>
    );
  }
  if (!meta || deadline == null) return <div className="ex-root ex-student"><Loading text="Loading your examination…" /></div>;

  const last = current === questions.length - 1;
  const r = q ? responses[q.id] : null;
  const pillClass = proctor.count > proctor.maxWarnings - 1 ? 'is-final' : proctor.count > 0 ? 'has-warn' : '';

  return (
    <div className="ex-root ex-live">
      <header className="ex-livebar">
        <div className="ex-livebar__in">
          <div className="ex-livebar__title">
            <b>{meta.name}</b>
            <small>Question {current + 1} of {questions.length}</small>
          </div>
          <div className="ex-spacer" />
          <span className={`ex-save is-${saveState}`} aria-live="polite">
            <i className="ex-dot" />
            <span className="ex-save__txt">{saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Offline — retrying…' : saveState === 'failed' ? 'Could not save an answer' : 'All changes saved'}</span>
          </span>
          {proctor.enabled && (
            <span className={`ex-warnpill ${pillClass}`} title="Warnings for leaving the exam window">
              <Icon name="shield" size={15} /> Warnings {Math.min(proctor.count, proctor.maxWarnings)}/{proctor.maxWarnings}
              <span className="ex-pips" aria-hidden="true">{Array.from({ length: proctor.maxWarnings }, (_, i) => <i key={i} className={i < proctor.count ? 'on' : ''} />)}</span>
            </span>
          )}
          <Timer deadline={deadline} onExpire={() => finish('time')} />
        </div>
        <div className="ex-progressbar" aria-hidden="true"><i style={{ width: `${questions.length ? (answered / questions.length) * 100 : 0}%` }} /></div>
      </header>

      <div className="ex-workspace">
        <section>
          <Alert>{error}</Alert>
          {q && (
            <>
              <QuestionCard key={q.id} question={q} index={current} value={r?.answer} onChange={onAnswer} />
              <div className="ex-qfoot" style={{ background: '#fff', border: '1px solid var(--ex-line)', borderRadius: 16, padding: 16, marginTop: 14 }}>
                <Button variant="secondary" icon="back" disabled={!current} onClick={() => setCurrent((c) => c - 1)}>Previous</Button>
                <Button variant="secondary" icon="flag" className={r?.markedForReview ? 'is-flagged' : ''} onClick={toggleReview}>{r?.markedForReview ? 'Marked for review' : 'Mark for review'}</Button>
                <Button variant="ghost" disabled={!isAnswered(r?.answer)} onClick={clearAnswer}>Clear</Button>
                <div className="ex-spacer" />
                {last
                  ? <Button variant="accent" icon="check" onClick={() => setConfirmOpen(true)}>Review &amp; submit</Button>
                  : <Button variant="primary" onClick={() => setCurrent((c) => c + 1)}>Save &amp; next <Icon name="chevron" size={16} /></Button>}
              </div>
            </>
          )}
        </section>
        <Navigator questions={questions} responses={responses} current={current} onSelect={setCurrent} onSubmit={() => setConfirmOpen(true)} />
      </div>

      <Confirm open={confirmOpen} answered={answered} total={questions.length} review={reviewCount}
        onCancel={() => setConfirmOpen(false)} onConfirm={() => finish('manual')} busy={!!ending} />
      {aiCfg && (
        <ProctoringWarning state={ai.state} stream={ai.stream} cameraRequired={aiCfg.cameraRequired} onFullscreen={ai.enterFullscreen} />
      )}
      <ProctorWarning open={!!warn && !ending} count={warn?.count || 0} max={proctor.maxWarnings} onClose={() => setWarn(null)} />

      {ending && (
        <div className="ex-fullcover" role="alertdialog" aria-live="assertive">
          <div>
            <span className="ex-spinner" />
            <h2>{ending.reason === 'violations' ? 'Submitting your exam automatically' : ending.reason === 'time' ? "Time's up — submitting your exam" : 'Submitting your exam…'}</h2>
            <p>{ending.reason === 'violations'
              ? 'You left the exam window more times than allowed. Your saved answers are being submitted.'
              : 'Please keep this page open until it finishes.'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
