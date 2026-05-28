import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const FUNCTIONS = ['Fotógrafo', 'Videógrafo', 'Editor', 'Operador de Som', 'Projeção', 'Transmissão', 'Designer'];

export default function SchedulesPage() {
  const { canManageSchedules, isVoluntario, user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [form, setForm] = useState({
    title: '', date: '', time: '', type: 'culto', notes: '', assignments: []
  });

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  async function loadData() {
    try {
      const [schedRes, usersRes] = await Promise.all([
        api.get('/schedules', {
          params: {
            month: currentMonth.getMonth() + 1,
            year: currentMonth.getFullYear()
          }
        }),
        canManageSchedules ? api.get('/users/voluntarios') : Promise.resolve({ data: [] })
      ]);
      setSchedules(schedRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      toast.error('Erro ao carregar escalas');
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditing(null);
    setForm({ title: '', date: '', time: '', type: 'culto', notes: '', assignments: [] });
    setShowModal(true);
  }

  function openEdit(s) {
    setEditing(s);
    setForm({
      title: s.title, date: s.date, time: s.time || '',
      type: s.type, notes: s.notes || '',
      assignments: s.assignments.map(a => ({ userId: a.userId, function: a.function }))
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/schedules/${editing.id}`, form);
        toast.success('Escala atualizada!');
      } else {
        await api.post('/schedules', form);
        toast.success('Escala criada!');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar escala');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover esta escala?')) return;
    try {
      await api.delete(`/schedules/${id}`);
      toast.success('Escala removida');
      loadData();
    } catch {
      toast.error('Erro ao remover');
    }
  }

  async function handleConfirm(scheduleId, status) {
    try {
      await api.post(`/schedules/${scheduleId}/confirm`, { status });
      toast.success(status === 'confirmed' ? 'Presença confirmada!' : 'Presença recusada');
      loadData();
    } catch {
      toast.error('Erro ao confirmar');
    }
  }

  function addAssignment() {
    setForm(prev => ({
      ...prev,
      assignments: [...prev.assignments, { userId: '', function: FUNCTIONS[0] }]
    }));
  }

  function updateAssignment(idx, field, value) {
    setForm(prev => {
      const assignments = [...prev.assignments];
      assignments[idx] = { ...assignments[idx], [field]: value };
      return { ...prev, assignments };
    });
  }

  function removeAssignment(idx) {
    setForm(prev => ({
      ...prev,
      assignments: prev.assignments.filter((_, i) => i !== idx)
    }));
  }

  const prevMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1));

  const statusColors = { pending: '#F59E0B', confirmed: '#10B981', declined: '#EF4444' };
  const statusLabels = { pending: 'Pendente', confirmed: 'Confirmado', declined: 'Recusado' };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E1B4B' }}>Escalas</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 2 }}>Gerencie as escalas dos cultos</p>
        </div>
        {canManageSchedules && (
          <button onClick={openNew} style={{
            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}>
            + Nova escala
          </button>
        )}
      </div>

      {/* Navegador de mês */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
        background: 'white', padding: '12px 16px', borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', width: 'fit-content'
      }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#374151' }}>‹</button>
        <span style={{ fontWeight: 600, minWidth: 140, textAlign: 'center', fontSize: 15 }}>
          {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#374151' }}>›</button>
      </div>

      {loading ? (
        <p style={{ color: '#9CA3AF' }}>Carregando...</p>
      ) : schedules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <p style={{ fontSize: 16 }}>Nenhuma escala neste mês</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {schedules.sort((a, b) => new Date(a.date) - new Date(b.date)).map(s => {
            const myAssignment = s.assignments?.find(a => a.userId === user?.id);
            return (
              <div key={s.id} style={{
                background: 'white', borderRadius: 14, padding: '18px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                borderLeft: '4px solid #7C3AED'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937' }}>{s.title}</h3>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 20,
                        background: '#EDE9FE', color: '#7C3AED', fontWeight: 500
                      }}>
                        {s.type}
                      </span>
                    </div>
                    <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 10 }}>
                      📅 {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {s.time && ` · 🕐 ${s.time}`}
                    </p>

                    {/* Escalados */}
                    {s.assignments?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {s.assignments.map((a, i) => {
                          const assignedUser = a.userId ? { name: a.userId } : null;
                          return (
                            <span key={i} style={{
                              fontSize: 12, padding: '3px 10px', borderRadius: 20,
                              background: statusColors[a.status] + '20',
                              color: statusColors[a.status],
                              fontWeight: 500, border: `1px solid ${statusColors[a.status]}40`
                            }}>
                              {a.function} · {statusLabels[a.status]}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Confirmar presença (voluntário) */}
                    {myAssignment && myAssignment.status === 'pending' && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <button onClick={() => handleConfirm(s.id, 'confirmed')} style={{
                          background: '#D1FAE5', color: '#065F46', border: 'none',
                          borderRadius: 8, padding: '6px 14px', fontSize: 13,
                          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                          Confirmar presença
                        </button>
                        <button onClick={() => handleConfirm(s.id, 'declined')} style={{
                          background: '#FEE2E2', color: '#991B1B', border: 'none',
                          borderRadius: 8, padding: '6px 14px', fontSize: 13,
                          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                          Não consigo ir
                        </button>
                      </div>
                    )}
                    {myAssignment && myAssignment.status !== 'pending' && (
                      <div style={{ marginTop: 10 }}>
                        <span style={{
                          fontSize: 12, padding: '4px 10px', borderRadius: 20,
                          background: myAssignment.status === 'confirmed' ? '#D1FAE5' : '#FEE2E2',
                          color: myAssignment.status === 'confirmed' ? '#065F46' : '#991B1B',
                          fontWeight: 600
                        }}>
                          {myAssignment.status === 'confirmed' ? 'Você confirmou presença' : 'Você recusou esta escala'}
                        </span>
                      </div>
                    )}
                  </div>

                  {canManageSchedules && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => openEdit(s)} style={{
                        background: '#EDE9FE', color: '#7C3AED', border: 'none',
                        borderRadius: 8, padding: '6px 12px', fontSize: 13,
                        cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500
                      }}>
                        Editar
                      </button>
                      <button onClick={() => handleDelete(s.id)} style={{
                        background: '#FEE2E2', color: '#EF4444', border: 'none',
                        borderRadius: 8, padding: '6px 12px', fontSize: 13,
                        cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500
                      }}>
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: 20
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 28,
            width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto'
          }} className="fade-in">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#1E1B4B' }}>
              {editing ? 'Editar escala' : 'Nova escala'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Título</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required
                    placeholder="Ex: Culto Domingo Manhã"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Data</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Horário</label>
                  <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Tipo</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none', background: 'white' }}>
                    <option value="culto">Culto</option>
                    <option value="reunião">Reunião</option>
                    <option value="evento">Evento</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Observações</label>
                  <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Opcional"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none' }} />
                </div>
              </div>

              {/* Atribuições */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Equipe escalada</label>
                  <button type="button" onClick={addAssignment} style={{
                    background: 'none', border: '1.5px dashed #7C3AED', color: '#7C3AED',
                    borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit'
                  }}>
                    + Adicionar
                  </button>
                </div>
                {form.assignments.map((a, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <select value={a.userId} onChange={e => updateAssignment(idx, 'userId', e.target.value)}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, background: 'white' }}>
                      <option value="">Selecionar voluntário</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <select value={a.function} onChange={e => updateAssignment(idx, 'function', e.target.value)}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, background: 'white' }}>
                      {FUNCTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <button type="button" onClick={() => removeAssignment(idx)} style={{
                      background: '#FEE2E2', color: '#EF4444', border: 'none',
                      borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14
                    }}>✕</button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  padding: '9px 20px', borderRadius: 8, border: '1.5px solid #E5E7EB',
                  background: 'white', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  Cancelar
                </button>
                <button type="submit" style={{
                  padding: '9px 24px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                  color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  {editing ? 'Salvar' : 'Criar escala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
