import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const icons = { dashboard: '🏠', escalas: '📅', minhasEscalas: '🗓️', tarefas: '✅', midias: '📁', relatorios: '📊', usuarios: '👥', perfil: '👤' };
const roleLabels = { admin: 'Líder de Mídias', pastoral: 'Gestão/Pastoral', secretaria: 'Secretaria', voluntario: 'Voluntário', editor: 'Editor de Conteúdo' };

export default function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin, isVoluntario, isEditor } = useAuth();
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    if (!isVoluntario || !user) return;
    const hoje = new Date();
    Promise.all([0, 1, 2].map(offset => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
      return api.get('/schedules', { params: { month: d.getMonth() + 1, year: d.getFullYear() } });
    })).then(results => {
      const all = results.flatMap(r => r.data);
      const minhas = all.filter(s => s.assignments?.some(a => a.userId === user.id));
      const p = minhas.filter(s => s.assignments?.find(x => x.userId === user.id)?.status === 'pending' && new Date(s.date + 'T00:00:00') >= hoje);
      setPendentes(p.length);
    }).catch(() => {});
  }, [user, isVoluntario]);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: icons.dashboard, exact: true },
    ...(isVoluntario
      ? [{ to: '/minhas-escalas', label: 'Minhas Escalas', icon: icons.minhasEscalas, badge: pendentes }]
      : isEditor
        ? []
        : [{ to: '/escalas', label: 'Escalas', icon: icons.escalas }]
    ),
    ...(!isEditor ? [{ to: '/tarefas', label: 'Tarefas', icon: icons.tarefas }] : []),
    { to: '/midias', label: 'Repositório', icon: icons.midias },
    ...(!isVoluntario && !isEditor ? [{ to: '/relatorios', label: 'Relatórios', icon: icons.relatorios }] : []),
    ...(isAdmin ? [{ to: '/usuarios', label: 'Usuários', icon: icons.usuarios }] : []),
    { to: '/perfil', label: 'Meu Perfil', icon: icons.perfil }
  ];

  return (
    <aside className={isOpen ? 'sidebar-open' : ''} style={{ width: 260, minWidth: 260, background: '#1E1B4B', color: 'white', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, flexShrink: 0, zIndex: 50, transition: 'transform 0.3s ease' }}>
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎬</div>
          <div><div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Ministério</div><div style={{ fontSize: 12, color: '#A5B4FC' }}>de Mídias</div></div>
        </div>
      </div>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{user?.name?.charAt(0).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: '#A5B4FC' }}>{roleLabels[user?.role] || user?.role}</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.exact} onClick={onClose}
            style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px', borderRadius: 8, marginBottom: 2, color: isActive ? 'white' : 'rgba(255,255,255,0.65)', background: isActive ? 'rgba(124,58,237,0.5)' : 'transparent', fontSize: 14, fontWeight: isActive ? 600 : 400, transition: 'all 0.15s', textDecoration: 'none', justifyContent: 'space-between' })}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 20 }}>{item.icon}</span>{item.label}</span>
            {item.badge > 0 && <span style={{ background: '#EF4444', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{item.badge}</span>}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>SGMM v1.0 · Igreja Betel</div>
      </div>
    </aside>
  );
}
