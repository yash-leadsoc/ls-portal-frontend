import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon, ToastProvider } from './components/ExamUI';
import { adminRequest } from './adminApi';
import './exam.css';
import './exam-admin.css';
import { useNavigate } from 'react-router-dom';

const NAV = [
  { to: '/exam/admin', label: 'Overview', icon: 'home', end: true },
  { to: '/exam/admin/exams', label: 'Exams', icon: 'file' },
  { to: '/exam/admin/candidates', label: 'Candidates', icon: 'users' },
  { to: '/exam/admin/results', label: 'Results', icon: 'chart' },
  { to: '/exam/admin/evaluation', label: 'Evaluation', icon: 'checkSquare' },
  { to: '/exam/admin/proctoring', label: 'Proctoring', icon: 'shield' },
];



// App.jsx renders <ExamAdminLayout><Routes/></ExamAdminLayout>; also works as a layout route (<Outlet/>).
export default function ExamAdminLayout({ children }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  useEffect(() => setOpen(false), [loc.pathname]);

  // Secure logout: revoke the token server-side first (best effort), then clear local state.
  // (Previously this handler lived outside the component, so `navigate` was undefined and threw.)
  const handleLogout = async () => {
    try { await adminRequest('admin-auth/logout', { method: 'POST', body: {} }); } catch { /* token may already be invalid */ }
    localStorage.removeItem('exam_admin_token');
    localStorage.removeItem('exam_admin_user');
    navigate('/exam/admin/login', { replace: true });
  };

  return (
    <ToastProvider>
      <div className="ex-root ex-admin">
        {open && <div className="ex-admin__scrim" onClick={() => setOpen(false)} />}
        <aside className={`ex-sidebar ${open ? 'open' : ''}`} aria-label="Exam administration">
          <div className="ex-sidebar__brand">
            <div className="ex-logo">LS</div>
            <div><b>LeadSoc Exams</b><small>Administration</small></div>
          </div>
          <div className="ex-sidebar__label">Manage</div>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `ex-navlink ${isActive ? 'active' : ''}`}>
              <Icon name={n.icon} size={18} />{n.label}
            </NavLink>
          ))}
          <div className="ex-sidebar__label">Shortcuts</div>
          <NavLink to="/exam" className="ex-navlink"><Icon name="eye" size={18} />Student portal</NavLink>
          {/* <div className="ex-sidebar__foot"> */}
          {/* <NavLink to="/" className="ex-navlink"><Icon name="logout" size={18} />Back to LeadSoc</NavLink> */}
          {/* </div> */}
          <div className="exam-admin-logout">
            <button type="button" onClick={handleLogout}>
              <Icon name="logout" size={18} />
              <span>Logout</span>
            </button>
          </div>
        </aside>
        <main className="ex-admin__main">
          <button type="button" className="ex-btn ex-btn--secondary ex-btn--sm ex-menu-btn" style={{ marginBottom: 14 }} onClick={() => setOpen(true)}>
            <Icon name="menu" size={16} /> Menu
          </button>
          {children ?? <Outlet />}
        </main>
      </div>
    </ToastProvider>
  );
}
