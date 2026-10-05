import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { LoadingPage } from '../../components/ui';
import { useToast } from '../../components/Toast';

const COLORS = ['#08a6c7', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0aa7c5', '#94a3b8'];

function Kpi({ label, value, sub, color = '#102a56' }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#475569', marginTop: 2 }}>{label}</div>
      {sub ? <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div> : null}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 750, color: '#102a56', marginBottom: 10 }}>{title}</div>
      <div style={{ width: '100%', height: 240 }}><ResponsiveContainer>{children}</ResponsiveContainer></div>
    </div>
  );
}

export default function OverviewDashboard() {
  const { user } = useAuth();
  const { toastError } = useToast();
  const canFilter = user.role === 'admin' || user.role === 'cto';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
    const [view, setView] = useState('all');

  useEffect(() => { if (canFilter) api.listCategories().then((r) => setCategories(r.categories || [])).catch(() => {}); }, [canFilter]);

  const load = async () => {
    setLoading(true);
        try { setData(await api.getOverview(category || undefined, view)); }
    catch (e) { toastError(e); } finally { setLoading(false); }
  };
   useEffect(() => { load();  }, [category, view]);

  if (loading || !data) return <LoadingPage />;
  const k = data.kpis; const c = data.charts;

  return (
    <>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h1>Portal overview</h1>
            <p>
            Key numbers across the {category ? 'selected category' : 'whole organisation'}
            {view === 'bench' ? ' — bench engineers only' : view === 'deployed' ? ' — deployed engineers only' : ''}.
          </p>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {[['all', 'All'], ['bench', 'Bench'], ['deployed', 'Deployed']].map(([v, label]) => (
            <button key={v} className={`chip ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
              {label}
            </button>
          ))}
        </div>
        {canFilter && (
          <select className="select" style={{ maxWidth: 220 }} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
          </select>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        <Kpi label="Engineers" value={k.totalEngineers} />
        {view !== 'deployed' && (
          <Kpi label="On bench" value={k.onBench} sub={`${k.onTraining} training · ${k.ongoingInterview} interview`} color="#f59e0b" />
        )}
        {view !== 'bench' && <Kpi label="Deployed" value={k.deployed} color="#10b981" />}
        <Kpi label="Trainers" value={k.totalTrainers} />
        {canFilter && <Kpi label="Business Units" value={k.totalBUs} />}
        {canFilter && <Kpi label="CTOs" value={k.totalCTOs} />}
        <Kpi label="Mocks scheduled" value={k.mockScheduled} sub={`${k.mockCompleted} completed · avg ${k.avgMockScore}/10`} />
        <Kpi label="Client submissions" value={k.clientsSent} sub={`${k.clientsSelected} selected`} color="#6366f1" />
        <Kpi label="Domains" value={k.domains} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14, marginTop: 14 }}>
        <ChartCard title="Engineers by status">
          <PieChart>
            <Pie data={c.engineersByStatus.filter((s) => s.value > 0)} dataKey="value" nameKey="name" outerRadius={90} label>
              {c.engineersByStatus.filter((s) => s.value > 0).map((s) => (
                <Cell key={s.name} fill={COLORS[c.engineersByStatus.findIndex((x) => x.name === s.name) % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ChartCard>

        <ChartCard title="Engineers by category">
          <BarChart data={c.engineersByCategory}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip />
            <Bar dataKey="value" fill="#08a6c7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Client interviews by status">
          <BarChart data={c.clientsByStatus}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip />
            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Mock interviews (last 8 weeks)">
          <LineChart data={c.mocksOverTime}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip />
            <Line type="monotone" dataKey="count" stroke="#08a6c7" strokeWidth={2} />
          </LineChart>
        </ChartCard>
      </div>
    </>
  );
}
