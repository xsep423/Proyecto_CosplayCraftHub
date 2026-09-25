import { useState } from 'react';
import { Plus, Search, AlertTriangle, Package } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { materials as initialMaterials } from '../data/mockData';
import type { Material, StockStatus } from '../types';

const stockVariant: Record<StockStatus, 'success' | 'warning' | 'danger' | 'muted'> = {
  ok: 'success', low: 'warning', critical: 'danger', out: 'muted',
};
const stockLabel: Record<StockStatus, string> = {
  ok: 'OK', low: 'Bajo', critical: 'Crítico', out: 'Sin stock',
};

const categories = ['Estructura', 'Tela', 'Pintura', 'Electrónica', 'Costura', 'Adhesivos', 'Accesorios'];

function computeStock(quantity: number, minStock: number): StockStatus {
  if (quantity === 0) return 'out';
  if (quantity < minStock * 0.5) return 'critical';
  if (quantity < minStock) return 'low';
  return 'ok';
}

export default function Inventory() {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<Material | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [form, setForm] = useState({ name: '', category: '', quantity: '', unit: '', unitCost: '', minStock: '', supplier: '', location: '' });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const filtered = materials.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || m.category === catFilter;
    const matchStock = !stockFilter || m.stock === stockFilter;
    return matchSearch && matchCat && matchStock;
  });

  const openCreate = () => {
    setEditMaterial(null);
    setForm({ name: '', category: '', quantity: '', unit: '', unitCost: '', minStock: '', supplier: '', location: '' });
    setModalOpen(true);
  };

  const openEdit = (m: Material) => {
    setEditMaterial(m);
    setForm({ name: m.name, category: m.category, quantity: String(m.quantity), unit: m.unit, unitCost: String(m.unitCost), minStock: String(m.minStock), supplier: m.supplier ?? '', location: m.location ?? '' });
    setModalOpen(true);
  };

  const openAdjust = (m: Material) => {
    setAdjustTarget(m);
    setAdjustQty('');
    setAdjustModalOpen(true);
  };

  const handleSave = () => {
    const qty = Number(form.quantity);
    const minStock = Number(form.minStock);
    const mat: Material = {
      id: editMaterial?.id ?? `m${Date.now()}`,
      name: form.name,
      category: form.category,
      quantity: qty,
      unit: form.unit,
      unitCost: Number(form.unitCost),
      minStock,
      stock: computeStock(qty, minStock),
      supplier: form.supplier,
      location: form.location,
    };
    if (editMaterial) {
      setMaterials(ms => ms.map(m => m.id === editMaterial.id ? mat : m));
    } else {
      setMaterials(ms => [mat, ...ms]);
    }
    setModalOpen(false);
  };

  const handleAdjust = () => {
    if (!adjustTarget) return;
    const delta = Number(adjustQty);
    setMaterials(ms => ms.map(m => {
      if (m.id !== adjustTarget.id) return m;
      const newQty = Math.max(0, m.quantity + delta);
      return { ...m, quantity: newQty, stock: computeStock(newQty, m.minStock) };
    }));
    setAdjustModalOpen(false);
  };

  const alerts = materials.filter(m => m.stock !== 'ok').length;

  return (
    <div className="space-y-5">
      {/* Alert banner */}
      {alerts > 0 && (
        <div className="flex items-center gap-3 bg-warning/10 border border-warning/30 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-warning flex-shrink-0" />
          <p className="text-sm text-warning">
            <span className="font-semibold">{alerts} material{alerts > 1 ? 'es' : ''}</span> con stock bajo o sin existencias.
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar materiales..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text placeholder-muted outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary cursor-pointer"
          >
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c} className="bg-surface">{c}</option>)}
          </select>
          <select
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-primary cursor-pointer"
          >
            <option value="">Todos los estados</option>
            <option value="ok" className="bg-surface">OK</option>
            <option value="low" className="bg-surface">Bajo</option>
            <option value="critical" className="bg-surface">Crítico</option>
            <option value="out" className="bg-surface">Sin stock</option>
          </select>
          <Button onClick={openCreate} icon={<Plus size={16} />}>Nuevo Material</Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Material', 'Categoría', 'Existencias', 'Stock mín.', 'Costo unit.', 'Valor total', 'Estado', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-panel/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-panel flex items-center justify-center flex-shrink-0">
                        <Package size={14} className="text-muted" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text">{m.name}</p>
                        {m.location && <p className="text-xs text-muted">{m.location}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="muted">{m.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-text">
                    {m.quantity} <span className="text-muted text-xs">{m.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-muted">{m.minStock} {m.unit}</td>
                  <td className="px-4 py-3 text-sm font-mono text-muted">${m.unitCost.toLocaleString('es-MX')}</td>
                  <td className="px-4 py-3 text-sm font-mono text-text">
                    ${(m.quantity * m.unitCost).toLocaleString('es-MX')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={stockVariant[m.stock]} dot>{stockLabel[m.stock]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openAdjust(m)}
                        className="text-xs px-2 py-1 rounded-md bg-panel hover:bg-border text-muted hover:text-text transition-colors"
                      >
                        Ajustar
                      </button>
                      <button
                        onClick={() => openEdit(m)}
                        className="text-xs px-2 py-1 rounded-md bg-panel hover:bg-border text-muted hover:text-text transition-colors"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted">
                    No se encontraron materiales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editMaterial ? 'Editar Material' : 'Nuevo Material'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editMaterial ? 'Guardar' : 'Crear'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombre" value={form.name} onChange={set('name')} placeholder="Nombre del material" required className="col-span-2" />
          <Select
            label="Categoría"
            value={form.category}
            onChange={set('category')}
            placeholder="Seleccionar"
            required
            options={categories.map(c => ({ value: c, label: c }))}
          />
          <Input label="Unidad" value={form.unit} onChange={set('unit')} placeholder="m, pieza, frasco..." required />
          <Input label="Cantidad inicial" type="number" value={form.quantity} onChange={set('quantity')} placeholder="0" required />
          <Input label="Stock mínimo" type="number" value={form.minStock} onChange={set('minStock')} placeholder="0" required />
          <Input label="Costo unitario (MXN)" type="number" value={form.unitCost} onChange={set('unitCost')} placeholder="0.00" required />
          <Input label="Proveedor" value={form.supplier} onChange={set('supplier')} placeholder="Nombre del proveedor" />
          <Input label="Ubicación" value={form.location} onChange={set('location')} placeholder="Estante A-1" />
        </div>
      </Modal>

      {/* Adjust Modal */}
      <Modal
        open={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title={`Ajustar: ${adjustTarget?.name}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjustModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdjust}>Aplicar ajuste</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-panel rounded-lg p-3 text-sm">
            <span className="text-muted">Existencias actuales: </span>
            <span className="font-mono font-semibold text-text">{adjustTarget?.quantity} {adjustTarget?.unit}</span>
          </div>
          <Input
            label="Ajuste de cantidad (+ para entrada, - para salida)"
            type="number"
            value={adjustQty}
            onChange={e => setAdjustQty(e.target.value)}
            placeholder="Ej: 5 o -2"
            hint="Ingresa un número positivo para agregar o negativo para descontar"
          />
        </div>
      </Modal>
    </div>
  );
}
