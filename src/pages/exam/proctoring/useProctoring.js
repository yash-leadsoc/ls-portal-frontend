import { useCallback, useEffect, useRef, useState } from 'react';
import { examApi } from '../examApi';
import { cameraStore, attachStream } from './cameraStore';
import { EpisodeTracker } from './episodes';
import { ProctoringEventClient } from './eventClient';
import { createBrowserMonitor } from './browserMonitoring';
import { Baseline, classifyDirection } from './headPose';
import { startFaceMonitor } from './FaceDetection';

const newId = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`);
// const INITIAL = { camera: 'idle', models: 'idle', face: 'unknown', pose: 'ok', fullscreen: true, needsFullscreen: false };

const INITIAL = {
  camera: 'idle',
  models: 'idle',
  face: 'unknown',
  pose: 'ok',
  fullscreen: true,
  needsFullscreen: false,
  warning: null,
  warningSyncError: false,
  autoSubmitted: false
};

/**
 * Orchestrates browser-side proctoring for one exam attempt.
 *
 * Contract with the exam screen:
 *  - NOTHING here can throw into, delay, or end the exam. Every failure degrades to
 *    "proctoring unavailable" and (where possible) a review event.
 *  - Event delivery is fire-and-forget through ProctoringEventClient (its own queue
 *    and retries); answer autosaving never waits for it.
 *  - `stop()` closes open episodes, flushes events (bounded wait) and releases the camera.
 */
export function useProctoring({
  attemptId,
  config,
  active,
  onViolationResult
}) {
  const enabled = !!config?.enabled && !!attemptId && !!active;
  const [state, setState] = useState(INITIAL);
  const [stream, setStream] = useState(null);
  const ref = useRef({});
  // ref.current.onAutoSubmit = onAutoSubmit;
  ref.current.onViolationResult = onViolationResult;
  const patch = useCallback((p) => setState((s) => {
    for (const k of Object.keys(p)) if (s[k] !== p[k]) return { ...s, ...p };
    return s;
  }), []);

  useEffect(() => {
    if (!enabled) return undefined;
    const cfg = config;
    const R = ref.current;
    let cancelled = false;
    R.stopped = false;

    const client = new ProctoringEventClient({
      send: (events, opts) => examApi.proctoringEvents(attemptId, { events }, opts),
      batchIntervalMs: cfg.batchIntervalSeconds * 1000,
    });
    R.client = client;
    const emit = (e, o) => { try { client.emit(e, o); } catch { /* never affect the exam */ } };
    const toEvent = (e) => ({ clientEventId: e.id, type: e.type, at: e.at, durationMs: e.durationMs, confidence: e.confidence, meta: e.meta });

    // ---- browser activity (always on when AI proctoring is enabled) ----
    const browser = createBrowserMonitor({ win: window, doc: document, emit, newId, config: cfg });
    R.browser = browser;
    const onFs = () => patch({ fullscreen: !!document.fullscreenElement });
    document.addEventListener('fullscreenchange', onFs);
    if (cfg.requireFullscreen) {
      browser.setWantFullscreen(true);
      patch({ needsFullscreen: !document.fullscreenElement, fullscreen: !!document.fullscreenElement });
    }

    // ---- face / pose episode trackers ----
    // const mk = (type, minSec, endGraceMs) => new EpisodeTracker({
    //   type, minMs: minSec * 1000, endGraceMs, cooldownMs: cfg.eventCooldownSeconds * 1000, newId,
    //   onStart: (e) => emit(toEvent(e)),
    //   onEnd: (e) => emit(toEvent(e)),
    // });

    let autoSubmitHandled = false;

const mk = (type, minSec, endGraceMs) => new EpisodeTracker({
  type,
  minMs: minSec * 1000,
  endGraceMs,
  cooldownMs: cfg.eventCooldownSeconds * 1000,
  newId,

  onStart: (e) => {
    // Continue recording the AI proctoring event.
    emit(toEvent(e));

    // Connect AI violations to the existing warning system.
    examApi.violation(attemptId, {
      kind: e.type,
      detail: `AI Proctoring: ${e.type}`
    })
      // .then((result) => {
      //   if (cancelled) return;

      //   patch({
      //     warning: result,
      //     warningSyncError: false,
      //     autoSubmitted: !!result.autoSubmitted
      //   });

      //   // Backend has already submitted the examination.
      //   if (result.autoSubmitted && !autoSubmitHandled) {
      //     autoSubmitHandled = true;

      //     console.warn(
      //       '[Proctoring] Examination automatically submitted',
      //       result
      //     );

      //     // Notify the exam page.
      //     R.onAutoSubmit?.(result);
      //   }
      // })
      // .catch((error) => {
      //   console.error(
      //     '[Proctoring] Warning synchronization failed:',
      //     error
      //   );

      //   if (!cancelled) {
      //     patch({ warningSyncError: true });
      //   }
      // });
  .then((result) => {
  if (cancelled) return;

  patch({
    warning: result,
    warningSyncError: false,
    autoSubmitted: !!result.autoSubmitted
  });

  // Send every backend warning result to ExamInterface.
  R.onViolationResult?.(result);

})
.catch((error) => {
  console.error(
    '[Proctoring] Warning synchronization failed:',
    error
  );

  if (!cancelled) {
    patch({ warningSyncError: true });
  }
});
    },

  onEnd: (e) => emit(toEvent(e)),
});

    const trackers = {
      noFace: mk('FACE_NOT_DETECTED', cfg.noFaceSeconds, 2500),
      multi: mk('MULTIPLE_FACES', cfg.multiFaceSeconds, 2500),
      away: mk('HEAD_DIRECTION_AWAY', cfg.headAwaySeconds, 2500),
    };
    R.trackers = trackers;
    const closeTrackers = () => Object.values(trackers).forEach((t) => t.close(Date.now()));
    const baseline = new Baseline();
    let uiSince = { none: null, multi: null };

    const onFrame = ({ faceCount, confidence, scores }) => {
      const now = Date.now();
      trackers.noFace.update(faceCount === 0, now);
      trackers.multi.update(faceCount >= 2, now, { confidence, meta: { faceCount } });
      let dir = null;
      if (faceCount === 1 && scores) {
        if (!baseline.ready) baseline.add(scores);
        else dir = classifyDirection(scores, baseline.value(), cfg);
      }
      trackers.away.update(faceCount === 1 && dir !== null, now, { meta: dir ? { direction: dir } : undefined });

      // Friendly on-screen hints appear sooner than the (review-event) thresholds.
      uiSince.none = faceCount === 0 ? uiSince.none ?? now : null;
      uiSince.multi = faceCount >= 2 ? uiSince.multi ?? now : null;
      patch({
        face: uiSince.none && now - uiSince.none > 3000 ? 'no_face' : uiSince.multi && now - uiSince.multi > 2000 ? 'multiple' : 'ok',
        pose: dir ? 'away' : 'ok',
      });
    };

    // ---- camera + models ----
    const video = document.createElement('video');
    video.setAttribute('aria-hidden', 'true');
    Object.assign(video.style, { position: 'fixed', width: '320px', height: '240px', left: '-10000px', top: '0', pointerEvents: 'none' });
    document.body.appendChild(video);
    let monitor = null;
    let cameraEpisode = null;
    let retryTimer = null;

    const startAnalysis = async (s) => {
      attachStream(video, s);
      if (cancelled) return;
      patch({ models: 'loading' });
      try {
        monitor = await startFaceMonitor({ video, cfg, onFrame, onError: () => patch({ models: 'failed' }) });
        R.monitor = monitor;
        patch({ models: 'ready', camera: 'ok' });
      } catch {
        patch({ models: 'failed' });
        emit({ clientEventId: newId(), type: 'PROCTORING_UNAVAILABLE', at: Date.now(), meta: { reason: 'models' } });
      }
    };

    const openCamera = async () => {
      try {
        const s = await cameraStore.acquire();
        if (cancelled) return;
        setStream(s);
        if (cameraEpisode) { // recovered
          emit({ clientEventId: cameraEpisode.id, type: 'CAMERA_DISCONNECTED', at: cameraEpisode.at, durationMs: Date.now() - cameraEpisode.at });
          cameraEpisode = null;
          examApi.proctoringSession(attemptId, { camera: { state: 'ok' } }).catch(() => {});
        }
        patch({ camera: 'ok' });
        await startAnalysis(s);
      } catch (e) {
        if (cancelled) return;
        if (!cameraEpisode && e.code === 'denied') {
          patch({ camera: 'denied' });
          emit({ clientEventId: newId(), type: 'CAMERA_PERMISSION_DENIED', at: Date.now() }, { critical: true });
        } else if (!cameraEpisode) {
          patch({ camera: 'unavailable' });
          emit({ clientEventId: newId(), type: 'PROCTORING_UNAVAILABLE', at: Date.now(), meta: { reason: 'camera' } });
        }
        scheduleRetry();
      }
    };
    const scheduleRetry = () => { clearTimeout(retryTimer); retryTimer = setTimeout(() => { if (!cancelled) openCamera(); }, 8000); };

    const offEnded = cameraStore.onEnded(() => {
      if (cancelled || cameraEpisode) return;
      monitor?.stop(); monitor = null; closeTrackers();
      cameraEpisode = { id: newId(), at: Date.now() };
      patch({ camera: 'lost', face: 'unknown', models: 'idle' });
      emit({ clientEventId: cameraEpisode.id, type: 'CAMERA_DISCONNECTED', at: cameraEpisode.at }, { critical: true });
      cameraStore.release();
      scheduleRetry();
    });

    if (cfg.cameraRequired) openCamera();

    const onHide = () => { client.flush({ keepalive: true }); };
    window.addEventListener('pagehide', onHide);

    // Optional benchmark output for pilot testing (set sessionStorage.ls_proctor_debug = '1').
    const dbg = sessionStorage.getItem('ls_proctor_debug') === '1'
      ? setInterval(() => console.info('[proctoring]', { analysis: monitor?.stats(), events: client.stats, queued: client.size() }), 30000)
      : null;

    R.stop = async () => {
      if (R.stopped) return;
      R.stopped = true;
      cancelled = true;
      clearTimeout(retryTimer);
      clearInterval(dbg);
      try { closeTrackers(); browser.closeAll(); } catch { /* ignore */ }
      monitor?.stop();
      browser.stop();
      offEnded();
      document.removeEventListener('fullscreenchange', onFs);
      window.removeEventListener('pagehide', onHide);
      video.remove();
      await Promise.race([client.flush(), new Promise((r) => setTimeout(r, 3000))]); // bounded: never hold up submission
      client.close();
      cameraStore.release();
      setStream(null);
    };
    R.flush = () => Promise.race([client.flush(), new Promise((r) => setTimeout(r, 3000))]);
    R.enterFullscreen = async () => { const ok = await browser.enterFullscreen(); patch({ needsFullscreen: !ok, fullscreen: !!document.fullscreenElement }); return ok; };

    return () => { R.stop?.(); };
  }, [enabled, attemptId]); // eslint-disable-line react-hooks/exhaustive-deps

  const stop = useCallback(() => (ref.current.stop ? ref.current.stop() : Promise.resolve()), []);
  const flush = useCallback(() => (ref.current.flush ? ref.current.flush() : Promise.resolve()), []);
  const enterFullscreen = useCallback(() => (ref.current.enterFullscreen ? ref.current.enterFullscreen() : Promise.resolve(false)), []);
  return { state, stream, stop, flush, enterFullscreen, enabled };
}
