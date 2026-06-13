import { Inbox } from 'lucide-react';

// ─── Design System: componentes reutilizáveis ────────────────────────────────

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

export function Card({ children, hover, style, className = '', ...rest }) {
  return (
    <div className={`card ${hover ? 'card-hover' : ''} ${className}`} style={style} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, icon: Icon, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <h2 className="card-title">
        {Icon && <Icon size={17} style={{ color: 'var(--primary)' }} />}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, color, soft, hint, onClick, loading }) {
  return (
    <div
      className="stat-card card-hover"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div className="stat-icon" style={{ background: soft, color: color }}>
          {Icon && <Icon size={21} strokeWidth={2.2} />}
        </div>
        <div style={{ minWidth: 0 }}>
          {loading
            ? <div className="skeleton" style={{ width: 44, height: 26, marginBottom: 4 }} />
            : <div className="stat-value">{value}</div>}
          <div className="stat-label">{label}</div>
        </div>
      </div>
      {hint && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--text-4)', fontWeight: 500 }}>{hint}</div>
      )}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 70, height: 70,
        background: `radial-gradient(circle at top right, ${color}14, transparent 70%)`,
        pointerEvents: 'none'
      }} />
    </div>
  );
}

export function Badge({ children, variant = 'neutral', style }) {
  return <span className={`badge badge-${variant}`} style={style}>{children}</span>;
}

export function ProgressBar({ value, color = 'var(--primary)', height = 8, label, showValue = true }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>{label}</span>
          {showValue && <span style={{ fontSize: 12.5, fontWeight: 700, color }}>{pct}%</span>}
        </div>
      )}
      <div className="progress-track" style={{ height }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function Avatar({ name, size = 36, color, style }) {
  const bg = color || `hsl(${((name || '?').charCodeAt(0) * 47) % 360}, 52%, 52%)`;
  return (
    <div className="avatar" style={{
      width: size, height: size, fontSize: size * 0.4,
      background: `linear-gradient(135deg, ${bg}, ${bg}CC)`,
      ...style
    }}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><Icon size={26} /></div>
      <p style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-3)' }}>{title}</p>
      {description && <p style={{ fontSize: 13, marginTop: 4 }}>{description}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function Skeleton({ width = '100%', height = 16, style }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card">
      <Skeleton width="40%" height={18} style={{ marginBottom: 14 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={`${85 - i * 12}%`} height={13} style={{ marginBottom: 10 }} />
      ))}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, maxWidth = 560 }) {
  return (
    <div className="modal-outer" onClick={onClose}>
      <div className="modal-inner fade-in-scale" style={{ maxWidth }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: subtitle ? 4 : 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>{title}</h2>
          <button onClick={onClose} className="btn-ghost btn" style={{ padding: 4, fontSize: 18, lineHeight: 1, minHeight: 'auto' }}>✕</button>
        </div>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map(opt => (
        <button
          key={opt.value}
          className={value === opt.value ? 'active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon && <opt.icon size={14} />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 4 }}>{hint}</p>}
    </div>
  );
}
