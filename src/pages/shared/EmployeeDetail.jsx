import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Kpi, LoadingPage, Empty } from '../../components/ui';
import { useToast } from '../../components/Toast';
import ResumeViewer from '../../components/ResumeViewer';

import { useAuth } from '../../auth/AuthContext';


export default function EmployeeDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toastError } = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allDomains, setAllDomains] = useState([]);
  const [selectedDomainId, setSelectedDomainId] = useState(null);

  const [selectedDomains, setSelectedDomains] = useState([]);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [savingDomains, setSavingDomains] = useState(false);

  const [pptSubmissions, setPptSubmissions] = useState([]);
  const [pptLoading, setPptLoading] = useState(true);
  const { user: loggedUser } = useAuth();
  const [previewDoc, setPreviewDoc] = useState(null);
  const [exSubs, setExSubs] = useState([]);

  useEffect(() => {
    if (!selectedDomainId) { setExSubs([]); return; }
    (async () => {
      try {
        const r = await api.listExercises(selectedDomainId);
        const list = r.exercises || [];
        const withSubs = await Promise.all(
          list.map(async (ex) => {
            try { const s = await api.exerciseSubmissions(ex._id); return { ex, subs: s.submissions || [] }; }
            catch { return { ex, subs: [] }; }
          })
        );
        setExSubs(withSubs);
      } catch { setExSubs([]); }
    })();
  }, [selectedDomainId]);

  useEffect(() => {
    (async () => {
      try {
        setData(await api.employeeProgress(id));
      } catch (e) {
        toastError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const result = await api.listDomains();
        setAllDomains(result?.domains || result || []);
      } catch (e) {
        toastError(e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setPptLoading(true);
        const result = await api.getEmployeePptSubmissions(id);
        setPptSubmissions(result?.submissions || []);
      } catch (e) {
        setPptSubmissions([]);
      } finally {
        setPptLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (selectedDomainId) return;

    const assignedIds = (data?.user?.assignedDomains || [])
      .map((d) => (typeof d === 'string' ? d : d?._id || d?.id))
      .filter(Boolean)
      .map(String);

    const available = allDomains || [];
    const firstAssigned =
      available.find((d) => assignedIds.includes(String(d._id || d.id))) || available[0];

    if (firstAssigned) {
      setSelectedDomainId(String(firstAssigned._id || firstAssigned.id));
    }
  }, [data, allDomains, selectedDomainId]);

  if (loading) return <LoadingPage />;
  if (!data) return <Empty>Engineer not found.</Empty>;

  const { user, progress = {}, summary = {} } = data;

  const canEdit = ['admin', 'bu', 'manager'].includes(String(loggedUser?.role || '').toLowerCase());

  const assignedIds = (user.assignedDomains || [])
    .map((d) => (typeof d === 'string' ? d : d?._id || d?.id))
    .filter(Boolean)
    .map(String);

  const progressByDomainId = {};
  Object.values(progress).forEach((d) => {
    if (d?.domainId) progressByDomainId[String(d.domainId)] = d;
  });

  const domainMap = new Map();
  (allDomains || []).forEach((d) => {
    const domainId = String(d._id || d.id);
    if (!domainId) return;
    domainMap.set(domainId, { ...d, _id: domainId });
  });
  Object.values(progress).forEach((d) => {
    const domainId = String(d.domainId);
    if (!domainId) return;
    domainMap.set(domainId, { ...(domainMap.get(domainId) || {}), ...d, _id: domainId });
  });

  const domains = Array.from(domainMap.values())
    .map((d) => ({ ...d, assigned: assignedIds.includes(String(d._id)) }))
    .sort((a, b) => {
      if (a.assigned && !b.assigned) return -1;
      if (!a.assigned && b.assigned) return 1;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

  const selectedDomain = domains.find((d) => String(d._id) === String(selectedDomainId));
  const detail = progressByDomainId[String(selectedDomainId)] || {};

  const trainingScore = Number(detail.score ?? detail.overall ?? 0);

  const checklistTotal = Number(detail.checklistTotal || 0);
  const checklistDone = Number(detail.checklistCompleted || 0);
  const toolDone = Number(detail.toolCompleted || 0);
  const toolTotal = Number(detail.toolTotal || 0);
  const conceptDone = Number(detail.conceptCompleted || 0);
  const conceptTotal = Number(detail.conceptTotal || 0);
  const writeupTotal = Number(detail.writeupTotal || 0);
  const writeupDone = Number(detail.writeupAnswered || 0);
  const materials = detail.materialsList || [];
  const materialTotal = Number(detail.materialsTotal || materials.length || 0);
  const materialDone = Number(detail.materialsReviewed || 0);
  const checklists = detail.checklists || [];
  const writeupGroups = detail.writeups || [];

  const domainPpts = pptSubmissions.filter((submission) => {
    const submissionDomainId = submission.domain?._id || submission.domain;
    return String(submissionDomainId) === String(selectedDomainId);
  });

  const openDomainModal = () => {
    setSelectedDomains(assignedIds);
    setShowDomainModal(true);
  };

  const toggleDomain = (domainId) => {
    const value = String(domainId);
    setSelectedDomains((current) => {
      const normalized = current.map(String);
      return normalized.includes(value)
        ? normalized.filter((x) => x !== value)
        : [...normalized, value];
    });
  };

  const saveDomains = async () => {
    try {
      setSavingDomains(true);
      const result = await api.assignUserDomains(id, selectedDomains);
      setData((current) => ({
        ...current,
        user: { ...current.user, assignedDomains: result.assignedDomains || selectedDomains },
      }));
      setShowDomainModal(false);
    } catch (e) {
      toastError(e);
    } finally {
      setSavingDomains(false);
    }
  };

  const openMaterial = (doc) => {
    if (doc.cloudinaryUrl || doc.previewUrl) setPreviewDoc(doc);
  };

  return (
    <>
      <button className="btn link" onClick={() => nav(-1)} style={{ marginBottom: 12 }}>
        ← Back
      </button>

      <div
        className="page-head"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}
      >
        <div>
          <div className="row" style={{ alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{user.name}</h1>
            {user.streak && (
              <span
                title={`Longest: ${user.streak.longest ?? 0} days`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c',
                  borderRadius: 999, padding: '3px 10px', fontSize: 12.5, fontWeight: 700,
                }}
              >
                🔥 {user.streak.current ?? 0}-day streak
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0' }}>{user.email} · {user.employeeCode}</p>
        </div>

        {(canEdit &&
          <button className="btn" onClick={openDomainModal}>Assign Domains</button>)}

      </div>

      {/* <ProfileCard user={data.user} /> */}
      <ProfileCard
        user={data.user}
        onUpdated={(updated) => setData((current) => ({ ...current, user: { ...current.user, ...updated } }))}
      />

      <div className="grid grid-3">
        <Kpi icon="📅" value={summary.daysEnrolled ?? 0} label="Days enrolled" />
        <Kpi icon="✅" value={`${summary.avgCompletion ?? 0}%`} label="Average completion" />
        <Kpi
          icon="🗂️"
          value={`${summary.domainsStarted ?? 0} / ${summary.totalDomains ?? domains.length}`}
          label="Domains"
        />
      </div>

      <section className="card" style={{ marginTop: 20, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#102a56', marginBottom: 10 }}>Domains</div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {domains.map((domain) => {
            const assigned = domain.assigned;
            const active = String(domain._id) === String(selectedDomainId);
            const p = Math.max(0, Math.min(100, Number(progressByDomainId[String(domain._id)]?.score || 0)));

            return (
              <button
                key={domain._id}
                type="button"
                disabled={!assigned}
                onClick={() => assigned && setSelectedDomainId(String(domain._id))}
                style={{
                  flex: '0 0 auto',
                  minWidth: 140,
                  border: active && assigned ? '1px solid #08a6c7' : '1px solid #dbe3ec',
                  background: active && assigned ? '#eefbfe' : '#fff',
                  borderRadius: 10,
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: assigned ? 'pointer' : 'not-allowed',
                  opacity: assigned ? 1 : 0.5,
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#102a56' }}>
                  {domain.icon || '📚'} {domain.name}
                </div>

                {assigned ? (
                  <>
                    <div
                      style={{
                        height: 5,
                        background: '#e8edf5',
                        borderRadius: 99,
                        overflow: 'hidden',
                        marginTop: 8,
                      }}
                    >
                      <div style={{ width: `${p}%`, height: '100%', background: '#08a6c7' }} />
                    </div>
                    <div style={{ marginTop: 5, fontSize: 10.5, color: '#64748b' }}>{p}% complete</div>
                  </>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
                    🔒 Not Assigned
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {selectedDomain && !selectedDomain.assigned && (
        <section
          className="card"
          style={{ marginTop: 22, padding: 40, textAlign: 'center' }}
        >
          <div style={{ fontSize: 34, marginBottom: 10 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#102a56' }}>
            {selectedDomain.name}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: '#64748b' }}>
            Not assigned to the employee.
          </div>
        </section>
      )}

      {selectedDomain?.assigned && (
        <>
          <div style={{ marginTop: 22, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>Domains › {selectedDomain.name}</div>
            <h2 style={{ margin: '4px 0 0', color: '#102a56', fontSize: 20 }}>
              {selectedDomain.description || selectedDomain.name}
            </h2>
          </div>

          <section className="card" style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: '50%',
                  background: `conic-gradient(#08a6c7 ${trainingScore * 3.6}deg, #e4e9f1 0deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#102a56',
                  }}
                >
                  {trainingScore}%
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 14, fontWeight: 700, color: '#102a56' }}>Training score</div>
              <div style={{ marginTop: 4, fontSize: 11.5, color: '#64748b' }}>
                {user.name} · {selectedDomain.name}
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                {checklistDone} of {checklistTotal} checklist items · {writeupDone} of {writeupTotal} answered
              </div>
            </div>
          </section>

          <div className="grid grid-2">
            <section className="card" style={{ padding: 16 }}>
              <SectionTitle
                icon="📖"
                title="Training material"
                subtitle={materialTotal ? `${materialDone} of ${materialTotal} reviewed` : 'Training material'}
              />

              {materials.length ? (
                <div style={{ marginTop: 10 }}>
                  {materials.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '11px 0',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 15 }}>{item.reviewed ? '☑️' : '⬜'}</span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#334155',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.title}
                          </div>
                          <div style={{ fontSize: 10.5, color: item.reviewed ? '#16a34a' : '#94a3b8', marginTop: 3 }}>
                            {item.reviewed ? 'Reviewed' : 'Not reviewed'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openMaterial(item)}
                        style={{
                          flex: '0 0 auto',
                          border: '1px solid #dbe3ec',
                          background: '#fff',
                          color: '#102a56',
                          borderRadius: 7,
                          padding: '6px 13px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        👁 View
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
                  No training material available.
                </div>
              )}
            </section>

            <section className="card" style={{ padding: 16 }}>
              <SectionTitle
                icon="☑️"
                title="Training checklist"
                subtitle={checklistTotal ? `${checklistDone} of ${checklistTotal} completed` : 'Employee checklist progress'}
              />

              <div style={{ marginTop: 12 }}>
                <ProgressMini label="📄 Training material" done={materialDone} total={materialTotal} />
                <ProgressMini label="🧰 Tool & concept" done={checklistDone} total={checklistTotal} />
                <ProgressMini label="✍️ Write-up" done={writeupDone} total={writeupTotal} />
                <ProgressMini label="🧪 Exercise" done={Number(detail.exercisesDone || 0)} total={Number(detail.exercisesTotal || 0)} />
              </div>

              <div
                style={{
                  marginTop: 14,
                  padding: '10px 12px',
                  background: '#f8fafc',
                  borderRadius: 8,
                  fontSize: 11.5,
                  color: '#64748b',
                }}
              >
                <strong style={{ color: '#102a56' }}>Overall checklist:</strong>{' '}
                {checklistDone} / {checklistTotal} completed
              </div>
            </section>
          </div>

          <section className="card" style={{ padding: 16, marginTop: 16 }}>
            <SectionTitle
              icon="✅"
              title="Full checklist"
              subtitle={`${checklistDone} of ${checklistTotal} items completed`}
            />

            <button
              type="button"
              onClick={() => nav(`/employee/${id}/domain/${selectedDomainId}/checklist`)}
              disabled={checklistTotal === 0}
              style={{
                marginTop: 12,
                width: '100%',
                height: 40,
                border: '1px solid #08a6c7',
                background: checklistTotal === 0 ? '#f1f5f9' : '#eefbfe',
                color: '#0284a8',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: checklistTotal === 0 ? 'not-allowed' : 'pointer',
                opacity: checklistTotal === 0 ? 0.6 : 1,
              }}
            >
              {checklistTotal === 0 ? 'No checklist items' : 'View full checklist →'}
            </button>
          </section>

          <section className="card" style={{ padding: 16, marginTop: 16 }}>
            <SectionTitle
              icon="📝"
              title="Write-up questions"
              subtitle={writeupTotal ? `${writeupDone} of ${writeupTotal} answered` : 'Employee answers'}
            />

            {writeupGroups.length === 0 ? (
              <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>No write-up questions available.</div>
            ) : (
              writeupGroups.map((w) => (
                <div key={w.id} style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>{w.title}</div>

                  {(w.questions || []).map((q, index) => (
                    <div key={q.id} style={{ padding: '13px 0', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#102a56', lineHeight: 1.5 }}>
                        Q{index + 1}. {q.text}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          padding: '10px 12px',
                          background: q.answered ? '#f8fafc' : '#f1f5f9',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          fontSize: 11.5,
                          lineHeight: 1.6,
                          color: q.answered ? '#334155' : '#94a3b8',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {q.answered ? q.answer : 'No answer submitted'}
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: q.answered ? '#16a34a' : '#94a3b8',
                        }}
                      >
                        {q.answered ? '✓ Answered' : '○ Not answered'}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </section>

          <section className="card" style={{ padding: 16, marginTop: 16 }}>
            <SectionTitle
              icon="🧪"
              title="Exercises"
              subtitle={`${exSubs.length} exercise(s) in this domain`}
            />
            <div style={{ marginTop: 10 }}>
              {exSubs.length === 0 ? (
                <div className="muted" style={{ padding: 10, fontSize: 12 }}>No exercises for this domain.</div>
              ) : (
                exSubs.map(({ ex, subs }) => {
                  const mine = subs.find((s) => String(s.employee?._id || s.employee) === String(user.id || user._id));
                  return (
                    <div key={ex._id} style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#102a56' }}>{ex.title}</div>
                          <div style={{ marginTop: 3, fontSize: 10.5, color: mine?.completed ? '#16a34a' : '#94a3b8' }}>
                            {mine?.completed ? '✓ Completed' : '○ Not completed'}
                          </div>
                          {mine?.driveLink ? (
                            <div style={{ marginTop: 8, padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 10.5, color: '#475569', wordBreak: 'break-all' }}>
                              <strong style={{ color: '#102a56' }}>Google Drive:</strong> {mine.driveLink}
                            </div>
                          ) : (
                            <div className="muted" style={{ marginTop: 6, fontSize: 11 }}>No submission yet.</div>
                          )}
                        </div>
                        {mine?.driveLink && (
                          <button
                            className="training-small-button"
                            onClick={() => window.open(mine.driveLink, '_blank', 'noopener,noreferrer')}
                          >
                            🔗 Open
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

        </>
      )}

      {showDomainModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 500, maxHeight: '80vh', overflowY: 'auto', padding: 24 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0 }}>Assign Domains</h2>
                <p className="muted">Select domains for {user.name}</p>
              </div>

              <button className="btn link" onClick={() => setShowDomainModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allDomains.map((domain) => {
                const domainId = String(domain._id || domain.id);
                const checked = selectedDomains.includes(domainId);

                return (
                  <label
                    key={domainId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 14,
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleDomain(domainId)} />
                    <div>
                      <div style={{ fontWeight: 700 }}>{domain.name}</div>
                      {domain.description && (
                        <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{domain.description}</div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn" onClick={() => setShowDomainModal(false)}>Cancel</button>
              <button className="btn primary" onClick={saveDomains} disabled={savingDomains}>
                {savingDomains ? 'Saving...' : 'Save Domains'}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              height: 58,
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 18px',
              borderBottom: '1px solid #e2e8f0',
              flexShrink: 0,
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {previewDoc.title}
            </div>
            <button
              onClick={() => setPreviewDoc(null)}
              style={{ border: 'none', background: '#f1f5f9', color: '#334155', width: 34, height: 34, borderRadius: 7, cursor: 'pointer', fontSize: 18, fontWeight: 700 }}
            >
              ×
            </button>
          </div>

          <div style={{ flex: 1, background: '#e5e7eb', overflow: 'hidden' }}>
            {previewDoc.cloudinaryUrl || previewDoc.previewUrl ? (
              <iframe
                src={`${previewDoc.cloudinaryUrl || previewDoc.previewUrl}#toolbar=0`}
                title={previewDoc.title}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#fff' }}
              />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                Preview not available.
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .training-small-button {
          border: 1px solid #08a9cc; background: #fff; color: #0284a8; border-radius: 6px;
          padding: 6px 12px; font-size: 11px; font-weight: 700; cursor: pointer;
        }
        .training-small-button:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </>
  );
}

const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function ProfileCard({ user: u, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const STATUS_LABEL = { on_training: 'On training', ongoing_interview: 'Ongoing interview', deployed: 'Deployed' };
  const { user: me } = useAuth();
  const { toast, toastError } = useToast();
  const canEdit = ['admin', 'bu', 'manager'].includes(me?.role);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ jobStatus: '', benchStart: '', deployedAt: '' });
  const today = new Date().toISOString().slice(0, 10);

  const startEdit = () => {
    setForm({
      jobStatus: u.jobStatus || 'on_training',
      benchStart: toInputDate(u.benchStart),
      deployedAt: toInputDate(u.deployedAt),
    });
    setEditing(true);
  };

  const save = async () => {
    if (!form.benchStart) return toastError('Bench start date is required');
    if (form.jobStatus === 'deployed' && form.deployedAt && form.deployedAt < form.benchStart) {
      return toastError('Deployed date cannot be before the bench start date');
    }
    setSaving(true);
    try {
      const res = await api.setEmployeeStatus(
        u.id || u._id,
        form.jobStatus,
        form.benchStart,
        form.jobStatus === 'deployed' ? form.deployedAt || today : null
      );
      onUpdated && onUpdated(res.user);
      toast('Status and bench dates updated');
      setEditing(false);
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="card" style={{ padding: 16, marginBottom: 16 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0,
        }}
      >
        <span style={{ fontWeight: 750, color: '#102a56', fontSize: 15 }}>Profile Details</span>
        <span style={{ fontSize: 13, color: '#64748b' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          className="grid"
          style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, fontSize: 13, marginTop: 14 }}
        >
          <div><b>LSID:</b> {u.employeeCode || '—'}</div>
          <div><b>Name:</b> {u.name}</div>
          <div><b>Email:</b> {u.email}</div>
          <div><b>Contact:</b> {u.contactNumber || '—'}</div>
          <div><b>Preferred location:</b> {u.preferredLocation || '—'}</div>
          <div><b>BU:</b> {u.buName || '—'}</div>
          <div><b>Category:</b> {u.categoryName || '—'}</div>
          <div><b>Trainer:</b> {u.trainerName || '—'}</div>
          <div><b>Status:</b> {STATUS_LABEL[u.jobStatus] || '—'}</div>
          <div><b>Bench start date:</b> {fmtDay(u.benchStart)}{u.benchStartSet === false ? ' (joining date)' : ''}</div>
          {u.jobStatus === 'deployed' && <div><b>Deployed on:</b> {fmtDay(u.deployedAt)}</div>}
          <div>
            <b>Bench ageing:</b> {u.benchDays ?? 0} days
            {u.benchBucket ? <span className="muted"> ({u.benchBucket} days bucket)</span> : null}
            {u.jobStatus === 'deployed' ? <span className="muted"> — until deployment</span> : null}
          </div>
          <div><b>🔥 Streak:</b> {u.streak?.current ?? 0} days (best {u.streak?.longest ?? 0})</div>
          <div style={{ gridColumn: '1 / -1' }}><b>Skills:</b> {(u.skills || []).join(', ') || '—'}</div>

          <div style={{ gridColumn: '1 / -1' }}>
            <button type="button" className="training-small-button" onClick={() => setShowResume(true)}>
              📄 View resume
            </button>
          </div>
          {canEdit && !editing && (
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="button" className="training-small-button" onClick={startEdit}>
                ✏️ Edit status & bench dates
              </button>
            </div>
          )}

          {canEdit && editing && (
            <div
              style={{
                gridColumn: '1 / -1', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
                background: '#f4f6fb', padding: 12, borderRadius: 10,
              }}
            >
              <div className="field" style={{ margin: 0, minWidth: 170 }}>
                <label>Status</label>
                <select className="select" value={form.jobStatus} onChange={(e) => setForm({ ...form, jobStatus: e.target.value })}>
                  <option value="on_training">On training</option>
                  <option value="ongoing_interview">Ongoing interview</option>
                  <option value="deployed">Deployed</option>
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Bench start date</label>
                <input className="input" type="date" max={today} value={form.benchStart}
                  onChange={(e) => setForm({ ...form, benchStart: e.target.value })} />
              </div>
              {form.jobStatus === 'deployed' && (
                <div className="field" style={{ margin: 0 }}>
                  <label>Deployed date</label>
                  <input className="input" type="date" min={form.benchStart} max={today} value={form.deployedAt}
                    onChange={(e) => setForm({ ...form, deployedAt: e.target.value })} />
                </div>
              )}
              <button type="button" className="training-small-button" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="training-small-button" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {showResume && <ResumeViewer userId={u.id || u._id} onClose={() => setShowResume(false)} />}

    </section>
  );
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="section-title">
      <span className="section-icon">{icon}</span>
      <div>
        <div className="section-heading">{title}</div>
        <div className="section-subtitle">{subtitle}</div>
      </div>
    </div>
  );
}

function ProgressMini({ label, done, total }) {
  const d = Number(done || 0);
  const t = Number(total || 0);
  const percent = t ? Math.min(100, Math.max(0, (d / t) * 100)) : 0;

  return (
    <div style={{ background: '#f8fafc', borderRadius: 9, padding: 10, marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#52658a' }}>
        <span>{label}</span>
        <span>{d} / {t}</span>
      </div>
      <div style={{ marginTop: 7, height: 5, background: '#dfe6ef', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: '#08a6c7' }} />
      </div>
    </div>
  );
}
