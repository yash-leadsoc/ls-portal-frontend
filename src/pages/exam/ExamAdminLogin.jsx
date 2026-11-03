
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// // import { examApi } from '../../api/examApi'; // Remove if not used elsewhere

// const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// export default function ExamAdminLogin() {
//   const navigate = useNavigate();

//   const [identifier, setIdentifier] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     setError('');
//     setLoading(true);

//     try {
//       const response = await fetch(`${API}/exam/admin-auth/login`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ identifier, password }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.message || 'Login failed');
//       }

//       localStorage.setItem('exam_admin_token', data.token);
//       localStorage.setItem('exam_admin_user', JSON.stringify(data.admin));

//       navigate('/exam/admin', { replace: true });
//     } catch (err) {
//       setError(err.message || 'Unable to login');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="exam-admin-login">
//       <form onSubmit={handleLogin}>
//         <h1>Exam Administration</h1>
//         <p>Sign in with your Exam Admin credentials</p>

//         {error && <p className="error">{error}</p>}

//         <label>Admin ID or Email</label>
//         <input
//           value={identifier}
//           onChange={(e) => setIdentifier(e.target.value)}
//           required
//           autoComplete="username"
//         />

//         <label>Password</label>
//         <input
//           type="password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           required
//           autoComplete="current-password"
//         />

//         <button type="submit" disabled={loading}>
//           {loading ? 'Signing in...' : 'Login'}
//         </button>
//       </form>
//     </div>
//   );
// }



import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './exam-admin-login.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ExamAdminLogin() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API}/exam/admin-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid admin credentials');
      }

      localStorage.setItem('exam_admin_token', data.token);
      localStorage.setItem('exam_admin_user', JSON.stringify(data.admin));

      navigate('/exam/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ea-login">
      <div className="ea-login-background">
        <div className="ea-login-orb ea-login-orb-one" />
        <div className="ea-login-orb ea-login-orb-two" />
      </div>

      <div className="ea-login-container">
        <div className="ea-login-brand">
          <div className="ea-login-logo">LS</div>
          <div>
            <h2>LeadSoc Exams</h2>
            <span>EXAMINATION PLATFORM</span>
          </div>
        </div>

        <div className="ea-login-card">
          <div className="ea-login-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3L20 6V11.5C20 16.2 16.7 20.4 12 22C7.3 20.4 4 16.2 4 11.5V6L12 3Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M9 12L11 14L15.5 9.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="ea-login-heading">
            <span className="ea-login-eyebrow">ADMINISTRATOR ACCESS</span>
            <h1>Welcome back</h1>
            <p>Sign in to manage examinations and candidates.</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="ea-login-field">
              <label htmlFor="admin-identifier">Admin ID or Email</label>
              <input
                id="admin-identifier"
                type="text"
                placeholder="Enter your admin ID or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="ea-login-field">
              <label htmlFor="admin-password">Password</label>
              <div className="ea-login-password">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="ea-login-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div className="ea-login-error" role="alert">
                <span>!</span>
                {error}
              </div>
            )}

            <button
              className="ea-login-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in to Dashboard'}
              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="ea-login-security">
            <span className="ea-login-lock">🔒</span>
            Secure administrator authentication
          </div>
        </div>

        <div className="ea-login-footer">
          <span>© {new Date().getFullYear()} LeadSoc Technologies</span>
          <span>Examination Administration Portal</span>
        </div>
      </div>
    </div>
  );
}
