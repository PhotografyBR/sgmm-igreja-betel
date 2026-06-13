import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sgmm_sidebar_collapsed') === '1');

  function toggleCollapse() {
    setCollapsed(prev => {
      localStorage.setItem('sgmm_sidebar_collapsed', prev ? '0' : '1');
      return !prev;
    });
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="mobile-overlay"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
            backdropFilter: 'blur(2px)', zIndex: 55, display: 'block'
          }}
        />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
