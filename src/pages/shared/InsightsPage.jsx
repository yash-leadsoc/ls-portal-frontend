import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { Badge, Button, Empty, LoadingPage, Modal, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';

const COLORS = ['#08a6c7', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#94a3b8'];
const NAVY = '#102a56';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'workforce', label: 'Workforce & Skills' },
  { key: 'training', label: 'Training' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'activity', label: 'Activity' },
  { key: 'audit', label: 'Audit logs' },
  { key: 'logins', label: 'Logins' },
  { key: 'errors', label: 'API errors' },
  { key: 'requests', label: 'Changes' },
  { key: 'performance', label: 'Performance' },
  { key: 'database', label: 'Database' },
  { key: 'system', label: 'System logs' },
  { key: 'alerts', label: 'Alerts' },
];

const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN'));
const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtAgo = (d) => {
  if (!d) return 'Never';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
};
const fmtUptime = (s) => {
  if (!s) return '—';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
};

function Kpi({ label, value, sub, tone }) {
  const color = tone === 'bad' ? '#dc2626' : tone === 'warn' ? '#d97706' : tone === 'good' ? '#059669' : NAVY;
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#475569', marginTop: 2 }}>{label}</div>
      {sub ? <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div> : null}
    </div>
  );
}

function KpiGrid({ children }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 12, marginBottom: 16 }}>
      {children}
    </div>
  );
}

function ChartCard({ title, height = 250, children, wide }) {
  return (
    <div className="card" style={{ padding: 16, gridColumn: wide ? '1 / -1' : undefined }}>
      <div style={{ fontSize: 13, fontWeight: 750, color: NAVY, marginBottom: 10 }}>{title}</div>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

function Charts({ children }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14, marginBottom: 16 }}>
      {children}
    </div>
  );
}

function Panel({ title, children, wide, right }) {
  return (
    <div className="card" style={{ padding: 16, gridColumn: wide ? '1 / -1' : undefined }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 750, color: NAVY }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Table({ columns, rows, empty = 'No data yet.', onRow }) {
  if (!rows || !rows.length) return <div className="muted" style={{ fontSize: 13, padding: 8 }}>{empty}</div>;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} style={{ textAlign: c.align || 'left' }}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r._id || r.id || i} onClick={onRow ? () => onRow(r) : undefined} style={{ cursor: onRow ? 'pointer' : undefined }}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align || 'left', whiteSpace: c.wrap ? 'normal' : 'nowrap', maxWidth: c.wrap ? 420 : undefined }}>
                  {c.render ? c.render(r) : r[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PieBlock({ data }) {
  return (
    <PieChart>
      <Pie data={data} dataKey="value" nameKey="name" outerRadius={85} label={(e) => (e.value ? e.name : '')}>
        {(data || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
      </Pie>
      <Tooltip />
    </PieChart>
  );
}

function BarBlock({ data, x = 'name', y = 'value', color = COLORS[0], vertical }) {
  if (vertical) {
    return (
      <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
        <XAxis type="number" fontSize={11} allowDecimals={false} />
        <YAxis type="category" dataKey={x} width={120} fontSize={11} />
        <Tooltip />
        <Bar dataKey={y} fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    );
  }
  return (
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={x} fontSize={11} />
      <YAxis fontSize={11} allowDecimals={false} />
      <Tooltip />
      <Bar dataKey={y} fill={color} radius={[4, 4, 0, 0]} />
    </BarChart>
  );
}

const severityKind = (s) => (s === 'critical' ? 'danger' : s === 'warning' ? 'warning' : 'info');

function OverviewTab({ d }) {
  const w = d.workforce.kpis;
  const a = d.activity.kpis;
  const h = d.health;
  const t = d.training.kpis;
  const iv = d.interviews.kpis;
  return (
    <>
      <KpiGrid>
        <Kpi label="Engineers" value={fmtNum(w.totalEngineers)} sub={`${w.businessUnits} BUs · ${w.trainers} trainers`} />
        <Kpi label="On bench" value={fmtNum(w.bench)} sub={`${w.benchRate}% · avg ${w.avgBenchDays} days`} tone={w.benchRate > 60 ? 'warn' : undefined} />
        <Kpi label="Deployed" value={fmtNum(w.deployed)} sub={`${w.deploymentRate}% deployment rate`} tone="good" />
        <Kpi label="Online now" value={fmtNum(a.onlineNow)} sub={`${a.activeToday} active today`} />
        <Kpi label="Weekly active" value={fmtNum(a.activeWeek)} sub={`${a.activeMonth} monthly · ${a.stickiness}% daily/monthly`} />
        <Kpi label="Inactive 7+ days" value={fmtNum(a.inactiveEngineers7d)} sub="engineers" tone={a.inactiveEngineers7d ? 'warn' : undefined} />
        <Kpi label="Avg mock score" value={`${iv.avgMockScore}/10`} sub={`${iv.passRate}% scored 7+`} />
        <Kpi label="Client selection rate" value={`${iv.selectionRate}%`} sub={`${iv.clientSelected} selected of ${iv.clientSubmissions}`} />
        <Kpi label="Learning today" value={fmtNum(t.learningToday)} sub={`avg streak ${t.avgStreak} days`} />
        <Kpi label="Requests (24h)" value={fmtNum(h.requests24h)} sub={`avg ${h.avgResponseMs} ms`} />
        <Kpi label="Server error rate" value={`${h.errorRate}%`} sub={`${h.serverErrors24h} errors in 24h`} tone={h.errorRate > 2 ? 'bad' : 'good'} />
        <Kpi label="Failed logins (24h)" value={fmtNum(a.failedLogins24h)} tone={a.failedLogins24h > 20 ? 'warn' : undefined} />
        <Kpi label="Database used" value={h.dbUsedPct == null ? '—' : `${h.dbUsedPct}%`} sub={h.dbUsedMb != null ? `${h.dbUsedMb} MB` : ''} tone={h.dbUsedPct > 80 ? 'bad' : undefined} />
        <Kpi label="Open alerts" value={fmtNum(h.openAlerts)} tone={h.openAlerts ? 'bad' : 'good'} sub={`uptime ${fmtUptime(h.uptimeSec)}`} />
      </KpiGrid>
      <Charts>
        <ChartCard title={`Portal usage — last ${d.days} days`} wide>
          <LineChart data={d.activity.trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={11} />
            <YAxis fontSize={11} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="activeUsers" name="Active users" stroke={COLORS[0]} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="logins" name="Logins" stroke={COLORS[1]} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="failedLogins" name="Failed logins" stroke={COLORS[4]} strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>
        <ChartCard title="Engineers by status"><PieBlock data={d.workforce.byStatus} /></ChartCard>
        <ChartCard title="Bench aging"><BarBlock data={d.workforce.benchAging} color={COLORS[3]} /></ChartCard>
        <ChartCard title="Client interview pipeline"><BarBlock data={d.interviews.clientPipeline} color={COLORS[1]} /></ChartCard>
        <ChartCard title="Top skills"><BarBlock data={d.skills.topSkills.slice(0, 8)} vertical color={COLORS[2]} /></ChartCard>
      </Charts>
    </>
  );
}

function WorkforceTab({ d }) {
  const w = d.workforce;
  const s = d.skills;
  return (
    <>
      <KpiGrid>
        <Kpi label="Active engineers" value={fmtNum(w.kpis.totalEngineers)} sub={`${w.kpis.inactiveAccounts} deactivated accounts`} />
        <Kpi label="On training" value={fmtNum(w.kpis.onTraining)} />
        <Kpi label="Ongoing interview" value={fmtNum(w.kpis.ongoingInterview)} />
        <Kpi label="Deployed" value={fmtNum(w.kpis.deployed)} tone="good" />
        <Kpi label="Average bench time" value={`${w.kpis.avgBenchDays} days`} tone={w.kpis.avgBenchDays > 60 ? 'warn' : undefined} />
        <Kpi label="Distinct skills" value={fmtNum(s.distinctSkills)} />
        <Kpi label="No skills listed" value={fmtNum(s.withoutSkills)} tone={s.withoutSkills ? 'warn' : undefined} />
        <Kpi label="No domain assigned" value={fmtNum(s.withoutDomains)} tone={s.withoutDomains ? 'warn' : undefined} />
      </KpiGrid>
      <Charts>
        <ChartCard title="Engineers by business unit" wide>
          <BarChart data={w.byBU}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={11} />
            <YAxis fontSize={11} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="bench" name="Bench" stackId="a" fill={COLORS[3]} />
            <Bar dataKey="deployed" name="Deployed" stackId="a" fill={COLORS[2]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Engineers by category"><PieBlock data={w.byCategory} /></ChartCard>
        <ChartCard title="New joiners (last 6 months)"><BarBlock data={w.newJoiners} x="month" /></ChartCard>
        <ChartCard title="Skill distribution (top 25)" height={Math.max(250, s.topSkills.length * 22)} wide>
          <BarBlock data={s.topSkills} vertical color={COLORS[1]} />
        </ChartCard>
        <ChartCard title="Engineers per learning domain"><BarBlock data={s.domainAssignments} vertical color={COLORS[6]} /></ChartCard>
        <ChartCard title="Preferred locations"><PieBlock data={s.locations} /></ChartCard>
      </Charts>
      <Panel title="Longest on bench" wide>
        <Table
          rows={w.longestBench}
          columns={[
            { key: 'name', label: 'Engineer', render: (r) => <b>{r.name}</b> },
            { key: 'code', label: 'Code' },
            { key: 'bu', label: 'Business unit' },
            { key: 'status', label: 'Status', render: (r) => <Badge kind="warning">{r.status.replace('_', ' ')}</Badge> },
            { key: 'days', label: 'Days on bench', align: 'right', render: (r) => <b style={{ color: r.days > 90 ? '#dc2626' : NAVY }}>{r.days}</b> },
          ]}
        />
      </Panel>
    </>
  );
}

function TrainingTab({ d }) {
  const t = d.training;
  const k = t.kpis;
  const learnerCols = [
    { key: 'name', label: 'Engineer', render: (r) => <b>{r.name}</b> },
    { key: 'reviews', label: 'Materials', align: 'right' },
    { key: 'exercises', label: 'Exercises', align: 'right' },
    { key: 'writeupAnswers', label: 'Write-up answers', align: 'right' },
    { key: 'streak', label: 'Streak', align: 'right' },
    { key: 'points', label: 'Score', align: 'right', render: (r) => <b>{r.points}</b> },
  ];
  return (
    <>
      <KpiGrid>
        <Kpi label="Materials" value={fmtNum(k.materials)} sub={`${fmtNum(k.materialReviews)} reviews`} />
        <Kpi label="Exercises" value={fmtNum(k.exercises)} sub={`${fmtNum(k.exercisesCompleted)} completed`} />
        <Kpi label="Write-ups" value={fmtNum(k.writeups)} sub={`${fmtNum(k.writeupAnswers)} answers`} />
        <Kpi label="Checklists" value={fmtNum(k.checklists)} sub={`${k.checklistStarted} engineers started`} />
        <Kpi label="Checklist items tried" value={`${k.checklistTriedRate}%`} />
        <Kpi label="Checklist items understood" value={`${k.checklistUnderstoodRate}%`} />
        <Kpi label="Avg proficiency" value={k.avgProficiency} />
        <Kpi label="No progress yet" value={fmtNum(k.noProgress)} sub="engineers" tone={k.noProgress ? 'warn' : 'good'} />
      </KpiGrid>
      <Charts>
        <ChartCard title="Material completion by domain (%)" wide height={Math.max(250, t.domainProgress.length * 26)}>
          <BarBlock data={t.domainProgress} y="completion" vertical color={COLORS[2]} />
        </ChartCard>
      </Charts>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 14 }}>
        <Panel title="Domain progress" wide>
          <Table
            rows={t.domainProgress}
            columns={[
              { key: 'name', label: 'Domain', render: (r) => <b>{r.name}</b> },
              { key: 'engineers', label: 'Engineers', align: 'right' },
              { key: 'materials', label: 'Materials', align: 'right' },
              { key: 'reviews', label: 'Reviews', align: 'right' },
              { key: 'completion', label: 'Completion', align: 'right', render: (r) => `${r.completion}%` },
            ]}
          />
        </Panel>
        <Panel title="Top learners"><Table rows={t.topLearners} columns={learnerCols} /></Panel>
        <Panel title="Least engaged"><Table rows={t.lowEngagement} columns={learnerCols} /></Panel>
      </div>
    </>
  );
}

function InterviewsTab({ d }) {
  const iv = d.interviews;
  const k = iv.kpis;
  const trend = iv.mockTrend.map((m, i) => ({ week: m.week, mocks: m.value, clients: (iv.clientTrend[i] || {}).value || 0 }));
  return (
    <>
      <KpiGrid>
        <Kpi label="Mock interviews" value={fmtNum(k.mocksTotal)} sub={`${k.mocksUpcoming} upcoming`} />
        <Kpi label="Completed" value={fmtNum(k.mocksCompleted)} tone="good" />
        <Kpi label="Cancelled" value={fmtNum(k.mocksCancelled)} />
        <Kpi label="Avg mock score" value={`${k.avgMockScore}/10`} />
        <Kpi label="Pass rate (7+)" value={`${k.passRate}%`} />
        <Kpi label="Client submissions" value={fmtNum(k.clientSubmissions)} sub={`${k.clientInProgress} in progress`} />
        <Kpi label="Selected" value={fmtNum(k.clientSelected)} tone="good" />
        <Kpi label="Selection rate" value={`${k.selectionRate}%`} sub={`${k.clientRejected} not selected`} />
      </KpiGrid>
      <Charts>
        <ChartCard title="Interviews per week (last 12 weeks)" wide>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" fontSize={11} />
            <YAxis fontSize={11} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="mocks" name="Mock interviews" stroke={COLORS[0]} strokeWidth={2} />
            <Line type="monotone" dataKey="clients" name="Client submissions" stroke={COLORS[1]} strokeWidth={2} />
          </LineChart>
        </ChartCard>
        <ChartCard title="Mock score distribution"><BarBlock data={iv.scoreDistribution} color={COLORS[2]} /></ChartCard>
        <ChartCard title="Mock interview status"><PieBlock data={iv.mockStatus} /></ChartCard>
        <ChartCard title="Client pipeline"><BarBlock data={iv.clientPipeline} color={COLORS[1]} /></ChartCard>
        <ChartCard title="Most common target roles"><BarBlock data={iv.topRoles} vertical color={COLORS[5]} /></ChartCard>
      </Charts>
      <Panel title="Top clients">
        <Table
          rows={iv.topClients}
          columns={[
            { key: 'name', label: 'Client', render: (r) => <b>{r.name}</b> },
            { key: 'sent', label: 'Profiles sent', align: 'right' },
            { key: 'selected', label: 'Selected', align: 'right' },
            { key: 'rate', label: 'Hit rate', align: 'right', render: (r) => `${r.sent ? Math.round((r.selected / r.sent) * 100) : 0}%` },
          ]}
        />
      </Panel>
    </>
  );
}

function ActivityTab({ days }) {
  const { toastError } = useToast();
  const [d, setD] = useState(null);
  useEffect(() => {
    setD(null);
    api.insightsActivity(days).then(setD).catch((e) => { toastError(e); setD({ error: true }); });
  }, [days]);
  if (!d) return <LoadingPage />;
  if (d.error) return <Empty>Could not load activity.</Empty>;
  const k = d.kpis;
  return (
    <>
      <KpiGrid>
        <Kpi label="Online now" value={fmtNum(k.onlineNow)} />
        <Kpi label="Active today" value={fmtNum(k.activeToday)} />
        <Kpi label="Active this week" value={fmtNum(k.activeWeek)} />
        <Kpi label="Active this month" value={fmtNum(k.activeMonth)} />
        <Kpi label="Daily / monthly" value={`${k.stickiness}%`} sub="engagement" />
        <Kpi label="Inactive engineers" value={fmtNum(k.inactiveEngineers7d)} sub="no activity 7+ days" tone={k.inactiveEngineers7d ? 'warn' : 'good'} />
      </KpiGrid>
      <Charts>
        <ChartCard title="Daily usage" wide>
          <AreaChart data={d.trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={11} />
            <YAxis fontSize={11} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="pageViews" name="Page views" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.15} />
            <Area type="monotone" dataKey="activeUsers" name="Active users" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.25} />
          </AreaChart>
        </ChartCard>
        <ChartCard title="Time spent in portal (hours per day)"><BarBlock data={d.trend} x="date" y="hours" color={COLORS[2]} /></ChartCard>
        <ChartCard title="Changes made by hour of day"><BarBlock data={d.byHour} x="hour" color={COLORS[3]} /></ChartCard>
        <ChartCard title="Most frequent actions"><BarBlock data={d.topActions} vertical color={COLORS[5]} /></ChartCard>
        <ChartCard title="Active users by role"><BarBlock data={d.byRole} y="users" color={COLORS[6]} /></ChartCard>
      </Charts>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 14 }}>
        <Panel title="Most used pages">
          <Table
            rows={d.topPages}
            columns={[
              { key: 'path', label: 'Page', render: (r) => <code>{r.path}</code> },
              { key: 'views', label: 'Views', align: 'right' },
              { key: 'users', label: 'Users', align: 'right' },
              { key: 'minutes', label: 'Minutes', align: 'right' },
            ]}
          />
        </Panel>
        <Panel title="Most active users">
          <Table
            rows={d.topUsers}
            columns={[
              { key: 'name', label: 'User', render: (r) => <b>{r.name}</b> },
              { key: 'role', label: 'Role' },
              { key: 'days', label: 'Active days', align: 'right' },
              { key: 'views', label: 'Views', align: 'right' },
              { key: 'minutes', label: 'Minutes', align: 'right' },
            ]}
          />
        </Panel>
        <Panel title={`Online now (${d.online.length})`}>
          <Table
            rows={d.online}
            empty="Nobody is online right now."
            columns={[
              { key: 'name', label: 'User', render: (r) => <b>{r.name}</b> },
              { key: 'role', label: 'Role' },
              { key: 'lastSeen', label: 'Last seen', render: (r) => fmtAgo(r.lastSeen) },
            ]}
          />
        </Panel>
        <Panel title="Inactive engineers (7+ days)">
          <Table
            rows={d.inactive}
            empty="Everyone has been active this week."
            columns={[
              { key: 'name', label: 'Engineer', render: (r) => <b>{r.name}</b> },
              { key: 'code', label: 'Code' },
              { key: 'lastActiveAt', label: 'Last active', render: (r) => fmtAgo(r.lastActiveAt) },
              { key: 'lastLoginAt', label: 'Last login', render: (r) => fmtDate(r.lastLoginAt) },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}

const statusKind = (s) => (s >= 500 ? 'danger' : s >= 400 ? 'warning' : 'success');

const LOG_CONFIG = {
  audit: {
    title: 'Audit log — who did what, and when',
    filters: [
      { key: 'action', label: 'Action', options: ['', 'login', 'login.failed', 'logout', 'create', 'update', 'delete', 'restore', 'permanent-delete', 'submit', 'assign', 'password.change', 'writeup.focus_lost'] },
      { key: 'role', label: 'Role', options: ['', 'admin', 'cto', 'bu', 'manager', 'employee'] },
    ],
    columns: [
      { key: 'createdAt', label: 'When', render: (r) => fmtDate(r.createdAt) },
      { key: 'actorName', label: 'User', render: (r) => <b>{r.actorName || '—'}</b> },
      { key: 'actorRole', label: 'Role' },
      { key: 'action', label: 'Action', render: (r) => <Badge kind={r.action.includes('delete') || r.action.includes('failed') ? 'danger' : r.action === 'create' ? 'success' : 'neutral'}>{r.action}</Badge> },
      { key: 'entity', label: 'Item type' },
      { key: 'entityLabel', label: 'Item', wrap: true },
      { key: 'ip', label: 'IP' },
    ],
  },
  logins: {
    title: 'Login activity',
    filters: [
      { key: 'action', label: 'Result', options: ['', 'login', 'login.failed', 'logout'] },
      { key: 'role', label: 'Role', options: ['', 'admin', 'cto', 'bu', 'manager', 'employee'] },
    ],
    columns: [
      { key: 'createdAt', label: 'When', render: (r) => fmtDate(r.createdAt) },
      { key: 'actorName', label: 'User / ID tried', render: (r) => <b>{r.actorName || r.entityLabel}</b> },
      { key: 'actorRole', label: 'Role' },
      { key: 'action', label: 'Result', render: (r) => <Badge kind={r.action === 'login' ? 'success' : r.action === 'logout' ? 'neutral' : 'danger'}>{r.action === 'login' ? 'Success' : r.action === 'logout' ? 'Logout' : 'Failed'}</Badge> },
      { key: 'reason', label: 'Reason', render: (r) => (r.meta && r.meta.reason) || '' },
      { key: 'ip', label: 'IP' },
      { key: 'userAgent', label: 'Browser / device', wrap: true, render: (r) => <span className="muted" style={{ fontSize: 11.5 }}>{r.userAgent}</span> },
    ],
  },
  errors: {
    title: 'API errors',
    filters: [
      { key: 'status', label: 'Status', options: ['', '4xx', '5xx', '400', '401', '403', '404', '413', '429', '500'] },
      { key: 'method', label: 'Method', options: ['', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
    ],
    columns: [
      { key: 'at', label: 'When', render: (r) => fmtDate(r.at) },
      { key: 'status', label: 'Status', render: (r) => <Badge kind={statusKind(r.status)}>{r.status}</Badge> },
      { key: 'method', label: 'Method' },
      { key: 'route', label: 'Endpoint', render: (r) => <code>{r.route}</code> },
      { key: 'error', label: 'Error', wrap: true },
      { key: 'userName', label: 'User' },
      { key: 'ms', label: 'Time', align: 'right', render: (r) => `${r.ms} ms` },
    ],
  },
  requests: {
    title: 'All changes (every create, update and delete request)',
    filters: [
      { key: 'method', label: 'Method', options: ['', 'POST', 'PUT', 'PATCH', 'DELETE'] },
      { key: 'role', label: 'Role', options: ['', 'admin', 'cto', 'bu', 'manager', 'employee'] },
    ],
    columns: [
      { key: 'at', label: 'When', render: (r) => fmtDate(r.at) },
      { key: 'userName', label: 'User', render: (r) => <b>{r.userName || '—'}</b> },
      { key: 'role', label: 'Role' },
      { key: 'method', label: 'Method' },
      { key: 'route', label: 'Endpoint', render: (r) => <code>{r.route}</code> },
      { key: 'status', label: 'Status', render: (r) => <Badge kind={statusKind(r.status)}>{r.status}</Badge> },
      { key: 'ms', label: 'Time', align: 'right', render: (r) => `${r.ms} ms` },
      { key: 'ip', label: 'IP' },
    ],
  },
  system: {
    title: 'System logs',
    filters: [{ key: 'level', label: 'Level', options: ['', 'info', 'warn', 'error', 'alert'] }],
    columns: [
      { key: 'at', label: 'When', render: (r) => fmtDate(r.at) },
      { key: 'level', label: 'Level', render: (r) => <Badge kind={r.level === 'error' || r.level === 'alert' ? 'danger' : r.level === 'warn' ? 'warning' : 'info'}>{r.level}</Badge> },
      { key: 'source', label: 'Source' },
      { key: 'message', label: 'Message', wrap: true },
    ],
  },
};

function LogsTab({ kind }) {
  const cfg = LOG_CONFIG[kind];
  const { toastError } = useToast();
  const empty = useMemo(() => ({ q: '', from: '', to: '', ...Object.fromEntries(cfg.filters.map((f) => [f.key, ''])) }), [kind]);
  const [filters, setFilters] = useState(empty);
  const [applied, setApplied] = useState(empty);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setFilters(empty);
    setApplied(empty);
    setPage(1);
  }, [kind]);

  useEffect(() => {
    setData(null);
    api.insightsLogs(kind, { ...applied, page, limit: 50 }).then(setData).catch((e) => { toastError(e); setData({ rows: [], total: 0, limit: 50 }); });
  }, [kind, applied, page]);

  const apply = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied(filters);
  };
  const reset = () => {
    setFilters(empty);
    setApplied(empty);
    setPage(1);
  };
  const exportCsv = async () => {
    setExporting(true);
    try {
      await api.downloadInsightsCsv(kind, applied);
    } catch (e) {
      toastError(e);
    } finally {
      setExporting(false);
    }
  };
  const openDetail = async (row) => {
    try {
      const res = await api.insightsLogDetail(kind, row._id);
      setDetail(res.row);
    } catch (e) {
      setDetail(row);
    }
  };
  const pages = data ? Math.max(1, Math.ceil((data.total || 0) / (data.limit || 50))) : 1;

  return (
    <>
      <form onSubmit={apply} className="card" style={{ padding: 14, marginBottom: 14 }}>
        <div className="row gap-8" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ margin: 0, flex: 2, minWidth: 200 }}>
            <label>Search</label>
            <input className="input" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Name, item, IP, endpoint, message…" />
          </div>
          {cfg.filters.map((f) => (
            <div key={f.key} className="field" style={{ margin: 0, minWidth: 130 }}>
              <label>{f.label}</label>
              <select className="select" value={filters[f.key]} onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}>
                {f.options.map((o) => <option key={o} value={o}>{o || 'All'}</option>)}
              </select>
            </div>
          ))}
          <div className="field" style={{ margin: 0 }}>
            <label>From</label>
            <input type="date" className="input" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>To</label>
            <input type="date" className="input" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
          <Button type="submit" variant="cyan">Apply</Button>
          <Button type="button" variant="ghost" onClick={reset}>Reset</Button>
          <Button type="button" variant="ghost" onClick={exportCsv} disabled={exporting}>{exporting ? <Spinner sm /> : 'Export CSV'}</Button>
        </div>
      </form>

      <Panel title={cfg.title} right={data ? <span className="muted" style={{ fontSize: 12 }}>{fmtNum(data.total)} records · click a row for details</span> : null}>
        {!data ? <LoadingPage /> : <Table rows={data.rows} columns={cfg.columns} onRow={openDetail} empty="No records match these filters." />}
        {data && pages > 1 && (
          <div className="row gap-8" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="muted" style={{ fontSize: 12.5 }}>Page {page} of {pages}</span>
            <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}
      </Panel>

      {detail && (
        <Modal title="Log details" onClose={() => setDetail(null)}>
          <pre style={{ fontSize: 12, background: '#f4f6fb', padding: 14, borderRadius: 10, overflow: 'auto', maxHeight: '65vh', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(detail, null, 2)}
          </pre>
        </Modal>
      )}
    </>
  );
}

function PerformanceTab() {
  const { toastError } = useToast();
  const [hours, setHours] = useState(24);
  const [d, setD] = useState(null);
  const load = () => api.insightsPerformance(hours).then(setD).catch((e) => { toastError(e); setD({ error: true }); });
  useEffect(() => {
    setD(null);
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [hours]);
  if (!d) return <LoadingPage />;
  if (d.error) return <Empty>Could not load performance data.</Empty>;
  const t = d.totals;
  const p = d.process;
  const memPct = Math.round(((p.memory.systemTotalMb - p.memory.systemFreeMb) / p.memory.systemTotalMb) * 100);
  return (
    <>
      <div className="row gap-8" style={{ marginBottom: 12 }}>
        {[1, 6, 24, 72, 168].map((h) => (
          <button key={h} className={`chip ${hours === h ? 'active' : ''}`} onClick={() => setHours(h)}>
            {h < 24 ? `${h}h` : `${h / 24}d`}
          </button>
        ))}
      </div>
      <KpiGrid>
        <Kpi label="Requests" value={fmtNum(t.requests)} sub={`${t.requestsPerMinute}/min`} />
        <Kpi label="Avg response" value={`${t.avgMs} ms`} tone={t.avgMs > 800 ? 'warn' : 'good'} />
        <Kpi label="95% of requests under" value={t.p95Ms >= 5000 ? '>5 s' : `${t.p95Ms} ms`} />
        <Kpi label="Slowest request" value={`${fmtNum(t.maxMs)} ms`} />
        <Kpi label="Server errors (5xx)" value={fmtNum(t.serverErrors)} sub={`${t.errorRate}% of requests`} tone={t.serverErrors ? 'bad' : 'good'} />
        <Kpi label="Client errors (4xx)" value={fmtNum(t.clientErrors)} />
        <Kpi label="Server CPU" value={`${p.cpuPercent}%`} sub={`load ${p.loadAvg.join(' / ')} · ${p.cpus} CPU`} tone={p.cpuPercent > 80 ? 'bad' : undefined} />
        <Kpi label="Server memory" value={`${memPct}%`} sub={`app ${p.memory.rssMb} MB · heap ${p.memory.heapUsedMb} MB`} tone={memPct > 85 ? 'bad' : undefined} />
        <Kpi label="Event loop delay" value={`${p.eventLoopLagMs.p99} ms`} sub={`avg ${p.eventLoopLagMs.mean} ms`} tone={p.eventLoopLagMs.p99 > 200 ? 'warn' : 'good'} />
        <Kpi label="Uptime" value={fmtUptime(p.uptimeSec)} sub={`Node ${p.nodeVersion}`} />
      </KpiGrid>
      <Charts>
        <ChartCard title="Requests and errors per hour" wide>
          <LineChart data={d.hourly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" fontSize={11} />
            <YAxis yAxisId="l" fontSize={11} allowDecimals={false} />
            <YAxis yAxisId="r" orientation="right" fontSize={11} />
            <Tooltip />
            <Legend />
            <Line yAxisId="l" type="monotone" dataKey="requests" name="Requests" stroke={COLORS[0]} strokeWidth={2} dot={false} />
            <Line yAxisId="l" type="monotone" dataKey="errors" name="Server errors" stroke={COLORS[4]} strokeWidth={2} dot={false} />
            <Line yAxisId="r" type="monotone" dataKey="avgMs" name="Avg ms" stroke={COLORS[3]} strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>
        <ChartCard title="Response time distribution"><BarBlock data={d.latencyDistribution} color={COLORS[1]} /></ChartCard>
        <ChartCard title="Live — last 60 minutes">
          <LineChart data={d.live.map((m) => ({ ...m, t: new Date(m.minute).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="t" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Line type="monotone" dataKey="count" name="Requests/min" stroke={COLORS[0]} dot={false} />
            <Line type="monotone" dataKey="avgMs" name="Avg ms" stroke={COLORS[3]} dot={false} />
          </LineChart>
        </ChartCard>
      </Charts>
      <Panel title="Endpoints">
        <Table
          rows={d.endpoints}
          columns={[
            { key: 'method', label: 'Method' },
            { key: 'route', label: 'Endpoint', render: (r) => <code>{r.route}</code> },
            { key: 'count', label: 'Requests', align: 'right', render: (r) => fmtNum(r.count) },
            { key: 'avgMs', label: 'Avg', align: 'right', render: (r) => <span style={{ color: r.avgMs > 1000 ? '#dc2626' : undefined }}>{r.avgMs} ms</span> },
            { key: 'p95Ms', label: '95%', align: 'right', render: (r) => (r.p95Ms >= 5000 ? '>5 s' : `${r.p95Ms} ms`) },
            { key: 'maxMs', label: 'Max', align: 'right', render: (r) => `${r.maxMs} ms` },
            { key: 'clientErrors', label: '4xx', align: 'right' },
            { key: 'serverErrors', label: '5xx', align: 'right', render: (r) => <span style={{ color: r.serverErrors ? '#dc2626' : undefined }}>{r.serverErrors}</span> },
          ]}
        />
      </Panel>
    </>
  );
}

function DatabaseTab() {
  const { toastError } = useToast();
  const [d, setD] = useState(null);
  useEffect(() => {
    api.insightsDatabase().then(setD).catch((e) => { toastError(e); setD({ error: true }); });
  }, []);
  if (!d) return <LoadingPage />;
  if (d.error) return <Empty>Could not load database details.</Empty>;
  const pctUsed = d.usedPct || 0;
  const barColor = pctUsed > 90 ? '#dc2626' : pctUsed > 80 ? '#d97706' : '#10b981';
  return (
    <>
      <KpiGrid>
        <Kpi label="Connection" value={d.state === 'connected' ? 'Connected' : d.state} tone={d.state === 'connected' ? 'good' : 'bad'} sub={d.name} />
        <Kpi label="Response time (ping)" value={d.pingMs != null ? `${d.pingMs} ms` : '—'} tone={d.pingMs > 200 ? 'warn' : 'good'} />
        <Kpi label="Storage used" value={d.usedMb != null ? `${d.usedMb} MB` : '—'} sub={`of ${d.limitMb} MB`} />
        <Kpi label="Collections" value={fmtNum(d.stats && d.stats.collections)} />
        <Kpi label="Records" value={fmtNum(d.stats && d.stats.objects)} />
        <Kpi label="Data / indexes" value={d.stats ? `${d.stats.dataMb} / ${d.stats.indexMb} MB` : '—'} />
      </KpiGrid>
      <Panel title={`Storage usage — ${pctUsed}% of ${d.limitMb} MB`}>
        <div style={{ height: 14, background: '#eef1f7', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, pctUsed)}%`, height: '100%', background: barColor }} />
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Approximate (data + indexes). Old logs are removed automatically, so usage levels off over time.
        </div>
      </Panel>
      <div style={{ height: 14 }} />
      <Panel title="Collections">
        <Table
          rows={d.collections}
          columns={[
            { key: 'name', label: 'Collection', render: (r) => <code>{r.name}</code> },
            { key: 'count', label: 'Records', align: 'right', render: (r) => fmtNum(r.count) },
            { key: 'sizeMb', label: 'Data (MB)', align: 'right', render: (r) => (r.sizeMb == null ? '—' : r.sizeMb) },
            { key: 'indexMb', label: 'Indexes (MB)', align: 'right', render: (r) => (r.indexMb == null ? '—' : r.indexMb) },
          ]}
        />
      </Panel>
    </>
  );
}

function AlertsTab() {
  const { user } = useAuth();
  const { toast, toastError } = useToast();
  const [d, setD] = useState(null);
  const [running, setRunning] = useState(false);
  const load = () => api.insightsAlerts().then(setD).catch((e) => { toastError(e); setD({ open: [], history: [], observations: [] }); });
  useEffect(() => {
    load();
  }, []);
  const runNow = async () => {
    setRunning(true);
    try {
      await api.runAlertCheck();
      toast('Alert check completed');
      await load();
    } catch (e) {
      toastError(e);
    } finally {
      setRunning(false);
    }
  };
  if (!d) return <LoadingPage />;
  return (
    <>
      <Panel
        title={`Active alerts (${d.open.length})`}
        right={user.role === 'admin' ? <Button size="sm" variant="ghost" onClick={runNow} disabled={running}>{running ? <Spinner sm /> : 'Check now'}</Button> : null}
      >
        {d.open.length === 0 ? (
          <div style={{ color: '#059669', fontWeight: 600, fontSize: 13.5 }}>✓ No active alerts. Everything looks healthy.</div>
        ) : (
          d.open.map((a) => (
            <div key={a._id} className="list-row">
              <Badge kind={severityKind(a.severity)}>{a.severity}</Badge>
              <div style={{ flex: 1 }}>
                <div className="li-title">{a.message}</div>
                <div className="li-sub">Since {fmtDate(a.at)}</div>
              </div>
            </div>
          ))
        )}
      </Panel>
      <div style={{ height: 14 }} />
      <Panel title="Things to look at">
        {d.observations.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>Nothing needs attention right now.</div>
        ) : (
          d.observations.map((o, i) => (
            <div key={i} className="list-row">
              <Badge kind={severityKind(o.severity)}>{o.severity}</Badge>
              <div className="li-title" style={{ flex: 1 }}>{o.message}</div>
            </div>
          ))
        )}
      </Panel>
      <div style={{ height: 14 }} />
      <Panel title="Alert history">
        <Table
          rows={d.history}
          empty="No alerts have been raised yet."
          columns={[
            { key: 'at', label: 'Raised', render: (r) => fmtDate(r.at) },
            { key: 'severity', label: 'Severity', render: (r) => <Badge kind={severityKind(r.severity)}>{r.severity}</Badge> },
            { key: 'message', label: 'Alert', wrap: true },
            { key: 'resolvedAt', label: 'Resolved', render: (r) => (r.resolvedAt ? fmtDate(r.resolvedAt) : <Badge kind="danger">Active</Badge>) },
          ]}
        />
      </Panel>
    </>
  );
}

export default function InsightsPage() {
  const { toastError } = useToast();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'overview';
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const needsOverview = ['overview', 'workforce', 'training', 'interviews'].includes(tab);

  const loadOverview = async () => {
    setRefreshing(true);
    try {
      setOverview(await api.insightsOverview(days));
    } catch (e) {
      toastError(e);
      setOverview({ error: true });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (needsOverview) loadOverview();
  }, [days, needsOverview]);

  const setTab = (key) => setParams(key === 'overview' ? {} : { tab: key });

  let body;
  if (needsOverview) {
    if (!overview) body = <LoadingPage />;
    else if (overview.error) body = <Empty>Could not load insights.</Empty>;
    else if (tab === 'overview') body = <OverviewTab d={overview} />;
    else if (tab === 'workforce') body = <WorkforceTab d={overview} />;
    else if (tab === 'training') body = <TrainingTab d={overview} />;
    else body = <InterviewsTab d={overview} />;
  } else if (tab === 'activity') body = <ActivityTab days={days} />;
  else if (tab === 'performance') body = <PerformanceTab />;
  else if (tab === 'database') body = <DatabaseTab />;
  else if (tab === 'alerts') body = <AlertsTab />;
  else body = <LogsTab kind={tab} />;

  const showDays = needsOverview || tab === 'activity';

  return (
    <>
      <div className="page-head row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Insights</h1>
          <p>Portal performance, people, training, interviews, activity, logs and system health in one place.</p>
        </div>
        <div className="row gap-8">
          {showDays && (
            <select className="select" style={{ width: 150, height: 38 }} value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          )}
          {needsOverview && (
            <Button variant="ghost" size="sm" onClick={loadOverview} disabled={refreshing}>
              {refreshing ? <Spinner sm /> : 'Refresh'}
            </Button>
          )}
        </div>
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 4 }}>
        <div className="tabs" style={{ width: 'max-content' }}>
          {TABS.map((t) => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {body}
    </>
  );
}
