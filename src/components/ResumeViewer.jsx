import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Button, Modal, Spinner } from './ui';
import { renderResumeHtml, printResume } from '../utils/resumeTemplate';

export default function ResumeViewer({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getUserResume(userId).then(setData).catch((e) => setError(e.message || 'Could not load resume'));
  }, [userId]);

  const resume = data && data.resume;
  const html = useMemo(() => (resume ? renderResumeHtml(resume) : ''), [resume]);
  const file = (resume && resume.file) || {};

  return (
    <Modal
      title={data ? `Resume — ${data.user.name}` : 'Resume'}
      onClose={onClose}
      footer={
        <>
          {file.url && (
            <a className="btn ghost" href={file.url} target="_blank" rel="noreferrer">📎 Uploaded file</a>
          )}
          {resume && resume.exists && <Button variant="cyan" onClick={() => printResume(resume)}>⬇ Download PDF</Button>}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </>
      }
    >
      {error ? (
        <div className="muted">{error}</div>
      ) : !data ? (
        <div className="row" style={{ justifyContent: 'center', padding: 30 }}><Spinner /></div>
      ) : !resume.exists ? (
        <div className="muted" style={{ fontSize: 13.5 }}>This engineer has not created a resume yet.</div>
      ) : (
        <iframe
          title="Resume"
          srcDoc={html}
          sandbox="allow-same-origin"
          style={{ width: '100%', height: '70vh', border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }}
        />
      )}
    </Modal>
  );
}
