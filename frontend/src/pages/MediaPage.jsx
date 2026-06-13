import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Upload, Image, Film, FileText, FolderOpen, ExternalLink, Trash2, X } from 'lucide-react';
import { PageHeader, Card, Badge, Modal, Field, EmptyState } from '../components/ui';

const TYPE_META = {
  foto:      { icon: Image,    color: '#3B82F6', soft: '#DBEAFE', label: 'FOTO' },
  video:     { icon: Film,     color: '#6D28D9', soft: '#EDE9FE', label: 'VÍDEO' },
  documento: { icon: FileText, color: '#22C55E', soft: '#DCFCE7', label: 'DOC' }
};

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaPage() {
  const { isAdmin } = useAuth();
  const [media, setMedia]           = useState([]);
  const [schedules, setSchedules]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filterSchedule, setFilterSchedule] = useState('');
  const [filterType, setFilterType]         = useState('');
  const [showUpload, setShowUpload]         = useState(false);
  const [uploadForm, setUploadForm] = useState({ scheduleId: '', description: '' });
  const [selectedFile, setSelectedFile]     = useState(null);
  const [dragActive, setDragActive]         = useState(false);
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
    } catch { toast.error('Erro ao carregar arquivos'); }
    finally { setLoading(false); }
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
        onUploadProgress: ev => setUploadProgress(Math.round((ev.loaded * 100) / ev.total))
      });
      toast.success('Arquivo enviado com sucesso!');
      setShowUpload(false); setSelectedFile(null);
      setUploadForm({ scheduleId: '', description: '' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro no upload'); }
    finally { setUploading(false); setUploadProgress(0); }
  }

  async function deleteMedia(id) {
    if (!window.confirm('Remover este arquivo do sistema e do Drive?')) return;
    try { await api.delete(`/media/${id}`); toast.success('Arquivo removido'); loadData(); }
    catch { toast.error('Erro ao remover'); }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }

  const grouped = media.reduce((acc, m) => {
    const folder = m.folderName || 'Geral';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(m);
    return acc;
  }, {});

  const SEL = { padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border-soft)', fontSize: 13, background: 'var(--bg-card)', outline: 'none', fontFamily: 'inherit' };

  return (
    <div className="fade-in">
      <PageHeader
        title="Repositório de Mídia"
        subtitle={`${media.length} arquivo${media.length !== 1 ? 's' : ''} · Armazenados no Google Drive`}
        actions={
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            <Upload size={16} /> Upload de arquivo
          </button>
        }
      />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        <select value={filterSchedule} onChange={e => setFilterSchedule(e.target.value)} style={SEL}>
          <option value="">Todos os cultos</option>
          {schedules.map(s => (
            <option key={s.id} value={s.id}>
              {s.title} ({new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')})
            </option>
          ))}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={SEL}>
          <option value="">Todos os tipos</option>
          <option value="foto">Fotos</option>
          <option value="video">Vídeos</option>
          <option value="documento">Documentos</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 14 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />)}
        </div>
      ) : media.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nenhum arquivo encontrado"
          description="Faça upload de fotos e vídeos dos cultos para guardar aqui."
          action={<button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}><Upload size={14} /> Fazer upload</button>}
        />
      ) : (
        Object.entries(grouped).map(([folder, files]) => (
          <div key={folder} style={{ marginBottom: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <FolderOpen size={18} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{folder}</h2>
              <span style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 500 }}>
                {files.length} arquivo{files.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 14 }}>
              {files.map(f => {
                const meta = TYPE_META[f.type] || TYPE_META.documento;
                return (
                  <div key={f.id} className="card card-hover" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Thumbnail */}
                    <div style={{
                      height: 130, background: meta.soft,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', position: 'relative'
                    }}>
                      {f.thumbnailUrl ? (
                        <img src={f.thumbnailUrl} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <meta.icon size={42} style={{ color: meta.color, opacity: 0.7 }} />
                      )}
                      <span style={{
                        position: 'absolute', top: 8, right: 8,
                        background: meta.color, color: 'white',
                        fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: 6
                      }}>
                        {meta.label}
                      </span>
                    </div>
                    {/* Info */}
                    <div style={{ padding: '11px 13px' }}>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }} className="truncate" title={f.name}>
                        {f.name}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 10 }}>
                        {formatSize(f.size)} · {f.uploaderName}
                      </p>
                      <div style={{ display: 'flex', gap: 7 }}>
                        <a href={f.driveUrl} target="_blank" rel="noreferrer" className="btn btn-soft btn-sm" style={{ flex: 1, textAlign: 'center' }}>
                          <ExternalLink size={12} /> Abrir
                        </a>
                        {isAdmin && (
                          <button className="btn btn-danger-soft btn-sm btn-icon" onClick={() => deleteMedia(f.id)} title="Remover">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Modal Upload */}
      {showUpload && (
        <Modal title="Upload de arquivo" onClose={() => setShowUpload(false)} maxWidth={480}>
          <form onSubmit={handleUpload}>
            {/* Área de drop */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragActive ? 'var(--primary-light)' : selectedFile ? 'var(--success)' : 'var(--border)'}`,
                borderRadius: 14, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                background: dragActive ? 'var(--primary-fade)' : selectedFile ? 'var(--success-bg)' : 'var(--bg)',
                transition: 'all .16s', marginBottom: 18
              }}
            >
              <input ref={fileRef} type="file" style={{ display: 'none' }}
                accept="image/*,video/*,.raw,.cr2,.arw"
                onChange={e => setSelectedFile(e.target.files[0])} />
              <div style={{
                width: 52, height: 52, borderRadius: 14, margin: '0 auto 12px',
                background: selectedFile ? 'var(--success-bg)' : 'var(--border)',
                color: selectedFile ? 'var(--success)' : 'var(--text-4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {selectedFile ? <CheckCircleMini /> : <Upload size={24} />}
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: selectedFile ? 'var(--success-dark)' : 'var(--text-2)', marginBottom: 4 }}>
                {selectedFile ? selectedFile.name : 'Clique ou arraste o arquivo aqui'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-4)' }}>
                {selectedFile ? formatSize(selectedFile.size) : 'Fotos, vídeos ou documentos'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <Field label="Culto relacionado (opcional)">
                <select value={uploadForm.scheduleId} onChange={e => setUploadForm(p => ({ ...p, scheduleId: e.target.value }))}
                  style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1px solid var(--border-soft)', fontSize: 14, background: 'var(--bg-card)', outline: 'none' }}>
                  <option value="">Arquivo geral</option>
                  {schedules.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Descrição">
                <input value={uploadForm.description}
                  onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ex: Fotos da pregação (opcional)"
                  style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1px solid var(--border-soft)', fontSize: 14, outline: 'none' }} />
              </Field>
            </div>

            {uploading && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-3)', marginBottom: 6 }}>
                  <span>Enviando para o Google Drive...</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{uploadProgress}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%`, background: 'var(--primary)' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)} disabled={uploading}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={uploading || !selectedFile}>
                <Upload size={15} /> {uploading ? 'Enviando...' : 'Enviar arquivo'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function CheckCircleMini() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}
