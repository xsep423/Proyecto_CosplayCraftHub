import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Printer } from 'lucide-react';
import { api, mediaUrl } from '../services/api';
import { formatDate } from '../lib/projectLabels';
import type { QuoteDocument, QuoteStatus } from '../types';

const statusLabel: Record<QuoteStatus, string> = {
  draft: 'Borrador', sent: 'Enviada', approved: 'Aprobada', rejected: 'Rechazada', invoiced: 'Facturada',
};

/**
 * Cotización en formato documento. "Descargar PDF" abre el diálogo de impresión
 * del navegador, donde se elige "Guardar como PDF". No necesita librerías y el
 * texto queda seleccionable en el PDF.
 */
export default function QuotePrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<QuoteDocument | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<QuoteDocument>(`/quotes/${id}/document/`)
      .then(d => {
        setDoc(d);
        // El nombre sugerido del PDF sale del título de la página
        document.title = `Cotización ${d.quote.number} - ${d.workshop.name}`;
      })
      .catch(() => setError('No se encontró la cotización o no pertenece a tu taller.'));
    return () => { document.title = 'CosplayCraft Hub'; };
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-text">{error}</p>
        <button onClick={() => navigate('/quotes')} className="text-sm text-primary hover:underline">Volver a cotizaciones</button>
      </div>
    );
  }
  if (!doc) return <p className="p-6 text-sm text-muted">Preparando documento…</p>;

  const { quote, workshop, client } = doc;
  const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: workshop.currency || 'MXN' });
  const discountAmount = quote.subtotal * (quote.discount / 100);
  const afterDiscount = quote.subtotal - discountAmount;
  const taxAmount = afterDiscount * (quote.tax / 100);
  const contact = [workshop.email, workshop.phone].filter(Boolean).join(' · ');
  const place = [workshop.address, workshop.city].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-neutral-300 print:bg-white py-6 print:py-0 px-3 print:px-0">
      {/* Barra (no se imprime) */}
      <div className="print:hidden max-w-[816px] mx-auto mb-4 flex items-center justify-between gap-3">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/quotes'))}
          className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-white text-neutral-800 shadow hover:bg-neutral-100"
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-neutral-700">En el diálogo elige “Guardar como PDF”.</span>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-violet-600 text-white shadow hover:bg-violet-700"
          >
            <Printer size={16} /> Descargar PDF
          </button>
        </div>
      </div>

      {/* Hoja */}
      <article className="quote-sheet max-w-[816px] mx-auto bg-white text-neutral-900 shadow-xl print:shadow-none rounded-sm px-8 sm:px-12 py-10 print:p-0 font-sans">
        <header className="flex items-start justify-between gap-6 pb-6 border-b-2 border-violet-600">
          <div className="flex items-start gap-4 min-w-0">
            {workshop.logo && (
              <img src={mediaUrl(workshop.logo.thumbUrl)} alt="" className="w-16 h-16 object-contain flex-shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight">{workshop.name}</h1>
              {workshop.owner && <p className="text-sm text-neutral-600">{workshop.owner}</p>}
              {contact && <p className="text-xs text-neutral-600 mt-1">{contact}</p>}
              {place && <p className="text-xs text-neutral-600">{place}</p>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs uppercase tracking-widest text-violet-700 font-semibold">Cotización</p>
            <p className="text-lg font-bold font-mono">{quote.number}</p>
            <p className="text-xs text-neutral-600 mt-1">Fecha: {formatDate(quote.createdAt, 'long')}</p>
            <p className="text-xs text-neutral-600">Vigencia: {formatDate(quote.validUntil, 'long')}</p>
            {quote.status !== 'sent' && (
              <p className="text-[11px] mt-1 inline-block px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                {statusLabel[quote.status]}
              </p>
            )}
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-6 py-6">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold mb-1">Cliente</p>
            <p className="text-sm font-semibold">{client.name}</p>
            {client.email && <p className="text-xs text-neutral-600">{client.email}</p>}
            {client.phone && <p className="text-xs text-neutral-600">{client.phone}</p>}
            {(client.address || client.city) && (
              <p className="text-xs text-neutral-600">{[client.address, client.city].filter(Boolean).join(', ')}</p>
            )}
          </div>
          {quote.projectName && (
            <div>
              <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold mb-1">Proyecto</p>
              <p className="text-sm font-semibold">{quote.projectName}</p>
            </div>
          )}
        </section>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-neutral-100 text-neutral-600 text-[11px] uppercase tracking-wider">
              <th className="text-left font-semibold px-3 py-2">Concepto</th>
              <th className="text-left font-semibold px-3 py-2 hidden sm:table-cell print:table-cell">Tipo</th>
              <th className="text-right font-semibold px-3 py-2">Cant.</th>
              <th className="text-right font-semibold px-3 py-2">Precio unit.</th>
              <th className="text-right font-semibold px-3 py-2">Importe</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map(item => (
              <tr key={item.id} className="border-b border-neutral-200 break-inside-avoid">
                <td className="px-3 py-2.5">{item.description}</td>
                <td className="px-3 py-2.5 text-neutral-600 hidden sm:table-cell print:table-cell">
                  {item.type === 'material' ? 'Material' : 'Mano de obra'}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">{item.quantity}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmt.format(item.unitPrice)}</td>
                <td className="px-3 py-2.5 text-right font-mono">{fmt.format(item.quantity * item.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="flex justify-end pt-5 break-inside-avoid">
          <dl className="w-full max-w-[280px] text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-neutral-600">Subtotal</dt><dd className="font-mono">{fmt.format(quote.subtotal)}</dd></div>
            {quote.discount > 0 && (
              <div className="flex justify-between"><dt className="text-neutral-600">Descuento ({quote.discount}%)</dt><dd className="font-mono">−{fmt.format(discountAmount)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-neutral-600">IVA ({quote.tax}%)</dt><dd className="font-mono">{fmt.format(taxAmount)}</dd></div>
            <div className="flex justify-between border-t-2 border-violet-600 pt-2 mt-2 text-base font-bold">
              <dt>Total</dt><dd className="font-mono">{fmt.format(quote.total)} <span className="text-xs font-normal">{workshop.currency}</span></dd>
            </div>
          </dl>
        </section>

        {quote.notes && (
          <section className="mt-8 break-inside-avoid">
            <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold mb-1">Notas</p>
            <p className="text-sm text-neutral-700 whitespace-pre-line">{quote.notes}</p>
          </section>
        )}

        <footer className="mt-10 pt-4 border-t border-neutral-200 text-[11px] text-neutral-500 flex justify-between gap-4 break-inside-avoid">
          <span>Precios en {workshop.currency}. Cotización válida hasta el {formatDate(quote.validUntil, 'long')}.</span>
          <span>{workshop.name}</span>
        </footer>
      </article>
    </div>
  );
}
