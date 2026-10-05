import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, uid } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Button, Badge, Modal, LoadingPage, Empty, Spinner, initials } from '../../components/ui';
import { useToast } from '../../components/Toast';
import BulkEmployeeUpload from '../../components/BulkEmployeeUpload';

const thStyle = { padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' };
const tdStyle = { padding: '12px 14px', fontSize: 13, verticalAlign: 'middle' };
const STATUS_LABEL = { on_training: 'On training', ongoing_interview: 'Ongoing interview', deployed: 'Deployed' };
const STATUS_KIND = { on_training: 'info', ongoing_interview: 'warning', deployed: 'success' };


const usePersisted = (key, initial) => {
  const [v, setV] = useState(() => {
    try {
      const s = sessionStorage.getItem(`people:${key}`);
      return s != null ? JSON.parse(s) : initial;
    } catch (e) {
      return initial;
    }
  });
  useEffect(() => {
    try { sessionStorage.setItem(`people:${key}`, JSON.stringify(v)); } catch (e) {}
  }, [key, v]);
  return [v, setV];
};


export default function PeoplePage() {
  const { user } = useAuth();
  const role = user.role;
  const isAdminLike = role === 'admin' || role === 'cto';
  const isBU = role === 'bu';
  const canWrite = role !== 'cto';

  const fullAdmin = role === 'admin' && !user.subAdmin;
  const tabs = role === 'admin'
    ? ['bus', 'employees', 'managers', 'ctos', ...(fullAdmin ? ['subadmins'] : [])]
    : role === 'cto' ? ['bus', 'employees', 'managers'] : isBU ? ['managers', 'employees'] : ['employees'];
  const [params, setParams] = useSearchParams();
  const tab = tabs.includes(params.get('tab')) ? params.get('tab') : tabs[0];
  const setTab = (t) => setParams((p) => { const n = new URLSearchParams(p); n.set('tab', t); return n; }, { replace: true });

  const [bus, setBus] = useState([]);
  const [subadmins, setSubadmins] = useState([]);
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
  const [domainFilter, setDomainFilter] = useState('');
  const [trainerFilter, setTrainerFilter] = useState('');
  const [editEngineer, setEditEngineer] = useState(null);
  const [manageBU, setManageBU] = useState(null);
  const [scope, setScope] = useState(null);
  const [pwUser, setPwUser] = useState(null);
  const [subFilter, setSubFilter] = useState('');
  const [headOnly, setHeadOnly] = useState([]);
  const [trainerDomainFilter, setTrainerDomainFilter] = useState('');
  const [trainerSearch, setTrainerSearch] = useState('');
  const [domains, setDomains] = useState([]);
  const [editTrainer, setEditTrainer] = useState(null);
  const { toast, toastError } = useToast();
  const nav = useNavigate();

  const toggleActive = async (u, label) => {
    const next = !u.active;
    if (!window.confirm(`${next ? 'Activate' : 'Deactivate'} ${label} "${u.name}"?${next ? '' : '\n\nThey will not be able to log in until activated again. Their data is kept.'}`)) return;
    try {
      await api.setUserActive(uid(u), next);
      toast(`${label} ${next ? 'activated' : 'deactivated'}`);
      await load();
    } catch (e) {
      toastError(e);
    }
  };

  const removeUser = async (u, label) => {
    if (!window.confirm(`Delete ${label} "${u.name}"?\n\nThe account will be moved to the Recycle Bin and can be restored by an admin within 30 days.`)) return;
    try {
      const r = await api.deleteUser(uid(u));
      toast(r.message || `${label} deleted`);
      await load();
    } catch (e) {
      toastError(e);
    }
  };

  const ActionButtons = ({ u, label, canToggle, canDelete }) => (
    <span onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
      {/*{fullAdmin && (
        <Button size="sm" variant="ghost" style={{ marginLeft: 6 }} title="Show password" onClick={() => setPwUser(u)}>
          🔑
        </Button>
      )}*/}
      {canToggle && (
        <Button size="sm" variant={u.active ? 'ghost' : 'cyan'} style={{ marginLeft: 6 }} onClick={() => toggleActive(u, label)}>
          {u.active ? 'Deactivate' : 'Activate'}
        </Button>
      )}
      {canDelete && (
        <Button size="sm" variant="danger" style={{ marginLeft: 6 }} onClick={() => removeUser(u, label)}>
          🗑
        </Button>
      )}
    </span>
  );

  const load = async () => {
    setLoading(true);
    try {
      if (isAdminLike) {
        const m = await api.listUsers('manager');
        setManagers(m.users || []);
        const calls = [api.listBUs(), api.listUsers('employee')];
        if (role === 'admin') calls.push(api.listCTOs());
        if (fullAdmin) calls.push(api.listSubAdmins());
        const [b, e, c, s] = await Promise.all(calls);
        setBus(b.bus || []);
        setHeadOnly(b.headOnly || []);
        setEmployees(e.users || []);
        if (c) setCtos(c.ctos || []);
        if (s) setSubadmins(s.subadmins || []);
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

  useEffect(() => {
    load();
    api.listDomains().then((r) => setDomains(r.domains || [])).catch(() => {});
    if (isBU) api.myScope().then(setScope).catch(() => {});
  }, []);

  const isHead = isBU && !!scope?.isCategoryHead;
  const scopeUnits = isHead ? scope.units.map((u) => ({ id: u.id, name: u.level === 'category' ? `${u.name} (whole category)` : `${u.categoryName || u.name} — ${u.name}` })) : null;
  const unitIdOf = (u) => String((u.businessUnit && (u.businessUnit._id || u.businessUnit.id)) || u.businessUnit || '');

  const domainName = Object.fromEntries(domains.map((d) => [String(d._id || d.id), d.name]));
  const domainOptions = [...domains].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const idsOf = (list) => (list || []).map((d) => String(d && (d._id || d.id || d)));

  const list = tab === 'bus' ? bus : tab === 'ctos' ? ctos : tab === 'subadmins' ? subadmins : tab === 'managers' ? managers : employees;

  const tabLabel = (t) => (t === 'bus' ? 'BUs' : t === 'ctos' ? 'CTOs' : t === 'subadmins' ? 'Sub admins' : t === 'managers' ? 'Trainers' : 'Engineers');
  const addLabel = tab === 'bus' ? 'BU' : tab === 'ctos' ? 'CTO' : tab === 'subadmins' ? 'sub admin' : tab === 'managers' ? 'trainer' : 'engineer';
  const addModal = tab === 'bus' ? 'bu' : tab === 'ctos' ? 'cto' : tab === 'subadmins' ? 'subadmin' : tab === 'managers' ? 'manager' : 'employee';

  const showAdd = canWrite && (role === 'admin' || !(isAdminLike && tab === 'employees'));

  const toggleSubAdmin = async (u) => {
    try {
      await api.setUserActive(uid(u), !u.active);
      await load();
    } catch (e) {
      toastError(e);
    }
  };

  const ageBucket = (d) => (d == null ? '' : d <= 30 ? '0-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : '90+');
  const engMatch = (u) =>
    (!catFilter || u.categoryName === catFilter) &&
    (!statusFilter || u.jobStatus === statusFilter) &&
    (!buFilter || u.buName === buFilter) &&
    (!ageFilter || ageBucket(u.benchDays) === ageFilter) &&
    (!domainFilter || idsOf(u.assignedDomains).includes(domainFilter)) &&
    (!trainerFilter || (trainerFilter === '__none' ? !u.trainerName : u.trainerName === trainerFilter)) &&
    (!subFilter || unitIdOf(u) === subFilter);

  const exportExcel = async () => {
    try {
      const res = await api.exportEngineers();
      const allowed = domainFilter || trainerFilter
        ? new Set(employees.filter(engMatch).map((u) => u.employeeCode))
        : null;
      let rows = res.rows || [];
      rows = rows.filter((r) =>
        (!catFilter || r.category === catFilter) &&
        (!statusFilter || r.status === statusFilter) &&
        (!buFilter || r.bu === buFilter) &&
        (!ageFilter || ageBucket(r.benchDays) === ageFilter) &&
        (!allowed || allowed.has(r.lsid))
      );
      const data = rows.map((r) => ({
        LSID: r.lsid, Name: r.name, BU: r.bu, Category: r.category,
        'Bench ageing (days)': r.benchDays, Status: STATUS_LABEL[r.status] || r.status,
        'Domains assigned': `${r.domainsAssigned}/${r.totalDomains}`,
        'Training avg (%)': r.trainingAvg, Email: r.email, Contact: r.contact,
        Trainer: r.trainer, 'Preferred location': r.preferredLocation, Skills: r.skills,
        'Mock interviews': r.totalMocks, 'Client interviews': r.totalClients,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Engineers');
      XLSX.writeFile(wb, `engineers_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      toastError(e);
    }
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
        {(isBU || role === 'admin') && (
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
              {tabLabel(t)} ({t === 'bus' ? bus.length : t === 'ctos' ? ctos.length : t === 'subadmins' ? subadmins.length : t === 'managers' ? managers.length : employees.length})
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
              {role === 'admin' && <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>}
            </tr></thead>
            <tbody>
              {ctos.map((u) => (
                <tr key={uid(u)} style={{ borderTop: '1px solid #eef2f7' }}>
                  <td style={tdStyle}><div className="row gap-8" style={{ alignItems: 'center' }}><div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{initials(u.name)}</div><span style={{ fontWeight: 700, color: 'var(--navy)' }}>{u.name}</span></div></td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{u.email}</td>
                  <td style={tdStyle}><Badge kind="neutral">{u.employeeCode || '—'}</Badge></td>
                  <td style={tdStyle}><Badge kind={u.active ? 'success' : 'neutral'}>{u.active ? 'Active' : 'Inactive'}</Badge></td>
                  {role === 'admin' && (
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <ActionButtons u={u} label="CTO" canToggle canDelete />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'subadmins' ? (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>
              <th style={thStyle}>Sub admin</th><th style={thStyle}>Email</th><th style={thStyle}>ID</th><th style={thStyle}>Status</th><th style={thStyle}></th>
            </tr></thead>
            <tbody>
              {subadmins.map((u) => (
                <tr key={uid(u)} style={{ borderTop: '1px solid #eef2f7' }}>
                  <td style={tdStyle}><div className="row gap-8" style={{ alignItems: 'center' }}><div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{initials(u.name)}</div><span style={{ fontWeight: 700, color: 'var(--navy)' }}>{u.name}</span></div></td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{u.email}</td>
                  <td style={tdStyle}><Badge kind="neutral">{u.employeeCode || '—'}</Badge></td>
                  <td style={tdStyle}><Badge kind={u.active ? 'success' : 'neutral'}>{u.active ? 'Active' : 'Inactive'}</Badge></td>
                  <td style={tdStyle}>
                    <Button size="sm" variant={u.active ? 'ghost' : 'cyan'} onClick={() => toggleSubAdmin(u)}>
                      {u.active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <ActionButtons u={u} label="Sub admin" canDelete />
                  </td>
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
                <th style={thStyle}>BU head(s)</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>BU ID</th>
                <th style={thStyle}>Login</th>
                <th style={thStyle}>Status</th>
                {role === 'admin' && <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>}
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
                  <td style={tdStyle}>
                    <Badge kind="info">{b.categoryName || '—'}</Badge>
                    {b.isCategoryHead && <span style={{ marginLeft: 6 }}><Badge kind="success">BU Head</Badge></span>}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 280 }}>
                    <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
                      {!b.loginDisabled && <Badge kind="neutral">Own login</Badge>}
                      {(b.heads || []).map((h) => (
                        <Badge key={h.id} kind={h.type === 'temporary' ? 'warning' : 'success'}>
                          {h.name}{h.type === 'temporary' ? ' (temp)' : ''}
                        </Badge>
                      ))}
                      {b.loginDisabled && !(b.heads || []).length && <Badge kind="danger">No head</Badge>}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{b.loginDisabled ? '—' : b.email}</td>
                  <td style={tdStyle}><Badge kind="neutral">{b.employeeCode || '—'}</Badge></td>
                  <td style={tdStyle}><Badge kind={b.loginDisabled ? 'neutral' : 'success'}>{b.loginDisabled ? 'Disabled' : 'Enabled'}</Badge></td>
                  <td style={tdStyle}><Badge kind={b.active ? 'success' : 'neutral'}>{b.active ? 'Active' : 'Inactive'}</Badge></td>
                  {role === 'admin' && (
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <Button size="sm" variant="ghost" onClick={() => setManageBU(b)}>👥 Manage heads</Button>
                      <ActionButtons u={b} label="BU" canToggle canDelete />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {headOnly.length > 0 && (
            <div style={{ padding: 14, borderTop: '1px solid #eef2f7', fontSize: 12.5 }}>
              <b style={{ color: 'var(--navy)' }}>BU heads without their own category:</b>{' '}
              {headOnly.map((h) => (
                <Badge key={uid(h)} kind="neutral">{h.name} ({h.employeeCode})</Badge>
              ))}
            </div>
          )}
        </div>
      ) : tab === 'employees' ? (
        (() => {
          const categoryOptions = [...new Set(employees.map((u) => u.categoryName).filter(Boolean))].sort();
          const buOptions = [...new Set(employees.map((u) => u.buName).filter(Boolean))].sort();
          const trainerOptions = [...new Set(employees.map((u) => u.trainerName).filter(Boolean))].sort();
          const rows = employees.filter(engMatch);
          return (
            <>
              <div className="row gap-8" style={{ marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {role !== 'manager' && (
                  <>
                    <select className="select" style={{ maxWidth: 180 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                      <option value="">All categories</option>
                      {categoryOptions.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select className="select" style={{ maxWidth: 180 }} value={buFilter} onChange={(e) => setBuFilter(e.target.value)}>
                      <option value="">All BUs</option>
                      {buOptions.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </>
                )}

                {isHead && (
                  <select className="select" style={{ maxWidth: 220 }} value={subFilter} onChange={(e) => setSubFilter(e.target.value)}>
                    <option value="">All sub-categories</option>
                    {scopeUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                )}

                <select className="select" style={{ maxWidth: 190 }} value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>
                  <option value="">All domains</option>
                  {domainOptions.map((d) => (
                    <option key={d._id || d.id} value={String(d._id || d.id)}>{d.name}</option>
                  ))}
                </select>

                {role !== 'manager' && (
                  <select className="select" style={{ maxWidth: 190 }} value={trainerFilter} onChange={(e) => setTrainerFilter(e.target.value)}>
                    <option value="">All trainers</option>
                    <option value="__none">No trainer assigned</option>
                    {trainerOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}

                <select className="select" style={{ maxWidth: 170 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All status</option>
                  <option value="on_training">On training</option>
                  <option value="ongoing_interview">Ongoing interview</option>
                  <option value="deployed">Deployed</option>
                </select>

                <select className="select" style={{ maxWidth: 150 }} value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)}>
                  <option value="">All ageing</option>
                  <option value="0-30">0–30 days</option>
                  <option value="31-60">31–60 days</option>
                  <option value="61-90">61–90 days</option>
                  <option value="90+">90+ days</option>
                </select>

                <span className="muted" style={{ fontSize: 12.5 }}>{rows.length} of {employees.length} engineers</span>

                <div style={{ flex: 1 }} />

                {role !== 'manager' && (
                  <Button variant="cyan" size="sm" onClick={exportExcel}>
                    ⬇ Export Excel
                  </Button>
                )}
              </div>

              <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                      <th style={thStyle}>LSID</th>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>BU</th>
                      <th style={thStyle}>BU Cat</th>
                      <th style={thStyle}>Trainer</th>
                      <th style={thStyle}>Domains</th>
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
                            <span style={{ fontWeight: 700, color: u.active === false ? 'var(--muted)' : 'var(--navy)' }}>{u.name}</span>
                            {u.active === false && <Badge kind="danger">Inactive</Badge>}
                            {u.trainerAccess && <Badge kind="info">Also trainer</Badge>}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color: '#334155' }}>{u.buName || '—'}</td>
                        <td style={tdStyle}><Badge kind="info">{u.categoryName || '—'}</Badge></td>
                        <td style={{ ...tdStyle, color: '#334155', whiteSpace: 'nowrap' }}>
                          {u.trainerName || <span className="muted">Not assigned</span>}
                        </td>
                        <td style={{ ...tdStyle, maxWidth: 260 }}>
                          {idsOf(u.assignedDomains).length ? (
                            <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
                              {idsOf(u.assignedDomains).map((id) => domainName[id] && <Badge key={id} kind="neutral">{domainName[id]}</Badge>)}
                            </div>
                          ) : <span className="muted">—</span>}
                        </td>
                        <td style={{ ...tdStyle, color: '#334155' }}>{u.benchDays != null ? `${u.benchDays} days` : '—'}</td>
                        <td style={tdStyle}><Badge kind={STATUS_KIND[u.jobStatus] || 'neutral'}>{STATUS_LABEL[u.jobStatus] || '—'}</Badge></td>
                        <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {canWrite && (
                            <Button
                              size="sm"
                              variant="ghost"
                              style={{ marginRight: 6 }}
                              onClick={(e) => { e.stopPropagation(); setEditEngineer(u); }}
                            >
                              ✏️
                            </Button>
                          )}
                          <ActionButtons u={u} label="Engineer" canToggle={canWrite} canDelete={role === 'admin' || isBU} />
                          <span style={{ color: '#0284a8', fontWeight: 700, marginLeft: 8 }}>View →</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length === 0 && <div className="muted" style={{ padding: 16, fontSize: 13 }}>No engineers match these filters.</div>}
              </div>
            </>
          );
        })()
      ) : (
        (() => {
          const s = trainerSearch.trim().toLowerCase();
          const rows = managers.filter((u) =>
            (!trainerDomainFilter || idsOf(u.trainerDomains).includes(trainerDomainFilter)) &&
            (!subFilter || unitIdOf(u) === subFilter) &&
            (!s || [u.name, u.email, u.employeeCode, u.buName].some((v) => String(v || '').toLowerCase().includes(s)))
          );
          const canEditTrainer = role === 'admin' || isBU;
          return (
            <>
              <div className="row gap-8" style={{ marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  className="input"
                  style={{ maxWidth: 240 }}
                  placeholder="Search trainers…"
                  value={trainerSearch}
                  onChange={(e) => setTrainerSearch(e.target.value)}
                />
                {isHead && (
                  <select className="select" style={{ maxWidth: 220 }} value={subFilter} onChange={(e) => setSubFilter(e.target.value)}>
                    <option value="">All sub-categories</option>
                    {scopeUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                )}
                <select className="select" style={{ maxWidth: 200 }} value={trainerDomainFilter} onChange={(e) => setTrainerDomainFilter(e.target.value)}>
                  <option value="">All domains</option>
                  {domainOptions.map((d) => (
                    <option key={d._id || d.id} value={String(d._id || d.id)}>{d.name}</option>
                  ))}
                </select>
                <span className="muted" style={{ fontSize: 12.5 }}>{rows.length} of {managers.length} trainers</span>
              </div>
              <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>ID</th>
                      {(isAdminLike || isHead) && <th style={thStyle}>BU</th>}
                      <th style={thStyle}>Trainer for domains</th>
                      <th style={thStyle}>Status</th>
                      {canEditTrainer && <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u) => (
                      <tr key={uid(u)} style={{ borderTop: '1px solid #eef2f7' }}>
                        <td style={tdStyle}>
                          <div className="row gap-8" style={{ alignItems: 'center' }}>
                            <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{initials(u.name)}</div>
                            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{u.name}</span>
                            {u.role === 'employee' && <Badge kind="neutral">Also engineer</Badge>}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--muted)' }}>{u.email}</td>
                        <td style={tdStyle}><Badge kind="neutral">{u.employeeCode || '—'}</Badge></td>
                        {(isAdminLike || isHead) && <td style={{ ...tdStyle, color: '#334155' }}>{u.buName || '—'}</td>}
                        <td style={{ ...tdStyle, maxWidth: 320 }}>
                          {idsOf(u.trainerDomains).length ? (
                            <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
                              {idsOf(u.trainerDomains).map((id) => <Badge key={id} kind="info">{domainName[id] || 'Archived domain'}</Badge>)}
                            </div>
                          ) : <span className="muted">Not set</span>}
                        </td>
                        <td style={tdStyle}><Badge kind={u.active ? 'success' : 'neutral'}>{u.active ? 'Active' : 'Inactive'}</Badge></td>
                        {canEditTrainer && (
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <Button size="sm" variant="ghost" onClick={() => setEditTrainer(u)}>✏️ Edit</Button>
                            {u.role !== 'employee' && <ActionButtons u={u} label="Trainer" canToggle canDelete />}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length === 0 && <div className="muted" style={{ padding: 16, fontSize: 13 }}>No trainers match these filters.</div>}
              </div>
            </>
          );
        })()
      )}

      {pwUser && <PasswordModal target={pwUser} onClose={() => setPwUser(null)} />}

      {manageBU && (
        <ManageBUModal
          unit={manageBU}
          onClose={() => setManageBU(null)}
          onChanged={load}
        />
      )}

      {editEngineer && (
        <EditEngineerModal
          engineer={editEngineer}
          role={isHead ? 'admin' : role}
          bus={isHead ? scopeUnits : bus}
          trainers={managers}
          onClose={() => setEditEngineer(null)}
          onSaved={(u) => {
            setEmployees((current) => current.map((m) => (uid(m) === uid(u) ? { ...m, ...u } : m)));
            setEditEngineer(null);
          }}
        />
      )}

      {editTrainer && (
        <EditTrainerModal
          trainer={editTrainer}
          canChangeBU={role === 'admin' || isHead}
          bus={isHead ? scopeUnits : bus}
          domains={domainOptions}
          onClose={() => setEditTrainer(null)}
          onSaved={(u) => {
            setManagers((current) => current.map((m) => (uid(m) === uid(u) ? { ...m, ...u } : m)));
            setEditTrainer(null);
          }}
        />
      )}

      {showBulk && (
        <BulkEmployeeUpload needsBU={role === 'admin' || isHead} buOptions={scopeUnits} onClose={() => setShowBulk(false)} onDone={load} />
      )}

      {modal && (
        <RegisterModal
          role={modal}
          creatorRole={role}
          scopeUnits={scopeUnits}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}

function RegisterModal({ role, creatorRole, scopeUnits, onClose, onDone }) {
  const isAdmin = creatorRole === 'admin';
  const pickUnit = !!scopeUnits && (role === 'manager' || role === 'employee');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [buKind, setBuKind] = useState('bu');
  const [businessUnit, setBusinessUnit] = useState('');
  const [managerId, setManagerId] = useState('');
  const [benchStart, setBenchStart] = useState(new Date().toISOString().slice(0, 10));
  const [jobStatus, setJobStatus] = useState('on_training');
  const [categories, setCategories] = useState([]);
  const [bus, setBus] = useState([]);
  const [managers, setManagers] = useState([]);
  const [busy, setBusy] = useState(false);
  const { toast, toastError } = useToast();

  useEffect(() => {
    if (role === 'bu') api.listCategories().then((r) => setCategories(r.categories || [])).catch(() => {});
    if (isAdmin && (role === 'manager' || role === 'employee')) api.listBUs().then((r) => setBus(r.bus || [])).catch(() => {});
    if (role === 'employee') api.listManagers().then((r) => setManagers(r.managers || [])).catch(() => {});
  }, [role, isAdmin]);

  const submit = async () => {
    const needsLogin = !(role === 'bu' && buKind === 'unit');
    if (!name.trim() || (needsLogin && (!email.trim() || password.length < 6))) {
      toastError(needsLogin ? 'Name, email and a 6+ character password are required' : 'Name is required');
      return;
    }
    if (!employeeCode.trim()) { toastError('ID is required'); return; }
    if (role === 'bu' && buKind !== 'head' && !categoryId) { toastError('Category is required'); return; }
    if (isAdmin && role === 'employee' && !businessUnit) { toastError('Please select a Business Unit'); return; }
    if (role === 'employee' && benchStart && benchStart > new Date().toISOString().slice(0, 10)) {
      toastError('Bench start date cannot be in the future');
      return;
    }
    setBusy(true);
    try {
      if (role === 'subadmin') {
        await api.createSubAdmin(name.trim(), email.trim(), password, employeeCode.trim());
      } else if (role === 'cto') {
        await api.createCTO(name.trim(), email.trim(), password, employeeCode.trim());
      } else if (role === 'bu') {
        await api.createBU(name.trim(), email.trim(), password, employeeCode.trim(), buKind === 'head' ? undefined : categoryId, buKind);
      } else if (role === 'manager') {
        await api.createManager(name.trim(), email.trim(), password, employeeCode.trim(), businessUnit || undefined);
      } else {
        await api.createEmployee(
          name.trim(), email.trim(), password, managerId || undefined, employeeCode.trim(),
          businessUnit || undefined, benchStart || undefined, jobStatus
        );
      }
      toast(`${role === 'subadmin' ? 'Sub admin' : role === 'cto' ? 'CTO' : role === 'bu' ? 'Business Unit' : role === 'manager' ? 'Trainer' : 'Engineer'} registered`);
      onDone();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const titleMap = { subadmin: 'Register sub admin', cto: 'Register CTO', bu: 'Register Business Unit', manager: 'Register trainer', employee: 'Register engineer' };

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
      {role === 'bu' && (
        <div className="field">
          <label>What are you creating?</label>
          <select className="select" value={buKind} onChange={(e) => setBuKind(e.target.value)}>
            <option value="bu">Business Unit with its own login (BU head + category)</option>
            <option value="unit">Category unit only — no login (assign a BU head to it)</option>
            <option value="head">BU head only — a person, no category (assign BUs to them)</option>
          </select>
        </div>
      )}

      <div className="field">
        <label>{role === 'bu' ? (buKind === 'head' ? 'BU head name' : 'BU name') : 'Full name'}</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={role === 'bu' ? 'e.g. VLSI Frontend Team' : 'e.g. Arjun Nair'} />
      </div>

      {!(role === 'bu' && buKind === 'unit') && (
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
        </div>
      )}

      {role === 'bu' && buKind !== 'head' && (
        <div className="field">
          <label>Category</label>
          <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— Select category —</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.parent ? `   └ ${c.label || c.name}  (sub-category BU)` : `${c.name}  (main category — BU Head)`}
              </option>
            ))}
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

      {pickUnit && (
        <div className="field">
          <label>Sub-category</label>
          <select className="select" value={businessUnit} onChange={(e) => { setBusinessUnit(e.target.value); setManagerId(''); }}>
            <option value="">Whole category (your own)</option>
            {scopeUnits.filter((u) => !u.name.endsWith('(whole category)')).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}

      {role === 'employee' && managers.length > 0 && (
        <div className="field">
          <label>Assign to trainer (optional)</label>
          <select className="select" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">— None —</option>
            {managers
              .filter((m) => !pickUnit || !businessUnit || String((m.businessUnit && (m.businessUnit._id || m.businessUnit.id)) || m.businessUnit) === businessUnit)
              .map((m) => <option key={uid(m)} value={uid(m)}>{m.name} ({m.employeeCode})</option>)}
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

      {!(role === 'bu' && buKind === 'unit') && (
        <div className="field">
          <label>Temporary password</label>
          <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
        </div>
      )}
    </Modal>
  );
}

function EditTrainerModal({ trainer, canChangeBU, bus, domains, onClose, onSaved }) {
  const { toast, toastError } = useToast();
  const [form, setForm] = useState({
    name: trainer.name || '',
    email: trainer.email || '',
    employeeCode: trainer.employeeCode || '',
    contactNumber: trainer.contactNumber || '',
    businessUnit: String((trainer.businessUnit && (trainer.businessUnit._id || trainer.businessUnit.id)) || trainer.businessUnit || ''),
    domainIds: (trainer.trainerDomains || []).map((d) => String(d && (d._id || d.id || d))),
  });
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  const toggle = (id) =>
    setForm((f) => ({ ...f, domainIds: f.domainIds.includes(id) ? f.domainIds.filter((x) => x !== id) : [...f.domainIds, id] }));

  const save = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.employeeCode.trim()) {
      toastError('Name, email and ID are required');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        employeeCode: form.employeeCode,
        contactNumber: form.contactNumber,
        domainIds: form.domainIds,
      };
      if (canChangeBU && form.businessUnit) payload.businessUnit = form.businessUnit;
      const res = await api.updateTrainer(uid(trainer), payload);
      toast('Trainer updated');
      onSaved(res.user);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const shown = domains.filter((d) => !q.trim() || String(d.name).toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <Modal
      title={`Edit trainer — ${trainer.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="cyan" onClick={save} disabled={busy}>{busy ? <Spinner sm /> : 'Save'}</Button>
        </>
      }
    >
      <div style={{ maxWidth: 720 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Full name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Employee ID</label>
            <input className="input" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Contact number</label>
            <input className="input" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
          </div>
          {canChangeBU && (
            <div className="field" style={{ margin: 0 }}>
              <label>Business Unit</label>
              <select className="select" value={form.businessUnit} onChange={(e) => setForm({ ...form, businessUnit: e.target.value })}>
                <option value="">— Select BU —</option>
                {bus.map((b) => <option key={uid(b)} value={uid(b)}>{b.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--navy)' }}>Trainer for domains</div>
              <div className="muted" style={{ fontSize: 12 }}>For display only — shows which domains this trainer teaches. It doesn't change anyone's access.</div>
            </div>
            <input className="input" style={{ maxWidth: 200 }} placeholder="Search domains…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 8 }}>
            {shown.length === 0 && <div className="muted" style={{ fontSize: 13, padding: 6 }}>No domains found.</div>}
            {shown.map((d) => {
              const id = String(d._id || d.id);
              return (
                <label key={id} className="row gap-8" style={{ padding: '6px 4px', fontSize: 13, cursor: 'pointer', alignItems: 'center' }}>
                  <input type="checkbox" checked={form.domainIds.includes(id)} onChange={() => toggle(id)} />
                  <span>{d.icon ? `${d.icon} ` : ''}{d.name}</span>
                  {d.categoryName && <span className="muted" style={{ fontSize: 11.5 }}>({d.categoryName})</span>}
                </label>
              );
            })}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{form.domainIds.length} selected</div>
        </div>
      </div>
    </Modal>
  );
}

function EditEngineerModal({ engineer, role, bus, trainers, onClose, onSaved }) {
  const { toast, toastError } = useToast();
  const idOf = (v) => String((v && (v._id || v.id)) || v || '');
  const [form, setForm] = useState({
    name: engineer.name || '',
    email: engineer.email || '',
    employeeCode: engineer.employeeCode || '',
    contactNumber: engineer.contactNumber || '',
    preferredLocation: engineer.preferredLocation || '',
    skills: (engineer.skills || []).join(', '),
    businessUnit: idOf(engineer.businessUnit),
    managerId: idOf(engineer.manager),
    jobStatus: engineer.jobStatus || 'on_training',
    benchStart: engineer.benchStart ? String(engineer.benchStart).slice(0, 10) : '',
    deployedAt: engineer.deployedAt ? String(engineer.deployedAt).slice(0, 10) : '',
    trainerAccess: !!engineer.trainerAccess,
  });
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const canPickBU = role === 'admin';
  const canPickTrainer = role === 'admin' || role === 'bu';
  const unitTrainers = trainers.filter(
    (t) => t.active !== false && (!form.businessUnit || idOf(t.businessUnit) === form.businessUnit)
  );

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.employeeCode.trim()) {
      toastError('Name, email and Employee ID are required');
      return;
    }
    if (form.benchStart && form.benchStart > today) {
      toastError('Bench start date cannot be in the future');
      return;
    }
    if (form.jobStatus === 'deployed' && form.deployedAt && form.benchStart && form.deployedAt < form.benchStart) {
      toastError('Deployed date cannot be before the bench start date');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        employeeCode: form.employeeCode,
        contactNumber: form.contactNumber,
        preferredLocation: form.preferredLocation,
        skills: form.skills,
      };
      if (canPickBU && form.businessUnit) payload.businessUnit = form.businessUnit;
      if (canPickTrainer) payload.managerId = form.managerId || null;
      const res = await api.updateEngineer(uid(engineer), payload);
      let updated = res.user;

      const statusChanged =
        form.jobStatus !== (engineer.jobStatus || 'on_training') ||
        form.benchStart !== (engineer.benchStart ? String(engineer.benchStart).slice(0, 10) : '') ||
        (form.jobStatus === 'deployed' && form.deployedAt !== (engineer.deployedAt ? String(engineer.deployedAt).slice(0, 10) : ''));
      if (statusChanged) {
        const st = await api.setEmployeeStatus(
          uid(engineer),
          form.jobStatus,
          form.benchStart || undefined,
          form.jobStatus === 'deployed' ? form.deployedAt || today : null
        );
        updated = { ...updated, ...st.user };
      }

      if (canPickTrainer && form.trainerAccess !== !!engineer.trainerAccess) {
        const ta = await api.setTrainerAccess(uid(engineer), form.trainerAccess);
        updated = { ...updated, trainerAccess: ta.user.trainerAccess };
        toast(ta.message);
      }

      toast('Engineer updated');
      onSaved(updated);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Edit engineer — ${engineer.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="cyan" onClick={save} disabled={busy}>{busy ? <Spinner sm /> : 'Save'}</Button>
        </>
      }
    >
      <div style={{ maxWidth: 760 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Full name</label>
            <input className="input" value={form.name} onChange={set('name')} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Employee ID</label>
            <input className="input" value={form.employeeCode} onChange={set('employeeCode')} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Contact number</label>
            <input className="input" value={form.contactNumber} onChange={set('contactNumber')} placeholder="+91 98765 43210" />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Preferred location</label>
            <input className="input" value={form.preferredLocation} onChange={set('preferredLocation')} />
          </div>
          {canPickBU && (
            <div className="field" style={{ margin: 0 }}>
              <label>Business Unit</label>
              <select
                className="select"
                value={form.businessUnit}
                onChange={(e) => setForm({ ...form, businessUnit: e.target.value, managerId: '' })}
              >
                <option value="">— Select BU —</option>
                {bus.map((b) => <option key={uid(b)} value={uid(b)}>{b.name}</option>)}
              </select>
            </div>
          )}
          {canPickTrainer && (
            <div className="field" style={{ margin: 0 }}>
              <label>Trainer</label>
              <select className="select" value={form.managerId} onChange={set('managerId')}>
                <option value="">— No trainer —</option>
                {unitTrainers.map((t) => <option key={uid(t)} value={uid(t)}>{t.name} ({t.employeeCode})</option>)}
              </select>
              {unitTrainers.length === 0 && (
                <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>No trainers in this Business Unit yet.</div>
              )}
            </div>
          )}
          <div className="field" style={{ margin: 0, gridColumn: '1 / -1' }}>
            <label>Skills</label>
            <input className="input" value={form.skills} onChange={set('skills')} placeholder="STA, PNR, Python" />
            <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>Separate skills with commas.</div>
          </div>
        </div>

        {canPickTrainer && (
          <label className="row gap-8" style={{ marginTop: 14, fontSize: 13, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.trainerAccess}
              onChange={(e) => setForm({ ...form, trainerAccess: e.target.checked })}
              style={{ marginTop: 3 }}
            />
            <span>
              <b>Also works as a trainer</b>
              <span className="muted" style={{ display: 'block', fontSize: 12 }}>
                They keep their engineer account and get a switch in the top bar: Engineer view / Trainer view.
                They appear in the Trainers list and can be assigned engineers.
              </span>
            </span>
          </label>
        )}

        <div style={{ marginTop: 16, padding: 12, background: '#f4f6fb', borderRadius: 10 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Status & bench</div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Status</label>
              <select className="select" value={form.jobStatus} onChange={set('jobStatus')}>
                <option value="on_training">On training</option>
                <option value="ongoing_interview">Ongoing interview</option>
                <option value="deployed">Deployed</option>
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Bench start date</label>
              <input className="input" type="date" max={today} value={form.benchStart} onChange={set('benchStart')} />
            </div>
            {form.jobStatus === 'deployed' && (
              <div className="field" style={{ margin: 0 }}>
                <label>Deployed date</label>
                <input className="input" type="date" min={form.benchStart || undefined} max={today} value={form.deployedAt} onChange={set('deployedAt')} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ManageBUModal({ unit, onClose, onChanged }) {
  const { toast, toastError } = useToast();
  const [people, setPeople] = useState([]);
  const [heads, setHeads] = useState(unit.heads || []);
  const [loginDisabled, setLoginDisabled] = useState(!!unit.loginDisabled);
  const [pick, setPick] = useState('');
  const [type, setType] = useState('temporary');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const r = await api.listBUs();
    const me = (r.bus || []).find((b) => uid(b) === uid(unit));
    if (me) {
      setHeads(me.heads || []);
      setLoginDisabled(!!me.loginDisabled);
    }
    onChanged && onChanged();
  };

  useEffect(() => {
    api.listBUHeads().then((r) => setPeople(r.heads || [])).catch(() => {});
  }, []);

  const add = async () => {
    if (!pick) return toastError('Select a BU head');
    setBusy(true);
    try {
      const r = await api.addUnitHead(uid(unit), pick, type);
      toast(r.message || 'Head assigned');
      setPick('');
      await refresh();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (h) => {
    if (!window.confirm(`Remove ${h.name} as ${h.type} head of ${unit.name}?`)) return;
    setBusy(true);
    try {
      await api.removeUnitHead(uid(unit), h.id);
      toast('Head removed');
      await refresh();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const toggleLogin = async () => {
    const next = !loginDisabled;
    if (next && !heads.length && !window.confirm('Nobody else is a head of this BU. Disable its login anyway?')) return;
    setBusy(true);
    try {
      await api.setUnitLogin(uid(unit), next);
      toast(next ? 'Login disabled' : 'Login enabled');
      await refresh();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const candidates = people.filter((p) => String(p.id) !== uid(unit) && !heads.some((h) => h.id === String(p.id)));

  return (
    <Modal
      title={`Manage BU heads — ${unit.name}${unit.categoryName ? ` (${unit.categoryName})` : ''}`}
      onClose={onClose}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      <div style={{ maxWidth: 720 }}>
        <div className="card" style={{ padding: 14, marginBottom: 14, background: '#f8fafc' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 13.5 }}>This BU's own login</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {loginDisabled
                  ? 'Disabled — nobody can sign in with this BU account. Its engineers, trainers and data stay here.'
                  : `Enabled — ${unit.email} can sign in.`}
              </div>
            </div>
            <Button size="sm" variant={loginDisabled ? 'cyan' : 'ghost'} onClick={toggleLogin} disabled={busy}>
              {loginDisabled ? 'Enable login' : 'Disable login (BU head left)'}
            </Button>
          </div>
        </div>

        <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 13.5, marginBottom: 8 }}>Other BU heads with access</div>
        {heads.length === 0 ? (
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>No other heads assigned.</div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            {heads.map((h) => (
              <div key={h.id} className="list-row" style={{ alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div className="li-title">{h.name} <span className="muted" style={{ fontSize: 12 }}>({h.employeeCode})</span></div>
                  <div className="li-sub">Since {h.since ? new Date(h.since).toLocaleDateString('en-IN') : '—'}</div>
                </div>
                <Badge kind={h.type === 'temporary' ? 'warning' : 'success'}>{h.type}</Badge>
                <Button size="sm" variant="danger" onClick={() => remove(h)} disabled={busy}>Remove</Button>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 13.5, marginBottom: 8 }}>Assign a BU head</div>
          <div className="row gap-8" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ margin: 0, minWidth: 260, flex: 1 }}>
              <label>BU head</label>
              <select className="select" value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">— Select —</option>
                {candidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.employeeCode}){p.categoryName ? ` · ${p.categoryName}` : p.headOnly ? ' · head only' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Type</label>
              <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="temporary">Temporary</option>
                <option value="permanent">Permanent</option>
              </select>
            </div>
            <Button variant="cyan" onClick={add} disabled={busy || !pick}>{busy ? <Spinner sm /> : 'Assign'}</Button>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            The head gets full BU access to this category and can switch to it from the top bar. Access stays until you remove it.
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PasswordModal({ target, onClose }) {
  const { toast } = useToast();
  const [state, setState] = useState({ loading: true, password: '', error: '' });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    api.viewPassword(uid(target))
      .then((r) => setState({ loading: false, password: r.password, error: '' }))
      .catch((e) => setState({ loading: false, password: '', error: e.message || 'Could not load password' }));
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.password);
      toast('Password copied');
    } catch (e) {
      setVisible(true);
    }
  };

  return (
    <Modal
      title={`Password — ${target.name}${target.employeeCode ? ` (${target.employeeCode})` : ''}`}
      onClose={onClose}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      <div style={{ maxWidth: 520 }}>
        {state.loading ? (
          <div className="row" style={{ justifyContent: 'center', padding: 20 }}><Spinner /></div>
        ) : state.error ? (
          <div style={{ color: '#b45309', fontSize: 13.5 }}>{state.error}</div>
        ) : (
          <>
            <div className="row gap-8" style={{ alignItems: 'center' }}>
              <input
                className="input"
                readOnly
                type={visible ? 'text' : 'password'}
                value={state.password}
                style={{ fontFamily: 'monospace', fontSize: 15 }}
              />
              <Button variant="ghost" onClick={() => setVisible((v) => !v)}>{visible ? 'Hide' : 'Show'}</Button>
              <Button variant="cyan" onClick={copy}>Copy</Button>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Viewing a password is recorded in the audit log. Share it only with the account owner.
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
