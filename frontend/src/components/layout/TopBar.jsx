import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function TopBar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
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

  const notifIcons = {
    schedule: '📅',
    task: '✅',
    task_review: '👁',
    confirmation: '✅',
    media_upload: '📁'
  };

  return (
    <header style={{
      height: 60,
      background: 'white',
      borderBottom: '1px solid #E5E7EB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      flexShrink: 0
    }}>
      {/* Menu hamburguer (mobile) */}
      <button
        onClick={onMenuClick}
        style={{ background: 'none', border: 'none', fontSize: 22, color: '#374151', padding: 4 }}
      >
        ☰
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
        {/* Notificações */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={toggleNotifications}
            style={{
              background: 'none', border: 'none', fontSize: 20,
              padding: '6px 8px', borderRadius: 8, position: 'relative',
              color: '#374151'
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                background: '#EF4444', color: 'white', borderRadius: '50%',
                width: 16, height: 16, fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 4,
              width: 320, background: 'white', borderRadius: 12,
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              border: '1px solid #E5E7EB', zIndex: 100
            }} className="fade-in">
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid #E5E7EB',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Notificações</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{
                    background: 'none', border: 'none', fontSize: 12,
                    color: '#7C3AED', cursor: 'pointer', fontFamily: 'inherit'
                  }}>
                    Marcar tudo como lido
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
                    Nenhuma notificação
                  </div>
                ) : notifications.slice(0, 10).map(n => (
                  <div key={n.id} style={{
                    padding: '10px 16px',
                    background: n.read ? 'white' : '#F5F3FF',
                    borderBottom: '1px solid #F3F4F6',
                    display: 'flex', gap: 10
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>
                      {notifIcons[n.type] || '🔔'}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: '#1F2937' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        {n.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Menu do usuário */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              border: 'none', width: 34, height: 34, borderRadius: '50%',
              color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer'
            }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 4,
              width: 180, background: 'white', borderRadius: 10,
              boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
              border: '1px solid #E5E7EB', zIndex: 100
            }} className="fade-in">
              <button
                onClick={() => { navigate('/perfil'); setShowUserMenu(false); }}
                style={{
                  width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                  textAlign: 'left', fontSize: 14, cursor: 'pointer', color: '#374151',
                  display: 'flex', alignItems: 'center', gap: 8, borderRadius: '10px 10px 0 0'
                }}
              >
                👤 Meu Perfil
              </button>
              <hr style={{ margin: 0, borderColor: '#E5E7EB' }} />
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                  textAlign: 'left', fontSize: 14, cursor: 'pointer', color: '#EF4444',
                  display: 'flex', alignItems: 'center', gap: 8, borderRadius: '0 0 10px 10px'
                }}
              >
                🚪 Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
