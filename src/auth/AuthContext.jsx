import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, getToken, setActiveUnit, getActiveUnit, setActiveView, getActiveView } from '../api/client';
import {
  registerPushNotifications,
  ensurePushSubscription,
  currentPushEndpoint,
} from '../services/pushNotifications';
const AuthCtx = createContext(null);

function withView(user, fresh = false) {
  if (!user) return user;
  if (user.role !== 'employee' || !user.trainerAccess) {
    setActiveView(null);
    return user;
  }
  if (fresh) setActiveView('employee');
  const view = getActiveView() === 'trainer' ? 'trainer' : 'employee';
  return { ...user, baseRole: 'employee', view, role: view === 'trainer' ? 'manager' : 'employee' };
}

function syncUnit(user, fresh = false) {
  const units = (user && user.units) || [];
  if (!units.length) {
    setActiveUnit(null);
    return;
  }
  const current = getActiveUnit();
  if (fresh || !units.some((u) => u.id === current)) setActiveUnit(units[0].id);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = getToken();
      if (t) {
        try {
          const { user } = await api.me();
          syncUnit(user);
          setUser(withView(user));
          ensurePushSubscription();
        } catch {
          setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (identifier, password) => {
    const { token, user } = await api.login(identifier, password);
    setToken(token);
    syncUnit(user, true);
    setUser(withView(user, true));

    try {
      await registerPushNotifications();
    } catch (error) {
    }

    return user;
  };

  const logout = async () => {
    try {
      const endpoint = await currentPushEndpoint();
      await api.logout(endpoint);
    } catch (e) {}
    setToken(null);
    setActiveUnit(null);
    setActiveView(null);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
