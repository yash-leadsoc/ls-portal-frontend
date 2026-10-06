import { useEffect, useMemo, useState } from 'react';
import { api, uid } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Button, Badge, Modal, LoadingPage, Empty, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';

const KIND_LABEL = { question_bank: 'Question bank', study_material: 'Study material', other: 'Other' };
const MOCK_STATUS = { scheduled: 'info', completed: 'success', cancelled: 'neutral' };
const CLIENT_STATUS = ['sent', 'in_progress', 'selected', 'rejected', 'on_hold'];
const CLIENT_KIND = { sent: 'info', in_progress: 'warning', selected: 'success', rejected: 'danger', on_hold: 'neutral' };
const th = { padding: '10px 12px', fontSize: 11.5, fontWeight: 700, color: '#475569', textAlign: 'left', whiteSpace: 'nowrap' };
const td = { padding: '10px 12px', fontSize: 12.5, verticalAlign: 'top', borderTop: '1px solid #eef2f7' };

export default function InterviewsPage() {
  const { user } = useAuth();
  const role = user.role;
  const isSubAdmin = user.isSubAdmin;
  const isStaff = ['admin', 'cto', 'bu', 'manager'].includes(role);
  const isEmployee = role === 'employee';

  const tabs = ['prep', 'mock', 'client', 'availability'];
  if (role === 'admin') tabs.push('companies');
  const tabLabel = { prep: 'Interview prep', mock: 'Mock interviews', client: 'Client interviews', availability: 'Availability', companies: 'Companies' };
  const [tab, setTab] = useState('prep');
  const [historyFor, setHistoryFor] = useState(null);

  return (
    <>
      <div className="page-head">
        <h1>Interviews</h1>
        <p>Preparation material, mock interviews, client submissions and availability.</p>
      </div>

      <div className="tabs">
        {tabs.map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {tabLabel[t]}
          </button>
        ))}
      </div>

      {tab === 'prep' && <InterviewPrep role={role} />}
      {tab === 'mock' && (
        <MockTab
          isStaff={isStaff}
          canManage={['admin', 'bu', 'manager'].includes(role) || (role === 'cto' && (user.permissions || []).includes('interviews_manage'))}
          isEmployee={isEmployee}
          user={user}
        />
      )}
      {tab === 'client' && <ClientTab role={role} />}
      {tab === 'availability' && <AvailabilityTab isEmployee={isEmployee} />}
      {tab === 'companies' && role === 'admin' && <CompaniesTab />}
    </>
  );
}

const removeCompany = async (id) => {
  if (!window.confirm('Remove this company?')) return;
  try { await api.deleteCompany(id); load(); toast('Company removed'); }
  catch (e) { toastError(e); }
};


const imTh = { padding: '11px 14px', fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', textAlign: 'left' };
const imTd = { padding: '10px 14px', fontSize: 13, verticalAlign: 'middle' };
const fileExt = (url = '') => {
  const clean = String(url).split('?')[0];
  const e = clean.includes('.') ? clean.split('.').pop().toUpperCase() : '';
  return e && e.length <= 5 ? e : 'FILE';
};

function InterviewPrep({ role }) {
  const { toast, toastError } = useToast();
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catFilter, setCatFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showCompany, setShowCompany] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, m, cats] = await Promise.all([
        api.listCompanies(),
        api.listInterviewMaterials(companyFilter || undefined, catFilter || undefined),
        api.listCategories().catch(() => ({ categories: [] })),
      ]);
      setCompanies(c.companies || []);
      setMaterials(m.materials || []);
      setCategories(cats.categories || []);
    } catch (e) { toastError(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [catFilter, companyFilter]);

  return (
    <>
      <div className="row gap-8" style={{ flexWrap: 'wrap', alignItems: 'center', margin: '4px 0 14px' }}>
        <select className="select" style={{ maxWidth: 200 }} value={catFilter} onChange={(e) => { setCompanyFilter(''); setCatFilter(e.target.value); }}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select className="select" style={{ maxWidth: 220 }} value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
          <option value="">All companies</option>
          {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        {role === 'admin' && <Button variant="ghost" size="sm" onClick={() => setShowCompany(true)}>+ Company</Button>}
        {(role === 'admin' || role === 'bu') && (
          <Button variant="cyan" size="sm" onClick={() => setShowUpload(true)}>+ Add material</Button>
        )}
      </div>

      {loading ? <LoadingPage /> : materials.length === 0 ? (
        <Empty>No interview material yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={imTh}>#</th>
                <th style={imTh}>Material</th>
                <th style={imTh}>Company</th>
                <th style={imTh}>Type</th>
                <th style={imTh}>Role</th>
                <th style={imTh}>Uploaded by</th>
                <th style={imTh}>Uploaded on</th>
                <th style={{ ...imTh, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m, i) => (
                <tr
                  key={m._id}
                  style={{ borderTop: '1px solid #eef2f7', cursor: m.fileUrl ? 'pointer' : 'default' }}
                  onClick={() => m.fileUrl && window.open(m.fileUrl, '_blank', 'noopener')}
                >
                  <td style={{ ...imTd, color: 'var(--muted)', width: 40 }}>{i + 1}</td>
                  <td style={{ ...imTd, minWidth: 220 }}>
                    <div className="row gap-8" style={{ alignItems: 'center' }}>
                      <Badge kind="neutral">{fileExt(m.fileUrl)}</Badge>
                      <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{m.title}</span>
                    </div>
                  </td>
                  <td style={{ ...imTd, color: '#334155' }}>{m.companyName || '—'}</td>
                  <td style={imTd}><Badge kind="info">{KIND_LABEL[m.kind] || m.kind || '—'}</Badge></td>
                  <td style={{ ...imTd, color: '#334155' }}>{m.forRole || '—'}</td>
                  <td style={{ ...imTd, color: '#334155' }}>
                    {m.uploaderName || '—'}
                    <div className="muted" style={{ fontSize: 11 }}>{m.uploaderEmployeeCode || m.uploaderRole}</div>
                  </td>
                  <td style={{ ...imTd, color: '#334155', whiteSpace: 'nowrap' }}>
                    {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ ...imTd, textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    {m.fileUrl ? (
                      <a className="btn ghost sm" href={m.fileUrl} target="_blank" rel="noreferrer">Open file</a>
                    ) : (
                      <span className="muted">No file</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && (
        <UploadMaterialModal companies={companies} onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load(); toast('Material added'); }} />
      )}
      {showCompany && (
        <AddCompanyModal categories={categories} onClose={() => setShowCompany(false)} onDone={() => { setShowCompany(false); load(); toast('Company added'); }} />
      )}
    </>
  );
}

function CompaniesTab() {
  const { toast, toastError } = useToast();
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, cats] = await Promise.all([api.listCompanies(), api.listCategories().catch(() => ({ categories: [] }))]);
      setCompanies(c.companies || []);
      setCategories(cats.categories || []);
    } catch (e) { toastError(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm('Remove this company?')) return;
    try { await api.deleteCompany(id); toast('Company removed'); load(); }
    catch (e) { toastError(e); }
  };

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="muted" style={{ fontSize: 12.5 }}>Companies you’ve added ({companies.length})</div>
        <Button variant="cyan" size="sm" onClick={() => setShow(true)}>+ Add company</Button>
      </div>

      {loading ? <LoadingPage /> : companies.length === 0 ? (
        <Empty>No companies yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={th}>Company</th>
                <th style={th}>Category</th>
                <th style={{ ...th, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c._id} style={{ borderTop: '1px solid #eef2f7' }}>
                  <td style={{ ...td, fontWeight: 700, color: 'var(--navy)' }}>{c.name}</td>
                  <td style={{ ...td, color: 'var(--muted)' }}>{c.categoryName || '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <Button variant="danger" size="sm" onClick={() => remove(c._id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {show && (
        <AddCompanyModal categories={categories} onClose={() => setShow(false)} onDone={() => { setShow(false); load(); toast('Company added'); }} />
      )}
    </>
  );
}

function AddCompanyModal({ categories, onClose, onDone }) {
  const [name, setName] = useState(''); const [categoryId, setCategoryId] = useState(''); const [busy, setBusy] = useState(false);
  const { toastError } = useToast();
  const submit = async () => {
    if (!name.trim()) { toastError('Company name required'); return; }
    setBusy(true);
    try { await api.createCompany(name.trim(), categoryId || undefined); onDone(); }
    catch (e) { toastError(e); } finally { setBusy(false); }
  };
  return (
    <Modal title="Add company" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="cyan" onClick={submit} disabled={busy}>{busy ? <Spinner sm /> : 'Add'}</Button></>}>
      <div className="field"><label>Company name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Samsung" /></div>
      <div className="field"><label>Category (optional)</label>
        <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">— None —</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>
    </Modal>
  );
}

function UploadMaterialModal({ companies, onClose, onDone }) {
  const [companyId, setCompanyId] = useState(companies[0]?._id || '');
  const [title, setTitle] = useState(''); const [kind, setKind] = useState('question_bank');
  const [forRole, setForRole] = useState(''); const [file, setFile] = useState(null); const [busy, setBusy] = useState(false);
  const { toastError } = useToast();
  const submit = async () => {
    if (!companyId) { toastError('Pick a company'); return; }
    if (!title.trim()) { toastError('Title required'); return; }
    if (!file) { toastError('Choose a file'); return; }
    setBusy(true);
    try { await api.uploadInterviewMaterial({ companyId, title: title.trim(), kind, forRole, file }); onDone(); }
    catch (e) { toastError(e); } finally { setBusy(false); }
  };
  return (
    <Modal title="Add interview material" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="cyan" onClick={submit} disabled={busy}>{busy ? <Spinner sm /> : 'Upload'}</Button></>}>
      <div className="field"><label>Company</label>
        <select className="select" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          {companies.length === 0 ? <option value="">No companies — admin must add one</option>
            : companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>
      <div className="field"><label>Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. DSA question bank" /></div>
      <div className="field"><label>What is this?</label>
        <select className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="question_bank">Question bank</option>
          <option value="study_material">Study material</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="field"><label>For which role</label><input className="input" value={forRole} onChange={(e) => setForRole(e.target.value)} placeholder="e.g. VLSI PD Engineer" /></div>
      <div className="field"><label>File (PDF / DOC)</label>
        <input className="input" type="file" style={{ paddingTop: 10 }} accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>
    </Modal>
  );
}

function MockTab({ isStaff, canManage, isEmployee, user }) {
  const { toast, toastError } = useToast();
  const [mocks, setMocks] = useState([]); const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false); const [scoreFor, setScoreFor] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const r = await api.listMocks(); setMocks(r.mocks || []); }
    catch (e) { toastError(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <>
      {canManage && (
        <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 12 }}>
          <Button variant="cyan" size="sm" onClick={() => setShow(true)}>+ Schedule mock</Button>
        </div>
      )}
      {loading ? <LoadingPage /> : mocks.length === 0 ? <Empty>No mock interviews yet.</Empty> : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              <th style={th}>Engineer</th><th style={th}>Role</th><th style={th}>When</th>
              <th style={th}>Meet</th><th style={th}>Status</th><th style={th}>Score</th>
              {canManage && <th style={{ ...th, textAlign: 'right' }}>Action</th>}
            </tr></thead>
            <tbody>
              {mocks.map((m) => (
                <tr key={m._id}>
                  <td style={td}><b>{m.employee?.name}</b> <span className="muted">{m.employee?.employeeCode}</span></td>
                  <td style={td}>{m.forRole || '—'}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{new Date(m.scheduledAt).toLocaleString()}</td>
                  <td style={td}>{m.meetLink ? <a href={m.meetLink} target="_blank" rel="noreferrer">Join</a> : '—'}</td>
                  <td style={td}><Badge kind={MOCK_STATUS[m.status]}>{m.status}</Badge></td>
                  <td style={td}>{m.score != null ? `${m.score}/10` : '—'}</td>
                                   {canManage && <td style={{ ...td, textAlign: 'right' }}><Button variant="ghost" size="sm" onClick={() => setScoreFor(m)}>Score</Button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {show && <ScheduleMockModal onClose={() => setShow(false)} onDone={(msg) => { setShow(false); load(); toast(msg || 'Scheduled'); }} />}
      {scoreFor && <ScoreMockModal mock={scoreFor} onClose={() => setScoreFor(null)} onDone={() => { setScoreFor(null); load(); toast('Saved'); }} />}
    </>
  );
}

function ScheduleMockModal({ onClose, onDone }) {
  const { toastError } = useToast();
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState(''); const [forRole, setForRole] = useState('');
  const [scheduledAt, setScheduledAt] = useState(''); const [durationMins, setDurationMins] = useState(45);
  const [meetLink, setMeetLink] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { api.listUsers('employee').then((r) => setEmployees(r.users || [])).catch(() => { }); }, []);
  const submit = async () => {
    if (!employeeId || !scheduledAt) { toastError('Engineer and time required'); return; }
    setBusy(true);
    try {
      const r = await api.scheduleMock({ employeeId, forRole, scheduledAt, durationMins: Number(durationMins), meetLink: meetLink || undefined });
      onDone(r.meetConfigured ? 'Scheduled (Google Meet created)' : 'Scheduled');
    } catch (e) { toastError(e); } finally { setBusy(false); }
  };
  return (
    <Modal title="Schedule mock interview" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="cyan" onClick={submit} disabled={busy}>{busy ? <Spinner sm /> : 'Schedule'}</Button></>}>
      <div className="field"><label>Engineer</label>
        <select className="select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">— Select —</option>
          {employees.map((u) => <option key={uid(u)} value={uid(u)}>{u.name} ({u.employeeCode})</option>)}
        </select>
      </div>
      <div className="field"><label>For role</label><input className="input" value={forRole} onChange={(e) => setForRole(e.target.value)} /></div>
      <div className="field"><label>Date &amp; time</label><input className="input" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></div>
      <div className="field"><label>Duration (mins)</label><input className="input" type="number" value={durationMins} onChange={(e) => setDurationMins(e.target.value)} /></div>
      <div className="field"><label>Meet link (optional — auto-created if Google is configured)</label><input className="input" value={meetLink} onChange={(e) => setMeetLink(e.target.value)} placeholder="https://meet.google.com/..." /></div>
    </Modal>
  );
}

function ScoreMockModal({ mock, onClose, onDone }) {
  const { toastError } = useToast();
  const [score, setScore] = useState(mock.score ?? ''); const [review, setReview] = useState(mock.review || '');
  const [status, setStatus] = useState(mock.status === 'scheduled' ? 'completed' : mock.status); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { await api.scoreMock(mock._id, score === '' ? null : Number(score), review, status); onDone(); }
    catch (e) { toastError(e); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Score — ${mock.employee?.name}`} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="cyan" onClick={submit} disabled={busy}>{busy ? <Spinner sm /> : 'Save'}</Button></>}>
      <div className="field"><label>Score (0–10)</label><input className="input" type="number" min="0" max="10" value={score} onChange={(e) => setScore(e.target.value)} /></div>
      <div className="field"><label>Status</label>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="completed">Completed</option><option value="scheduled">Scheduled</option><option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="field"><label>Review</label><textarea className="textarea" value={review} onChange={(e) => setReview(e.target.value)} placeholder="Feedback…" /></div>
    </Modal>
  );
}

function ClientTab({ role }) {
  const canWrite = ['admin', 'bu'].includes(role);
  const { toast, toastError } = useToast();
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false); const [editItem, setEditItem] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const load = async () => {
    setLoading(true);
    try { const r = await api.listClientInterviews(); setItems(r.clients || []); }
    catch (e) { toastError(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <>
      {canWrite && <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 12 }}><Button variant="cyan" size="sm" onClick={() => setShow(true)}>+ Add submission</Button></div>}
      {loading ? <LoadingPage /> : items.length === 0 ? <Empty>No client submissions yet.</Empty> : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              <th style={th}>Engineer</th><th style={th}>Client</th><th style={th}>Role</th><th style={th}>Sent</th>
              <th style={th}>Status</th><th style={th}>Performance</th>{canWrite && <th style={{ ...th, textAlign: 'right' }}>Update</th>}
            </tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c._id}>
                  <td style={td}>
                    <button
                      className="btn link"
                      style={{ padding: 0, fontWeight: 700, color: '#0284a8' }}
                      onClick={() => setHistoryFor(c.employee)}
                    >
                      {c.employee?.name}
                    </button>{' '}
                    <span className="muted">{c.employee?.employeeCode}</span>
                  </td>
                  <td style={td}>{c.client}</td>
                  <td style={td}>{c.role || '—'}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{new Date(c.sentAt).toLocaleDateString()}</td>
                  <td style={td}><Badge kind={CLIENT_KIND[c.status]}>{c.status}</Badge></td>
                  <td style={{ ...td, maxWidth: 220 }}>{c.performance || '—'}</td>
                  {canWrite && <td style={{ ...td, textAlign: 'right' }}><Button variant="ghost" size="sm" onClick={() => setEditItem(c)}>Update</Button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {show && <AddClientModal onClose={() => setShow(false)} onDone={() => { setShow(false); load(); toast('Added'); }} />}
      {editItem && <UpdateClientModal item={editItem} onClose={() => setEditItem(null)} onDone={() => { setEditItem(null); load(); toast('Updated'); }} />}
      {historyFor && (
        <EmployeeHistoryModal employee={historyFor} onClose={() => setHistoryFor(null)} />
      )}
    </>
  );
}

const HIST_ICON = { mock: '🎤', client: '🏢', status: '🔄', availability: '📅' };
function EmployeeHistoryModal({ employee, onClose }) {
  const { toastError } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.employeeInterviewHistory(uid(employee) || employee._id)
      .then((r) => setRows((r.history || []).filter((h) => h.type !== 'availability')))
      .catch((e) => { toastError(e); setRows([]); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Modal
      title={`Interview history — ${employee?.name || ''}`}
      onClose={onClose}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      {loading ? (
        <div className="muted" style={{ fontSize: 12 }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="muted" style={{ fontSize: 12 }}>No interview activity yet.</div>
      ) : (
        <div>
          {rows.map((h) => (
            <div key={h._id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #eef2f7' }}>
              <div style={{ fontSize: 16 }}>{HIST_ICON[h.type] || '•'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#102a56' }}>{h.title}</div>
                {h.detail ? <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{h.detail}</div> : null}
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                  {new Date(h.at).toLocaleString()} {h.byName ? `· by ${h.byName}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function AddClientModal({ onClose, onDone }) {
  const { toastError } = useToast();
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState(''); const [client, setClient] = useState(''); const [roleV, setRoleV] = useState('');
  const [sentAt, setSentAt] = useState(''); const [status, setStatus] = useState('sent'); const [performance, setPerformance] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.listUsers('employee').then((r) => setEmployees(r.users || [])).catch(() => { }); }, []);
  const submit = async () => {
    if (!employeeId || !client.trim()) { toastError('Engineer and client required'); return; }
    setBusy(true);
    try { await api.createClientInterview({ employeeId, client: client.trim(), role: roleV, sentAt: sentAt || undefined, status, performance }); onDone(); }
    catch (e) { toastError(e); } finally { setBusy(false); }
  };
  return (
    <Modal title="Add client submission" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="cyan" onClick={submit} disabled={busy}>{busy ? <Spinner sm /> : 'Add'}</Button></>}>
      <div className="field"><label>Engineer</label>
        <select className="select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">— Select —</option>
          {employees.map((u) => <option key={uid(u)} value={uid(u)}>{u.name} ({u.employeeCode})</option>)}
        </select>
      </div>
      <div className="field"><label>Client</label><input className="input" value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Qualcomm" /></div>
      <div className="field"><label>Role</label><input className="input" value={roleV} onChange={(e) => setRoleV(e.target.value)} /></div>
      <div className="field"><label>Sent date</label><input className="input" type="date" value={sentAt} onChange={(e) => setSentAt(e.target.value)} /></div>
      <div className="field"><label>Status</label>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>{CLIENT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      </div>
      <div className="field"><label>Performance (optional)</label><textarea className="textarea" value={performance} onChange={(e) => setPerformance(e.target.value)} /></div>
    </Modal>
  );
}

function UpdateClientModal({ item, onClose, onDone }) {
  const { toastError } = useToast();
  const [status, setStatus] = useState(item.status); const [performance, setPerformance] = useState(item.performance || '');
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { await api.updateClientInterview(item._id, { status, performance, note }); onDone(); }
    catch (e) { toastError(e); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Update — ${item.client}`} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="cyan" onClick={submit} disabled={busy}>{busy ? <Spinner sm /> : 'Save'}</Button></>}>
      <div className="field"><label>Status</label>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>{CLIENT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      </div>
      <div className="field"><label>Performance</label><textarea className="textarea" value={performance} onChange={(e) => setPerformance(e.target.value)} /></div>
      <div className="field"><label>Add update note (timeline)</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Cleared round 1" /></div>
      {(item.updates || []).length > 0 && (
        <div style={{ marginTop: 6, borderTop: '1px solid #eef2f7', paddingTop: 8 }}>
          <div className="muted" style={{ fontSize: 11.5, marginBottom: 6 }}>History</div>
          {item.updates.slice().reverse().map((u, i) => (
            <div key={i} style={{ fontSize: 11.5, color: '#475569', marginBottom: 4 }}>
              <b>{new Date(u.at).toLocaleDateString()}</b> — {u.note} <span className="muted">({u.byName})</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function AvailabilityTab({ isEmployee }) {
  const { toast, toastError } = useToast();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [slots, setSlots] = useState([]); const [loading, setLoading] = useState(true);
  const [dayModal, setDayModal] = useState(null);
  const [lsid, setLsid] = useState('');
  const [empId, setEmpId] = useState('');
  const [empName, setEmpName] = useState('');

  const monthStr = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`;

  const load = async () => {
    setLoading(true);
    try {
      const params = { month: monthStr };
      if (empId) params.employee = empId;
      const r = await api.listAvailability(params);
      setSlots(r.availability || []);
    } catch (e) { toastError(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [monthStr, empId]);

  const search = async () => {
    const code = lsid.trim();
    if (!code) { setEmpId(''); setEmpName(''); return; }
    try {
      const r = await api.listUsers('employee');
      const match = (r.users || []).find(
        (u) => String(u.employeeCode || '').toLowerCase() === code.toLowerCase()
      );
      if (!match) { toastError('No engineer with that LSID'); return; }
      setEmpId(uid(match));
      setEmpName(match.name);
    } catch (e) { toastError(e); }
  };

  const byDate = useMemo(() => {
    const m = {}; slots.forEach((s) => { (m[s.date] = m[s.date] || []).push(s); }); return m;
  }, [slots]);

  const first = new Date(cursor.y, cursor.m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const monthName = first.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const prev = () => setCursor((c) => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 });
  const next = () => setCursor((c) => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 });
  const dateStr = (d) => `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return (
    <>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div className="row gap-8">
          <Button variant="ghost" size="sm" onClick={prev}>←</Button>
          <b>{monthName}</b>
          <Button variant="ghost" size="sm" onClick={next}>→</Button>
        </div>

        {!isEmployee && (
          <div className="row gap-8" style={{ alignItems: 'center' }}>
            <input
              className="input"
              style={{ height: 34, maxWidth: 180 }}
              value={lsid}
              onChange={(e) => setLsid(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Search by LSID…"
            />
            <Button variant="cyan" size="sm" onClick={search}>Search</Button>
            {empId && (
              <>
                <Badge kind="info">{empName}</Badge>
                <button className="btn link" onClick={() => { setLsid(''); setEmpId(''); setEmpName(''); }}>Clear</button>
              </>
            )}
          </div>
        )}

        {isEmployee && <span className="muted" style={{ fontSize: 12 }}>Click a day to mark availability</span>}
      </div>
      {loading ? <LoadingPage /> : (
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', padding: 4 }}>{d}</div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const ds = dateStr(d); const list = byDate[ds] || [];
              return (
                <div key={ds}
                  onClick={() => isEmployee && setDayModal(ds)}
                  style={{
                    minHeight: 74, border: '1px solid #e2e8f0', borderRadius: 8, padding: 6,
                    cursor: isEmployee ? 'pointer' : 'default', background: list.length ? '#eefbfe' : '#fff',
                  }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{d}</div>
                  {list.map((s) => (
                    <div key={s._id} style={{ fontSize: 10, color: '#0284a8', marginTop: 3 }}>
                      {s.fromTime ? `${s.fromTime}-${s.toTime}` : 'Available'}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dayModal && (
        <DayAvailabilityModal date={dayModal} slots={byDate[dayModal] || []} onClose={() => setDayModal(null)}
          onChanged={() => { load(); }} />
      )}
    </>
  );
}

function DayAvailabilityModal({ date, slots, onClose, onChanged }) {
  const { toast, toastError } = useToast();
  const [fromTime, setFromTime] = useState('10:00'); const [toTime, setToTime] = useState('13:00');
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const add = async () => {
    setBusy(true);
    try { await api.addAvailability({ date, fromTime, toTime, note }); toast('Added'); onChanged(); }
    catch (e) { toastError(e); } finally { setBusy(false); }
  };
  const remove = async (id) => { try { await api.deleteAvailability(id); onChanged(); } catch (e) { toastError(e); } };
  return (
    <Modal title={`Availability — ${date}`} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="cyan" onClick={add} disabled={busy}>{busy ? <Spinner sm /> : 'Add slot'}</Button></>}>
      <div className="row gap-8">
        <div className="field" style={{ flex: 1 }}><label>From</label><input className="input" type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} /></div>
        <div className="field" style={{ flex: 1 }}><label>To</label><input className="input" type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} /></div>
      </div>
      <div className="field"><label>Note (optional)</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      {slots.length > 0 && (
        <div style={{ marginTop: 6, borderTop: '1px solid #eef2f7', paddingTop: 8 }}>
          <div className="muted" style={{ fontSize: 11.5, marginBottom: 6 }}>Marked slots</div>
          {slots.map((s) => (
            <div key={s._id} className="row" style={{ justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span>{s.fromTime ? `${s.fromTime}–${s.toTime}` : 'Available'} {s.note ? `· ${s.note}` : ''}</span>
              <button className="btn link" onClick={() => remove(s._id)} style={{ color: '#ef4444' }}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
