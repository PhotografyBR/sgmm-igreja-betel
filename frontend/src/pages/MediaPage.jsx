import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function MediaPage() {
  const { user, isAdmin, isPastoral, isVoluntario } = useAuth();
  const canManage = isAdmin || isPastoral;
  const [media, setMedia] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [minhasEscalas, setMinhasEscalas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filterSchedule, setFilterSchedule] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ scheduleId: '', description: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef();

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadMedia(); }, [filterSchedule]);

  async function loadData() {
    try {
      const hoje = new Date();
      // Admin vê todos os cultos; voluntário só vê os que foi escalado
      const [mediaRes, schedRes] = await Promise.all([
        api.get('/media'),
        api.get('/schedules', { params: { month: hoje.getMonth() + 1, year: hoje.getFullYear() } })
      ]);
      setMedia(mediaRes.data);

      if (isVoluntario) {
        // Buscar últimos 6 meses de escalas do voluntário
        const requests = [-3,-2,-1,0,1,2].map(offset => {
          const d = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
          return api.get('/schedules', { params: { month: d.getMonth()+1, year: d.getFullYear() } });
        });
        const results = await Promise.all(requests);
        const all = results.flatMap(r => r.data);
        const minhas = all.filter(s => s.assignments?.some(a => a.userId === user?.id));
        const unique = Array.from(new Map(minhas.map(s => [s.id, s])).values());
        unique.sort((a,b) => new Date(b.date) - new Date(a.date));
        setMinhasEscalas(unique);
        setSchedules(unique);
      } else {
        // Admin/pastoral vê todos
        const allMonths = await Promise.all([-2,-1,0,1].map(offset => {
          const d = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
          return api.get('/schedules', { params: { month: d.getMonth()+1, year: d.getFullYear() } });
        }));
        const allSched = Array.from(new Map(allMonths.flatMap(r => r.data).map(s => [s.id, s])).values());
        allSched.sort((a,b) => new Date(b.date) - new Date(a.date));
        setSchedules(allSched);
      }
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  async function loadMedia() {
    try {
      const params = {};
      if (filterSchedule) params.scheduleId = filterSchedule;
      const res = await api.get('/media', { params });
      setMedia(res.data);
    } catch {
      toast.error('Erro ao carregar arquivos');
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile) return toast.error('Selecione um arquivo');
    const formData = new FormData();
    formData.append('file', selectedFile);
    if (uploadForm.scheduleId) formData.append('scheduleId', uploadForm.scheduleId);
    if (uploadForm.description) formData.append('description', uploadForm.description);
    setUploading(true);
    try {
      await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => setUploadProgress(Math.round((e.loaded * 100) / e.total))
      });
      toast.success('Arquivo enviado!');
      setShowUpload(false);
      setSelectedFile(null);
      setUploadForm({ scheduleId: '', description: '' });
      loadMedia();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro no upload');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover este arquivo do sistema e do Drive?')) return;
    try {
      await api.delete(`/media/${id}`);
      toast.success('Arquivo removido');
      loadMedia();
    } catch { toast.error('Erro ao remover'); }
  }

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(type, name) {
    if (type === 'foto') return '🖼️';
    if (type === 'video') return '🎬';
    if (/pdf/i.test(name)) return '📄';
    return '📎';
  }

  const grouped = media.reduce((acc, m) => {
    const folder = m.folderName || 'Geral';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(m);
    return acc;
  }, {});

  const selectStyle = { padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, background: 'white', outline: 'none', fontFamily: 'inherit' };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E1B4B' }}>Repositório</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 2 }}>
            {isVoluntario ? 'Arquivos dos eventos em que você participou' : 'Fotos, vídeos e documentos dos cultos'}
          </p>
        </div>
        <button onClick={() => setShowUpload(true)} style={{
          background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
          color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px',
          fontSize: 14, fontWeight: 600, cursor: 'pointer'
        }}>
          ⬆️ Enviar arquivo
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filterSchedule} onChange={e => setFilterSchedule(e.target.value)} style={selectStyle}>
          <option value="">Todos os eventos</option>
          {schedules.map(s => (
            <option key={s.id} value={s.id}>
              {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')} - {s.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>Carregando...</div>
      ) : media.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
          <p style={{ fontSize: 16 }}>Nenhum arquivo encontrado</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>
            {isVoluntario ? 'Envie fotos e vídeos dos cultos em que você participou' : 'Faça upload de fotos e vídeos dos cultos'}
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([folder, files]) => (
          <div key={folder} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📂</span> {folder}
              <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 400 }}>({files.length} arquivo{files.length !== 1 ? 's' : ''})</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {files.map(f => (
                <div key={f.id} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'}>
                  <div style={{ height: 110, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                    {f.thumbnailUrl ? (
                      <img src={f.thumbnailUrl} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 40 }}>{getFileIcon(f.type, f.name)}</span>
                    )}
                    <div style={{ position: 'absolute', top: 6, right: 6, background: f.type === 'foto' ? '#3B82F6' : f.type === 'video' ? '#8B5CF6' : '#10B981', color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                      {f.type?.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#1F2937', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name}>{f.name}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>{formatSize(f.size)} · {f.uploaderName}</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a href={f.driveUrl} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', padding: '5px', borderRadius: 6, background: '#EDE9FE', color: '#7C3AED', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                        Abrir
                      </a>
                      {canManage && (
                        <button onClick={() => handleDelete(f.id)} style={{ padding: '5px 8px', borderRadius: 6, border: 'none', background: '#FEE2E2', color: '#EF4444', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460 }} className="fade-in">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#1E1B4B' }}>Enviar arquivo</h2>
            <form onSubmit={handleUpload}>
              <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #D1D5DB', borderRadius: 12, padding: '30px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: selectedFile ? '#F0FDF4' : '#FAFAFA' }}>
                <input ref={fileRef} type="file" style={{ display: 'none' }} accept="image/*,video/*,.pdf,.doc,.docx,.raw,.cr2,.arw" onChange={e => setSelectedFile(e.target.files[0])} />
                <div style={{ fontSize: 32, marginBottom: 8 }}>{selectedFile ? '✅' : '📤'}</div>
                <p style={{ fontSize: 14, color: '#6B7280' }}>{selectedFile ? selectedFile.name : 'Clique para selecionar'}</p>
                {selectedFile && <p style={{ fontSize: 12, color: '#10B981', marginTop: 4 }}>{formatSize(selectedFile.size)}</p>}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                  {isVoluntario ? 'Evento em que você participou' : 'Evento relacionado (opcional)'}
                </label>
                <select value={uploadForm.scheduleId} onChange={e => setUploadForm(p => ({ ...p, scheduleId: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, background: 'white', fontFamily: 'inherit' }}>
                  <option value="">Arquivo geral</option>
                  {schedules.map(s => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')} - {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Descrição (opcional)</label>
                <input value={uploadForm.description} onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ex: Fotos da pregação"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              {uploading && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                    <span>Enviando para o Google Drive...</span><span>{uploadProgress}%</span>
                  </div>
                  <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3 }}>
                    <div style={{ height: '100%', background: '#7C3AED', borderRadius: 3, width: `${uploadProgress}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowUpload(false); setSelectedFile(null); }} disabled={uploading}
                  style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: 'white', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={uploading || !selectedFile}
                  style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: uploading ? '#A78BFA' : 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: 'white', fontSize: 14, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {uploading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
