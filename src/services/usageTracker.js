import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackUsage } from '../api/client';

export function useUsageTracking(enabled) {
  const loc = useLocation();
  const current = useRef({ path: null, start: 0 });

  useEffect(() => {
    if (!enabled) return undefined;
    const flush = (view) => {
      const c = current.current;
      if (c.path && c.start) trackUsage(c.path, Date.now() - c.start, view);
    };
    flush(false);
    current.current = { path: loc.pathname, start: document.visibilityState === 'visible' ? Date.now() : 0 };
    trackUsage(loc.pathname, 0, true);
    return undefined;
  }, [loc.pathname, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onVisibility = () => {
      const c = current.current;
      if (document.visibilityState === 'hidden') {
        if (c.path && c.start) trackUsage(c.path, Date.now() - c.start, false);
        c.start = 0;
      } else {
        c.start = Date.now();
      }
    };
    const onUnload = () => {
      const c = current.current;
      if (c.path && c.start) trackUsage(c.path, Date.now() - c.start, false);
      c.start = 0;
    };
    const heartbeat = setInterval(() => {
      const c = current.current;
      if (c.path && c.start && document.visibilityState === 'visible') {
        trackUsage(c.path, Date.now() - c.start, false);
        c.start = Date.now();
      }
    }, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onUnload);
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onUnload);
    };
  }, [enabled]);
}
