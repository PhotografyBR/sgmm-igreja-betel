import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const ROLES = {
  admin: {
    label: 'Líder de Mídias', color: '#7C3AED', bg: '#EDE9FE', icon: '👑',
    permissions: ['Acesso total ao sistema', 'Gerenciar usuários e acessos', 'Criar e editar escalas', 'Gerenciar tarefas', 'Acesso total ao repositório']
  },
  editor: {
    label: 'Editor de Conteúdo', color: '#DB2777', bg: '#FCE7F3', icon: '🎬',
    permissions: ['Acesso total ao repositório de mídia', 'Upload e exclusão de arquivos', 'Ver todos os arquivos de todos os eventos', 'Sem acesso a escalas ou usuários']
  },
  secretaria: {
    label: 'Secretaria', color: '#0891B2', bg: '#CFFAFE', icon: '📋',
    permissions: ['Criar e editar escalas', 'Gerenciar tarefas', 'Ver lista de voluntários', 'Acesso ao repositório dos eventos que participou']
  },
  voluntario: {
    label: 'Voluntário', color: '#059669', bg: '#D1FAE5', icon: '🙋',
    permissions: ['Ver próprias escalas', 'Confirmar ou recusar presença', 'Upload de arquivos nos eventos em que foi escalado']
  }
};

function RoleBadge({ role }) {
  const meta = ROLES[role] || ROLES.voluntario;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: meta.bg, color: meta.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      {meta.icon} {meta.label}
    </span>
  );
}

function Avatar({ name, role, size = 40 }) {
  const meta = ROLES[role] || ROLES.voluntario;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${meta.color}, ${meta.color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: size * 0.4, flexShrink: 0 }}>
      {name?.charAt(0).toUpperCase()}
    </div>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('todos');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'voluntario', phone: '' });

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch { toast.error('Erro ao carregar usuários'); }
    finally { setLoading(false); }
  }

  function openNew() {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'voluntario', phone: '' });
    setShowModal(true);
  }

  function openEdit(u) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '' });
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
      setShowModal(false);
      loadUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro ao salvar'); }
  }

  async function deleteUser(u) {
    if (u.id === currentUser?.id) { toast.error('Você não pode remover sua própria conta'); return; }
    if (!window.confirm(`Remover "${u.name}"? Esta ação não pode ser desfeita.`)) return;
    try { await api.delete(`/users/${u.id}`); toast.success('Usuário removido'); loadUsers(); }
    catch { toast.error('Erro ao remover'); }
  }

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'todos' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const byRole = Object.keys(ROLES).reduce((acc, r) => { acc[r] = filtered.filter(u => u.role === r); return acc; }, {});
  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E1B4B' }}>Usuários</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 2 }}>{users.length} {users.length === 1 ? 'membro cadastrado' : 'membros cadastrados'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowPermissions(true)} style={{ background: 'white', color: '#7C3AED', border: '1.5px solid #7C3AED', borderRadius: 10, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Ver permissões</button>
          {currentUser?.role === 'admin' && (
            <button onClick={openNew} style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>+ Novo membro</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input type="text" placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: 200 }} />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ ...inputStyle, width: 'auto', background: 'white' }}>
          <option value="todos">Todos os perfis</option>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? <p style={{ color: '#9CA3AF' }}>Carregando...</p> : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}><p style={{ fontSize: 32, marginBottom: 8 }}>🔍</p><p>Nenhum usuário encontrado</p></div>
      ) : (
        Object.entries(ROLES).map(([role, meta]) => byRole[role].length > 0 && (
          <div key={role} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>{meta.icon}</span>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{meta.label}</h2>
              <span style={{ background: meta.bg, color: meta.color, borderRadius: 10, padding: '1px 8px', fontSize: 12, fontWeight: 600 }}>{byRole[role].length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
              {byRole[role].map(u => (
                <div key={u.id} style={{ background: 'white', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12, border: u.id === currentUser?.id ? `2px solid ${meta.color}` : '2px solid transparent', position: 'relative' }}>
                  {u.id === currentUser?.id && <span style={{ position: 'absolute', top: -8, right: 10, background: meta.color, color: 'white', borderRadius: 10, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>Você</span>}
                  <Avatar name={u.name} role={u.role} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                    <p style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                    {u.phone && <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{u.phone}</p>}
                  </div>
                  {currentUser?.role === 'admin' && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => openEdit(u)} style={{ background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}>Editar</button>
                      {u.id !== currentUser?.id && <button onClick={() => deleteUser(u)} style={{ background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 6, padding: '5px 8px', fontSize: 12, cursor: 'pointer' }}>✕</button>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460 }} className="fade-in">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: '#1E1B4B' }}>{editing ? 'Editar membro' : 'Novo membro'}</h2>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>{editing ? 'Atualize os dados do membro.' : 'Preencha os dados para criar o acesso.'}</p>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Nome completo *</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Email *</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{editing ? 'Nova senha (deixe vazio para manter)' : 'Senha *'}</label><input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required={!editing} style={inputStyle} /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Telefone</label><input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} /></div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Nível de acesso *</label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{ ...inputStyle, background: 'white' }}>
                    {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                  <div style={{ marginTop: 8, padding: '8px 12px', background: ROLES[form.role]?.bg, borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: ROLES[form.role]?.color, fontWeight: 600, marginBottom: 4 }}>Permissões:</p>
                    {ROLES[form.role]?.permissions.map((p, i) => <p key={i} style={{ fontSize: 11, color: ROLES[form.role]?.color, opacity: 0.85 }}>• {p}</p>)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: 'white', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button type="submit" style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{editing ? 'Salvar' : 'Criar membro'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPermissions && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1E1B4B' }}>Níveis de acesso</h2>
              <button onClick={() => setShowPermissions(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {Object.entries(ROLES).map(([role, meta]) => (
                <div key={role} style={{ border: `1.5px solid ${meta.bg}`, borderRadius: 12, padding: '14px 16px', background: meta.bg + '55' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{meta.icon}</span>
                    <span style={{ fontWeight: 700, color: meta.color, fontSize: 15 }}>{meta.label}</span>
                    <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>{users.filter(u => u.role === role).length} membro(s)</span>
                  </div>
                  {meta.permissions.map((p, i) => <p key={i} style={{ fontSize: 12, color: '#4B5563' }}><span style={{ color: meta.color, fontWeight: 700 }}>✓</span> {p}</p>)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
