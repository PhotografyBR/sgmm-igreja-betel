import { Inbox, X } from 'lucide-react';

/* PageHeader */
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

/* Modal */
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

/* Field */
export function Field({ label, children }) {
  return (
    <div>
      {label && <label className="field-label">{label}</label>}
      {children}
    </div>
  );
}

/* Card */
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

/* CardHeader */
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

/* Badge */
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

/* ProgressBar */
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

/* StatCard */
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
        <Icon size={20} color={color || 'var(--primary-light)'} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: -1, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{label}</div>
    </div>
  );
}

/* SegmentedControl */
export function SegmentedControl({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', background: 'var(--bg-hover)', borderRadius: 10, padding: 3, gap: 2 }}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8, border: 'none',
            background: active ? 'var(--bg-card)' : 'transparent',
            color: active ? 'var(--text)' : 'var(--text-4)',
            fontSize: 12, fontWeight: active ? 700 : 500,
            cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
            boxShadow: active ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
          }}>
            {opt.icon && <opt.icon size={14} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* EmptyState */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-4)' }}>
      {Icon && (
        <div style={{
          width: 52, height: 52, borderRadius: 14, background: 'var(--bg-hover)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <Icon size={24} color="var(--text-5)" />
        </div>
      )}
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>{title}</p>
      {description && <p style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: action ? 16 : 0 }}>{description}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

/* Avatar */
const AVATAR_COLORS = ['#7C3AED','#0E7490','#059669','#D97706','#DC2626'];
export function Avatar({ name = '', size = 40, color }) {
  const bg = color || AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.28),
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: size * 0.35, fontWeight: 800, flexShrink: 0,
    }}>
      {initials || <Inbox size={size * 0.5} color="white" />}
    </div>
  );
}

/* Skeleton */
export function Skeleton({ height = 60, width, style }) {
  return <div className="skeleton" style={{ height, width, borderRadius: 8, ...style }} />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 14, width: i === lines - 1 ? '60%' : '100%', borderRadius: 6, marginBottom: i < lines - 1 ? 10 : 0 }} />
      ))}
    </div>
  );
}
