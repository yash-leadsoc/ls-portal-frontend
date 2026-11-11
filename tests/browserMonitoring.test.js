import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserMonitor } from '../src/pages/exam/proctoring/browserMonitoring.js';

function env(cfg = {}) {
  const doc = new EventTarget(); doc.hidden = false; doc.fullscreenElement = null; doc.hasFocus = () => true;
  doc.documentElement = { requestFullscreen: async () => { doc.fullscreenElement = {}; doc.dispatchEvent(new Event('fullscreenchange')); } };
  const win = new EventTarget(); win.setTimeout = (fn) => { fn(); return 0; }; // run the blur debounce immediately
  const out = []; let n = 0; let t = 1_000_000;
  const m = createBrowserMonitor({ win, doc, emit: (e) => out.push(e), newId: () => `id_${String(++n).padStart(8, '0')}`, config: cfg, now: () => t });
  return { doc, win, out, m, advance: (ms) => { t += ms; } };
}
const key = (o) => Object.assign(new Event('keydown', { cancelable: true }), o);

test('tab hidden -> TAB_SWITCH start, visible again -> same id with duration', () => {
  const x = env();
  x.doc.hidden = true; x.doc.dispatchEvent(new Event('visibilitychange')); x.advance(4000);
  x.doc.hidden = false; x.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(x.out.length, 2); assert.equal(x.out[0].clientEventId, x.out[1].clientEventId);
  assert.equal(x.out[0].type, 'TAB_SWITCH'); assert.equal(x.out[1].durationMs, 4000);
});

test('a tab switch (which also blurs the window) does not double-report as WINDOW_BLUR', () => {
  const x = env();
  x.doc.hidden = true; x.doc.dispatchEvent(new Event('visibilitychange'));
  x.doc.hasFocus = () => false; x.win.dispatchEvent(new Event('blur'));
  assert.deepEqual(x.out.map((e) => e.type), ['TAB_SWITCH']);
});

test('window blur with the tab still visible -> WINDOW_BLUR episode', () => {
  const x = env();
  x.doc.hasFocus = () => false; x.win.dispatchEvent(new Event('blur')); x.advance(2000);
  x.win.dispatchEvent(new Event('focus'));
  assert.deepEqual(x.out.map((e) => e.type), ['WINDOW_BLUR', 'WINDOW_BLUR']); assert.equal(x.out[1].durationMs, 2000);
});

test('fullscreen exit is only reported after the exam entered fullscreen', () => {
  const x = env();
  x.doc.dispatchEvent(new Event('fullscreenchange')); assert.equal(x.out.length, 0);
  return x.m.enterFullscreen().then(() => {
    x.doc.fullscreenElement = null; x.doc.dispatchEvent(new Event('fullscreenchange'));
    assert.equal(x.out.at(-1).type, 'FULLSCREEN_EXIT');
  });
});

test('ordinary typing is never intercepted; restricted shortcuts are recorded', () => {
  const x = env();
  const a = key({ key: 'a' }); x.doc.dispatchEvent(a);
  assert.equal(a.defaultPrevented, false); assert.equal(x.out.length, 0);
  const f12 = key({ key: 'F12' }); x.doc.dispatchEvent(f12);
  assert.equal(f12.defaultPrevented, true); assert.equal(x.out[0].type, 'RESTRICTED_SHORTCUT'); assert.equal(x.out[0].meta.key, 'F12');
  const ctrlC = key({ key: 'c', ctrlKey: true }); x.doc.dispatchEvent(ctrlC);
  assert.equal(ctrlC.defaultPrevented, false); // copy is handled by the clipboard event, not the keydown
});

test('clipboard attempts are recorded with a cooldown; paste only blocked when configured', () => {
  const x = env();
  const p1 = new Event('paste', { cancelable: true }); x.doc.dispatchEvent(p1);
  x.doc.dispatchEvent(new Event('paste', { cancelable: true })); // within cooldown
  assert.equal(x.out.filter((e) => e.type === 'PASTE_ATTEMPT').length, 1);
  assert.equal(p1.defaultPrevented, false);
  const y = env({ blockPaste: true }); const p2 = new Event('paste', { cancelable: true }); y.doc.dispatchEvent(p2);
  assert.equal(p2.defaultPrevented, true);
});

test('closeAll() reports durations of still-open episodes; stop() detaches listeners', () => {
  const x = env();
  x.doc.hidden = true; x.doc.dispatchEvent(new Event('visibilitychange')); x.advance(1500);
  x.m.closeAll(); assert.equal(x.out.at(-1).durationMs, 1500);
  x.m.stop(); x.doc.dispatchEvent(new Event('visibilitychange')); assert.equal(x.out.length, 2);
});
