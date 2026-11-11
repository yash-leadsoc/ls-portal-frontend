/**
 * AutosaveQueue - answer persistence engine for the exam screen (framework-free,
 * unit-tested). Guarantees:
 *  - latest-wins per question: rapid changes collapse into ONE request;
 *  - at most one in-flight request per question; newer edits wait for it;
 *  - every edit carries a strictly increasing `seq`, so the server can discard a
 *    delayed/retried older request instead of overwriting a newer answer;
 *  - retryable failures (network, 5xx, 408, 429) retry forever with exponential
 *    backoff + jitter - an answer is never dropped while the page is open;
 *  - non-retryable failures (400/404/409/410/422) stop retrying and are surfaced;
 *  - unsaved answers are mirrored to sessionStorage and restored after a reload;
 *  - flush() resolves only when everything is confirmed saved (or times out).
 */
const RETRYABLE = (e) => !e?.status || e.status >= 500 || e.status === 408 || e.status === 429;

export class AutosaveQueue {
  constructor({
    send,
    debounceMs = 400,
    textDebounceMs = 900,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    concurrency = 2,
    onChange = () => {},
    storage = null,
    storageKey = 'ls_exam_pending',
    setTimeoutFn = (...a) => setTimeout(...a),
    clearTimeoutFn = (...a) => clearTimeout(...a),
    random = Math.random,
    now = Date.now,
  }) {
    Object.assign(this, { send, debounceMs, textDebounceMs, baseDelayMs, maxDelayMs, concurrency, onChange, storage, storageKey });
    this.setT = setTimeoutFn;
    this.clearT = clearTimeoutFn;
    this.random = random;
    this.now = now;
    this.entries = new Map(); // qid -> entry
    this.lastSeq = new Map();
    this.waiters = [];
    this.inflight = 0;
    this.destroyed = false;
    this.lastError = null;
    this.saved = false;
  }

  /* ---- public API ---- */
  seedSeq(qid, seq) {
    if (seq > (this.lastSeq.get(qid) || 0)) this.lastSeq.set(qid, seq);
  }

  nextSeq(qid) {
    const s = Math.max((this.lastSeq.get(qid) || 0) + 1, this.now());
    this.lastSeq.set(qid, s);
    return s;
  }

  enqueue(qid, payload, { text = false } = {}) {
    if (this.destroyed) return;
    const seq = this.nextSeq(qid);
    const e = this.entries.get(qid);
    if (!e) {
      this.entries.set(qid, { qid, payload, seq, state: 'waiting', attempts: 0, timer: null, next: null });
      this._arm(qid, text ? this.textDebounceMs : this.debounceMs);
    } else if (e.state === 'inflight') {
      e.next = { payload, seq }; // sent after the current request settles
    } else {
      e.payload = payload;
      e.seq = seq;
      e.attempts = 0;
      if (e.state === 'failed') e.state = 'waiting';
      this._arm(qid, text ? this.textDebounceMs : this.debounceMs);
    }
    this._persist();
    this._emit();
  }

  /** Restore answers that were unsaved when the page was closed/reloaded. Their ORIGINAL seq is kept. */
  restore() {
    if (!this.storage) return 0;
    let n = 0;
    try {
      const rows = JSON.parse(this.storage.getItem(this.storageKey) || '[]');
      for (const r of rows) {
        if (!r?.qid || !r.seq || this.entries.has(r.qid)) continue;
        if (r.seq <= (this.lastSeq.get(r.qid) || 0)) continue; // server already holds this or something newer
        this.seedSeq(r.qid, r.seq);
        this.entries.set(r.qid, { qid: r.qid, payload: r.payload, seq: r.seq, state: 'waiting', attempts: 0, timer: null, next: null });
        this._arm(r.qid, 0);
        n++;
      }
    } catch {
      /* corrupt mirror: ignore */
    }
    if (n) this._emit();
    return n;
  }

  /** Resolves { ok, pending, failed }. ok === true only when nothing is left unsaved. */
  flush({ timeoutMs = 15000 } = {}) {
    for (const e of this.entries.values()) {
      if (e.state === 'waiting' || e.state === 'retry') {
        this.clearT(e.timer);
        e.state = 'ready';
        e.timer = null;
      }
    }
    this._pump();
    return new Promise((resolve) => {
      const done = (timedOut) => {
        const c = this.counts();
        resolve({ ok: c.pending === 0 && c.failed === 0, pending: c.pending, failed: c.failed, timedOut });
      };
      if (this._settled()) return done(false);
      const w = { done, timer: this.setT(() => { this.waiters = this.waiters.filter((x) => x !== w); done(true); }, timeoutMs) };
      this.waiters.push(w);
    });
  }

  /** Latest unsaved payload per question (for repainting the UI after restore()). */
  pendingPayloads() {
    const m = new Map();
    for (const e of this.entries.values()) m.set(e.qid, e.next?.payload || e.payload);
    return m;
  }

  counts() {
    let pending = 0;
    let failed = 0;
    let retrying = 0;
    for (const e of this.entries.values()) {
      if (e.state === 'failed') failed++;
      else {
        pending++;
        if (e.state === 'retry') retrying++;
      }
    }
    return { pending, failed, retrying };
  }

  /** 'idle' | 'saving' | 'saved' | 'error' (retrying) | 'failed' (rejected by server) */
  status() {
    const c = this.counts();
    if (c.failed) return 'failed';
    if (c.retrying) return 'error';
    if (c.pending) return 'saving';
    return this.saved ? 'saved' : 'idle';
  }

  questionStatus(qid) {
    const e = this.entries.get(qid);
    if (!e) return 'saved';
    return { failed: 'failed', retry: 'error' }[e.state] || 'saving';
  }

  /** Undo destroy() (React StrictMode runs effect cleanup + setup once in development). */
  resume() {
    this.destroyed = false;
  }

  destroy() {
    this.destroyed = true;
    for (const e of this.entries.values()) this.clearT(e.timer);
    for (const w of this.waiters) this.clearT(w.timer);
    this.waiters = [];
  }

  /* ---- internals ---- */
  _arm(qid, ms) {
    const e = this.entries.get(qid);
    this.clearT(e.timer);
    e.state = 'waiting';
    e.timer = this.setT(() => {
      e.timer = null;
      if (e.state === 'waiting' || e.state === 'retry') e.state = 'ready';
      this._pump();
    }, ms);
  }

  _pump() {
    if (this.destroyed) return;
    for (const e of this.entries.values()) {
      if (this.inflight >= this.concurrency) break;
      if (e.state === 'ready') this._run(e);
    }
  }

  async _run(e) {
    e.state = 'inflight';
    this.inflight++;
    const { seq, payload } = e;
    try {
      await this.send(e.qid, { ...payload, seq });
      this.inflight--;
      this.lastError = null;
      if (e.next) {
        // a newer edit arrived while we were in flight
        e.payload = e.next.payload;
        e.seq = e.next.seq;
        e.next = null;
        e.attempts = 0;
        e.state = 'ready';
      } else {
        this.entries.delete(e.qid);
        this.saved = true;
      }
    } catch (err) {
      this.inflight--;
      this.lastError = err;
      if (e.next) {
        e.payload = e.next.payload;
        e.seq = e.next.seq;
        e.next = null;
      }
      if (RETRYABLE(err)) {
        e.attempts++;
        const raw = Math.min(this.maxDelayMs, this.baseDelayMs * 2 ** (e.attempts - 1));
        const delay = Math.round(raw * (0.5 + this.random() * 0.5)); // jitter: 50-100%
        e.state = 'retry';
        this.clearT(e.timer);
        e.timer = this.setT(() => {
          e.timer = null;
          if (e.state === 'retry') e.state = 'ready';
          this._pump();
        }, delay);
      } else {
        e.state = 'failed';
      }
    }
    this._persist();
    this._emit();
    this._pump();
    this._notify();
  }

  _settled() {
    for (const e of this.entries.values()) if (e.state !== 'failed') return false;
    return true;
  }

  _notify() {
    if (!this.waiters.length) return;
    if (this._settled() || this.counts().failed) {
      const ws = this.waiters;
      this.waiters = [];
      for (const w of ws) {
        this.clearT(w.timer);
        w.done(false);
      }
    }
  }

  _persist() {
    if (!this.storage) return;
    try {
      const rows = [...this.entries.values()].map((e) => ({ qid: e.qid, payload: e.next?.payload || e.payload, seq: e.next?.seq || e.seq }));
      if (rows.length) this.storage.setItem(this.storageKey, JSON.stringify(rows));
      else this.storage.removeItem(this.storageKey);
    } catch {
      /* storage full / disabled: in-memory queue still works */
    }
  }

  _emit() {
    try {
      this.onChange({ status: this.status(), ...this.counts(), lastError: this.lastError });
    } catch {
      /* UI callback must never break saving */
    }
  }
}
