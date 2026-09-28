import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Empty, LoadingPage } from '../../components/ui';

export default function HelpVideo() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getHelpVideo().then(setData).catch(() => setData({ video: null }));
  }, []);

  if (!data) return <LoadingPage />;
  const v = data.video;

  return (
    <>
      <div className="page-head">
        <h1>{v ? v.title : 'How to use the portal'}</h1>
        <p>{v && v.description ? v.description : 'A quick walkthrough of the portal and its features.'}</p>
      </div>

      {!v ? (
        <Empty>The guide video hasn't been added yet. Please check back later.</Empty>
      ) : (
        <div className="card" style={{ padding: 12, maxWidth: 1000 }}>
          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
            <iframe
              title={v.title}
              src={v.embedUrl}
              allow="autoplay; fullscreen"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          </div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
            Video not playing?{' '}
            <a href={v.link} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', fontWeight: 600 }}>
              Open it in Google Drive
            </a>
            .
          </div>
        </div>
      )}
    </>
  );
}
