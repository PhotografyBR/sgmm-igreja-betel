import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sgmm_token');
    const savedUser = localStorage.getItem('sgmm_user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Validar token no servidor
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('sgmm_token', res.data.token);
    localStorage.setItem('sgmm_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem('sgmm_token');
    localStorage.removeItem('sgmm_user');
    setUser(null);
  }

  const isAdmin = user?.role === 'admin';
  const isPastoral = user?.role === 'pastoral';
  const isSecretaria = user?.role === 'secretaria';
  const isVoluntario = user?.role === 'voluntario';
  const canManageSchedules = isAdmin || isSecretaria;
  const canManageTasks = isAdmin || isPastoral;
  const canManageUsers = isAdmin;
  const canViewMedia = isAdmin || isPastoral;

  function updateUser(newData) {
    const updated = { ...user, ...newData };
    setUser(updated);
    localStorage.setItem('sgmm_user', JSON.stringify(updated));
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      updateUser,
      isAdmin,
      isPastoral,
      isSecretaria,
      isVoluntario,
      canManageSchedules,
      canManageTasks,
      canManageUsers,
      canViewMedia
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
