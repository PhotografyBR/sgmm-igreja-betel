import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ROLES = {
  admin: { label: 'Líder de Mídias', color: '#7C3AED', bg: '#EDE9FE' },
  pastoral: { label: 'Pastoral', color: '#2563EB', bg: '#DBEAFE' },
  secretaria: { label: 'Secretaria', color: '#0891B2', bg: '#CFFAFE' },
  voluntario: { label: 'Voluntário', color: '#059669', bg: '#D1FAE5' }
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'voluntario', phone: '' });

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    }
  }

  async function deleteUser(id) {
    if (!window.confirm('Remover este usuário?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Usuário removido');
      loadUsers();
    } catch {
      toast.error('Erro ao remover');
    }
  }

  const byRole = Object.keys(ROLES).reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r);
    return acc;
  }, {});

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E1B4B' }}>Usuários</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 2 }}>Gerencie a equipe e seus acessos</p>
        </div>
        <button onClick={openNew} style={{
          background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
          color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px',
          fontSize: 14, fontWeight: 600, cursor: 'pointer'
        }}>
          + Novo usuário
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#9CA3AF' }}>Carregando...</p>
      ) : (
        Object.entries(ROLES).map(([role, meta]) => (
          byRole[role].length > 0 && (
            <div key={role} style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {meta.label} ({byRole[role].length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {byRole[role].map(u => (
                  <div key={u.id} style={{
                    background: 'white', borderRadius: 12, padding: '16px 18px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${meta.color}, ${meta.color}aa)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: 16, flexShrink: 0
                    }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', marginBottom: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.name}
                      </p>
                      <p style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => openEdit(u)} style={{
                        background: '#F3F4F6', border: 'none', borderRadius: 6,
                        padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit'
                      }}>
                        Editar
                      </button>
                      <button onClick={() => deleteUser(u.id)} style={{
                        background: '#FEE2E2', color: '#EF4444', border: 'none',
                        borderRadius: 6, padding: '5px 8px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit'
                      }}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }} className="fade-in">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#1E1B4B' }}>
              {editing ? 'Editar usuário' : 'Novo usuário'}
            </h2>
            <form onSubmit={handleSubmit}>
              {[
                { label: 'Nome completo', field: 'name', type: 'text', required: true },
                { label: 'Email', field: 'email', type: 'email', required: true },
                { label: editing ? 'Nova senha (deixe vazio para manter)' : 'Senha', field: 'password', type: 'password', required: !editing },
                { label: 'Telefone (opcional)', field: 'phone', type: 'tel' }
              ].map(({ label, field, type, required }) => (
                <div key={field} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
                  <input
                    type={type}
                    value={form[field]}
                    onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    required={required}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none' }}
                  />
                </div>
              ))}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Perfil de acesso</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, background: 'white' }}>
                  {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
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
                  {editing ? 'Salvar' : 'Criar usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
