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

export default function ProfilePage() {
  const { user } = useAuth();
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) {
      return toast.error('As senhas não coincidem');
    }
    if (passwords.newPassword.length < 6) {
      return toast.error('A nova senha precisa ter pelo menos 6 caracteres');
    }

    setLoading(true);
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
      setLoading(false);
    }
  }

  return (
    <div className="fade-in" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E1B4B', marginBottom: 24 }}>Meu Perfil</h1>

      {/* Dados do usuário */}
      <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: 'white', fontWeight: 700
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>{user?.name}</h2>
            <span style={{
              fontSize: 12, padding: '3px 10px', borderRadius: 20,
              background: '#EDE9FE', color: '#7C3AED', fontWeight: 600
            }}>
              {ROLE_LABELS[user?.role] || user?.role}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
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
      </div>

      {/* Alterar senha */}
      <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937', marginBottom: 16 }}>Alterar senha</h3>
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
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none' }}
              />
            </div>
          ))}
          <button type="submit" disabled={loading} style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: loading ? '#A78BFA' : 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            color: 'white', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
          }}>
            {loading ? 'Salvando...' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
