import React, { useEffect, useRef } from 'react';
import { Icon } from '../components/ExamUI';
import { attachStream } from './cameraStore';
import './proctoring.css';

/**
 * Small, non-blocking status strip + self-view thumbnail. It informs the candidate
 * (so they can fix lighting / position / permissions) and never accuses: all
 * wording is "we can't see…", not "you are cheating". It never blocks answering.
 */
export default function ProctoringWarning({ state, stream, cameraRequired, onFullscreen }) {
  const vref = useRef(null);
  useEffect(() => { attachStream(vref.current, stream); }, [stream]);

  const msgs = [];
  if (state.needsFullscreen) {
    msgs.push({ k: 'fs', text: 'This exam is taken in full screen.', action: <button type="button" className="pg-btn" onClick={onFullscreen}>Enter full screen</button> });
  }
  if (cameraRequired) {
    if (state.camera === 'denied') msgs.push({ k: 'cd', text: 'Camera access is blocked. Please allow the camera for this site (address bar) — your answers are still being saved.' });
    else if (state.camera === 'lost') msgs.push({ k: 'cl', text: 'Camera disconnected. Please reconnect it; we are trying again automatically.' });
    else if (state.camera === 'unavailable') msgs.push({ k: 'cu', text: 'No working camera found. Your answers are still being saved.' });
  }
  if (state.face === 'no_face') msgs.push({ k: 'nf', text: "We can't see your face. Please sit in front of the camera with your face clearly visible." });
  if (state.face === 'multiple') msgs.push({ k: 'mf', text: 'More than one face is visible. Please make sure only you are in view.' });
  if (state.pose === 'away' && state.face === 'ok') msgs.push({ k: 'pa', text: 'Please face the screen.' });


  // Server-confirmed warning count.
if (state.warning && !state.warning.autoSubmitted) {
  const { count, max, remaining } = state.warning;

  if (count > 0) {
    msgs.push({
      k: 'violation-warning',
      text: remaining === 0
        ? `FINAL WARNING: You have used all ${max} permitted warnings. One more confirmed violation will automatically submit your exam.`
        : `Proctoring Warning ${count}/${max}: Please follow examination rules. Repeated violations will automatically submit your exam.`
    });
  }
}

// Automatic submission confirmed by backend.
if (state.autoSubmitted) {
  msgs.push({
    k: 'auto-submitted',
    text: 'Your examination has been automatically submitted due to repeated proctoring violations.'
  });
}

// Warning synchronization problem.
if (state.warningSyncError) {
  msgs.push({
    k: 'warning-sync',
    text: 'Proctoring warning status could not be synchronized. Please maintain your camera connection.'
  });
}

  return (
    <>
    <div className={`pg-self ${state.face === 'ok' && state.models === 'ready' ? 'pg-self--ok' : state.face === 'ok' ? '' : 'pg-self--warn'}`} title="..."></div>
      {stream && (
        <div className="pg-self" title="Your camera is analysed on this device only. Nothing is recorded.">
          <video ref={vref} muted playsInline />
          <span><Icon name="eye" size={11} /> Camera on — not recorded</span>
        </div>
      )}
      {msgs.length > 0 && (
        <div className="pg-strip" role="status" aria-live="polite">
          {msgs.map((m) => (<div key={m.k}><Icon name="info" size={15} /><span>{m.text}</span>{m.action}</div>))}
        </div>
      )}
    </>
  );
}
