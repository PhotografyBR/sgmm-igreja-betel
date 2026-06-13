import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Download, BarChart3, Users, CalendarDays, CheckCircle } from 'lucide-react';
import { PageHeader, Card, StatCard, ProgressBar, EmptyState } from '../components/ui';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const CHART_COLORS = ['#6D28D9','#3B82F6','#22C55E','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'white', border: '1px solid var(--border-soft)', borderRadius: 10,
      padding: '10px 14px', boxShadow: 'var(--shadow-md)', fontSize: 13
    }}>
      {label && <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--text-2)' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function RelatoriosPage() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [mes, ano]);

  async function loadData() {
    setLoading(true);
    try {
      const [sRes, uRes] = await Promise.all([
        api.get('/schedules', { params: { month: mes + 1, year: ano } }),
        api.get('/users/voluntarios')
      ]);
      setSchedules(sRes.data);
      setUsers(uRes.data);
    } catch { toast.error('Erro ao carregar dados'); }
    finally { setLoading(false); }
  }

  // ── Cálculos ─────────────────────────────────────────────────────────────

  const porVoluntario = users.map(u => {
    const minhas = schedules.flatMap(s =>
      s.assignments.filter(a => a.userId === u.id).map(a => ({ ...a }))
    );
    return {
      id: u.id, name: u.name.split(' ')[0],
      total: minhas.length,
      confirmadas: minhas.filter(a => a.status === 'confirmed').length,
      recusadas:   minhas.filter(a => a.status === 'declined').length,
      pendentes:   minhas.filter(a => a.status === 'pending').length,
    };
  }).filter(v => v.total > 0).sort((a, b) => b.total - a.total);

  const todasAssignments = schedules.flatMap(s => s.assignments);
  const totalEscalas      = schedules.length;
  const totalAssignments  = todasAssignments.length;
  const totalConfirmadas  = todasAssignments.filter(a => a.status === 'confirmed').length;
  const totalRecusadas    = todasAssignments.filter(a => a.status === 'declined').length;
  const totalPendentes    = todasAssignments.filter(a => a.status === 'pending').length;
  const taxaConfirmacao   = totalAssignments > 0 ? Math.round((totalConfirmadas / totalAssignments) * 100) : 0;

  // Dados para gráfico de pizza (status geral)
  const pieData = [
    { name: 'Confirmadas', value: totalConfirmadas, color: '#22C55E' },
    { name: 'Pendentes',   value: totalPendentes,   color: '#F59E0B' },
    { name: 'Recusadas',   value: totalRecusadas,   color: '#EF4444' }
  ].filter(d => d.value > 0);

  // Por função
  const funcoes = {};
  todasAssignments.forEach(a => {
    if (!funcoes[a.function]) funcoes[a.function] = { total: 0, confirmadas: 0, recusadas: 0, pendentes: 0 };
    funcoes[a.function].total++;
    if (a.status === 'confirmed') funcoes[a.function].confirmadas++;
    else if (a.status === 'declined') funcoes[a.function].recusadas++;
    else funcoes[a.function].pendentes++;
  });
  const porFuncao = Object.entries(funcoes)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, d]) => ({ name: name.split(' ').slice(0, 2).join(' '), ...d }));

  function exportarCSV() {
    const linhas = [
      ['Voluntário','Total','Confirmadas','Recusadas','Pendentes'],
      ...porVoluntario.map(v => [v.name, v.total, v.confirmadas, v.recusadas, v.pendentes])
    ];
    const csv = linhas.map(l => l.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `relatorio-${MESES[mes]}-${ano}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const INP_SEL = {
    padding: '8px 12px', borderRadius: 9, border: '1.5px solid var(--border)',
    fontSize: 13, background: 'white', fontFamily: 'inherit', fontWeight: 600,
    outline: 'none', color: 'var(--text)'
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Relatórios"
        subtitle={`Resumo de ${MESES[mes]} de ${ano}`}
        actions={<>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} style={INP_SEL}>
            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} style={INP_SEL}>
            {[ano - 1, ano, ano + 1].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button className="btn btn-success btn-sm" onClick={exportarCSV} disabled={loading || porVoluntario.length === 0}>
            <Download size={15} /> Exportar CSV
          </button>
        </>}
      />

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 14 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />)}
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 14, marginBottom: 24 }}>
            <StatCard icon={CalendarDays} label="Cultos / Eventos"  value={totalEscalas}     color="#6D28D9" soft="#EDE9FE" />
            <StatCard icon={Users}        label="Escalações"         value={totalAssignments}  color="#3B82F6" soft="#DBEAFE" />
            <StatCard icon={CheckCircle}  label="Confirmadas"        value={totalConfirmadas}  color="#22C55E" soft="#DCFCE7" />
            <StatCard icon={BarChart3}    label="Taxa de confirmação" value={`${taxaConfirmacao}%`} color="#F59E0B" soft="#FEF3C7" />
          </div>

          {totalEscalas === 0 ? (
            <EmptyState icon={BarChart3} title={`Nenhuma escala em ${MESES[mes]} de ${ano}`} description="Selecione outro período para visualizar os dados." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 20 }}>

              {/* Gráfico de barras — participação por voluntário */}
              {porVoluntario.length > 0 && (
                <Card style={{ gridColumn: porVoluntario.length > 4 ? '1 / -1' : undefined }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={16} style={{ color: 'var(--primary)' }} /> Participação por voluntário
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={porVoluntario} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-3)' }} />
                      <YAxis tick={{ fontSize: 12, fill: 'var(--text-3)' }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="confirmadas" name="Confirmadas" fill="#22C55E" radius={[4,4,0,0]} stackId="a" />
                      <Bar dataKey="pendentes"   name="Pendentes"   fill="#F59E0B" radius={[0,0,0,0]} stackId="a" />
                      <Bar dataKey="recusadas"   name="Recusadas"   fill="#EF4444" radius={[4,4,0,0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Pizza — distribuição de status */}
              {pieData.length > 0 && (
                <Card>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BarChart3 size={16} style={{ color: 'var(--primary)' }} /> Distribuição de confirmações
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                        paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false} fontSize={12}>
                        {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Barras por função */}
              {porFuncao.length > 0 && (
                <Card>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BarChart3 size={16} style={{ color: 'var(--primary)' }} /> Por função
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={porFuncao} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-soft)" />
                      <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-3)' }} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--text-3)' }} width={110} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="confirmadas" name="Confirmadas" fill="#22C55E" radius={[0,4,4,0]} stackId="a" />
                      <Bar dataKey="pendentes"   name="Pendentes"   fill="#F59E0B" radius={[0,0,0,0]} stackId="a" />
                      <Bar dataKey="recusadas"   name="Recusadas"   fill="#EF4444" radius={[0,4,4,0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Tabela detalhada */}
              <Card style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarDays size={16} style={{ color: 'var(--primary)' }} /> Escalas do mês
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Título</th>
                        <th style={{ textAlign: 'center' }}>Escalados</th>
                        <th style={{ textAlign: 'center', color: '#22C55E' }}>Confirmados</th>
                        <th style={{ textAlign: 'center', color: '#EF4444' }}>Recusados</th>
                        <th style={{ textAlign: 'center', color: '#F59E0B' }}>Pendentes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...schedules].sort((a,b) => new Date(a.date) - new Date(b.date)).map(s => {
                        const conf  = s.assignments.filter(a => a.status === 'confirmed').length;
                        const dec   = s.assignments.filter(a => a.status === 'declined').length;
                        const pend  = s.assignments.filter(a => a.status === 'pending').length;
                        return (
                          <tr key={s.id}>
                            <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text)' }}>
                              {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              {s.time && <span style={{ color: 'var(--text-4)', marginLeft: 6, fontWeight: 400 }}>{s.time.slice(0,5)}</span>}
                            </td>
                            <td style={{ fontWeight: 500 }}>{s.title}</td>
                            <td style={{ textAlign: 'center', color: 'var(--text-3)', fontWeight: 600 }}>{s.assignments.length}</td>
                            <td style={{ textAlign: 'center', color: '#22C55E', fontWeight: 700 }}>{conf || '—'}</td>
                            <td style={{ textAlign: 'center', color: '#EF4444', fontWeight: 700 }}>{dec  || '—'}</td>
                            <td style={{ textAlign: 'center', color: '#F59E0B', fontWeight: 700 }}>{pend || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Barras de progresso por voluntário */}
              {porVoluntario.length > 0 && (
                <Card>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={16} style={{ color: 'var(--primary)' }} /> Confirmação individual
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {porVoluntario.map(v => (
                      <div key={v.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{v.name}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{v.total}x escalado</span>
                        </div>
                        <div className="progress-track" style={{ height: 8 }}>
                          <div style={{ display: 'flex', height: '100%', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ width: `${(v.confirmadas/v.total)*100}%`, background: '#22C55E', transition: '.6s' }} />
                            <div style={{ width: `${(v.pendentes/v.total)*100}%`,   background: '#F59E0B', transition: '.6s' }} />
                            <div style={{ width: `${(v.recusadas/v.total)*100}%`,   background: '#EF4444', transition: '.6s' }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                          {v.confirmadas > 0 && <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>✓ {v.confirmadas}</span>}
                          {v.pendentes   > 0 && <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>⏳ {v.pendentes}</span>}
                          {v.recusadas   > 0 && <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>✗ {v.recusadas}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

            </div>
          )}
        </>
      )}
    </div>
  );
}
