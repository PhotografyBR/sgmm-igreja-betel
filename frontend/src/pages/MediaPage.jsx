import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Upload, Image, Film, FileText, FolderOpen, ExternalLink, Trash2, X, Star } from 'lucide-react';
import { PageHeader, Card, Badge, Modal, Field, EmptyState } from '../components/ui';

const TYPE_META = {
  foto:      { icon: Image,    color: '#3B82F6', soft: '#DBEAFE', label: 'FOTO' },
  video:     { icon: Film,     color: '#6D28D9', soft: '#EDE9FE', label: 'VÍDEO' },
  documento: { icon: FileText, color: '#22C55E', soft: '#DCFCE7', label: 'DOC' }
};

function formatSize(bytes) {
  if (!bytes) return '';
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
  const [selectedFiles, setSelectedFiles]   = useState([]);
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
      // Filtro por tipo no cliente (a API nao filtra por type no GET base)
      let lista = mediaRes.data;
      if (filterType) lista = lista.filter(m => m.type === filterType);
      setMedia(lista);
      setSchedules(schedRes.data);
    } catch { toast.error('Erro ao carregar arquivos'); }
    finally { setLoading(false); }
  }

  function addFiles(fileList) {
    const novos = Array.from(fileList || []);
    if (!novos.length) return;
    setSelectedFiles(prev => {
      const nomes = new Set(prev.map(f => f.name + f.size));
      const filtrados = novos.filter(f => !nomes.has(f.name + f.size));
      return [...prev, ...filtrados];
    });
  }

  function removeFile(idx) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFiles.length) return toast.error('Selecione ao menos um arquivo');
    const formData = new FormData();
    selectedFiles.forEach(f => formData.append('files', f));
    if (uploadForm.scheduleId) formData.append('scheduleId', uploadForm.scheduleId);
    if (uploadForm.description) formData.append('description', uploadForm.description);
    setUploading(true);
    try {
      const res = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: ev => setUploadProgress(Math.round((ev.loaded * 100) / ev.total))
      });
      const enviados = res.data?.enviados?.length ?? selectedFiles.length;
      const falhas = res.data?.falhas?.length ?? 0;
      toast.success(`${enviados} arquivo${enviados !== 1 ? 's' : ''} enviado${enviados !== 1 ? 's' : ''}!`);
      if (falhas) toast.error(`${falhas} arquivo(s) falharam no envio`);
      setShowUpload(false); setSelectedFiles([]);
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

  async function togglePermanent(item) {
    try {
      const res = await api.patch(`/media/${item.id}/permanent`, { permanent: !item.permanent });
      setMedia(prev => prev.map(m => m.id === item.id ? { ...m, permanent: res.data.permanent } : m));
      toast.success(res.data.permanent ? 'Marcado como permanente' : 'Permanente removido');
    } catch { toast.error('Erro ao atualizar'); }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
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
            <Upload size={16} /> Upload de arquivos
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
                  <div key={f.id} className="card card-hover" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
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
                      {f.permanent && (
                        <span title="Arquivo permanente" style={{
                          position: 'absolute', top: 8, left: 8,
                          background: '#F59E0B', color: 'white',
                          fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: 6,
                          display: 'inline-flex', alignItems: 'center', gap: 3
                        }}>
                          <Star size={10} fill="white" /> FIXO
                        </span>
                      )}
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
                          <button
                            className="btn btn-soft btn-sm btn-icon"
                            onClick={() => togglePermanent(f)}
                            title={f.permanent ? 'Remover permanente' : 'Marcar como permanente'}
                            style={{ color: f.permanent ? '#F59E0B' : 'var(--text-4)' }}
                          >
                            <Star size={13} fill={f.permanent ? '#F59E0B' : 'none'} />
                          </button>
                        )}
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
        <Modal title="Upload de arquivos" onClose={() => setShowUpload(false)} maxWidth={480}>
          <form onSubmit={handleUpload}>
            {/* Área de drop */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragActive ? 'var(--primary-light)' : selectedFiles.length ? 'var(--success)' : 'var(--border)'}`,
                borderRadius: 14, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                background: dragActive ? 'var(--primary-fade)' : selectedFiles.length ? 'var(--success-bg)' : 'var(--bg)',
                transition: 'all .16s', marginBottom: 14
              }}
            >
              <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
                accept="image/*,video/*,.raw,.cr2,.arw,.pdf,.doc,.docx"
                onChange={e => addFiles(e.target.files)} />
              <div style={{
                width: 52, height: 52, borderRadius: 14, margin: '0 auto 12px',
                background: selectedFiles.length ? 'var(--success-bg)' : 'var(--border)',
                color: selectedFiles.length ? 'var(--success)' : 'var(--text-4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Upload size={24} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: selectedFiles.length ? 'var(--success-dark)' : 'var(--text-2)', marginBottom: 4 }}>
                {selectedFiles.length ? `${selectedFiles.length} arquivo${selectedFiles.length !== 1 ? 's' : ''} selecionado${selectedFiles.length !== 1 ? 's' : ''}` : 'Clique ou arraste os arquivos aqui'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-4)' }}>
                Pode selecionar vários · Fotos, vídeos ou documentos
              </p>
            </div>

            {/* Lista de arquivos selecionados */}
            {selectedFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, maxHeight: 180, overflowY: 'auto' }}>
                {selectedFiles.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--bg)', borderRadius: 9, padding: '8px 11px', gap: 8
                  }}>
                    <span className="truncate" style={{ fontSize: 12.5, color: 'var(--text-2)', flex: 1 }} title={f.name}>{f.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-4)', flexShrink: 0 }}>{formatSize(f.size)}</span>
                    {!uploading && (
                      <button type="button" onClick={() => removeFile(i)} className="btn btn-ghost btn-icon btn-sm" style={{ flexShrink: 0 }} title="Remover da lista">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

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
              <button type="submit" className="btn btn-primary" disabled={uploading || !selectedFiles.length}>
                <Upload size={15} /> {uploading ? 'Enviando...' : `Enviar ${selectedFiles.length || ''} arquivo${selectedFiles.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
