import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const ROLE_LABELS = {
  admin: 'Líder de Mídias',
  pastoral: 'Gestão/Pastoral',
  secretaria: 'Secretaria',
  voluntario: 'Voluntário'
};

const ROLE_COLORS = {
  admin: { color: '#7C3AED', bg: '#EDE9FE' },
  secretaria: { color: '#0891B2', bg: '#CFFAFE' },
  voluntario: { color: '#059669', bg: '#D1FAE5' },
  pastoral: { color: '#2563EB', bg: '#DBEAFE' }
};

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [editingProfile, setEditingProfile] = useState(false);
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  const roleStyle = ROLE_COLORS[user?.role] || ROLE_COLORS.voluntario;

  async function handleUpdateProfile(e) {
    e.preventDefault();
    if (!profile.name.trim()) return toast.error('O nome não pode ficar vazio');
    if (!profile.email.trim()) return toast.error('O email não pode ficar vazio');

    setLoadingProfile(true);
    try {
      const res = await api.put('/auth/update-profile', profile);
      updateUser(res.data);
      toast.success('Perfil atualizado!');
      setEditingProfile(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar perfil');
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) return toast.error('As senhas não coincidem');
    if (passwords.newPassword.length < 6) return toast.error('A nova senha precisa ter pelo menos 6 caracteres');

    setLoadingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      toast.success('Senha alterada com sucesso!');
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao alterar senha');
    } finally {
      setLoadingPassword(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box'
  };

  return (
    <div className="fade-in" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E1B4B', marginBottom: 24 }}>Meu Perfil</h1>

      {/* Dados do usuário */}
      <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: `linear-gradient(135deg, ${roleStyle.color}, ${roleStyle.color}99)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'white', fontWeight: 700, flexShrink: 0
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>{user?.name}</h2>
            <span style={{
              fontSize: 12, padding: '3px 10px', borderRadius: 20,
              background: roleStyle.bg, color: roleStyle.color, fontWeight: 600
            }}>
              {ROLE_LABELS[user?.role] || user?.role}
            </span>
          </div>
          {!editingProfile && (
            <button onClick={() => {
              setProfile({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
              setEditingProfile(true);
            }} style={{
              background: '#F3F4F6', border: 'none', borderRadius: 8,
              padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#374151'
            }}>
              Editar
            </button>
          )}
        </div>

        {editingProfile ? (
          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Nome completo</label>
                <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Email</label>
                <input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Telefone</label>
                <input type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} style={inputStyle} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={() => setEditingProfile(false)} style={{
                padding: '9px 18px', borderRadius: 8, border: '1.5px solid #E5E7EB',
                background: 'white', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit'
              }}>Cancelar</button>
              <button type="submit" disabled={loadingProfile} style={{
                padding: '9px 20px', borderRadius: 8, border: 'none',
                background: loadingProfile ? '#A78BFA' : 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                color: 'white', fontSize: 14, fontWeight: 600,
                cursor: loadingProfile ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
              }}>
                {loadingProfile ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gap: 0 }}>
            {[
              { label: 'Email', value: user?.email },
              { label: 'Telefone', value: user?.phone || 'Não informado' }
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: 13, color: '#6B7280' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1F2937' }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alterar senha */}
      <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937', marginBottom: 4 }}>Alterar senha</h3>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>Use uma senha com pelo menos 6 caracteres.</p>
        <form onSubmit={handleChangePassword}>
          {[
            { label: 'Senha atual', field: 'currentPassword' },
            { label: 'Nova senha', field: 'newPassword' },
            { label: 'Confirmar nova senha', field: 'confirm' }
          ].map(({ label, field }) => (
            <div key={field} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
              <input
                type="password"
                value={passwords[field]}
                onChange={e => setPasswords(p => ({ ...p, [field]: e.target.value }))}
                required
                style={inputStyle}
              />
            </div>
          ))}
          <button type="submit" disabled={loadingPassword} style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: loadingPassword ? '#A78BFA' : 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            color: 'white', fontSize: 14, fontWeight: 600,
            cursor: loadingPassword ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
          }}>
            {loadingPassword ? 'Salvando...' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
