import { useEffect, useState } from 'react';
import { api, uid } from '../../api/client';
import { Button, Modal, LoadingPage, Empty, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';

export default function DomainsPage() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const { toast, toastError } = useToast();
  const [confirm, setConfirm] = useState(null);
  const { user } = useAuth();
  const thStyle = { padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '12px 14px', fontSize: 13, verticalAlign: 'middle' };
  const canEdit = ['admin', 'bu', 'manager'].includes(String(user?.role || '').toLowerCase());
  const removeDomain = async (d) => {
    try {
      await api.deleteDomain(uid(d));
      toast('Domain deleted');
      await load();
    } catch (e) { toastError(e); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.listDomains();
      setDomains(r.domains);
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <h1>Domains</h1>
          <p>Domains group the training materials engineers work through.</p>
        </div>
        {(canEdit &&
          <Button variant="cyan" onClick={() => setShow(true)}>+ Add domain</Button>)}
      </div>

      {loading ? (
        <LoadingPage />
      ) : domains.length === 0 ? (
        <Empty>No domains yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={thStyle}>Domain</th>
                <th style={thStyle}>Key</th>
                <th style={thStyle}>Description</th>
                 {(canEdit && <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>)}
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={uid(d)} style={{ borderTop: '1px solid #eef2f7' }}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{d.icon} {d.name}</span>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{d.key || '—'}</td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{d.description || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {(canEdit && 
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirm({
                        title: 'Delete domain',
                        message: `Do you really want to delete "${d.name}"? This cannot be undone.`,
                        onConfirm: async () => { await removeDomain(d); setConfirm(null); },
                      })}
                    >
                      Delete
                    </Button> )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {show && <DomainModal onClose={() => setShow(false)} onDone={() => { setShow(false); load(); }} />}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}

function ConfirmModal({ title = 'Are you sure?', message, confirmLabel = 'Delete', onConfirm, onClose, busy }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: '90vw',
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eef2f7' }}>
          <div style={{ fontSize: 16, fontWeight: 750, color: 'var(--navy, #102a56)' }}>{title}</div>
        </div>

        <div style={{ padding: '18px 20px' }}>
          <p style={{ fontSize: 14, color: '#334155', margin: 0, lineHeight: 1.5 }}>{message}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid #eef2f7' }}>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? <Spinner sm /> : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DomainModal({ onClose, onDone }) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📘');
  const [busy, setBusy] = useState(false);
  const { toast, toastError } = useToast();

  const submit = async () => {
    if (!key.trim() || !name.trim()) {
      toastError('Key and name are required');
      return;
    }
    setBusy(true);
    try {
      await api.createDomain(key.trim().toLowerCase(), name.trim(), description.trim(), icon.trim() || '📘');
      toast('Domain created');
      onDone();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="New domain"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="cyan" onClick={submit} disabled={busy}>{busy ? <Spinner sm /> : 'Create'}</Button>
        </>
      }
    >
      <div className="field"><label>Key (short, e.g. dft)</label><input className="input" value={key} onChange={(e) => setKey(e.target.value)} /></div>
      <div className="field"><label>Name (e.g. DFT)</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label>Description</label><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div className="field"><label>Icon (emoji)</label><input className="input" value={icon} onChange={(e) => setIcon(e.target.value)} /></div>
    </Modal>
  );
}
