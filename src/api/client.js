const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let token = localStorage.getItem('ls_token') || null;

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('ls_token', t);
  else localStorage.removeItem('ls_token');
}
export function getToken() {
  return token;
}

function headers(json = true) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function handle(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  if (!res.ok) {
    const msg = body?.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return body;
}

const get = (p) => fetch(`${API_URL}${p}`, { headers: headers() }).then(handle);
const post = (p, b) =>
  fetch(`${API_URL}${p}`, { method: 'POST', headers: headers(), body: JSON.stringify(b) }).then(handle);
const put = (p, b) =>
  fetch(`${API_URL}${p}`, { method: 'PUT', headers: headers(), body: JSON.stringify(b) }).then(handle);
const patch = (p, b) =>
  fetch(`${API_URL}${p}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(b) }).then(handle);
const del = (p) => fetch(`${API_URL}${p}`, { method: 'DELETE', headers: headers() }).then(handle);

const qs = (params = {}) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
  return s ? `?${s}` : '';
};

export function trackUsage(path, ms, view) {
  if (!token) return;
  try {
    fetch(`${API_URL}/insights/track`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ path, ms: Math.round(ms || 0), view: !!view }),
      keepalive: true,
    }).catch(() => {});
  } catch (e) {}
}

export const api = {
  logout: (endpoint) => post('/auth/logout', { endpoint }),
  insightsOverview: (days) => get(`/insights/overview${qs({ days })}`),
  insightsActivity: (days) => get(`/insights/activity${qs({ days })}`),
  insightsPerformance: (hours) => get(`/insights/performance${qs({ hours })}`),
  insightsDatabase: () => get('/insights/database'),
  insightsAlerts: () => get('/insights/alerts'),
  runAlertCheck: () => post('/insights/alerts/run', {}),
  insightsLogs: (kind, params = {}) => get(`/insights/logs/${kind}${qs(params)}`),
  insightsLogDetail: (kind, id) => get(`/insights/logs/${kind}/${id}`),
  downloadInsightsCsv: async (kind, params = {}) => {
    const res = await fetch(`${API_URL}/insights/logs/${kind}${qs({ ...params, format: 'csv' })}`, { headers: headers(false) });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kind}-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  getMyStreak: () => get('/streak/me'),
  listExercises: (domainId) => get(`/exercises?domain=${domainId}`),
  createExercise: async ({ domainId, title, instructions, refType, refLink, file }) => {
    if (refType === 'file') {
      const fd = new FormData();
      fd.append('domainId', domainId); fd.append('title', title);
      fd.append('instructions', instructions || ''); fd.append('refType', 'file');
      fd.append('file', file);
      const res = await fetch(`${API_URL}/exercises`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
      return handle(res);
    }
    return post('/exercises', { domainId, title, instructions, refType: refType || 'none', refLink });
  },
  updateExercise: (id, payload) => patch(`/exercises/${id}`, payload),
  deleteExercise: (id) => del(`/exercises/${id}`),
  submitExercise: (id, completed, driveLink) => put(`/exercises/${id}/my-submission`, { completed, driveLink }),
  exerciseSubmissions: (id) => get(`/exercises/${id}/submissions`),

  listCompanies: (categoryId) => get(`/interviews/companies${categoryId ? `?category=${categoryId}` : ''}`),
  createCompany: (name, categoryId) => post('/interviews/companies', { name, categoryId }),
  deleteCompany: (id) => del(`/interviews/companies/${id}`),

  listInterviewMaterials: (companyId, categoryId) => {
    const qs = new URLSearchParams(Object.entries({ company: companyId, category: categoryId }).filter(([, v]) => v)).toString();
    return get(`/interviews/materials${qs ? `?${qs}` : ''}`);
  },
  uploadInterviewMaterial: async ({ companyId, title, kind, forRole, file }) => {
    const fd = new FormData();
    fd.append('companyId', companyId);
    fd.append('title', title);
    fd.append('kind', kind || 'question_bank');
    fd.append('forRole', forRole || '');
    fd.append('file', file);
    const res = await fetch(`${API_URL}/interviews/materials`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    return handle(res);
  },
  deleteInterviewMaterial: (id) => del(`/interviews/materials/${id}`),

  listMocks: (employeeId) => get(`/interviews/mocks${employeeId ? `?employee=${employeeId}` : ''}`),
  scheduleMock: (payload) => post('/interviews/mocks', payload),
  scoreMock: (id, score, review, status) => patch(`/interviews/mocks/${id}/score`, { score, review, status }),

  listClientInterviews: (employeeId) => get(`/interviews/clients${employeeId ? `?employee=${employeeId}` : ''}`),
  createClientInterview: (payload) => post('/interviews/clients', payload),
  updateClientInterview: (id, payload) => patch(`/interviews/clients/${id}`, payload),

  listAvailability: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return get(`/interviews/availability${qs ? `?${qs}` : ''}`);
  },
  addAvailability: (payload) => post('/interviews/availability', payload),
  deleteAvailability: (id) => del(`/interviews/availability/${id}`),

  employeeInterviewHistory: (employeeId) => get(`/interviews/history/${employeeId}`),
  login: (identifier, password) => post('/auth/login', { identifier, password }),
  me: () => get('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    post('/auth/change-password', { currentPassword, newPassword }),

  createManager: (name, email, password, employeeCode, businessUnit) => post('/users/managers', { name, email, password, employeeCode, businessUnit }),
  createEmployee: (name, email, password, managerId, employeeCode, businessUnit) =>
    post('/users/employees', { name, email, password, managerId, employeeCode, businessUnit }),
  listUsers: (role) => get(`/users${role ? `?role=${role}` : ''}`),
  listManagers: () => get('/users/managers'),
  updateMyProfile: (profile) => patch('/users/me/profile', profile),
  setEmployeeStatus: (id, jobStatus, benchStart) => patch(`/users/${id}/status`, { jobStatus, benchStart }),
  getUser: (id) => get(`/users/${id}`),
  setUserActive: (id, active) => patch(`/users/${id}/active`, { active }),

  listDomains: () => get('/domains'),
  assignUserDomains: (id, domainIds) => patch(`/users/${id}/domains`, { domainIds }),
  createDomain: (key, name, description, icon) => post('/domains', { key, name, description, icon }),
  deleteDomain: (id) => del(`/domains/${id}`),

  listDocuments: (domainId) => get(`/documents${domainId ? `?domainId=${domainId}` : ''}`),
  getDocument: (id) => get(`/documents/${id}`),
  deleteDocument: (id) => del(`/documents/${id}`),
  markReviewed: (id, reviewed = true) => post(`/documents/${id}/review`, { reviewed }),
  uploadDocument: async ({ title, description, domainId, file }) => {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', description || '');
    fd.append('domainId', domainId);
    fd.append('file', file);
    const res = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    return handle(res);
  },
  downloadDocument: async (doc) => {
    const res = await fetch(`${API_URL}/documents/${doc.id}/download`, { headers: headers(false) });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.originalName || 'material';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  deleteAllDocuments: async () => {
    const res = await fetch(
      `${API_URL}/documents/remove-all`,
      {
        method: 'DELETE',
        headers: headers(false),
      }
    );

    const body = await res.json();

    if (!res.ok) {
      throw new Error(
        body?.message || 'Failed to delete all documents'
      );
    }

    return body;
  },

  previewDocument: async (doc) => {
    const res = await fetch(
      `${API_URL}/documents/${doc.id}/preview`,
      {
        headers: headers(false),
        redirect: 'follow',
      }
    );

    if (!res.ok) {
      let message = `Preview failed (${res.status})`;

      try {
        const body = await res.json();
        message = body?.message || message;
      } catch { }

      throw new Error(message);
    }

    return res.url;
  },

  submitPptSubmission: (domainId, exerciseName, googleDriveLink) =>
    post('/ppt-submissions', {
      domainId,
      exerciseName,
      googleDriveLink,
    }),

  getEmployeePptSubmissions: (employeeId) =>
    get(`/ppt-submissions/employee/${employeeId}`),

  createMaterialLink: ({ title, description, domainId, type, url, html }) =>
    post('/documents/link', { title, description, domainId, type, url, html }),

  previewUrl: (id) => `${API_URL}/documents/${id}/preview`,

  createChecklist: (title, documentId, items) => post('/checklists', { title, documentId, items }),
  checklistsForDocument: (documentId) => get(`/checklists/by-document/${documentId}`),
  deleteChecklist: (id) => del(`/checklists/${id}`),
  myChecklistResponse: (id) => get(`/checklists/${id}/my-response`),
  saveChecklistResponse: (id, responses) => put(`/checklists/${id}/my-response`, { responses }),

  writeupsForDocument: (documentId) => get(`/writeups/by-document/${documentId}`),
  deleteWriteup: (id) => del(`/writeups/${id}`),
  myWriteupAnswer: (id) => get(`/writeups/${id}/my-answer`),
  saveWriteupAnswer: (id, answers) => put(`/writeups/${id}/my-answer`, { answers }),
  writeupForDomain: (domainId) => get(`/writeups/domain/${domainId}`),
  createWriteup: (title, domainId, questions) => post('/writeups', { title, domainId, questions }),
  deleteWriteup: (id) => del(`/writeups/${id}`),

  myProgress: () => get('/tracking/me'),

  getNotificationPublicKey: () =>
    get('/notifications/public-key'),

  subscribeNotifications: (subscription) =>
    post('/notifications/subscribe', { subscription }),

  unsubscribeNotifications: (endpoint) =>
    post('/notifications/unsubscribe', { endpoint }),

  listNotifications: () =>
    get('/notifications'),

  markNotificationRead: (id) =>
    patch(`/notifications/${id}/read`, {}),

  markAllNotificationsRead: () =>
    patch('/notifications/read-all', {}),

  employeeProgress: (id) => get(`/tracking/employee/${id}`),
  cohort: () => get('/tracking/cohort'),

  assistantChat: (message, history = [], liveData = {}) =>
    post('/assistant/chat', {
      message,
      history,
      liveData,
    }),

  listQuestions: () => get('/qa/questions'),
  getQuestion: (id) => get(`/qa/questions/${id}`),
  createQuestion: (title, body) => post('/qa/questions', { title, body }),
  createAnswer: (id, body) => post(`/qa/questions/${id}/answers`, { body }),
  deleteQuestion: (id) => del(`/qa/que  stions/${id}`),
  deleteAnswer: (id) => del(`/qa/answers/${id}`),

  checklistForDomain: (domainId) => get(`/checklists/domain/${domainId}`),
  updateChecklist: (id, title, items) => put(`/checklists/${id}`, { title, items }),
  deleteChecklist: (id) => del(`/checklists/${id}`),
  createChecklist: (title, domainId, items) => post('/checklists', { title, domainId, items }),

  listAudit: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return get(`/audit${qs ? `?${qs}` : ''}`);
  },
  logAuditEvent: (payload) => post('/audit/event', payload),
  auditInsights: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return get(`/audit/insights${qs ? `?${qs}` : ''}`);
  },

  updateChecklist: (id, title, items) => put(`/checklists/${id}`, { title, items }),
  updateWriteup: (id, title, questions) => put(`/writeups/${id}`, { title, questions }),

  createBU: (name, email, password, employeeCode, categoryId) => post('/users/bus', { name, email, password, employeeCode, categoryId }),
  listBUs: () => get('/users/bus'),
  createCTO: (name, email, password, employeeCode) => post('/users/ctos', { name, email, password, employeeCode }),
  listCTOs: () => get('/users/ctos'),
  getOverview: (categoryId) => get(`/overview${categoryId ? `?category=${categoryId}` : ''}`),
  exportEngineers: () => get('/tracking/export/engineers'),
  updateMyMenu: (menuConfig) => patch('/users/me/menu', { menuConfig }),
  listCategories: () => get('/categories'),
  createCategory: (name, description) => post('/categories', { name, description }),
  deleteCategory: (id) => del(`/categories/${id}`),


  listTrash: (entity) => get(`/trash${entity ? `?entity=${encodeURIComponent(entity)}` : ''}`),
  restoreTrash: (id) => post(`/trash/${id}/restore`, {}),
  purgeTrash: (id) => del(`/trash/${id}`),
};

export function uid(o) {
  return (o && (o.id || o._id)) ? (o.id || o._id).toString() : '';
}
