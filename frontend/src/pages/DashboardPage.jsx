import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// ─── Dashboard do Voluntário ─────────────────────────────────────────────────

function DashboardVoluntario({ user }) {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const hoje = new Date();
        const requests = [0, 1, 2].map(offset => {
          const d = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
          return api.get('/schedules', { params: { month: d.getMonth() + 1, year: d.getFullYear() } });
        });
        const results = await Promise.all(requests);
        const all = results.flatMap(r => r.data);
        const minhas = all.filter(s => s.assignments?.some(a => a.userId === user?.id));
        const unique = Array.from(new Map(minhas.map(s => [s.id, s])).values());
        unique.sort((a, b) => new Date(a.date) - new Date(b.date));
        setSchedules(unique);
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const proximas = schedules.filter(s => new Date(s.date + 'T00:00:00') >= hoje);
  const pendentes = proximas.filter(s => s.assignments?.find(a => a.userId === user?.id)?.status === 'pending');
  const confirmadas = proximas.filter(s => s.assignments?.find(a => a.userId === user?.id)?.status === 'confirmed');

  const dayOfWeek = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E1B4B', marginBottom: 4 }}>
          Olá, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14 }}>
          {dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}, {dateStr}
        </p>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard icon="📅" label="Próximas escalas" value={loading ? '...' : proximas.length} color="#7C3AED" onClick={() => navigate('/minhas-escalas')} />
        <StatCard icon="⏳" label="Aguardando confirmação" value={loading ? '...' : pendentes.length} color="#F59E0B" onClick={() => navigate('/minhas-escalas')} />
        <StatCard icon="✅" label="Confirmadas" value={loading ? '...' : confirmadas.length} color="#10B981" onClick={() => navigate('/minhas-escalas')} />
      </div>

      {/* Alerta de pendências */}
      {!loading && pendentes.length > 0 && (
        <div style={{
          background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12,
          padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer'
        }} onClick={() => navigate('/minhas-escalas')}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: '#92400E', fontSize: 14 }}>
              {pendentes.length === 1
                ? '1 escala aguardando sua confirmação'
                : `${pendentes.length} escalas aguardando sua confirmação`}
            </div>
            <div style={{ color: '#B45309', fontSize: 12, marginTop: 2 }}>
              Clique para confirmar ou recusar sua presença.
            </div>
          </div>
        </div>
      )}

      {/* Próximas escalas */}
      <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937' }}>Suas próximas escalas</h2>
          <button onClick={() => navigate('/minhas-escalas')} style={{
            background: 'none', border: 'none', color: '#7C3AED', fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500
          }}>Ver todas</button>
        </div>

        {loading ? (
          <p style={{ color: '#9CA3AF', fontSize: 14 }}>Carregando...</p>
        ) : proximas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            <p style={{ fontSize: 14 }}>Nenhuma escala futura por enquanto</p>
          </div>
        ) : proximas.slice(0, 5).map(s => {
          const minha = s.assignments?.find(a => a.userId === user?.id);
          const statusColor = { pending: '#F59E0B', confirmed: '#10B981', declined: '#EF4444' };
          const statusLabel = { pending: '⏳ Pendente', confirmed: '✅ Confirmado', declined: '❌ Recusado' };
          const statusBg = { pending: '#FEF3C7', confirmed: '#D1FAE5', declined: '#FEE2E2' };

          return (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0', borderBottom: '1px solid #F3F4F6'
            }}>
              <div style={{
                background: '#EDE9FE', borderRadius: 8, padding: '6px 10px',
                textAlign: 'center', minWidth: 46, flexShrink: 0
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#7C3AED', lineHeight: 1 }}>
                  {new Date(s.date + 'T12:00:00').getDate()}
                </div>
                <div style={{ fontSize: 10, color: '#7C3AED', textTransform: 'uppercase' }}>
                  {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', marginBottom: 2 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  {s.time && `${s.time} · `}
                  {minha?.function && <span style={{ color: '#7C3AED', fontWeight: 500 }}>{minha.function}</span>}
                </div>
              </div>
              {minha && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
                  background: statusBg[minha.status], color: statusColor[minha.status],
                  whiteSpace: 'nowrap', flexShrink: 0
                }}>
                  {statusLabel[minha.status]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Dashboard do Editor ──────────────────────────────────────────────────────

function DashboardEditor({ user }) {
  const navigate = useNavigate();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/media')
      .then(res => {
        const sorted = [...res.data].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        setMedia(sorted.slice(0, 8));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dayOfWeek = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  const typeIcon = { foto: '🖼️', video: '🎬', documento: '📄' };
  const typeColor = { foto: '#2563EB', video: '#7C3AED', documento: '#10B981' };

  const totais = media.reduce((acc, m) => { acc[m.type] = (acc[m.type] || 0) + 1; return acc; }, {});

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E1B4B', marginBottom: 4 }}>
          Olá, {user?.name?.split(' ')[0]}! 🎬
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14 }}>
          {dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}, {dateStr}
        </p>
      </div>

      {/* Cards por tipo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard icon="🖼️" label="Fotos" value={loading ? '...' : (totais.foto || 0)} color="#2563EB" onClick={() => navigate('/midias')} />
        <StatCard icon="🎬" label="Vídeos" value={loading ? '...' : (totais.video || 0)} color="#7C3AED" onClick={() => navigate('/midias')} />
        <StatCard icon="📄" label="Documentos" value={loading ? '...' : (totais.documento || 0)} color="#10B981" onClick={() => navigate('/midias')} />
      </div>

      {/* Arquivos recentes */}
      <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937' }}>Arquivos recentes</h2>
          <button onClick={() => navigate('/midias')} style={{
            background: 'none', border: 'none', color: '#7C3AED', fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500
          }}>Ver repositório</button>
        </div>

        {loading ? (
          <p style={{ color: '#9CA3AF', fontSize: 14 }}>Carregando...</p>
        ) : media.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
            <p style={{ fontSize: 14 }}>Nenhum arquivo no repositório ainda</p>
            <button onClick={() => navigate('/midias')} style={{
              marginTop: 10, padding: '8px 16px', borderRadius: 8, border: 'none',
              background: '#7C3AED', color: 'white', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }}>Fazer upload</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {media.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: '1px solid #F3F4F6'
              }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{typeIcon[m.type] || '🊁'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500, color: '#1F2937',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{m~~name}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    {m.folderName || 'Sem pasta'} · {new Date(m.uploadedAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                  background: (typeColor[m.type] || '#6B7280') + '20',
                  color: typeColor[m.type] || '#6B7280',
                  flexShrink: 0, textTransform: 'uppercase'
                }}>{m.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Dashboard Admin/Pastoral/Secretaria =====

function DashboardAdmin({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ schedules: 0, tasks: 0 });
  const [recentSchedules, setRecentSchedules] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [schedRes, taskRes] = await Promise.all([
          api.get('/schedules'),
          api.get('/tasks')
        ]);

        const today = new Date();
        const upcoming = schedRes.data
          .filter(s => new Date(s.date) >= today)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 5);

        const pending = taskRes.data
          .filter(t => t.status !== 'concluido')
          .sort((a, b) => {
            const order = { urgente: 0, alta: 1, media: 2, baixa: 3 };
            return order[a.priority] - order[b.priority];
          })
          .slice(0, 5);

        setRecentSchedules(upcoming);
        setPendingTasks(pending);
        setStats({
          schedules: schedRes.data.length,
          tasks: taskRes.data.filter(t => t.status !== 'concluido').length
        });
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const priorityColors = { urgente: '#EF4434', alta: '#F59E0B', media: '#3B82F6', baixa: '#10B981' };
  const statusLabels = { pendente: 'Pendente', em_andamento: 'Em andamento', aguardando_revisao: 'Revisão', concluido: 'Concluído' };
  const dayOfWeek = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E1B4B', marginBottom: 4 }}>
          Olá, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14 }}>
          {dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}, {dateStr}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard icon="📅" label="Escalas cadastradas" value={stats.schedules} color="#7C3AED" onClick={() => navigate('/escalas')} />
        <StatCard icon="✅" label="Tarefas em aberto" value={stats.tasks} color="#F59E0B" onClick={() => navigate('/tarefas')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

        <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937' }}>Pr̳{ximos cultos</h2>
            <button onClick={() => navigate('/escalas')} style={{
              background: 'none', border: 'none', color: '#7C3AED', fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500
            }}>Ver todos</button>
          </div>

          {loading ? (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>Carregando...</p>
          ) : recentSchedules.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>Nenhum culto agendado</p>
          ) : recentSchedules.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0', borderBottom: '1px solid #F3F4F6'
            }}>
              <div style={{
                background: '#EDE9FE', borderRadius: 8, padding: '6px 10px',
                textAlign: 'center', minWidth: 46
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#7C3AED', lineHeight: 1 }}>
                  {new Date(s.date + 'T12:00:00').getDate()}
                </div>
                <div style={{ fontSize: 10, color: '#7C3AED', textTransform: 'uppercase' }}>
                  {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>{s.title}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  {s.time && `${s.time} · `]{.assignments?.length || 0} escalados
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937' }}>Tarefas pendentes</h2>
            <button onClick={() => navigate('/tarefas')} style={{
              background: 'none', border: 'none', color: '#7C3AED', fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500
            }}>Ver todas</button>
          </div>

          {loading ? (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>Carregando...</p>
          ) : pendingTasks.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>Nenhuma tarefa pendente</p>
          ) : pendingTasks.map(t => (
            <div key={t.id} style={{
              padding: '10px 0', borderBottom: '1px solid #F3F4F6',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: priorityColors[t.priority] || '#6B7280'
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1F2937' }}>{t.title}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  {t.assigneeName} · {statusLabels[t.status]}
                </div>
              </div>
              {t.dueDate && (
                <div style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                  {new Date(t.dueDate).toLocaleDateString('pt-BR', { day: '02d', month: 'short' })}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ─── Componente compartilhado ──────────────────────────────────────────────────────

function StatCard({ icon, label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white', borderRadius: 14, padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
        borderLeft: `4px solid ${color}`
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; }}}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: color + '20',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1F2937', lineHeight: 1 }}>
            {value}
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

// ===== Roteador principal =====

export default function DashboardPage() {
  const { user, isVoluntario } = useAuth();
  const isEditor = user?.role === 'editor';

  if (isVoluntario) return <DashboardVoluntario user={user} />;
  if (isEditor) return <DashboardEditor user={user} />;
  return <DashboardAdmin user={user} />;
}
