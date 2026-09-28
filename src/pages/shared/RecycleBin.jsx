import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { Badge, Button, Empty, LoadingPage } from '../../components/ui';
import { useToast } from '../../components/Toast';

const ENTITY_LABEL = {
  document: 'Material',
  checklist: 'Checklist',
  writeup: 'Write-up',
  exercise: 'Exercise',
  domain: 'Domain',
  category: 'Category',
  company: 'Company',
  'interview-material': 'Interview material',
  question: 'Question',
  answer: 'Answer',
  availability: 'Availability',
};

function fmt(d) {
  return d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

export default function RecycleBin() {
  const { toast, toastError } = useToast();
  const [items, setItems] = useState([]);
  const [retention, setRetention] = useState(30);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listTrash();
      setItems(res.items || []);
      if (res.retentionDays) setRetention(res.retentionDays);
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const types = useMemo(() => [...new Set(items.map((i) => i.entity))], [items]);
  const shown = filter ? items.filter((i) => i.entity === filter) : items;

  const restore = async (item) => {
    setBusyId(item.id);
    try {
      const res = await api.restoreTrash(item.id);
      toast(res.message || 'Restored');
      setItems((list) => list.filter((i) => i.id !== item.id));
    } catch (e) {
      toastError(e);
    } finally {
      setBusyId(null);
    }
  };

  const purge = async (item) => {
    if (!window.confirm(`Permanently delete "${item.label || 'this item'}"?\n\nThis cannot be undone.`)) return;
    setBusyId(item.id);
    try {
      const res = await api.purgeTrash(item.id);
      toast(res.message || 'Deleted permanently');
      setItems((list) => list.filter((i) => i.id !== item.id));
    } catch (e) {
      toastError(e);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Recycle Bin</h1>
        <p>
          Deleted items are kept here for {retention} days. Restore anything deleted by mistake before it is removed
          automatically.
        </p>
      </div>

      {types.length > 1 && (
        <div className="row gap-8" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
          <Button variant={filter ? 'ghost' : 'primary'} size="sm" onClick={() => setFilter('')}>
            All ({items.length})
          </Button>
          {types.map((t) => (
            <Button key={t} variant={filter === t ? 'primary' : 'ghost'} size="sm" onClick={() => setFilter(t)}>
              {ENTITY_LABEL[t] || t} ({items.filter((i) => i.entity === t).length})
            </Button>
          ))}
        </div>
      )}

      {loading ? (
        <LoadingPage />
      ) : shown.length === 0 ? (
        <Empty>The Recycle Bin is empty.</Empty>
      ) : (
        <div className="grid" style={{ gap: 12 }}>
          {shown.map((item) => (
            <div key={item.id} className="card" style={{ padding: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row gap-8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge kind="info">{ENTITY_LABEL[item.entity] || item.entity}</Badge>
                    <span style={{ fontWeight: 700, color: 'var(--navy)', wordBreak: 'break-word' }}>
                      {item.label || 'Untitled'}
                    </span>
                    {item.itemCount > 1 && <span className="muted" style={{ fontSize: 12.5 }}>({item.itemCount} records)</span>}
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                    Deleted {fmt(item.deletedAt)}
                    {item.deletedByName ? ` by ${item.deletedByName}` : ''}
                  </div>
                </div>
                <div className="row gap-8" style={{ alignItems: 'center' }}>
                  <Badge kind={item.daysLeft <= 3 ? 'danger' : item.daysLeft <= 7 ? 'warning' : 'neutral'}>
                    {item.daysLeft} day{item.daysLeft === 1 ? '' : 's'} left
                  </Badge>
                  <Button variant="cyan" size="sm" disabled={busyId === item.id} onClick={() => restore(item)}>
                    Restore
                  </Button>
                  <Button variant="danger" size="sm" disabled={busyId === item.id} onClick={() => purge(item)}>
                    Delete forever
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}