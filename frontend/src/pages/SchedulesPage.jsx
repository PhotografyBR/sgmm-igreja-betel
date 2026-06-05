import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const FUNCTIONS = [
  'Captação de Conteúdos',
  'Telão (Projeção)',
  'Mesa de Som & Iluminação',
  'Transmissão (Live)',
  'Designer/Editor'
];
const TYPE_COLORS = { culto: '#7C3AED', reunião: '#2563EB', evento: '#F59E0B' };
const STATUS_COLORS = { pending: '#F59E0B', confirmed: '#10B981', declined: '#EF4444' };
const STATUS_LABELS = { pending: 'Pendente', confirmed: 'Confirmado', declined: 'Recusado' };
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function SchedulesPage() {
  const { canManageSchedules, user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState('calendario');
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState({ title: '', date: '', time: '', type: 'culto', notes: '', assignments: [] });
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [escalaCriada, setEscalaCriada] = useState(null);

  useEffect(() => { loadData(); }, [currentMonth]);

  async function loadData() {
    setLoading(true);
    try {
      const [schedRes, usersRes] = await Promise.all([
        api.get('/schedules', { params: { month: currentMonth.getMonth() + 1, year: currentMonth.getFullYear() } }),
        canManageSchedules ? api.get('/users/voluntarios') : api.get('/users/voluntarios').catch(() => ({ data: [] }))
      ]);
      setSchedules(schedRes.data);
      setUsers(usersRes.data);
    } catch {
      toast.error('Erro ao carregar escalas');
    } finally {
      setLoading(false);
    }
  }

  function buildDefaultAssignments() {
    return FUNCTIONS.map(f => ({ userId: '', function: f }));
  }

  function openNew(dateStr) {
    setEditing(null);
    setForm({ title: '', date: dateStr || '', time: '', type: 'culto', notes: '', assignments: buildDefaultAssignments() });
    setShowModal(true);
  }

  function openEdit(s) {
    setEditing(s);
    const assignments = FUNCTIONS.map(f => {
      const existing = s.assignments.find(a => a.function === f);
      return { userId: existing?.userId || '', function: f };
    });
    setForm({ title: s.title, date: s.date, time: s.time || '', type: s.type, notes: s.notes || '', assignments });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, assignments: form.assignments.filter(a => a.userId !== '') };
    try {
      if (editing) {
        await api.put(`/schedules/${editing.id}`, payload);
        toast.success('Escala atualizada!');
        setShowModal(false);
        loadData();
      } else {
        const res = await api.post('/schedules', payload);
        toast.success('Escala criada!');
        setShowModal(false);
        loadData();
        if (payload.assignments.length > 0) {
          setEscalaCriada(res.data);
          setShowWhatsApp(true);
        }
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Erro ao salvar escala'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover esta escala?')) return;
    try { await api.delete(`/schedules/${id}`); toast.success('Escala removida'); loadData(); }
    catch { toast.error('Erro ao remover'); }
  }

  async function handleConfirm(scheduleId, status) {
    try {
      await api.post(`/schedules/${scheduleId}/confirm`, { status });
      toast.success(status === 'confirmed' ? 'Presença confirmada!' : 'Presença recusada');
      loadData();
    } catch { toast.error('Erro ao confirmar'); }
  }

  const prevMonth = () => { setSelectedDay(null); setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1)); };
  const nextMonth = () => { setSelectedDay(null); setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1)); };

  function buildCalendarGrid() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }

  function getSchedulesForDay(day) {
    if (!day) return [];
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return schedules.filter(s => s.date === `${y}-${m}-${d}`);
  }

  function formatDateStr(day) {
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return today.getDate() === day && today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();
  };

  const grid = buildCalendarGrid();
  const selectedSchedules = selectedDay ? getSchedulesForDay(selectedDay) : [];
  const sortedSchedules = [...schedules].sort((a, b) => new Date(a.date) - new Date(b.date));
  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E1B4B' }}>Escalas</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 2 }}>{schedules.length} escala(s) neste mês</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ background: '#F3F4F6', borderRadius: 10, padding: 3, display: 'flex', gap: 2 }}>
            {['calendario', 'lista'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                background: view === v ? 'white' : 'transparent',
                color: view === v ? '#7C3AED' : '#9CA3AF',
                boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}>
                {v === 'calendario' ? '📅 Calendário' : '☰ Lista'}
              </button>
            ))}
          </div>
          {canManageSchedules && (
            <button onClick={() => openNew()} style={{
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              color: 'white', border: 'none', borderRadius: 10, padding: '9px 18px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }}>+ Nova escala</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, background: 'white', padding: '10px 16px', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', width: 'fit-content' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#374151', lineHeight: 1 }}>‹</button>
        <span style={{ fontWeight: 700, minWidth: 160, textAlign: 'center', fontSize: 15, color: '#1F2937', textTransform: 'capitalize' }}>
          {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#374151', lineHeight: 1 }}>›</button>
      </div>

      {loading ? <p style={{ color: '#9CA3AF' }}>Carregando...</p> : (
        <>
          {view === 'calendario' && (
            <div className="cal-grid" style={{ display: 'grid', gridTemplateColumns: selectedDay ? '1fr 340px' : '1fr', gap: 16 }}>
              <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
                  {DAYS.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#9CA3AF', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                  {grid.map((day, i) => {
                    const daySchedules = getSchedulesForDay(day);
                    const isSelected = selectedDay === day;
                    const today = isToday(day);
                    return (
                      <div key={i} onClick={() => day && setSelectedDay(isSelected ? null : day)}
                        style={{
                          minHeight: 68, padding: '6px 4px', borderRadius: 10, cursor: day ? 'pointer' : 'default',
                          background: isSelected ? '#EDE9FE' : today ? '#F5F3FF' : 'transparent',
                          border: isSelected ? '2px solid #7C3AED' : today ? '2px solid #C4B5FD' : '2px solid transparent',
                          transition: '.15s'
                        }}>
                        {day && (
                          <>
                            <div style={{ textAlign: 'center', fontSize: 13, fontWeight: today ? 700 : 500, color: today ? '#7C3AED' : '#374151', marginBottom: 4 }}>{day}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {daySchedules.slice(0, 2).map(s => (
                                <div key={s.id} style={{
                                  fontSize: 10, fontWeight: 600, padding: '2px 5px', borderRadius: 4,
                                  background: (TYPE_COLORS[s.type] || '#7C3AED') + '20',
                                  color: TYPE_COLORS[s.type] || '#7C3AED',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>
                                  {s.time ? s.time.slice(0,5) + ' ' : ''}{s.title}
                                </div>
                              ))}
                              {daySchedules.length > 2 && (
                                <div style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'center' }}>+{daySchedules.length - 2} mais</div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedDay && (
                <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', alignSelf: 'start', maxHeight: '80vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>
                      {new Date(formatDateStr(selectedDay) + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
                  </div>
                  {selectedSchedules.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF' }}>
                      <p style={{ fontSize: 24, marginBottom: 8 }}>📭</p>
                      <p style={{ fontSize: 13 }}>Nenhuma escala neste dia</p>
                      {canManageSchedules && (
                        <button onClick={() => openNew(formatDateStr(selectedDay))} style={{
                          marginTop: 12, background: '#EDE9FE', color: '#7C3AED', border: 'none',
                          borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit'
                        }}>+ Criar escala aqui</button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selectedSchedules.map(s => <ScheduleCard key={s.id} s={s} user={user} users={users} canManage={canManageSchedules} onEdit={openEdit} onDelete={handleDelete} onConfirm={handleConfirm} />)}
                      {canManageSchedules && (
                        <button onClick={() => openNew(formatDateStr(selectedDay))} style={{
                          background: 'none', border: '1.5px dashed #D1D5DB', color: '#9CA3AF',
                          borderRadius: 10, padding: '8px', fontSize: 13, cursor: 'pointer',
                          fontFamily: 'inherit', width: '100%', marginTop: 4
                        }}>+ Adicionar escala neste dia</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {view === 'lista' && (
            sortedSchedules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                <p style={{ fontSize: 16 }}>Nenhuma escala neste mês</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sortedSchedules.map(s => (
                  <ScheduleCard key={s.id} s={s} user={user} users={users} canManage={canManageSchedules} onEdit={openEdit} onDelete={handleDelete} onConfirm={handleConfirm} expanded />
                ))}
              </div>
            )
          )}
        </>
      )}

      {showModal && (
        <div className="modal-outer" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div className="modal-inner fade-in" style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#1E1B4B' }}>
              {editing ? 'Editar escala' : 'Nova escala'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Título</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Ex: Culto Domingo Manhã" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Data</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Horário</label>
                  <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Tipo</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={{ ...inputStyle, background: 'white' }}>
                    <option value="culto">Culto</option>
                    <option value="reunião">Reunião</option>
                    <option value="evento">Evento</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Observações</label>
                  <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Opcional" style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 10 }}>
                  Equipe escalada <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(deixe em branco para não escalar a função)</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.assignments.map((a, idx) => (
                    <div key={a.function} className="funcao-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="funcao-label" style={{
                        width: 180, flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#374151',
                        background: '#F3F4F6', borderRadius: 8, padding: '8px 12px'
                      }}>
                        {a.function}
                      </div>
                      <select
                        value={a.userId}
                        onChange={e => {
                          const as = [...form.assignments];
                          as[idx] = { ...as[idx], userId: e.target.value };
                          setForm(p => ({ ...p, assignments: as }));
                        }}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${a.userId ? '#7C3AED' : '#E5E7EB'}`, fontSize: 13, background: 'white', fontFamily: 'inherit', color: a.userId ? '#1F2937' : '#9CA3AF' }}
                      >
                        <option value="">— Não escalar —</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: 'white', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
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

// Modal WhatsApp
function ModalWhatsApp({ escala, users, onClose }) {
  const FRONTEND_URL = 'https://sgmm-igreja-betel-production.up.railway.app';
  const dataFormatada = new Date(escala.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  function gerarMensagem(nome, funcao, token) {
    const link = FRONTEND_URL + '/api/schedules/confirmar/' + token;
    return 'Ola, ' + nome + '! Voce foi escalado(a) para:\n\n*' + escala.title + '*\n' + dataFormatada + (escala.time ? ' as ' + escala.time : '') + '\nFuncao: *' + funcao + '*\n\nConfirme sua presenca:\n' + link;
  }

  function abrirWA(phone, msg) {
    const num = phone.replace(/\D/g, '');
    window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(msg), '_blank');
  }

  const escalados = escala.assignments.map(a => ({
    ...a,
    nome: (users.find(u => u.id === a.userId) || {}).name || 'Voluntario',
    phone: (users.find(u => u.id === a.userId) || {}).phone || ''
  }));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}>
      <div className="fade-in" style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>📲</span>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1E1B4B' }}>Avisar pelo WhatsApp</h2>
              <p style={{ fontSize: 12, color: '#6B7280' }}>{escala.title} · {dataFormatada}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, padding: '10px 12px', background: '#F9FAFB', borderRadius: 8 }}>
          Clique em cada voluntario para abrir o WhatsApp com a mensagem e link de confirmacao prontos.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {escalados.map((a, i) => {
            const temPhone = !!a.phone;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F9FAFB', borderRadius: 12, padding: '12px 14px', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'hsl(' + ((a.userId || '').charCodeAt(0) * 37 % 360) + ',55%,65%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>
                    {a.nome.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{a.nome}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{a.function}</div>
                    {!temPhone && <div style={{ fontSize: 11, color: '#EF4444' }}>Sem telefone cadastrado</div>}
                  </div>
                </div>
                <button
                  onClick={() => temPhone && abrirWA(a.phone, gerarMensagem(a.nome, a.function, a.confirmToken))}
                  disabled={!temPhone}
                  style={{ background: temPhone ? '#25D366' : '#D1D5DB', color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: temPhone ? 'pointer' : 'not-allowed', fontFamily: 'inherit', flexShrink: 0 }}
                >
                  💬 Enviar
                </button>
              </div>
            );
          })}
        </div>
        <button onClick={onClose} style={{ width: '100%', marginTop: 20, padding: '10px', borderRadius: 10, border: '1.5px solid #E5E7EB', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}>
          Fechar
        </button>
      </div>
    </div>
  );
}

function ScheduleCard({ s, user, users = [], canManage, onEdit, onDelete, onConfirm, expanded }) {
  const myAssignment = s.assignments?.find(a => a.userId === user?.id);
  const typeColor = TYPE_COLORS[s.type] || '#7C3AED';

  const assignmentsComNome = s.assignments?.map(a => ({
    ...a,
    nome: users.find(u => u.id === a.userId)?.name || 'Voluntário'
  })) || [];

  const statusIcon = { confirmed: '✅', declined: '❌', pending: '⏳' };
  const statusBg = { confirmed: '#D1FAE5', declined: '#FEE2E2', pending: '#FEF3C7' };
  const statusFg = { confirmed: '#065F46', declined: '#991B1B', pending: '#92400E' };

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${typeColor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: assignmentsComNome.length > 0 ? 10 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1F2937' }}>{s.title}</span>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: typeColor + '20', color: typeColor, fontWeight: 600 }}>{s.type}</span>
          </div>
          {s.time && <p style={{ color: '#9CA3AF', fontSize: 12 }}>🕐 {s.time}</p>}
          {expanded && (
            <p style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
              📅 {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          )}
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={() => onEdit(s)} style={{ background: '#EDE9FE', color: '#7C3AED', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Editar</button>
            <button onClick={() => onDelete(s.id)} style={{ background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 6, padding: '4px 6px', fontSize: 12, cursor: 'pointer' }}>✕</button>
          </div>
        )}
      </div>

      {assignmentsComNome.length > 0 && (
        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            Equipe ({assignmentsComNome.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {assignmentsComNome.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: `hsl(${(a.userId?.charCodeAt(0) || 0) * 37 % 360}, 55%, 65%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'white'
                  }}>
                    {a.nome.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nome}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{a.function}</div>
                  </div>
                </div>
                <span style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600, flexShrink: 0,
                  background: statusBg[a.status], color: statusFg[a.status]
                }}>
                  {statusIcon[a.status]} {STATUS_LABELS[a.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {assignmentsComNome.length === 0 && (
        <p style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginTop: 4 }}>Nenhum voluntário escalado</p>
      )}

      {myAssignment?.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
          <button onClick={() => onConfirm(s.id, 'confirmed')} style={{ flex: 1, background: '#10B981', color: 'white', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>✅ Confirmar</button>
          <button onClick={() => onConfirm(s.id, 'declined')} style={{ flex: 1, background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>❌ Não posso ir</button>
        </div>
      )}
      {myAssignment && myAssignment.status !== 'pending' && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
          <span style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 20,
            background: statusBg[myAssignment.status], color: statusFg[myAssignment.status], fontWeight: 600
          }}>
            {statusIcon[myAssignment.status]} {myAssignment.status === 'confirmed' ? 'Você confirmou presença' : 'Você recusou'}
          </span>
        </div>
      )}
    </div>
  );
}
