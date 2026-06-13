import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  CalendarDays, Users, CheckSquare, AlertTriangle,
  ChevronRight, Bell, Clock, Sparkles, TrendingUp
} from 'lucide-react';
import { EmptyState, Avatar } from '../components/ui';

function getHora() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function fmtData(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function diasAte(dateStr) {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((d - hoje) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  return `Em ${diff} dias`;
}

function StatCard({ icon: Icon, label, value, color, bg, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20, cursor: onClick ? 'pointer' : 'default',
      transition: 'border-color .16s, background .16s',
    }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; }}}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: -1, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-4)' }}>{label}</div>
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: '4px 0' }}>{children}</div>
    </div>
  );
}

function CultoItem({ schedule, myAssignment }) {
  const status = myAssignment?.status;
  const statusStyle = {
    confirmed: { bg: 'var(--success-bg)', color: 'var(--success)', label: 'Confirmado' },
    declined:  { bg: 'var(--danger-bg)',  color: 'var(--danger)',  label: 'Recusado' },
    pending:   { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'Pendente' },
  }[status] || { bg: 'var(--bg-hover)', color: 'var(--text-4)', label: '' };

  const d = new Date(schedule.date + 'T12:00:00');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 36 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-light)', lineHeight: 1 }}>{d.getDate()}</div>
        <div style={{ fontSize: 10, color: 'var(--text-5)', textTransform: 'uppercase', fontWeight: 600 }}>
          {d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 2 }} className="truncate">{schedule.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-4)', display: 'flex', gap: 8 }}>
          <span style={{ color: 'var(--primary-light)', fontWeight: 600 }}>{diasAte(schedule.date)}</span>
          {schedule.time && <span><Clock size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />{schedule.time.slice(0,5)}</span>}
          {myAssignment?.function && <span>{myAssignment.function}</span>}
        </div>
      </div>
      {status && (
        <div style={{ background: statusStyle.bg, color: statusStyle.color, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          {statusStyle.label}
        </div>
      )}
      {!myAssignment && (
        <div style={{ background: 'var(--bg-hover)', color: 'var(--text-4)', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
          {schedule.assignments?.length || 0} escalados
        </div>
      )}
    </div>
  );
}

function DashboardAdmin({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState({ schedules: [], tasks: [], voluntarios: [] });
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const hoje = new Date();
        const meses = [0, 1].map(off => {
          const d = new Date(hoje.getFullYear(), hoje.getMonth() + off, 1);
          return api.get('/schedules', { params: { month: d.getMonth() + 1, year: d.getFullYear() } });
        });
        const [r0, r1, rt, rv, rn] = await Promise.allSettled([
          ...meses, api.get('/tasks'), api.get('/users/voluntarios'), api.get('/notifications')
        ]);
        const scheds = [r0, r1].filter(r => r.status === 'fulfilled').flatMap(r => r.value.data);
        const unique = Array.from(new Map(scheds.map(s => [s.id, s])).values());
        setData({
          schedules: unique,
          tasks: rt.status === 'fulfilled' ? rt.value.data : [],
          voluntarios: rv.status === 'fulfilled' ? rv.value.data : [],
        });
        if (rn.status === 'fulfilled') setNotifs(rn.value.data.slice(0, 5));
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const proximas = data.schedules
    .filter(s => new Date(s.date + 'T00:00:00') >= hoje)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const tarefasAbertas = data.tasks.filter(t => t.status !== 'concluido');
  const incompletas = proximas.filter(s => (s.assignments?.length || 0) < 4);

  if (loading) return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <div className="skeleton" style={{ height: 28, width: 260, borderRadius: 8, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 14, width: 200, borderRadius: 6 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 14 }} />)}
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, marginBottom: 4 }}>
          {getHora()}, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-4)', textTransform: 'capitalize' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard icon={CalendarDays} label="Próximas escalas" value={proximas.length} color="#A78BFA" bg="var(--primary-fade)" onClick={() => navigate('/escalas')} />
        <StatCard icon={Users} label="Voluntários" value={data.voluntarios.length} color="var(--info)" bg="var(--info-bg)" onClick={() => navigate('/usuarios')} />
        <StatCard icon={CheckSquare} label="Tarefas abertas" value={tarefasAbertas.length} color="var(--warning)" bg="var(--warning-bg)" onClick={() => navigate('/tarefas')} />
        <StatCard icon={AlertTriangle} label="Escalas incompletas" value={incompletas.length} color={incompletas.length > 0 ? 'var(--danger)' : 'var(--success)'} bg={incompletas.length > 0 ? 'var(--danger-bg)' : 'var(--success-bg)'} onClick={() => navigate('/escalas')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="Próximos cultos" action={
            <button onClick={() => navigate('/escalas')} style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              Ver todos <ChevronRight size={13} />
            </button>
          }>
            {proximas.length === 0
              ? <EmptyState icon={CalendarDays} title="Nenhuma escala futura" />
              : proximas.slice(0, 5).map(s => <CultoItem key={s.id} schedule={s} />)
            }
          </Panel>

          {incompletas.length > 0 && (
            <Panel title="Precisa de atenção">
              {incompletas.slice(0, 3).map(s => (
                <div key={s.id} onClick={() => navigate('/escalas')} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <AlertTriangle size={15} color="var(--warning)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }} className="truncate">{s.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{fmtData(s.date)} · faltam {4 - (s.assignments?.length || 0)} pessoa(s)</div>
                  </div>
                  <ChevronRight size={14} color="var(--text-5)" />
                </div>
              ))}
            </Panel>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="Atividade recente">
            {notifs.length === 0
              ? <EmptyState icon={Bell} title="Sem atividade recente" />
              : notifs.map(n => (
                <div key={n.id} style={{ display: 'flex', gap: 10, padding: '11px 18px', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: n.read ? 'var(--border-soft)' : 'var(--primary)', marginTop: 5, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{n.message}</div>
                  </div>
                </div>
              ))
            }
          </Panel>

          <Panel title="Saúde do ministério">
            {[
              { label: 'Cobertura das escalas', value: proximas.length > 0 ? Math.min(100, Math.round((proximas.flatMap(s => s.assignments || []).length / (proximas.length * 4)) * 100)) : 0, color: 'var(--primary-light)' },
              { label: 'Taxa de confirmação', value: (() => { const all = proximas.flatMap(s => s.assignments || []); return all.length > 0 ? Math.round((all.filter(a => a.status === 'confirmed').length / all.length) * 100) : 0; })(), color: 'var(--success)' },
              { label: 'Tarefas concluídas', value: data.tasks.length > 0 ? Math.round((data.tasks.filter(t => t.status === 'concluido').length / data.tasks.length) * 100) : 0, color: 'var(--warning)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-hover)', borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 99, transition: 'width .4s ease' }} />
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function DashboardVoluntario({ user }) {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const hoje = new Date();
        const results = await Promise.all([0,1,2].map(off => {
          const d = new Date(hoje.getFullYear(), hoje.getMonth() + off, 1);
          return api.get('/schedules', { params: { month: d.getMonth() + 1, year: d.getFullYear() } });
        }));
        const all = results.flatMap(r => r.data);
        const minhas = Array.from(new Map(
          all.filter(s => s.assignments?.some(a => a.userId === user?.id)).map(s => [s.id, s])
        ).values()).sort((a, b) => new Date(a.date) - new Date(b.date));
        setSchedules(minhas);
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [user?.id]);

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const proximas = schedules.filter(s => new Date(s.date + 'T00:00:00') >= hoje);
  const pendentes = proximas.filter(s => s.assignments?.find(a => a.userId === user?.id)?.status === 'pending');
  const confirmadas = proximas.filter(s => s.assignments?.find(a => a.userId === user?.id)?.status === 'confirmed');
  const proxima = proximas[0];
  const minhaFuncao = proxima?.assignments?.find(a => a.userId === user?.id);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, marginBottom: 4 }}>
          {getHora()}, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-4)', textTransform: 'capitalize' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {!loading && proxima && (
        <div onClick={() => navigate('/minhas-escalas')} style={{
          background: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 60%, #A78BFA 100%)',
          borderRadius: 16, padding: '22px 24px', marginBottom: 20, cursor: 'pointer',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={12} /> Próxima escala
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 8 }}>{proxima.title}</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
            <span style={{ fontWeight: 600 }}>{diasAte(proxima.date)}</span>
            {proxima.time && <span><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />{proxima.time.slice(0,5)}</span>}
            {minhaFuncao?.function && <span>{minhaFuncao.function}</span>}
          </div>
          {minhaFuncao?.status === 'pending' && (
            <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.18)', borderRadius: 99, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: 'white' }}>
              <Bell size={12} /> Confirme sua presença
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard icon={CalendarDays} label="Próximas" value={loading ? '…' : proximas.length} color="var(--primary-light)" bg="var(--primary-fade)" onClick={() => navigate('/minhas-escalas')} />
        <StatCard icon={Clock} label="Pendentes" value={loading ? '…' : pendentes.length} color="var(--warning)" bg="var(--warning-bg)" onClick={() => navigate('/minhas-escalas')} />
        <StatCard icon={TrendingUp} label="Confirmadas" value={loading ? '…' : confirmadas.length} color="var(--success)" bg="var(--success-bg)" onClick={() => navigate('/minhas-escalas')} />
      </div>

      <Panel title="Minhas próximas escalas" action={
        <button onClick={() => navigate('/minhas-escalas')} style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          Ver todas <ChevronRight size={13} />
        </button>
      }>
        {loading
          ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56, margin: '1px 0', borderRadius: 0 }} />)
          : proximas.length === 0
            ? <EmptyState icon={CalendarDays} title="Nenhuma escala próxima" description="Você não tem escalas agendadas." />
            : proximas.slice(0, 5).map(s => <CultoItem key={s.id} schedule={s} myAssignment={s.assignments?.find(a => a.userId === user?.id)} />)
        }
      </Panel>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === 'voluntario') return <DashboardVoluntario user={user} />;
  return <DashboardAdmin user={user} />;
}
