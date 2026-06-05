import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function RelatoriosPage() {
  const { user } = useAuth();
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
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  const porVoluntario = users.map(u => {
    const minhas = schedules.flatMap(s =>
      s.assignments.filter(a => a.userId === u.id)
    );
    return {
      id: u.id, name: u.name,
      total: minhas.length,
      confirmadas: minhas.filter(a => a.status === 'confirmed').length,
      recusadas: minhas.filter(a => a.status === 'declined').length,
      pendentes: minhas.filter(a => a.status === 'pending').length,
    };
  }).filter(v => v.total > 0).sort((a, b) => b.total - a.total);

  const todasAssignments = schedules.flatMap(s => s.assignments);
  const funcoes = {};
  todasAssignments.forEach(a => {
    if (!funcoes[a.function]) funcoes[a.function] = { total: 0, confirmadas: 0, recusadas: 0, pendentes: 0 };
    funcoes[a.function].total++;
    if (a.status === 'confirmed') funcoes[a.function].confirmadas++;
    else if (a.status === 'declined') funcoes[a.function].recusadas++;
    else funcoes[a.function].pendentes++;
  });
  const porFuncao = Object.entries(funcoes).sort((a, b) => b[1].total - a[1].total);

  const totalEscalas = schedules.length;
  const totalAssignments = todasAssignments.length;
  const totalConfirmadas = todasAssignments.filter(a => a.status === 'confirmed').length;
  const totalRecusadas = todasAssignments.filter(a => a.status === 'declined').length;
  const totalPendentes = todasAssignments.filter(a => a.status === 'pending').length;
  const taxaConfirmacao = totalAssignments > 0 ? Math.round((totalConfirmadas / totalAssignments) * 100) : 0;

  function exportarCSV() {
    const linhas = [
      ['Voluntário', 'Total escalado', 'Confirmadas', 'Recusadas', 'Pendentes'],
      ...porVoluntario.map(v => [v.name, v.total, v.confirmadas, v.recusadas, v.pendentes])
    ];
    const csv = linhas.map(l => l.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${MESES[mes]}-${ano}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const anos = [ano - 1, ano, ano + 1];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E1B4B' }}>Relatórios</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 2 }}>Resumo de escalas e presença</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} style={{
            padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB',
            fontSize: 13, background: 'white', fontFamily: 'inherit', fontWeight: 600
          }}>
            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} style={{
            padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB',
            fontSize: 13, background: 'white', fontFamily: 'inherit', fontWeight: 600
          }}>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={exportarCSV} disabled={loading || porVoluntario.length === 0} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: '#10B981', color: 'white', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            opacity: porVoluntario.length === 0 ? 0.5 : 1
          }}>
            ⬇️ Exportar CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>Carregando...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
            <ResumoCard icon="📅" label="Cultos/Eventos" valor={totalEscalas} cor="#7C3AED" />
            <ResumoCard icon="👥" label="Escalações" valor={totalAssignments} cor="#2563EB" />
            <ResumoCard icon="✅" label="Confirmadas" valor={totalConfirmadas} cor="#10B981" />
            <ResumoCard icon="❌" label="Recusadas" valor={totalRecusadas} cor="#EF4444" />
            <ResumoCard icon="📊" label="Taxa confirmação" valor={`${taxaConfirmacao}%`} cor="#F59E0B" />
          </div>

          {totalEscalas === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p style={{ fontSize: 16 }}>Nenhuma escala em {MESES[mes]} de {ano}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>

              <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>Por voluntário</h2>
                {porVoluntario.length === 0 ? (
                  <p style={{ color: '#9CA3AF', fontSize: 13 }}>Nenhum voluntário escalado</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {porVoluntario.map(v => (
                      <div key={v.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{v.name}</span>
                          <span style={{ fontSize: 12, color: '#6B7280' }}>{v.total}x escalado</span>
                        </div>
                        <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                          <div style={{ width: `${(v.confirmadas / v.total) * 100}%`, background: '#10B981', transition: '.3s' }} />
                          <div style={{ width: `${(v.recusadas / v.total) * 100}%`, background: '#EF4444', transition: '.3s' }} />
                          <div style={{ width: `${(v.pendentes / v.total) * 100}%`, background: '#F59E0B', transition: '.3s' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                          {v.confirmadas > 0 && <span style={{ fontSize: 11, color: '#10B981' }}>✅ {v.confirmadas}</span>}
                          {v.recusadas > 0 && <span style={{ fontSize: 11, color: '#EF4444' }}>❌ {v.recusadas}</span>}
                          {v.pendentes > 0 && <span style={{ fontSize: 11, color: '#F59E0B' }}>⏳ {v.pendentes}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>Por função</h2>
                {porFuncao.length === 0 ? (
                  <p style={{ color: '#9CA3AF', fontSize: 13 }}>Nenhuma função escalada</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {porFuncao.map(([funcao, dados]) => (
                      <div key={funcao}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{funcao}</span>
                          <span style={{ fontSize: 12, color: '#6B7280' }}>{dados.total}x</span>
                        </div>
                        <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                          <div style={{ width: `${(dados.confirmadas / dados.total) * 100}%`, background: '#10B981' }} />
                          <div style={{ width: `${(dados.recusadas / dados.total) * 100}%`, background: '#EF4444' }} />
                          <div style={{ width: `${(dados.pendentes / dados.total) * 100}%`, background: '#F59E0B' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                          {dados.confirmadas > 0 && <span style={{ fontSize: 11, color: '#10B981' }}>✅ {dados.confirmadas}</span>}
                          {dados.recusadas > 0 && <span style={{ fontSize: 11, color: '#EF4444' }}>❌ {dados.recusadas}</span>}
                          {dados.pendentes > 0 && <span style={{ fontSize: 11, color: '#F59E0B' }}>⏳ {dados.pendentes}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', gridColumn: '1 / -1' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>
                  Escalas do mês ({totalEscalas})
                </h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F9FAFB' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap' }}>Data</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#6B7280' }}>Título</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280' }}>Escalados</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#10B981' }}>✅</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#EF4444' }}>❌</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#F59E0B' }}>⏳</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...schedules].sort((a,b) => new Date(a.date) - new Date(b.date)).map(s => {
                        const conf = s.assignments.filter(a => a.status === 'confirmed').length;
                        const dec = s.assignments.filter(a => a.status === 'declined').length;
                        const pend = s.assignments.filter(a => a.status === 'pending').length;
                        return (
                          <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '10px 12px', color: '#374151', whiteSpace: 'nowrap' }}>
                              {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              {s.time && <span style={{ color: '#9CA3AF', marginLeft: 4 }}>{s.time}</span>}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 500, color: '#1F2937' }}>{s.title}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#6B7280' }}>{s.assignments.length}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#10B981', fontWeight: 600 }}>{conf || '—'}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#EF4444', fontWeight: 600 }}>{dec || '—'}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#F59E0B', fontWeight: 600 }}>{pend || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}

function ResumoCard({ icon, label, valor, cor }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: '16px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: `3px solid ${cor}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', lineHeight: 1 }}>{valor}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}
