import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Camera, Mail, MapPin, Phone, Wand2, X } from 'lucide-react';
import Lightbox from '../components/media/Lightbox';
import { mediaUrl, publicApi } from '../services/api';
import type { PublicPortfolio as Portfolio } from '../types';

type PublicProject = Portfolio['projects'][number];

const stageLabel = { reference: 'Referencia', progress: 'Avance', final: 'Resultado final' } as const;

/** Página pública del taller: sin sesión, solo proyectos marcados como públicos. */
export default function PublicPortfolio() {
  const { slug } = useParams();
  const [data, setData] = useState<Portfolio | null>(null);
  const [missing, setMissing] = useState(false);
  const [open, setOpen] = useState<PublicProject | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [tag, setTag] = useState('');

  useEffect(() => {
    publicApi<Portfolio>(`/public/${slug}/`)
      .then(d => {
        setData(d);
        document.title = `${d.workshop.name} · Portafolio`;
      })
      .catch(() => setMissing(true));
    return () => { document.title = 'CosplayCraft Hub'; };
  }, [slug]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && viewer === null) setOpen(null); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, viewer]);

  if (missing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-panel flex items-center justify-center"><Wand2 className="text-muted" /></div>
        <h1 className="text-lg font-semibold text-text">Este portafolio no está disponible</h1>
        <p className="text-sm text-muted max-w-sm">El enlace no existe o el taller todavía no ha publicado su portafolio.</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const { workshop, projects } = data;
  const tags = Array.from(new Set(projects.flatMap(p => p.tags))).sort();
  const shown = tag ? projects.filter(p => p.tags.includes(tag)) : projects;

  return (
    <div className="min-h-screen bg-bg">
      {/* Encabezado */}
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-bg to-accent/15" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-surface border border-border shadow-xl overflow-hidden flex items-center justify-center flex-shrink-0">
            {workshop.logo
              ? <img src={mediaUrl(workshop.logo.thumbUrl)} alt={`Logo de ${workshop.name}`} className="w-full h-full object-contain p-2" />
              : <Wand2 size={36} className="text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold mb-1">Portafolio de cosplay</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-text">{workshop.name}</h1>
            {workshop.bio && <p className="text-sm text-muted mt-3 max-w-2xl whitespace-pre-line">{workshop.bio}</p>}
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-5 gap-y-2 mt-4 text-sm">
              {workshop.city && <span className="flex items-center gap-1.5 text-muted"><MapPin size={14} /> {workshop.city}</span>}
              {workshop.email && (
                <a href={`mailto:${workshop.email}`} className="flex items-center gap-1.5 text-text hover:text-primary"><Mail size={14} /> {workshop.email}</a>
              )}
              {workshop.phone && (
                <a href={`tel:${workshop.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 text-text hover:text-primary"><Phone size={14} /> {workshop.phone}</a>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {tags.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            {['', ...tags].map(t => (
              <button
                key={t || 'all'}
                onClick={() => setTag(t)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  tag === t ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-surface border-border text-muted hover:text-text'
                }`}
              >
                {t ? `#${t}` : 'Todos'}
              </button>
            ))}
          </div>
        )}

        {shown.length === 0 ? (
          <p className="text-center text-sm text-muted py-20">Pronto habrá trabajos publicados aquí.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shown.map(p => (
              <button
                key={p.id}
                onClick={() => setOpen(p)}
                className="group text-left bg-surface border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-colors"
              >
                <div className="aspect-[4/5] bg-panel overflow-hidden relative">
                  {p.cover ? (
                    <img
                      src={mediaUrl(p.cover.thumbUrl)}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted"><Camera size={32} /></div>
                  )}
                  {p.photos.length > 1 && (
                    <span className="absolute bottom-3 right-3 text-xs font-mono px-2 py-1 rounded-full bg-black/60 text-white flex items-center gap-1">
                      <Camera size={12} /> {p.photos.length}
                    </span>
                  )}
                  {!p.completed && (
                    <span className="absolute top-3 left-3 text-[11px] font-semibold px-2 py-1 rounded-full bg-warning/90 text-black">En proceso</span>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-base font-semibold text-text group-hover:text-primary transition-colors">{p.name}</h2>
                  {p.tags.length > 0 && (
                    <p className="text-xs text-muted mt-1 truncate">{p.tags.map(t => `#${t}`).join(' ')}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        {workshop.name} · Hecho con CosplayCraft Hub
      </footer>

      {/* Detalle de proyecto */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-bg/85 backdrop-blur-sm" onClick={() => setOpen(null)} />
          <div className="relative w-full max-w-4xl max-h-screen sm:max-h-[90vh] overflow-y-auto bg-surface border border-border sm:rounded-2xl shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 py-4 bg-surface/95 backdrop-blur border-b border-border">
              <h2 className="text-lg font-bold text-text truncate">{open.name}</h2>
              <button onClick={() => setOpen(null)} className="p-1.5 rounded-lg hover:bg-panel text-muted hover:text-text" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {open.description && <p className="text-sm text-muted whitespace-pre-line">{open.description}</p>}
              {open.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {open.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">#{t}</span>)}
                </div>
              )}
              {open.photos.length === 0 ? (
                <p className="text-sm text-muted">Sin fotos publicadas.</p>
              ) : (
                <div className="columns-2 sm:columns-3 gap-3 [&>*]:mb-3">
                  {open.photos.map((ph, i) => (
                    <button key={ph.id} onClick={() => setViewer(i)} className="block w-full rounded-xl overflow-hidden bg-panel break-inside-avoid">
                      <img
                        src={mediaUrl(ph.thumbUrl)}
                        alt={ph.caption || open.name}
                        loading="lazy"
                        className="w-full h-auto hover:opacity-90 transition-opacity"
                        style={ph.width && ph.height ? { aspectRatio: `${ph.width} / ${ph.height}` } : undefined}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Lightbox
            items={open.photos.map(ph => ({ url: ph.url, caption: ph.caption, meta: stageLabel[ph.stage] }))}
            index={viewer}
            onChange={setViewer}
          />
        </div>
      )}
    </div>
  );
}
