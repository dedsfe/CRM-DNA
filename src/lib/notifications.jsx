import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth';
import {
  fetchNotifications, markNotificationRead, markAllNotificationsRead,
} from './api';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setNotifications(await fetchNotifications(user));
    } catch {
      /* silencioso — a inbox não deve quebrar o app */
    }
  }, [user]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, [refresh]);

  const markRead = async (id) => {
    setNotifications(p => p.map(n => (n.id === id ? { ...n, read: true } : n)));
    try { await markNotificationRead(id); } catch { refresh(); }
  };

  const markAll = async () => {
    setNotifications(p => p.map(n => ({ ...n, read: true })));
    try { await markAllNotificationsRead(user); } catch { refresh(); }
  };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unread, refresh, markRead, markAll }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
