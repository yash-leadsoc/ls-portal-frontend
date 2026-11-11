/**
 * Holds the webcam MediaStream across route changes (consent/pre-check screen ->
 * exam screen) so the candidate is not prompted twice. Video is never recorded.
 * Audio is never requested.
 */
let stream = null;
const listeners = new Set();

export const cameraStore = {
  async acquire() {
    if (stream && stream.getVideoTracks().some((t) => t.readyState === 'live')) return stream;
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('Camera API unavailable'), { code: 'unavailable' });
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 24 }, facingMode: 'user' }, audio: false });
    } catch (e) {
      const denied = ['NotAllowedError', 'SecurityError', 'PermissionDeniedError'].includes(e.name);
      throw Object.assign(e, { code: denied ? 'denied' : 'unavailable' });
    }
    for (const t of stream.getVideoTracks()) t.addEventListener('ended', () => listeners.forEach((l) => l('ended')));
    return stream;
  },
  get: () => (stream && stream.getVideoTracks().some((t) => t.readyState === 'live') ? stream : null),
  onEnded(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  release() {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  },
};

export function attachStream(video, s) {
  if (!video || !s) return;
  video.muted = true;
  video.playsInline = true;
  video.srcObject = s;
  video.play?.().catch(() => {});
}
