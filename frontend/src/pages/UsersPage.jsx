import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, Trash2, Search, Shield } from 'lucide-react';
import { PageHeader, Modal, Field, EmptyState, Avatar } from '../components/ui';

const ROLES = {
  admin: {
    label: 'Líder de Mídias', color: '#6D28D9', bg: '#EDE9FE', icon: '👑',
    permissions: ['Acesso total ao sistema', 'Gerenciar usuários e acessos', 'Criar e editar escalas', 'Gerenciar tarefas', 'Fazer backup dos dados']
  },
  secretaria: {
    label: 'Secretaria', color: '#0891B2', bg: '#CFFAFE', icon: '📋',
    permissions: ['Criar e editar escalas', 'Gerenciar tarefas', 'Ver lista de voluntários', 'Sem acesso a usuários']
  },
  voluntario: {
    label: 'Voluntário', color: '#059669', bg: '#D1FAE5', icon: '🙋',
    permissions: ['Ver próprias escalas', 'Confirmar ou recusar presença', 'Ver próprias tarefas', 'Acessar repositório de mídia']
  }
};

const INP = {
  width: '100%', padding: '10px 13px', borderRadius: 10,
  border: '1px solid var(--border-soft)', fontSize: 14, outline: 'none',
  background: 'var(--bg-card)', fontFamily: 'inherit', color: 'var(--text)',
  boxSizing: 'border-box', transition: 'border-color .16s'
};

export default function UsersPage() {
  const { user: currentUser, canManageUsers, canManageGroups } = useAuth();
  const [users, setUsers]               = useState([]);
  const [groups, setGroups]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [editing, setEditing]           = useState(null);
  const [search, setSearch]             = useState('');
  const [filterRole, setFilterRole]     = useState('todos');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'voluntario', phone: '', groupId: '' });

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
      if (canManageGroups) {
        try { const g = await api.get('/groups'); setGroups(g.data); } catch { /* sem grupos */ }
      }
    } catch { toast.error('Erro ao carregar usuários'); }
    finally { setLoading(false); }
  }

  function openNew() {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'voluntario', phone: '', groupId: '' });
    setShowModal(true);
  }

  function openEdit(u) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', groupId: u.groupId || '' });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editing) {
        await api.put(`/users/${editing.id}`, payload);
        toast.success('Usuário atualizado!');
      } else {
        await api.post('/users', payload);
        toast.success('Usuário criado!');
      }
      setShowModal(false); loadUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro ao salvar'); }
  }

  async function deleteUser(u) {
    if (u.id === currentUser?.id) return toast.error('Você não pode remover sua própria conta');
    if (!window.confirm(`Remover "${u.name}" do sistema?`)) return;
    try { await api.delete(`/users/${u.id}`); toast.success('Usuário removido'); loadUsers(); }
    catch { toast.error('Erro ao remover'); }
  }

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = filterRole === 'todos' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const byRole = Object.keys(ROLES).reduce((acc, r) => {
    acc[r] = filtered.filter(u => u.role === r);
    return acc;
  }, {});

  function groupName(id) {
    return groups.find(g => g.id === id)?.name;
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Usuários"
        subtitle={`${users.length} membro${users.length !== 1 ? 's' : ''} cadastrado${users.length !== 1 ? 's' : ''}`}
        actions={<>
          <button className="btn btn-secondary" onClick={() => setShowPermissions(true)}>
            <Shield size={15} /> Permissões
          </button>
          {canManageUsers && (
            <button className="btn btn-primary" onClick={openNew}>
              <Plus size={16} /> Novo membro
            </button>
          )}
        </>}
      />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
          <input
            type="text" placeholder="Buscar por nome ou email..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...INP, paddingLeft: 38 }}
          />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          style={{ ...INP, width: 'auto', minWidth: 180 }}>
          <option value="todos">Todos os perfis</option>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 12 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="Nenhum usuário encontrado" description="Tente ajustar os filtros de busca." />
      ) : (
        Object.entries(ROLES).map(([role, meta]) =>
          byRole[role].length > 0 && (
            <div key={role} style={{ marginBottom: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 17 }}>{meta.icon}</span>
                <h2 style={{ fontSize: 13, fontWeight: 800, color: meta.color, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {meta.label}
                </h2>
                <span style={{ background: meta.bg, color: meta.color, borderRadius: 999, padding: '1px 9px', fontSize: 12, fontWeight: 700 }}>
                  {byRole[role].length}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 10 }}>
                {byRole[role].map(u => (
                  <div key={u.id} className="card card-hover" style={{
                    display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px',
                    border: u.id === currentUser?.id ? `2px solid ${meta.color}` : '1px solid var(--border)',
                    position: 'relative'
                  }}>
                    {u.id === currentUser?.id && (
                      <span style={{
                        position: 'absolute', top: -9, right: 10,
                        background: meta.color, color: 'white', borderRadius: 999, padding: '2px 10px', fontSize: 10, fontWeight: 800
                      }}>Você</span>
                    )}
                    <Avatar name={u.name} size={44} color={meta.color} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }} className="truncate">{u.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)' }} className="truncate">{u.email}</p>
                      {u.groupId && groupName(u.groupId) && (
                        <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--primary-fade)', color: 'var(--primary-light)' }}>
                          {groupName(u.groupId)}
                        </span>
                      )}
                      {u.phone && <p style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 1 }}>{u.phone}</p>}
                    </div>
                    {canManageUsers && (
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(u)}><Edit2 size={14} /></button>
                        {u.id !== currentUser?.id && (
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteUser(u)}><Trash2 size={14} /></button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        )
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <Modal
          title={editing ? 'Editar membro' : 'Novo membro'}
          subtitle={editing ? 'Atualize os dados do membro abaixo.' : 'Preencha os dados para criar o acesso.'}
          onClose={() => setShowModal(false)}
          maxWidth={460}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Nome completo *">
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required style={INP} placeholder="Ex: João da Silva" />
              </Field>
              <Field label="Email *">
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required style={INP} placeholder="email@exemplo.com" />
              </Field>
              <Field label={editing ? 'Nova senha (deixe vazio para manter)' : 'Senha *'}>
                <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required={!editing} style={INP} placeholder="Mínimo 6 caracteres" />
              </Field>
              <Field label="Telefone">
                <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={INP} placeholder="(00) 00000-0000" />
              </Field>
              <Field label="Nível de acesso *">
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={INP}>
                  {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
                {form.role && !form.groupId && (
                  <div style={{ marginTop: 8, padding: '10px 13px', background: ROLES[form.role]?.bg + '99', borderRadius: 9 }}>
                    <p style={{ fontSize: 12, color: ROLES[form.role]?.color, fontWeight: 700, marginBottom: 4 }}>Permissões:</p>
                    {ROLES[form.role]?.permissions.map((p, i) => (
                      <p key={i} style={{ fontSize: 12, color: ROLES[form.role]?.color, opacity: 0.85, marginBottom: 2 }}>• {p}</p>
                    ))}
                  </div>
                )}
              </Field>

              {canManageGroups && groups.length > 0 && (
                <Field label="Grupo de acesso (opcional)">
                  <select value={form.groupId} onChange={e => setForm(p => ({ ...p, groupId: e.target.value }))} style={INP}>
                    <option value="">Usar permissões padrão do perfil</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  {form.groupId && (
                    <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 6 }}>
                      Quando em um grupo, as permissões vêm do grupo e substituem as do perfil.
                    </p>
                  )}
                </Field>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Salvar alterações' : 'Criar membro'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal permissões */}
      {showPermissions && (
        <Modal title="Níveis de acesso" onClose={() => setShowPermissions(false)} maxWidth={520}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Object.entries(ROLES).map(([role, meta]) => (
              <div key={role} style={{ border: `1.5px solid ${meta.bg}`, borderRadius: 12, padding: '14px 16px', background: meta.bg + '44' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{meta.icon}</span>
                  <span style={{ fontWeight: 800, color: meta.color, fontSize: 15 }}>{meta.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-4)', marginLeft: 'auto' }}>
                    {users.filter(u => u.role === role).length} membro(s)
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {meta.permissions.map((p, i) => (
                    <p key={i} style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: meta.color, fontWeight: 800 }}>✓</span> {p}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {canManageGroups && (
              <p style={{ fontSize: 12.5, color: 'var(--text-4)', textAlign: 'center', marginTop: 4 }}>
                Precisa de algo sob medida? Crie grupos personalizados na aba <strong style={{ color: 'var(--primary-light)' }}>Grupos</strong>.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
