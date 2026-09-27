import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Button, Spinner } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);

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
