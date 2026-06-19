import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SchedulesPage from './pages/SchedulesPage';
import TasksPage from './pages/TasksPage';
import MediaPage from './pages/MediaPage';
import UsersPage from './pages/UsersPage';
import GroupsPage from './pages/GroupsPage';
import ProfilePage from './pages/ProfilePage';
import MinhasEscalasPage from './pages/MinhasEscalasPage';
import RelatoriosPage from './pages/RelatoriosPage';

function ProtectedRoute({ children, allowedRoles, requiredPermission }) {
  const { user, loading, can } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            width: 40, height: 40, border: '3px solid #E5E7EB',
            borderTopColor: '#7C3AED', borderRadius: '50%', margin: '0 auto 12px'
          }} />
          <p style={{ color: '#6B7280' }}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  if (requiredPermission && !can(requiredPermission)) return <Navigate to="/" replace />;

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="escalas" element={<SchedulesPage />} />
        <Route path="tarefas" element={<TasksPage />} />
        <Route path="midias" element={
          <ProtectedRoute requiredPermission="media.view">
            <MediaPage />
          </ProtectedRoute>
        } />
        <Route path="usuarios" element={
          <ProtectedRoute requiredPermission="users.view">
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="grupos" element={
          <ProtectedRoute requiredPermission="groups.manage">
            <GroupsPage />
          </ProtectedRoute>
        } />
        <Route path="relatorios" element={
          <ProtectedRoute requiredPermission="reports.view">
            <RelatoriosPage />
          </ProtectedRoute>
        } />
        <Route path="minhas-escalas" element={
          <ProtectedRoute requiredPermission="myschedules.view">
            <MinhasEscalasPage />
          </ProtectedRoute>
        } />
        <Route path="perfil" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'inherit', fontSize: 14 }
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
