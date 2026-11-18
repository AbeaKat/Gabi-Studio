import React, { useState, useEffect } from 'react';
import { X, AlertCircle, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { Product, Batch, UserRole } from '../../types';
import { fmtNio, fmtUsd, generateSku, round2 } from './inventoryHelpers';

interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Partial<Product>) => Promise<void>;
  batches: Batch[];
  exchangeRate: number;
  role: UserRole;
  defaultBatchId?: string;
  existingNames?: string[];
}

const inputCls =
  'w-full min-h-[52px] px-4 text-base rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900';

export const NewProductModal: React.FC<NewProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  exchangeRate,
  role,
  defaultBatchId,
  existingNames = [],
}) => {
  const isOwner = role !== 'seller';
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setCost('');
      setPrice('');
      setStock('1');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const costNum = parseFloat(cost) || 0;
  const priceNum = parseFloat(price) || 0;
  const profit = priceNum - costNum;
  const pct = priceNum > 0 ? (profit / priceNum) * 100 : 0;
  const showProfit = isOwner && priceNum > 0 && cost.trim() !== '';
  const duplicate =
    name.trim() !== '' &&
    existingNames.some((n) => n.trim().toLowerCase() === name.trim().toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError('Escribe el nombre del producto, por ejemplo "Camisa azul".');
    if (isOwner && cost.trim() !== '' && (isNaN(costNum) || costNum < 0))
      return setError('Lo que pagaste debe ser un número, por ejemplo 150.');
    if (!price.trim() || isNaN(priceNum) || priceNum <= 0)
      return setError('Escribe el precio al que vas a vender (debe ser mayor que cero).');
    const stockNum = Number(stock);
    if (stock.trim() === '' || isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum))
      return setError('Escribe cuántas piezas tienes, con números enteros (puede ser 0).');

    setIsSaving(true);
    try {
      const costUsd = round2(costNum / exchangeRate);
      await onSave({
        sku: generateSku(),
        name: name.trim(),
        batch_id: defaultBatchId || null,
        stock_current: stockNum,
        base_cost_usd: costUsd,
        landed_cost_usd: costUsd,
        price_usd: round2(priceNum / exchangeRate),
        price_nio: round2(priceNum),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'No pudimos guardar el producto. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-deepSlate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full border border-nacre-200 shadow-xl overflow-y-auto max-h-[95vh]">
        <div className="px-6 py-5 border-b border-nacre-200 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-xl text-deepSlate-900">Agregar producto</h3>
            <p className="text-sm text-deepSlate-500">Solo 4 datos y listo.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="min-w-[44px] min-h-[44px] rounded-xl text-deepSlate-400 hover:bg-nacre-100 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-deepSlate-800 mb-1.5" htmlFor="np-name">
              ¿Cómo se llama el producto?
            </label>
            <input
              id="np-name"
              autoFocus
              type="text"
              placeholder="Ej. Camisa azul talla M"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
            {duplicate && (
              <p className="text-sm text-amber-700 mt-1.5">
                Ya tienes un producto con ese nombre. Si es otro, puedes agregarlo igual.
              </p>
            )}
          </div>

          <div className={`grid gap-4 ${isOwner ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {isOwner && (
              <div>
                <label className="block text-sm font-bold text-deepSlate-800 mb-1.5" htmlFor="np-cost">
                  ¿Cuánto pagaste por cada una?
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-deepSlate-500 font-bold">C$</span>
                  <input
                    id="np-cost"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className={`${inputCls} pl-11`}
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-deepSlate-800 mb-1.5" htmlFor="np-price">
                ¿A cuánto la vendes?
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-coral-600 font-bold">C$</span>
                <input
                  id="np-price"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={`${inputCls} pl-11 font-bold text-coral-700`}
                />
              </div>
              {priceNum > 0 && (
                <p className="text-xs text-deepSlate-400 mt-1">≈ {fmtUsd(priceNum / exchangeRate)}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-deepSlate-800 mb-1.5" htmlFor="np-stock">
              ¿Cuántas piezas tienes?
            </label>
            <input
              id="np-stock"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className={inputCls}
            />
          </div>

          {showProfit && (
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 ${
                profit > 0
                  ? pct >= 15
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
              aria-live="polite"
            >
              {profit > 0 ? (
                <TrendingUp className="w-6 h-6 shrink-0" />
              ) : (
                <TrendingDown className="w-6 h-6 shrink-0" />
              )}
              <div className="text-sm">
                {profit > 0 ? (
                  <>
                    <p className="font-extrabold text-base">
                      Ganas {fmtNio(profit)} por pieza, {pct.toFixed(0)}%
                    </p>
                    {pct < 15 && <p>Es poca ganancia. Considera subir el precio.</p>}
                  </>
                ) : (
                  <>
                    <p className="font-extrabold text-base">
                      {profit === 0 ? 'No ganas nada' : `Pierdes ${fmtNio(Math.abs(profit))} por pieza`}
                    </p>
                    <p>El precio de venta es menor o igual a lo que pagaste.</p>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[52px] px-5 rounded-xl text-sm font-bold text-deepSlate-700 bg-nacre-100 hover:bg-nacre-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[52px] px-6 rounded-xl text-base font-bold text-white bg-coral-500 hover:bg-coral-600 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {isSaving ? 'Guardando...' : 'Guardar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
