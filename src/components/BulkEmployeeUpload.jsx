import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';
import { Badge, Button, Modal, Spinner } from './ui';
import { useToast } from './Toast';

const TEMPLATE_FILE = 'Engineer_Bulk_Upload_Template.xlsx';

const COLUMNS = [
  ['name', ['full name', 'name']],
  ['email', ['email']],
  ['employeeCode', ['employee id', 'employee code', 'lsid']],
  ['password', ['temporary password', 'password']],
  ['trainerCode', ['trainer employee id', 'trainer id', 'trainer']],
  ['benchStart', ['bench start date', 'bench start']],
  ['status', ['status', 'job status']],
  ['contactNumber', ['contact number', 'contact', 'phone']],
  ['preferredLocation', ['preferred location', 'location']],
  ['skills', ['skills']],
];

const normHeader = (h) => String(h || '').toLowerCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim();

const pad = (n) => String(n).padStart(2, '0');

function toDateText(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? `${d.y}-${pad(d.m)}-${pad(d.d)}` : String(v);
  }
  return String(v).trim();
}

function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === 'employees') || wb.SheetNames[0];
  const grid = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: '' });
  const headerIdx = grid.findIndex((r) => r.some((c) => normHeader(c) === 'email'));
  if (headerIdx < 0) throw new Error('Could not find the header row. Please use the template.');

  const headers = grid[headerIdx].map(normHeader);
  const colIndex = {};
  COLUMNS.forEach(([key, names]) => {
    const i = headers.findIndex((h) => names.includes(h));
    if (i >= 0) colIndex[key] = i;
  });
  ['name', 'email', 'employeeCode'].forEach((k) => {
    if (colIndex[k] == null) throw new Error('The file is missing the Full Name, Email or Employee ID column.');
  });

  const rows = [];
  grid.slice(headerIdx + 1).forEach((r, i) => {
    if (!r.some((c) => String(c).trim() !== '')) return;
    const row = { row: headerIdx + i + 2 };
    COLUMNS.forEach(([key]) => {
      const v = colIndex[key] != null ? r[colIndex[key]] : '';
      row[key] = key === 'benchStart' ? toDateText(v) : v instanceof Date ? toDateText(v) : String(v ?? '').trim();
    });
    rows.push(row);
  });
  return rows;
}

function downloadTemplate() {
  const a = document.createElement('a');
  a.href = `/${TEMPLATE_FILE}`;
  a.download = TEMPLATE_FILE;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function BulkEmployeeUpload({ onClose, onDone, needsBU = false, buOptions = null }) {
  const { toast, toastError } = useToast();
  const [bus, setBus] = useState([]);
  const [businessUnit, setBusinessUnit] = useState('');

  useEffect(() => {
    if (buOptions) setBus(buOptions);
    else if (needsBU) api.listBUs().then((r) => setBus(r.bus || [])).catch(() => {});
  }, [needsBU, buOptions]);
  const input = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const pickFile = async (file) => {
    if (!file) return;
    if (needsBU && !businessUnit) {
      toastError('Please select a Business Unit first');
      if (input.current) input.current.value = '';
      return;
    }
    setPreview(null);
    setResult(null);
    setFileName(file.name);
    setBusy(true);
    try {
      const parsed = parseWorkbook(await file.arrayBuffer());
      if (!parsed.length) throw new Error('The file has no engineer rows.');
      if (parsed.length > 300) throw new Error('Upload at most 300 engineers per file.');
      setRows(parsed);
      setPreview(await api.bulkRegisterEmployees(parsed, true, businessUnit || undefined));
    } catch (e) {
      toastError(e);
      setRows([]);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const register = async () => {
    setBusy(true);
    try {
      const res = await api.bulkRegisterEmployees(rows, false, businessUnit || undefined);
      setResult(res);
      toast(`${res.created} engineer(s) registered`);
      if (res.created) onDone && onDone();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const downloadResults = () => {
    const data = (result || preview).results.map((r) => ({
      Row: r.row,
      'Full Name': r.name,
      Email: r.email,
      'Employee ID': r.employeeCode,
      Result: r.status === 'created' ? 'Registered' : r.status === 'valid' ? 'Ready' : 'Not registered',
      'Login Password': r.password || '',
      Errors: (r.errors || []).join('; '),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 6 }, { wch: 24 }, { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `engineer_upload_results_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const view = result || preview;
  const statusBadge = (s) =>
    s === 'created' ? <Badge kind="success">Registered</Badge>
      : s === 'valid' ? <Badge kind="info">Ready</Badge>
      : <Badge kind="danger">{s === 'failed' ? 'Failed' : 'Error'}</Badge>;

  return (
    <Modal
      title="Bulk register engineers"
      onClose={onClose}
      footer={
        <>
          {view && <Button variant="ghost" onClick={downloadResults}>⬇ {result ? 'Download results & passwords' : 'Download error report'}</Button>}
          {preview && !result && (
            <Button variant="cyan" onClick={register} disabled={busy || !preview.valid}>
              {busy ? <Spinner sm /> : `Register ${preview.valid} engineer${preview.valid === 1 ? '' : 's'}`}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>{result ? 'Done' : 'Cancel'}</Button>
        </>
      }
    >
      <div className="card" style={{ padding: 14, marginBottom: 14, background: '#f8fafc' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>How it works</div>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
          <li>Download the template and fill one engineer per row.</li>
          <li>Upload it here. Every row is checked before anyone is registered.</li>
          <li>Register the valid rows, then download the results file with login passwords.</li>
        </ol>
        {needsBU && (
          <div className="field" style={{ marginTop: 12, marginBottom: 0, maxWidth: 360 }}>
            <label>Business Unit *</label>
            <select
              className="select"
              value={businessUnit}
              disabled={!!preview}
              onChange={(e) => setBusinessUnit(e.target.value)}
            >
              <option value="">— Select BU —</option>
              {bus.map((b) => (
                <option key={b.id || b._id} value={b.id || b._id}>
                  {b.name} {b.categoryName ? `(${b.categoryName})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="row gap-8" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={downloadTemplate}>📥 Download template</Button>
          <input ref={input} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => pickFile(e.target.files[0])} />
          <Button variant="cyan" size="sm" onClick={() => input.current && input.current.click()} disabled={busy}>
            {busy && !preview ? <Spinner sm /> : preview ? 'Choose another file' : '📤 Upload filled file'}
          </Button>
          {fileName && <span className="muted" style={{ fontSize: 12.5 }}>{fileName}</span>}
        </div>
      </div>

      {view && (
        <>
          <div className="row gap-8" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
            <Badge kind="neutral">{view.total} rows</Badge>
            {result ? (
              <>
                <Badge kind="success">{result.created} registered</Badge>
                {result.skipped > 0 && <Badge kind="danger">{result.skipped} not registered</Badge>}
              </>
            ) : (
              <>
                <Badge kind="success">{preview.valid} ready</Badge>
                {preview.invalid > 0 && <Badge kind="danger">{preview.invalid} with errors</Badge>}
              </>
            )}
          </div>
          {result && result.created > 0 && (
            <div style={{ fontSize: 12.5, color: '#b45309', marginBottom: 10 }}>
              Download the results file now. It contains the auto-generated passwords, which are not shown again.
            </div>
          )}
          <div className="table-wrap" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Row</th>
                  <th style={{ textAlign: 'left' }}>Name</th>
                  <th style={{ textAlign: 'left' }}>Email</th>
                  <th>Employee ID</th>
                  <th>Result</th>
                  <th style={{ textAlign: 'left' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {view.results.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td style={{ textAlign: 'left' }}>{r.name || '—'}</td>
                    <td style={{ textAlign: 'left' }}>{r.email || '—'}</td>
                    <td>{r.employeeCode || '—'}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td style={{ textAlign: 'left', whiteSpace: 'normal', color: r.errors && r.errors.length ? '#dc2626' : '#475569', fontSize: 12 }}>
                      {r.errors && r.errors.length ? r.errors.join('; ') : r.password ? `Password: ${r.password}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
