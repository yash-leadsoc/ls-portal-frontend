/**
 * Delivers proctoring events to the server WITHOUT ever blocking the exam:
 *  - coalesces start/end of an episode into one record (same clientEventId);
 *  - batches normal events (batchIntervalMs), sends critical ones within ~0.5 s;
 *  - failures never throw into the exam; retries use exponential backoff + jitter;
 *  - bounded queue (oldest dropped) so a long outage cannot exhaust memory;
 *  - the server upserts by clientEventId, so retries/duplicates are harmless.
 */
export class ProctoringEventClient {
  constructor({
    send,
    batchIntervalMs = 15000,
    criticalDelayMs = 500,
    maxQueue = 300,
    maxPerRequest = 25,
    baseDelayMs = 2000,
    maxDelayMs = 60000,
    setTimeoutFn = (...a) => setTimeout(...a),
    clearTimeoutFn = (...a) => clearTimeout(...a),
    random = Math.random,
  }) {
    Object.assign(this, { send, batchIntervalMs, criticalDelayMs, maxQueue, maxPerRequest, baseDelayMs, maxDelayMs });
    this.setT = setTimeoutFn;
    this.clearT = clearTimeoutFn;
    this.random = random;
    this.pending = new Map(); // clientEventId -> { evt, v }
    this.timer = null;
    this.dueAt = Infinity;
    this.failures = 0;
    this.sending = false;
    this.closed = false;
    this.stats = { sent: 0, failedRequests: 0, dropped: 0 };
  }

  emit(evt, { critical = false } = {}) {
    if (this.closed) return;
    const prev = this.pending.get(evt.clientEventId);
    const merged = prev ? { ...prev.evt, ...evt, at: Math.min(prev.evt.at, evt.at), durationMs: Math.max(prev.evt.durationMs || 0, evt.durationMs || 0) || undefined } : evt;
    this.pending.set(evt.clientEventId, { evt: merged, v: (prev?.v || 0) + 1 });
    while (this.pending.size > this.maxQueue) {
      this.pending.delete(this.pending.keys().next().value);
      this.stats.dropped++;
    }
    this._schedule(critical ? this.criticalDelayMs : this.batchIntervalMs);
  }

  /** Send everything now (exam end / page hide). Never rejects. */
  async flush({ keepalive = false } = {}) {
    this.clearT(this.timer);
    this.timer = null;
    this.dueAt = Infinity;
    await this._drain(keepalive);
  }

  close() {
    this.closed = true;
    this.clearT(this.timer);
  }

  size() {
    return this.pending.size;
  }

  _schedule(ms) {
    if (this.sending) return;
    const due = Date.now() + ms;
    if (this.timer && due >= this.dueAt) return;
    this.clearT(this.timer);
    this.dueAt = due;
    this.timer = this.setT(() => {
      this.timer = null;
      this.dueAt = Infinity;
      this._drain(false);
    }, ms);
  }

  async _drain(keepalive) {
    if (this.sending || this.closed) return;
    this.sending = true;
    try {
      while (this.pending.size && !this.closed) {
        const batch = [...this.pending.values()].slice(0, this.maxPerRequest);
        try {
          await this.send(batch.map((b) => b.evt), { keepalive });
          for (const b of batch) if (this.pending.get(b.evt.clientEventId)?.v === b.v) this.pending.delete(b.evt.clientEventId);
          this.stats.sent += batch.length;
          this.failures = 0;
        } catch (err) {
          if (err?.status === 409 || err?.status === 404) { // attempt closed / feature off: stop quietly
            this.closed = true;
            this.pending.clear();
            return;
          }
          if (err?.status === 400) { // our payload is bad: drop it, don't loop forever
            for (const b of batch) this.pending.delete(b.evt.clientEventId);
            this.stats.dropped += batch.length;
            continue;
          }
          this.failures++;
          this.stats.failedRequests++;
          const raw = Math.min(this.maxDelayMs, this.baseDelayMs * 2 ** (this.failures - 1));
          this.sending = false;
          this._schedule(Math.round(raw * (0.5 + this.random() * 0.5)));
          return;
        }
      }
    } finally {
      this.sending = false;
    }
  }
}
