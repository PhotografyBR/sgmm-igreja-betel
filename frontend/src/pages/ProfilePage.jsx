import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Lock, Save, Eye, EyeOff, Clapperboard } from 'lucide-react';
import { PageHeader, Field } from '../components/ui';

const ROLE_META = {
  admin:      { label: 'Líder de Mídias', icon: '👑' },
  secretaria: { label: 'Secretaria',      icon: '📋' },
  voluntario: { label: 'Voluntário',      icon: '🙋' }
};

const INP = {
  width: '100%', padding: '10px 13px', borderRadius: 10,
  border: '1px solid var(--border-soft)', fontSize: 14, outline: 'none',
  background: 'var(--bg-card)', fontFamily: 'inherit', color: 'var(--text)',
  boxSizing: 'border-box', transition: 'border-color .16s, box-shadow .16s'
};

export default function ProfilePage() {
  const { user: currentUser, updateUser } = useAuth();
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState({ nova: false, conf: false });
  const [profile, setProfile]   = useState({ name: '', email: '', phone: '' });
  const [pwdForm, setPwdForm]   = useState({ newPassword: '', confirm: '' });
  const [stats, setStats]       = useState(null);

  useEffect(() => {
    if (currentUser) {
      setProfile({
        name:  currentUser.name  || '',
        email: currentUser.email || '',
        phone: currentUser.phone || ''
      });
      loadStats();
    }
  }, [currentUser?.id]);

  async function loadStats() {
    try {
      const hoje = new Date();
      const requests = [-1, 0, 1].map(offset => {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
        return api.get('/schedules', { params: { month: d.getMonth() + 1, year: d.getFullYear() } });
      });
      const results = await Promise.all(requests);
      const all = results.flatMap(r => r.data);
      const minhas = all.filter(s => s.assignments?.some(a => a.userId === currentUser?.id));
      const confirmadas = minhas.filter(s => s.assignments?.find(a => a.userId === currentUser?.id)?.status === 'confirmed');
      setStats({ total: minhas.length, confirmadas: confirmadas.length });
    } catch { /* silencioso */ }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put(`/users/${currentUser.id}`, {
        name: profile.name, email: profile.email, phone: profile.phone
      });
      if (updateUser) updateUser(res.data);
      toast.success('Perfil atualizado!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar perfil');
    } finally { setLoading(false); }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirm) return toast.error('As senhas não coincidem');
    if (pwdForm.newPassword.length < 6) return toast.error('Mínimo de 6 caracteres');
    setLoading(true);
    try {
      await api.put(`/users/${currentUser.id}`, { password: pwdForm.newPassword });
      toast.success('Senha alterada!');
      setPwdForm({ newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao alterar senha');
    } finally { setLoading(false); }
  }

  const rm = ROLE_META[currentUser?.role] || ROLE_META.voluntario;
  const initials = (currentUser?.name || '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="fade-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      <PageHeader title="Meu Perfil" subtitle="Gerencie suas informações pessoais e acesso." />

      {/* Hero card */}
      <div style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 24, boxShadow: 'var(--shadow)' }}>
        <div style={{
          height: 90,
          background: 'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 50%, #6D28D9 100%)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(255,255,255,0.12)', borderRadius: 12,
            padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 7
          }}>
            <Clapperboard size={14} color="white" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'white', opacity: 0.85 }}>Igreja Betel</span>
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '0 24px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, marginBottom: 16 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 26, fontWeight: 900, letterSpacing: -1,
              border: '4px solid white', marginTop: -30, flexShrink: 0,
              boxShadow: '0 4px 20px rgba(109,40,217,0.3)'
            }}>
              {initials || <User size={32} color="white" />}
            </div>
            <div style={{ paddingBottom: 4 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                {currentUser?.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{currentUser?.email}</span>
                <span style={{
                  background: '#EDE9FE', color: '#6D28D9',
                  borderRadius: 999, padding: '2px 11px', fontSize: 12, fontWeight: 700
                }}>{rm.icon} {rm.label}</span>
              </div>
            </div>
          </div>
          {stats && (
            <div style={{ display: 'flex', gap: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{stats.total}</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-4)', fontWeight: 500 }}>escalas (3 meses)</p>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#059669' }}>{stats.confirmadas}</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-4)', fontWeight: 500 }}>confirmadas</p>
              </div>
              {stats.total > 0 && (
                <>
                  <div style={{ width: 1, background: 'var(--border)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#D97706' }}>
                      {Math.round((stats.confirmadas / stats.total) * 100)}%
                    </p>
                    <p style={{ fontSize: 11.5, color: 'var(--text-4)', fontWeight: 500 }}>taxa de presença</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="card" style={{ padding: 24, marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={16} style={{ color: 'var(--primary)' }} /> Dados pessoais
        </h3>
        <form onSubmit={saveProfile}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Nome completo">
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
                <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  required placeholder="Seu nome completo" style={{ ...INP, paddingLeft: 38 }} />
              </div>
            </Field>
            <Field label="Email">
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
                <input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                  required placeholder="seu@email.com" style={{ ...INP, paddingLeft: 38 }} />
              </div>
            </Field>
            <Field label="Telefone (WhatsApp)">
              <div style={{ position: 'relative' }}>
                <Phone size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
                <input type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(00) 00000-0000" style={{ ...INP, paddingLeft: 38 }} />
              </div>
            </Field>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={15} /> {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>

      {/* Alterar senha */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={16} style={{ color: 'var(--primary)' }} /> Alterar senha
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 18 }}>
          Use uma senha com pelo menos 6 caracteres.
        </p>
        <form onSubmit={savePassword}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Nova senha">
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
                <input
                  type={showPwd.nova ? 'text' : 'password'}
                  value={pwdForm.newPassword}
                  onChange={e => setPwdForm(p => ({ ...p, newPassword: e.target.value }))}
                  required placeholder="••••••••"
                  style={{ ...INP, paddingLeft: 38, paddingRight: 42 }}
                />
                <button type="button" onClick={() => setShowPwd(p => ({ ...p, nova: !p.nova }))} style={{
                  position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', padding: 2
                }}>
                  {showPwd.nova ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>
            <Field label="Confirmar nova senha">
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
                <input
                  type={showPwd.conf ? 'text' : 'password'}
                  value={pwdForm.confirm}
                  onChange={e => setPwdForm(p => ({ ...p, confirm: e.target.value }))}
                  required placeholder="••••••••"
                  style={{ ...INP, paddingLeft: 38, paddingRight: 42 }}
                />
                <button type="button" onClick={() => setShowPwd(p => ({ ...p, conf: !p.conf }))} style={{
                  position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', padding: 2
                }}>
                  {showPwd.conf ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {pwdForm.confirm && pwdForm.newPassword !== pwdForm.confirm && (
                <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 5 }}>As senhas não coincidem</p>
              )}
            </Field>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="submit" className="btn btn-primary" disabled={loading || !pwdForm.newPassword || !pwdForm.confirm}>
              <Save size={15} /> {loading ? 'Salvando...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
