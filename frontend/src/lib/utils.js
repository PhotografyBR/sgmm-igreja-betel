// ─── Utilidades compartilhadas ────────────────────────────────────────────────

export const FUNCTIONS = [
  'Captação de Conteúdos',
  'Telão (Projeção)',
  'Mesa de Som & Iluminação',
  'Transmissão (Live)',
  'Designer/Editor'
];

export const TEAM_SIZE = FUNCTIONS.length;

// Status da equipe de uma escala: completa / parcial / incompleta
export function teamStatus(schedule) {
  const count = schedule.assignments?.length || 0;
  if (count >= TEAM_SIZE) return { key: 'completa', label: 'Completa', color: 'var(--success)', variant: 'success', dot: '#22C55E' };
  if (count > 0) return { key: 'parcial', label: `Parcial · ${TEAM_SIZE - count} vaga${TEAM_SIZE - count > 1 ? 's' : ''}`, color: 'var(--warning)', variant: 'warning', dot: '#F59E0B' };
  return { key: 'incompleta', label: 'Sem equipe', color: 'var(--danger)', variant: 'danger', dot: '#EF4444' };
}

export function fmtDiaSemana(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' });
}

export function fmtDataCurta(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function fmtDataLonga(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function diasAte(dateStr) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(dateStr + 'T00:00:00');
  return Math.round((alvo - hoje) / 86400000);
}

export function labelDiasAte(dateStr) {
  const d = diasAte(dateStr);
  if (d === 0) return 'Hoje';
  if (d === 1) return 'Amanhã';
  if (d > 1 && d <= 7) return `Em ${d} dias`;
  return fmtDataCurta(dateStr);
}

export const TYPE_COLORS = { culto: '#6D28D9', 'reunião': '#2563EB', evento: '#F59E0B' };
export const STATUS_LABELS = { pending: 'Pendente', confirmed: 'Confirmado', declined: 'Recusado' };
