import { Inbox, X } from 'lucide-react';

/* ── PageHeader ─────────────────────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

/* ── Modal ──────────────────────────────────────────────────────────────────── */
export function Modal({ title, subtitle, onClose, children, maxWidth = 520 }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth }}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ── Field ──────────────────────────────────────────────────────────────────── */
export function Field({ label, children }) {
  return (
    <div>
      {label && <label className="field-label">{label}</label>}
      {children}
    </div>
  );
}

/* ── Card ───────────────────────────────────────────────────────────────────── */
export function Card({ children, style, className = '', onClick }) {
  return (
    <div
      className={`card ${onClick ? 'card-hover' : ''} ${className}`}
      style={{ padding: 18, ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/* ── CardHeader ─────────────────────────────────────────────────────────────── */
export function CardHeader({ title, icon: Icon, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {Icon && <Icon size={16} style={{ color: 'var(--primary-light)' }} />}
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{title}</span>
      </div>
      {action}
    </div>
  );
}

/* ── Badge ──────────────────────────────────────────────────────────────────── */
const BADGE_VARIANTS = {
  success: { bg: 'var(--success-bg)', color: 'var(--success)' },
  warning: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  danger:  { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
  info:    { bg: 'var(--info-bg)',    color: 'var(--info)' },
  purple:  { bg: 'var(--primary-fade)', color: 'var(--primary-light)' },
  neutral: { bg: 'var(--bg-hover)',   color: 'var(--text-3)' },
};

export function Badge({ children, variant = 'neutral', style }) {
  const s = BADGE_VARIANTS[variant] || BADGE_VARIANTS.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 99,
      fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color,
      ...style,
    }}>
      {children}
    </span>
  );
}

/* ── ProgressBar ────────────────────────────────────────────────────────────── */
export function ProgressBar({ label, value = 0, color = 'var(--primary-light)' }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{Math.round(value)}%</span>
      </div>
      <div style={{ height: 5, background: 'var(--bg-hover)', borderRadius: 99 }}>
        <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: 99, transition: 'width .4s ease' }} />
      </div>
    </div>
  );
}

/* ── StatCard ───────────────────────────────────────────────────────────────── */
export function StatCard({ icon: Icon, label, value, color, soft, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20, cursor: onClick ? 'pointer' : 'default',
      transition: 'border-color .16s, background .16s',
    }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; }}}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: soft || 'var(--primary-fade)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon size={20} color={color || 'var(--p