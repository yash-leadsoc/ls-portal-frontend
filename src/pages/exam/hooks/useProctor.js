import { useEffect, useRef } from 'react';

/**
 * Detects the candidate leaving the exam window: minimising, switching tab or
 * switching to another application.
 *
 * One "leave" produces several browser events (blur + visibilitychange), so a
 * single `away` latch makes sure it is reported exactly once. It is released
 * only when the page is visible AND focused again.
 *
 *   onLeave(kind)  kind = 'TAB_HIDDEN' | 'WINDOW_BLUR'
 */
export default function useProctor({ active, onLeave }) {
  const cb = useRef(onLeave);
  cb.current = onLeave;

  useEffect(() => {
    if (!active) return undefined;
    const armedAt = Date.now();
    let away = false;

    const leave = (kind) => {
      // Ignore focus noise during the first moments (page load, permission prompts).
      if (away || Date.now() - armedAt < 1500) return;
      away = true;
      cb.current?.(kind);
    };
    const back = () => {
      if (!document.hidden && document.hasFocus()) away = false;
    };
    const onVisibility = () => (document.hidden ? leave('TAB_HIDDEN') : back());
    const onBlur = () => leave('WINDOW_BLUR');

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', back);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', back);
    };
  }, [active]);
}
