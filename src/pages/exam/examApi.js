const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'ls_exam_attempt_token';

export const attemptSession = {
  token: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token, candidateId) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    if (candidateId) sessionStorage.setItem('ls_exam_candidate_id', candidateId);
  },
  candidateId: () => sessionStorage.getItem('ls_exam_candidate_id'),
  clear: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem('ls_exam_candidate_id');
  },
};

async function request(path, { method = 'GET', body, attempt = false, keepalive = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (attempt) {
    const t = attemptSession.token();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, keepalive });
  } catch {
    throw Object.assign(new Error('Network problem. Please check your internet connection.'), { network: true });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status, data });
  return data;
}

export const examApi = {
  list: () => request('/exam/public/exams'),
  exam: (id) => request(`/exam/public/exams/${id}`),
  register: (body) => request('/exam/public/register', { method: 'POST', body }),
  instructions: (id) => request(`/exam/attempts/${id}/instructions`, { attempt: true }),
  start: (id) => request(`/exam/attempts/${id}/start`, { method: 'POST', body: {}, attempt: true }),
  paper: (id) => request(`/exam/attempts/${id}/paper`, { attempt: true }),
  save: (id, body) => request(`/exam/attempts/${id}/answers`, { method: 'PUT', body, attempt: true }),
  status: (id) => request(`/exam/attempts/${id}/status`, { attempt: true }),
  violation: (id, body) => request(`/exam/attempts/${id}/violation`, { method: 'POST', body, attempt: true }),
  result: (id) => request(`/exam/attempts/${id}/result`, { attempt: true }),
  submit: (id) => request(`/exam/attempts/${id}/submit`, { method: 'POST', body: {}, attempt: true }),
};
