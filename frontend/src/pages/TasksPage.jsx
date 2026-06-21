import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus, X, Send, Trash2, CalendarDays, User,
  Flag, MessageSquare, GripVertical, ChevronRight,
  Paperclip, ExternalLink, Upload, FileText
} from 'lucide-react';
import { PageHeader, Card, Badge, Modal, Field, EmptyState, Avatar } from '../components/ui';

const STATUS_COLS = [
  { key: 'pendente',           label: 'A Fazer',        color: '#64748B', bg: '#F1F5F9', dot: '#94A3B8' },
  { key: 'em_andamento',       label: 'Em andamento',   color: '#3B82F6', bg: '#EFF6FF', dot: '#3B82F6' },
  { key: 'aguardando_revisao', label: 'Revisão',        color: '#F59E0B', bg: '#FFFBEB', dot: '#F59E0B' },
  { key: 'concluido',          label: 'Concluído',      color: '#22C55E', bg: '#F0FDF4', dot: '#22C55E' }
];

const PRIORITY = {
  urgente: { label: 'Urgente', color: '#EF4444', soft: '#FEE2E2' },
  alta:    { label: 'Alta',    color: '#F97316', soft: '#FEF0E8' },
  media:   { label: 'Média',   color: '#3B82F6', soft: '#DBEAFE' },
  baixa:   { label: 'Baixa',   color: '#22C55E', soft: '#DCFCE7' }
};

const INP = {
  width: '100%', padding: '10px 13px', borderRadius: 10,
  border: '1px solid var(--border-soft)', fontSize: 14, outline: 'none',
  background: 'var(--bg-card)', fontFamily: 'inherit',
  transition: 'border-color .16s'
};

export default function TasksPage() {
  const { canManageTasks, user } = useAuth();
  const [tasks, setTasks]           = useState([]);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [comment, setComment]       = useState('');
  const [dragId, setDragId]         = useState(null);
  const [dragOver, setDragOver]     = useState(null);
  const [form, setForm] = useState({ title: '', description: '', assignedTo: '', dueDate: '', priority: 'media' });
  const [mediaList, setMediaList]   = useState([]);
  const [showAttach, setShowAttach] = useState(false);
  const [attachTab, setAttachTab]   = useState('upload');
  const [attachFile, setAttachFile] = useState(null);
  const [attaching, setAttaching]   = useState(false);
  const attachRef = useRef();
  const tabStyle = (active) => ({ flex: 1, padding: '8px 10px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: '1.5px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'white' : 'var(--text-3)' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [taskRes, usersRes, mediaRes] = await Promise.all([
        api.get('/tasks'),
        canManageTasks ? api.get('/users') : Promise.resolve({ data: [] }),
        api.get('/media').catch(() => ({ data: [] }))
      ]);
      setTasks(taskRes.data);
      setUsers(usersRes.data);
      setMediaList(mediaRes.data);
    } catch { toast.error('Erro ao carregar tarefas'); }
    finally { setLoading(false); }
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
      setShowModal(false); setEditing(null); loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro ao salvar'); }
  }

  async function updateStatus(taskId, status) {
    try {
      await api.put(`/tasks/${taskId}`, { status });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      if (selectedTask?.id === taskId) setSelectedTask(prev => ({ ...prev, status }));
    } catch { toast.error('Erro ao mover tarefa'); }
  }

  async function addComment() {
    if (!comment.trim() || !selectedTask) return;
    try {
      const res = await api.post(`/tasks/${selectedTask.id}/comment`, { text: comment });
      setSelectedTask(prev => ({ ...prev, comments: [...(prev.comments || []), res.data] }));
      setComment(''); loadData();
    } catch { toast.error('Erro ao enviar comentário'); }
  }

  async function deleteTask(id) {
    if (!window.confirm('Remover esta tarefa?')) return;
    try { await api.delete(`/tasks/${id}`); toast.success('Tarefa removida'); setSelectedTask(null); loadData(); }
    catch { toast.error('Erro ao remover'); }
  }

  async function uploadAttachment(e) {
    e.preventDefault();
    if (!attachFile || !selectedTask) return;
    const fd = new FormData();
    fd.append('file', attachFile);
    setAttaching(true);
    try {
      const res = await api.post(`/tasks/${selectedTask.id}/attachments/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSelectedTask(prev => ({ ...prev, attachments: [...(prev.attachments || []), res.data] }));
      setAttachFile(null); setShowAttach(false); toast.success('Anexo adicionado'); loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro ao anexar'); }
    finally { setAttaching(false); }
  }

  async function linkAttachment(mediaId) {
    if (!selectedTask) return;
    try {
      const res = await api.post(`/tasks/${selectedTask.id}/attachments/link`, { mediaId });
      setSelectedTask(prev => ({ ...prev, attachments: [...(prev.attachments || []), res.data] }));
      setShowAttach(false); toast.success('Arquivo vinculado'); loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro ao vincular'); }
  }

  async function removeAttachment(attId) {
    if (!selectedTask) return;
    try {
      await api.delete(`/tasks/${selectedTask.id}/attachments/${attId}`);
      setSelectedTask(prev => ({ ...prev, attachments: (prev.attachments || []).filter(a => a.id !== attId) }));
      toast.success('Anexo removido'); loadData();
    } catch { toast.error('Erro ao remover anexo'); }
  }

  async function openTask(task) {
    api.get(`/tasks/${task.id}`).then(res => setSelectedTask({ ...task, ...res.data })).catch(() => setSelectedTask(task));
  }

  // ── Drag and Drop ─────────────────────────────────────────────────────────
  function onDragStart(e, taskId) {
    setDragId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragOver(e, colKey) {
    e.preventDefault();
    setDragOver(colKey);
  }
  function onDrop(e, colKey) {
    e.preventDefault();
    if (dragId) {
      const task = tasks.find(t => t.id === dragId);
      if (task && task.status !== colKey) updateStatus(dragId, colKey);
    }
    setDragId(null); setDragOver(null);
  }
  function onDragEnd() { setDragId(null); setDragOver(null); }

  const tasksByStatus = STATUS_COLS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  const total = tasks.length;
  const concluidas = tasks.filter(t => t.status === 'concluido').length;

  return (
    <div className="fade-in">
      <PageHeader
        title="Tarefas"
        subtitle={`${total - concluidas} em aberto · ${concluidas} concluída${concluidas !== 1 ? 's' : ''}`}
        actions={canManageTasks && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ title: '', description: '', assignedTo: '', dueDate: '', priority: 'media' }); setShowModal(true); }}>
            <Plus size={16} /> Nova tarefa
          </button>
        )}
      />

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {STATUS_COLS.map(col => (
            <div key={col.key} style={{ background: col.bg, borderRadius: 14, padding: 14, minHeight: 220 }}>
              <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 16 }} />
              {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 90, marginBottom: 10, borderRadius: 10 }} />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="kanban-board" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, alignItems: 'start' }}>
          {STATUS_COLS.map(col => (
            <div
              key={col.key}
              className={`kanban-col${dragOver === col.key ? ' drag-over' : ''}`}
              onDragOver={e => onDragOver(e, col.key)}
              onDrop={e => onDrop(e, col.key)}
              onDragLeave={() => setDragOver(null)}
            >
              {/* Header da coluna */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: col.dot, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: col.color, flex: 1 }}>{col.label}</span>
                <span style={{
                  background: col.color + '22', color: col.color,
                  borderRadius: 999, padding: '1px 9px', fontSize: 12, fontWeight: 700
                }}>
                  {tasksByStatus[col.key].length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasksByStatus[col.key].map(t => {
                  const prio = PRIORITY[t.priority] || PRIORITY.media;
                  const isDragging = dragId === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`kanban-card${isDragging ? ' dragging' : ''}`}
                      draggable
                      onDragStart={e => onDragStart(e, t.id)}
                      onDragEnd={onDragEnd}
                      onClick={() => openTask(t)}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                        <GripVertical size={14} style={{ color: 'var(--text-4)', marginTop: 1, flexShrink: 0 }} />
                        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, flex: 1 }}>{t.title}</p>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 999,
                          background: prio.soft, color: prio.color, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', gap: 4
                        }}>
                          <Flag size={9} /> {prio.label}
                        </span>
                        {t.dueDate && (
                          <span style={{ fontSize: 11, color: 'var(--text-4)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CalendarDays size={11} />
                            {new Date(t.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                      {t.assigneeName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <Avatar name={t.assigneeName} size={20} />
                          <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{t.assigneeName}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {tasksByStatus[col.key].length === 0 && (
                  <div style={{ textAlign: 'center', padding: '22px 10px', color: 'var(--text-4)', fontSize: 13 }}>
                    Arraste uma tarefa aqui
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <Modal title={editing ? 'Editar tarefa' : 'Nova tarefa'} onClose={() => setShowModal(false)} maxWidth={500}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Título">
                <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required style={INP} placeholder="Descreva a tarefa..." />
              </Field>
              <Field label="Descrição">
                <textarea className="input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  style={{ ...INP, resize: 'vertical' }} placeholder="Detalhes adicionais..." />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Responsável">
                  <select value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))} required style={INP}>
                    <option value="">Selecionar</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </Field>
                <Field label="Prioridade">
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} style={INP}>
                    {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </Field>
                <Field label="Prazo">
                  <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} style={INP} />
                </Field>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Salvar' : 'Criar tarefa'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Drawer de detalhe */}
      {selectedTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 200, backdropFilter: 'blur(2px)' }} onClick={() => setSelectedTask(null)}>
          <div className="slide-in-right" style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: 440,
            background: 'var(--bg-card)', overflowY: 'auto', boxShadow: '-8px 0 40px rgba(15,23,42,0.18)'
          }} onClick={e => e.stopPropagation()}>
            {/* Header do drawer */}
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', flex: 1, lineHeight: 1.35 }}>{selectedTask.title}</h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setSelectedTask(null)}><X size={18} /></button>
              </div>
            </div>

            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Info */}
              <Card style={{ background: 'var(--bg)', boxShadow: 'none' }}>
                {[
                  { icon: User, label: 'Responsável', value: selectedTask.assigneeName || '—' },
                  { icon: Flag, label: 'Prioridade', value: PRIORITY[selectedTask.priority]?.label || '—', color: PRIORITY[selectedTask.priority]?.color },
                  { icon: CalendarDays, label: 'Prazo', value: selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString('pt-BR') : '—' }
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <Icon size={14} /> {label}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: color || 'var(--text)' }}>{value}</span>
                  </div>
                ))}
              </Card>

              {/* Descrição */}
              {selectedTask.description && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Descrição</p>
                  <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65 }}>{selectedTask.description}</p>
                </div>
              )}

              {/* Anexos */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Anexos ({selectedTask.attachments?.length || 0})
                  </p>
                  <button className="btn btn-soft btn-sm" onClick={() => { setAttachTab('upload'); setAttachFile(null); setShowAttach(true); }}>
                    <Paperclip size={13} /> Anexar
                  </button>
                </div>
                {(selectedTask.attachments || []).length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-4)', fontStyle: 'italic' }}>Nenhum anexo</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedTask.attachments.map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', borderRadius: 10, padding: '9px 12px' }}>
                        {a.thumbnailUrl
                          ? <img src={a.thumbnailUrl} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={16} style={{ color: 'var(--text-4)' }} /></div>}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }} title={a.name}>{a.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{a.origem === 'repositorio' ? 'Do repositório' : 'Upload'}</div>
                        </div>
                        <a href={a.driveUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon btn-sm" title="Abrir"><ExternalLink size={14} /></a>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeAttachment(a.id)} title="Remover"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mudar status */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Mover para</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {STATUS_COLS.map(col => (
                    <button key={col.key} onClick={() => updateStatus(selectedTask.id, col.key)} style={{
                      padding: '6px 13px', borderRadius: 8,
                      border: `1.5px solid ${col.color}`,
                      background: selectedTask.status === col.key ? col.color : 'white',
                      color: selectedTask.status === col.key ? 'white' : col.color,
                      fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all .15s'
                    }}>
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comentários */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Comentários ({selectedTask.comments?.length || 0})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto', marginBottom: 12 }}>
                  {(selectedTask.comments || []).length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-4)', fontStyle: 'italic' }}>Nenhum comentário ainda</p>
                  ) : (selectedTask.comments || []).map(c => (
                    <div key={c.id} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 4 }}>{c.userName}</div>
                      <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5 }}>{c.text}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="Escrever comentário..."
                    onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
                    style={{ ...INP, flex: 1 }} />
                  <button className="btn btn-primary btn-icon" onClick={addComment}><Send size={15} /></button>
                </div>
              </div>

              {/* Ações admin */}
              {canManageTasks && (
                <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-danger-soft btn-sm" onClick={() => deleteTask(selectedTask.id)}>
                    <Trash2 size={14} /> Remover tarefa
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de anexar arquivo */}
      {showAttach && selectedTask && (
        <Modal title="Anexar arquivo" subtitle={selectedTask.title} onClose={() => setShowAttach(false)} maxWidth={460}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button type="button" onClick={() => setAttachTab('upload')} style={tabStyle(attachTab === 'upload')}>Upload novo</button>
            <button type="button" onClick={() => setAttachTab('repo')} style={tabStyle(attachTab === 'repo')}>Do repositório</button>
          </div>
          {attachTab === 'upload' ? (
            <form onSubmit={uploadAttachment}>
              <div onClick={() => attachRef.current?.click()} style={{ border: `2px dashed ${attachFile ? 'var(--success)' : 'var(--border)'}`, borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', background: attachFile ? 'var(--success-bg)' : 'var(--bg)', marginBottom: 16 }}>
                <input ref={attachRef} type="file" style={{ display: 'none' }} onChange={e => setAttachFile(e.target.files[0])} />
                <Upload size={22} style={{ color: attachFile ? 'var(--success)' : 'var(--text-4)', marginBottom: 8 }} />
                <p style={{ fontSize: 13.5, fontWeight: 600, color: attachFile ? 'var(--success-dark)' : 'var(--text-2)' }}>{attachFile ? attachFile.name : 'Clique para escolher um arquivo'}</p>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAttach(false)} disabled={attaching}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={attaching || !attachFile}>{attaching ? 'Enviando...' : 'Anexar'}</button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
              {mediaList.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-4)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>Nenhum arquivo no repositório</p>
              ) : mediaList.map(m => {
                const jaAnexado = (selectedTask.attachments || []).some(a => a.mediaId === m.id);
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', borderRadius: 10, padding: '9px 12px' }}>
                    {m.thumbnailUrl
                      ? <img src={m.thumbnailUrl} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={16} style={{ color: 'var(--text-4)' }} /></div>}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }} title={m.name}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{m.folderName || 'Geral'}</div>
                    </div>
                    <button className="btn btn-soft btn-sm" disabled={jaAnexado} onClick={() => linkAttachment(m.id)}>
                      {jaAnexado ? 'Anexado' : 'Vincular'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
