import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, ArrowRight, Layers, Tag, Calculator } from 'lucide-react';
import { Product, Batch, UserRole } from '../../types';

interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Partial<Product>) => Promise<void>;
  batches: Batch[];
  exchangeRate: number;
  role: UserRole;
  defaultBatchId?: string;
}

export const NewProductModal: React.FC<NewProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  batches,
  exchangeRate,
  role,
  defaultBatchId,
}) => {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [batchId, setBatchId] = useState(defaultBatchId || '');
  const [stockCurrent, setStockCurrent] = useState('1');
  const [baseCostUsd, setBaseCostUsd] = useState('0.00');
  const [priceUsd, setPriceUsd] = useState('0.00');
  const [priceNio, setPriceNio] = useState('0.00');
  const [isManualNio, setIsManualNio] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSku('');
      setName('');
      setBatchId(defaultBatchId || (batches[0]?.id || ''));
      setStockCurrent('1');
      setBaseCostUsd('0.00');
      setPriceUsd('0.00');
      setPriceNio('0.00');
      setIsManualNio(false);
      setErrorMessage(null);
    }
  }, [isOpen, defaultBatchId, batches]);

  if (!isOpen) return null;

  const handlePriceUsdChange = (val: string) => {
    setPriceUsd(val);
    const num = parseFloat(val);
    if (!isNaN(num) && !isManualNio) {
      const calcNio = Math.round(num * exchangeRate * 100) / 100;
      setPriceNio(calcNio.toFixed(2));
    }
  };

  const handlePriceNioChange = (val: string) => {
    setPriceNio(val);
    setIsManualNio(true);
  };

  const costNum = parseFloat(baseCostUsd) || 0;
  const priceUsdNum = parseFloat(priceUsd) || 0;
  const marginPercent = priceUsdNum > 0 ? ((priceUsdNum - costNum) / priceUsdNum) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!sku.trim()) {
      setErrorMessage('El código SKU es obligatorio.');
      return;
    }

    const stock = parseInt(stockCurrent, 10);
    if (isNaN(stock) || stock < 0) {
      setErrorMessage('El stock debe ser un número entero mayor o igual a 0.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        sku: sku.trim().toUpperCase(),
        name: name.trim() || `Producto ${sku.trim().toUpperCase()}`,
        batch_id: batchId || null,
        stock_current: stock,
        base_cost_usd: costNum,
        landed_cost_usd: costNum,
        price_usd: priceUsdNum,
        price_nio: parseFloat(priceNio) || Math.round(priceUsdNum * exchangeRate * 100) / 100,
      });
      onClose();
    } catch (err: any) {
      console.error('Error al crear producto:', err);
      setErrorMessage(err?.message || 'Error al guardar el producto. Verifica que el SKU no esté duplicado.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deepSlate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-nacre-200 shadow-modal-depth overflow-hidden flex flex-col animate-modal-enter">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-nacre-200 flex items-center justify-between bg-nacre-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-coral-500 text-white flex items-center justify-center shadow-sm shadow-coral-500/25">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-deepSlate-900">
                Nuevo Producto / Pieza
              </h3>
              <p className="text-xs text-deepSlate-500">
                Ingresa los datos para registrarlo en el inventario maestro
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-deepSlate-400 hover:text-deepSlate-700 hover:bg-nacre-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* SKU */}
            <div>
              <label className="block text-xs font-bold text-deepSlate-700 uppercase tracking-wider mb-1.5">
                Código SKU *
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-deepSlate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ej. REP-501"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900 uppercase"
                />
              </div>
            </div>

            {/* Batch / Category */}
            <div>
              <label className="block text-xs font-bold text-deepSlate-700 uppercase tracking-wider mb-1.5">
                Categoría / Lote
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-deepSlate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900 font-medium"
                >
                  <option value="">Sin Categoría Asignada</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Product Name */}
          <div>
            <label className="block text-xs font-bold text-deepSlate-700 uppercase tracking-wider mb-1.5">
              Nombre / Descripción del Producto
            </label>
            <input
              type="text"
              placeholder="Ej. Filtro de Aceite Sintético de Alto Rendimiento"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            
            {/* Stock */}
            <div>
              <label className="block text-xs font-bold text-deepSlate-700 uppercase tracking-wider mb-1.5">
                Stock Inicial
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={stockCurrent}
                onChange={(e) => setStockCurrent(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900"
              />
            </div>

            {/* Cost USD (Hidden if seller) */}
            {role !== 'seller' ? (
              <div>
                <label className="block text-xs font-bold text-deepSlate-700 uppercase tracking-wider mb-1.5">
                  Costo Base ($ USD)
                </label>
                <div className="relative">
                  <span className="text-deepSlate-400 text-xs absolute left-3 top-1/2 -translate-y-1/2 font-mono">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={baseCostUsd}
                    onChange={(e) => setBaseCostUsd(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center text-xs text-deepSlate-400 bg-nacre-50 p-3 rounded-xl border border-nacre-200">
                <span>Costos restringidos para vendedores.</span>
              </div>
            )}

          </div>

          {/* Pricing Bimoneda Grid */}
          <div className="p-4 bg-coral-50/40 rounded-2xl border border-coral-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-coral-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Calculator className="w-3.5 h-3.5 text-coral-600" />
                <span>Precios de Venta (Bimoneda)</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Tasa: C${exchangeRate.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Price USD */}
              <div>
                <label className="block text-[11px] font-bold text-deepSlate-700 uppercase mb-1">
                  Precio USD ($)
                </label>
                <div className="relative">
                  <span className="text-deepSlate-400 text-xs absolute left-3 top-1/2 -translate-y-1/2 font-mono">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={priceUsd}
                    onChange={(e) => handlePriceUsdChange(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-coral-300 focus:outline-none focus:border-coral-500 text-deepSlate-900"
                  />
                </div>
              </div>

              {/* Price NIO */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-deepSlate-700 uppercase">
                    Precio C$ (Córdobas)
                  </label>
                  {isManualNio && (
                    <span className="text-[9px] text-coral-600 font-bold">Manual</span>
                  )}
                </div>
                <div className="relative">
                  <span className="text-coral-600 text-[11px] font-bold absolute left-2.5 top-1/2 -translate-y-1/2 font-mono">C$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={priceNio}
                    onChange={(e) => handlePriceNioChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono font-extrabold rounded-xl bg-white border border-coral-300 focus:outline-none focus:border-coral-500 text-coral-700"
                  />
                </div>
              </div>
            </div>

            {/* Profit margin estimation (Only for owner) */}
            {role !== 'seller' && priceUsdNum > 0 && (
              <div className="pt-2 border-t border-coral-200/60 flex items-center justify-between text-xs font-bold">
                <span className="text-deepSlate-600">Margen Bruto Proyectado:</span>
                <span className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                  marginPercent >= 35
                    ? 'bg-emerald-100 text-emerald-800'
                    : marginPercent >= 15
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  +{marginPercent.toFixed(1)}% (${(priceUsdNum - costNum).toFixed(2)} USD)
                </span>
              </div>
            )}

          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-nacre-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-deepSlate-600 hover:bg-nacre-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <span>{isSaving ? 'Guardando...' : 'Guardar Producto'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
