import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  Menu, Bell, UserCircle, LogOut, CalendarDays,
  CheckSquare, Eye, FolderUp, BellRing
} from 'lucide-react';

const notifIcons = {
  schedule: CalendarDays,
  task: CheckSquare,
  task_review: Eye,
  confirmation: CheckSquare,
  media_upload: FolderUp
};

function timeAgo(date) {
  if (!date) return '';
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function TopBar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function fetchUnread() {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch {}
  }

  async function toggleNotifications() {
    if (!showNotifications) {
      try {
        const res = await api.get('/notifications');
        setNotifications(res.data);
      } catch {}
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

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <header style={{
      height: 62,
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border-soft)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      flexShrink: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={onMenuClick}
          className="btn btn-ghost btn-icon"
          style={{ display: 'inline-flex' }}
          aria-label="Abrir menu"
        >
          <Menu size={21} />
        </button>
        <span className="hide-mobile" style={{
          fontSize: 13, color: 'var(--text-3)', fontWeight: 500, textTransform: 'capitalize'
        }}>
          {hoje}
        </span>
      </div>

      <div ref={wrapRef} style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
        {/* Notificações */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={toggleNotifications}
            className="btn btn-ghost btn-icon"
            aria-label="Notificações"
            style={{ position: 'relative' }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="pulse-dot" style={{
                position: 'absolute', top: 4, right: 4,
                background: 'var(--danger)', color: 'white', borderRadius: 999,
                minWidth: 17, height: 17, fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px', border: '2px solid white'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="dropdown dropdown-notif fade-in-scale" style={{ width: 340 }}>
              <div style={{
                padding: '13px 16px', borderBottom: '1px solid var(--border-soft)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <BellRing size={15} style={{ color: 'var(--primary)' }} /> Notificações
                </span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{
                    background: 'none', border: 'none', fontSize: 12,
                    color: 'var(--primary)', fontWeight: 600
                  }}>
                    Marcar tudo como lido
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-4)', fontSize: 13.5 }}>
                    Nenhuma notificação por aqui
                  </div>
                ) : notifications.slice(0, 12).map(n => {
                  const Icon = notifIcons[n.type] || Bell;
                  return (
                    <div key={n.id} style={{
                      padding: '11px 16px',
                      background: n.read ? 'transparent' : 'var(--primary-fade)',
                      borderBottom: '1px solid var(--border-soft)',
                      display: 'flex', gap: 11, alignItems: 'flex-start'
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                        background: n.read ? 'var(--border-soft)' : 'var(--primary-soft)',
                        color: n.read ? 'var(--text-4)' : 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Icon size={15} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: 'var(--text)' }}>
                            {n.title}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-4)', flexShrink: 0 }}>
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
                          {n.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Menu do usuário */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            style={{
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
              border: '2px solid white', width: 37, height: 37, borderRadius: '50%',
              color: 'white', fontWeight: 700, fontSize: 14,
              boxShadow: 'var(--shadow-sm)', transition: 'transform 0.16s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </button>

          {showUserMenu && (
            <div className="dropdown fade-in-scale" style={{ width: 210 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-soft)' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }} className="truncate">{user?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }} className="truncate">{user?.email}</div>
              </div>
              <button
                onClick={() => { navigate('/perfil'); setShowUserMenu(false); }}
                style={{
                  width: '100%', padding: '11px 16px', background: 'none', border: 'none',
                  textAlign: 'left', fontSize: 13.5, color: 'var(--text-2)', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.12s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border-soft)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <UserCircle size={16} /> Meu Perfil
              </button>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '11px 16px', background: 'none', border: 'none',
                  borderTop: '1px solid var(--border-soft)',
                  textAlign: 'left', fontSize: 13.5, color: 'var(--danger)', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.12s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-soft)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
