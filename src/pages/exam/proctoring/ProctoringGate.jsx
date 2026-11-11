import React, { useCallback, useEffect, useRef, useState } from 'react';
import { examApi } from '../examApi';
import { Alert, Button, Icon } from '../components/ExamUI';
import { cameraStore, attachStream } from './cameraStore';
import { startFaceMonitor } from './FaceDetection';
import { CONSENT_POINTS } from './consent';
import './proctoring.css';

/**
 * Pre-exam screen: explains monitoring, records informed consent, checks the
 * webcam (preview + "exactly one face visible"), or lets the candidate request an
 * alternative arrangement. Calls onReady(true) only when the exam's configured
 * requirements are satisfied (the server enforces the same rules on /start).
 */
export default function ProctoringGate({ attemptId, config, session, onReady }) {
  const [consent, setConsent] = useState(!!session?.consentGiven);
  const [cam, setCam] = useState(session?.precheckPassed ? 'ok' : 'idle'); // idle | requesting | checking | ok | denied | unavailable | noverify
  const [acc, setAcc] = useState(session?.accommodation || 'None');
  const [accNote, setAccNote] = useState(session?.accommodationDecisionNote || '');
  const [reason, setReason] = useState('');
  const [showAcc, setShowAcc] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const videoRef = useRef(null);
  const monitorRef = useRef(null);
  const consented = useRef(!!session?.consentGiven);

  const needCamera = config.cameraRequired;
  const ready = consent && (!needCamera || cam === 'ok' || acc === 'Approved');
  useEffect(() => { onReady(ready); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reflect an administrator's decision on a pending accommodation request.
  useEffect(() => {
    if (acc !== 'Pending') return undefined;
    const t = setInterval(() => {
      examApi.instructions(attemptId).then((d) => {
        const s = d.aiProctoring?.session;
        if (s) { setAcc(s.accommodation); setAccNote(s.accommodationDecisionNote || ''); }
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(t);
  }, [acc, attemptId]);

  useEffect(() => () => { monitorRef.current?.stop(); }, []);

  const recordConsent = useCallback(async () => {
    if (consented.current) return;
    await examApi.proctoringSession(attemptId, { consent: true, consentVersion: config.consentVersion });
    consented.current = true;
  }, [attemptId, config.consentVersion]);

  async function runCheck() {
    setErr(''); setBusy(true); setCam('requesting');
    try {
      await recordConsent();
      setConsent(true);
      let stream;
      try {
        stream = await cameraStore.acquire();
      } catch (e) {
        const state = e.code === 'denied' ? 'denied' : 'unavailable';
        setCam(state);
        examApi.proctoringSession(attemptId, { camera: { state } }).catch(() => {});
        return;
      }
      setCam('checking');
      await new Promise((r) => setTimeout(r, 80)); // let the preview box become visible first
      attachStream(videoRef.current, stream);
      await new Promise((r) => { const v = videoRef.current; if (!v || v.readyState >= 2) return r(); v.onloadeddata = () => r(); setTimeout(r, 3000); });
      let good = 0;
      let done = false;
      const pass = async () => {
        if (done) return; done = true;
        monitorRef.current?.stop();
        await examApi.proctoringSession(attemptId, { camera: { state: 'ok', faceDetected: true } });
        setCam('ok');
      };
      try {
        monitorRef.current = await startFaceMonitor({
          video: videoRef.current,
          cfg: { detectionFps: 3, poseFps: 0 },
          onFrame: ({ faceCount }) => { good = faceCount === 1 ? good + 1 : 0; if (good >= 4) pass().catch((e) => setErr(e.message)); },
          onError: () => setCam('noverify'),
        });
      } catch {
        setCam('noverify'); // analysis models unavailable: candidate can confirm manually; exam continues with browser monitoring only
      }
    } catch (e) {
      setErr(e.message);
      setCam('idle');
    } finally {
      setBusy(false);
    }
  }

  async function confirmManually() {
    setBusy(true); setErr('');
    try {
      await examApi.proctoringSession(attemptId, { camera: { state: 'ok', faceDetected: true } });
      setCam('ok');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function consentOnly() {
    setBusy(true); setErr('');
    try { await recordConsent(); setConsent(true); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function requestAccommodation() {
    setBusy(true); setErr('');
    try {
      await examApi.proctoringSession(attemptId, { accommodation: { reason } });
      setAcc('Pending'); setShowAcc(false);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  const [agree, setAgree] = useState(!!session?.consentGiven);

  return (
    <div className="pg-gate">
      <h3><Icon name="shield" size={18} /> Exam integrity monitoring</h3>
      <div className="pg-points">
        {CONSENT_POINTS.map((p) => (
          <div key={p.title}><b>{p.title}</b><span>{p.body}</span></div>
        ))}
      </div>

      {!consent && (
        <label className="ex-agree">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>I have read this notice and I consent to the monitoring described above.</span>
        </label>
      )}
      {consent && <Alert tone="success" icon="check">Consent recorded.</Alert>}

      {needCamera && cam !== 'ok' && acc !== 'Approved' && (
        <div className="pg-cam">
          <div className={`pg-preview ${cam === 'checking' || cam === 'noverify' ? 'on' : ''}`}>
            <video ref={videoRef} muted playsInline />
            {cam === 'checking' && <span className="pg-hint">Look at the screen. Only your face should be visible…</span>}
          </div>
          {['idle', 'requesting'].includes(cam) && (
            <Button variant="primary" disabled={!agree && !consent} busy={busy} onClick={runCheck} icon="eye">Allow camera &amp; run check</Button>
          )}
          {cam === 'noverify' && (
            <>
              <Alert tone="warn">Automatic face check isn't available on this device. If you can see yourself clearly in the preview, confirm below. Browser-activity monitoring still applies.</Alert>
              <Button variant="primary" busy={busy} onClick={confirmManually}>I can see myself — continue</Button>
            </>
          )}
          {cam === 'denied' && <Alert tone="warn" title="Camera access was blocked.">Allow the camera for this site in your browser's address-bar settings and try again, or request an alternative arrangement below.</Alert>}
          {cam === 'unavailable' && <Alert tone="warn" title="No working camera found.">Connect or enable a webcam and try again, or request an alternative arrangement below.</Alert>}
          {['denied', 'unavailable'].includes(cam) && <Button variant="secondary" onClick={runCheck} busy={busy}>Try again</Button>}
        </div>
      )}
      {!needCamera && !consent && <Button variant="primary" disabled={!agree} busy={busy} onClick={consentOnly}>I consent</Button>}
      {needCamera && cam === 'ok' && <Alert tone="success" icon="check">Camera check passed.</Alert>}

      {needCamera && acc === 'None' && !showAcc && (
        <button type="button" className="pg-link" onClick={() => setShowAcc(true)}>I can't or prefer not to use a camera — request an alternative arrangement</button>
      )}
      {showAcc && (
        <div className="pg-acc">
          <label htmlFor="pg-reason">Briefly tell the exam administrators why (they will review before you start):</label>
          <textarea id="pg-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button variant="primary" busy={busy} disabled={reason.trim().length < 5} onClick={requestAccommodation}>Send request</Button>
        </div>
      )}
      {acc === 'Pending' && <Alert tone="info">Your request has been sent. Please wait here or contact the exam coordinator; this page updates automatically.</Alert>}
      {acc === 'Approved' && <Alert tone="success" icon="check">Alternative arrangement approved. You can start without the camera check.</Alert>}
      {acc === 'Denied' && <Alert tone="warn" title="Alternative arrangement not approved.">{accNote || 'Please complete the camera check or contact the exam coordinator.'}</Alert>}
      <Alert>{err}</Alert>
    </div>
  );
}
