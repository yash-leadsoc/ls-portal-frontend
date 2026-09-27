import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Button, LoadingPage, Empty, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';

export default function CategoriesPage() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast, toastError } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listCategories();
      setCats(res.categories || []);
    } catch (e) { toastError(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load();  }, []);

  const add = async () => {
    if (!name.trim()) { toastError('Category name is required'); return; }
    setBusy(true);
    try {
      await api.createCategory(name.trim(), description.trim());
      setName(''); setDescription(''); toast('Category added'); await load();
    } catch (e) { toastError(e); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this category?')) return;
    try { await api.deleteCategory(id); toast('Category removed'); await load(); }
    catch (e) { toastError(e); }
  };

  return (
    <>
      <div className="page-head">
        <h1>BU categories</h1>
        <p>Create the categories a Business Unit belongs to (VLSI-FE, VLSI-BE, Software…).</p>
      </div>

      <section className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="row gap-8" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 180 }}>
            <label>Category name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VLSI-FE" />
          </div>
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 180 }}>
            <label>Description (optional)</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
          </div>
          <Button variant="cyan" onClick={add} disabled={busy}>{busy ? <Spinner sm /> : 'Add category'}</Button>
        </div>
      </section>

      {loading ? <LoadingPage /> : cats.length === 0 ? (
        <Empty>No categories yet.</Empty>
      ) : (
        <div className="grid grid-auto">
          {cats.map((c) => (
            <div key={c._id} className="card" style={{ padding: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{c.name}</div>
                  {c.description ? <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{c.description}</div> : null}
                </div>
                <Button variant="danger" size="sm" onClick={() => remove(c._id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
