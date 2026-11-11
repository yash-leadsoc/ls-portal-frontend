import test from 'node:test';
import assert from 'node:assert/strict';
import { EpisodeTracker } from '../src/pages/exam/proctoring/episodes.js';
import { poseScores, classifyDirection, Baseline } from '../src/pages/exam/proctoring/headPose.js';
import { ProctoringEventClient } from '../src/pages/exam/proctoring/eventClient.js';

function tracker(opts = {}) {
  const log = []; let n = 0;
  const t = new EpisodeTracker({ type: 'FACE_NOT_DETECTED', minMs: 8000, endGraceMs: 1500, cooldownMs: 0, newId: () => `ep${++n}`, onStart: (e) => log.push(['start', e]), onEnd: (e) => log.push(['end', e]), ...opts });
  return { t, log };
}

test('short absence (< threshold) produces no event', () => {
  const { t, log } = tracker();
  for (let ms = 0; ms <= 5000; ms += 500) t.update(true, ms);
  t.update(false, 5500); t.update(false, 8000);
  assert.equal(log.length, 0);
});

test('sustained absence emits exactly one start, not one per frame', () => {
  const { t, log } = tracker();
  for (let ms = 0; ms <= 30000; ms += 500) t.update(true, ms);
  assert.equal(log.filter((x) => x[0] === 'start').length, 1);
  assert.equal(log[0][1].at, 0); // episode dates from when it actually began
});

test('episode ends after grace and reports total duration; flicker does not split it', () => {
  const { t, log } = tracker();
  for (let ms = 0; ms <= 10000; ms += 500) t.update(true, ms);
  t.update(false, 10500); t.update(true, 11000); // 0.5 s flicker back
  for (let ms = 11500; ms <= 14000; ms += 500) t.update(true, ms);
  t.update(false, 14500); t.update(false, 16100); // gone > grace
  const ends = log.filter((x) => x[0] === 'end');
  assert.equal(ends.length, 1);
  assert.equal(ends[0][1].durationMs, 14500);
  assert.equal(ends[0][1].id, log[0][1].id);
});

test('cooldown suppresses a new episode right after one ends', () => {
  const { t, log } = tracker({ minMs: 1000, cooldownMs: 30000 });
  for (let ms = 0; ms <= 3000; ms += 500) t.update(true, ms);
  t.update(false, 3500); t.update(false, 5200);
  for (let ms = 6000; ms <= 12000; ms += 500) t.update(true, ms);
  assert.equal(log.filter((x) => x[0] === 'start').length, 1);
});

test('close() reports an open episode (exam finished mid-absence)', () => {
  const { t, log } = tracker({ minMs: 1000 });
  for (let ms = 0; ms <= 4000; ms += 500) t.update(true, ms);
  t.close(4500);
  assert.equal(log.at(-1)[0], 'end'); assert.equal(log.at(-1)[1].durationMs, 4500);
});

// ---- head pose ----
function face({ yaw = 0, pitch = 0 } = {}) {
  const lm = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  lm[234] = { x: 0.4, y: 0.5, z: 0 }; lm[454] = { x: 0.6, y: 0.5, z: 0 }; // width 0.2
  lm[10] = { x: 0.5, y: 0.3, z: 0 }; lm[152] = { x: 0.5, y: 0.7, z: 0 }; // height 0.4
  lm[1] = { x: 0.5 + yaw * 0.2, y: 0.5 + pitch * 0.4, z: 0 };
  return lm;
}
const TH = { yawThreshold: 0.28, pitchThreshold: 0.2 };

test('frontal face -> no direction; scores are normalised', () => {
  const s = poseScores(face());
  assert.ok(Math.abs(s.yaw) < 1e-9 && Math.abs(s.pitch) < 1e-9);
  assert.equal(classifyDirection(s, { yaw: 0, pitch: 0 }, TH), null);
});

test('direction classification, relative to the candidate baseline', () => {
  const base = { yaw: 0.05, pitch: 0.1 };
  assert.equal(classifyDirection(poseScores(face({ yaw: 0.05 + 0.35, pitch: 0.1 })), base, TH), 'RIGHT');
  assert.equal(classifyDirection(poseScores(face({ yaw: 0.05 - 0.35, pitch: 0.1 })), base, TH), 'LEFT');
  assert.equal(classifyDirection(poseScores(face({ yaw: 0.05, pitch: 0.1 + 0.25 })), base, TH), 'DOWN');
  assert.equal(classifyDirection(poseScores(face({ yaw: 0.05, pitch: 0.1 - 0.25 })), base, TH), 'UP');
  assert.equal(classifyDirection(poseScores(face({ yaw: 0.05 + 0.7 })), base, TH), 'AWAY');
});

test('small head movement within thresholds is NOT flagged', () => {
  assert.equal(classifyDirection(poseScores(face({ yaw: 0.15, pitch: 0.1 })), { yaw: 0, pitch: 0 }, TH), null);
});

test('degenerate / missing landmarks are handled', () => {
  assert.equal(poseScores(null), null);
  assert.equal(poseScores([]), null);
  assert.equal(classifyDirection(null, null, TH), null);
});

test('Baseline averages samples and needs a few', () => {
  const b = new Baseline(); b.add({ yaw: 0.1, pitch: 0 }); assert.equal(b.ready, false);
  b.add({ yaw: 0.2, pitch: 0 }); b.add({ yaw: 0.3, pitch: 0 });
  assert.ok(b.ready); assert.ok(Math.abs(b.value().yaw - 0.2) < 1e-9);
});

// ---- event client ----
function fakeClock() {
  const timers = []; let id = 0;
  return { timers, setTimeoutFn: (fn, ms) => { timers.push({ h: ++id, fn, ms }); return id; }, clearTimeoutFn: (h) => { const i = timers.findIndex((x) => x.h === h); if (i >= 0) timers.splice(i, 1); }, async fire() { const x = timers.shift(); x?.fn(); await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r)); } };
}
const ev = (id, extra = {}) => ({ clientEventId: id, type: 'TAB_SWITCH', at: 1000, ...extra });

test('start + end of one episode coalesce into a single record with the duration', async () => {
  const c = fakeClock(); const sent = [];
  const cl = new ProctoringEventClient({ send: async (b) => { sent.push(b); }, setTimeoutFn: c.setTimeoutFn, clearTimeoutFn: c.clearTimeoutFn });
  cl.emit(ev('episode-0001')); cl.emit(ev('episode-0001', { durationMs: 4200 }));
  await cl.flush();
  assert.equal(sent.length, 1); assert.equal(sent[0].length, 1); assert.equal(sent[0][0].durationMs, 4200);
});

test('failed delivery keeps events and retries with backoff; exam code never sees an error', async () => {
  const c = fakeClock(); let fail = 2; const sent = [];
  const cl = new ProctoringEventClient({ send: async (b) => { if (fail-- > 0) throw new Error('offline'); sent.push(b); }, setTimeoutFn: c.setTimeoutFn, clearTimeoutFn: c.clearTimeoutFn, random: () => 1 });
  cl.emit(ev('episode-0002'), { critical: true });
  await c.fire(); assert.equal(cl.size(), 1);
  await c.fire(); assert.equal(cl.size(), 1);
  await c.fire(); assert.equal(cl.size(), 0); assert.equal(sent.length, 1);
  assert.equal(cl.stats.failedRequests, 2);
});

test('409 (attempt closed) stops delivery quietly; 400 drops the bad batch', async () => {
  const c = fakeClock();
  const a = new ProctoringEventClient({ send: async () => { throw Object.assign(new Error('x'), { status: 409 }); }, setTimeoutFn: c.setTimeoutFn, clearTimeoutFn: c.clearTimeoutFn });
  a.emit(ev('episode-0003')); await a.flush(); assert.equal(a.size(), 0); assert.equal(a.closed, true);
  const b = new ProctoringEventClient({ send: async () => { throw Object.assign(new Error('x'), { status: 400 }); }, setTimeoutFn: c.setTimeoutFn, clearTimeoutFn: c.clearTimeoutFn });
  b.emit(ev('episode-0004')); await b.flush(); assert.equal(b.size(), 0); assert.equal(b.stats.dropped, 1);
});

test('requests are chunked to the server limit and the queue is bounded', async () => {
  const c = fakeClock(); const sizes = [];
  const cl = new ProctoringEventClient({ send: async (b) => { sizes.push(b.length); }, setTimeoutFn: c.setTimeoutFn, clearTimeoutFn: c.clearTimeoutFn, maxQueue: 60 });
  for (let i = 0; i < 80; i++) cl.emit(ev(`episode-${String(i).padStart(4, '0')}`));
  assert.equal(cl.size(), 60); assert.equal(cl.stats.dropped, 20);
  await cl.flush(); assert.deepEqual(sizes, [25, 25, 10]);
});
