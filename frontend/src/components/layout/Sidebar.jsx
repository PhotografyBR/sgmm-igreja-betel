import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, CalendarDays, CalendarCheck, CheckSquare,
  FolderOpen, BarChart3, Users, UserCircle, Clapperboard,
  ChevronsLeft, ChevronsRight
} from 'lucide-react';

const roleLabels = {
  admin: 'Líder de Mídias',
  pastoral: 'Gestão/Pastoral',
  secretaria: 'Secretaria',
  voluntario: 'Voluntário'
};

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }) {
  const { user, isAdmin, isVoluntario } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ...(isVoluntario
      ? [{ to: '/minhas-escalas', label: 'Minhas Escalas', icon: CalendarCheck }]
      : [{ to: '/escalas', label: 'Escalas', icon: CalendarDays }]
    ),
    { to: '/tarefas', label: 'Tarefas', icon: CheckSquare },
    ...(!isVoluntario ? [{ to: '/midias', label: 'Repositório', icon: FolderOpen }] : []),
    ...(!isVoluntario ? [{ to: '/relatorios', label: 'Relatórios', icon: BarChart3 }] : []),
    ...(isAdmin ? [{ to: '/usuarios', label: 'Usuários', icon: Users }] : []),
    { to: '/perfil', label: 'Meu Perfil', icon: UserCircle }
  ];

  return (
    <aside
      className={`${isOpen ? 'sidebar-open' : ''} ${collapsed ? 'collapsed' : ''}`}
      style={{
        width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        minWidth: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        background: 'linear-gradient(180deg, var(--sidebar-bg-2) 0%, var(--sidebar-bg) 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        zIndex: 50,
        transition: 'width 0.25s cubic-bezier(0.16,1,0.3,1), min-width 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.3s ease'
      }}>

      {/* Logo */}
      <div style={{
        padding: collapsed ? '22px 0' : '22px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 12
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(109,40,217,0.45)',
          flexShrink: 0
        }}>
          <Clapperboard size={20} color="white" />
        </div>
        <div className="sidebar-logo-text">
          <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.2, letterSpacing: '-0.3px' }}>Ministério</div>
          <div style={{ fontSize: 12, color: '#A5B4FC', fontWeight: 500 }}>de Mídias · Betel</div>
        </div>
      </div>

      {/* Usuário */}
      <div style={{ padding: collapsed ? '14px 10px' : '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 11,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12,
          padding: collapsed ? '8px' : '10px 12px',
          justifyContent: collapsed ? 'center' : 'flex-start'
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, flexShrink: 0,
            boxShadow: '0 2px 10px rgba(236,72,153,0.3)'
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info" style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 11, color: '#A5B4FC', fontWeight: 500 }}>
              {roleLabels[user?.role] || user?.role}
            </div>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto', overflowX: 'hidden' }}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={onClose}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={19} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span className="link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Recolher (desktop) */}
      <button
        className="sidebar-collapse-btn"
        onClick={onToggleCollapse}
        style={{
          margin: '0 12px 10px',
          padding: '9px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.05)',
          color: 'rgba(255,255,255,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 12.5,
          fontWeight: 600,
          transition: 'all 0.16s ease'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
      >
        {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /><span className="link-label">Recolher menu</span></>}
      </button>

      {/* Rodapé */}
      <div className="sidebar-footer-text" style={{ padding: '10px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontWeight: 500 }}>
          SGMM v2.0 · Igreja Betel
        </div>
      </div>
    </aside>
  );
}
