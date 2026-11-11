/**
 * Browser-activity monitor. Emits review events through `emit`; it never blocks
 * typing and never ends the exam.
 *
 * Honest limits (do not over-claim in policy documents): browsers cannot reveal
 * other applications, second monitors, screenshots, remote-desktop tools or other
 * devices. Alt-Tab to another app is typically seen only as window blur / tab hidden.
 *
 * `win` / `doc` are injectable so this is unit-testable without a browser.
 */
const RESTRICTED = (e) => {
  const k = (e.key || '').toLowerCase();
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === 'F12') return { key: 'F12', block: true };
  if (e.key === 'PrintScreen') return { key: 'PrintScreen', block: false };
  if (mod && e.shiftKey && ['i', 'j', 'c'].includes(k)) return { key: `Ctrl+Shift+${k.toUpperCase()}`, block: true };
  if (mod && ['u', 's', 'p'].includes(k)) return { key: `Ctrl+${k.toUpperCase()}`, block: true };
  return null;
};

export function createBrowserMonitor({ win, doc, emit, newId, config = {}, now = Date.now }) {
  const cooldownMs = Math.max(0, (config.eventCooldownSeconds ?? 30) * 1000) / 6; // point events: short window (cooldown/6)
  const lastPoint = new Map();
  const open = {}; // type -> { id, at }
  let wantFullscreen = false;
  const off = [];
  const on = (t, ev, fn, opts) => { t.addEventListener(ev, fn, opts); off.push(() => t.removeEventListener(ev, fn, opts)); };

  const start = (type, meta) => {
    if (open[type]) return;
    open[type] = { id: newId(), at: now() };
    emit({ clientEventId: open[type].id, type, at: open[type].at, meta }, { critical: true });
  };
  const end = (type) => {
    const o = open[type];
    if (!o) return;
    delete open[type];
    emit({ clientEventId: o.id, type, at: o.at, durationMs: Math.max(0, now() - o.at) }, { critical: false });
  };
  const point = (type, meta) => {
    const t = now();
    if (t - (lastPoint.get(type) || -Infinity) < cooldownMs) return;
    lastPoint.set(type, t);
    emit({ clientEventId: newId(), type, at: t, meta }, { critical: false });
  };

  on(doc, 'visibilitychange', () => (doc.hidden ? start('TAB_SWITCH') : end('TAB_SWITCH')));

  // Tab switches also fire blur; only report WINDOW_BLUR when the tab itself stayed visible
  // (e.g. clicking another window / app on a second screen).
  on(win, 'blur', () => { setTimeoutSafe(() => { if (!doc.hidden && !open.TAB_SWITCH && !doc.hasFocus?.()) start('WINDOW_BLUR'); }, 250); });
  on(win, 'focus', () => end('WINDOW_BLUR'));

  on(doc, 'fullscreenchange', () => {
    if (!wantFullscreen) return;
    if (doc.fullscreenElement) end('FULLSCREEN_EXIT');
    else start('FULLSCREEN_EXIT');
  });

  const clip = (type) => (e) => {
    point(type);
    if (type !== 'PASTE_ATTEMPT' && config.blockClipboard !== false && !isEditable(e.target)) e.preventDefault?.();
    if (type === 'PASTE_ATTEMPT' && config.blockPaste) e.preventDefault?.();
  };
  on(doc, 'copy', clip('COPY_ATTEMPT'));
  on(doc, 'cut', clip('CUT_ATTEMPT'));
  on(doc, 'paste', clip('PASTE_ATTEMPT'));

  on(doc, 'contextmenu', (e) => { point('CONTEXT_MENU'); if (!isEditable(e.target)) e.preventDefault?.(); });

  on(doc, 'keydown', (e) => {
    const r = RESTRICTED(e);
    if (!r) return; // ordinary typing is never touched
    point('RESTRICTED_SHORTCUT', { key: r.key });
    if (r.block) e.preventDefault?.();
  });

  function setTimeoutSafe(fn, ms) { return (win.setTimeout || setTimeout)(fn, ms); }

  return {
    /** Call from a user gesture (the Start button) when the exam requires fullscreen. */
    async enterFullscreen() {
      try {
        wantFullscreen = true;
        if (!doc.fullscreenElement) await doc.documentElement.requestFullscreen?.();
        end('FULLSCREEN_EXIT');
        return true;
      } catch { return false; }
    },
    setWantFullscreen(v) { wantFullscreen = !!v; },
    isFullscreen: () => !!doc.fullscreenElement,
    /** Close open episodes (exam finished) so durations are reported. */
    closeAll() { Object.keys(open).forEach(end); },
    stop() { off.forEach((f) => f()); off.length = 0; },
  };
}

function isEditable(t) {
  const n = t?.tagName;
  return n === 'TEXTAREA' || n === 'INPUT' || !!t?.isContentEditable;
}
