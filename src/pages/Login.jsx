import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { Spinner } from '../components/ui';
import './auth.css';

const LOGO_FULL = '/logo-full.png?v=1';

const WAFER = (() => {
  const n = 14;
  const radius = 6.7;
  const lit = new Set([4, 17, 29, 30, 52, 66, 81, 95, 96, 110, 127]);
  const dies = [];
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      const x0 = col - n / 2;
      const y0 = row - n / 2;
      const inside = [[x0, y0], [x0 + 1, y0], [x0, y0 + 1], [x0 + 1, y0 + 1]].every(([x, y]) => Math.hypot(x, y) <= radius);
      if (inside) dies.push({ col, row, key: `${col}-${row}` });
    }
  }
  return { n, radius, dies: dies.map((d, i) => ({ ...d, lit: lit.has(i) })) };
})();

function WaferMap() {
  const { n, radius, dies } = WAFER;
  const cell = 20;
  const c = (n / 2) * cell + 24;
  const size = c * 2;
  return (
    <svg className="auth-wafer" viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
      <circle cx={c} cy={c} r={radius * cell + 8} className="auth-wafer-edge" />
      <path d={`M ${c - 18} ${c + radius * cell + 8} h 36`} className="auth-wafer-notch" />
      {dies.map((d, i) => (
        <rect
          key={d.key}
          x={c + (d.col - n / 2) * cell + 1.5}
          y={c + (d.row - n / 2) * cell + 1.5}
          width={cell - 3}
          height={cell - 3}
          rx="1.5"
          className={d.lit ? 'auth-die is-lit' : 'auth-die'}
          style={d.lit ? { animationDelay: `${300 + i * 6}ms` } : undefined}
        />
      ))}
    </svg>
  );
}

function AuthShell({ children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <img className="auth-logo" src={LOGO_FULL} alt="LeadSoC" />
        <WaferMap />
        <div className="auth-brand-copy">
          <h1>Talent Enablement &amp; Deployment Platform</h1>
          <p>Training, mock interviews, bench tracking and client deployment for LeadSoC engineers, in one place.</p>
        </div>
      </aside>
      <main className="auth-main">{children}</main>
    </div>
  );
}

function Notice({ kind, children }) {
  return (
    <div className={`auth-notice ${kind === 'ok' ? 'is-ok' : 'is-err'}`} role={kind === 'ok' ? 'status' : 'alert'}>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, show, onToggle, autoComplete, placeholder, id }) {
  return (
    <div className="auth-password">
      <input
        id={id}
        className="auth-input"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
      {onToggle && (
        <button type="button" className="auth-eye" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? 'Hide' : 'Show'}
        </button>
      )}
    </div>
  );
}

function ForgotPassword({ initialId, onDone, onCancel }) {
  const [step, setStep] = useState('request');
  const [identifier, setIdentifier] = useState(initialId || '');
  const [otp, setOtp] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (!wait) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async (e) => {
    if (e) e.preventDefault();
    setMsg(null);
    if (!identifier.trim()) return setMsg({ kind: 'err', text: 'Enter your email or employee ID.' });
    setBusy(true);
    try {
      const r = await api.forgotPassword(identifier.trim());
      setMsg({ kind: 'ok', text: r.message });
      setStep('verify');
      setWait(60);
    } catch (err) {
      setMsg({ kind: 'err', text: err.message || 'Could not send the code' });
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!/^\d{6}$/.test(otp.trim())) return setMsg({ kind: 'err', text: 'Enter the 6-digit code from your email.' });
    if (pw.length < 6) return setMsg({ kind: 'err', text: 'New password must be at least 6 characters.' });
    if (pw !== pw2) return setMsg({ kind: 'err', text: 'The two passwords do not match.' });
    setBusy(true);
    try {
      const r = await api.resetPassword(identifier.trim(), otp.trim(), pw);
      onDone(r.message || 'Password changed. You can sign in now.', identifier.trim());
    } catch (err) {
      setMsg({ kind: 'err', text: err.message || 'Could not reset the password' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={step === 'request' ? send : reset} noValidate>
      <h2>Reset your password</h2>
      <p className="auth-lead">
        {step === 'request'
          ? 'We will email a 6-digit code to the address registered on your account.'
          : 'Enter the code from your email and choose a new password.'}
      </p>

      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <div className="auth-field">
        <label htmlFor="fp-id">Email or employee ID</label>
        <input
          id="fp-id"
          className="auth-input"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          disabled={step === 'verify'}
          autoComplete="username"
          placeholder="you@leadsoc.com or LS2291"
        />
      </div>

      {step === 'verify' && (
        <>
          <div className="auth-field">
            <label htmlFor="fp-otp">6-digit code</label>
            <input
              id="fp-otp"
              className="auth-input auth-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label htmlFor="fp-pw">New password</label>
            <PasswordInput id="fp-pw" value={pw} onChange={(e) => setPw(e.target.value)} show={show} onToggle={() => setShow((s) => !s)} autoComplete="new-password" placeholder="At least 6 characters" />
          </div>
          <div className="auth-field">
            <label htmlFor="fp-pw2">Confirm new password</label>
            <PasswordInput id="fp-pw2" value={pw2} onChange={(e) => setPw2(e.target.value)} show={show} autoComplete="new-password" />
          </div>
        </>
      )}

      <button className="auth-submit" disabled={busy}>
        {busy ? <Spinner sm /> : step === 'request' ? 'Send code' : 'Reset password'}
      </button>

      <div className="auth-row">
        <button type="button" className="auth-link" onClick={onCancel}>Back to sign in</button>
        {step === 'verify' && (
          <button type="button" className="auth-link" disabled={wait > 0 || busy} onClick={() => send()}>
            {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
          </button>
        )}
      </div>
    </form>
  );
}

export default function Login() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [notice, setNotice] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) {
      setError('Enter your email or employee ID and your password.');
      return;
    }
    setBusy(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  if (forgot) {
    return (
      <AuthShell>
        <ForgotPassword
          initialId={identifier}
          onCancel={() => setForgot(false)}
          onDone={(text, id) => {
            setForgot(false);
            setIdentifier(id);
            setPassword('');
            setError('');
            setNotice(text);
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form className="auth-form" onSubmit={submit} noValidate>
        <h2>Sign in</h2>
        <p className="auth-lead">Use your work email or employee ID. You will land in the workspace for your role.</p>

        {notice && !error && <Notice kind="ok">{notice}</Notice>}
        {error && <Notice kind="err">{error}</Notice>}

        <div className="auth-field">
          <label htmlFor="login-id">Email or employee ID</label>
          <input
            id="login-id"
            className="auth-input"
            placeholder="you@leadsoc.com or LS2291"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </div>

        <div className="auth-field">
          <div className="auth-label-row">
            <label htmlFor="login-pw">Password</label>
            <button
              type="button"
              className="auth-link"
              onClick={() => {
                setError('');
                setNotice('');
                setForgot(true);
              }}
            >
              Forgot password?
            </button>
          </div>
          <PasswordInput
            id="login-pw"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            show={show}
            onToggle={() => setShow((s) => !s)}
            autoComplete="current-password"
            placeholder="Your password"
          />
        </div>

        <button className="auth-submit" disabled={busy}>{busy ? <Spinner sm /> : 'Sign in'}</button>

        <p className="auth-help">Trouble signing in? Contact your BU or the portal admin.</p>
      </form>
    </AuthShell>
  );
}
