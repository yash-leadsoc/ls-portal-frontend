import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { Badge, Button, Empty, LoadingPage, Modal, Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const KIND_LABEL = {
  welcome: 'Welcome',
  domain_assigned: 'Domain assigned',
  trainer_assigned: 'Trainer assigned',
  mock_scheduled: 'Mock scheduled',
  mock_result: 'Mock result',
  inactivity: 'Inactivity reminder',
  weekly_management: 'Weekly · Management',
  weekly_bu: 'Weekly · BU',
  weekly_engineer: 'Weekly · Engineer',
  weekly_test: 'Weekly · Test',
};

const EVENTS = [
  {
    key: 'welcome',
    title: 'Welcome email',
    text: 'When an account is created (single, Excel upload or bench import), the person gets their login ID and a link to the portal.',
  },
  {
    key: 'domainAssigned',
    title: 'Domain assigned',
    text: 'When new learning domains are assigned, the engineer gets the list of new domains.',
  },
  {
    key: 'trainerAssigned',
    title: 'Trainer assigned',
    text: 'When a trainer is assigned or changed, the engineer and the trainer are both told.',
  },
  {
    key: 'mockScheduled',
    title: 'Mock interview scheduled',
    text: 'The engineer gets the date, time and meeting link. The person who scheduled it is copied.',
  },
  {
    key: 'mockResult',
    title: 'Mock interview result',
    text: 'When a mock is scored or cancelled, the engineer gets the score and feedback.',
  },
  {
    key: 'inactivity',
    title: 'Inactivity reminder',
    text: 'Engineers with no learning activity for a number of days get a reminder, at most once in that period.',
  },
];

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        border: 'none',
        padding: 3,
        flexShrink: 0,
        cursor: 'pointer',
        background: checked ? 'var(--navy, #1b2b5e)' : '#cfd6e4',
        transition: 'background .15s',
      }}
    >
      <span
        style={{
          display: 'block',
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,.2)',
          transform: checked ? 'translateX(18px)' : 'translateX(0)',
          transition: 'transform .15s',
        }}
      />
    </button>
  );
}

function Check({ checked, onChange, children, hint }) {
  return (
    <label className="row gap-8" style={{ alignItems: 'flex-start', padding: '8px 0', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 3 }} />
      <span style={{ fontSize: 13.5 }}>
        {children}
        {hint ? <span className="muted" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>{hint}</span> : null}
      </span>
    </label>
  );
}

const fmtTime = (d) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

const prettyWeek = (key) =>
  key ? new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';

export default function MailAutomation() {
  const { toast, toastError } = useToast();
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState('');
  const [extraText, setExtraText] = useState('');
  const [busy, setBusy] = useState('');
  const [preview, setPreview] = useState(null);
  const [logs, setLogs] = useState(null);
  const [logFilter, setLogFilter] = useState('');

  const load = () =>
    api
      .automationStatus()
      .then((r) => {
        setStatus(r);
        setForm(r.settings);
        setExtraText((r.settings.weekly.extraTo || []).join(', '));
        setSaved(JSON.stringify(r.settings));
      })
      .catch(toastError);

  const loadLogs = (f = logFilter) =>
    api
      .automationLogs(f ? `status=${f}` : '')
      .then((r) => setLogs(r.logs || []))
      .catch(toastError);

  useEffect(() => {
    load();
    loadLogs('');
  }, []);

  const current = useMemo(() => {
    if (!form) return null;
    return { ...form, weekly: { ...form.weekly, extraTo: extraText } };
  }, [form, extraText]);

  const dirty = useMemo(() => {
    if (!form) return false;
    const extra = extraText
      .split(/[\s,;]+/)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    return JSON.stringify({ ...form, weekly: { ...form.weekly, extraTo: extra } }) !== saved;
  }, [form, extraText, saved]);

  if (!status || !form) return <LoadingPage />;

  const set = (group, key, value) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: value } }));
  const w = form.weekly;
  const aud = status.audience || {};

  const save = async () => {
    setBusy('save');
    try {
      const r = await api.automationSave(current);
      setForm(r.settings);
      setExtraText((r.settings.weekly.extraTo || []).join(', '));
      setSaved(JSON.stringify(r.settings));
      toast(r.message || 'Saved');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy('');
    }
  };

  const openPreview = async (kind) => {
    setBusy(`preview-${kind}`);
    try {
      const r = await api.automationPreview(kind);
      if (r.empty) toast(r.empty);
      else setPreview({ ...r, kind });
    } catch (e) {
      toastError(e);
    } finally {
      setBusy('');
    }
  };

  const sendTest = async () => {
    setBusy('test');
    try {
      const r = await api.automationTest();
      toast(r.message);
      loadLogs();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy('');
    }
  };

  const sendNow = async () => {
    if (dirty) return toastError('Save your changes first');
    const parts = [
      w.management && `management (${aud.management} people${w.extraTo.length ? ` + ${w.extraTo.length} extra` : ''})`,
      w.bu && `BU heads (${aud.buHeads})`,
      w.engineers && `engineers (${aud.engineers})`,
    ].filter(Boolean);
    if (!parts.length) return toastError('Choose at least one group to send the weekly report to');
    if (!window.confirm(`Send this week's progress report now to:\n\n• ${parts.join('\n• ')}\n\nThe scheduled report for this week will not be sent again.`)) return;
    setBusy('run');
    try {
      const r = await api.automationRunWeekly();
      toast(`Sending: ${r.management ? 'management, ' : ''}${r.bu} BU mail(s), ${r.engineers} engineer mail(s)`);
      setTimeout(() => {
        load();
        loadLogs();
      }, 2500);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy('');
    }
  };

  const runInactivity = async () => {
    if (dirty) return toastError('Save your changes first');
    setBusy('inactivity');
    try {
      const r = await api.automationRunInactivity();
      toast(r.message);
      setTimeout(() => loadLogs(), 2500);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Email automation</h1>
        <p>Emails the portal sends on its own: a weekly progress report and messages when something happens.</p>
      </div>

      <div
        className="card"
        style={{ padding: '12px 16px', marginBottom: 16, borderLeft: `4px solid ${status.mailbox.ok ? '#10b981' : '#f59e0b'}` }}
      >
        {status.mailbox.ok ? (
          <div style={{ fontSize: 13.5 }}>
            Automated emails are sent from <b>{status.mailbox.from}</b>, the system mailbox. To change it, connect another mailbox in{' '}
            <b>Send mail → Mail settings</b> and click <b>Use for system emails</b>.
          </div>
        ) : (
          <div style={{ fontSize: 13.5 }}>
            <b>No system mailbox is set up</b>, so nothing will be sent. Connect a mailbox (for example tedp@leadsoc.com) in{' '}
            <b>Send mail → Mail settings</b> and click <b>Use for system emails</b>.
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--navy)' }}>Weekly progress report</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2, maxWidth: 640 }}>
              Domain-wise tables with each enrolled engineer's completion %, change since last week, days in the domain and bench
              ageing.
            </div>
          </div>
          <div className="row gap-8" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, fontWeight: 650, color: w.enabled ? 'var(--navy)' : 'var(--muted)' }}>
              {w.enabled ? 'On' : 'Off'}
            </span>
            <Toggle checked={w.enabled} onChange={(v) => set('weekly', 'enabled', v)} label="Weekly progress report" />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>WHEN</div>
            <div className="row gap-8">
              <select className="select" value={w.day} onChange={(e) => set('weekly', 'day', Number(e.target.value))}>
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    Every {d}
                  </option>
                ))}
              </select>
              <input
                className="input"
                type="time"
                style={{ maxWidth: 130 }}
                value={w.time}
                onChange={(e) => set('weekly', 'time', e.target.value)}
              />
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              India time (IST).
              {status.lastWeeklyRun ? ` Last sent for the week of ${prettyWeek(status.lastWeeklyRun)}.` : ' Not sent yet.'}
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', margin: '16px 0 4px' }}>INCLUDE</div>
            <Check
              checked={w.includeDeployed}
              onChange={(v) => set('weekly', 'includeDeployed', v)}
              hint="Off: only engineers on training or in interviews."
            >
              Deployed engineers
            </Check>
          </div>

          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 2 }}>WHO GETS IT</div>
            <Check
              checked={w.management}
              onChange={(v) => set('weekly', 'management', v)}
              hint={`One email with all engineers to the ${aud.management} management user(s) and the extra addresses below.`}
            >
              <b>Management</b>
            </Check>
            <Check
              checked={w.bu}
              onChange={(v) => set('weekly', 'bu', v)}
              hint={`Each of the ${aud.buHeads} BU head(s) gets only the engineers of their own BU.`}
            >
              <b>BU heads</b>
            </Check>
            <Check
              checked={w.engineers}
              onChange={(v) => set('weekly', 'engineers', v)}
              hint={`Each of the ${aud.engineers} enrolled engineer(s) gets only their own progress.`}
            >
              <b>Engineers</b>
            </Check>
            <div className="field" style={{ marginTop: 6 }}>
              <label>Extra management recipients (optional)</label>
              <input
                className="input"
                value={extraText}
                placeholder="e.g. md@leadsoc.com, delivery@leadsoc.com"
                onChange={(e) => setExtraText(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="row gap-8" style={{ flexWrap: 'wrap', marginTop: 4, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <span className="muted" style={{ fontSize: 12.5, alignSelf: 'center' }}>Preview:</span>
          {[
            ['management', 'Management'],
            ['bu', 'BU head'],
            ['engineer', 'Engineer'],
          ].map(([k, label]) => (
            <Button key={k} size="sm" variant="ghost" disabled={!!busy} onClick={() => openPreview(k)}>
              {busy === `preview-${k}` ? <Spinner sm /> : label}
            </Button>
          ))}
          <div style={{ flex: 1 }} />
          <Button size="sm" variant="ghost" disabled={!!busy || !status.mailbox.ok} onClick={sendTest}>
            {busy === 'test' ? <Spinner sm /> : 'Send test to me'}
          </Button>
          <Button size="sm" variant="cyan" disabled={!!busy || !status.mailbox.ok} onClick={sendNow}>
            {busy === 'run' ? <Spinner sm /> : 'Send now'}
          </Button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ padding: '16px 18px 6px' }}>
          <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--navy)' }}>Event emails</div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>Sent automatically when something happens in the portal.</div>
        </div>
        {EVENTS.map((ev) => {
          const on = form[ev.key].enabled;
          return (
            <div key={ev.key} style={{ padding: '14px 18px', borderTop: '1px solid #eef2f7' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{ev.title}</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 2, maxWidth: 680 }}>{ev.text}</div>
                </div>
                <Toggle checked={on} onChange={(v) => set(ev.key, 'enabled', v)} label={ev.title} />
              </div>

              {ev.key === 'welcome' && on && (
                <div style={{ marginTop: 6, paddingLeft: 2 }}>
                  <Check
                    checked={form.welcome.includePassword}
                    onChange={(v) => set('welcome', 'includePassword', v)}
                    hint="Off: the email asks them to set a password with “Forgot password?”. On: the initial password is included in the email."
                  >
                    Include the initial password
                  </Check>
                </div>
              )}

              {ev.key === 'inactivity' && on && (
                <div className="row gap-8" style={{ flexWrap: 'wrap', alignItems: 'center', marginTop: 10, fontSize: 13.5 }}>
                  <span>Remind after</span>
                  <input
                    className="input"
                    type="number"
                    min={3}
                    max={60}
                    style={{ width: 80, height: 36 }}
                    value={form.inactivity.days}
                    onChange={(e) => set('inactivity', 'days', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  <span>days without activity, checked daily at</span>
                  <input
                    className="input"
                    type="time"
                    style={{ width: 120, height: 36 }}
                    value={form.inactivity.time}
                    onChange={(e) => set('inactivity', 'time', e.target.value)}
                  />
                  <span className="muted">IST</span>
                  <div style={{ flexBasis: '100%' }} />
                  <Check checked={form.inactivity.ccTrainer} onChange={(v) => set('inactivity', 'ccTrainer', v)}>
                    Copy the engineer's trainer
                  </Check>
                  <div style={{ flex: 1 }} />
                  <Button size="sm" variant="ghost" disabled={!!busy || !status.mailbox.ok} onClick={runInactivity}>
                    {busy === 'inactivity' ? <Spinner sm /> : 'Check now'}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="row" style={{ padding: '16px 18px 10px', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--navy)', flex: 1 }}>Recent automated emails</div>
          {[
            ['', 'All'],
            ['failed', 'Failed'],
            ['skipped', 'Skipped'],
          ].map(([k, label]) => (
            <button
              key={k || 'all'}
              className={`chip ${logFilter === k ? 'active' : ''}`}
              onClick={() => {
                setLogFilter(k);
                loadLogs(k);
              }}
            >
              {label}
            </button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => loadLogs()}>
            ↻ Refresh
          </Button>
        </div>
        {!logs ? (
          <LoadingPage />
        ) : logs.length === 0 ? (
          <div style={{ padding: '0 18px 18px' }}>
            <Empty>No automated emails yet.</Empty>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 460, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  {['When', 'Type', 'To', 'Subject', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', fontSize: 12, color: '#475569', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#f8fafc' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id} style={{ borderTop: '1px solid #eef2f7' }}>
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap', color: 'var(--muted)' }}>{fmtTime(l.createdAt)}</td>
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{KIND_LABEL[l.kind] || l.kind}</td>
                    <td style={{ padding: '7px 12px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={[l.to, l.cc && `cc: ${l.cc}`].filter(Boolean).join('\n')}>
                      {l.to}
                      {l.cc ? <span className="muted"> · cc {l.cc}</span> : null}
                    </td>
                    <td style={{ padding: '7px 12px', maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.subject}>
                      {l.subject}
                    </td>
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }} title={l.error || ''}>
                      <Badge kind={l.status === 'sent' ? 'success' : l.status === 'failed' ? 'danger' : 'warning'}>{l.status}</Badge>
                      {l.error ? (
                        <div className="muted" style={{ fontSize: 11, maxWidth: 220, whiteSpace: 'normal' }}>
                          {l.error}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dirty && (
        <div
          style={{
            position: 'sticky',
            bottom: 12,
            marginTop: 16,
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            background: 'var(--navy, #1b2b5e)',
            color: '#fff',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(16,26,56,.25)',
          }}
        >
          <span style={{ flex: 1, fontSize: 13.5 }}>You have unsaved changes.</span>
          <Button size="sm" variant="ghost" style={{ color: '#fff' }} onClick={load} disabled={busy === 'save'}>
            Discard
          </Button>
          <Button size="sm" variant="cyan" onClick={save} disabled={busy === 'save'}>
            {busy === 'save' ? <Spinner sm /> : 'Save changes'}
          </Button>
        </div>
      )}

      {preview && (
        <Modal
          title={`Preview · ${preview.kind === 'bu' ? 'BU head' : preview.kind === 'engineer' ? 'Engineer' : 'Management'}${preview.sampleOf ? ` (sample: ${preview.sampleOf})` : ''}`}
          onClose={() => setPreview(null)}
          footer={<Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>}
        >
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            <b>Subject:</b> {preview.subject}
          </div>
          <iframe
            title="Email preview"
            srcDoc={preview.html}
            sandbox=""
            style={{ width: '100%', height: '70vh', border: '1px solid var(--border)', borderRadius: 10, background: '#f4f6fb' }}
          />
        </Modal>
      )}
    </>
  );
}
