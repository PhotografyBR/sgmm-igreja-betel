import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function MediaPage() {
  const { isAdmin, isPastoral, isVoluntario } = useAuth();
  const [media, setMedia] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filterSchedule, setFilterSchedule] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ scheduleId: '', description: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef();

  useEffect(() => { loadData(); }, [filterSchedule, filterType]);

  async function loadData() {
    try {
      const params = {};
      if (filterSchedule) params.scheduleId = filterSchedule;
      if (filterType) params.type = filterType;

      const [mediaRes, schedRes] = await Promise.all([
        api.get('/media', { params }),
        api.get('/schedules')
      ]);
      setMedia(mediaRes.data);
      setSchedules(schedRes.data);
    } catch {
      toast.error('Erro ao carregar arquivos');
    } finally {
      setLoading(false);
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
        onUploadProgress: e => {
          setUploadProgress(Math.round((e.loaded * 100) / e.total));
        }
      });
      toast.success('Arquivo enviado com sucesso!');
      setShowUpload(false);
      setSelectedFile(null);
      setUploadForm({ scheduleId: '', description: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro no upload');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function deleteMedia(id) {
    if (!window.confirm('Remover este arquivo do sistema e do Drive?')) return;
    try {
      await api.delete(`/media/${id}`);
      toast.success('Arquivo removido');
      loadData();
    } catch {
      toast.error('Erro ao remover');
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const grouped = media.reduce((acc, m) => {
    const folder = m.folderName || 'Geral';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(m);
    return acc;
  }, {});

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1E1B4B' }}>Repositório de Mídia</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 2 }}>Fotos e vídeos dos cultos armazenados no Google Drive</p>
        </div>
        <button onClick={() => setShowUpload(true)} style={{
          background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
          color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px',
          fontSize: 14, fontWeight: 600, cursor: 'pointer'
        }}>
          Upload de arquivo
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select value={filterSchedule} onChange={e => setFilterSchedule(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, background: 'white', outline: 'none' }}>
          <option value="">Todos os cultos</option>
          {schedules.map(s => <option key={s.id} value={s.id}>{s.title} ({new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')})</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, background: 'white', outline: 'none' }}>
          <option value="">Todos os tipos</option>
          <option value="foto">Fotos</option>
          <option value="video">Vídeos</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#9CA3AF' }}>Carregando...</p>
      ) : media.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
          <p style={{ fontSize: 16 }}>Nenhum arquivo encontrado</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Faça upload de fotos e vídeos dos cultos</p>
        </div>
      ) : (
        Object.entries(grouped).map(([folder, files]) => (
          <div key={folder} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📂</span> {folder}
              <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 400 }}>({files.length} arquivo{files.length !== 1 ? 's' : ''})</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {files.map(f => (
                <div key={f.id} style={{
                  background: 'white', borderRadius: 12, overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  transition: 'box-shadow 0.15s'
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'}
                >
                  {/* Thumbnail */}
                  <div style={{
                    height: 120, background: '#F3F4F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', position: 'relative'
                  }}>
                    {f.thumbnailUrl ? (
                      <img src={f.thumbnailUrl} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 36 }}>{f.type === 'foto' ? '🖼' : '🎬'}</span>
                    )}
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      background: f.type === 'foto' ? '#3B82F6' : '#8B5CF6',
                      color: 'white', fontSize: 10, fontWeight: 700,
                      padding: '2px 6px', borderRadius: 4
                    }}>
                      {f.type === 'foto' ? 'FOTO' : 'VÍDEO'}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#1F2937', marginBottom: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={f.name}>
                      {f.name}
                    </p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>
                      {formatSize(f.size)} · {f.uploaderName}
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a href={f.driveUrl} target="_blank" rel="noreferrer" style={{
                        flex: 1, textAlign: 'center', padding: '5px', borderRadius: 6,
                        background: '#EDE9FE', color: '#7C3AED',
                        fontSize: 11, fontWeight: 600
                      }}>
                        Abrir
                      </a>
                      {isAdmin && (
                        <button onClick={() => deleteMedia(f.id)} style={{
                          padding: '5px 8px', borderRadius: 6, border: 'none',
                          background: '#FEE2E2', color: '#EF4444',
                          fontSize: 11, cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Modal upload */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460 }} className="fade-in">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#1E1B4B' }}>Upload de arquivo</h2>
            <form onSubmit={handleUpload}>
              {/* Área de drop */}
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed #D1D5DB', borderRadius: 12, padding: '30px 20px',
                  textAlign: 'center', cursor: 'pointer', marginBottom: 16,
                  background: selectedFile ? '#F0FDF4' : '#FAFAFA',
                  transition: 'border-color 0.2s'
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  style={{ display: 'none' }}
                  accept="image/*,video/*,.raw,.cr2,.arw"
                  onChange={e => setSelectedFile(e.target.files[0])}
                />
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  {selectedFile ? '✅' : '📤'}
                </div>
                <p style={{ fontSize: 14, color: '#6B7280' }}>
                  {selectedFile ? selectedFile.name : 'Clique para selecionar foto ou vídeo'}
                </p>
                {selectedFile && (
                  <p style={{ fontSize: 12, color: '#10B981', marginTop: 4 }}>
                    {formatSize(selectedFile.size)}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Culto relacionado (opcional)</label>
                <select value={uploadForm.scheduleId} onChange={e => setUploadForm(p => ({ ...p, scheduleId: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, background: 'white' }}>
                  <option value="">Arquivo geral</option>
                  {schedules.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Descrição</label>
                <input value={uploadForm.description} onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ex: Fotos da pregação (opcional)"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none' }} />
              </div>

              {uploading && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                    <span>Enviando para o Google Drive...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3 }}>
                    <div style={{ height: '100%', background: '#7C3AED', borderRadius: 3, width: `${uploadProgress}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowUpload(false)} disabled={uploading} style={{
                  padding: '9px 20px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: 'white', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit'
                }}>Cancelar</button>
                <button type="submit" disabled={uploading || !selectedFile} style={{
                  padding: '9px 24px', borderRadius: 8, border: 'none',
                  background: uploading ? '#A78BFA' : 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                  color: 'white', fontSize: 14, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
                }}>
                  {uploading ? 'Enviando...' : 'Enviar arquivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
