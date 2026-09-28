import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, uid } from '../../api/client';
import {
  Button,
  Badge,
  Modal,
  LoadingPage,
  Empty,
  Spinner,
} from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import { ChecklistModal, WriteupModal } from './DocumentDetail';

function ConfirmModal({ title = 'Are you sure?', message, confirmLabel = 'Delete', onConfirm, onClose, busy }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: '90vw',
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eef2f7' }}>
          <div style={{ fontSize: 16, fontWeight: 750, color: 'var(--navy, #102a56)' }}>{title}</div>
        </div>

        <div style={{ padding: '18px 20px' }}>
          <p style={{ fontSize: 14, color: '#334155', margin: 0, lineHeight: 1.5 }}>{message}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid #eef2f7' }}>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? <Spinner sm /> : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

const fileIcon = (name = '') => {
  const e = name.split('.').pop()?.toLowerCase() || '';

  if (['ppt', 'pptx'].includes(e)) return '📊';
  if (['doc', 'docx'].includes(e)) return '📄';
  if (e === 'pdf') return '📕';
  if (['xls', 'xlsx', 'csv'].includes(e)) return '📈';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(e)) return '🖼️';
  if (e === 'zip') return '🗜️';

  return '📁';
};


const templateBtnStyle = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  color: 'var(--cyan)',
  fontWeight: 600,
  fontSize: 13,
};

function downloadTemplate(fileName) {
  const link = document.createElement('a');
  link.href = encodeURI(`/${fileName}`);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function MaterialsPage() {
  const [domains, setDomains] = useState([]);
  const [docs, setDocs] = useState([]);
  const { user } = useAuth();
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [showUpload, setShowUpload] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const [showChecklist, setShowChecklist] = useState(false);
  const [domainChecklist, setDomainChecklist] = useState(null);
  const [showChecklistForm, setShowChecklistForm] = useState(false);

  const [showWriteup, setShowWriteup] = useState(false);
  const [domainWriteup, setDomainWriteup] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [showExForm, setShowExForm] = useState(false);
  const canEditEx = ['admin', 'bu', 'manager'].includes(String(user?.role || '').toLowerCase());
  useEffect(() => {
    if (!filter) { setExercises([]); return; }
    api.listExercises(filter).then((r) => setExercises(r.exercises || [])).catch(() => setExercises([]));
  }, [filter]);
  const reloadExercises = () => filter && api.listExercises(filter).then((r) => setExercises(r.exercises || [])).catch(() => { });
  const [showWriteupForm, setShowWriteupForm] = useState(false);

  const [confirm, setConfirm] = useState(null);
  const { toast, toastError } = useToast();
  const nav = useNavigate();

  const canFilterCat = ['admin', 'cto'].includes(String(user?.role || '').toLowerCase());
  const [matCatFilter, setMatCatFilter] = useState('');
  const [editChecklist, setEditChecklist] = useState(null);
  const [editWriteup, setEditWriteup] = useState(null);
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
  const canEdit = ['admin', 'bu', 'manager'].includes(String(user?.role || '').toLowerCase());
  const load = async () => {
    setLoading(true);

    try {
      const domainsResponse = await api.listDomains();
      const domainList = Array.isArray(domainsResponse)
        ? domainsResponse
        : Array.isArray(domainsResponse?.domains)
          ? domainsResponse.domains
          : [];
      setDomains(domainList);

      if (filter) {
        const documentsResponse = await api.listDocuments(filter);
        const documentList = Array.isArray(documentsResponse)
          ? documentsResponse
          : Array.isArray(documentsResponse?.documents)
            ? documentsResponse.documents
            : [];
        setDocs(documentList);
      } else {
        setDocs([]);
      }
    } catch (e) {
      toastError(e);
      setDomains([]);
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  useEffect(() => {
    if (!filter) { setDomainWriteup(null); return; }
    api.writeupForDomain(filter).then(r => setDomainWriteup(r.writeup)).catch(() => setDomainWriteup(null));
  }, [filter]);

  useEffect(() => {
    if (!filter) { setDomainChecklist(null); return; }
    api.checklistForDomain(filter).then(r => setDomainChecklist(r.checklist)).catch(() => setDomainChecklist(null));
  }, [filter]);

  useEffect(() => {
    if (domains.length === 0) {
      if (filter) setFilter('');
      return;
    }
    const stillExists = domains.some((d) => uid(d) === filter);
    if (!filter || !stillExists) {
      setFilter(uid(domains[0]));
    }
  }, [domains]);

  useEffect(() => {
  }, []);

  const download = async (doc) => {
    try {
      await api.downloadDocument(mapDoc(doc));
    } catch (e) {
      toastError(e);
    }
  };

  const remove = async (doc) => {
    if (!window.confirm('Delete this material?')) {
      return;
    }

    try {
      await api.deleteDocument(uid(doc));

      toast('Material deleted');

      await load();
    } catch (e) {
      toastError(e);
    }
  };

  const handleRemoveAllDocuments = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING!\n\n' +
      'This will permanently delete ALL documents and uploaded files.\n\n' +
      'Continue?'
    );

    if (!confirmed) {
      return;
    }

    try {
      const result = await api.deleteAllDocuments();

      alert(
        `${result?.deletedDocuments || 0} documents deleted successfully.`
      );

      setDocs([]);
    } catch (error) {
      alert(error?.message || 'Failed to delete all documents');
    }
  };

  return (
    <>
      <div
        className="page-head"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <h1>Training materials</h1>

          <p>
            Upload PPT / DOC / PDF against a domain, then attach
            checklists and write-ups.
          </p>

          {['admin', 'bu', 'manager'].includes(user?.role) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10, fontSize: 13 }}>
              <span className="muted">Download templates:</span>
              <button
                type="button"
                onClick={() => downloadTemplate('checklist_template.xlsx')}
                style={templateBtnStyle}
              >
                📥 Checklist Template.xlsx
              </button>
              <span className="muted">|</span>
              <button
                type="button"
                onClick={() => downloadTemplate('Writeup Template.xlsx')}
                style={templateBtnStyle}
              >
                📥 Writeup Template.xlsx
              </button>
            </div>
          )}
        </div>
        {canEdit && (
          <Button
            variant="cyan"
            onClick={() => setShowUpload(true)}
          >
            + Upload material
          </Button>)}

        {String(user?.role || '').toLowerCase() === 'admin' && (
          <Button
            variant="danger"
            onClick={handleRemoveAllDocuments}
          >
            🗑️
          </Button>
        )}
      </div>

      {canFilterCat && (
        <div className="row gap-8" style={{ alignItems: 'center', marginBottom: 10 }}>
          <span className="muted" style={{ fontSize: 12.5 }}>Category:</span>
          <select
            className="select"
            style={{ maxWidth: 220 }}
            value={matCatFilter}
            onChange={(e) => { setMatCatFilter(e.target.value); setFilter(''); }}
          >
            <option value="">All categories</option>
            {[...new Set(domains.map((d) => d.categoryName).filter(Boolean))].sort().map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      <div className="chips">
        {domains
          .filter((d) => !matCatFilter || d.categoryName === matCatFilter)
          .map((domain) => {
            const domainId = uid(domain);
            return (
              <button
                key={domainId}
                className={`chip ${filter === domainId ? 'active' : ''}`}
                onClick={() => setFilter(domainId)}
              >
                {domain.icon} {domain.name}
              </button>
            );
          })}
        {domains.filter((d) => !matCatFilter || d.categoryName === matCatFilter).length === 0 && (
          <span className="muted" style={{ fontSize: 12.5, padding: '6px 4px' }}>No domains in this category.</span>
        )}
      </div>

      {filter && (
        <div
          className="training-cards-row"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: '16px 0' }}
        >
          <section className="card" style={{ padding: 18, margin: 0 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ textTransform: 'capitalize', fontSize: 15, fontWeight: 750, color: 'var(--navy)' }}>
                  ☑️ {domains.find((d) => uid(d) === filter)?.key || ' '} Checklist
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {domainChecklist
                    ? `${domainChecklist.title} · ${(domainChecklist.items || []).length} items`
                    : 'No checklist for this domain yet.'}
                </div>
              </div>

              <div className="row gap-8">
                {domainChecklist ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setShowChecklist(true)}>👁 View</Button>
                    {['admin', 'bu', 'manager'].includes(String(user?.role || '').toLowerCase()) && (
                      <Button variant="ghost" size="sm" onClick={() => setEditChecklist(domainChecklist)}>✏️ Edit</Button>
                    )}
                    {isAdmin && (
                      <Button variant="danger" size="sm" onClick={() => setConfirm({
                        message: 'Do you really want to delete this checklist? This cannot be undone.',
                        onConfirm: async () => {
                          try {
                            await api.deleteChecklist(domainChecklist._id);
                            setDomainChecklist(null);
                            toast('Checklist deleted');
                          } catch (e) { toastError(e); }
                          finally { setConfirm(null); }
                        },
                      })}>Delete</Button>
                    )}
                  </>
                ) : (canEdit &&

                  <Button variant="cyan" size="sm" onClick={() => setShowChecklistForm(true)}>+ Add checklist</Button>
                )}
              </div>
            </div>
          </section>

          <section className="card" style={{ padding: 18, margin: 0 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ textTransform: 'capitalize', fontSize: 15, fontWeight: 750, color: 'var(--navy)' }}>
                  ✍️ {domains.find((d) => uid(d) === filter)?.key || 'Domain'} write-up
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {domainWriteup
                    ? `${domainWriteup.title} · ${(domainWriteup.questions || []).length} questions`
                    : 'No write-up for this domain yet.'}
                </div>
              </div>
              <div className="row gap-8">
                {domainWriteup ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setShowWriteup(true)}>👁 View</Button>
                    {['admin', 'bu', 'manager'].includes(String(user?.role || '').toLowerCase()) && (
                      <Button variant="ghost" size="sm" onClick={() => setEditWriteup(domainWriteup)}>✏️ Edit</Button>
                    )}
                    {isAdmin && (
                      <Button variant="danger" size="sm" onClick={() => setConfirm({
                        message: 'Do you really want to delete this write-up? This cannot be undone.',
                        onConfirm: async () => {
                          try {
                            await api.deleteWriteup(domainWriteup._id);
                            setDomainWriteup(null);
                            toast('Write-up deleted');
                          } catch (e) { toastError(e); }
                          finally { setConfirm(null); }
                        },
                      })}>Delete</Button>
                    )}
                  </>
                ) : (canEdit &&
                  <Button variant="cyan" size="sm" onClick={() => setShowWriteupForm(true)}>+ Add write-up</Button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {filter && (
        <section className="card" style={{ padding: 18, margin: '16px 0' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--navy)' }}>🧪 {domains.find((d) => uid(d) === filter)?.name || 'Domain'} exercises</div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{exercises.length} exercise(s)</div>
            </div>
            {canEditEx && <Button variant="cyan" size="sm" onClick={() => setShowExForm(true)}>+ Add exercise</Button>}
          </div>
          {exercises.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {exercises.map((ex) => (
                <div key={ex._id} className="row" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #eef2f7' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{ex.title}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{ex.refType === 'file' ? 'File' : ex.refType === 'link' ? 'Link' : 'No reference'}</div>
                  </div>
                  <div className="row gap-8">
                    {(ex.refFileUrl || ex.refLink) && <a className="btn link" href={ex.refFileUrl || ex.refLink} target="_blank" rel="noreferrer">Open</a>}
                    {canEditEx && (
                      <Button variant="danger" size="sm" onClick={async () => {
                        if (!window.confirm('Delete this exercise?')) return;
                        try { await api.deleteExercise(ex._id); reloadExercises(); toast('Deleted'); } catch (e) { toastError(e); }
                      }}>Delete</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {loading ? (
        <LoadingPage />
      ) : docs.length === 0 ? (
        <Empty>
          No materials yet. Click “Upload material”.
        </Empty>
      ) : (
        <div className="grid grid-auto">
          {docs.map((doc) => {
            const documentId = uid(doc);

            return (
              <div
                key={documentId}
                className="card card-hover"
                style={{
                  cursor: 'pointer',
                }}
              >
                <div className="row gap-12">
                  <div
                    style={{
                      fontSize: 20,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {fileIcon(doc.originalName)}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 40,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 12,
                        color: 'var(--navy)',
                      }}
                    >
                      {doc.title || 'Untitled document'}
                    </div>

                    <div
                      className="muted"
                      style={{
                        fontSize: 10,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {doc.originalName || 'Unknown file'}
                    </div>
                  </div>
                </div>

                <div
                  className="row"
                  style={{
                    marginTop: 12,
                    justifyContent: 'space-between',
                  }}
                >
                  <Badge kind="info">
                    {doc.domain?.name || '—'}
                  </Badge>

                  <div
                    className="row gap-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      👁
                    </Button>

                    {(user?.role || '').toLowerCase() === 'admin' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirm({
                          message: `Do you really want to delete "${doc.title || doc.originalName}"? This cannot be undone.`,
                          onConfirm: async () => {
                            await remove(doc);
                            setConfirm(null);
                          },
                        })}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editWriteup && (
        <WriteupModal
          key={editWriteup._id}
          existing={editWriteup}
          onClose={() => setEditWriteup(null)}
          onDone={async () => {
            setEditWriteup(null);
            const r = await api.writeupForDomain(filter);
            setDomainWriteup(r.writeup);
          }}
        />
      )}

      {editChecklist && (
        <ChecklistModal
          existing={editChecklist}
          onClose={() => setEditChecklist(null)}
          onDone={async () => {
            setEditChecklist(null);
            const r = await api.checklistForDomain(filter);
            setDomainChecklist(r.checklist);
          }}
        />
      )}
      {showUpload && (
        <UploadModal
          domains={domains}
          onClose={() => setShowUpload(false)}
          onDone={async () => {
            setShowUpload(false);
            await load();
          }}
        />
      )}

      {previewDoc && (
        <FilePreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {showChecklist && domainChecklist && (
        <Modal title={domainChecklist.title || 'Checklist'} onClose={() => setShowChecklist(false)} fullScreen>
          <div className="row gap-8" style={{ justifyContent: 'flex-end', marginBottom: 12 }}>
            {isAdmin && (<Button variant="danger" size="sm" onClick={async () => {
              if (!window.confirm('Delete this checklist?')) return;
              try {
                await api.deleteChecklist(domainChecklist._id);
                setDomainChecklist(null);
                setShowChecklist(false);
                toast('Checklist deleted');
              } catch (e) { toastError(e); }
            }}>Delete</Button>)}
          </div>

          {(() => {
            const items = domainChecklist.items || [];
            if (items.length === 0) return <div className="muted">This checklist has no items.</div>;

            const secs = {};
            items.forEach((it) => {
              const s = it.section || it.category || 'General';
              const t = it.topic || 'Single scenario';
              secs[s] = secs[s] || { code: it.code || '', topics: {} };
              if (!secs[s].code && it.code) secs[s].code = it.code;
              (secs[s].topics[t] = secs[s].topics[t] || []).push(it);
            });

            return Object.entries(secs).map(([sName, sec]) => (
              <div key={sName} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#102a56', marginBottom: 8 }}>
                  {sName}{sec.code ? ` (${sec.code})` : ''}
                </div>
                {Object.entries(sec.topics).map(([tName, list]) => (
                  <div key={tName} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0aa7c5', textTransform: 'uppercase', marginBottom: 6 }}>
                      {tName}
                    </div>
                    {list.map((it, i) => (
                      <div key={it._id || i} style={{ padding: '8px 0', borderBottom: '1px solid #eef2f7', fontSize: 13, color: '#334155' }}>
                        {it.text}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ));
          })()}
        </Modal>
      )}

      {showChecklistForm && (
        <ChecklistModal
          domainId={filter}
          onClose={() => setShowChecklistForm(false)}
          onDone={async () => {
            setShowChecklistForm(false);
            const r = await api.checklistForDomain(filter);
            setDomainChecklist(r.checklist);
          }}
        />
      )}

      {showWriteup && domainWriteup && (
        <Modal title={domainWriteup.title || 'Write-up'} onClose={() => setShowWriteup(false)} fullScreen>
          {(domainWriteup.questions || []).map((q, i) => (
            <div key={q._id || i} style={{ padding: '10px 0', borderBottom: '1px solid #eef2f7' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#102a56' }}>Q{i + 1}. {q.text}</div>
              {q.section && q.section !== 'General' && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{q.section}</div>
              )}
            </div>
          ))}
        </Modal>
      )}

      {showWriteupForm && (
        <WriteupModal
          domainId={filter}
          onClose={() => setShowWriteupForm(false)}
          onDone={async () => {
            setShowWriteupForm(false);
            const r = await api.writeupForDomain(filter);
            setDomainWriteup(r.writeup);
          }}
        />
      )}

      {showExForm && (
        <ExerciseModal domainId={filter} onClose={() => setShowExForm(false)} onDone={() => { setShowExForm(false); reloadExercises(); toast('Exercise added'); }} />
      )}

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm(null)}
        />
      )}

    </>
  );
}

function mapDoc(doc) {
  return {
    id: uid(doc),
    originalName: doc.originalName,
  };
}

function UploadModal({ domains = [], onClose, onDone }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [domainId, setDomainId] = useState(
    domains.length > 0 ? uid(domains[0]) : ''
  );

  const [file, setFile] = useState(null);
  const [type, setType] = useState('file');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [htmlFile, setHtmlFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const { toast, toastError } = useToast();

  useEffect(() => {
    if (!domainId && domains.length > 0) {
      setDomainId(uid(domains[0]));
    }
  }, [domains, domainId]);

  const submit = async () => {
    if (!title.trim() || !domainId) { toastError('Title and domain are required'); return; }
    setBusy(true);
    try {
      if (type === 'file') {
        if (!file) { toastError('Please choose a file to upload'); setBusy(false); return; }
        await api.uploadDocument({ title: title.trim(), description, domainId, file });
      } else if (type === 'youtube') {
        if (!youtubeUrl.trim()) { toastError('Please paste a YouTube link'); setBusy(false); return; }
        await api.createMaterialLink({ title: title.trim(), description, domainId, type: 'youtube', url: youtubeUrl.trim() });
      } else {
        if (!htmlFile) { toastError('Please choose an .html file'); setBusy(false); return; }
        const html = await htmlFile.text();
        await api.createMaterialLink({ title: title.trim(), description, domainId, type: 'html', html });
      }
      toast('Material added');
      onDone();
    } catch (e) { toastError(e); }
    finally { setBusy(false); }
  };

  return (
    <Modal
      title="Upload material"
      onClose={onClose}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>

          <Button
            variant="cyan"
            onClick={submit}
            disabled={busy}
          >
            {busy ? <Spinner sm /> : 'Upload'}
          </Button>
        </>
      }
    >
      <div className="field">
        <label>Domain</label>

        <select
          className="select"
          value={domainId}
          onChange={(e) => setDomainId(e.target.value)}
          disabled={domains.length === 0}
        >
          {domains.length === 0 ? (
            <option value="">
              No domains available
            </option>
          ) : (
            domains.map((domain) => (
              <option
                key={uid(domain)}
                value={uid(domain)}
              >
                {domain.icon} {domain.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="field">
        <label>Title</label>

        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. STA basics reference"
        />
      </div>

      <div className="field">
        <label>Description (optional)</label>

        <textarea
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this material about?"
        />
      </div>

      <div className="field">
        <label>Material type</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['file', '📄 File'], ['youtube', '▶ YouTube'], ['html', '🌐 HTML']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setType(k)}
              style={{
                flex: 1, padding: '9px 8px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                border: type === k ? '1px solid #08a6c7' : '1px solid #dbe3ec',
                background: type === k ? '#eefbfe' : '#fff', color: type === k ? '#0284a8' : '#475569'
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {type === 'file' && (
        <div className="field">
          <label>File (PPT, DOC, PDF, XLS, images, zip)</label>
          <input
            className="input"
            type="file"
            style={{ paddingTop: 10 }}
            accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.webp,.zip"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && (
            <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              Selected: {file.name}
            </div>
          )}
        </div>
      )}

      {type === 'youtube' && (
        <div className="field">
          <label>YouTube link</label>
          <input
            className="input"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </div>
      )}

      {type === 'html' && (
        <div className="field">
          <label>HTML file</label>
          <input
            className="input"
            type="file"
            style={{ paddingTop: 10 }}
            accept=".html,.htm"
            onChange={(e) => setHtmlFile(e.target.files?.[0] || null)}
          />
        </div>
      )}
    </Modal>
  );
}

function FilePreviewModal({ doc, onClose }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const extension =
    doc?.originalName
      ?.split('.')
      .pop()
      ?.toLowerCase() || '';

  useEffect(() => {
    try {
      setLoading(true);
      setError('');
      setPreviewUrl('');

      if (!doc) {
        throw new Error('Document not found');
      }

      if (!doc.cloudinaryUrl) {
        throw new Error(
          'Cloudinary PDF URL not found'
        );
      }

      setPreviewUrl(doc.cloudinaryUrl);
    } catch (e) {
      setError(
        e?.message || 'Unable to preview file'
      );
    } finally {
      setLoading(false);
    }
  }, [doc]);

  const isPdf = extension === 'pdf';

  const isOffice = [
    'ppt',
    'pptx',
    'doc',
    'docx',
    'xls',
    'xlsx',
  ].includes(extension);

  const isImage = [
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
  ].includes(extension);

  const isYoutube = doc?.type === 'youtube';
  const isHtml = doc?.type === 'html' || extension === 'html' || extension === 'htm';

  return (
    <Modal
      title={`${fileIcon(doc?.originalName)} ${doc?.title || 'Document preview'
        }`}
      onClose={onClose}
      fullScreen
    >
      {loading && (
        <div
          style={{
            width: '100%',
            height: 'calc(100vh - 70px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <Spinner />

          <div className="muted">
            Preparing preview...
          </div>
        </div>
      )}

      {!loading && error && (
        <div
          style={{
            width: '100%',
            height: 'calc(100vh - 70px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 12,
            textAlign: 'center',
            padding: 20,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: 50 }}>
            ⚠️
          </div>

          <h3>Unable to preview file</h3>

          <p className="muted">
            {error}
          </p>

          {doc?.cloudinaryUrl && (
            <a
              href={doc.cloudinaryUrl}
              target="_blank"
              rel="noreferrer"
              className="btn"
            >
              Open file in new tab
            </a>
          )}
        </div>
      )}

      {!loading &&
        !error &&
        previewUrl &&
        (isPdf || isOffice) && (
          <iframe
            src={`${previewUrl}#toolbar=0`}
            title={doc?.title || 'Document preview'}
            style={{
              width: '100%',
              height: 'calc(100vh - 70px)',
              border: 'none',
              display: 'block',
              background: '#fff',
              margin: 0,
              padding: 0,
            }}
          />
        )}

      {!loading && !error && previewUrl && isYoutube && (
        <iframe
          src={previewUrl}
          title={doc?.title || 'YouTube'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: 'calc(100vh - 70px)', border: 'none', display: 'block', background: '#000' }}
        />
      )}

      {!loading && !error && previewUrl && isHtml && (
        <iframe
          src={previewUrl}
          title={doc?.title || 'HTML'}
          sandbox="allow-scripts allow-same-origin"
          style={{ width: '100%', height: 'calc(100vh - 70px)', border: 'none', display: 'block', background: '#fff' }}
        />
      )}

      {!loading &&
        !error &&
        previewUrl &&
        isImage && (
          <div
            style={{
              width: '100%',
              height: 'calc(100vh - 70px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f5f7fa',
              overflow: 'auto',
              padding: 20,
              boxSizing: 'border-box',
            }}
          >
            <img
              src={previewUrl}
              alt={doc?.title || 'Preview'}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
        )}

    </Modal>
  );
}

function ExerciseModal({ domainId, onClose, onDone }) {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [refType, setRefType] = useState('file');
  const [refLink, setRefLink] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const { toastError } = useToast();
  const submit = async () => {
    if (!title.trim()) { toastError('Title required'); return; }
    if (refType === 'file' && !file) { toastError('Choose a file'); return; }
    if (refType === 'link' && !refLink.trim()) { toastError('Enter a link'); return; }
    setBusy(true);
    try { await api.createExercise({ domainId, title: title.trim(), instructions, refType, refLink, file }); onDone(); }
    catch (e) { toastError(e); } finally { setBusy(false); }
  };
  return (
    <Modal title="Add exercise" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="cyan" onClick={submit} disabled={busy}>{busy ? <Spinner sm /> : 'Create'}</Button></>}>
      <div className="field"><label>Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Build a CDC report" /></div>
      <div className="field"><label>Instructions</label><textarea className="textarea" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Steps the engineer should follow…" /></div>
      <div className="field"><label>Reference</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['file', 'File'], ['link', 'Link'], ['none', 'None']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setRefType(k)} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: refType === k ? '1px solid #08a6c7' : '1px solid #dbe3ec', background: refType === k ? '#eefbfe' : '#fff', color: refType === k ? '#0284a8' : '#475569' }}>{l}</button>
          ))}
        </div>
      </div>
      {refType === 'file' && <div className="field"><input className="input" type="file" style={{ paddingTop: 10 }} onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>}
      {refType === 'link' && <div className="field"><input className="input" value={refLink} onChange={(e) => setRefLink(e.target.value)} placeholder="https://…" /></div>}
    </Modal>
  );
}
