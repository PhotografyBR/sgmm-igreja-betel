import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Bell, UserCircle, LogOut, CalendarDays, CheckSquare, Eye, FolderUp, BellRing } from 'lucide-react';

const notifIcons = {
  schedule: CalendarDays, task: CheckSquare, task_review: Eye,
  confirmation: CheckSquare, media_upload: FolderUp
};

const PAGE_TITLES = {
  '/dashboard': 'Dashboard', '/escalas': 'Escalas',
  '/minhas-escalas': 'Minhas Escalas', '/tarefas': 'Tarefas',
  '/repositorio': 'Repositorio', '/relatorios': 'Relatorios',
  '/usuarios': 'Usuarios', '/perfil': 'Meu Perfil',
};

function timeAgo(date) {
  if (!date) return '';
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const AVATAR_COLORS = ['#7C3AED','#0E7490','#059669','#D97706','#DC2626'];
function getColor(name = '') { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const wrapRef = useRef(null);

  const pageTitle = PAGE_TITLES[location.pathname] || 'SGMM';
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const color = getColor(user?.name);
  const initials = (user?.name || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function fetchUnread() {
    try { const res = await api.get('/notifications/unread-count'); setUnreadCount(res.data.count); } catch {}
  }

  async function toggleNotifications() {
    if (!showNotifications) {
      try { const res = await api.get('/notifications'); setNotifications(res.data); } catch {}
    }
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  }

  async function markAllRead() {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  }

  return (
    <header style={{
      height: 58,
      background: 'var(--bg-sidebar)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <h1 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>{pageTitle}</h1>
        <span style={{
          fontSize: 12, color: 'var(--text-4)', fontWeight: 500,
          background: 'var(--bg-hover)', borderRadius: 99, padding: '3px 12px',
          textTransform: 'capitalize',
        }}>{hoje}</span>
      </div>

      <div ref={wrapRef} style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <button onClick={toggleNotifications} style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--bg-hover)',
            border: '1px solid var(--border-soft)', color: 'var(--text-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            transition: 'background .15s', position: 'relative',
          }}>
            <Bell size={17} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--primary)', border: '2px solid var(--bg-sidebar)',
              }} />
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute', top: 44, right: 0, width: 340,
              background: 'var(--bg-sidebar)', border: '1px solid var(--border-soft)',
              borderRadius: 14, boxShadow: 'var(--shadow)', zIndex: 100,
            }} className="fade-in">
              <div style={{
                padding: '14px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <BellRing size={14} style={{ color: 'var(--primary-light)' }} /> Notificacoes
                </span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{
                    background: 'none', border: 'none', fontSize: 12,
                    color: 'var(--primary-light)', fontWeight: 600, cursor: 'pointer',
                  }}>Marcar tudo lido</button>
                )}
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
                    Sem notificacoes
                  </div>
                ) : notifications.slice(0, 12).map(n => {
                  const Icon = notifIcons[n.type] || Bell;
                  return (
                    <div key={n.id} style={{
                      padding: '11px 16px',
                      background: n.read ? 'transparent' : 'var(--primary-fade)',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', gap: 11, alignItems: 'flex-start',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                        background: n.read ? 'var(--bg-hover)' : 'var(--primary-fade)',
                        color: n.read ? 'var(--text-4)' : 'var(--primary-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={14} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: 'var(--text-2)' }}>{n.title}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-4)', flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>{n.message}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }} style={{
            width: 36, height: 36, borderRadius: 10,
            background: color, border: 'none',
            color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer',
            transition: 'opacity .15s',
          }}>
            {initials}
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute', top: 44, right: 0, width: 210,
              background: 'var(--bg-sidebar)', border: '1px solid var(--border-soft)',
              borderRadius: 14, boxShadow: 'var(--shadow)', zIndex: 100, overflow: 'hidden',
            }} className="fade-in">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }} className="truncate">{user?.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }} className="truncate">{user?.email}</div>
              </div>
              <button onClick={() => { navigate('/perfil'); setShowUserMenu(false); }} style={{
                width: '100%', padding: '11px 16px', background: 'none', border: 'none',
                textAlign: 'left', fontSize: 13, color: 'var(--text-2)', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                transition: 'background .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <UserCircle size={15} /> Meu Perfil
              </button>
              <button onClick={() => { logout(); navigate('/login'); }} style={{
                width: '100%', padding: '11px 16px', background: 'none',
                border: 'none', borderTop: '1px solid var(--border)',
                textAlign: 'left', fontSize: 13, color: 'var(--danger)', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                transition: 'background .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <LogOut size={15} /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
