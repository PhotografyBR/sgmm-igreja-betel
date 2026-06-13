import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CalendarDays, Clock, MapPin, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { PageHeader, StatCard, Badge, EmptyState } from '../components/ui';
import { TYPE_COLORS, STATUS_LABELS, labelDiasAte, fmtDiaSemana } from '../lib/utils';

const STATUS_META = {
  pending:   { variant: 'warning', label: 'Pendente' },
  confirmed: { variant: 'success', label: 'Confirmado' },
  declined:  { variant: 'danger',  label: 'Recusado' }
};

export default function MinhasEscalasPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('proximas');

  useEffect(() => { loadSchedules(); }, []);

  async function loadSchedules() {
    setLoading(true);
    try {
      const hoje    = new Date();
      const requests = [0, 1, 2].map(offset => {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
        return api.get('/schedules', { params: { month: d.getMonth() + 1, year: d.getFullYear() } });
      });
      const results = await Promise.all(requests);
      const all     = results.flatMap(r => r.data);
      const minhas  = all.filter(s => s.assignments?.some(a => a.userId === user?.id));
      const unique  = Array.from(new Map(minhas.map(s => [s.id, s])).values());
      unique.sort((a, b) => new Date(a.date) - new Date(b.date));
      setSchedules(unique);
    } catch { toast.error('Erro ao carregar escalas'); }
    finally { setLoading(false); }
  }

  async function handleConfirm(scheduleId, status) {
    try {
      await api.post(`/schedules/${scheduleId}/confirm`, { status });
      toast.success(status === 'confirmed' ? 'Presença confirmada!' : 'Presença recusada');
      loadSchedules();
    } catch { toast.error('Erro ao confirmar presença'); }
  }

  const hoje     = new Date();
  hoje.setHours(0, 0, 0, 0);
  const proximas = schedules.filter(s => new Date(s.date + 'T00:00:00') >= hoje);
  const pendentes = proximas.filter(s => s.assignments?.find(a => a.userId === user?.id)?.status === 'pending');
  const confirmadas = proximas.filter(s => s.assignments?.find(a => a.userId === user?.id)?.status === 'confirmed');
  const visiveis = filter === 'proximas' ? proximas : schedules;

  return (
    <div className="fade-in">
      <PageHeader title="Minhas Escalas" subtitle={`Olá, ${user?.name?.split(' ')[0]}! Aqui estão seus próximos compromissos.`} />

      {/* Cards de resumo */}
      {!loading && (
        <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 14, marginBottom: 22 }}>
          <StatCard icon={CalendarDays} label="Próximas" value={proximas.length}   color="#6D28D9" soft="#EDE9FE" />
          <StatCard icon={AlertTriangle} label="Aguardando confirmação" value={pendentes.length}  color="#F59E0B" soft="#FEF3C7" />
          <StatCard icon={CheckCircle}  label="Confirmadas"  value={confirmadas.length} color="#22C55E" soft="#DCFCE7" />
        </div>
      )}

      {/* Alerta */}
      {!loading && pendentes.length > 0 && (
        <div style={{
          background: 'var(--warning-soft)', border: '1px solid #FCD34D', borderRadius: 'var(--radius)',
          padding: '13px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12
        }}>
          <AlertTriangle size={20} style={{ color: 'var(--warning-dark)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--warning-dark)', fontSize: 13.5 }}>
              {pendentes.length === 1 ? '1 escala aguardando sua confirmação' : `${pendentes.length} escalas aguardando confirmação`}
            </div>
            <div style={{ color: 'var(--warning-dark)', opacity: 0.85, fontSize: 12, marginTop: 1 }}>
              Confirme ou recuse sua presença nas escalas abaixo.
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'proximas', label: `Próximas (${proximas.length})` },
          { key: 'todas',    label: `Todas (${schedules.length})` }
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />)}
        </div>
      ) : visiveis.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={filter === 'proximas' ? 'Nenhuma escala futura por enquanto' : 'Você ainda não foi escalado'}
          description="Quando o líder te escalar, aparece aqui automaticamente."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visiveis.map(s => {
            const minha    = s.assignments?.find(a => a.userId === user?.id);
            const isPast   = new Date(s.date + 'T00:00:00') < hoje;
            const typeColor = TYPE_COLORS[s.type] || 'var(--primary)';
            const sm        = STATUS_META[minha?.status] || STATUS_META.pending;

            return (
              <div key={s.id} style={{
                background: 'white', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-soft)',
                boxShadow: 'var(--shadow-xs)',
                borderLeft: `4px solid ${isPast ? 'var(--border)' : typeColor}`,
                opacity: isPast ? 0.72 : 1,
                overflow: 'hidden'
              }}>
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--text)' }}>{s.title}</span>
                        <Badge style={{ background: typeColor + '20', color: typeColor }}>{s.type}</Badge>
                        {isPast && <Badge variant="neutral">Realizado</Badge>}
                      </div>

                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-3)', marginBottom: minha?.function ? 8 : 0 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textTransform: 'capitalize', fontWeight: 600, color: 'var(--primary)' }}>
                          <CalendarDays size={13} /> {labelDiasAte(s.date)} · {fmtDiaSemana(s.date)}
                        </span>
                        {s.time && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <Clock size={13} /> {s.time.slice(0, 5)}
                          </span>
                        )}
                      </div>

                      {minha?.function && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
                          <MapPin size={13} style={{ color: typeColor }} />
                          <span style={{
                            fontSize: 13, fontWeight: 700, color: typeColor,
                            background: typeColor + '16', padding: '3px 10px', borderRadius: 999
                          }}>{minha.function}</span>
                        </div>
                      )}

                      {s.notes && (
                        <p style={{ fontSize: 12, color: 'var(--text-4)', fontStyle: 'italic', marginTop: 8 }}>
                          {s.notes}
                        </p>
                      )}
                    </div>
                    {minha && (
                      <Badge variant={sm.variant} style={{ flexShrink: 0 }}>{sm.label}</Badge>
                    )}
                  </div>
                </div>

                {/* Botões de confirmação */}
                {minha?.status === 'pending' && !isPast && (
                  <div style={{
                    display: 'flex', gap: 10, padding: '12px 18px',
                    borderTop: '1px solid var(--border-soft)', background: 'var(--bg)'
                  }}>
                    <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleConfirm(s.id, 'confirmed')}>
                      <CheckCircle size={15} /> Confirmar presença
                    </button>
                    <button className="btn btn-danger-soft" style={{ flex: 1 }} onClick={() => handleConfirm(s.id, 'declined')}>
                      <XCircle size={15} /> Não posso ir
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
