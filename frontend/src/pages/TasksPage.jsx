import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const STATUS_COLS = [
  { key: 'pendente', label: 'Pendente', color: '#6B7280', bg: '#F9FAFB' },
  { key: 'em_andamento', label: 'Em andamento', color: '#3B82F6', bg: '#EFF6FF' },
  { key: 'aguardando_revisao', label: 'Aguardando revisão', color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'concluido', label: 'Concluído', color: '#10B981', bg: '#F0FDF4' }
];

const PRIORITY = {
  urgente: { label: 'Urgente', color: '#EF4444' },
  alta: { label: 'Alta', color: '#F59E0B' },
  media: { label: 'Média', color: '#3B82F6' },
  baixa: { label: 'Baixa', color: '#10B981' }
};

export default function TasksPage() {
  const { canManageTasks, isVoluntario, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', assignedTo: '', dueDate: '', priority: 'media'
  });
  const [comment, setComment] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [taskRes, usersRes] = await Promise.all([
        api.get('/tasks'),
        canManageTasks ? api.get('/users') : Promise.resolve({ data: [] })
      ]);
      setTasks(taskRes.data);
      setUsers(usersRes.data);
    } catch {
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/tasks/${editing.id}`, form);
        toast.success('Tarefa atualizada!');
      } else {
        await api.post('/tasks', form);
        toast.success('Tarefa criada!');
      }
      setShowModal(false);
      setEditing(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    }
  }

  async function updateStatus(taskId, status) {
    try {
      await api.put(`/tasks/${taskId}`, { status });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      if (selectedTask?.id === taskId) setSelectedTask(prev => ({ ...prev, status }));
      toast.success('Status atualizado!');
    } catch {
      toast.error('Erro ao atualizar status');
    }
  }

  async function addComment() {
    if (!comment.trim() || !selectedTask) return;
    try {
      const res = await api.post(`/tasks/${selectedTask.id}/comment`, { text: comment });
      setSelectedTask(prev => ({ ...prev, comments: [...(prev.comments || []), res.data] }));
      setComment('');
      loadData();
    } catch {
      toast.error('Erro ao enviar comentário');
    }
  }

  async function deleteTask(id) {
    if (!window.confirm('Remover esta tarefa?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Tarefa removida');
      setSelectedTask(null);
      loadData();
    } catch {
      toast.error('Erro ao remover');
    }
  }

  function openTask(task) {
    // Carregar task completa com comentários
    api.get(`/tasks/${task.id}`).then(res => {
      const full = { ...task, ...res.data };
      setSelectedTask(full);
    }).catch(() => setSelectedTask(task));
  }

  const tasksByStatus = STATUS_COLS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E1B4B' }}>Tarefas</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 2 }}>Acompanhe o workflow de produções</p>
        </div>
        {canManageTasks && (
          <button onClick={() => { setEditing(null); setForm({ title: '', description: '', assignedTo: '', dueDate: '', priority: 'media' }); setShowModal(true); }} style={{
            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}>
            + Nova tarefa
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#9CA3AF' }}>Carregando...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, alignItems: 'start' }}>
          {STATUS_COLS.map(col => (
            <div key={col.key} style={{ background: col.bg, borderRadius: 14, padding: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
                padding: '0 2px'
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: col.color }}>{col.label}</span>
                <span style={{
                  marginLeft: 'auto', background: col.color + '20', color: col.color,
                  borderRadius: 20, padding: '1px 8px', fontSize: 12, fontWeight: 600
                }}>
                  {tasksByStatus[col.key].length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasksByStatus[col.key].map(t => (
                  <div
                    key={t.id}
                    onClick={() => openTask(t)}
                    style={{
                      background: 'white', borderRadius: 10, padding: '12px 14px',
                      cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                      transition: 'box-shadow 0.15s',
                      borderTop: `3px solid ${PRIORITY[t.priority]?.color || '#E5E7EB'}`
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.07)'}
                  >
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', marginBottom: 8, lineHeight: 1.4 }}>
                      {t.title}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 7px', borderRadius: 20,
                        background: PRIORITY[t.priority]?.color + '15',
                        color: PRIORITY[t.priority]?.color,
                        fontWeight: 600
                      }}>
                        {PRIORITY[t.priority]?.label}
                      </span>
                      {t.dueDate && (
                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                          {new Date(t.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                    {t.assigneeName && (
                      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>👤 {t.assigneeName}</p>
                    )}
                  </div>
                ))}

                {tasksByStatus[col.key].length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 10px', color: '#D1D5DB', fontSize: 13 }}>
                    Nenhuma tarefa
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500 }} className="fade-in">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#1E1B4B' }}>
              {editing ? 'Editar tarefa' : 'Nova tarefa'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Título</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Descrição</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Responsável</label>
                  <select value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))} required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, background: 'white' }}>
                    <option value="">Selecionar</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Prioridade</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, background: 'white' }}>
                    {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Prazo</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  padding: '9px 20px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: 'white', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit'
                }}>Cancelar</button>
                <button type="submit" style={{
                  padding: '9px 24px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                  color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  {editing ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer detalhe da tarefa */}
      {selectedTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} onClick={() => setSelectedTask(null)}>
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: 420,
            background: 'white', padding: '24px', overflowY: 'auto',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.15)'
          }} onClick={e => e.stopPropagation()} className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1E1B4B', flex: 1, marginRight: 10 }}>
                {selectedTask.title}
              </h2>
              <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6B7280' }}>✕</button>
            </div>

            {/* Info */}
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: '#6B7280' }}>Responsável</span>
                <span style={{ fontWeight: 600 }}>{selectedTask.assigneeName || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: '#6B7280' }}>Prioridade</span>
                <span style={{ fontWeight: 600, color: PRIORITY[selectedTask.priority]?.color }}>
                  {PRIORITY[selectedTask.priority]?.label}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#6B7280' }}>Prazo</span>
                <span style={{ fontWeight: 600 }}>
                  {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString('pt-BR') : '-'}
                </span>
              </div>
            </div>

            {/* Descrição */}
            {selectedTask.description && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Descrição</p>
                <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.6 }}>{selectedTask.description}</p>
              </div>
            )}

            {/* Atualizar status */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Atualizar status</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {STATUS_COLS.map(col => (
                  <button key={col.key} onClick={() => updateStatus(selectedTask.id, col.key)} style={{
                    padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${col.color}`,
                    background: selectedTask.status === col.key ? col.color : 'white',
                    color: selectedTask.status === col.key ? 'white' : col.color,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                  }}>
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Comentários */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                Comentários ({selectedTask.comments?.length || 0})
              </p>
              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 10 }}>
                {(selectedTask.comments || []).map(c => (
                  <div key={c.id} style={{ background: '#F3F4F6', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 3 }}>{c.userName}</div>
                    <div style={{ fontSize: 13, color: '#4B5563' }}>{c.text}</div>
                  </div>
                ))}
                {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                  <p style={{ fontSize: 13, color: '#9CA3AF' }}>Nenhum comentário ainda</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Adicionar comentário..."
                  onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, outline: 'none' }}
                />
                <button onClick={addComment} style={{
                  background: '#7C3AED', color: 'white', border: 'none',
                  borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 14
                }}>
                  ↑
                </button>
              </div>
            </div>

            {/* Ações admin */}
            {canManageTasks && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #E5E7EB', display: 'flex', gap: 8 }}>
                <button onClick={() => deleteTask(selectedTask.id)} style={{
                  background: '#FEE2E2', color: '#EF4444', border: 'none',
                  borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  Remover tarefa
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
