import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './ExamUI';

const pad = (n) => String(n).padStart(2, '0');

/**
 * deadline: a `performance.now()` based timestamp (monotonic, so changing the
 * PC clock cannot extend the exam). onExpire fires once.
 */
export default function ExamTimer({ deadline, onExpire }) {
  const calc = () => Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
  const [left, setLeft] = useState(calc);
  const fired = useRef(false);
  const cb = useRef(onExpire);
  cb.current = onExpire;

  useEffect(() => {
    fired.current = false;
    const tick = () => {
      const n = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
      setLeft(n);
      if (n === 0 && !fired.current) {
        fired.current = true;
        cb.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadline]);

  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const cls = left <= 60 ? 'is-critical' : left <= 300 ? 'is-low' : '';
  return (
    <span className={`ex-timer ${cls}`} role="timer" aria-label={`Time remaining ${h ? `${h} hours ` : ''}${m} minutes ${s} seconds`}>
      <Icon name="clock" size={18} />
      {h > 0 && `${pad(h)}:`}{pad(m)}:{pad(s)}
    </span>
  );
}
