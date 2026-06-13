import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, CalendarDays, CalendarCheck, CheckSquare,
  FolderOpen, BarChart3, Users, UserCircle, Video,
  ChevronLeft, ChevronRight, LogOut
} from 'lucide-react';

const NAV = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/escalas',        icon: CalendarDays,    label: 'Escalas' },
      { to: '/minhas-escalas', icon: CalendarCheck,   label: 'Minhas' },
      { to: '/tarefas',        icon: CheckSquare,     label: 'Tarefas' },
      { to: '/relatorios',     icon: BarChart3,       label: 'Relatorios' },
    ]
  },
  {
    label: 'Conta',
    items: [
      { to: '/usuarios', icon: Users,      label: 'Usuarios', adminOnly: true },
      { to: '/perfil',   icon: UserCircle, label: 'Perfil' },
    ]
  }
];

const AVATAR_COLORS = ['#7C3AED','#0E7490','#059669','#D97706','#DC2626'];
function getColor(name = '') { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function initials(name = '') { return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(); }

function useIsMobile() {
  return window.innerWidth <= 600;
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();

  const color = getColor(user?.name);

  /* Mobile: bottom nav bar */
  if (isMobile) {
    const allItems = NAV.flatMap(s => s.items).filter(item => !item.adminOnly || user?.role === 'admin');
    return (
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        width: '100%', height: 60,
        background: 'var(--bg-sidebar)', borderTop: '1px solid var(--border)',
        padding: '0 4px', flexShrink: 0,
      }}>
        {allItems.map(item => {
          const active = location.pathname === item.to;
          return (
            <NavLink key={item.to} to={item.to} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '6px 8px', borderRadius: 10, flex: 1,
              color: active ? 'var(--primary-light)' : 'var(--text-5)',
              textDecoration: 'none', fontSize: 9, fontWeight: active ? 700 : 500,
              background: active ? 'var(--bg-active)' : 'transparent',
              transition: 'all .15s',
            }}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <button onClick={logout} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          padding: '6px 8px', borderRadius: 10, flex: 1,
          color: 'var(--text-5)', background: 'none', border: 'none',
          fontSize: 9, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </nav>
    );
  }

  const S = {
    sidebar: {
      width: collapsed ? 64 : 220,
      minWidth: collapsed ? 64 : 220,
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width .22s ease, min-width .22s ease',
      overflow: 'hidden',
      position: 'relative',
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: collapsed ? '20px 16px' : '20px 20px',
      borderBottom: '1px solid var(--border)',
      overflow: 'hidden',
      transition: 'padding .22s',
    },
    logoIcon: {
      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
      background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    nav: { flex: 1, padding: '12px 0', overflowY: 'auto', overflowX: 'hidden' },
    section: { padding: collapsed ? '12px 0 4px' : '12px 12px 4px' },
    sectionLabel: {
      fontSize: 10, fontWeight: 700, color: 'var(--text-5)',
      textTransform: 'uppercase', letterSpacing: 1,
      padding: '0 8px', marginBottom: 4,
      display: collapsed ? 'none' : 'block',
    },
    navItem: (active) => ({
      display: 'flex', alignItems: 'center', gap: 10,
      padding: collapsed ? '9px 20px' : '9px 10px',
      borderRadius: collapsed ? 0 : 8,
      margin: collapsed ? 0 : '1px 0',
      color: active ? 'var(--primary-light)' : 'var(--text-4)',
      background: active ? 'var(--bg-active)' : 'transparent',
      textDecoration: 'none', fontSize: 13,
      fontWeight: active ? 600 : 500,
      transition: 'all .15s', whiteSpace: 'nowrap', overflow: 'hidden',
      cursor: 'pointer', border: 'none', fontFamily: 'inherit',
      width: '100%', justifyContent: collapsed ? 'center' : 'flex-start',
    }),
    activeDot: {
      width: 6, height: 6, borderRadius: '50%',
      background: 'var(--primary)', marginLeft: 'auto', flexShrink: 0,
    },
    userArea: {
      padding: collapsed ? '12px 8px' : '12px',
      borderTop: '1px solid var(--border)',
    },
    userCard: {
      display: 'flex', alignItems: 'center', gap: 10,
      padding: collapsed ? '8px 0' : '10px 12px',
      borderRadius: 10,
      background: collapsed ? 'transparent' : 'var(--bg-input)',
      overflow: 'hidden',
      justifyContent: collapsed ? 'center' : 'flex-start',
    },
    avatar: {
      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
      background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: 12, fontWeight: 800,
    },
    collapseBtn: {
      position: 'absolute', top: 22, right: -12,
      width: 24, height: 24, borderRadius: '50%',
      background: 'var(--bg-card)', border: '1px solid var(--border-soft)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', color: 'var(--text-4)', zIndex: 10,
      transition: 'background .15s',
    },
  };

  const fullNAV = [
    {
      label: 'Principal',
      items: [
        { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/escalas',        icon: CalendarDays,    label: 'Escalas' },
        { to: '/minhas-escalas', icon: CalendarCheck,   label: 'Minhas Escalas' },
        { to: '/tarefas',        icon: CheckSquare,     label: 'Tarefas' },
        { to: '/repositorio',    icon: FolderOpen,      label: 'Repositorio' },
        { to: '/relatorios',     icon: BarChart3,       label: 'Relatorios' },
      ]
    },
    {
      label: 'Conta',
      items: [
        { to: '/usuarios', icon: Users,      label: 'Usuarios', adminOnly: true },
        { to: '/perfil',   icon: UserCircle, label: 'Meu Perfil' },
      ]
    }
  ];

  return (
    <div style={S.sidebar}>
      <button style={S.collapseBtn} onClick={() => setCollapsed(c => !c)}>
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <div style={S.logo}>
        <div style={S.logoIcon}>
          <Video size={16} color="white" />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>Ministerio</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>de Midias</div>
          </div>
        )}
      </div>

      <nav style={S.nav}>
        {fullNAV.map(section => (
          <div key={section.label} style={S.section}>
            <div style={S.sectionLabel}>{section.label}</div>
            {section.items
              .filter(item => !item.adminOnly || user?.role === 'admin')
              .map(item => {
                const active = location.pathname === item.to;
                return (
                  <NavLink key={item.to} to={item.to} style={S.navItem(active)}>
                    <item.icon size={16} style={{ flexShrink: 0 }} />
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && active && <div style={S.activeDot} />}
                  </NavLink>
                );
              })}
          </div>
        ))}
      </nav>

      <div style={S.userArea}>
        <div style={S.userCard}>
          <div style={S.avatar}>{initials(user?.name)}</div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }} className="truncate">{user?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>
                {user?.role === 'admin' ? 'Lider de Midias' : user?.role === 'secretaria' ? 'Secretaria' : 'Voluntario'}
              </div>
            </div>
          )}
          {!collapsed && (
            <button onClick={logout} title="Sair" style={{
              background: 'none', border: 'none', color: 'var(--text-4)',
              cursor: 'pointer', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center',
              transition: 'color .15s',
            }}>
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
