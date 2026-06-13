import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  CalendarDays, List, Plus, ChevronLeft, ChevronRight,
  Clock, Users, Edit2, Trash2, MessageCircle, X,
  CheckCircle, XCircle, AlertCircle, Phone
} from 'lucide-react';
import {
  PageHeader, Card, Badge, Modal, Field, EmptyState, SegmentedControl, Avatar
} from '../components/ui';
import { teamStatus, TEAM_SIZE, fmtDataLonga, TYPE_COLORS } from '../lib/utils';

const FUNCTIONS = [
  'Captação de Conteúdos',
  'Telão (Projeção)',
  'Mesa de Som & Iluminação',
  'Transmissão (Live)',
  'Designer/Editor'
];

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_META = {
  pending: { label: 'Pendente', variant: 'warning', icon: AlertCircle },
  confirmed: { label: 'Confirmado', variant: 'success', icon: CheckCircle },
  declined: { label: 'Recusado', variant: 'danger', icon: XCircle }
};

const INP = {
  width: '100%', padding: '10px 13px', borderRadius: 10,
  border: '1.5px solid var(--border)', fontSize: 14, outline: 'none',
  background: 'white', fontFamily: 'inherit', color: 'var(--text)',
  transition: 'border-color .16s'
};

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
        canManageSchedules ? api.get('/users/voluntarios') : Promise.resolve({ data: [] })
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
      } else {
        await api.post('/schedules', payload);
        toast.success('Escala criada!');
      }
      setShowModal(false);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro ao salvar'); }
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

  return (
    <div className="fade-in">
      <PageHeader
        title="Escalas"
        subtitle={`${schedules.length} escala${schedules.length !== 1 ? 's' : ''} em ${currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
        actions={<>
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: 'calendario', label: 'Calendário', icon: CalendarDays },
              { value: 'lista', label: 'Lista', icon: List }
            ]}
          />
          {canManageSchedules && (
            <button className="btn btn-primary" onClick={() => openNew()}>
              <Plus size={16} /> Nova escala
            </button>
          )}
        </>}
      />

      {/* Navegação de mês */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, width: 'fit-content' }}>
        <button className="btn btn-secondary btn-icon" onClick={prevMonth}><ChevronLeft size={17} /></button>
        <span style={{ fontWeight: 700, fontSize: 15, minWidth: 170, textAlign: 'center', color: 'var(--text)', textTransform: 'capitalize' }}>
          {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button className="btn btn-secondary btn-icon" onClick={nextMonth}><ChevronRight size={17} /></button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />
          ))}
        </div>
      ) : (
        <>
          {/* ── CALENDÁRIO ─────────────────────────────────────── */}
          {view === 'calendario' && (
            <div className="cal-grid" style={{ display: 'grid', gridTemplateColumns: selectedDay ? '1fr 340px' : '1fr', gap: 16, alignItems: 'start' }}>
              <Card style={{ padding: 14 }}>
                {/* Dias da semana */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 6 }}>
                  {DAYS.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: 'var(--text-4)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: 0.4 }}>{d}</div>
                  ))}
                </div>
                {/* Células */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                  {grid.map((day, i) => {
                    const daySchedules = getSchedulesForDay(day);
                    const isSelected = selectedDay === day;
                    const today = isToday(day);
                    return (
                      <div
                        key={i}
                        className="cal-cell"
                        onClick={() => day && setSelectedDay(isSelected ? null : day)}
                        style={{
                          minHeight: 78, padding: '6px 5px', borderRadius: 10,
                          cursor: day ? 'pointer' : 'default',
                          background: isSelected ? 'var(--primary-soft)' : today ? 'var(--primary-fade)' : 'transparent',
                          border: isSelected ? '2px solid var(--primary-light)' : today ? '2px solid var(--primary-soft)' : '2px solid transparent',
                          transition: '.15s'
                        }}
                        onMouseEnter={e => { if (day && !isSelected) e.currentTarget.style.background = 'var(--border-soft)'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = today ? 'var(--primary-fade)' : 'transparent'; }}
                      >
                        {day && (
                          <>
                            <div className="cal-cell-day" style={{
                              textAlign: 'center', fontSize: 13, fontWeight: today ? 800 : 500,
                              color: today ? 'var(--primary)' : 'var(--text-2)', marginBottom: 4
                            }}>
                              {today ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  width: 24, height: 24, borderRadius: '50%',
                                  background: 'var(--primary)', color: 'white', fontSize: 12, fontWeight: 800
                                }}>{day}</span>
                              ) : day}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {daySchedules.slice(0, 2).map(s => {
                                const st = teamStatus(s);
                                return (
                                  <div key={s.id} className="cal-event-chip" style={{
                                    fontSize: 10, fontWeight: 600, padding: '2px 5px', borderRadius: 5,
                                    background: (TYPE_COLORS[s.type] || 'var(--primary)') + '22',
                                    color: TYPE_COLORS[s.type] || 'var(--primary)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    borderLeft: `2px solid ${st.dot}`
                                  }}>
                                    {s.time ? s.time.slice(0, 5) + ' ' : ''}{s.title}
                                  </div>
                                );
                              })}
                              {daySchedules.length > 2 && (
                                <div style={{ fontSize: 9.5, color: 'var(--text-4)', textAlign: 'center', fontWeight: 600 }}>
                                  +{daySchedules.length - 2} mais
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Painel lateral do dia */}
              {selectedDay && (
                <Card className="fade-in-scale" style={{ position: 'sticky', top: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', textTransform: 'capitalize' }}>
                        {new Date(formatDateStr(selectedDay) + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                        {new Date(formatDateStr(selectedDay) + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={() => setSelectedDay(null)}><X size={17} /></button>
                  </div>

                  {selectedSchedules.length === 0 ? (
                    <EmptyState
                      icon={CalendarDays}
                      title="Nenhuma escala neste dia"
                      action={canManageSchedules && (
                        <button className="btn btn-soft btn-sm" onClick={() => openNew(formatDateStr(selectedDay))}>
                          <Plus size={13} /> Criar escala aqui
                        </button>
                      )}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {selectedSchedules.map(s => (
                        <ScheduleCard key={s.id} s={s} user={user} users={users} canManage={canManageSchedules} onEdit={openEdit} onDelete={handleDelete} onConfirm={handleConfirm} onAvisar={sc => { setEscalaCriada(sc); setShowWhatsApp(true); }} />
                      ))}
                      {canManageSchedules && (
                        <button className="btn btn-secondary btn-sm" style={{ width: '100%', borderStyle: 'dashed' }} onClick={() => openNew(formatDateStr(selectedDay))}>
                          <Plus size={13} /> Adicionar escala
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* ── LISTA ───────────────────────────────────────────── */}
          {view === 'lista' && (
            sortedSchedules.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nenhuma escala neste mês"
                action={canManageSchedules && <button className="btn btn-primary btn-sm" onClick={() => openNew()}><Plus size={13} /> Criar escala</button>}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sortedSchedules.map(s => (
                  <ScheduleCard key={s.id} s={s} user={user} users={users} canManage={canManageSchedules} onEdit={openEdit} onDelete={handleDelete} onConfirm={handleConfirm} onAvisar={sc => { setEscalaCriada(sc); setShowWhatsApp(true); }} expanded />
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <Modal title={editing ? 'Editar escala' : 'Nova escala'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="Título">
                  <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Ex: Culto Domingo Manhã" style={INP} />
                </Field>
              </div>
              <Field label="Data">
                <input type="date" className="input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required style={INP} />
              </Field>
              <Field label="Horário">
                <input type="time" className="input" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} style={INP} />
              </Field>
              <Field label="Tipo">
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={{ ...INP }}>
                  <option value="culto">Culto</option>
                  <option value="reunião">Reunião</option>
                  <option value="evento">Evento</option>
                </select>
              </Field>
              <Field label="Observações">
                <input className="input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Opcional" style={INP} />
              </Field>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label className="label" style={{ marginBottom: 10 }}>
                Equipe escalada <span style={{ fontWeight: 400, color: 'var(--text-4)' }}>(deixe em branco para não escalar)</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.assignments.map((a, idx) => (
                  <div key={a.function} className="funcao-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="funcao-label" style={{
                      width: 190, flexShrink: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
                      background: 'var(--border-soft)', borderRadius: 8, padding: '9px 12px'
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
                      style={{
                        flex: 1, padding: '9px 12px', borderRadius: 9,
                        border: `1.5px solid ${a.userId ? 'var(--primary-light)' : 'var(--border)'}`,
                        fontSize: 13, background: 'white', fontFamily: 'inherit',
                        color: a.userId ? 'var(--text)' : 'var(--text-4)',
                        outline: 'none'
                      }}
                    >
                      <option value="">— Não escalar —</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Salvar' : 'Criar escala'}</button>
            </div>
          </form>
        </Modal>
      )}

      {showWhatsApp && escalaCriada && (
        <ModalWhatsApp escala={escalaCriada} users={users} onClose={() => { setShowWhatsApp(false); setEscalaCriada(null); }} />
      )}
    </div>
  );
}

/* ─── Card de escala ─────────────────────────────────────────────────────── */

function ScheduleCard({ s, user, users = [], canManage, onEdit, onDelete, onConfirm, onAvisar, expanded }) {
  const [open, setOpen] = useState(false);
  const myAssignment = s.assignments?.find(a => a.userId === user?.id);
  const typeColor = TYPE_COLORS[s.type] || 'var(--primary)';
  const st = teamStatus(s);

  const assignmentsComNome = s.assignments?.map(a => ({
    ...a, nome: users.find(u => u.id === a.userId)?.name || 'Voluntário'
  })) || [];

  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius)',
      border: '1px solid var(--border-soft)',
      boxShadow: 'var(--shadow-xs)',
      overflow: 'hidden'
    }}>
      {/* Cabeçalho do card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <div style={{ width: 4, alignSelf: 'stretch', background: typeColor, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, padding: '13px 15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span className="schedule-card-title" style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{s.title}</span>
                <Badge style={{ background: typeColor + '20', color: typeColor }}>{s.type}</Badge>
                <Badge variant={st.variant}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: st.dot, display: 'inline-block' }} />
                  {st.label}
                </Badge>
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-3)' }}>
                {expanded && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textTransform: 'capitalize' }}>
                    <CalendarDays size={13} />
                    {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                )}
                {s.time && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock size={13} /> {s.time.slice(0, 5)}</span>}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Users size={13} /> {assignmentsComNome.length}/{TEAM_SIZE} na equipe
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
              {canManage && (
                <>
                  <button className="btn btn-ghost btn-icon btn-sm" title="Avisar pelo WhatsApp"
                    style={{ color: '#22C55E' }} onClick={() => onAvisar && onAvisar(s)}>
                    <MessageCircle size={15} />
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(s)}><Edit2 size={15} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onDelete(s.id)}><Trash2 size={15} /></button>
                </>
              )}
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(!open)}>
                <ChevronRight size={15} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: '.2s' }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Equipe expandida */}
      {open && (
        <div className="fade-in" style={{ padding: '12px 15px 14px 19px', borderTop: '1px solid var(--border-soft)', background: 'var(--bg)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
            Equipe ({assignmentsComNome.length})
          </p>
          {assignmentsComNome.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-4)', fontStyle: 'italic' }}>Nenhum voluntário escalado ainda</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {assignmentsComNome.map((a, i) => {
                const sm = STATUS_META[a.status] || STATUS_META.pending;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                      <Avatar name={a.nome} size={30} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }} className="truncate">{a.nome}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{a.function}</div>
                      </div>
                    </div>
                    <Badge variant={sm.variant}>{sm.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}

          {myAssignment?.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn btn-success" style={{ flex: 1 }} onClick={() => onConfirm(s.id, 'confirmed')}>
                <CheckCircle size={15} /> Confirmar presença
              </button>
              <button className="btn btn-danger-soft" style={{ flex: 1 }} onClick={() => onConfirm(s.id, 'declined')}>
                <XCircle size={15} /> Não posso ir
              </button>
            </div>
          )}
          {myAssignment && myAssignment.status !== 'pending' && (
            <div style={{ marginTop: 12 }}>
              <Badge variant={STATUS_META[myAssignment.status]?.variant}>
                {myAssignment.status === 'confirmed' ? 'Você confirmou presença' : 'Você recusou'}
              </Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Modal WhatsApp ─────────────────────────────────────────────────────── */

function ModalWhatsApp({ escala, users, onClose }) {
  const FRONTEND_URL = 'https://sgmm-igreja-betel-production.up.railway.app';
  const dataFormatada = new Date(escala.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  function gerarMensagem(nome, funcao, token) {
    const link = FRONTEND_URL + '/api/schedules/confirmar/' + token;
    return `Ola, ${nome}! Voce foi escalado(a) para:\n\n*${escala.title}*\n${dataFormatada}${escala.time ? ' as ' + escala.time : ''}\nFuncao: *${funcao}*\n\nConfirme sua presenca:\n${link}`;
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
    <Modal title="Avisar pelo WhatsApp" subtitle={escala.title} onClose={onClose} maxWidth={480}>
      <div style={{
        background: 'var(--border-soft)', borderRadius: 10, padding: '10px 14px',
        fontSize: 13, color: 'var(--text-3)', marginBottom: 18
      }}>
        Clique em cada voluntário para abrir o WhatsApp com a mensagem e link de confirmação prontos.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {escalados.map((a, i) => {
          const temPhone = !!a.phone;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg)', borderRadius: 12, padding: '12px 14px', gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Avatar name={a.nome} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{a.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{a.function}</div>
                  {!temPhone && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 1 }}>Sem telefone cadastrado</div>}
                </div>
              </div>
              <button
                onClick={() => temPhone && abrirWA(a.phone, gerarMensagem(a.nome, a.function, a.confirmToken))}
                disabled={!temPhone}
                className="btn btn-sm"
                style={{ background: temPhone ? '#25D366' : 'var(--border)', color: 'white', flexShrink: 0 }}
              >
                <Phone size={13} /> Enviar
              </button>
            </div>
          );
        })}
      </div>
      <button className="btn btn-secondary" style={{ width: '100%', marginTop: 18 }} onClick={onClose}>Fechar</button>
    </Modal>
  );
}
