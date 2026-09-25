import { useState } from 'react';
import { Plus, Search, FileText, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { quotes as initialQuotes, clients } from '../data/mockData';
import type { Quote, QuoteItem, QuoteStatus } from '../types';

const statusVariant: Record<QuoteStatus, 'muted' | 'info' | 'success' | 'danger' | 'primary'> = {
  draft: 'muted', sent: 'info', approved: 'success', rejected: 'danger', invoiced: 'primary',
};
const statusLabel: Record<QuoteStatus, string> = {
  draft: 'Borrador', sent: 'Enviada', approved: 'Aprobada', rejected: 'Rechazada', invoiced: 'Facturada',
};

function calcTotal(quote: Quote) {
  const sub = quote.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discounted = sub * (1 - quote.discount / 100);
  return discounted * (1 + quote.tax / 100);
}

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [newQuote, setNewQuote] = useState({
    clientId: '', discount: '0', tax: '16', notes: '',
    items: [{ id: 'new1', description: '', quantity: '1', unitPrice: '', type: 'material' }] as Array<{ id: string; description: string; quantity: string; unitPrice: string; type: string }>,
  });

  const filtered = quotes.filter(q => {
    const matchSearch = q.clientName.toLowerCase().includes(search.toLowerCase()) || q.number.includes(search);
    const matchStatus = !statusFilter || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const addItem = () => {
    setNewQuote(q => ({
      ...q,
      items: [...q.items, { id: `new${Date.now()}`, description: '', quantity: '1', unitPrice: '', type: 'material' }],
    }));
  };

  const removeItem = (id: string) => {
    setNewQuote(q => ({ ...q, items: q.items.filter(i => i.id !== id) }));
  };

  const setItem = (id: string, key: string, value: string) => {
    setNewQuote(q => ({ ...q, items: q.items.map(i => i.id === id ? { ...i, [key]: value } : i) }));
  };

  const handleCreate = () => {
    const client = clients.find(c => c.id === newQuote.clientId);
    if (!client) return;
    const items: QuoteItem[] = newQuote.items.map(i => ({
      id: i.id,
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      type: i.type as 'material' | 'labor',
    }));
    const quote: Quote = {
      id: `q${Date.now()}`,
      number: `CCH-2025-${String(50 + quotes.length).padStart(3, '0')}`,
      clientId: client.id,
      clientName: client.name,
      status: 'draft',
      items,
      discount: Number(newQuote.discount),
      tax: Number(newQuote.tax),
      notes: newQuote.notes,
      createdAt: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    };
    setQuotes(qs => [quote, ...qs]);
    setModalOpen(false);
  };

  const previewSub = newQuote.items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
  const previewTotal = previewSub * (1 - Number(newQuote.discount) / 100) * (1 + Number(newQuote.tax) / 100);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente o número..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text placeholder-muted outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary cursor-pointer"
          >
            <option value="">Todos los estados</option>
            {Object.entries(statusLabel).map(([v, l]) => (
              <option key={v} value={v} className="bg-surface">{l}</option>
            ))}
          </select>
          <Button onClick={() => setModalOpen(true)} icon={<Plus size={16} />}>Nueva Cotización</Button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map(q => {
          const total = calcTotal(q);
          const isOpen = expanded === q.id;
          return (
            <div key={q.id} className="bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : q.id)}
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-text font-mono">{q.number}</span>
                    <Badge variant={statusVariant[q.status]} dot>{statusLabel[q.status]}</Badge>
                  </div>
                  <p className="text-xs text-muted mt-0.5">{q.clientName}{q.projectName ? ` · ${q.projectName}` : ''}</p>
                </div>
                <div className="text-right hidden sm:block flex-shrink-0">
                  <p className="text-sm font-bold font-mono text-text">${total.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-muted">{new Date(q.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="text-muted flex-shrink-0">
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border px-5 pb-5">
                  <div className="pt-4 space-y-1">
                    {q.items.map(item => (
                      <div key={item.id} className="flex items-center gap-4 py-1.5 border-b border-border/50 last:border-0">
                        <span className="flex-1 text-sm text-text">{item.description}</span>
                        <span className="text-xs text-muted font-mono">{item.quantity} × ${item.unitPrice.toLocaleString('es-MX')}</span>
                        <span className="text-sm font-mono text-text w-28 text-right">${(item.quantity * item.unitPrice).toLocaleString('es-MX')}</span>
                        <Badge variant={item.type === 'material' ? 'info' : 'primary'} className="hidden sm:flex">
                          {item.type === 'material' ? 'Material' : 'M. Obra'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-3">
                    <div className="text-right space-y-1">
                      {q.discount > 0 && (
                        <p className="text-xs text-muted">Descuento: <span className="text-danger">-{q.discount}%</span></p>
                      )}
                      <p className="text-xs text-muted">IVA ({q.tax}%): included</p>
                      <p className="text-base font-bold font-mono text-primary">
                        Total: ${total.toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN
                      </p>
                    </div>
                  </div>
                  {q.notes && (
                    <p className="text-xs text-muted italic mt-2 border-t border-border pt-2">{q.notes}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-muted bg-surface border border-border rounded-xl">
            No se encontraron cotizaciones.
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva Cotización"
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newQuote.clientId}>Crear cotización</Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Cliente"
              value={newQuote.clientId}
              onChange={e => setNewQuote(q => ({ ...q, clientId: e.target.value }))}
              placeholder="Seleccionar cliente"
              required
              options={clients.map(c => ({ value: c.id, label: c.name }))}
              className="sm:col-span-2"
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Partidas</label>
              <Button variant="ghost" size="sm" icon={<Plus size={13} />} onClick={addItem}>Agregar partida</Button>
            </div>
            <div className="space-y-2">
              {newQuote.items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-start bg-panel rounded-lg p-3">
                  <div className="col-span-5">
                    <input
                      placeholder="Descripción del concepto"
                      value={item.description}
                      onChange={e => setItem(item.id, 'description', e.target.value)}
                      className="w-full bg-border/50 border border-border rounded-md px-2 py-1.5 text-sm text-text placeholder-muted outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Cant."
                      value={item.quantity}
                      onChange={e => setItem(item.id, 'quantity', e.target.value)}
                      className="w-full bg-border/50 border border-border rounded-md px-2 py-1.5 text-sm text-text placeholder-muted outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="Precio unit."
                      value={item.unitPrice}
                      onChange={e => setItem(item.id, 'unitPrice', e.target.value)}
                      className="w-full bg-border/50 border border-border rounded-md px-2 py-1.5 text-sm text-text placeholder-muted outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="col-span-1 flex items-center gap-1">
                    <span className="text-xs font-mono text-muted hidden sm:block">
                      ${(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                    </span>
                    {newQuote.items.length > 1 && (
                      <button onClick={() => removeItem(item.id)} className="p-1 hover:bg-border rounded text-muted hover:text-danger transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Descuento (%)"
              type="number"
              value={newQuote.discount}
              onChange={e => setNewQuote(q => ({ ...q, discount: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="IVA (%)"
              type="number"
              value={newQuote.tax}
              onChange={e => setNewQuote(q => ({ ...q, tax: e.target.value }))}
              placeholder="16"
            />
            <div className="flex flex-col justify-end">
              <p className="text-xs text-muted mb-1">Total estimado</p>
              <p className="text-xl font-bold font-mono text-primary">${previewTotal.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          <Input
            label="Notas"
            value={newQuote.notes}
            onChange={e => setNewQuote(q => ({ ...q, notes: e.target.value }))}
            placeholder="Notas adicionales para el cliente..."
          />
        </div>
      </Modal>
    </div>
  );
}
