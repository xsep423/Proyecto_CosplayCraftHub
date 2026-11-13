import { useEffect, useRef, useState } from 'react';
import { Camera, Edit2, ImagePlus, Star, Trash2, Upload } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Input, Select } from '../ui/Input';
import Lightbox from './Lightbox';
import { api, apiUpload, mediaUrl } from '../../services/api';
import { IMAGE_ACCEPT, imageForm } from '../../lib/images';
import { apiErrorMessage, formatDate } from '../../lib/projectLabels';
import type { PhotoStage, ProjectPhoto } from '../../types';

export const stageLabel: Record<PhotoStage, string> = {
  reference: 'Referencia',
  progress: 'Avance',
  final: 'Resultado final',
};

const stageStyle: Record<PhotoStage, string> = {
  reference: 'bg-info/80',
  progress: 'bg-warning/80',
  final: 'bg-success/80',
};

const MAX_PHOTOS = 40;

interface PhotoGalleryProps {
  projectId: number;
  canEdit: boolean;
  /** Se llama cuando cambian las fotos (para refrescar portada y contador del proyecto). */
  onChange?: () => void;
}

type Upload = { done: number; total: number; failed: number; errors: string[] };

export default function PhotoGallery({ projectId, canEdit, onChange }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<PhotoStage | ''>('');
  const [uploadStage, setUploadStage] = useState<PhotoStage>('progress');
  const [upload, setUpload] = useState<Upload | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [editing, setEditing] = useState<ProjectPhoto | null>(null);
  const [editForm, setEditForm] = useState({ caption: '', stage: 'progress' as PhotoStage, isCover: false });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleting, setDeleting] = useState<ProjectPhoto | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<ProjectPhoto[]>(`/projects/photos/?project=${projectId}`)
      .then(setPhotos)
      .catch(() => setError('No se pudieron cargar las fotos.'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const visible = filter ? photos.filter(p => p.stage === filter) : photos;
  const uploading = upload !== null && upload.done < upload.total;

  const uploadFiles = async (files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'));
    if (images.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    const batch = images.slice(0, Math.max(room, 0));
    const errors: string[] = [];
    let failed = 0;
    if (images.length > batch.length) {
      errors.push(`Solo caben ${MAX_PHOTOS} fotos por proyecto; ${images.length - batch.length} no se subieron.`);
    }
    if (batch.length === 0) {
      setUpload({ done: 0, total: 0, failed: 0, errors });
      return;
    }

    setUpload({ done: 0, total: batch.length, failed: 0, errors });
    // De una en una: más estable en conexiones lentas y el servidor gratuito
    for (let i = 0; i < batch.length; i++) {
      try {
        const form = await imageForm(batch[i], { projectId: String(projectId), stage: uploadStage });
        const created = await apiUpload<ProjectPhoto>('/projects/photos/', form);
        setPhotos(ps => [...ps, created]);
      } catch (err) {
        failed++;
        errors.push(`${batch[i].name}: ${apiErrorMessage(err, 'no se pudo subir.')}`);
      }
      setUpload({ done: i + 1, total: batch.length, failed, errors: [...errors] });
    }
    onChange?.();
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    uploadFiles(files);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canEdit || uploading) return;
    uploadFiles(Array.from(e.dataTransfer.files));
  };

  const openEdit = (p: ProjectPhoto) => {
    setEditing(p);
    setEditForm({ caption: p.caption, stage: p.stage, isCover: p.isCover });
    setEditError('');
  };

  const applyUpdate = (updated: ProjectPhoto) => {
    setPhotos(ps => ps.map(p => {
      if (p.id === updated.id) return updated;
      return updated.isCover ? { ...p, isCover: false } : p;
    }));
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setEditError('');
    try {
      applyUpdate(await api<ProjectPhoto>(`/projects/photos/${editing.id}/`, {
        method: 'PATCH', body: JSON.stringify(editForm),
      }));
      setEditing(null);
      onChange?.();
    } catch (err) {
      setEditError(apiErrorMessage(err, 'No se pudieron guardar los cambios.'));
    } finally {
      setSaving(false);
    }
  };

  const makeCover = async (p: ProjectPhoto) => {
    setError('');
    try {
      applyUpdate(await api<ProjectPhoto>(`/projects/photos/${p.id}/`, {
        method: 'PATCH', body: JSON.stringify({ isCover: true }),
      }));
      onChange?.();
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo cambiar la portada.'));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await api(`/projects/photos/${deleting.id}/`, { method: 'DELETE' });
      setPhotos(ps => ps.filter(p => p.id !== deleting.id));
      setDeleting(null);
      onChange?.();
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo eliminar la foto.'));
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    reference: photos.filter(p => p.stage === 'reference').length,
    progress: photos.filter(p => p.stage === 'progress').length,
    final: photos.filter(p => p.stage === 'final').length,
  };

  return (
    <div
      className="p-5 space-y-4"
      onDragOver={e => { if (canEdit) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={e => { if (e.currentTarget === e.target) setDragOver(false); }}
      onDrop={onDrop}
    >
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text">Fotos del cosplay</h3>
          <p className="text-xs text-muted mt-0.5">
            Referencias, avances y resultado final · {photos.length} de {MAX_PHOTOS}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <select
              value={uploadStage}
              onChange={e => setUploadStage(e.target.value as PhotoStage)}
              className="bg-panel border border-border rounded-lg px-3 py-1.5 text-sm text-text outline-none focus:border-primary cursor-pointer"
              aria-label="Etapa de las fotos a subir"
            >
              {Object.entries(stageLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <Button
              variant="outline"
              size="sm"
              icon={<Upload size={14} />}
              onClick={() => fileInput.current?.click()}
              loading={uploading}
              disabled={photos.length >= MAX_PHOTOS}
            >
              Subir fotos
            </Button>
            <input ref={fileInput} type="file" accept={IMAGE_ACCEPT} multiple className="hidden" onChange={onPick} />
          </div>
        )}
      </div>

      {/* Filtros */}
      {photos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {([['', 'Todas', photos.length], ...Object.entries(stageLabel).map(([v, l]) => [v, l, counts[v as PhotoStage]])] as [string, string, number][])
            .map(([value, label, n]) => (
              <button
                key={value}
                onClick={() => setFilter(value as PhotoStage | '')}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  filter === value
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-panel border-border text-muted hover:text-text'
                }`}
              >
                {label} <span className="font-mono opacity-70">{n}</span>
              </button>
            ))}
        </div>
      )}

      {/* Progreso de subida */}
      {upload && (
        <div className="bg-panel border border-border rounded-lg px-4 py-3 space-y-2">
          {upload.total > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted whitespace-nowrap">
                {uploading ? `Subiendo ${upload.done + 1} de ${upload.total}…` : `Listo: ${upload.total - upload.failed} de ${upload.total} subida(s)`}
              </span>
              <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${(upload.done / upload.total) * 100}%` }} />
              </div>
              {!uploading && (
                <button onClick={() => setUpload(null)} className="text-xs text-muted hover:text-text">Cerrar</button>
              )}
            </div>
          )}
          {upload.errors.map(e => <p key={e} className="text-xs text-danger">{e}</p>)}
          {upload.total === 0 && (
            <button onClick={() => setUpload(null)} className="text-xs text-muted hover:text-text">Cerrar</button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Galería */}
      {loading ? (
        <p className="text-sm text-muted py-8 text-center">Cargando fotos…</p>
      ) : photos.length === 0 ? (
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => fileInput.current?.click()}
          className={`w-full rounded-xl border-2 border-dashed py-14 flex flex-col items-center gap-3 transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border'
          } ${canEdit ? 'hover:border-primary/50 cursor-pointer' : 'cursor-default'}`}
        >
          <div className="w-12 h-12 rounded-xl bg-panel flex items-center justify-center">
            <Camera size={22} className="text-muted" />
          </div>
          <p className="text-sm text-text font-medium">Aún no hay fotos de este cosplay</p>
          <p className="text-xs text-muted max-w-xs">
            {canEdit
              ? 'Arrastra aquí tus fotos o haz clic para elegirlas. JPG, PNG, WebP o GIF de hasta 10 MB.'
              : 'Cuando el equipo suba referencias o avances aparecerán aquí.'}
          </p>
        </button>
      ) : (
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 rounded-xl transition-colors ${
            dragOver ? 'outline-2 outline-dashed outline-primary outline-offset-4' : ''
          }`}
        >
          {visible.map((p, i) => (
            <figure key={p.id} className="group relative rounded-xl overflow-hidden border border-border bg-panel">
              <button
                type="button"
                onClick={() => setViewer(i)}
                className="block w-full aspect-square"
                aria-label={p.caption || 'Ver foto'}
              >
                <img
                  src={mediaUrl(p.image.thumbUrl)}
                  alt={p.caption}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
              <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
                <span className={`text-[10px] font-semibold text-white px-2 py-0.5 rounded-full ${stageStyle[p.stage]}`}>
                  {stageLabel[p.stage]}
                </span>
                {p.isCover && (
                  <span className="text-[10px] font-semibold text-white px-2 py-0.5 rounded-full bg-primary/90 flex items-center gap-1">
                    <Star size={10} fill="currentColor" /> Portada
                  </span>
                )}
              </div>
              {canEdit && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                  {!p.isCover && (
                    <button
                      onClick={() => makeCover(p)}
                      title="Usar como portada"
                      className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-primary transition-colors"
                    >
                      <Star size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(p)}
                    title="Editar"
                    className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => setDeleting(p)}
                    title="Eliminar"
                    className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-danger transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
              {p.caption && (
                <figcaption className="absolute inset-x-0 bottom-0 px-3 py-2 text-xs text-white bg-gradient-to-t from-black/80 to-transparent truncate pointer-events-none">
                  {p.caption}
                </figcaption>
              )}
            </figure>
          ))}
          {canEdit && filter === '' && photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted hover:text-text transition-colors"
            >
              <ImagePlus size={22} />
              <span className="text-xs">Agregar</span>
            </button>
          )}
          {visible.length === 0 && (
            <p className="col-span-full text-sm text-muted py-8 text-center">No hay fotos en esta etapa.</p>
          )}
        </div>
      )}

      <Lightbox
        items={visible.map(p => ({
          url: p.image.url,
          caption: p.caption,
          meta: [stageLabel[p.stage], p.uploadedBy, formatDate(p.createdAt)].filter(Boolean).join(' · '),
        }))}
        index={viewer}
        onChange={setViewer}
      />

      {/* Editar foto */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Editar foto"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} loading={saving}>Guardar</Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <img
              src={mediaUrl(editing.image.thumbUrl)}
              alt=""
              className="w-full max-h-64 object-contain rounded-lg bg-panel"
            />
            <Input
              label="Descripción"
              value={editForm.caption}
              maxLength={200}
              placeholder="Ej. Casco terminado antes de pintar"
              onChange={e => setEditForm(f => ({ ...f, caption: e.target.value }))}
            />
            <Select
              label="Etapa"
              value={editForm.stage}
              onChange={e => setEditForm(f => ({ ...f, stage: e.target.value as PhotoStage }))}
              options={Object.entries(stageLabel).map(([value, label]) => ({ value, label }))}
              hint={editForm.stage === 'reference' ? 'Las referencias nunca se muestran en el portafolio público.' : undefined}
            />
            <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.isCover}
                onChange={e => setEditForm(f => ({ ...f, isCover: e.target.checked }))}
                className="accent-primary"
              />
              Usar como portada del proyecto
            </label>
            {editError && <p className="text-sm text-danger">{editError}</p>}
          </div>
        )}
      </Modal>

      {/* Eliminar foto */}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Eliminar foto"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="danger" onClick={confirmDelete} loading={saving}>Eliminar</Button>
          </>
        }
      >
        <p className="text-sm text-muted">La foto se borrará definitivamente. Esta acción no se puede deshacer.</p>
      </Modal>
    </div>
  );
}
