const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const token = () =>localStorage.getItem('exam_admin_token');

// path is relative to /api/exam/, e.g. 'admin/exams' or 'results'
// export async function adminRequest(path, { method = 'GET', body } = {}) {
//   const t = token();
//   let res;
//   try {
//     res = await fetch(`${API}/exam/${path}`, {
//       method,
//       headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
//       body: body ? JSON.stringify(body) : undefined,
//     });
//   } catch {
//     throw new Error('Cannot reach the server. Check your connection.');
//   }
//   const data = await res.json().catch(() => ({}));
//   if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status });
//   return data;
// }

export async function adminRequest(
  path,
  { method = 'GET', body } = {}
) {
  const token = localStorage.getItem('exam_admin_token');

  const response = await fetch(`${API}/exam/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

// Authenticated CSV download (a plain <a href> cannot send the bearer token).
export async function downloadFile(path, filename) {
  const res = await fetch(`${API}/exam/${path}`, { headers: token() ? { Authorization: `Bearer ${token()}` } : {} });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.message || 'Download failed');
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function uploadImage(file) {
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(`${API}/exam/admin/upload`, { method: 'POST', headers: token() ? { Authorization: `Bearer ${token()}` } : {}, body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Upload failed');
  return data.url;
}



export async function adminUpload(path, file, query = '') {
  const token = localStorage.getItem('exam_admin_token');
  const fd = new FormData();

  fd.append('file', file);

  const response = await fetch(
    `${API}/exam/${path}${query}`,
    {
      method: 'POST',
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
      body: fd,
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Excel upload failed');
    error.data = data;
    error.status = response.status;
    throw error;
  }

  return data;
}
