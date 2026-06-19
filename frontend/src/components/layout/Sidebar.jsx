import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Video, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { visibleSections } from './navConfig';

const AVATAR_COLORS = ['#7C3AED','#0E7490','#059669','#D97706','#DC2626'];
function getColor(name = '') { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function initials(name = '') { return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(); }

export default function Sidebar() {
  const { user, logout, can } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const color = getColor(user?.name);
  const sections = visibleSections(can);

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
      height: '100vh',
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: collapsed ? '20px 16px 20px' : '20px 20px 20px',
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
      padding: collapsed ? '0 8px' : '0 8px',
      marginBottom: 4,
      display: collapsed ? 'none' : 'block',
    },
    navItem: (active) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: collapsed ? '9px 20px' : '9px 10px',
      borderRadius: collapsed ? 0 : 8,
      margin: collapsed ? 0 : '1px 0',
      color: active ? 'var(--primary-light)' : 'var(--text-3)',
      background: active ? 'var(--bg-active)' : 'transparent',
      textDecoration: 'none',
      fontSize: 13,
      fontWeight: active ? 600 : 500,
      transition: 'all .15s',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      cursor: 'pointer',
      border: 'none',
      fontFamily: 'inherit',
      width: '100%',
      justifyContent: collapsed ? 'center' : 'flex-start',
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
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: collapsed ? '8px 0' : '10px 12px',
      borderRadius: 10,
      background: collapsed ? 'transparent' : 'var(--bg-hover)',
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
      boxShadow: 'var(--shadow-sm)',
    },
  };

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
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>Ministério</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>de Mídias</div>
          </div>
        )}
      </div>

      <nav style={S.nav}>
        {sections.map(section => (
          <div key={section.label} style={S.section}>
            <div style={S.sectionLabel}>{section.label}</div>
            {section.items.map(item => {
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
                {user?.role === 'admin' ? 'Líder de Mídias'
                  : user?.role === 'secretaria' ? 'Secretaria'
                  : user?.role === 'pastoral' ? 'Pastoral'
                  : 'Voluntário'}
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
