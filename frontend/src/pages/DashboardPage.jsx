import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  CalendarDays, CalendarClock, Users, CheckSquare, AlertTriangle,
  TrendingUp, Activity, Clock, MapPin, Sparkles, Trophy,
  CalendarX, ChevronRight, FolderOpen, Image, Film, FileText,
  Bell, CalendarCheck, CircleCheck, CircleAlert
} from 'lucide-react';
import {
  StatCard, Card, CardHeader, Badge, ProgressBar, Avatar,
  EmptyState, Skeleton, SkeletonCard
} from '../components/ui';
import { teamStatus, TEAM_SIZE, labelDiasAte, fmtDiaSemana, fmtDataCurta, TYPE_COLORS } from '../lib/utils';

// ─── Cabeçalho de saudação ────────────────────────────────────────────────────

function Greeting({ user, emoji = '👋' }) {
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const dayOfWeek = new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });

  return (
    <div style={{ marginBottom: 24 }}>
      <h1 className="page-title">
        {saudacao}, {user?.name?.split(' ')[0]}! {emoji}
      </h1>
      <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>
        {dayOfWeek}, {dateStr} · Que bom ter você por aqui.
      </p>
    </div>
  );
}

// ─── Timeline de próximos eventos ─────────────────────────────────────────────

function TimelineEventos({ schedules, onVerTodas, mostrarVagas = true }) {
  return (
    <Card>
      <CardHeader
        title="Próximos eventos"
        icon={CalendarClock}
        action={
          <button className="btn btn-ghost btn-sm" onClick={onVerTodas}>
            Ver todas <ChevronRight size={14} />
          </button>
        }
      />
      {schedules.length === 0 ? (
        <EmptyState icon={CalendarX} title="Nenhum evento futuro" description="As próximas escalas vão aparecer aqui." />
      ) : (
        <div>
          {schedules.map(s => {
            const st = teamStatus(s);
            const vagas = Math.max(0, TEAM_SIZE - (s.assignments?.length || 0));
            return (
              <div key={s.id} className="timeline-item">
                <div className="timeline-date">
                  <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                    {new Date(s.date + 'T12:00:00').getDate()}
                  </span>
                  <span style={{ fontSize: 9.5, color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700 }}>
                    {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{s.title}</span>
                    <Badge variant={st.variant}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: st.dot, display: 'inline-block' }} />
                      {st.label}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-3)' }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--primary)' }}>
                      {labelDiasAte(s.date)} · {fmtDiaSemana(s.date)}
                    </span>
                    {s.time && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {s.time.slice(0, 5)}</span>}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Users size={12} /> {s.assignments?.length || 0} escalado{(s.assignments?.length || 0) !== 1 ? 's' : ''}
                      {mostrarVagas && vagas > 0 && <span style={{ color: 'var(--warning-dark)', fontWeight: 600 }}> · {vagas} vaga{vagas > 1 ? 's' : ''} aberta{vagas > 1 ? 's' : ''}</span>}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Feed de atividade recente ────────────────────────────────────────────────

function FeedAtividade() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications')
      .then(res => setItems(res.data.slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader title="Atividade recente" icon={Activity} />
      {loading ? (
        <>
          <Skeleton height={14} style={{ marginBottom: 12 }} />
          <Skeleton height={14} width="80%" style={{ marginBottom: 12 }} />
          <Skeleton height={14} width="65%" />
        </>
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="Sem atividade por enquanto" />
      ) : (
        <div className="flex-col" style={{ gap: 2 }}>
          {items.map(n => (
            <div key={n.id} style={{
              display: 'flex', gap: 10, padding: '9px 0',
              borderBottom: '1px solid var(--border-soft)', alignItems: 'flex-start'
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: 999, marginTop: 6, flexShrink: 0,
                background: n.read ? 'var(--border)' : 'var(--primary-light)'
              }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{n.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{n.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Dashboard do Admin/Pastoral/Secretaria ───────────────────────────────────

function DashboardAdmin({ user }) {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [voluntarios, setVoluntarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const hoje = new Date();
      const meses = [0, 1].map(off => {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() + off, 1);
        return api.get('/schedules', { params: { month: d.getMonth() + 1, year: d.getFullYear() } });
      });
      const results = await Promise.allSettled([...meses, api.get('/tasks'), api.get('/users/voluntarios')]);
      const scheds = results.slice(0, 2)
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value.data);
      const unique = Array.from(new Map(scheds.map(s => [s.id, s])).values());
      setSchedules(unique);
      if (results[2].status === 'fulfilled') setTasks(results[2].value.data);
      if (results[3].status === 'fulfilled') setVoluntarios(results[3].value.data);
      setLoading(false);
    }
    load();
  }, []);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const mesAtual = hoje.getMonth();

  const escalasMes = schedules.filter(s => new Date(s.date + 'T12:00:00').getMonth() === mesAtual);
  const proximas = schedules
    .filter(s => new Date(s.date + 'T00:00:00') >= hoje)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const incompletas = proximas.filter(s => (s.assignments?.length || 0) < TEAM_SIZE);
  const tarefasAbertas = tasks.filter(t => t.status !== 'concluido');

  // Indicadores
  const allAssignments = escalasMes.flatMap(s => s.assignments || []);
  const cobertura = escalasMes.length > 0
    ? (allAssignments.length / (escalasMes.length * TEAM_SIZE)) * 100 : 0;
  const taxaConfirmacao = allAssignments.length > 0
    ? (allAssignments.filter(a => a.status === 'confirmed').length / allAssignments.length) * 100 : 0;
  const tarefasConcluidas = tasks.length > 0
    ? (tasks.filter(t => t.status === 'concluido').length / tasks.length) * 100 : 0;

  // Confirmações pendentes em escalas próximas
  const confirmacoesPendentes = proximas.flatMap(s =>
    (s.assignments || []).filter(a => a.status === 'pending').map(a => ({ ...a, schedule: s }))
  );

  // Ranking de engajamento (confirmações no período carregado)
  const ranking = voluntarios.map(v => {
    const minhas = schedules.flatMap(s => (s.assignments || []).filter(a => a.userId === v.id));
    return {
      ...v,
      total: minhas.length,
      confirmadas: minhas.filter(a => a.status === 'confirmed').length
    };
  }).filter(v => v.total > 0).sort((a, b) => b.confirmadas - a.confirmadas || b.total - a.total).slice(0, 5);

  const medalhas = ['🥇', '🥈', '🥉'];

  if (loading) {
    return (
      <div className="fade-in">
        <Greeting user={user} />
        <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="card"><Skeleton height={48} /></div>)}
        </div>
        <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
          <SkeletonCard lines={5} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <Greeting user={user} />

      {/* Cards de métricas */}
      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: 14, marginBottom: 22 }}>
        <StatCard icon={CalendarDays} label="Escalas do mês" value={escalasMes.length}
          color="#6D28D9" soft="#EDE9FE" onClick={() => navigate('/escalas')} />
        <StatCard icon={Users} label="Voluntários ativos" value={voluntarios.length}
          color="#3B82F6" soft="#DBEAFE" onClick={() => navigate('/usuarios')} />
        <StatCard icon={CheckSquare} label="Tarefas em aberto" value={tarefasAbertas.length}
          color="#F59E0B" soft="#FEF3C7" onClick={() => navigate('/tarefas')} />
        <StatCard icon={AlertTriangle} label="Escalas com vagas" value={incompletas.length}
          color={incompletas.length > 0 ? '#EF4444' : '#22C55E'}
          soft={incompletas.length > 0 ? '#FEE2E2' : '#DCFCE7'}
          onClick={() => navigate('/escalas')} />
      </div>

      {/* Indicadores rápidos */}
      <Card style={{ marginBottom: 22 }}>
        <CardHeader title="Saúde do ministério" icon={TrendingUp} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 22 }}>
          <ProgressBar label="Cobertura das escalas" value={cobertura}
            color={cobertura >= 80 ? 'var(--success)' : cobertura >= 50 ? 'var(--warning)' : 'var(--danger)'} />
          <ProgressBar label="Taxa de confirmação" value={taxaConfirmacao}
            color={taxaConfirmacao >= 70 ? 'var(--success)' : 'var(--warning)'} />
          <ProgressBar label="Tarefas concluídas" value={tarefasConcluidas} color="var(--primary-light)" />
        </div>
      </Card>

      <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, alignItems: 'start' }}>
        {/* Coluna principal */}
        <div className="flex-col" style={{ gap: 18 }}>
          <TimelineEventos schedules={proximas.slice(0, 5)} onVerTodas={() => navigate('/escalas')} />

          {/* Escalas que precisam de atenção */}
          {(incompletas.length > 0 || confirmacoesPendentes.length > 0) && (
            <Card style={{ borderLeft: '4px solid var(--warning)' }}>
              <CardHeader title="Precisa de atenção" icon={CircleAlert} />
              <div className="flex-col" style={{ gap: 10 }}>
                {incompletas.slice(0, 4).map(s => (
                  <div key={s.id} onClick={() => navigate('/escalas')} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--warning-soft)', borderRadius: 10, padding: '10px 14px',
                    cursor: 'pointer', gap: 10
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning-dark)' }} className="truncate">{s.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--warning-dark)', opacity: 0.85 }}>
                        {fmtDataCurta(s.date)} · faltam {TEAM_SIZE - (s.assignments?.length || 0)} pessoa(s) na equipe
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--warning-dark)', flexShrink: 0 }} />
                  </div>
                ))}
                {confirmacoesPendentes.length > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--primary-fade)', borderRadius: 10, padding: '10px 14px'
                  }}>
                    <Bell size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                      {confirmacoesPendentes.length} confirmação(ões) de presença pendente(s)
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="flex-col" style={{ gap: 18 }}>
          {/* Ranking de engajamento */}
          <Card>
            <CardHeader title="Engajamento" icon={Trophy} />
            {ranking.length === 0 ? (
              <EmptyState icon={Trophy} title="Sem dados ainda" description="O ranking aparece quando houver escalas." />
            ) : (
              <div className="flex-col" style={{ gap: 4 }}>
                {ranking.map((v, i) => (
                  <div key={v.id} style={{
                    display: 'flex', alignItems: 'center', gap: 11,
                    padding: '8px 10px', borderRadius: 10,
                    background: i === 0 ? 'var(--primary-fade)' : 'transparent'
                  }}>
                    <span style={{ fontSize: i < 3 ? 17 : 13, width: 24, textAlign: 'center', color: 'var(--text-4)', fontWeight: 700 }}>
                      {medalhas[i] || `${i + 1}º`}
                    </span>
                    <Avatar name={v.name} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }} className="truncate">{v.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                        {v.confirmadas} confirmada{v.confirmadas !== 1 ? 's' : ''} · {v.total} escala{v.total !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <FeedAtividade />
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard do Voluntário ──────────────────────────────────────────────────

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
  const proxima = proximas[0];
  const minhaFuncao = proxima?.assignments?.find(a => a.userId === user?.id);

  return (
    <div className="fade-in">
      <Greeting user={user} />

      {/* Hero: próxima escala */}
      {!loading && proxima && (
        <div className="card-hover" onClick={() => navigate('/minhas-escalas')} style={{
          background: 'linear-gradient(125deg, #6D28D9 0%, #8B5CF6 60%, #A78BFA 100%)',
          borderRadius: 'var(--radius-xl)', padding: '24px 26px', marginBottom: 22,
          color: 'white', cursor: 'pointer', position: 'relative', overflow: 'hidden',
          boxShadow: 'var(--shadow-primary)'
        }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', right: 40, bottom: -50, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.85, marginBottom: 10 }}>
            <Sparkles size={14} /> Você está escalado para
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 8 }}>{proxima.title}</div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13.5, fontWeight: 500, opacity: 0.95 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}>
              <CalendarDays size={15} /> {labelDiasAte(proxima.date)} · {fmtDiaSemana(proxima.date)}
            </span>
            {proxima.time && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Clock size={15} /> {proxima.time.slice(0, 5)}</span>}
            {minhaFuncao?.function && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MapPin size={15} /> {minhaFuncao.function}</span>}
          </div>
          {minhaFuncao?.status === 'pending' && (
            <div style={{
              marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(255,255,255,0.18)', borderRadius: 999, padding: '6px 14px',
              fontSize: 12.5, fontWeight: 700
            }}>
              <Bell size={13} /> Falta confirmar sua presença — toque aqui
            </div>
          )}
        </div>
      )}

      {/* Cards de resumo */}
      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 22 }}>
        <StatCard icon={CalendarDays} label="Próximas escalas" value={loading ? '…' : proximas.length}
          color="#6D28D9" soft="#EDE9FE" onClick={() => navigate('/minhas-escalas')} />
        <StatCard icon={Clock} label="Aguardando confirmação" value={loading ? '…' : pendentes.length}
          color="#F59E0B" soft="#FEF3C7" onClick={() => navigate('/minhas-escalas')} />
        <StatCard icon={CircleCheck} label="Confirmadas" value={loading ? '…' : confirmadas.length}
          color="#22C55E" soft="#DCFCE7" onClick={() => navigate('/minhas-escalas')} />
      </div>

      {/* Alerta de pendências */}
      {!loading && pendentes.length > 0 && (
        <div onClick={() => navigate('/minhas-escalas')} style={{
          background: 'var(--warning-soft)', border: '1px solid #FCD34D', borderRadius: 'var(--radius)',
          padding: '13px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer'
        }}>
          <AlertTriangle size={20} style={{ color: 'var(--warning-dark)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--warning-dark)', fontSize: 13.5 }}>
              {pendentes.length === 1 ? '1 escala aguardando sua confirmação' : `${pendentes.length} escalas aguardando sua confirmação`}
            </div>
            <div style={{ color: 'var(--warning-dark)', opacity: 0.85, fontSize: 12, marginTop: 1 }}>
              Toque para confirmar ou recusar sua presença.
            </div>
          </div>
        </div>
      )}

      {/* Próximas escalas */}
      {loading ? <SkeletonCard lines={4} /> : (
        <TimelineEventos
          schedules={proximas.slice(0, 5)}
          onVerTodas={() => navigate('/minhas-escalas')}
          mostrarVagas={false}
        />
      )}
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
        setMedia(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totais = media.reduce((acc, m) => { acc[m.type] = (acc[m.type] || 0) + 1; return acc; }, {});
  const recentes = media.slice(0, 8);
  const typeMeta = {
    foto: { icon: Image, color: '#3B82F6', soft: '#DBEAFE', label: 'FOTO' },
    video: { icon: Film, color: '#6D28D9', soft: '#EDE9FE', label: 'VÍDEO' },
    documento: { icon: FileText, color: '#22C55E', soft: '#DCFCE7', label: 'DOC' }
  };

  return (
    <div className="fade-in">
      <Greeting user={user} emoji="🎬" />

      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 22 }}>
        <StatCard icon={Image} label="Fotos" value={loading ? '…' : (totais.foto || 0)}
          color="#3B82F6" soft="#DBEAFE" onClick={() => navigate('/midias')} />
        <StatCard icon={Film} label="Vídeos" value={loading ? '…' : (totais.video || 0)}
          color="#6D28D9" soft="#EDE9FE" onClick={() => navigate('/midias')} />
        <StatCard icon={FileText} label="Documentos" value={loading ? '…' : (totais.documento || 0)}
          color="#22C55E" soft="#DCFCE7" onClick={() => navigate('/midias')} />
      </div>

      <Card>
        <CardHeader
          title="Arquivos recentes"
          icon={FolderOpen}
          action={
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/midias')}>
              Ver repositório <ChevronRight size={14} />
            </button>
          }
        />
        {loading ? (
          <>
            <Skeleton height={14} style={{ marginBottom: 12 }} />
            <Skeleton height={14} width="75%" />
          </>
        ) : recentes.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Nenhum arquivo no repositório ainda"
            action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/midias')}>Fazer upload</button>}
          />
        ) : (
          <div className="flex-col" style={{ gap: 2 }}>
            {recentes.map(m => {
              const meta = typeMeta[m.type] || typeMeta.documento;
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: '1px solid var(--border-soft)'
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: meta.soft, color: meta.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <meta.icon size={17} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }} className="truncate">{m.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 1 }}>
                      {m.folderName || 'Sem pasta'} · {new Date(m.uploadedAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <Badge variant="neutral" style={{ background: meta.soft, color: meta.color }}>{meta.label}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Roteador principal ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isVoluntario } = useAuth();
  const isEditor = user?.role === 'editor';

  if (isVoluntario) return <DashboardVoluntario user={user} />;
  if (isEditor) return <DashboardEditor user={user} />;
  return <DashboardAdmin user={user} />;
}
