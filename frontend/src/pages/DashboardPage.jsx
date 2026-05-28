import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

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

export default function DashboardPage() {
  const { user, isAdmin, isPastoral, isVoluntario } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ schedules: 0, tasks: 0, media: 0, users: 0 });
  const [recentSchedules, setRecentSchedules] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
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
          const priorityOrder = { urgente: 0, alta: 1, media: 2, baixa: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        })
        .slice(0, 5);

      setRecentSchedules(upcoming);
      setPendingTasks(pending);
      setStats({
        schedules: schedRes.data.length,
        tasks: taskRes.data.filter(t => t.status !== 'concluido').length
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const priorityColors = {
    urgente: '#EF4444', alta: '#F59E0B', media: '#3B82F6', baixa: '#10B981'
  };

  const statusLabels = {
    pendente: 'Pendente',
    em_andamento: 'Em andamento',
    aguardando_revisao: 'Revisão',
    concluido: 'Concluído'
  };

  const dayOfWeek = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="fade-in">
      {/* Saudação */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E1B4B', marginBottom: 4 }}>
          Olá, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14 }}>
          {dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}, {dateStr}
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16, marginBottom: 28
      }}>
        <StatCard icon="📅" label="Escalas cadastradas" value={stats.schedules} color="#7C3AED" onClick={() => navigate('/escalas')} />
        <StatCard icon="✅" label="Tarefas em aberto" value={stats.tasks} color="#F59E0B" onClick={() => navigate('/tarefas')} />
      </div>

      {/* Conteúdo principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Próximos cultos */}
        <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937' }}>Próximos cultos</h2>
            <button onClick={() => navigate('/escalas')} style={{
              background: 'none', border: 'none', color: '#7C3AED', fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500
            }}>Ver todos</button>
          </div>

          {loading ? (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>Carregando...</p>
          ) : recentSchedules.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>Nenhum culto agendado</p>
          ) : recentSchedules.map(s => {
            const myAssignment = s.assignments?.find(a => a.userId === user?.id);
            return (
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
                    {s.time && `${s.time} · `}{s.assignments?.length || 0} escalados
                    {myAssignment && (
                      <span style={{
                        marginLeft: 6, fontSize: 11, fontWeight: 600,
                        color: myAssignment.status === 'confirmed' ? '#10B981' : myAssignment.status === 'declined' ? '#EF4444' : '#F59E0B',
                        background: myAssignment.status === 'confirmed' ? '#D1FAE5' : myAssignment.status === 'declined' ? '#FEE2E2' : '#FEF3C7',
                        padding: '1px 6px', borderRadius: 4
                      }}>
                        {myAssignment.function}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tarefas pendentes */}
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
                  {new Date(t.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
