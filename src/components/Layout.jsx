import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getActiveUnit, setActiveUnit, setActiveView } from '../api/client';
import { initials } from './ui';
import PortalAssistant from './PortalAssistant';
import NotificationBell from './NotificationBell';
import { useUsageTracking } from '../services/usageTracker';

const TRAINING = (withDomains = true) => ({
  group: 'Training', icon: '🎓',
  children: [
    { to: '/training-overview', label: 'Cohort Overview', icon: '📈', key: 'cohort' },
    { to: '/materials', label: 'Materials', icon: '📁', key: 'materials' },
    ...(withDomains ? [{ to: '/domains', label: 'Domains', icon: '🗂️', key: 'domains' }] : []),
    { to: '/community', label: 'Community', icon: '💬', key: 'community' },
  ],
});

const NAV = {
  admin: [
    { to: '/', label: 'Dashboard', icon: '📊', end: true },
    { to: '/people', label: 'People', icon: '👥' },
    { to: '/categories', label: 'BU Categories', icon: '🏷️' },
    TRAINING(true),
    { to: '/interviews', label: 'Interviews', icon: '🎤' },
    { to: '/bench', label: 'Bench Tracker', icon: '🪑' },
    { to: '/insights', label: 'Insights', icon: '📈' },
    { to: '/recycle-bin', label: 'Recycle Bin', icon: '🗑️' },
    { to: '/account', label: 'Settings', icon: '⚙️' },
  ],
  cto: [
    { to: '/', label: 'Dashboard', icon: '📊', end: true },
    { to: '/people', label: 'People', icon: '👥' },
    TRAINING(true),
    { to: '/interviews', label: 'Interviews', icon: '🎤' },
    { to: '/insights', label: 'Insights', icon: '📈' },
    { to: '/account', label: 'Settings', icon: '⚙️' },
  ],
  bu: [
    { to: '/', label: 'Dashboard', icon: '📊', end: true, key: 'dashboard' },
    { to: '/people', label: 'My Team', icon: '👥', key: 'people' },
    TRAINING(true),
    { to: '/interviews', label: 'Interviews', icon: '🎤', key: 'interviews' },
    { to: '/account', label: 'Settings', icon: '⚙️' },
  ],
  manager: [
    { to: '/', label: 'Dashboard', icon: '📊', end: true },
    { to: '/people', label: 'My Team', icon: '👥' },
    TRAINING(false),
    { to: '/interviews', label: 'Interviews', icon: '🎤' },
    { to: '/account', label: 'Settings', icon: '⚙️' },
  ],
  employee: [
    { to: '/', label: 'Domains', icon: '🎯', end: true },
    { to: '/interviews', label: 'Interviews', icon: '🎤' },
    { to: '/progress', label: 'My Progress', icon: '📈' },
    { to: '/profile', label: 'Profile & Resume', icon: '👤' },
    { to: '/community', label: 'Community', icon: '💬' },
    { to: '/help', label: 'How to use', icon: '🎬' },
    { to: '/account', label: 'Settings', icon: '⚙️' },
  ],
};

const ROLE_LABEL = { admin: 'Administrator', cto: 'CTO', bu: 'Business Unit', manager: 'Trainer', employee: 'Engineer' };

function applyMenuConfig(items, cfg) {
  if (!cfg || cfg.length === 0) return items;
  const keep = (it) => !it.key || cfg.includes(it.key);
  return items
    .map((i) => {
      if (i.group) {
        const kids = i.children.filter(keep);
        return kids.length ? { ...i, children: kids } : null;
      }
      return keep(i) ? i : null;
    })
    .filter(Boolean);
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  useUsageTracking(!!user);
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  let items = NAV[user.role] || [];
  if (user.role === 'bu') items = applyMenuConfig(items, user.menuConfig);
  if (user.subAdmin) items = items.filter((i) => i.to !== '/insights' && i.to !== '/logs');

  const [openGroups, setOpenGroups] = useState(() => {
    const init = {};
    items.forEach((i) => { if (i.group && i.children?.some((c) => loc.pathname.startsWith(c.to))) init[i.group] = true; });
    return init;
  });
  const toggleGroup = (g) => setOpenGroups((s) => ({ ...s, [g]: !s[g] }));

  const flat = items.flatMap((i) => (i.group ? i.children : [i]));
  const current = flat.find((i) => i.to && (i.end ? loc.pathname === i.to : loc.pathname.startsWith(i.to) && i.to !== '/'));
  const title = current?.label || (loc.pathname === '/' ? flat.find((i) => i.to)?.label : 'Details');

  return (
    <div className="shell">
      <div className={`backdrop ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="logo">LS</div>
          <div><b>LeadSoC</b><br /><span>TEDP</span></div>
        </div>

        <nav>
          {items.map((i, idx) =>
            i.group ? (
              <div key={`g-${idx}`}>
                <button type="button" className={`nav-item ${openGroups[i.group] ? 'active' : ''}`}
                  onClick={() => toggleGroup(i.group)}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span className="ic">{i.icon}</span>{i.group}
                  <span style={{ marginLeft: 'auto', fontSize: 11 }}>{openGroups[i.group] ? '▾' : '▸'}</span>
                </button>
                {openGroups[i.group] && (
                  <div style={{ marginLeft: 14 }}>
                    {i.children.map((c) => (
                      <NavLink key={c.to} to={c.to} end={c.end}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => setOpen(false)}>
                        <span className="ic">{c.icon}</span>{c.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink key={i.to} to={i.to} end={i.end}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setOpen(false)}>
                <span className="ic">{i.icon}</span>{i.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="side-foot">
          Signed in as<br />
          <div className="side-foot1">
            <b style={{ color: '#dfe5f5' }}>{user.name}</b>
            <button className="logout" onClick={logout} title="Sign out">⏻</button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setOpen(true)} aria-label="Menu">☰</button>
          <div style={{ flex: 1 }}>
            <div className="title">{title}</div>
            <div className="subtitle hide-mobile">
              {user.subAdmin ? 'Sub admin' : ROLE_LABEL[user.role]} workspace
              {user.role === 'bu' && (user.units || []).length > 0 && (() => {
                const cur = user.units.find((u) => u.id === getActiveUnit()) || user.units[0];
                return cur ? ` · ${cur.name}${cur.type === 'temporary' ? ' (temporary)' : ''}` : '';
              })()}
            </div>
          </div>
          <div className="topbar-actions">
            {user.trainerAccess && user.baseRole === 'employee' && (
              <select
                className="select"
                title="Switch view"
                style={{ height: 36, width: 'auto', fontWeight: 600 }}
                value={user.view || 'employee'}
                onChange={(e) => {
                  setActiveView(e.target.value);
                  window.location.assign('/');
                }}
              >
                <option value="employee">👤 Engineer view</option>
                <option value="trainer">🧑‍🏫 Trainer view</option>
              </select>
            )}
            {user.role === 'bu' && (user.units || []).length > 1 && (
              <select
                className="select"
                title="Switch Business Unit"
                style={{ height: 36, width: 'auto', maxWidth: 260, fontWeight: 600 }}
                value={getActiveUnit() || ''}
                onChange={(e) => {
                  setActiveUnit(e.target.value);
                  window.location.assign('/');
                }}
              >
                {user.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}{u.categoryName ? ` · ${u.categoryName}` : ''}{u.type === 'temporary' ? ' (temporary)' : ''}
                  </option>
                ))}
              </select>
            )}

            <NotificationBell />

            <div className="userchip">
              <div className="stack hide-mobile" style={{ alignItems: 'flex-end', lineHeight: 1.2 }}>
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{user.email}</span>
              </div>
              <div className="avatar" title={user.name}>{initials(user.name)}</div>
            </div></div>
        </header>
        <main className="content">{children}</main>

        <PortalAssistant />
      </div>
    </div>
  );
}
