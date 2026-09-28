import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { api, uid } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Button, Badge, Modal, LoadingPage, Empty, Spinner, initials } from '../../components/ui';
import { useToast } from '../../components/Toast';
import BulkEmployeeUpload from '../../components/BulkEmployeeUpload';
const thStyle = { padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' };
const tdStyle = { padding: '12px 14px', fontSize: 13, verticalAlign: 'middle' };
const STATUS_LABEL = { on_training: 'On training', ongoing_interview: 'Ongoing interview', deployed: 'Deployed' };
const STATUS_KIND = { on_training: 'info', ongoing_interview: 'warning', deployed: 'success' };

export default function PeoplePage() {
  const { user } = useAuth();
  const role = user.role;
  const isAdminLike = role === 'admin' || role === 'cto';
  const isBU = role === 'bu';
  const canWrite = role !== 'cto';

  const tabs = role === 'admin' ? ['bus', 'employees', 'ctos'] : role === 'cto' ? ['bus', 'employees'] : isBU ? ['managers', 'employees'] : ['employees'];
  const [tab, setTab] = useState(tabs[0]);

  const [bus, setBus] = useState([]);
  const [ctos, setCtos] = useState([]);
  const [managers, setManagers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [showBulk, setShowBulk] = useState(false);
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [buFilter, setBuFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  const { toastError } = useToast();
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      if (isAdminLike) {
        const calls = [api.listBUs(), api.listUsers('employee')];
        if (role === 'admin') calls.push(api.listCTOs());
        const [b, e, c] = await Promise.all(calls);
        setBus(b.bus || []);
        setEmployees(e.users || []);
        if (c) setCtos(c.ctos || []);
      } else if (isBU) {
        const [m, e] = await Promise.all([api.listUsers('manager'), api.listUsers('employee')]);
        setManagers(m.users || []);
        setEmployees(e.users || []);
      } else {
        const e = await api.listUsers();
        setEmployees(e.users || []);
      }
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const list = tab === 'bus' ? bus : tab === 'ctos' ? ctos : tab === 'managers' ? managers : employees;

  const tabLabel = (t) => (t === 'bus' ? 'BUs' : t === 'ctos' ? 'CTOs' : t === 'managers' ? 'Trainers' : 'Engineers');
  const addLabel = tab === 'bus' ? 'BU' : tab === 'ctos' ? 'CTO' : tab === 'managers' ? 'trainer' : 'engineer';
  const addModal = tab === 'bus' ? 'bu' : tab === 'ctos' ? 'cto' : tab === 'managers' ? 'manager' : 'employee';

  const showAdd = canWrite && role === 'admin' ? tab !== 'employees' : (canWrite && !(isAdminLike && tab === 'employees'));

  const STATUS_LBL = { on_training: 'On training', ongoing_interview: 'Ongoing interview', deployed: 'Deployed' };
  const ageBucket = (d) => (d == null ? '' : d <= 30 ? '0-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : '90+');
  const engMatch = (u) =>
    (!catFilter || u.categoryName === catFilter) &&
    (!statusFilter || u.jobStatus === statusFilter) &&
    (!buFilter || u.buName === buFilter) &&
    (!ageFilter || ageBucket(u.benchDays) === ageFilter);

  const exportExcel = async () => {
    try {
      const res = await api.exportEngineers();
      let rows = res.rows || [];
      rows = rows.filter((r) =>
        (!catFilter || r.category === catFilter) &&
        (!statusFilter || r.status === statusFilter) &&
        (!buFilter || r.bu === buFilter) &&
        (!ageFilter || ageBucket(r.benchDays) === ageFilter)
      );
      const data = rows.map((r) => ({
        LSID: r.lsid, Name: r.name, BU: r.bu, Category: r.category,
        'Bench ageing (days)': r.benchDays, Status: STATUS_LBL[r.status] || r.status,
        'Domains assigned': `${r.domainsAssigned}/${r.totalDomains}`,
        'Training avg (%)': r.trainingAvg, Email: r.email, Contact: r.contact,
        Trainer: r.trainer, 'Preferred location': r.preferredLocation, Skills: r.skills,
        'Mock interviews': r.totalMocks, 'Client interviews': r.totalClients,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Engineers');
      XLSX.writeFile(wb, `engineers_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) { toastError(e); }
  };

  return (
    <>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <h1>{isAdminLike ? 'People' : isBU ? 'My unit' : 'My team'}</h1>
          <p>
            {isAdminLike ? 'Business Units and all engineers across the org.'
              : isBU ? 'Register your trainers and engineers.'
                : 'Register and track your engineers.'}
          </p>
        </div>
        {isBU && (
          <Button variant="ghost" onClick={() => setShowBulk(true)} style={{ marginRight: 8 }}>
            📤 Bulk upload engineers
          </Button>
        )}
        {showAdd && (
          <Button variant="cyan" onClick={() => setModal(addModal)}>+ Add {addLabel}</Button>
        )}
      </div>

      {tabs.length > 1 && (
        <div className="tabs">
          {tabs.map((t) => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {tabLabel(t)} ({t === 'bus' ? bus.length : t === 'ctos' ? ctos.length : t === 'managers' ? managers.length : employees.length})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <LoadingPage />
      ) : list.length === 0 ? (
        <Empty>No {tabLabel(tab).toLowerCase()} yet.</Empty>
      ) : tab === 'ctos' ? (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>
              <th style={thStyle}>CTO</th><th style={thStyle}>Email</th><th style={thStyle}>ID</th><th style={thStyle}>Status</th>
            </tr></thead>
            <tbody>
              {ctos.map((u) => (
                <tr key={uid(u)} style={{ borderTop: '1px solid #eef2f7' }}>
                  <td style={tdStyle}><div className="row gap-8" style={{ alignItems: 'center' }}><div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{initials(u.name)}</div><span style={{ fontWeight: 700, color: 'var(--navy)' }}>{u.name}</span></div></td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{u.email}</td>
                  <td style={tdStyle}><Badge kind="neutral">{u.employeeCode || '—'}</Badge></td>
                  <td style={tdStyle}><Badge kind={u.active ? 'success' : 'neutral'}>{u.active ? 'Active' : 'Inactive'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'bus' ? (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={thStyle}>Business Unit</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>BU ID</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {bus.map((b) => (
                <tr key={uid(b)} style={{ borderTop: '1px solid #eef2f7' }}>
                  <td style={tdStyle}>
                    <div className="row gap-8" style={{ alignItems: 'center' }}>
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{initials(b.name)}</div>
                      <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{b.name}</span>
                    </div>
                  </td>
                  <td style={tdStyle}><Badge kind="info">{b.categoryName || '—'}</Badge></td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{b.email}</td>
                  <td style={tdStyle}><Badge kind="neutral">{b.employeeCode || '—'}</Badge></td>
                  <td style={tdStyle}><Badge kind={b.active ? 'success' : 'neutral'}>{b.active ? 'Active' : 'Inactive'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'employees' ? (
        (() => {
          const categoryOptions = [...new Set(employees.map((u) => u.categoryName).filter(Boolean))].sort();
          const buOptions = [...new Set(employees.map((u) => u.buName).filter(Boolean))].sort();
          const rows = employees.filter(engMatch);
          return (
            <>

              {role !== 'manager' && (
                <div
                  className="row gap-8"
                  style={{
                    marginBottom: 12,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <select
                    className="select"
                    style={{ maxWidth: 180 }}
                    value={catFilter}
                    onChange={(e) => setCatFilter(e.target.value)}
                  >
                    <option value="">All categories</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    className="select"
                    style={{ maxWidth: 180 }}
                    value={buFilter}
                    onChange={(e) => setBuFilter(e.target.value)}
                  >
                    <option value="">All BUs</option>
                    {buOptions.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>

                  <select
                    className="select"
                    style={{ maxWidth: 170 }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All status</option>
                    <option value="on_training">On training</option>
                    <option value="ongoing_interview">Ongoing interview</option>
                    <option value="deployed">Deployed</option>
                  </select>

                  <select
                    className="select"
                    style={{ maxWidth: 150 }}
                    value={ageFilter}
                    onChange={(e) => setAgeFilter(e.target.value)}
                  >
                    <option value="">All ageing</option>
                    <option value="0-30">0–30 days</option>
                    <option value="31-60">31–60 days</option>
                    <option value="61-90">61–90 days</option>
                    <option value="90+">90+ days</option>
                  </select>

                  <div style={{ flex: 1 }} />

                  <Button variant="cyan" size="sm" onClick={exportExcel}>
                    ⬇ Export Excel
                  </Button>
                </div>
              )}
              <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                      <th style={thStyle}>LSID</th>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>BU</th>
                      <th style={thStyle}>BU Cat</th>
                      <th style={thStyle}>Bench ageing</th>
                      <th style={thStyle}>Status</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u) => (
                      <tr key={uid(u)} style={{ borderTop: '1px solid #eef2f7', cursor: 'pointer' }} onClick={() => nav(`/employee/${uid(u)}`)}>
                        <td style={tdStyle}><Badge kind="neutral">{u.employeeCode || '—'}</Badge></td>
                        <td style={tdStyle}>
                          <div className="row gap-8" style={{ alignItems: 'center' }}>
                            <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{initials(u.name)}</div>
                            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color: '#334155' }}>{u.buName || '—'}</td>
                        <td style={tdStyle}><Badge kind="info">{u.categoryName || '—'}</Badge></td>
                        <td style={{ ...tdStyle, color: '#334155' }}>{u.benchDays != null ? `${u.benchDays} days` : '—'}</td>
                        <td style={tdStyle}><Badge kind={STATUS_KIND[u.jobStatus] || 'neutral'}>{STATUS_LABEL[u.jobStatus] || '—'}</Badge></td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: '#0284a8', fontWeight: 700 }}>View →</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={uid(u)} style={{ borderTop: '1px solid #eef2f7' }}>
                  <td style={tdStyle}>
                    <div className="row gap-8" style={{ alignItems: 'center' }}>
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{initials(u.name)}</div>
                      <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{u.email}</td>
                  <td style={tdStyle}><Badge kind="neutral">{u.employeeCode || '—'}</Badge></td>
                  <td style={tdStyle}><Badge kind={u.active ? 'success' : 'neutral'}>{u.active ? 'Active' : 'Inactive'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showBulk && (
        <BulkEmployeeUpload onClose={() => setShowBulk(false)} onDone={load} />
      )}
      {modal && (
        <RegisterModal
          role={modal}
          creatorRole={role}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}

function RegisterModal({ role, creatorRole, onClose, onDone }) {
  const isAdmin = creatorRole === 'admin';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [businessUnit, setBusinessUnit] = useState('');
  // const [managerId, setManagerId] = useState('');
  // const [categories, setCategories] = useState([]);
  const [managerId, setManagerId] = useState('');
  const [benchStart, setBenchStart] = useState(new Date().toISOString().slice(0, 10));
  const [jobStatus, setJobStatus] = useState('on_training');
  const [categories, setCategories] = useState([]);
  const [bus, setBus] = useState([]);
  const [ctos, setCtos] = useState([]);
  const [managers, setManagers] = useState([]);
  const [busy, setBusy] = useState(false);
  const { toast, toastError } = useToast();

  useEffect(() => {
    if (role === 'bu') api.listCategories().then((r) => setCategories(r.categories || [])).catch(() => { });
    if (isAdmin && (role === 'manager' || role === 'employee')) api.listBUs().then((r) => setBus(r.bus || [])).catch(() => { });
    if (role === 'employee') api.listManagers().then((r) => setManagers(r.managers || [])).catch(() => { });
  }, [role, isAdmin]);

  const submit = async () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      toastError('Name, email and a 6+ character password are required');
      return;
    }
    if (!employeeCode.trim()) { toastError('ID is required'); return; }
    if (role === 'bu' && !categoryId) { toastError('Category is required'); return; }
    if (role === 'employee' && benchStart && benchStart > new Date().toISOString().slice(0, 10)) {
      toastError('Bench start date cannot be in the future');
      return;
    }
    setBusy(true);
    try {
      if (role === 'cto') {
        await api.createCTO(name.trim(), email.trim(), password, employeeCode.trim());
      } else if (role === 'bu') {
        await api.createBU(name.trim(), email.trim(), password, employeeCode.trim(), categoryId);
      } else if (role === 'manager') {
        await api.createManager(name.trim(), email.trim(), password, employeeCode.trim(), businessUnit || undefined);
      } else {
        // await api.createEmployee(name.trim(), email.trim(), password, managerId || undefined, employeeCode.trim(), businessUnit || undefined);
        await api.createEmployee(
          name.trim(), email.trim(), password, managerId || undefined, employeeCode.trim(),
          businessUnit || undefined, benchStart || undefined, jobStatus
        );
      }
      toast(`${role === 'cto' ? 'CTO' : role === 'bu' ? 'Business Unit' : role === 'manager' ? 'Trainer' : 'Engineer'} registered`);
      onDone();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const titleMap = { cto: 'Register CTO', bu: 'Register Business Unit', manager: 'Register trainer', employee: 'Register engineer' };

  return (
    <Modal
      title={titleMap[role]}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="cyan" onClick={submit} disabled={busy}>{busy ? <Spinner sm /> : 'Register'}</Button>
        </>
      }
    >
      <div className="field">
        <label>{role === 'bu' ? 'BU name' : 'Full name'}</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={role === 'bu' ? 'e.g. VLSI Frontend Team' : 'e.g. Arjun Nair'} />
      </div>

      <div className="field">
        <label>Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
      </div>

      {role === 'bu' && (
        <div className="field">
          <label>Category</label>
          <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— Select category —</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          {categories.length === 0 && (
            <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>No categories yet — add one under “BU Categories” first.</div>
          )}
        </div>
      )}

      <div className="field">
        <label>{role === 'bu' ? 'BU ID' : 'Employee ID'}</label>
        <input className="input" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)}
          placeholder={role === 'bu' ? 'e.g. BU-VLSI-FE' : role === 'manager' ? 'e.g. LS-MGR-04' : 'e.g. LS-2291'} />
      </div>

      {isAdmin && (role === 'manager' || role === 'employee') && (
        <div className="field">
          <label>Business Unit</label>
          <select className="select" value={businessUnit} onChange={(e) => setBusinessUnit(e.target.value)}>
            <option value="">— Select BU —</option>
            {bus.map((b) => <option key={uid(b)} value={uid(b)}>{b.name} {b.categoryName ? `(${b.categoryName})` : ''}</option>)}
          </select>
        </div>
      )}

      {role === 'employee' && managers.length > 0 && (
        <div className="field">
          <label>Assign to trainer (optional)</label>
          <select className="select" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">— None —</option>
            {managers.map((m) => <option key={uid(m)} value={uid(m)}>{m.name} ({m.employeeCode})</option>)}
          </select>
        </div>
      )}

      {role === 'employee' && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Bench start date</label>
            <input
              className="input"
              type="date"
              value={benchStart}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBenchStart(e.target.value)}
            />
            <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>Bench ageing is counted from this date.</div>
          </div>
          <div className="field">
            <label>Current status</label>
            <select className="select" value={jobStatus} onChange={(e) => setJobStatus(e.target.value)}>
              <option value="on_training">On training</option>
              <option value="ongoing_interview">Ongoing interview</option>
              <option value="deployed">Deployed</option>
            </select>
          </div>
        </div>
      )}
      <div className="field">
        <label>Temporary password</label>
        <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
      </div>
    </Modal>
  );
}
