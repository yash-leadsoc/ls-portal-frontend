import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { LoadingPage, Empty } from '../../components/ui';
import { useToast } from '../../components/Toast';

export default function DomainDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toastError } = useToast();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [savingReview, setSavingReview] = useState({});

  const [pptLink, setPptLink] = useState('');
  const [pptSubmitting, setPptSubmitting] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [exDraft, setExDraft] = useState({});
  const [exBusy, setExBusy] = useState({});
  const [showGuide, setShowGuide] = useState(false);
  const loadExercises = async (domId) => {
    if (!domId) return;
    try { const r = await api.listExercises(domId); setExercises(r.exercises || []); } catch {  }
  };
  const saveExercise = async (ex, completed) => {
    const link = (exDraft[ex._id] ?? ex.my.driveLink ?? '').trim();
    if (completed && !link) { alert('Paste your Google Drive link to mark complete.'); return; }
    setExBusy((b) => ({ ...b, [ex._id]: true }));
    try { await api.submitExercise(ex._id, completed, link); await loadExercises(detail?.domainId); }
    catch (e) { alert(e?.message || 'Could not save'); }
    finally { setExBusy((b) => ({ ...b, [ex._id]: false })); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [domRes, res] = await Promise.all([
        api.listDomains(),
        api.myProgress(),
      ]);

      const domainList = domRes?.domains || domRes || [];
      const thisDomain = domainList.find(
        (d) => String(d._id || d.id) === String(id)
      );

      if (thisDomain && thisDomain.assigned === false) {
        setBlocked(true);
        setDetail(null);
        return;
      }

      const progress = res.progress || {};

      const match = Object.values(progress).find(
        (d) => String(d.domainId) === String(id) || String(d.key) === String(id)
      );

      setBlocked(false);
      setDetail(match || null);
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => { if (detail?.domainId) loadExercises(detail.domainId);  }, [detail?.domainId]);

  const checklists = detail?.checklists || [];
  const writeupGroups = detail?.writeups || [];
  const materials = detail?.materialsList || [];

  const allChecklistItems = useMemo(
    () =>
      checklists.flatMap((c) =>
        (c.items || []).map((it) => ({ ...it, checklistId: c.id, checklistTitle: c.title }))
      ),
    [checklists]
  );

  const allQuestions = useMemo(
    () =>
      writeupGroups.flatMap((w) =>
        (w.questions || []).map((q) => ({ ...q, writeupId: w.id, writeupTitle: w.title }))
      ),
    [writeupGroups]
  );

  const sectionSummary = useMemo(() => {
    const map = new Map();
    allChecklistItems.forEach((it) => {
      const key = it.section || it.category || 'General';
      if (!map.has(key)) {
        map.set(key, {
          key,
          label:
            it.section ||
            (it.category ? it.category.charAt(0).toUpperCase() + it.category.slice(1) : 'General'),
          code: it.code || '',
          total: 0,
          done: 0,
        });
      }
      const row = map.get(key);
      row.total += 1;
      if (it.understood) row.done += 1;
      if (!row.code && it.code) row.code = it.code;
    });
    return Array.from(map.values());
  }, [allChecklistItems]);

  if (loading) return <LoadingPage />;

  if (blocked)
    return (
      <div style={{ maxWidth: 1100 }}>
        <button
          className="btn link"
          onClick={() => nav('/')}
          style={{ marginBottom: 12, paddingLeft: 0 }}
        >
          ← All domains
        </button>
        <Empty>🔒 This domain is not assigned to you.</Empty>
      </div>
    );

  if (!detail) return <Empty>Domain not found.</Empty>;

  const trainingScore = Number(detail.score || 0);

  const checklistTotal = Number(detail.checklistTotal || 0);
  const checklistDone = Number(detail.checklistCompleted || 0);

  const toolDone = Number(detail.toolCompleted || 0);
  const toolTotal = Number(detail.toolTotal || 0);
  const conceptDone = Number(detail.conceptCompleted || 0);
  const conceptTotal = Number(detail.conceptTotal || 0);

  const writeupTotal = Number(detail.writeupTotal || 0);
  const writeupDone = Number(detail.writeupAnswered || 0);

  const materialTotal = Number(detail.materialsTotal || materials.length || 0);
  const materialDone = Number(detail.materialsReviewed || 0);

  const pct = (part, total) =>
    total ? Math.round(Math.max(0, Math.min(100, (part / total) * 100))) : 0;

  const toolPercent = pct(toolDone, toolTotal);
  const conceptPercent = pct(conceptDone, conceptTotal);
  const writeupPercent = pct(writeupDone, writeupTotal);

  const firstChecklistId = checklists.find((c) => c.id)?.id;
  const firstWriteupId = writeupGroups.find((w) => w.id)?.id;

  const openMaterial = (doc) => {
    if (doc.cloudinaryUrl || doc.previewUrl) setPreviewDoc(doc);
  };

  const toggleReviewed = async (doc) => {
    const next = !doc.reviewed;

    const applyReviewed = (value) =>
      setDetail((d) => {
        if (!d) return d;
        const list = (d.materialsList || []).map((m) =>
          m.id === doc.id ? { ...m, reviewed: value } : m
        );
        return {
          ...d,
          materialsList: list,
          materialsReviewed: list.filter((m) => m.reviewed).length,
        };
      });

    applyReviewed(next);
    setSavingReview((s) => ({ ...s, [doc.id]: true }));
    try {
      await api.markReviewed(doc.id, next);
    } catch (e) {
      applyReviewed(!next);
      toastError(e);
    } finally {
      setSavingReview((s) => ({ ...s, [doc.id]: false }));
    }
  };

  const handlePptSubmit = async () => {
    const link = (pptLink || '').trim();

    if (!link) {
      alert('Please enter your Google Drive link.');
      return;
    }
    if (!link.includes('drive.google.com') && !link.includes('docs.google.com')) {
      alert('Please enter a valid Google Drive link.');
      return;
    }

    const domainId = detail.domainId;
    if (!domainId) {
      alert('Domain ID is missing.');
      return;
    }

    try {
      setPptSubmitting(true);
      await api.submitPptSubmission(domainId, 'PPT Exercise', link);
      alert('PPT submitted successfully.');
    } catch (error) {
      alert(error?.message || 'Failed to submit PPT.');
    } finally {
      setPptSubmitting(false);
    }
  };

  const progressBar = (value) => ({ width: `${Math.max(0, Math.min(100, value))}%` });

  return (
    <div className="domain-training-page">
      <div style={{ marginBottom: 18 }}>
        <button className="btn link" onClick={() => nav('/')} style={{ marginBottom: 10, paddingLeft: 0 }}>
          ← All domains
        </button>

        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 5 }}>
          Domains › {detail.name}
        </div>

        <h1 style={{ margin: 0, color: 'var(--navy)', fontSize: 22, fontWeight: 750 }}>
          {detail.icon} {detail.name}
        </h1>

        <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 13 }}>
          {detail.description}
        </p>
      </div>

      <section className="card" style={{ padding: '18px 24px', marginBottom: 14 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            minHeight: 220,
          }}
        >
          <div
            style={{
              width: 86,
              height: 86,
              borderRadius: '50%',
              background: `conic-gradient(#08a9cc ${trainingScore * 3.6}deg, #e4e9f0 ${trainingScore * 3.6}deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
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
                fontWeight: 800,
                fontSize: 18,
                color: 'var(--navy)',
              }}
            >
              {trainingScore}%
            </div>
          </div>

          <div style={{ fontWeight: 750, color: 'var(--navy)', fontSize: 14 }}>Training score</div>

          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
            {checklistDone} of {checklistTotal} checklist items completed
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11 }}>
            <span>
              Tool understanding: <strong>{toolDone} / {toolTotal}</strong>
            </span>
            <span>
              Concepts: <strong>{conceptDone} / {conceptTotal}</strong>
            </span>
            <span>
              Write-ups: <strong>{writeupDone} / {writeupTotal}</strong>
            </span>
          </div>

          <span
            style={{
              marginTop: 9,
              background: '#f1f5f9',
              color: '#64748b',
              borderRadius: 5,
              padding: '4px 8px',
              fontSize: 10,
            }}
          >
            {trainingScore >= 100 ? 'Completed' : trainingScore > 0 ? 'In progress' : 'Not started'}
          </span>
        </div>
      </section>

      <div
        className="domain-training-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
      >
        <section className="card" style={{ padding: 18 }}>
          <div className="section-title">
            <span className="section-icon">📖</span>
            <div>
              <div className="section-heading">Training material</div>
              <div className="section-subtitle">{materialDone} of {materialTotal} reviewed</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 10 }} />

          {materials.length === 0 ? (
            <div className="muted" style={{ padding: '20px 0', fontSize: 12 }}>
              No training material available.
            </div>
          ) : (
            materials.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '10px 0',
                  borderBottom: '1px solid #e2e8f0',
                  fontSize: 12,
                }}
              >
                <div
                  onClick={() => !savingReview[doc.id] && toggleReviewed(doc)}
                  role="checkbox"
                  aria-checked={doc.reviewed}
                  title={doc.reviewed ? 'Reviewed — click to undo' : 'Mark as reviewed'}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    border: doc.reviewed ? '1px solid #08a9cc' : '1px solid #94a3b8',
                    background: doc.reviewed ? '#08a9cc' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 9,
                    flexShrink: 0,
                    cursor: savingReview[doc.id] ? 'wait' : 'pointer',
                    opacity: savingReview[doc.id] ? 0.6 : 1,
                  }}
                >
                  {doc.reviewed ? '✓' : ''}
                </div>

                <div style={{ flex: 1, color: '#1e293b', minWidth: 0 }}>{doc.title}</div>

                <button className="training-small-button" onClick={() => openMaterial(doc)}>
                  View
                </button>
              </div>
            ))
          )}
        </section>


        <section className="card" style={{ padding: 18 }}>
          <div className="section-title" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="row" style={{ gap: 9, alignItems: 'center' }}>
              <span className="section-icon">🧪</span>
              <div>
                <div className="section-heading">Exercises</div>
                <div className="section-subtitle">
                  {exercises.filter((e) => e.my.completed).length} of {exercises.length} completed
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide((g) => !g)}
              style={{ border: '1px solid #dbe3ec', background: '#fff', color: '#0284a8', borderRadius: 7, padding: '5px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
            >
              {showGuide ? 'Hide guidelines' : 'ℹ Guidelines'}
            </button>
          </div>

          {showGuide && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#f2fbfd', border: '1px solid #cbeef5', borderRadius: 8, fontSize: 11.5, color: '#475569', lineHeight: 1.7 }}>
              <b>How to submit</b><br />
              1) Open the exercise (“Click here”) and do the task.<br />
              2) Save your work to Google Drive.<br />
              3) In Drive: <b>Share → Anyone with the link → Viewer</b>, copy the link.<br />
              4) Paste the link below and tick <b>Completed</b>.
            </div>
          )}

          {exercises.length === 0 ? (
            <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>No exercises for this domain yet.</div>
          ) : (
            exercises.map((ex) => (
              <div
                key={ex._id}
                style={{
                  marginTop: 12,
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 14,
                  background: ex.my.completed ? '#f2fdf6' : '#fff',
                }}
              >
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div className="row" style={{ gap: 10, alignItems: 'center', minWidth: 0 }}>
                    <input
                      type="checkbox"
                      checked={!!ex.my.completed}
                      disabled={!!exBusy[ex._id]}
                      onChange={(e) => saveExercise(ex, e.target.checked)}
                      style={{ width: 17, height: 17, flexShrink: 0, accentColor: '#08a9cc', cursor: 'pointer' }}
                      title={ex.my.completed ? 'Completed' : 'Mark completed'}
                    />
                    <div className="row" style={{ gap: 6, alignItems: 'center', minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 750, color: 'var(--navy)', textDecoration: ex.my.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ex.title}
                      </span>
                      {ex.instructions ? (
                        <span title={ex.instructions} style={{ flexShrink: 0, width: 16, height: 16, borderRadius: '50%', background: '#eef6ff', color: '#0284a8', fontSize: 10.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'help' }}>
                          ?
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {(ex.refType === 'file' && ex.refFileUrl) ? (
                    <a className="training-small-button" style={{ flexShrink: 0 }} href={ex.refFileUrl} target="_blank" rel="noreferrer">Click here</a>
                  ) : (ex.refType === 'link' && ex.refLink) ? (
                    <a className="training-small-button" style={{ flexShrink: 0 }} href={ex.refLink} target="_blank" rel="noreferrer">Click here</a>
                  ) : null}
                </div>

                <div className="row" style={{ gap: 8, marginTop: 10, alignItems: 'center' }}>
                  <input
                    type="url"
                    placeholder="Paste your Google Drive link…"
                    value={exDraft[ex._id] ?? ex.my.driveLink ?? ''}
                    onChange={(e) => setExDraft((d) => ({ ...d, [ex._id]: e.target.value }))}
                    style={{ flex: 1, minWidth: 0, height: 38, boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 12px', fontSize: 12.5 }}
                  />
                  <button
                    className="training-small-button"
                    style={{ flexShrink: 0, height: 38, padding: '0 14px' }}
                    disabled={!!exBusy[ex._id]}
                    onClick={() => saveExercise(ex, ex.my.completed)}
                  >
                    {exBusy[ex._id] ? 'Saving…' : 'Save link'}
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="card" style={{ padding: 18 }}>
          <div className="section-title">
            <span className="section-icon">☑️</span>
            <div>
              <div className="section-heading">Checklist</div>
              <div className="section-subtitle">
                {checklistDone} of {checklistTotal} items ticked · {sectionSummary.length} section
                {sectionSummary.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          {sectionSummary.length === 0 ? (
            <div className="muted" style={{ marginTop: 13, fontSize: 12 }}>
              No checklist items yet.
            </div>
          ) : (
            sectionSummary.map((sec, idx) => (
              <div
                key={sec.key}
                style={{ background: '#f8fafc', borderRadius: 8, padding: 11, marginTop: idx === 0 ? 13 : 10 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 7 }}>
                  <span>
                    {sec.label}
                    {sec.code ? ` (${sec.code})` : ''}
                  </span>
                  <span>{sec.done} / {sec.total}</span>
                </div>
                <div className="training-progress-track">
                  <div
                    className="training-progress-fill"
                    style={progressBar(sec.total ? (sec.done / sec.total) * 100 : 0)}
                  />
                </div>
              </div>
            ))
          )}

          <button
            className="training-outline-button"
            onClick={() => firstChecklistId && nav(`/checklist/${firstChecklistId}`)}
            disabled={!firstChecklistId}
          >
            Open checklist →
          </button>
        </section>
        <section
          className="card"
          style={{
            padding: 18,
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(37, 99, 235, 0.06)',
              right: -45,
              top: -45,
            }}
          />

          <div
            style={{
              position: 'absolute',
              width: 70,
              height: 70,
              borderRadius: '50%',
              background: 'rgba(37, 99, 235, 0.04)',
              right: 45,
              bottom: -35,
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                borderRadius: 12,
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 21,
                border: '1px solid #dbeafe',
              }}
            >
              ✍️
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: '#102a56',
                }}
              >
                Write-up Questions
              </div>

              <div
                style={{
                  marginTop: 3,
                  fontSize: 11.5,
                  color: '#64748b',
                }}
              >
                Test your understanding of the training
              </div>
            </div>

            <div
              style={{
                padding: '5px 9px',
                borderRadius: 20,
                background:
                  writeupPercent === 100 ? '#dcfce7' : '#eff6ff',
                color:
                  writeupPercent === 100 ? '#15803d' : '#2563eb',
                fontSize: 10.5,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {writeupPercent === 100 ? '✓ Completed' : 'In Progress'}
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                minWidth: 68,
                borderRadius: '50%',
                background: `conic-gradient(
          #2563eb ${writeupPercent}%,
          #e5e7eb ${writeupPercent}%
        )`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: '#102a56',
                    lineHeight: 1,
                  }}
                >
                  {writeupPercent}%
                </div>

                <div
                  style={{
                    fontSize: 8,
                    color: '#94a3b8',
                    marginTop: 3,
                  }}
                >
                  Complete
                </div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 7,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#334155',
                  }}
                >
                  Your progress
                </span>

                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#2563eb',
                  }}
                >
                  {writeupDone}/{writeupTotal}
                </span>
              </div>

              <div
                className="training-progress-track"
                style={{
                  height: 8,
                  borderRadius: 20,
                  overflow: 'hidden',
                }}
              >
                <div
                  className="training-progress-fill"
                  style={{
                    ...progressBar(writeupPercent),
                    borderRadius: 20,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: 7,
                  fontSize: 10.5,
                  color: '#94a3b8',
                }}
              >
                {writeupPercent === 100
                  ? 'Great job! All questions are completed.'
                  : writeupDone === 0
                    ? 'Start answering the questions to track your progress.'
                    : `${writeupTotal - writeupDone} question${writeupTotal - writeupDone === 1 ? '' : 's'
                    } remaining`}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              const firstWriteup = writeupGroups?.[0];

              if (firstWriteup?.id) {
                nav(`/writeup/${firstWriteup.id}`);
              }
            }}
            disabled={!writeupGroups?.length}
            style={{
              width: '100%',
              height: 40,
              marginTop: 16,
              border: 'none',
              borderRadius: 9,
              background:
                writeupPercent === 100
                  ? '#16a34a'
                  : 'var(--navy)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: writeupGroups?.length ? 'pointer' : 'not-allowed',
              opacity: writeupGroups?.length ? 1 : 0.5,
              position: 'relative',
              zIndex: 1,
              transition: 'all 0.2s ease',
            }}
          >
            {writeupPercent === 100
              ? 'Review Write-ups →'
              : 'Continue Write-up →'}
          </button>
        </section>
      </div>

  

      <style>{`
        .domain-training-page { width: 100%; max-width: 1100px; margin: 0; }
        .section-title { display: flex; align-items: flex-start; gap: 9px; }
        .section-icon {
          width: 22px; height: 22px; border-radius: 5px; background: #eef6ff;
          display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;
        }
        .section-heading { font-size: 13px; font-weight: 750; color: var(--navy); }
        .section-subtitle { font-size: 10.5px; color: #64748b; margin-top: 3px; }
        .training-progress-track { width: 100%; height: 5px; border-radius: 10px; background: #e2e8f0; overflow: hidden; }
        .training-progress-fill { height: 100%; border-radius: 10px; background: #08a9cc; transition: width 0.3s ease; }
        .training-outline-button {
          width: 100%; height: 34px; margin-top: 18px; border: 1px solid #dbe3ec; background: #fff;
          color: var(--navy); border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer;
        }
        .training-outline-button:hover:not(:disabled) { background: #f8fafc; }
        .training-outline-button:disabled { opacity: 0.5; cursor: not-allowed; }
        .training-small-button {
          border: 1px solid #08a9cc; background: #fff; color: #0284a8; border-radius: 6px;
          padding: 4px 8px; font-size: 10px; cursor: pointer;
        }
        @media (max-width: 800px) { .domain-training-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 600px) {
          .domain-training-page { padding: 0 4px; }
          .domain-training-grid { gap: 10px !important; }
          .card { border-radius: 12px; }
        }
      `}</style>

      {previewDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
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
            <div
              style={{
                fontWeight: 700,
                color: 'var(--navy)',
                fontSize: 14,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {previewDoc.title}
            </div>

            <button
              onClick={() => setPreviewDoc(null)}
              style={{
                border: 'none',
                background: '#f1f5f9',
                color: '#334155',
                width: 34,
                height: 34,
                borderRadius: 7,
                cursor: 'pointer',
                fontSize: 18,
                fontWeight: 700,
              }}
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
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                }}
              >
                Preview not available.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
