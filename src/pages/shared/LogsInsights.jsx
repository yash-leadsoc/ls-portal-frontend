import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../../api/client';
import { LoadingPage } from '../../components/ui';

const COLORS = ['#08a6c7', '#0aa7c5', '#6366f1', '#f59e0b', '#ef4444', '#10b981', '#94a3b8'];

export default function LogInsights() {
  const [d, setD] = useState(null);
  useEffect(() => { api.auditInsights().then(setD).catch(() => setD({})); }, []);
  if (!d) return <LoadingPage />;

  const Card = ({ title, children }) => (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 750, color: '#102a56', marginBottom: 10 }}>{title}</div>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
      <Card title="Activity over time">
        <LineChart data={d.byDay}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
          <Line type="monotone" dataKey="value" stroke="#08a6c7" strokeWidth={2} dot={false} />
        </LineChart>
      </Card>

      <Card title="By action">
        <BarChart data={d.byAction}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
          <Bar dataKey="value" fill="#08a6c7" radius={[4,4,0,0]} />
        </BarChart>
      </Card>

      <Card title="By entity">
        <PieChart>
          <Pie data={d.byEntity} dataKey="value" nameKey="name" outerRadius={90} label>
            {d.byEntity?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </Card>

      <Card title="Most active users">
        <BarChart data={d.topActors} layout="vertical">
          <XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="name" width={90} fontSize={11} /><Tooltip />
          <Bar dataKey="value" fill="#6366f1" radius={[0,4,4,0]} />
        </BarChart>
      </Card>

      <Card title="Write-up focus lost (per user)">
        <BarChart data={d.focusLost}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
          <Bar dataKey="value" fill="#ef4444" radius={[4,4,0,0]} />
        </BarChart>
      </Card>
    </div>
  );
}
