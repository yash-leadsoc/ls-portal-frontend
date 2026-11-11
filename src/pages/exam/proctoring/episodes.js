/**
 * EpisodeTracker turns a noisy per-frame boolean ("face missing right now") into
 * clean review events:
 *  - nothing is reported until the condition has held CONTINUOUSLY for `minMs`;
 *  - once reported, brief flickers (< endGraceMs) do not end the episode;
 *  - after an episode ends, a new one cannot start for `cooldownMs`;
 *  - the same clientEventId is used for start and end, so the server stores ONE row
 *    whose duration is filled in when the episode ends.
 * Never one event per frame.
 */
export class EpisodeTracker {
  constructor({ type, minMs, endGraceMs = 1500, cooldownMs = 0, onStart, onEnd, newId }) {
    Object.assign(this, { type, minMs, endGraceMs, cooldownMs, onStart, onEnd, newId });
    this.activeSince = null; // condition currently true since
    this.inactiveSince = null; // condition false since (while an episode is open)
    this.open = null; // { id, at, meta, confidence }
    this.lastEndAt = -Infinity;
  }

  update(active, now, info = {}) {
    if (active) {
      this.inactiveSince = null;
      if (this.activeSince === null) this.activeSince = now;
      if (this.open) {
        if (info.confidence !== undefined) this.open.confidence = Math.max(this.open.confidence || 0, info.confidence);
        return;
      }
      if (now - this.activeSince >= this.minMs && now - this.lastEndAt >= this.cooldownMs) {
        this.open = { id: this.newId(), at: this.activeSince, meta: info.meta, confidence: info.confidence };
        this.onStart({ id: this.open.id, type: this.type, at: this.open.at, durationMs: Math.round(now - this.activeSince), confidence: info.confidence, meta: info.meta });
      }
    } else {
      this.activeSince = null;
      if (!this.open) return;
      if (this.inactiveSince === null) this.inactiveSince = now;
      if (now - this.inactiveSince >= this.endGraceMs) this._end(this.inactiveSince);
    }
  }

  /** Force-end (exam finished / camera stopped). Reports the duration so far. */
  close(now) {
    if (this.open) this._end(this.inactiveSince ?? now);
    this.activeSince = null;
  }

  _end(endAt) {
    const o = this.open;
    this.open = null;
    this.inactiveSince = null;
    this.lastEndAt = endAt;
    this.onEnd({ id: o.id, type: this.type, at: o.at, durationMs: Math.max(0, Math.round(endAt - o.at)), confidence: o.confidence, meta: o.meta });
  }
}
