// /**
//  * MediaPipe glue. Everything runs INSIDE the candidate's browser; no frame, image
//  * or video ever leaves the machine. Only derived counts/directions reach the
//  * episode logic, and only threshold-crossing episodes reach the server.
//  *
//  * Assets are self-hosted (same origin) so candidates' browsers make no third-party
//  * requests and the exam works behind restrictive networks. Fetch them with
//  * `npm run proctoring:assets` (see docs/PROCTORING.md). If anything fails to load
//  * the exam simply continues without AI analysis (reported as PROCTORING_UNAVAILABLE).
//  *
//  * NOTE: MediaPipe `detectForVideo` is synchronous and runs on the UI thread. We
//  * therefore measure it and automatically lower the frame rate on slow devices.
//  */
// import { poseScores } from './headPose.js';

// const BASE = (import.meta.env?.VITE_MEDIAPIPE_BASE || '/mediapipe').replace(/\/$/, '');
// let visionPromise = null;

// async function loadVision() {
//   if (!visionPromise) {
//     visionPromise = (async () => {
//       const mod = await import(/* @vite-ignore */ `${BASE}/vision_bundle.mjs`);
//       const fileset = await mod.FilesetResolver.forVisionTasks(`${BASE}/wasm`);
//       return { mod, fileset };
//     })().catch((e) => { visionPromise = null; throw e; });
//   }
//   return visionPromise;
// }

// async function createWithFallback(Cls, fileset, modelPath, extra) {
//   for (const delegate of ['GPU', 'CPU']) {
//     try {
//       return await Cls.createFromOptions(fileset, { baseOptions: { modelAssetPath: modelPath, delegate }, runningMode: 'VIDEO', ...extra });
//     } catch (e) {
//       if (delegate === 'CPU') throw e;
//     }
//   }
// }

// /**
//  * @param video   a playing <video> element fed by the webcam stream
//  * @param cfg     server-clamped config (detectionFps, poseFps)
//  * @param handlers.onFrame({ faceCount, confidence, scores, ts })  called at most detectionFps times/second
//  * @returns { stop(), stats() }
//  */
// export async function startFaceMonitor({ video, cfg, onFrame, onError = () => {} }) {
//   const { mod, fileset } = await loadVision();
//   const detector = await createWithFallback(mod.FaceDetector, fileset, `${BASE}/blaze_face_short_range.tflite`, { minDetectionConfidence: 0.5 });
//   const landmarker = cfg.poseFps > 0
//     ? await createWithFallback(mod.FaceLandmarker, fileset, `${BASE}/face_landmarker.task`, { numFaces: 1, outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false })
//     : null;

//   let fps = cfg.detectionFps;
//   let timer = null;
//   let stopped = false;
//   let lastTs = 0;
//   let tick = 0;
//   const poseEvery = Math.max(1, Math.round(cfg.detectionFps / Math.max(0.1, cfg.poseFps)));
//   const win = []; // rolling inference times (ms)
//   const stats = { frames: 0, avgMs: 0, maxMs: 0, fps, skippedHidden: 0, errors: 0 };

//   const loop = () => {
//     if (stopped) return;
//     timer = setTimeout(loop, 1000 / fps);
//     if (document.hidden || video.readyState < 2 || video.videoWidth === 0) { stats.skippedHidden++; return; }
//     try {
//       const t0 = performance.now();
//       const ts = Math.max(lastTs + 1, Math.round(t0)); // MediaPipe requires strictly increasing timestamps
//       lastTs = ts;
//       const det = detector.detectForVideo(video, ts).detections || [];
//       const faceCount = det.length;
//       const confidence = faceCount ? Math.max(...det.map((d) => d.categories?.[0]?.score || 0)) : undefined;
//       let scores = null;
//       if (landmarker && faceCount === 1 && tick++ % poseEvery === 0) {
//         const lm = landmarker.detectForVideo(video, ts).faceLandmarks?.[0];
//         scores = poseScores(lm);
//       }
//       const dt = performance.now() - t0;
//       win.push(dt); if (win.length > 20) win.shift();
//       stats.frames++; stats.avgMs = win.reduce((a, b) => a + b, 0) / win.length; stats.maxMs = Math.max(stats.maxMs, dt);
//       onFrame({ faceCount, confidence, scores, ts: Date.now() });

//       // Adaptive throttle: keep analysis below ~6% of one core. Slow device -> fewer frames/second.
//       const budget = 0.06 * 1000;
//       if (stats.frames % 10 === 0) {
//         const maxFps = Math.max(0.5, Math.min(cfg.detectionFps, budget / Math.max(1, stats.avgMs)));
//         fps = maxFps; stats.fps = fps;
//       }
//     } catch (e) {
//       stats.errors++;
//       if (stats.errors > 20) { onError(e); stop(); }
//     }
//   };
//   const stop = () => {
//     stopped = true;
//     clearTimeout(timer);
//     try { detector.close(); landmarker?.close(); } catch { /* ignore */ }
//   };
//   loop();
//   return { stop, stats: () => ({ ...stats }) };
// }


import { poseScores } from './headPose.js';

const BASE = (import.meta.env?.VITE_MEDIAPIPE_BASE || '/mediapipe').replace(/\/$/, '');
// CPU by default: the models are tiny, and the GPU delegate silently returns "no face" on many office PCs.
const PREFERRED = (import.meta.env?.VITE_MEDIAPIPE_DELEGATE || 'CPU').toUpperCase() === 'GPU' ? ['GPU', 'CPU'] : ['CPU', 'GPU'];
const MIN_CONF = Number(import.meta.env?.VITE_FACE_MIN_CONFIDENCE || 0.4);
const DELEGATE_USED = {};
let visionPromise = null;

async function loadVision() {
  if (!visionPromise) {
    visionPromise = (async () => {
      const mod = await import(/* @vite-ignore */ `${BASE}/vision_bundle.mjs`);
      const fileset = await mod.FilesetResolver.forVisionTasks(`${BASE}/wasm`);
      return { mod, fileset };
    })().catch((e) => { visionPromise = null; throw e; });
  }
  return visionPromise;
}

async function createWithFallback(Cls, fileset, modelPath, extra, label) {
  let last;
  for (const delegate of PREFERRED) {
    try {
      const m = await Cls.createFromOptions(fileset, { baseOptions: { modelAssetPath: modelPath, delegate }, runningMode: 'VIDEO', ...extra });
      DELEGATE_USED[label] = delegate;
      return m;
    } catch (e) { last = e; }
  }
  throw last;
}

export async function startFaceMonitor({ video, cfg, onFrame, onError = () => {} }) {
  const { mod, fileset } = await loadVision();
  const detector = await createWithFallback(mod.FaceDetector, fileset, `${BASE}/blaze_face_short_range.tflite`, { minDetectionConfidence: MIN_CONF }, 'detector');
  const landmarker = cfg.poseFps > 0
    ? await createWithFallback(mod.FaceLandmarker, fileset, `${BASE}/face_landmarker.task`, { numFaces: 1, outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false }, 'landmarker')
    : null;

  let fps = cfg.detectionFps;
  let timer = null;
  let stopped = false;
  let lastTs = 0;
  let tick = 0;
  const poseEvery = Math.max(1, Math.round(cfg.detectionFps / Math.max(0.1, cfg.poseFps)));
  const win = [];
  const stats = { frames: 0, avgMs: 0, maxMs: 0, fps, skippedHidden: 0, errors: 0, zeroFrames: 0, rescued: 0, lastCount: -1, video: '', delegate: DELEGATE_USED };

  const loop = () => {
    if (stopped) return;
    timer = setTimeout(loop, 1000 / fps);
    if (video.paused && !video.ended) video.play?.().catch(() => {});
    if (document.hidden || video.paused || video.readyState < 2 || video.videoWidth === 0) { stats.skippedHidden++; return; }
    try {
      const t0 = performance.now();
      const ts = Math.max(lastTs + 1, Math.round(t0));
      lastTs = ts;
      const det = detector.detectForVideo(video, ts).detections || [];
      let faceCount = det.length;
      let confidence = faceCount ? Math.max(...det.map((d) => d.categories?.[0]?.score || 0)) : undefined;
      let scores = null;
      const needPose = !!landmarker && faceCount === 1 && tick++ % poseEvery === 0;
      if (landmarker && (faceCount === 0 || needPose)) {
        // second opinion before reporting "no face"
        const lm = landmarker.detectForVideo(video, ts).faceLandmarks?.[0] || null;
        if (lm) {
          if (faceCount === 0) { faceCount = 1; stats.rescued++; }
          scores = poseScores(lm);
        }
      }
      stats.lastCount = faceCount;
      stats.video = `${video.videoWidth}x${video.videoHeight}`;
      if (faceCount === 0) stats.zeroFrames++;
      onFrame({ faceCount, confidence, scores, ts: Date.now() });
      const dt = performance.now() - t0;
      win.push(dt); if (win.length > 20) win.shift();
      stats.frames++; stats.avgMs = win.reduce((a, b) => a + b, 0) / win.length; stats.maxMs = Math.max(stats.maxMs, dt);
      if (stats.frames % 10 === 0) {
        fps = Math.max(0.5, Math.min(cfg.detectionFps, 60 / Math.max(1, stats.avgMs)));
        stats.fps = fps;
      }
    } catch (e) {
      stats.errors++;
      if (stats.errors > 20) { onError(e); stop(); }
    }
  };
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    try { detector.close(); landmarker?.close(); } catch { /* ignore */ }
  };
  loop();
  return { stop, stats: () => ({ ...stats }) };
}