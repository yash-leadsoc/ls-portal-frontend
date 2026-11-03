import React from 'react';
import { Button, Icon, Modal } from './ExamUI';

/** Shown when the candidate comes back after leaving the exam window. */
export default function ProctorWarning({ open, count, max, onClose }) {
  const remaining = Math.max(0, max - count);
  const last = remaining === 0;
  return (
    <Modal open={open} dismissible={false} onClose={onClose} className={`ex-warnmodal ${last ? 'is-final' : ''}`}
      footer={<Button variant={last ? 'danger' : 'primary'} size="lg" onClick={onClose} data-autofocus>I understand — return to exam</Button>}>
      <div className="ex-warnicon"><Icon name="alert" size={34} /></div>
      <h2>{last ? 'Final warning' : `Warning ${count} of ${max}`}</h2>
      <p>
        You left the examination window (minimised it, switched tab or changed application). This has been recorded.
      </p>
      <div className="ex-pips" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => <i key={i} className={i < count ? 'on' : ''} />)}
      </div>
      <p style={{ marginTop: 12, color: last ? 'var(--ex-danger)' : undefined, fontWeight: last ? 700 : 400 }}>
        {last
          ? 'This was your last warning. If you leave the exam window again, your exam will be submitted automatically.'
          : `You have ${remaining} warning${remaining === 1 ? '' : 's'} left. After that your exam will be submitted automatically.`}
      </p>
    </Modal>
  );
}
