// import { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { api } from '../../api/client';
// import { Kpi, ProgressRow, Badge, LoadingPage, Empty, pctColors } from '../../components/ui';
// import { useToast } from '../../components/Toast';

// const CATS = [
//   ['tool', 'Tool'],
//   ['concepts', 'Concepts'],
//   ['practical', 'Practical'],
//   ['advanced', 'Advanced'],
// ];
// const CAT_SHORT = ['T', 'C', 'W', 'E'];

// const AREAS = [
//   ['materials', 'Training'],
//   ['checklist', 'Concept'],
//   ['writeup', 'Writeup'],
//   ['ppt', 'Exercise'],
// ];

// export default function CohortDashboard() {
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [areaDomain, setAreaDomain] = useState('all');
//   const { toastError } = useToast();
//   const nav = useNavigate();

//   const load = async () => {
//     setLoading(true);
//     try {
//       setData(await api.cohort());
//     } catch (e) {
//       toastError(e);
//     } finally {
//       setLoading(false);
//     }
//   };
//   useEffect(() => {
//     load();
//   }, []);

//   if (loading) return <LoadingPage />;
//   if (!data) return <Empty>No data available.</Empty>;
//   const { kpis, rows, domainAverages, areaAverages = {}, areaAveragesByDomain = {}, areaDomains = [], flagged } = data;
//   const areaVals = areaDomain === 'all' ? areaAverages : (areaAveragesByDomain[areaDomain] || {});
//   const domainKeys = rows.length ? Object.keys(rows[0].domains) : [];

//   return (
//     <>
//       <div className="page-head">
//         <h1>Training overview</h1>
//         <p>Live rollup computed from every engineer’s saved progress.</p>
//       </div>

//       <div className="grid grid-4">
//         <Kpi icon="👥" value={kpis.cohortSize} label="Engineers in cohort" />
//         <Kpi icon="✅" value={`${kpis.avgCompletion}%`} label="Avg completion (active)" />
//         <Kpi icon="🗂️" value={`${kpis.domainsWithTrainees} / ${kpis.totalDomains}`} label="Domains with trainees" />
//         <Kpi icon="⚠️" value={kpis.below20} label="Below 20% overall" />
//       </div>

//       <div className="grid grid-2" style={{ marginTop: 16 }}>

//         <div className="card pad-lg">
//           <div className="section-title" style={{ margin: '0 0 14px' }}>Average completion by domain</div>

//           {(() => {
//             const allDomains = {};
//             (rows || []).forEach((row) => {
//               Object.entries(row.domains || {}).forEach(([k, d]) => { allDomains[k] = d.name || k; });
//             });
//             const keys = Object.keys(allDomains);
//             if (keys.length === 0) return <p className="muted" style={{ fontSize: 13 }}>No domains yet.</p>;
//             return keys
//               .sort((a, b) => allDomains[a].localeCompare(allDomains[b]))
//               .map((k) => (
//                 <ProgressRow key={k} label={allDomains[k]} value={domainAverages[k] ?? 0} navy />
//               ));
//           })()}

//         </div>

//         <div className="card pad-lg">
//           <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', margin: '0 0 14px' }}>
//             <div className="section-title" style={{ margin: 0 }}>Average completion</div>
//             <select className="select" style={{ maxWidth: 200 }} value={areaDomain} onChange={(e) => setAreaDomain(e.target.value)}>
//               <option value="all">All domains</option>
//               {areaDomains.map((d) => (
//                 <option key={d.key} value={d.key}>{d.name}</option>
//               ))}
//             </select>
//           </div>
//           {AREAS.map(([k, label]) => (
//             <ProgressRow key={k} label={label} value={areaVals[k] ?? 0} />
//           ))}
//         </div>
//       </div>

//       {flagged && flagged.length > 0 && (
//         <>
//           <div className="section-title">🚩 Flagged for follow-up</div>
//            <div className="card" style={{ padding: '6px 20px', maxHeight: 320, overflowY: 'auto' }}>
//             {flagged.map((f) => (
//               <div className="list-row" key={f.id}>
//                 <div style={{ flex: 1 }}>
//                   <div className="li-title">
//                     <button className="btn link" onClick={() => nav(`/employee/${f.id}`)}>
//                       {f.name}
//                     </button>
//                   </div>
//                   <div className="li-sub">
//                     Training {f.best && f.best.val >= 0 ? f.best.val : 0}% · enrolled {f.days}d ago
//                   </div>
//                 </div>
//                 <Badge kind="danger">Follow up</Badge>
//               </div>
//             ))}
//           </div>
//         </>
//       )}

//       <div className="section-title">Engineer grid</div>
//       <p className="muted" style={{ fontSize: 12, margin: '-6px 0 10px' }}>
//         T = Training · C = Tools & Concepts · W = WriteUp · E = Excercise · Ovr = Overall. Click a name for the full breakdown.
//       </p>
//       {rows.length === 0 ? (
//         <Empty>No engineers registered yet.</Empty>
//       ) : (
//             <div className="table-wrap cohort-grid" style={{ maxHeight: 520, overflow: 'auto' }}>
//           <table className="data">
//             <thead>
//               <tr>
//                 <th className="name-cell" style={{ textAlign: 'left' }}>Engineer</th>
//                 <th>Days</th>
//                 {domainKeys.map((dk) => (
//                   <th key={dk} colSpan={5}>
//                     {rows[0].domains[dk].name}
//                   </th>
//                 ))}
//               </tr>
//               <tr>
//                 <th className="name-cell" style={{ textAlign: 'left' }} />
//                 <th />
//                 {domainKeys.map((dk) =>
//                   [...CAT_SHORT, 'Ovr'].map((s, i) => <th key={dk + i}>{s}</th>)
//                 )}
//               </tr>
//             </thead>
//             <tbody>
//               {rows.map((r) => (
//                 <tr key={r.id}>
//                   <td className="name-cell">
//                     <button className="btn link" onClick={() => nav(`/employee/${r.id}`)}>
//                       {r.name}
//                     </button>
//                   </td>
//                   <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{r.daysEnrolled}</td>
//                   {domainKeys.map((dk) => {
//                     const d = r.domains[dk];
//                     const vals = [d.tool, d.concepts, d.practical, d.advanced, d.overall];
//                     return vals.map((v, i) => {
//                       const c = pctColors(v);
//                       return (
//                         <td key={dk + i}>
//                           <span className="cell-pill" style={{ background: c.bg, color: c.fg }}>
//                             {v == null ? '–' : v}
//                           </span>
//                         </td>
//                       );
//                     });
//                   })}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//         <style>{`
//         .cohort-grid thead tr:first-child th { position: sticky; top: 0; z-index: 2; background: #f8fafc; }
//         .cohort-grid thead tr:nth-child(2) th { position: sticky; top: 37px; z-index: 2; background: #f8fafc; }
//         .cohort-grid thead .name-cell { z-index: 3; }
//       `}</style>
//     </>
//   );
// }


import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Kpi, ProgressRow, Badge, LoadingPage, Empty, pctColors } from '../../components/ui';
import { useToast } from '../../components/Toast';

const CAT_SHORT = ['T', 'C', 'W', 'E'];

const AREAS = [
  ['materials', 'Training'],
  ['checklist', 'Concept'],
  ['writeup', 'Writeup'],
  ['ppt', 'Exercise'],
];

const DOMAIN_BOXES = [
  ['materialsPct', 'Training'],
  ['checklistPct', 'Concept'],
  ['writeupPct', 'Writeup'],
  ['exercisePct', 'Exercise'],
];

function ScoreBox({ label, value }) {
  const c = pctColors(value);
  return (
    <div
      style={{
        minWidth: 92,
        padding: '8px 10px',
        borderRadius: 10,
        background: c.bg,
        color: c.fg,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value == null ? '–' : `${value}%`}</div>
    </div>
  );
}

function DomainView({ rows, domainKey, nav }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');

  const enrolled = useMemo(
    () =>
      rows
        .map((r) => ({ ...r, d: r.domains[domainKey] }))
        .filter((r) => r.d && ((r.assignedDomains || []).includes(String(r.d.domainId)) || r.d.started)),
    [rows, domainKey]
  );

  const overallOf = (r) => r.d.overall ?? 0;
  const avgCompletion = enrolled.length ? Math.round(enrolled.reduce((a, r) => a + overallOf(r), 0) / enrolled.length) : 0;
  const below20 = enrolled.filter((r) => overallOf(r) < 20).length;
  const areaAvg = (key) => {
    const vals = enrolled.map((r) => r.d[key]).filter((v) => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };

  const s = q.trim().toLowerCase();
  const shown = enrolled
    .filter((r) => !s || String(r.name).toLowerCase().includes(s) || String(r.employeeCode || '').toLowerCase().includes(s))
    .sort((a, b) =>
      sort === 'low' ? overallOf(a) - overallOf(b) : sort === 'high' ? overallOf(b) - overallOf(a) : String(a.name).localeCompare(String(b.name))
    );

  return (
    <>
      <div className="grid grid-4">
        <Kpi icon="👥" value={enrolled.length} label="Engineers enrolled in domain" />
        <Kpi icon="✅" value={`${avgCompletion}%`} label="Average completion" />
        <Kpi icon="⚠️" value={below20} label="Below 20% overall" />
        <Kpi icon="🏁" value={enrolled.filter((r) => overallOf(r) >= 80).length} label="80% or above" />
      </div>

      <div className="card pad-lg" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: '0 0 14px' }}>Average completion in this domain</div>
        {AREAS.map(([, label], i) => (
          <ProgressRow key={label} label={label} value={areaAvg(DOMAIN_BOXES[i][0])} />
        ))}
      </div>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '22px 0 10px' }}>
        <div className="section-title" style={{ margin: 0 }}>Engineers ({shown.length})</div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input
            className="input"
            style={{ maxWidth: 260 }}
            placeholder="Search name or employee ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="select" style={{ maxWidth: 180 }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Sort: name</option>
            <option value="low">Sort: lowest first</option>
            <option value="high">Sort: highest first</option>
          </select>
        </div>
      </div>

      {enrolled.length === 0 ? (
        <Empty>No engineers are enrolled in this domain yet.</Empty>
      ) : shown.length === 0 ? (
        <Empty>No engineers match your search.</Empty>
      ) : (
        <div className="card" style={{ padding: '6px 16px', maxHeight: 560, overflowY: 'auto' }}>
          {shown.map((r) => (
            <div key={r.id} className="list-row" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div className="li-title">
                  <button className="btn link" onClick={() => nav(`/employee/${r.id}`)}>
                    {r.name}
                  </button>
                </div>
                <div className="li-sub">
                  {r.employeeCode || '—'} · {r.daysEnrolled} days enrolled
                  {overallOf(r) < 20 && (
                    <span style={{ marginLeft: 8 }}>
                      <Badge kind="danger">Below 20%</Badge>
                    </span>
                  )}
                </div>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {DOMAIN_BOXES.map(([key, label]) => (
                  <ScoreBox key={key} label={label} value={r.d[key]} />
                ))}
                <ScoreBox label="Overall" value={r.d.overall} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function CohortDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [areaDomain, setAreaDomain] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');
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
  const domainOptions = domainKeys
    .map((k) => ({ key: k, name: rows[0].domains[k].name || k }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const selectedName = domainOptions.find((d) => d.key === domainFilter)?.name;

  return (
    <>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1>Cohort overview{selectedName ? ` — ${selectedName}` : ''}</h1>
          <p>
            {selectedName
              ? 'Engineers enrolled in this domain and their progress in each area.'
              : 'Live rollup computed from every engineer’s saved progress.'}
          </p>
        </div>
        <select className="select" style={{ maxWidth: 240 }} value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>
          <option value="all">All domains</option>
          {domainOptions.map((d) => (
            <option key={d.key} value={d.key}>{d.name}</option>
          ))}
        </select>
      </div>

      {domainFilter !== 'all' ? (
        <DomainView rows={rows} domainKey={domainFilter} nav={nav} />
      ) : (
        <>
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
                  .map((k) => <ProgressRow key={k} label={allDomains[k]} value={domainAverages[k] ?? 0} navy />);
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
              <div className="card" style={{ padding: '6px 20px', maxHeight: 320, overflowY: 'auto' }}>
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
            <div className="table-wrap cohort-grid" style={{ maxHeight: 520, overflow: 'auto' }}>
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
                    {domainKeys.map((dk) => [...CAT_SHORT, 'Ovr'].map((s, i) => <th key={dk + i}>{s}</th>))}
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
      )}

      <style>{`
        .cohort-grid thead tr:first-child th { position: sticky; top: 0; z-index: 2; background: #f8fafc; }
        .cohort-grid thead tr:nth-child(2) th { position: sticky; top: 37px; z-index: 2; background: #f8fafc; }
        .cohort-grid thead .name-cell { z-index: 3; }
      `}</style>
    </>
  );
}