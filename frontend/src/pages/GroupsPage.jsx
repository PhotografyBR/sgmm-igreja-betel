import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, ShieldCheck, Users as UsersIcon, Lock } from 'lucide-react';
import { PageHeader, Modal, Field, EmptyState } from '../components/ui';

const INP = {
  width: '100%', padding: '10px 13px', borderRadius: 10,
  border: '1px solid var(--border-soft)', fontSize: 14, outline: 'none',
  background: 'var(--bg-card)', fontFamily: 'inherit', color: 'var(--text)',
  boxSizing: 'border-box', transition: 'border-color .16s'
};

export default function GroupsPage() {
  const [groups, setGroups]   = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [g, c] = await Promise.all([
        api.get('/groups'),
        api.get('/groups/catalog'),
      ]);
      setGroups(g.data);
      setCatalog(c.data.permissions);
    } catch {
      toast.error('Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  }

  // agrupa o catálogo por área para exibir bonitinho
  const byArea = catalog.reduce((acc, p) => {
    (acc[p.area] = acc[p.area] || []).push(p);
    return acc;
  }, {});

  function openNew() {
    setEditing(null);
    setForm({ name: '', description: '', permissions: [] });
    setShowModal(true);
  }

  function openEdit(g) {
    setEditing(g);
    setForm({ name: g.name, description: g.description || '', permissions: [...(g.permissions || [])] });
    setShowModal(true);
  }

  function togglePerm(key) {
    setForm(p => ({
      ...p,
      permissions: p.permissions.includes(key)
        ? p.permissions.filter(k => k !== key)
        : [...p.permissions, key],
    }));
  }

  function toggleArea(area, perms) {
    const keys = perms.map(p => p.key);
    const allOn = keys.every(k => form.permissions.includes(k));
    setForm(p => ({
      ...p,
      permissions: allOn
        ? p.permissions.filter(k => !keys.includes(k))
        : [...new Set([...p.permissions, ...keys])],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Dê um nome ao grupo');
    try {
      if (editing) {
        await api.put(`/groups/${editing.id}`, form);
        toast.success('Grupo atualizado!');
      } else {
        await api.post('/groups', form);
        toast.success('Grupo criado!');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar grupo');
    }
  }

  async function remove(g) {
    if (!window.confirm(`Remover o grupo "${g.name}"? Os membros voltam ao nível padrão do perfil.`)) return;
    try {
      await api.delete(`/groups/${g.id}`);
      toast.success('Grupo removido');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao remover');
    }
  }

  function labelFor(key) {
    return catalog.find(p => p.key === key)?.label || key;
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Grupos de acesso"
        subtitle="Crie níveis de acesso e escolha o que cada grupo pode ver e fazer"
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Novo grupo
          </button>
        }
      />

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhum grupo criado ainda"
          description="Crie grupos para liberar acessos sob medida, sem depender de perfis fixos."
          action={<button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Criar primeiro grupo</button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 14 }}>
          {groups.map(g => (
            <div key={g.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: 'var(--primary-fade)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ShieldCheck size={20} color="var(--primary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }} className="truncate">{g.name}</p>
                  {g.description && <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>{g.description}</p>}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(g)}><Edit2 size={14} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => remove(g)}><Trash2 size={14} /></button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: 'var(--text-4)', fontSize: 12 }}>
                <UsersIcon size={13} /> {g.memberCount} membro{g.memberCount !== 1 ? 's' : ''}
                <span style={{ margin: '0 4px' }}>·</span>
                <Lock size={13} /> {g.permissions?.length || 0} permiss{(g.permissions?.length || 0) === 1 ? 'ão' : 'ões'}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {(g.permissions || []).slice(0, 4).map(k => (
                  <span key={k} style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
                    background: 'var(--bg-hover)', color: 'var(--text-3)',
                  }}>{labelFor(k)}</span>
                ))}
                {(g.permissions?.length || 0) > 4 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: 'var(--primary-fade)', color: 'var(--primary-light)' }}>
                    +{g.permissions.length - 4}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? 'Editar grupo' : 'Novo grupo'}
          subtitle="Marque o que esse grupo pode acessar"
          onClose={() => setShowModal(false)}
          maxWidth={560}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Nome do grupo *">
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required style={INP} placeholder="Ex: Equipe de Transmissão" />
              </Field>
              <Field label="Descrição">
                <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={INP} placeholder="Para que serve este grupo" />
              </Field>

              <div>
                <label className="field-label" style={{ marginBottom: 10 }}>Permissões</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Object.entries(byArea).map(([area, perms]) => {
                    const keys = perms.map(p => p.key);
                    const allOn = keys.every(k => form.permissions.includes(k));
                    const someOn = keys.some(k => form.permissions.includes(k));
                    return (
                      <div key={area} style={{
                        border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px',
                        background: someOn ? 'var(--primary-fade)' : 'var(--bg-card)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{area}</span>
                          <button type="button" onClick={() => toggleArea(area, perms)} style={{
                            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            fontSize: 11, fontWeight: 700, color: allOn ? 'var(--danger)' : 'var(--primary-light)',
                          }}>
                            {allOn ? 'Desmarcar' : 'Marcar tudo'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {perms.map(p => {
                            const on = form.permissions.includes(p.key);
                            return (
                              <label key={p.key} style={{
                                display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
                                fontSize: 13, color: on ? 'var(--text)' : 'var(--text-3)',
                              }}>
                                <span onClick={() => togglePerm(p.key)} style={{
                                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                                  border: on ? 'none' : '1.5px solid var(--border-soft)',
                                  background: on ? 'var(--primary)' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: 'white', fontSize: 13, fontWeight: 800, transition: 'all .15s',
                                }}>{on ? '✓' : ''}</span>
                                <span onClick={() => togglePerm(p.key)}>{p.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Salvar grupo' : 'Criar grupo'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
