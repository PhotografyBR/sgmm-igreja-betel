import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 50%, #7C3AED 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: '40px 36px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)'
      }} className="fade-in">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, margin: '0 auto 16px'
          }}>
            🎬
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E1B4B', marginBottom: 4 }}>
            Ministério de Mídias
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14 }}>Igreja Betel</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#7C3AED'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#7C3AED'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? '#A78BFA' : 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              color: 'white', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 20 }}>
          Credenciais padrão: lider@igrejabetel.com / password
        </p>
      </div>
    </div>
  );
}
