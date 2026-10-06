import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api/client';
import { Badge, Button, Empty, LoadingPage, Modal, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';

const GROUPS = [
  ['all', 'All'],
  ['bus', "BU's"],
  ['trainers', 'Trainers'],
  ['ctos', 'CTOs'],
  ['engineers', 'Engineers'],
];

const FIELDS = [
  ['{{name}}', 'Full name'],
  ['{{firstName}}', 'First name'],
  ['{{employeeCode}}', 'Employee ID'],
  ['{{bu}}', 'BU'],
  ['{{role}}', 'Role'],
  ['{{email}}', 'Email'],
];

const STATUS_KIND = { queued: 'neutral', sending: 'info', done: 'success', failed: 'danger', interrupted: 'warning' };
const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

function CampaignModal({ id, onClose }) {
  const [c, setC] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => api.mailCampaign(id).then((r) => alive && setC(r.campaign)).catch(() => {});
    load();
    const t = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id]);
  return (
    <Modal title={c ? c.subject : 'Mail details'} onClose={onClose} footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      {!c ? (
        <LoadingPage />
      ) : (
        <div style={{ maxWidth: 760 }}>
          <div className="row gap-8" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
            <Badge kind={STATUS_KIND[c.status] || 'neutral'}>{c.status}</Badge>
            <Badge kind="success">{c.sent} sent</Badge>
            {c.failed > 0 && <Badge kind="danger">{c.failed} failed</Badge>}
            <span className="muted" style={{ fontSize: 12.5 }}>
              From {c.senderName} &lt;{c.senderEmail}&gt; · {fmt(c.createdAt)}
            </span>
          </div>
          <div className="table-wrap" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            <table className="data">
              <thead>
                <tr><th style={{ textAlign: 'left' }}>Name</th><th style={{ textAlign: 'left' }}>Email</th><th>Status</th><th style={{ textAlign: 'left' }}>Error</th></tr>
              </thead>
              <tbody>
                {c.recipients.map((r, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: 'left' }}>{r.name}</td>
                    <td style={{ textAlign: 'left' }}>{r.email}</td>
                    <td><Badge kind={r.status === 'sent' ? 'success' : r.status === 'failed' ? 'danger' : 'neutral'}>{r.status}</Badge></td>
                    <td style={{ textAlign: 'left', whiteSpace: 'normal', fontSize: 12, color: '#dc2626' }}>{r.error || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

const PRESETS = [
  ['', 'Choose your email provider…'],
  ['smtp.gmail.com|465', 'Google Workspace / Gmail (app password)'],
  ['smtp.office365.com|587', 'Microsoft 365 / Outlook'],
  ['smtp.hostinger.com|465', 'Hostinger'],
  ['smtp.titan.email|465', 'Titan / GoDaddy'],
  ['smtp.zoho.in|465', 'Zoho Mail (India)'],
  ['smtp.zoho.com|465', 'Zoho Mail (global)'],
];

function MailSettings({ config, onChanged }) {
  const { toast, toastError } = useToast();
  const [open, setOpen] = useState(!config.configured);
  const [server, setServer] = useState({
    host: config.server?.host || '',
    port: config.server?.port || 465,
    secure: config.server ? !!config.server.secure : true,
  });
  const [smtpUser, setSmtpUser] = useState(config.account?.smtpUser || config.from.email || '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState('');

  const pickPreset = (v) => {
    if (!v) return;
    const [host, port] = v.split('|');
    setServer({ host, port: Number(port), secure: Number(port) === 465 });
  };

  const saveServer = async () => {
    setBusy('server');
    try {
      const r = await api.mailSaveServer({ host: server.host.trim(), port: Number(server.port), secure: server.secure });
      toast(r.message || 'Mail server saved');
      onChanged();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy('');
    }
  };

  const connect = async () => {
    if (!password) return toastError('Enter your mailbox password');
    setBusy('account');
    try {
      const r = await api.mailSaveAccount({ smtpUser: smtpUser.trim(), password });
      toast(r.message || 'Mailbox connected');
      setPassword('');
      onChanged();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy('');
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Remove your saved mailbox password? You will not be able to send until you add it again.')) return;
    setBusy('remove');
    try {
      await api.mailRemoveAccount();
      toast('Mailbox removed');
      onChanged();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="card" style={{ padding: 16, marginBottom: 16, borderLeft: `4px solid ${config.configured ? '#10b981' : '#f59e0b'}` }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 750, color: 'var(--navy)' }}>⚙️ Mail settings</div>
          <div className="muted" style={{ fontSize: 12.5 }}>
            {config.configured ? `Connected — sending as ${config.sendsAs}` : config.note}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>{open ? 'Hide' : 'Change'}</Button>
      </div>

      {open && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginTop: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Mail server (company-wide)</div>
            {config.canEditServer ? (
              <>
                <div className="field">
                  <label>Provider</label>
                  <select className="select" defaultValue="" onChange={(e) => pickPreset(e.target.value)}>
                    {PRESETS.map(([v, label]) => <option key={label} value={v}>{label}</option>)}
                  </select>
                </div>
                <div className="row gap-8" style={{ alignItems: 'flex-end' }}>
                  <div className="field" style={{ flex: 2, margin: 0 }}>
                    <label>SMTP host</label>
                    <input className="input" value={server.host} placeholder="smtp.yourprovider.com" onChange={(e) => setServer({ ...server, host: e.target.value })} />
                  </div>
                  <div className="field" style={{ flex: 1, margin: 0 }}>
                    <label>Port</label>
                    <input className="input" type="number" value={server.port} onChange={(e) => setServer({ ...server, port: e.target.value, secure: Number(e.target.value) === 465 })} />
                  </div>
                </div>
                <label className="row gap-8" style={{ fontSize: 12.5, margin: '8px 0 10px' }}>
                  <input type="checkbox" checked={server.secure} onChange={(e) => setServer({ ...server, secure: e.target.checked })} />
                  Use SSL (port 465). Leave off for 587.
                </label>
                <Button size="sm" variant="cyan" onClick={saveServer} disabled={busy === 'server' || !server.host}>
                  {busy === 'server' ? <Spinner sm /> : 'Save server'}
                </Button>
              </>
            ) : (
              <div className="muted" style={{ fontSize: 13 }}>
                {config.server ? `${config.server.host}:${config.server.port}` : 'Not set up yet — ask the main admin.'}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>My mailbox</div>
            {config.account && (
              <div className="row gap-8" style={{ alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                <Badge kind="success">Connected</Badge>
                <span style={{ fontSize: 13 }}>{config.account.smtpUser}</span>
                <Button size="sm" variant="ghost" onClick={disconnect} disabled={busy === 'remove'}>Remove</Button>
              </div>
            )}
            <div className="field">
              <label>Email address</label>
              <input className="input" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
            </div>
            <div className="field">
              <label>{config.account ? 'New password (to change it)' : 'Mailbox password'}</label>
              <input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your email password or app password" />
            </div>
            <Button size="sm" variant="cyan" onClick={connect} disabled={busy === 'account' || !config.server}>
              {busy === 'account' ? <Spinner sm /> : config.account ? 'Update & test' : 'Connect & test'}
            </Button>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
              The portal signs in to your mailbox to check the password, then stores it encrypted. Only you send with it.
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Password-reset codes</div>
              <div className="muted" style={{ fontSize: 12, margin: '2px 0 8px' }}>
                {config.systemSender
                  ? `Sent from ${config.systemSender.email}${config.systemSender.isMe ? ' (your mailbox)' : ''}.`
                  : 'Not set — forgot-password emails use the first main admin mailbox that is connected.'}
              </div>
              {config.canEditServer && config.account && !(config.systemSender && config.systemSender.isMe) && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === 'system'}
                  onClick={async () => {
                    setBusy('system');
                    try {
                      const r = await api.mailUseForSystem();
                      toast(r.message);
                      onChanged();
                    } catch (e) {
                      toastError(e);
                    } finally {
                      setBusy('');
                    }
                  }}
                >
                  Use my mailbox for these
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SendMail() {
  const { toast, toastError } = useToast();
  const [config, setConfig] = useState(null);
  const [group, setGroup] = useState('all');
  const [people, setPeople] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('Dear {{name}},\n\n\n\nRegards,');
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [openId, setOpenId] = useState(null);
  const bodyRef = useRef(null);

  const loadCampaigns = () => api.mailCampaigns().then((r) => setCampaigns(r.campaigns || [])).catch(() => {});

  useEffect(() => {
    api.mailConfig().then(setConfig).catch((e) => toastError(e));
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (!campaigns.some((c) => ['queued', 'sending'].includes(c.status))) return undefined;
    const t = setInterval(loadCampaigns, 3000);
    return () => clearInterval(t);
  }, [campaigns]);

  useEffect(() => {
    setPeople(null);
    api
      .mailRecipients(group)
      .then((r) => {
        const list = r.recipients || [];
        setPeople(list);
        setSelected(new Set(list.filter((p) => p.canReceive).map((p) => p.id)));
      })
      .catch((e) => {
        toastError(e);
        setPeople([]);
      });
  }, [group]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (people || []).filter(
      (p) => !s || [p.name, p.email, p.employeeCode, p.buName, p.roleLabel].some((v) => String(v || '').toLowerCase().includes(s))
    );
  }, [people, q]);

  const receivable = (people || []).filter((p) => p.canReceive);
  const selectedCount = receivable.filter((p) => selected.has(p.id)).length;
  const allShownSelected = shown.filter((p) => p.canReceive).every((p) => selected.has(p.id));

  const toggle = (id) =>
    setSelected((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleShown = () =>
    setSelected((cur) => {
      const n = new Set(cur);
      shown.filter((p) => p.canReceive).forEach((p) => (allShownSelected ? n.delete(p.id) : n.add(p.id)));
      return n;
    });

  const insertField = (token) => {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const showPreview = async () => {
    const first = receivable.find((p) => selected.has(p.id));
    try {
      const r = await api.mailPreview({
        subject,
        body,
        ...(first ? { name: first.name, email: first.email, employeeCode: first.employeeCode, roleLabel: first.roleLabel, buName: first.buName } : {}),
      });
      setPreview({ ...r, who: first ? first.name : 'a sample person' });
    } catch (e) {
      toastError(e);
    }
  };

  const send = async () => {
    if (!subject.trim()) return toastError('Subject is required');
    if (!body.trim()) return toastError('Message is required');
    if (!selectedCount) return toastError('Select at least one recipient');
    const label = GROUPS.find(([k]) => k === group)[1];
    if (!window.confirm(`Send "${subject}" to ${selectedCount} ${label === 'All' ? 'people' : label}?\n\nEach person gets a personalised copy from ${config?.sendsAs}.`)) return;
    setSending(true);
    try {
      const ids = receivable.filter((p) => selected.has(p.id)).map((p) => p.id);
      const r = await api.mailSend({ subject, body, group, userIds: ids });
      toast(`Sending to ${r.campaign.total} recipient(s)…`);
      setOpenId(r.campaign.id);
      loadCampaigns();
    } catch (e) {
      toastError(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Send mail</h1>
        <p>Send a personalised email to BUs, trainers, CTOs, engineers or selected people.</p>
      </div>

      {config && (
        <MailSettings
          key={`${config.server?.host || ''}-${config.account?.smtpUser || ''}-${config.configured}`}
          config={config}
          onChanged={() => api.mailConfig().then(setConfig).catch((e) => toastError(e))}
        />
      )}

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)', gap: 16, alignItems: 'start' }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 750, color: 'var(--navy)', marginBottom: 10 }}>1. Recipients</div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {GROUPS.map(([k, label]) => (
              <button key={k} className={`chip ${group === k ? 'active' : ''}`} onClick={() => setGroup(k)}>
                {label}
              </button>
            ))}
          </div>
          <div className="row gap-8" style={{ marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Search name, email, ID, BU…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button size="sm" variant="ghost" onClick={toggleShown}>{allShownSelected ? 'Clear' : 'Select all'}</Button>
          </div>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
            <b style={{ color: 'var(--navy)' }}>{selectedCount}</b> of {receivable.length} selected
            {people && people.length > receivable.length ? ` · ${people.length - receivable.length} without a valid email (skipped)` : ''}
          </div>
          {!people ? (
            <LoadingPage />
          ) : shown.length === 0 ? (
            <Empty>No people in this group.</Empty>
          ) : (
            <div style={{ maxHeight: 440, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
              {shown.map((p) => (
                <label
                  key={p.id}
                  className="row gap-8"
                  style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid #eef2f7',
                    alignItems: 'center',
                    cursor: p.canReceive ? 'pointer' : 'not-allowed',
                    opacity: p.canReceive ? 1 : 0.5,
                  }}
                >
                  <input type="checkbox" disabled={!p.canReceive} checked={p.canReceive && selected.has(p.id)} onChange={() => toggle(p.id)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 650, fontSize: 13, color: 'var(--navy)' }}>
                      {p.name} {p.employeeCode ? <span className="muted" style={{ fontWeight: 400 }}>({p.employeeCode})</span> : null}
                    </div>
                    <div className="muted" style={{ fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.canReceive ? p.email : 'No valid email address'}
                    </div>
                  </div>
                  <Badge kind="neutral">{p.roleLabel}</Badge>
                  {p.buName && p.role !== 'bu' ? <span className="muted" style={{ fontSize: 11.5 }}>{p.buName}</span> : null}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 750, color: 'var(--navy)', marginBottom: 10 }}>2. Message</div>
          <div className="field">
            <label>From</label>
            <input className="input" readOnly value={config ? `${config.from.name} <${config.sendsAs}>` : ''} />
            {config?.note && <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{config.note}</div>}
          </div>
          <div className="field">
            <label>Subject</label>
            <input className="input" value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Training schedule for {{firstName}}" />
          </div>
          <div className="field" style={{ marginBottom: 6 }}>
            <label>Message</label>
            <textarea ref={bodyRef} className="textarea" rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <span className="muted" style={{ fontSize: 12 }}>Insert:</span>
            {FIELDS.map(([token, label]) => (
              <button key={token} type="button" className="chip" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => insertField(token)}>
                {label}
              </button>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginBottom: 12 }}>
            Each person receives their own copy with their details filled in. Links are clickable automatically.
          </div>
          <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={showPreview}>👁 Preview</Button>
            <Button variant="cyan" onClick={send} disabled={sending || !config?.configured || !selectedCount}>
              {sending ? <Spinner sm /> : `✉ Send to ${selectedCount}`}
            </Button>
          </div>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 22 }}>Sent mails</div>
      {campaigns.length === 0 ? (
        <Empty>No mails sent yet.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Subject</th>
                <th>Audience</th>
                <th>Sent by</th>
                <th>Progress</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c._id} style={{ cursor: 'pointer' }} onClick={() => setOpenId(c._id)}>
                  <td style={{ textAlign: 'left', fontWeight: 650 }}>{c.subject}</td>
                  <td>{c.audience}</td>
                  <td>{c.senderName}</td>
                  <td>{c.sent + c.failed} / {c.total}{c.failed ? <span style={{ color: '#dc2626' }}> ({c.failed} failed)</span> : null}</td>
                  <td><Badge kind={STATUS_KIND[c.status] || 'neutral'}>{c.status}</Badge></td>
                  <td>{fmt(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <Modal title={`Preview — as ${preview.who} sees it`} onClose={() => setPreview(null)} footer={<Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ fontSize: 13, marginBottom: 8 }}><b>Subject:</b> {preview.subject || <span className="muted">(empty)</span>}</div>
            <iframe title="Mail preview" sandbox="" srcDoc={preview.html} style={{ width: '100%', height: '50vh', border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }} />
          </div>
        </Modal>
      )}
      {openId && <CampaignModal id={openId} onClose={() => { setOpenId(null); loadCampaigns(); }} />}
    </>
  );
}
