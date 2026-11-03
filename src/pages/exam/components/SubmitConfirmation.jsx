import React from 'react';
import { Alert, Button, Modal } from './ExamUI';

export default function SubmitConfirmation({ open, answered, total, review, onCancel, onConfirm, busy }) {
  const left = total - answered;
  return (
    <Modal open={open} title="Submit examination?" onClose={onCancel} dismissible={!busy}
      footer={<>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Back to exam</Button>
        <Button variant="primary" onClick={onConfirm} busy={busy} data-autofocus>Confirm &amp; submit</Button>
      </>}>
      <div className="ex-stack">
        <p className="ex-muted">Once submitted you cannot change your answers.</p>
        <div className="ex-tally" style={{ display: 'grid' }}>
          <div><b>{total}</b><small>Total</small></div>
          <div><b style={{ color: 'var(--ex-success)' }}>{answered}</b><small>Answered</small></div>
          <div><b style={{ color: left ? 'var(--ex-danger)' : undefined }}>{left}</b><small>Unanswered</small></div>
        </div>
        {left > 0 && <Alert tone="warn">You have {left} unanswered question{left === 1 ? '' : 's'}.</Alert>}
        {review > 0 && <Alert tone="info">{review} question{review === 1 ? ' is' : 's are'} marked for review.</Alert>}
      </div>
    </Modal>
  );
}
