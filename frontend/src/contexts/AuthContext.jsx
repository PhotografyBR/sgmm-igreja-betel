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
        .then(res => {
          setUser(res.data);
          localStorage.setItem('sgmm_user', JSON.stringify(res.data));
        })
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

  // Helper central de permissão: admin (master) sempre pode tudo.
  function can(permission) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(permission);
  }

  // Atalhos derivados de permissões (mantém compatibilidade com o código antigo)
  const canManageSchedules = can('schedules.manage');
  const canViewSchedules   = can('schedules.view');
  const canManageTasks     = can('tasks.manage');
  const canViewTasks       = can('tasks.view');
  const canViewMedia       = can('media.view');
  const canUploadMedia     = can('media.upload');
  const canViewReports     = can('reports.view');
  const canViewUsers       = can('users.view') || can('users.manage');
  const canManageUsers     = can('users.manage');
  const canManageGroups    = can('groups.manage');
  const canViewMySchedules = can('myschedules.view');

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
      can,
      isAdmin,
      canViewSchedules,
      canManageSchedules,
      canViewTasks,
      canManageTasks,
      canViewMedia,
      canUploadMedia,
      canViewReports,
      canViewUsers,
      canManageUsers,
      canManageGroups,
      canViewMySchedules,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
