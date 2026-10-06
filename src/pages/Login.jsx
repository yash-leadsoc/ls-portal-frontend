import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { Button, Spinner } from '../components/ui';

const boxStyle = (kind) => ({
  background: kind === 'ok' ? '#ecfdf5' : 'var(--danger-bg)',
  color: kind === 'ok' ? '#047857' : 'var(--danger)',
  padding: '10px 12px',
  borderRadius: 10,
  fontSize: 13,
  marginBottom: 16,
});

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
    if (!identifier.trim()) return setMsg({ kind: 'err', text: 'Enter your email or Employee ID.' });
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
    <form className="login-card" onSubmit={step === 'request' ? send : reset}>
      <div className="logo">LS</div>
      <h2 style={{ textAlign: 'center', margin: '0 0 4px', color: 'var(--navy)', fontSize: 20 }}>Reset your password</h2>
      <p style={{ textAlign: 'center', margin: '0 0 20px', color: 'var(--muted)', fontSize: 13.5 }}>
        {step === 'request' ? 'We will email a 6-digit code to your registered email.' : 'Enter the code from your email and choose a new password.'}
      </p>

      {msg && <div style={boxStyle(msg.kind)}>{msg.text}</div>}

      <div className="field">
        <label>Email or Employee ID</label>
        <input
          className="input"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          disabled={step === 'verify'}
          autoComplete="username"
          placeholder="you@leadsoc.com or LS-2291"
        />
      </div>

      {step === 'verify' && (
        <>
          <div className="field">
            <label>6-digit code</label>
            <input
              className="input"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              style={{ letterSpacing: 6, fontSize: 18, textAlign: 'center' }}
              autoFocus
            />
          </div>
          <div className="field">
            <label>New password</label>
            <input className="input" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="At least 6 characters" />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input className="input" type={show ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
          </label>
        </>
      )}

      <Button variant="primary" block disabled={busy} style={{ marginTop: 6 }}>
        {busy ? <Spinner sm /> : step === 'request' ? 'Send code' : 'Reset password'}
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 13 }}>
        <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', color: '#0284a8', cursor: 'pointer', padding: 0 }}>
          ← Back to sign in
        </button>
        {step === 'verify' && (
          <button
            type="button"
            disabled={wait > 0 || busy}
            onClick={() => send()}
            style={{ background: 'none', border: 'none', color: wait > 0 ? 'var(--muted)' : '#0284a8', cursor: wait > 0 ? 'default' : 'pointer', padding: 0 }}
          >
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
      setError('Enter an email / ID and password to continue.');
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
      <div className="login-bg">
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
      </div>
    );
  }

  return (
    <div className="login-bg">
      <form className="login-card" onSubmit={submit}>
        <div className="logo">LS</div>
        <h2 style={{ textAlign: 'center', margin: '0 0 4px', color: 'var(--navy)', fontSize: 20 }}>
          LeadSoC Training Portal
        </h2>
        <p style={{ textAlign: 'center', margin: '0 0 24px', color: 'var(--muted)', fontSize: 13.5 }}>
          Sign in to continue
        </p>

        {notice && !error && <div style={boxStyle('ok')}>{notice}</div>}

        {error && (
          <div
            style={{
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              padding: '10px 12px',
              borderRadius: 10,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div className="field">
          <label>Email or Employee ID</label>
          <input
            className="input"
            placeholder="admin@leadsoc.com or LS-2291"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="field">
          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={show ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              style={{
                position: 'absolute',
                right: 8,
                top: 6,
                background: 'none',
                border: 'none',
                fontSize: 16,
                color: 'var(--muted)',
                height: 32,
                width: 32,
              }}
              aria-label="Toggle password"
            >
              {show ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'right', margin: '-6px 0 10px' }}>
          <button
            type="button"
            onClick={() => { setError(''); setNotice(''); setForgot(true); }}
            style={{ background: 'none', border: 'none', color: '#0284a8', cursor: 'pointer', fontSize: 13, padding: 0 }}
          >
            Forgot password?
          </button>
        </div>

        <Button variant="primary" block disabled={busy} style={{ marginTop: 6 }}>
          {busy ? <Spinner sm /> : 'Sign in'}
        </Button>

        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--muted)', marginTop: 18, lineHeight: 1.5 }}>
          One login for admins, managers and engineers.
          <br />
          You’re routed to the right workspace by your role.
        </p>
      </form>
    </div>
  );
}
