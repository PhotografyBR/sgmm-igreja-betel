import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { pending: '#F59E0B', confirmed: '#10B981', declined: '#EF4444' };
const STATUS_LABELS = { pending: 'Pendente', confirmed: 'Confirmado', declined: 'Recusado' };
const STATUS_BG = { pending: '#FEF3C7', confirmed: '#D1FAE5', declined: '#FEE2E2' };
const TYPE_COLORS = { culto: '#7C3AED', 'reunião': '#2563EB', evento: '#F59E0B' };

export default function MinhasEscalasPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('proximas');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const hoje = new Date();
      // Busca 3 meses futuros + 3 meses passados para histórico
      const requests = [-3, -2, -1, 0, 1, 2].map(offset => {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
        return api.get('/schedules', { params: { month: d.getMonth() + 1, year: d.getFullYear() } });
      });
      const [equipRes, ...schedResults] = await Promise.all([
        api.get('/users/equipe'),
        ...requests
      ]);
      setEquipe(equipRes.data);
      const all = schedResults.flatMap(r => r.data);
      const minhas = all.filter(s => s.assignments?.some(a => a.userId === user?.id));
      const unique = Array.from(new Map(minhas.map(s => [s.id, s])).values());
      unique.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSchedules(unique);
    } catch {
      toast.error('Erro ao carregar escalas');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(scheduleId, status) {
    try {
      await api.post(`/schedules/${scheduleId}/confirm`, { status });
      toast.success(status === 'confirmed' ? '✅ Presença confirmada!' : '❌ Presença recusada');
      loadData();
    } catch {
      toast.error('Erro ao confirmar presença');
    }
  }

  function getNome(userId) {
    return equipe.find(u => u.id === userId)?.name || 'Voluntário';
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const proximas = schedules.filter(s => new Date(s.date + 'T00:00:00') >= hoje);
  const historico = schedules.filter(s => new Date(s.date + 'T00:00:00') < hoje);
  const visiveis = filter === 'proximas' ? proximas : filter === 'historico' ? historico : schedules;
  const pendentes = proximas.filter(s => s.assignments?.find(a => a.userId === user?.id)?.status === 'pending');

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E1B4B' }}>Minhas Escalas</h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginTop: 2 }}>
          Olá, {user?.name?.split(' ')[0]}! Veja aqui suas escalas.
        </p>
      </div>

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <SummaryCard icon="📅" label="Próximas" value={proximas.length} color="#7C3AED" />
          <SummaryCard icon="⏳" label="Aguardando confirmação" value={pendentes.length} color="#F59E0B" />
          <SummaryCard icon="✅" label="Confirmadas" value={proximas.filter(s => s.assignments?.find(a => a.userId === user?.id)?.status === 'confirmed').length} color="#10B981" />
          <SummaryCard icon="🗂" label="Histórico" value={historico.length} color="#6B7280" />
        </div>
      )}

      {!loading && pendentes.length > 0 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, color: '#92400E', fontSize: 14 }}>
              {pendentes.length === 1 ? 'Você tem 1 escala aguardando confirmação' : `Você tem ${pendentes.length} escalas aguardando confirmação`}
            </div>
            <div style={{ color: '#B45309', fontSize: 12, marginTop: 2 }}>Confirme ou recuse sua presença abaixo.</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'proximas', label: `Próximas (${proximas.length})` },
          { key: 'historico', label: `Histórico (${historico.length})` },
          { key: 'todas', label: `Todas (${schedules.length})` }
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '7px 16px', borderRadius: 20, border: 'none', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            background: filter === f.key ? '#7C3AED' : '#F3F4F6',
            color: filter === f.key ? 'white' : '#6B7280'
          }}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Carregando escalas...</div>
      ) : visiveis.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p style={{ fontSize: 16, fontWeight: 500 }}>
            {filter === 'proximas' ? 'Nenhuma escala futura por enquanto' : filter === 'historico' ? 'Nenhum histórico ainda' : 'Você ainda não foi escalado'}
          </p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Quando o líder te escalar, aparece aqui automaticamente.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visiveis.map(s => {
            const minha = s.assignments?.find(a => a.userId === user?.id);
            const isPast = new Date(s.date + 'T00:00:00') < hoje;
            const typeColor = TYPE_COLORS[s.type] || '#7C3AED';
            const isExpanded = expandedId === s.id;
            const outrosEscalados = s.assignments?.filter(a => a.userId !== user?.id) || [];

            return (
              <div key={s.id} style={{
                background: 'white', borderRadius: 14, padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${isPast ? '#D1D5DB' : typeColor}`,
                opacity: isPast ? 0.85 : 1
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>{s.title}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: typeColor + '20', color: typeColor, fontWeight: 600 }}>{s.type}</span>
                      {isPast && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#F3F4F6', color: '#9CA3AF', fontWeight: 600 }}>Realizado</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: '#4B5563' }}>
                        📅 {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                      {s.time && <span style={{ fontSize: 13, color: '#4B5563' }}>🕐 {s.time}</span>}
                    </div>
                    {minha?.function && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: '#6B7280' }}>📌 Sua função:</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: typeColor, background: typeColor + '15', padding: '2px 10px', borderRadius: 8 }}>{minha.function}</span>
                      </div>
                    )}
                    {s.notes && <p style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 8 }}>📝 {s.notes}</p>}

                    {/* Equipe escalada */}
                    {outrosEscalados.length > 0 && (
                      <div>
                        <button onClick={() => setExpandedId(isExpanded ? null : s.id)} style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          fontSize: 12, color: '#7C3AED', fontWeight: 600, fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          👥 Ver equipe ({outrosEscalados.length + 1} pessoas) {isExpanded ? '▲' : '▼'}
                        </button>

                        {isExpanded && (
                          <div style={{ marginTop: 10, padding: '10px 14px', background: '#F9FAFB', borderRadius: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                              Equipe do evento
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {/* Eu primeiro */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: typeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                                    {user?.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{user?.name} <span style={{ fontSize: 11, color: '#7C3AED' }}>(você)</span></div>
                                    <div style={{ fontSize: 11, color: '#6B7280' }}>{minha?.function}</div>
                                  </div>
                                </div>
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: STATUS_BG[minha?.status], color: STATUS_COLORS[minha?.status] }}>
                                  {STATUS_LABELS[minha?.status]}
                                </span>
                              </div>
                              {/* Outros */}
                              {outrosEscalados.map((a, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${(a.userId?.charCodeAt(0) || 0) * 37 % 360}, 50%, 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                                      {getNome(a.userId).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{getNome(a.userId)}</div>
                                      <div style={{ fontSize: 11, color: '#6B7280' }}>{a.function}</div>
                                    </div>
                                  </div>
                                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: STATUS_BG[a.status], color: STATUS_COLORS[a.status] }}>
                                    {STATUS_LABELS[a.status]}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {minha && (
                    <div style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: STATUS_BG[minha.status], color: STATUS_COLORS[minha.status], flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {minha.status === 'confirmed' ? '✅' : minha.status === 'declined' ? '❌' : '⏳'} {STATUS_LABELS[minha.status]}
                    </div>
                  )}
                </div>

                {minha?.status === 'pending' && !isPast && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                    <button onClick={() => handleConfirm(s.id, 'confirmed')} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#10B981', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✅ Confirmar presença</button>
                    <button onClick={() => handleConfirm(s.id, 'declined')} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#FEE2E2', color: '#EF4444', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>❌ Não posso ir</button>
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

function SummaryCard({ icon, label, value, color }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}
