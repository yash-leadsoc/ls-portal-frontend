import test from 'node:test';
import assert from 'node:assert/strict';
import { AutosaveQueue } from '../src/pages/exam/hooks/autosaveQueue.js';

// deterministic fake clock/timers
function fake() {
  let t = 1_000_000;
  const timers = [];
  let id = 0;
  return {
    now: () => t,
    setTimeoutFn: (fn, ms) => { const h = ++id; timers.push({ h, at: t + ms, fn, ms }); return h; },
    clearTimeoutFn: (h) => { const i = timers.findIndex((x) => x.h === h); if (i >= 0) timers.splice(i, 1); },
    async advance(ms) {
      const end = t + ms;
      for (;;) {
        timers.sort((a, b) => a.at - b.at);
        if (!timers.length || timers[0].at > end) break;
        const x = timers.shift();
        t = x.at;
        x.fn();
        await new Promise((r) => setImmediate(r));
      }
      t = end;
      await new Promise((r) => setImmediate(r));
    },
    timers,
  };
}
const tick = () => new Promise((r) => setImmediate(r));
const mk = (f, send, extra = {}) => new AutosaveQueue({ send, now: f.now, setTimeoutFn: f.setTimeoutFn, clearTimeoutFn: f.clearTimeoutFn, random: () => 1, ...extra });

test('rapid changes collapse into one request carrying the latest answer', async () => {
  const f = fake(); const calls = [];
  const q = mk(f, async (qid, p) => { calls.push([qid, p]); });
  q.enqueue('q1', { answer: 'A', markedForReview: false });
  await f.advance(100); q.enqueue('q1', { answer: 'B', markedForReview: false });
  await f.advance(100); q.enqueue('q1', { answer: 'C', markedForReview: true });
  await f.advance(500);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].answer, 'C');
  assert.equal(calls[0][1].markedForReview, true);
  assert.equal(q.status(), 'saved');
});

test('seq strictly increases per question, even within the same millisecond', async () => {
  const f = fake(); const seqs = [];
  const q = mk(f, async (_q, p) => { seqs.push(p.seq); }, { debounceMs: 0 });
  q.enqueue('q1', { answer: 'A' }); await f.advance(1);
  q.enqueue('q1', { answer: 'B' }); await f.advance(1);
  q.enqueue('q1', { answer: 'C' }); await f.advance(1);
  assert.equal(seqs.length, 3);
  assert.ok(seqs[0] < seqs[1] && seqs[1] < seqs[2]);
});

test('never two in-flight requests for one question; newer edit is sent after', async () => {
  const f = fake(); let inflight = 0; let maxInflight = 0; const sent = []; const gates = [];
  const q = mk(f, (qid, p) => new Promise((res) => { inflight++; maxInflight = Math.max(maxInflight, inflight); sent.push(p.answer); gates.push(() => { inflight--; res(); }); }));
  q.enqueue('q1', { answer: 'A' }); await f.advance(500);
  assert.deepEqual(sent, ['A']);
  q.enqueue('q1', { answer: 'B' }); q.enqueue('q1', { answer: 'C' }); await f.advance(1000);
  assert.deepEqual(sent, ['A']); // still waiting on A
  gates[0](); await tick(); await tick();
  assert.deepEqual(sent, ['A', 'C']); // B collapsed away
  gates[1](); await tick();
  assert.equal(maxInflight, 1);
  assert.equal(q.status(), 'saved');
});

test('network failures retry with exponential backoff and never drop the answer', async () => {
  const f = fake(); let n = 0;
  const q = mk(f, async () => { n++; if (n <= 3) throw Object.assign(new Error('net'), { network: true }); }, { debounceMs: 0 });
  q.enqueue('q1', { answer: 'A' });
  await f.advance(1);
  assert.equal(n, 1); assert.equal(q.status(), 'error');
  const delays = f.timers.map((x) => x.ms);
  assert.deepEqual(delays, [1000]);
  await f.advance(1000); assert.equal(n, 2); assert.deepEqual(f.timers.map((x) => x.ms), [2000]);
  await f.advance(2000); assert.equal(n, 3); assert.deepEqual(f.timers.map((x) => x.ms), [4000]);
  await f.advance(4000); assert.equal(n, 4);
  assert.equal(q.status(), 'saved');
});

test('backoff is capped', async () => {
  const f = fake();
  const q = mk(f, async () => { throw Object.assign(new Error('x'), { status: 503 }); }, { debounceMs: 0, maxDelayMs: 8000 });
  q.enqueue('q1', { answer: 'A' });
  await f.advance(1);
  for (let i = 0; i < 8; i++) { const d = f.timers[0].ms; assert.ok(d <= 8000); await f.advance(d); }
});

test('non-retryable rejection (400) is reported as failed and not retried', async () => {
  const f = fake(); let n = 0;
  const q = mk(f, async () => { n++; throw Object.assign(new Error('bad'), { status: 400 }); }, { debounceMs: 0 });
  q.enqueue('q1', { answer: 'A' }); await f.advance(1);
  assert.equal(q.status(), 'failed'); assert.equal(f.timers.length, 0);
  await f.advance(60000); assert.equal(n, 1);
  const r = await q.flush({ timeoutMs: 50 });
  assert.equal(r.ok, false); assert.equal(r.failed, 1);
});

test('exam closed (409) is non-retryable', async () => {
  const f = fake();
  const q = mk(f, async () => { throw Object.assign(new Error('closed'), { status: 409 }); }, { debounceMs: 0 });
  q.enqueue('q1', { answer: 'A' }); await f.advance(1);
  assert.equal(q.status(), 'failed');
});

test('flush() sends pending answers immediately and resolves ok', async () => {
  const f = fake(); const sent = [];
  const q = mk(f, async (qid, p) => { sent.push(qid + p.answer); });
  q.enqueue('q1', { answer: 'A' }); q.enqueue('q2', { answer: 'B' }); q.enqueue('q3', { answer: 'C' });
  const r = await q.flush();
  assert.equal(r.ok, true); assert.equal(sent.length, 3); assert.equal(q.counts().pending, 0);
});

test('flush() while the network is down times out with ok=false and keeps the answers', async () => {
  const f = fake();
  const q = mk(f, async () => { throw Object.assign(new Error('net'), { network: true }); });
  q.enqueue('q1', { answer: 'A' });
  const p = q.flush({ timeoutMs: 5000 });
  await f.advance(5000);
  const r = await p;
  assert.equal(r.ok, false); assert.equal(r.pending, 1);
});

test('unsaved answers survive a reload with their ORIGINAL seq', async () => {
  const f = fake(); const store = {};
  const storage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };
  const q1 = mk(f, async () => { throw Object.assign(new Error('net'), { network: true }); }, { storage, debounceMs: 0 });
  q1.enqueue('q1', { answer: 'A', markedForReview: true }); await f.advance(1);
  const origSeq = JSON.parse(store.ls_exam_pending)[0].seq;
  q1.destroy();
  const got = [];
  const q2 = mk(f, async (qid, p) => { got.push({ qid, ...p }); }, { storage });
  assert.equal(q2.restore(), 1); await f.advance(5);
  assert.equal(got[0].answer, 'A'); assert.equal(got[0].markedForReview, true); assert.equal(got[0].seq, origSeq);
  assert.equal(store.ls_exam_pending, undefined); // mirror cleared after success
});

test('seedSeq makes new edits outrank server-side seq even with a slow client clock', async () => {
  const f = fake(); const seqs = [];
  const q = mk(f, async (_q, p) => { seqs.push(p.seq); }, { debounceMs: 0 });
  q.seedSeq('q1', f.now() + 10_000_000);
  q.enqueue('q1', { answer: 'A' }); await f.advance(1);
  assert.ok(seqs[0] > f.now() + 10_000_000 - 1);
});

test('edits made while a request is retrying replace the stale payload', async () => {
  const f = fake(); let fail = true; const got = [];
  const q = mk(f, async (_q, p) => { if (fail) throw Object.assign(new Error('net'), { network: true }); got.push(p.answer); }, { debounceMs: 0 });
  q.enqueue('q1', { answer: 'old' }); await f.advance(1);
  q.enqueue('q1', { answer: 'new' }); fail = false; await f.advance(5);
  assert.deepEqual(got, ['new']);
});

test('restore() does not resurrect an answer the server already has a newer copy of', async () => {
  const f = fake(); const store = {};
  const storage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };
  store.ls_exam_pending = JSON.stringify([{ qid: 'q1', payload: { answer: 'stale' }, seq: 500 }, { qid: 'q2', payload: { answer: 'newer-local' }, seq: 900 }]);
  const got = [];
  const q = mk(f, async (qid, p) => { got.push(qid + ':' + p.answer); }, { storage });
  q.seedSeq('q1', 600); // server already has seq 600 for q1
  q.seedSeq('q2', 700);
  assert.equal(q.restore(), 1); await f.advance(5);
  assert.deepEqual(got, ['q2:newer-local']);
});
