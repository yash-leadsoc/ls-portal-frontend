import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, getToken } from '../api/client';
import {
  registerPushNotifications,
  ensurePushSubscription,
  currentPushEndpoint,
} from '../services/pushNotifications';
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = getToken();
      if (t) {
        try {
          const { user } = await api.me();
          setUser(user);
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
    setUser(user);

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
