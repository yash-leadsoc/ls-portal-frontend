/**
 * Head-direction estimate from MediaPipe Face Landmarker landmarks (normalised
 * image coordinates). We use simple 2-D geometry rather than the transformation
 * matrix: the ratios below are layout-agnostic and cheap.
 *
 *   yaw   = nose offset from the midpoint between the two cheek edges, as a
 *           fraction of face width  (0 = frontal, +/-0.5 = nose at the edge)
 *   pitch = nose offset from the forehead-chin midpoint, as a fraction of face height
 *
 * Both are compared against a per-candidate neutral BASELINE captured during the
 * pre-exam check, so natural face shape / camera angle do not matter.
 *
 * Left/right are in CAMERA-IMAGE terms (unmirrored). Up/down signs and the default
 * thresholds are first estimates and MUST be validated on real devices before use
 * in decisions (see docs/PROCTORING.md). Output is a review indicator only.
 */
const IDX = { nose: 1, forehead: 10, chin: 152, cheekA: 234, cheekB: 454 };

export function poseScores(lm) {
  if (!lm || lm.length < 455) return null;
  const nose = lm[IDX.nose];
  const w = Math.abs(lm[IDX.cheekB].x - lm[IDX.cheekA].x);
  const h = Math.abs(lm[IDX.chin].y - lm[IDX.forehead].y);
  if (!(w > 1e-4) || !(h > 1e-4)) return null;
  const yaw = (nose.x - (lm[IDX.cheekA].x + lm[IDX.cheekB].x) / 2) / w;
  const pitch = (nose.y - (lm[IDX.forehead].y + lm[IDX.chin].y) / 2) / h;
  return { yaw, pitch };
}

export class Baseline {
  constructor() {
    this.n = 0;
    this.yaw = 0;
    this.pitch = 0;
  }
  add(s) {
    if (!s) return;
    this.n++;
    this.yaw += (s.yaw - this.yaw) / this.n;
    this.pitch += (s.pitch - this.pitch) / this.n;
  }
  // get ready() {
  //   return this.n >= 3;
  // }

  get ready() {
  return this.n >= 10;
}
  value() {
    return { yaw: this.yaw, pitch: this.pitch };
  }
}

/** -> 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'AWAY' | null (looking at screen) */
// export function classifyDirection(scores, baseline, { yawThreshold, pitchThreshold }) {
//   if (!scores) return null;
//   const dy = scores.yaw - (baseline?.yaw || 0);
//   const dp = scores.pitch - (baseline?.pitch || 0);
//   const ay = Math.abs(dy) / yawThreshold;
//   const ap = Math.abs(dp) / pitchThreshold;
//   if (ay < 1 && ap < 1) return null;
//   if (Math.abs(dy) > yawThreshold * 2) return 'AWAY'; // far past the threshold: face turned away
//   if (ay >= ap) return dy > 0 ? 'RIGHT' : 'LEFT';
//   return dp > 0 ? 'DOWN' : 'UP';
// }

export function classifyDirection(
  scores,
  baseline,
  { yawThreshold, pitchThreshold }
) {
  if (!scores || !baseline) return null;

  const dy = scores.yaw - baseline.yaw;
  const dp = scores.pitch - baseline.pitch;

  const ay = Math.abs(dy) / yawThreshold;
  const ap = Math.abs(dp) / pitchThreshold;

  // Normal head position.
  if (ay < 1 && ap < 1) return null;

  // Extreme horizontal head turn.
  if (ay >= 2) {
    return dy > 0 ? 'RIGHT' : 'LEFT';
  }

  // Determine the dominant movement.
  if (ay >= ap) {
    return dy > 0 ? 'RIGHT' : 'LEFT';
  }

  return dp > 0 ? 'DOWN' : 'UP';
}
