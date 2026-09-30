import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Badge, Button, LoadingPage, Empty, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';

export default function CategoriesPage() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parent, setParent] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast, toastError } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listCategories();
      setCats(res.categories || []);
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const mains = cats.filter((c) => !c.parent);
  const subsOf = (id) => cats.filter((c) => String(c.parent) === String(id));

  const add = async () => {
    if (!name.trim()) {
      toastError('Category name is required');
      return;
    }
    setBusy(true);
    try {
      await api.createCategory(name.trim(), description.trim(), parent || undefined);
      setName('');
      setDescription('');
      toast(parent ? 'Sub-category added' : 'Category added');
      await load();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Remove "${c.name}"?\n\nIt will be moved to the Recycle Bin and can be restored by an admin within 30 days.`)) return;
    try {
      await api.deleteCategory(c._id);
      toast('Category moved to Recycle Bin');
      await load();
    } catch (e) {
      toastError(e);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>BU categories</h1>
        <p>
          Main categories (e.g. BE, FE, SW) get a <b>BU Head</b>. Sub-categories (e.g. BE-Layout, BE-STA) get their own <b>BU</b>, which
          sees only its sub-category. The BU Head sees everything in the main category.
        </p>
      </div>

      <section className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="row gap-8" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ margin: 0, minWidth: 200 }}>
            <label>Type</label>
            <select className="select" value={parent} onChange={(e) => setParent(e.target.value)}>
              <option value="">Main category</option>
              {mains.map((m) => (
                <option key={m._id} value={m._id}>Sub-category of {m.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 180 }}>
            <label>{parent ? 'Sub-category name' : 'Category name'}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={parent ? 'e.g. BE-Layout' : 'e.g. BE'} />
          </div>
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 180 }}>
            <label>Description (optional)</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
          </div>
          <Button variant="cyan" onClick={add} disabled={busy}>{busy ? <Spinner sm /> : parent ? 'Add sub-category' : 'Add category'}</Button>
        </div>
      </section>

      {loading ? (
        <LoadingPage />
      ) : cats.length === 0 ? (
        <Empty>No categories yet.</Empty>
      ) : (
        <div className="grid" style={{ gap: 14 }}>
          {mains.map((m) => (
            <div key={m._id} className="card" style={{ padding: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <div className="row gap-8" style={{ alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--navy)' }}>{m.name}</span>
                    <Badge kind="info">Main category · BU Head</Badge>
                  </div>
                  {m.description ? <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{m.description}</div> : null}
                </div>
                <Button variant="danger" size="sm" onClick={() => remove(m)}>Delete</Button>
              </div>
              <div style={{ marginTop: 12, paddingLeft: 14, borderLeft: '3px solid var(--border)' }}>
                {subsOf(m._id).length === 0 ? (
                  <div className="muted" style={{ fontSize: 12.5 }}>No sub-categories yet.</div>
                ) : (
                  subsOf(m._id).map((c) => (
                    <div key={c._id} className="row" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: '#334155' }}>└ {c.name}</span>
                        <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>Sub-category · own BU</span>
                        {c.description ? <div className="muted" style={{ fontSize: 12 }}>{c.description}</div> : null}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => remove(c)}>Delete</Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
