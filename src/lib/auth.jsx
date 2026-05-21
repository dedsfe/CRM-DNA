import { createContext, useContext, useState } from 'react';

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(() => localStorage.getItem('cm_authed') === '1');
  const [user, setUserState] = useState(() => localStorage.getItem('cm_user') || null);

  const login = (password) => {
    if (APP_PASSWORD && password === APP_PASSWORD) {
      localStorage.setItem('cm_authed', '1');
      setAuthed(true);
      return true;
    }
    return false;
  };

  const chooseUser = (name) => {
    localStorage.setItem('cm_user', name);
    setUserState(name);
  };

  const logout = () => {
    localStorage.removeItem('cm_authed');
    localStorage.removeItem('cm_user');
    setAuthed(false);
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ authed, user, login, chooseUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
