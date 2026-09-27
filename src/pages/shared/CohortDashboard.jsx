import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Kpi, ProgressRow, Badge, LoadingPage, Empty, pctColors } from '../../components/ui';
import { useToast } from '../../components/Toast';

const CATS = [
  ['tool', 'Tool'],
  ['concepts', 'Concepts'],
  ['practical', 'Practical'],
  ['advanced', 'Advanced'],
];
const CAT_SHORT = ['T', 'C', 'W', 'E'];

const AREAS = [
  ['materials', 'Training'],
  ['checklist', 'Concept'],
  ['writeup', 'Writeup'],
  ['ppt', 'Exercise'],
];

export default function CohortDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [areaDomain, setAreaDomain] = useState('all');
  const { toastError } = useToast();
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      setData(await api.cohort());
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingPage />;
  if (!data) return <Empty>No data available.</Empty>;
  const { kpis, rows, domainAverages, areaAverages = {}, areaAveragesByDomain = {}, areaDomains = [], flagged } = data;
  const areaVals = areaDomain === 'all' ? areaAverages : (areaAveragesByDomain[areaDomain] || {});
  const domainKeys = rows.length ? Object.keys(rows[0].domains) : [];

  return (
    <>
      <div className="page-head">
        <h1>Cohort overview</h1>
        <p>Live rollup computed from every engineer’s saved progress.</p>
      </div>

      <div className="grid grid-4">
        <Kpi icon="👥" value={kpis.cohortSize} label="Engineers in cohort" />
        <Kpi icon="✅" value={`${kpis.avgCompletion}%`} label="Avg completion (active)" />
        <Kpi icon="🗂️" value={`${kpis.domainsWithTrainees} / ${kpis.totalDomains}`} label="Domains with trainees" />
        <Kpi icon="⚠️" value={kpis.below20} label="Below 20% overall" />
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>

        <div className="card pad-lg">
          <div className="section-title" style={{ margin: '0 0 14px' }}>Average completion by domain</div>

          {(() => {
            const allDomains = {};
            (rows || []).forEach((row) => {
              Object.entries(row.domains || {}).forEach(([k, d]) => { allDomains[k] = d.name || k; });
            });
            const keys = Object.keys(allDomains);
            if (keys.length === 0) return <p className="muted" style={{ fontSize: 13 }}>No domains yet.</p>;
            return keys
              .sort((a, b) => allDomains[a].localeCompare(allDomains[b]))
              .map((k) => (
                <ProgressRow key={k} label={allDomains[k]} value={domainAverages[k] ?? 0} navy />
              ));
          })()}

        </div>

        <div className="card pad-lg">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', margin: '0 0 14px' }}>
            <div className="section-title" style={{ margin: 0 }}>Average completion</div>
            <select className="select" style={{ maxWidth: 200 }} value={areaDomain} onChange={(e) => setAreaDomain(e.target.value)}>
              <option value="all">All domains</option>
              {areaDomains.map((d) => (
                <option key={d.key} value={d.key}>{d.name}</option>
              ))}
            </select>
          </div>
          {AREAS.map(([k, label]) => (
            <ProgressRow key={k} label={label} value={areaVals[k] ?? 0} />
          ))}
        </div>
      </div>

      {flagged && flagged.length > 0 && (
        <>
          <div className="section-title">🚩 Flagged for follow-up</div>
          <div className="card" style={{ padding: '6px 20px' }}>
            {flagged.map((f) => (
              <div className="list-row" key={f.id}>
                <div style={{ flex: 1 }}>
                  <div className="li-title">
                    <button className="btn link" onClick={() => nav(`/employee/${f.id}`)}>
                      {f.name}
                    </button>
                  </div>
                  <div className="li-sub">
                    Training {f.best && f.best.val >= 0 ? f.best.val : 0}% · enrolled {f.days}d ago
                  </div>
                </div>
                <Badge kind="danger">Follow up</Badge>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">Engineer grid</div>
      <p className="muted" style={{ fontSize: 12, margin: '-6px 0 10px' }}>
        T = Training · C = Tools & Concepts · W = WriteUp · E = Excercise · Ovr = Overall. Click a name for the full breakdown.
      </p>
      {rows.length === 0 ? (
        <Empty>No engineers registered yet.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th className="name-cell" style={{ textAlign: 'left' }}>Engineer</th>
                <th>Days</th>
                {domainKeys.map((dk) => (
                  <th key={dk} colSpan={5}>
                    {rows[0].domains[dk].name}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="name-cell" style={{ textAlign: 'left' }} />
                <th />
                {domainKeys.map((dk) =>
                  [...CAT_SHORT, 'Ovr'].map((s, i) => <th key={dk + i}>{s}</th>)
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="name-cell">
                    <button className="btn link" onClick={() => nav(`/employee/${r.id}`)}>
                      {r.name}
                    </button>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{r.daysEnrolled}</td>
                  {domainKeys.map((dk) => {
                    const d = r.domains[dk];
                    const vals = [d.tool, d.concepts, d.practical, d.advanced, d.overall];
                    return vals.map((v, i) => {
                      const c = pctColors(v);
                      return (
                        <td key={dk + i}>
                          <span className="cell-pill" style={{ background: c.bg, color: c.fg }}>
                            {v == null ? '–' : v}
                          </span>
                        </td>
                      );
                    });
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
