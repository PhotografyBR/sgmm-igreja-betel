import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Clapperboard, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Email ou senha incorretos');
    } finally {
      setLoading(false);
    }
  }

  const INP = {
    width: '100%', padding: '11px 13px 11px 40px',
    border: '1.5px solid #E2E8F0', borderRadius: 11,
    fontSize: 14.5, outline: 'none', background: 'white',
    fontFamily: 'inherit', color: '#0F172A',
    transition: 'border-color .16s, box-shadow .16s'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #1E1B4B 0%, #4C1D95 45%, #6D28D9 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden'
    }}>
      {/* Círculos decorativos */}
      <div style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -120, right: -80, width: 450, height: 450, borderRadius: '50%', background: 'rgba(109,40,217,0.2)', pointerEvents: 'none' }} />

      <div className="fade-in-scale" style={{
        background: 'white', borderRadius: 22, padding: '42px 38px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 34 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 20,
            background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: '0 8px 24px rgba(109,40,217,0.4)'
          }}>
            <Clapperboard size={32} color="white" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1E1B4B', marginBottom: 4, letterSpacing: '-0.4px' }}>
            Ministério de Mídias
          </h1>
          <p style={{ color: '#64748B', fontSize: 14 }}>Igreja Betel · Faça seu login</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required style={INP}
                onFocus={e => { e.target.style.borderColor = '#8B5CF6'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.14)'; }}
                onBlur={e  => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* Senha */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type={showPwd ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                style={{ ...INP, paddingRight: 44 }}
                onFocus={e => { e.target.style.borderColor = '#8B5CF6'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.14)'; }}
                onBlur={e  => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2
              }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px',
            background: loading ? '#A78BFA' : 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            color: 'white', border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'opacity .2s, transform .16s',
            boxShadow: loading ? 'none' : '0 6px 20px rgba(109,40,217,0.35)'
          }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
          >
            {loading ? 'Entrando...' : 'Entrar no sistema'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 22 }}>
          Credenciais padrão: lider@igrejabetel.com / password
        </p>
      </div>
    </div>
  );
}
