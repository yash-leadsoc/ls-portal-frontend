import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, uid } from '../../api/client';
import { LoadingPage, Empty } from '../../components/ui';
import { useToast } from '../../components/Toast';

export default function EmployeeDomains() {
  const [domains, setDomains] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const { toastError } = useToast();
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const d = await api.listDomains();
        setDomains(d.domains);
        try {
          const p = await api.myProgress();
          setProgress(p.progress);
        } catch { }
      } catch (e) {
        toastError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingPage />;

  return (
    <>
      <div className="page-head">
        <h1>Choose a domain</h1>
        <p>Review materials, work through the checklist, and answer the write-ups.</p>
      </div>
      {domains.length === 0 ? (
        <Empty>No domains available yet.</Empty>
      ) : (
        <div className="grid grid-auto">

         {[...domains]
  .sort((a, b) => {
    if (a.assigned && !b.assigned) return -1;
    if (!a.assigned && b.assigned) return 1;
    return 0;
  })
  .map((d) => {
    const locked = !d.assigned;
    const pct = progress[d.key]?.overall ?? 0;

    return (
      <div
        key={uid(d)}
        className="card card-hover"
        onClick={() => {
          if (locked) return;

          nav(`/domain/${uid(d)}`);
        }}
        style={{
          cursor: locked ? 'not-allowed' : 'pointer',
          opacity: locked ? 0.3 : 1,
          position: 'relative',
        }}
      >
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: 'var(--navy)',
              fontSize: 16,
              marginTop: 10,
            }}
          >
            {d.name}
          </div>

          {locked ? (
            <span>🔒</span>
          ) : (
            <span>✓</span>
          )}
        </div>

        <div
          className="muted"
          style={{
            fontSize: 12.5,
            marginTop: 2,
            minHeight: 32,
          }}
        >
          {d.description}
        </div>

        <div
          className="track"
          style={{
            marginTop: 8,
          }}
        >
          <div
            className="fill"
            style={{
              width: `${pct}%`,
            }}
          />
        </div>

        <div
          className="muted"
          style={{
            fontSize: 11.5,
            marginTop: 5,
          }}
        >
          {pct}% complete
        </div>
      </div>
    );
  })}
        </div>
      )}
    </>
  );
}
