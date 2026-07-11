import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MoreHorizontal, X, LogOut } from 'lucide-react';
import { mobileItems, visibleSections } from './navConfig';

// Barra de navegação inferior do celular.
// Mostra até 4 atalhos principais + botão "Mais" que abre todas as seções.
export default function BottomNav() {
  const { can, user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const primary = mobileItems(can, isAdmin).slice(0, 4);
  const allSections = visibleSections(can, isAdmin);

  function go(to) {
    setSheetOpen(false);
    navigate(to);
  }

  return (
    <>
      <nav className="bottom-nav hide-desktop">
        {primary.map(item => {
          const active = location.pathname === item.to;
          return (
            <NavLink key={item.to} to={item.to} className="bottom-nav-item" style={{
              color: active ? 'var(--primary)' : 'var(--text-4)',
            }}>
              <item.icon size={21} strokeWidth={active ? 2.4 : 2} />
              <span style={{ fontWeight: active ? 700 : 500 }}>{item.label}</span>
            </NavLink>
          );
        })}
        <button className="bottom-nav-item" onClick={() => setSheetOpen(true)} style={{ color: sheetOpen ? 'var(--primary)' : 'var(--text-4)' }}>
          <MoreHorizontal size={21} />
          <span>Mais</span>
        </button>
      </nav>

      {sheetOpen && (
        <div className="bottom-sheet-overlay hide-desktop" onClick={e => e.target === e.currentTarget && setSheetOpen(false)}>
          <div className="bottom-sheet fade-in">
            <div className="bottom-sheet-grip" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 14px' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Menu</span>
              <button onClick={() => setSheetOpen(false)} style={{
                background: 'var(--bg-hover)', border: 'none', borderRadius: 8, width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-3)',
              }}><X size={16} /></button>
            </div>

            {allSections.map(section => (
              <div key={section.label} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{section.label}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {section.items.map(item => {
                    const active = location.pathname === item.to;
                    return (
                      <button key={item.to} onClick={() => go(item.to)} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                        padding: '14px 8px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                        border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'),
                        background: active ? 'var(--primary-fade)' : 'var(--bg-card)',
                        color: active ? 'var(--primary-light)' : 'var(--text-2)',
                      }}>
                        <item.icon size={20} />
                        <span style={{ fontSize: 11.5, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button onClick={() => { logout(); }} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
              padding: '12px', borderRadius: 12, marginTop: 4, cursor: 'pointer', fontFamily: 'inherit',
              border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--danger)',
              fontSize: 13, fontWeight: 700,
            }}>
              <LogOut size={16} /> Sair da conta
            </button>
          </div>
        </div>
      )}
    </>
  );
}
