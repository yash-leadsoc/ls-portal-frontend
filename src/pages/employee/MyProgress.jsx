import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { ScoreRing, Badge, ProgressRow, LoadingPage, Empty, pctColors } from '../../components/ui';
import { useToast } from '../../components/Toast';

export default function MyProgress() {
  const [streak, setStreak] = useState(null);
  useEffect(() => { api.getMyStreak().then((r) => setStreak(r.streak)).catch(() => {}); }, []);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toastError } = useToast();

  useEffect(() => {
    (async () => {
      try {
        setData(await api.myProgress());
      } catch (e) {
        toastError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingPage />;
  if (!data) return <Empty>No progress yet.</Empty>;

  const { progress, summary } = data;
  const domains = Object.values(progress);

  return (
    <>
      <div className="page-head">
        <h1>My training score</h1>
        <p>Your live completion across all domains.</p>
      </div>

      <div className="card pad-lg">
        <div className="row gap-16" style={{ flexWrap: 'wrap' }}>
          <ScoreRing percent={summary.avgCompletion} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 16 }}>Overall completion</div>
            <div className="muted" style={{ fontSize: 13, margin: '4px 0 10px' }}>
              {summary.domainsStarted} of {summary.totalDomains} domains started · strongest: {summary.strongestDomain}
            </div>
            <div className="row gap-8">
              <Badge kind="neutral">{summary.daysEnrolled} days enrolled</Badge>
              <Badge kind="warning">{summary.pace}</Badge>
            </div>
          </div>
        </div>
      </div>

      {streak && (
        <div className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 30 }}>🔥</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#102a56' }}>{streak.current}-day streak</div>
            <div className="muted" style={{ fontSize: 12 }}>Longest: {streak.longest} days · keep training daily to grow it</div>
          </div>
        </div>
      )}
      <div className="section-title">Domain breakdown</div>
      <div className="grid grid-2">
        {domains.map((d) => {
          const c = pctColors(d.overall);
          return (
            <div key={d.name} className="card pad-lg" style={{ opacity: d.started ? 1 : 0.6 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15 }}>{d.name}</span>
                <span className="badge" style={{ background: c.bg, color: c.fg }}>
                  {d.overall == null ? 'Not started' : `${d.overall}%`}
                </span>
              </div>
              <ProgressRow label="Training" value={d.materialsPct} />
              <ProgressRow label="Concept" value={d.checklistPct} />
              <ProgressRow label="Writeup" value={d.writeupPct} />
              <ProgressRow label="Exercise" value={d.pptPct} />
            </div>
          );
        })}
      </div>
    </>
  );
}
