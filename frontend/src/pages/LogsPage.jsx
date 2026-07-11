import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ScrollText, LogIn, Upload, Trash2, CalendarDays, CheckSquare, Pencil, Activity } from 'lucide-react';
import { PageHeader, Card, EmptyState } from '../components/ui';

const ACTION_META = {
  login:            { icon: LogIn,        color: '#3B82F6', label: 'Login' },
  upload:           { icon: Upload,       color: '#22C55E', label: 'Upload' },
  midia_removida:   { icon: Trash2,       color: '#EF4444', label: 'Mídia removida' },
  escala_criada:    { icon: CalendarDays, color: '#7C3AED', label: 'Escala criada' },
  escala_editada:   { icon: Pencil,       color: '#F59E0B', label: 'Escala editada' },
  escala_excluida:  { icon: Trash2,       color: '#EF4444', label: 'Escala excluída' },
  tarefa_criada:    { icon: CheckSquare,  color: '#7C3AED', label: 'Tarefa criada' },
  tarefa_excluida:  { icon: Trash2,       color: '#EF4444', label: 'Tarefa excluída' }
};

function fmtData(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function LogsPage() {
  const [data, setData]         = useState({ usuarios: [], logs: [], total: 0 });
  const [loading, setLoading]   = useState(true);
  const [dias, setDias]         = useState('30');
  const [filtroUser, setFiltroUser] = useState('');

  useEffect(() => { carregar(); }, [dias, filtroUser]);

  async function carregar() {
    setLoading(true);
    try {
      const params = { days: dias };
      if (filtroUser) params.userId = filtroUser;
      const res = await api.get('/logs', { params });
      setData(res.data);
    } catch { toast.error('Erro ao carregar o log de uso'); }
    finally { setLoading(false); }
  }

  const SEL = { padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border-soft)', fontSize: 13, background: 'var(--bg-card)', outline: 'none', fontFamily: 'inherit' };

  return (
    <div className="fade-in">
      <PageHeader
        title="Log de Uso"
        subtitle={`${data.total} evento${data.total !== 1 ? 's' : ''} nos últimos ${dias} dias · visível apenas para você`}
      />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        <select value={dias} onChange={e => setDias(e.target.value)} style={SEL}>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>
        <select value={filtroUser} onChange={e => setFiltroUser(e.target.value)} style={SEL}>
          <option value="">Todos os usuários</option>
          {data.usuarios.map(u => (
            <option key={u.userId} value={u.userId}>{u.userName}</option>
          ))}
        </select>
      </div>

      {/* Resumo por usuário */}
      {!filtroUser && data.usuarios.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12, marginBottom: 26 }}>
          {data.usuarios.map(u => (
            <Card key={u.userId} style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: 'var(--primary-fade, #EDE9FE)', color: 'var(--primary, #7C3AED)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Activity size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="truncate" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{u.userName}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--text-4)' }}>
                    {u.acoes} açõe{u.acoes !== 1 ? 's' : ''} · último acesso {fmtData(u.ultimoAcesso)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Lista de eventos */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 54, borderRadius: 12 }} />)}
        </div>
      ) : data.logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nenhum evento registrado"
          description="Os acessos e ações dos usuários vão aparecer aqui conforme a plataforma for usada."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.logs.map(l => {
            const meta = ACTION_META[l.action] || { icon: Activity, color: 'var(--text-4)', label: l.action };
            return (
              <Card key={l.id} style={{ padding: '11px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: meta.color + '1A', color: meta.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <meta.icon size={16} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text)' }}>
                      <strong>{l.userName}</strong> · {meta.label}
                      {l.details ? <span style={{ color: 'var(--text-3)' }}> — {l.details}</span> : null}
                    </p>
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--text-4)', flexShrink: 0 }}>{fmtData(l.at)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
