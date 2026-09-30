import * as XLSX from 'xlsx';

const MONTHS = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
  dec: 11, december: 11,
};

const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const norm = (h) => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const FIELD_HEADERS = [
  ['empId', ['empid', 'employeeid', 'lsid']],
  ['name', ['candidates', 'candidate', 'name', 'candidatename']],
  ['buCode', ['bu']],
  ['status', ['status']],
  ['clientName', ['clientname', 'client']],
  ['benchStart', ['benchstartdate', 'benchstart']],
  ['source', ['source']],
  ['doj', ['doj', 'dateofjoining']],
  ['expYears', ['expyears', 'exp', 'experience']],
  ['skill', ['skill', 'skills']],
  ['buOwner', ['buowner']],
  ['interviewRejects', ['interviewrejectreject', 'interviewreject', 'interviewrejects']],
  ['interviewRejectCount', ['noofintrejects', 'noofinterviewrejects']],
  ['screenRejects', ['screenreject', 'screenrejects']],
  ['screenRejectCount', ['noofscrrejects', 'noofscreenrejects']],
  ['locationPreference', ['locationpreference']],
  ['salesEffort', ['salesefforts', 'salesefforts', 'salesefort', 'saleseffort']],
  ['email', ['email', 'emailid']],
];

function parseHeaderDate(header) {
  const s = String(header || '').replace(/\n/g, ' ');
  const m = s.match(/(\d{1,2})\s*(?:st|nd|rd|th)?[\s,.-]*([A-Za-z]{3,9})\.?[\s,'-]*(\d{2,4})?/);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (month === undefined) return null;
  const day = Number(m[1]);
  if (day < 1 || day > 31) return null;
  let year = m[3] ? Number(m[3]) : null;
  if (year && year < 100) year += 2000;
  return { day, month, year };
}

function cellDate(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? ymd(d.y, d.m - 1, d.d) : '';
  }
  if (v instanceof Date) return ymd(v.getFullYear(), v.getMonth(), v.getDate());
  return String(v).trim();
}

export function parseBenchWorkbook(buffer) {
  const names = XLSX.read(buffer, { type: 'array', bookSheets: true }).SheetNames;
  const sheetName =
    names.find((n) => n.trim().toLowerCase() === 'bench') ||
    names.find((n) => n.toLowerCase().includes('bench') && !n.toLowerCase().includes('summary')) ||
    names[0];
  const wb = XLSX.read(buffer, { type: 'array', sheets: [sheetName], cellDates: false, dense: true });
  const grid = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: '' });
  const headerIdx = grid.findIndex((r) => r.some((c) => norm(c) === 'empid'));
  if (headerIdx < 0) throw new Error('Could not find the "EMP ID" header row in the Bench sheet.');
  const headers = grid[headerIdx];

  const col = {};
  headers.forEach((h, i) => {
    const n = norm(h);
    for (const [key, names] of FIELD_HEADERS) {
      if (col[key] == null && names.includes(n)) col[key] = i;
    }
  });
  if (col.empId == null || col.name == null) throw new Error('The Bench sheet must have "EMP ID" and "Candidates" columns.');

  const mapped = new Set(Object.values(col));
  const dated = [];
  headers.forEach((h, i) => {
    if (mapped.has(i)) return;
    const p = parseHeaderDate(h);
    if (p) dated.push({ i, ...p, header: String(h).trim() });
  });
  const withYear = dated.filter((d) => d.year);
  const newest = withYear.length
    ? withYear.reduce((a, b) => (new Date(b.year, b.month, b.day) > new Date(a.year, a.month, a.day) ? b : a))
    : { year: new Date().getFullYear(), month: 11, day: 31 };
  const newestDate = new Date(newest.year, newest.month, newest.day);
  const commentCols = dated.map((d) => {
    let year = d.year || newest.year;
    if (!d.year && new Date(year, d.month, d.day) > newestDate) year -= 1;
    return { i: d.i, header: d.header, date: ymd(year, d.month, d.day) };
  });

  const get = (r, key) => (col[key] == null ? '' : r[col[key]]);
  const rows = [];
  grid.slice(headerIdx + 1).forEach((r, k) => {
    const empId = String(get(r, 'empId') || '').trim();
    const name = String(get(r, 'name') || '').trim();
    if (!empId && !name) return;
    rows.push({
      row: headerIdx + k + 2,
      empId,
      name,
      buCode: String(get(r, 'buCode') || '').trim(),
      status: String(get(r, 'status') || '').trim(),
      clientName: String(get(r, 'clientName') || '').trim(),
      benchStart: cellDate(get(r, 'benchStart')),
      source: String(get(r, 'source') || '').trim(),
      doj: cellDate(get(r, 'doj')),
      expYears: get(r, 'expYears') === '' ? '' : Number(get(r, 'expYears')),
      skill: String(get(r, 'skill') || '').trim(),
      buOwner: String(get(r, 'buOwner') || '').trim(),
      interviewRejects: String(get(r, 'interviewRejects') || '').trim(),
      interviewRejectCount: get(r, 'interviewRejectCount') === '' ? 0 : Number(get(r, 'interviewRejectCount')) || 0,
      screenRejects: String(get(r, 'screenRejects') || '').trim(),
      screenRejectCount: get(r, 'screenRejectCount') === '' ? 0 : Number(get(r, 'screenRejectCount')) || 0,
      locationPreference: String(get(r, 'locationPreference') || '').trim(),
      salesEffort: String(get(r, 'salesEffort') || '').trim(),
      email: String(get(r, 'email') || '').trim(),
      comments: commentCols
        .map((c) => ({ date: c.date, text: String(r[c.i] ?? '').trim() }))
        .filter((c) => c.text),
    });
  });

  return {
    sheetName,
    rows,
    commentDates: commentCols.map((c) => c.date),
    buCodes: [...new Set(rows.map((r) => r.buCode).filter(Boolean))].sort(),
  };
}

const toDate = (v) => (v ? new Date(v) : '');
const fmtHeaderDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

function autoWidth(rows, min = 8, max = 60) {
  const widths = [];
  rows.forEach((r) =>
    r.forEach((v, i) => {
      const len = v instanceof Date ? 12 : String(v ?? '').split('\n')[0].length;
      widths[i] = Math.min(max, Math.max(widths[i] || min, len + 2));
    })
  );
  return widths.map((wch) => ({ wch }));
}

function benchSheet(records) {
  const dates = [...new Set(records.flatMap((r) => (r.comments || []).map((c) => String(c.date).slice(0, 10))))].sort().reverse();
  const head = [
    'Si No.', 'EMP ID', 'Candidates', 'BU', 'Business Unit', 'Status', 'Client Name', 'Bench Start Date', 'Source', 'DOJ',
    'Exp (years)', 'SKILL', 'Ageing (days)', 'BU Owner', 'Interview Reject', 'No. Of Int. Rejects', 'Screen Reject',
    'No. of Scr. Rejects', 'Location Preference', 'Sales Effort',
    ...dates.map(fmtHeaderDate),
  ];
  const body = records.map((r, i) => {
    const byDate = new Map((r.comments || []).map((c) => [String(c.date).slice(0, 10), c.text]));
    return [
      i + 1, r.empId, r.name, r.buCode, r.businessUnitName || '', r.status, r.clientName || '', toDate(r.benchStart), r.source || '',
      toDate(r.doj), r.expYears ?? '', r.skill || '', r.ageing ?? '', r.buOwner || '', r.interviewRejects || '',
      r.interviewRejectCount || 0, r.screenRejects || '', r.screenRejectCount || 0, r.locationPreference || '', r.salesEffort || '',
      ...dates.map((d) => byDate.get(d) || ''),
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([head, ...body], { cellDates: true, dateNF: 'dd-mmm-yyyy' });
  ws['!cols'] = autoWidth([head, ...body.slice(0, 50)]).map((c, i) => (i >= 20 ? { wch: 40 } : c));
  ws['!freeze'] = { xSplit: 3, ySplit: 1 };
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: body.length, c: head.length - 1 } }) };
  return ws;
}

function summaryRows(rep) {
  const rows = [];
  rows.push(['Summary of Bench', '', '', '', `Generated ${new Date().toLocaleString('en-IN')}`]);
  rows.push([]);
  rows.push(['', ...rep.buCodes, 'Total']);
  rep.matrix.forEach((m) => rows.push([m.label, ...m.cells, m.total]));
  rows.push([]);
  rows.push(['Experience Range Split']);
  rows.push(['BU', ...rep.expBuckets, 'Total']);
  rep.expSplit.forEach((e) => rows.push([e.bu, ...e.cells, e.total]));
  rows.push([]);
  rows.push(['Red Flags']);
  rows.push(['BU', 'Above 90 Days', '3+ Interview Rejects']);
  rep.redFlags.forEach((f) => rows.push([f.bu, f.over90, f.rejects3]));
  rows.push([]);
  rows.push(['BU / Skill Split']);
  rows.push(['BU', 'Skill', ...rep.expBuckets, 'Total']);
  rep.skills.forEach((s) => rows.push([s.bu, s.skill, ...s.cells, s.total]));
  rows.push([]);
  rows.push(['Sales Effort Towards Bench Profile Processing']);
  rows.push(['Sales code', 'Profiles worked', `Effort % (of ${rep.salesBase})`]);
  rep.sales.forEach((s) => rows.push([s.code, s.count, s.pct]));
  rows.push([]);
  rows.push(['Location Preference']);
  rep.locations.forEach((l) => rows.push([l.name, l.value]));
  return rows;
}

export function exportBenchWorkbook(records, report) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, benchSheet(records), 'Bench');
  if (report) {
    const ws = XLSX.utils.aoa_to_sheet(summaryRows(report));
    ws['!cols'] = [{ wch: 34 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Summary - Bench');
  }
  XLSX.writeFile(wb, `Bench_List_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportBenchReport(report, records) {
  const wb = XLSX.utils.book_new();
  const k = report.kpis;
  const overview = [
    [`Bench report — ${report.period.kind === 'month' ? 'Monthly' : 'Weekly'}`, report.period.label],
    [],
    ['On bench now', k.onBench],
    ['Open', k.open],
    ['Open - Under Training', k.underTraining],
    ['Pending Onboarding (PO)', k.pendingOnboarding],
    ['Yet To Offboard (YTO)', k.yetToOffboard],
    ['Resigned / Pending Exit', k.exits],
    ['Above 90 days on bench', k.over90],
    ['Average ageing (days)', k.avgAgeing],
    [],
    ['This period'],
    ['Joined bench', k.joinedInPeriod],
    ['Status changes', k.statusChangesInPeriod],
    ['Comments added', k.commentsInPeriod],
    ['Engineers updated', k.updatedInPeriod],
    ['Engineers with no update', k.notUpdatedInPeriod],
    [],
    ...summaryRows(report),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(overview);
  ws1['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Overview');

  const addSheet = (name, head, rows) => {
    const ws = XLSX.utils.aoa_to_sheet([head, ...rows], { cellDates: true, dateNF: 'dd-mmm-yyyy' });
    ws['!cols'] = autoWidth([head, ...rows.slice(0, 50)]);
    XLSX.utils.book_append_sheet(wb, ws, name);
  };
  addSheet('Comments', ['Date', 'EMP ID', 'Candidate', 'BU', 'Status', 'Comment', 'By'],
    report.comments.map((c) => [toDate(c.date), c.empId, c.name, c.buCode, c.status, c.text, c.byName]));
  addSheet('Status changes', ['When', 'EMP ID', 'Candidate', 'BU', 'Field', 'From', 'To', 'By'],
    report.changes.map((c) => [toDate(c.at), c.empId, c.name, c.buCode, c.field, c.from, c.to, c.byName]));
  addSheet('Joined bench', ['EMP ID', 'Candidate', 'BU', 'Bench Start', 'Skill', 'Status'],
    report.joined.map((j) => [j.empId, j.name, j.buCode, toDate(j.benchStart), j.skill, j.status]));
  addSheet('No update', ['EMP ID', 'Candidate', 'BU', 'Status', 'Ageing (days)', 'Last update'],
    report.notUpdated.map((n) => [n.empId, n.name, n.buCode, n.status, n.ageing, toDate(n.lastUpdate)]));
  addSheet('Trend', ['Period', 'On bench', 'Joined', 'Moved off bench', 'Comments'],
    report.trend.map((t) => [t.period, t.onBench, t.joined, t.movedOff, t.comments]));
  if (records) XLSX.utils.book_append_sheet(wb, benchSheet(records), 'Bench list');
  XLSX.writeFile(wb, `Bench_Report_${report.period.kind}_${String(report.period.start).slice(0, 10)}.xlsx`);
}

export function downloadImportResults(results) {
  const rows = results.map((r) => ({
    Row: r.row,
    'EMP ID': r.empId,
    Candidate: r.name,
    BU: r.buCode,
    'Business Unit': r.buName,
    Result: r.action,
    'Login ID': r.login || '',
    'Temporary password': r.password || '',
    Errors: (r.errors || []).join('; '),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 28 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import results');
  XLSX.writeFile(wb, `Bench_import_results_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
