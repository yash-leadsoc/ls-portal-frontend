import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { api, uid } from '../../api/client';
import { Button, Badge, Modal, LoadingPage, Empty, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';

const CATS = ['tool', 'concepts', 'practical', 'advanced'];

function parseWriteupRows(rows) {
  const SECTION = ['section', 'section name', 'topic', 'group'];
  const QUESTION = ['question', 'questions', 'text', 'writeup', 'write-up', 'item', 'q'];
  const pick = (row, cands) => {
    for (const k of Object.keys(row)) if (cands.includes(String(k).trim().toLowerCase())) return row[k];
    return '';
  };
  let curSection = 'General';
  const out = [];
  rows.forEach((row) => {
    const rawSection = String(pick(row, SECTION)).trim();
    const text = String(pick(row, QUESTION)).trim();
    if (rawSection) curSection = rawSection;
    if (!text) return;
    out.push({ text, section: curSection || 'General' });
  });
  return out;
}

export default function DocumentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [doc, setDoc] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [writeups, setWriteups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [modal, setModal] = useState(null);
  const { toast, toastError } = useToast();
  const isAdminOrManager = ['admin', 'manager'].includes(String(user?.role || '').toLowerCase());

  const [editChecklist, setEditChecklist] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [d, c, w] = await Promise.all([
        api.getDocument(id),
        api.checklistsForDocument(id),
        api.writeupsForDocument(id),
      ]);
      setDoc(d.document);
      setChecklists(c.checklists);
      setWriteups(w.writeups);
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <LoadingPage />;
  if (!doc) return <Empty>Document not found.</Empty>;

  const download = async () => {
    try {
      await api.downloadDocument({ id: uid(doc), originalName: doc.originalName });
    } catch (e) {
      toastError(e);
    }
  };

  return (
    <>
      <button className="btn link" onClick={() => nav('/materials')} style={{ marginBottom: 12 }}>← Back to materials</button>
      <div className="page-head">
        <h1>{doc.title}</h1>
        <p>{doc.domain?.name} · uploaded by {doc.uploadedBy?.name} ({doc.uploadedBy?.role})</p>
      </div>

      <div className="card pad-lg">
        <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
          <div style={{ fontSize: 30 }}>📄</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{doc.originalName}</div>
            {doc.description && <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>{doc.description}</p>}
          </div>
          <Button variant="ghost" onClick={() => setPreviewDoc(doc)}>View</Button>
        </div>
      </div>

      <div className="section-title" style={{ justifyContent: 'space-between' }}>
        <span>✅ Checklists ({checklists.length})</span>
        <Button variant="cyan" size="sm" onClick={() => setModal('checklist')}>+ Add checklist</Button>
      </div>
      {checklists.length === 0 ? (
        <Empty>No checklist yet. Create one for engineers to work through.</Empty>
      ) : (
        <div className="card" style={{ padding: '6px 20px' }}>
          {checklists.map((c) => (
            <div className="list-row" key={uid(c)}>
              <div style={{ flex: 1 }}>
                <div className="li-title">{c.title}</div>
                <div className="li-sub">{c.items.length} items</div>
              </div>

              {['admin', 'bu'].includes((user?.role || '').toLowerCase()) && (
                <Button variant="danger" size="sm" onClick={async () => { await api.deleteChecklist(uid(c)); toast('Checklist removed'); load(); }}>Remove</Button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="section-title" style={{ justifyContent: 'space-between' }}>
        <span>✍️ Write-ups ({writeups.length})</span>
        <Button variant="cyan" size="sm" onClick={() => setModal('writeup')}>+ Add write-up</Button>
      </div>

      {writeups.length === 0 ? (
        <Empty>No write-up questions yet. Add questions engineers must answer.</Empty>
      ) : (
        <div className="card" style={{ padding: '6px 20px' }}>
          {writeups.map((w) => (
            <div className="list-row" key={uid(w)}>
              <div style={{ flex: 1 }}>
                <div className="li-title">{w.title}</div>
                <div className="li-sub">{w.questions.length} questions</div>
              </div>

              {['admin', 'bu'].includes((user?.role || '').toLowerCase()) && (
                <Button variant="danger" size="sm" onClick={async () => { await api.deleteWriteup(uid(w)); toast('Write-up removed'); load(); }}>Remove</Button>
              )}
            </div>
          ))}
        </div>
      )}

      {modal === 'checklist' && (
        <ChecklistModal domainId={doc.domain?._id || doc.domain} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
      )}
      {modal === 'writeup' && (
        <WriteupModal documentId={uid(doc)} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
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
            {previewDoc.previewUrl || previewDoc.cloudinaryUrl ? (
              <iframe
                src={`${previewDoc.previewUrl || previewDoc.cloudinaryUrl}#toolbar=0`}
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
    </>
  );
}

const blankTopic = () => ({ name: '', items: [{ text: '' }] });
const blankSection = () => ({ name: '', code: '', topics: [blankTopic()] });

const norm = (k) => String(k || '').trim().toLowerCase();
function pickCol(row, candidates) {
  for (const key of Object.keys(row)) {
    if (candidates.includes(norm(key))) return row[key];
  }
  return '';
}
function parseChecklistRows(rows) {
  const SECTION = ['section', 'section name', 'chapter', 'group'];
  const CODE = ['code', 'section code', 'ref', 'abbr'];
  const TOPIC = ['topic', 'scenario', 'sub section', 'subsection', 'sub-section'];
  const ITEM = ['item', 'checklist item', 'checklist', 'text', 'task', 'description', 'question', 'items'];

  const sections = [];
  const secByKey = new Map();
  const topByKey = new Map();

  let curSection = '';
  let curCode = '';
  let curTopic = '';

  rows.forEach((row) => {
    const rawSection = String(pickCol(row, SECTION)).trim();
    const rawCode = String(pickCol(row, CODE)).trim();
    const rawTopic = String(pickCol(row, TOPIC)).trim();
    const text = String(pickCol(row, ITEM)).trim();

    if (rawSection && rawSection !== curSection) {
      curSection = rawSection;
      curCode = '';
      curTopic = '';
    }
    if (rawCode) curCode = rawCode;
    if (rawTopic) curTopic = rawTopic;

    if (!text) return;

    const sName = curSection || 'General';
    const sKey = `${sName}||${curCode}`;
    let sec = secByKey.get(sKey);
    if (!sec) {
      sec = { name: sName, code: curCode, topics: [] };
      secByKey.set(sKey, sec);
      sections.push(sec);
    } else if (!sec.code && curCode) {
      sec.code = curCode;
    }

    const tName = curTopic || 'Single scenario';
    const tKey = `${sKey}##${tName}`;
    let top = topByKey.get(tKey);
    if (!top) {
      top = { name: tName, items: [] };
      topByKey.set(tKey, top);
      sec.topics.push(top);
    }

    top.items.push({ text });
  });

  return sections;
}

function rebuildSectionsFromItems(items = []) {
  const secMap = new Map();
  items.forEach((it) => {
    const sName = it.section || it.category || 'General';
    const key = `${sName}||${it.code || ''}`;
    if (!secMap.has(key)) secMap.set(key, { name: sName, code: it.code || '', topics: new Map() });
    const sec = secMap.get(key);
    const tName = it.topic || 'Single scenario';
    if (!sec.topics.has(tName)) sec.topics.set(tName, []);
    sec.topics.get(tName).push({ text: it.text, _id: it._id });
  });
  const out = Array.from(secMap.values()).map((s) => ({
    name: s.name, code: s.code,
    topics: Array.from(s.topics.entries()).map(([name, its]) => ({ name, items: its })),
  }));
  return out.length ? out : [blankSection()];
}

export function ChecklistModal({ documentId, domainId, existing, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importInfo, setImportInfo] = useState('');
  const { toast, toastError } = useToast();

  const initialSections = existing
    ? rebuildSectionsFromItems(existing.items)
    : [blankSection()];
  const [title, setTitle] = useState(existing?.title || 'Tool & concept checklist');
  const [sections, setSections] = useState(initialSections);

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportInfo('');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      const parsed = parseChecklistRows(rows);
      const count = parsed.reduce(
        (n, s) => n + s.topics.reduce((m, t) => m + t.items.length, 0),
        0
      );

      if (count === 0) {
        toastError('No checklist items found. Expected columns: Section, Code, Topic, Checklist item.');
        return;
      }

      setSections(parsed);
      setImportInfo(`Loaded ${count} item${count === 1 ? '' : 's'} across ${parsed.length} section${parsed.length === 1 ? '' : 's'} — review below and click Create.`);
      toast(`Imported ${count} items from ${file.name}`);
    } catch (err) {
      toastError('Could not read that file. Please upload a valid .xlsx / .xls / .csv.');
    } finally {
      setImporting(false);
    }
  };

  const patchSection = (si, patch) =>
    setSections((a) => a.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  const addSection = () => setSections((a) => [...a, blankSection()]);
  const removeSection = (si) => setSections((a) => a.filter((_, i) => i !== si));

  const patchTopic = (si, ti, patch) =>
    setSections((a) =>
      a.map((s, i) =>
        i !== si ? s : { ...s, topics: s.topics.map((t, j) => (j === ti ? { ...t, ...patch } : t)) }
      )
    );
  const addTopic = (si) =>
    setSections((a) => a.map((s, i) => (i !== si ? s : { ...s, topics: [...s.topics, blankTopic()] })));
  const removeTopic = (si, ti) =>
    setSections((a) =>
      a.map((s, i) => (i !== si ? s : { ...s, topics: s.topics.filter((_, j) => j !== ti) }))
    );

  const setItemText = (si, ti, ii, value) =>
    setSections((a) =>
      a.map((s, i) =>
        i !== si
          ? s
          : {
            ...s,
            topics: s.topics.map((t, j) =>
              j !== ti
                ? t
                : { ...t, items: t.items.map((it, k) => (k === ii ? { ...it, text: value } : it)) }
            ),
          }
      )
    );
  const addItem = (si, ti) =>
    setSections((a) =>
      a.map((s, i) =>
        i !== si
          ? s
          : {
            ...s,
            topics: s.topics.map((t, j) => (j !== ti ? t : { ...t, items: [...t.items, { text: '' }] })),
          }
      )
    );
  const removeItem = (si, ti, ii) =>
    setSections((a) =>
      a.map((s, i) =>
        i !== si
          ? s
          : {
            ...s,
            topics: s.topics.map((t, j) =>
              j !== ti ? t : { ...t, items: t.items.filter((_, k) => k !== ii) }
            ),
          }
      )
    );

  const submit = async () => {
    const clean = [];
    let order = 0;
    sections.forEach((sec) => {
      sec.topics.forEach((tp) => {
        tp.items.forEach((it) => {
          if (it.text.trim()) {
            clean.push({
              _id: it._id,
              text: it.text.trim(),
              section: sec.name.trim(),
              code: sec.code.trim(),
              topic: tp.name.trim(),
              category: 'tool',
              order: order++,
            });
          }
        });
      });
    });

    if (!title.trim() || clean.length === 0) {
      toastError('Add a title and at least one item');
      return;
    }
    setBusy(true);
    try {
      if (existing) {
        await api.updateChecklist(existing._id, title.trim(), clean);
      } else {
        await api.createChecklist(title.trim(), domainId || undefined, clean);
      }
      toast('Checklist created');
      onDone();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="New checklist"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="cyan" onClick={submit} disabled={busy}>{busy ? <Spinner sm /> : 'Create'}</Button>
        </>
      }
    >
      <div className="field">
        <label>Checklist title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div
        style={{
          border: '1px dashed #08a6c7',
          background: '#f2fbfd',
          borderRadius: 10,
          padding: 12,
          margin: '10px 0',
        }}
      >
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#102a56', marginBottom: 4 }}>
          ⬆ Import from Excel (optional)
        </div>
        <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
          Upload a sheet with columns <strong>Section</strong>, <strong>Code</strong>,{' '}
          <strong>Topic</strong>, <strong>Checklist item</strong> — one item per row. It will fill
          the builder below.
        </div>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onImportFile}
          disabled={importing}
          style={{ fontSize: 12 }}
        />
        {importing && <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>Reading file…</div>}
        {importInfo && (
          <div style={{ fontSize: 11.5, marginTop: 6, color: '#0284a8', fontWeight: 600 }}>
            {importInfo}
          </div>
        )}
      </div>

      {sections.map((sec, si) => (
        <div
          key={si}
          className="card"
          style={{ padding: 14, margin: '10px 0', border: '1px solid #cbd5e1' }}
        >
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--cyan)' }}>
              SECTION {si + 1}
            </span>
            {sections.length > 1 && (
              <button className="icon-btn" onClick={() => removeSection(si)} title="Remove section">🗑️</button>
            )}
          </div>

          <div className="row gap-8">
            <input
              className="input"
              style={{ flex: 2 }}
              value={sec.name}
              onChange={(e) => patchSection(si, { name: e.target.value })}
              placeholder="Section name (e.g. Tool Understanding)"
            />
            <input
              className="input"
              style={{ flex: 1 }}
              value={sec.code}
              onChange={(e) => patchSection(si, { code: e.target.value })}
              placeholder="Code (e.g. PTTUT)"
            />
          </div>

          {sec.topics.map((tp, ti) => (
            <div
              key={ti}
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', color: '#0aa7c5' }}>
                  TOPIC {ti + 1}
                </span>
                {sec.topics.length > 1 && (
                  <button className="icon-btn" onClick={() => removeTopic(si, ti)} title="Remove topic">🗑️</button>
                )}
              </div>

              <input
                className="input"
                style={{ height: 38 }}
                value={tp.name}
                onChange={(e) => patchTopic(si, ti, { name: e.target.value })}
                placeholder="Topic name (e.g. Single Scenario)"
              />

              <div style={{ marginTop: 8 }}>
                {tp.items.map((it, ii) => (
                  <div key={ii} className="row gap-8" style={{ marginTop: 6, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>{ii + 1}.</span>
                    <textarea
                      className="textarea"
                      style={{ minHeight: 40, flex: 1 }}
                      value={it.text}
                      onChange={(e) => setItemText(si, ti, ii, e.target.value)}
                      placeholder="Checklist item text"
                    />
                    {tp.items.length > 1 && (
                      <button
                        className="icon-btn"
                        style={{ marginTop: 6 }}
                        onClick={() => removeItem(si, ti, ii)}
                        title="Remove item"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => addItem(si, ti)} style={{ marginTop: 8 }}>
                  + Add item
                </Button>
              </div>
            </div>
          ))}

          <Button variant="ghost" size="sm" onClick={() => addTopic(si)} style={{ marginTop: 10 }}>
            + Add topic
          </Button>
        </div>
      ))}

      <Button variant="ghost" block onClick={addSection} style={{ marginTop: 4 }}>
        + Add section
      </Button>
    </Modal>
  );
}
function rebuildWriteupFromQuestions(qs = []) {
  const secs = new Map();
  qs.forEach((q) => {
    const s = q.section || 'General';
    if (!secs.has(s)) secs.set(s, []);
    secs.get(s).push({ text: q.text || '' });
  });
  const out = Array.from(secs.entries()).map(([name, items]) => ({ name, questions: items }));
  return out.length ? out : [blankSection()];
}

export function WriteupModal({ documentId, domainId, existing, onClose, onDone }) {
  const [title, setTitle] = useState(existing?.title || 'Write-up questions');
  const [qs, setQs] = useState(
    existing?.questions?.length
      ? existing.questions.map((q) => ({ text: q.text || '', section: q.section || 'General', _id: q._id }))
      : [{ text: '', section: 'General' }]
  );
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importInfo, setImportInfo] = useState('');
  const { toast, toastError } = useToast();

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true); setImportInfo('');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const parsed = parseWriteupRows(rows);
      if (parsed.length === 0) { toastError('No questions found. Columns: Section, Question.'); return; }
      setQs(parsed);
      setImportInfo(`Loaded ${parsed.length} question(s) — review and click ${existing ? 'Save' : 'Create'}.`);
      toast(`Imported ${parsed.length} questions`);
    } catch (err) {
      toastError('Could not read that file. Upload a valid .xlsx / .xls / .csv.');
    } finally { setImporting(false); }
  };

  const update = (i, k, v) => setQs((arr) => arr.map((q, idx) => (idx === i ? { ...q, [k]: v } : q)));
  const add = () => setQs((a) => [...a, { text: '', section: 'General' }]);
  const remove = (i) => setQs((a) => a.filter((_, idx) => idx !== i));

  const submit = async () => {
    const clean = qs
      .filter((q) => q.text.trim())
      .map((q) => ({ _id: q._id, text: q.text.trim(), section: (q.section || '').trim() || 'General' }))
    if (!title.trim() || clean.length === 0) { toastError('Add a title and at least one question'); return; }
    setBusy(true);
    try {
      if (existing) await api.updateWriteup(existing._id, title.trim(), clean);
      else await api.createWriteup(title.trim(), domainId, clean);
      toast(existing ? 'Write-up updated' : 'Write-up created');
      onDone();
    } catch (e) { toastError(e); } finally { setBusy(false); }
  };

  return (
    <Modal
      title={existing ? 'Edit write-up' : 'New write-up'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="cyan" onClick={submit} disabled={busy}>{busy ? <Spinner sm /> : (existing ? 'Save' : 'Create')}</Button>
        </>
      }
    >
      <div className="field">
        <label>Write-up title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div style={{ border: '1px dashed #08a6c7', background: '#f2fbfd', borderRadius: 10, padding: 12, margin: '10px 0' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#102a56', marginBottom: 4 }}>⬆ Import from Excel (optional)</div>
        <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
          Columns: <strong>Section</strong>, <strong>Question</strong> — one question per row. Blank Section repeats the one above.
        </div>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={onImportFile} disabled={importing} style={{ fontSize: 12 }} />
        {importing && <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>Reading file…</div>}
        {importInfo && <div style={{ fontSize: 11.5, marginTop: 6, color: '#0284a8', fontWeight: 600 }}>{importInfo}</div>}
      </div>

      <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Questions</label>
      {qs.map((q, i) => (
        <div key={i} className="card" style={{ padding: 12, margin: '8px 0' }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--cyan)' }}>Question {i + 1}</span>
            {qs.length > 1 && <button className="icon-btn" onClick={() => remove(i)} title="Remove">🗑️</button>}
          </div>
          <textarea className="textarea" style={{ minHeight: 50 }} value={q.text} onChange={(e) => update(i, 'text', e.target.value)} placeholder="Question text" />
          <div className="field" style={{ marginTop: 8, marginBottom: 0 }}>
            <input className="input" style={{ height: 38 }} value={q.section} onChange={(e) => update(i, 'section', e.target.value)} placeholder="Section (e.g. Tool understanding)" />
          </div>
        </div>
      ))}
      <Button variant="ghost" block onClick={add} style={{ marginTop: 4 }}>+ Add question</Button>
    </Modal>
  );
}
