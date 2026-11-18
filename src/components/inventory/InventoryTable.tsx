import React, { useState } from 'react';
import { Pencil, History, Trash2, Plus, PackageSearch, Check } from 'lucide-react';
import { Product, UserRole } from '../../types';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import {
  getStockStatus,
  STOCK_STATUS_UI,
  fmtNio,
  fmtUsd,
  profitPerPiece,
  round2,
} from './inventoryHelpers';

interface InventoryTableProps {
  products: Product[]; // ya filtrados y ordenados
  totalProducts: number; // total sin filtrar
  exchangeRate: number;
  role: UserRole;
  hasActiveFilter: boolean;
  onClearFilters: () => void;
  onUpdateProduct: (id: string, updates: Partial<Product>, reason?: string) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onAddProduct: () => void;
  onImport: () => void;
  onOpenPriceHistory: (product: Product) => void;
}

/* ---------- Celda editable en línea ---------- */
interface InlineNumberProps {
  display: React.ReactNode;
  initial: number;
  label: string;
  integer?: boolean;
  prefix?: string;
  onSave: (value: number) => Promise<void>;
  strong?: boolean;
}

const InlineNumber: React.FC<InlineNumberProps> = ({
  display,
  initial,
  label,
  integer,
  prefix,
  onSave,
  strong,
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const start = () => {
    setValue(String(initial));
    setError(null);
    setEditing(true);
  };

  const commit = async () => {
    const num = Number(value.replace(',', '.'));
    if (value.trim() === '' || isNaN(num)) {
      setError('Escribe solo números.');
      return;
    }
    if (num < 0) {
      setError('No puede ser negativo.');
      return;
    }
    if (integer && !Number.isInteger(num)) {
      setError('Usa un número entero (sin decimales).');
      return;
    }
    setEditing(false);
    if (num !== initial) {
      await onSave(num);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  if (editing) {
    return (
      <div className="inline-flex flex-col items-end max-w-full">
        <div className="flex items-center gap-1 max-w-full">
          {prefix && <span className="text-xs sm:text-sm font-bold text-deepSlate-500 shrink-0">{prefix}</span>}
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            min="0"
            step={integer ? 1 : 0.01}
            aria-label={label}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="w-20 sm:w-24 min-w-0 min-h-[40px] sm:min-h-[44px] px-2 text-sm font-bold text-right rounded-xl border-2 border-coral-500 bg-white focus:outline-none"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={commit}
            className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-xl bg-coral-500 text-white flex items-center justify-center shrink-0"
            aria-label="Guardar"
          >
            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        {error && <span className="text-xs text-rose-600 font-semibold mt-1">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      title={`Toca para cambiar: ${label}`}
      className={`group inline-flex items-center gap-1.5 min-h-[44px] px-2 -mx-2 rounded-xl hover:bg-coral-50 transition-colors ${
        strong ? 'font-extrabold' : 'font-semibold'
      } ${saved ? 'bg-emerald-50 text-emerald-700' : ''}`}
    >
      <span>{display}</span>
      {saved ? (
        <Check className="w-4 h-4 text-emerald-600" />
      ) : (
        <Pencil className="w-3.5 h-3.5 text-deepSlate-300 group-hover:text-coral-500" />
      )}
    </button>
  );
};

/* ---------- Tabla / tarjetas ---------- */
export const InventoryTable: React.FC<InventoryTableProps> = ({
  products,
  totalProducts,
  exchangeRate,
  role,
  hasActiveFilter,
  onClearFilters,
  onUpdateProduct,
  onDeleteProduct,
  onAddProduct,
  onImport,
  onOpenPriceHistory,
}) => {
  const isOwner = role !== 'seller';
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const savePrice = (p: Product) => async (nio: number) => {
    await onUpdateProduct(
      p.id,
      { price_nio: round2(nio), price_usd: round2(nio / exchangeRate) },
      'Cambio de precio'
    );
  };
  const saveCost = (p: Product) => async (nio: number) => {
    const costUsd = round2(nio / exchangeRate);
    await onUpdateProduct(
      p.id,
      { base_cost_usd: costUsd, landed_cost_usd: costUsd },
      'Cambio de costo'
    );
  };
  const saveStock = (p: Product) => async (n: number) => {
    await onUpdateProduct(p.id, { stock_current: n }, 'Cambio de cantidad');
  };

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-nacre-200 p-8 sm:p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-coral-50 border border-coral-200 flex items-center justify-center text-coral-500 mx-auto mb-4">
          <PackageSearch className="w-8 h-8" />
        </div>
        {totalProducts === 0 ? (
          <>
            <h3 className="text-lg font-extrabold text-deepSlate-900">Aún no tienes productos</h3>
            <p className="text-sm text-deepSlate-500 mt-1 max-w-sm mx-auto mb-6">
              Agrega tu primer producto en menos de un minuto, o sube tu lista desde Excel si ya la tienes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onAddProduct}
                className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl text-sm font-bold text-white bg-coral-500 hover:bg-coral-600 inline-flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Agregar producto
              </button>
              <button
                onClick={onImport}
                className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl text-sm font-bold text-deepSlate-700 bg-nacre-100 hover:bg-nacre-200"
              >
                Subir mi lista de Excel
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-extrabold text-deepSlate-900">No encontramos nada</h3>
            <p className="text-sm text-deepSlate-500 mt-1 max-w-sm mx-auto mb-6">
              Ningún producto coincide con lo que buscas. Revisa cómo lo escribiste o quita los filtros.
            </p>
            {hasActiveFilter && (
              <button
                onClick={onClearFilters}
                className="min-h-[48px] px-6 rounded-xl text-sm font-bold text-coral-700 bg-coral-50 hover:bg-coral-100 border border-coral-200"
              >
                Quitar filtros
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  const StockBadge: React.FC<{ stock: number }> = ({ stock }) => {
    const ui = STOCK_STATUS_UI[getStockStatus(stock)];
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${ui.badge}`}
      >
        <span className={`w-2 h-2 rounded-full ${ui.dot}`} />
        {ui.label}
      </span>
    );
  };

  const RowActions: React.FC<{ p: Product }> = ({ p }) => (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => onOpenPriceHistory(p)}
        className="min-w-[44px] min-h-[44px] rounded-xl text-deepSlate-400 hover:text-coral-600 hover:bg-coral-50 flex items-center justify-center"
        title="Ver cambios de precio"
        aria-label={`Ver cambios de precio de ${p.name}`}
      >
        <History className="w-5 h-5" />
      </button>
      {isOwner && (
        <button
          onClick={() => setToDelete(p)}
          className="min-w-[44px] min-h-[44px] rounded-xl text-deepSlate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center"
          title="Borrar producto"
          aria-label={`Borrar ${p.name}`}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Escritorio: tabla */}
      <div className="hidden lg:block bg-white rounded-3xl border border-nacre-200 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-nacre-50 border-b border-nacre-200 text-deepSlate-600 font-bold">
              <th className="py-3 px-4">Producto</th>
              <th className="py-3 px-4">Cuánto queda</th>
              <th className="py-3 px-4 text-right">Precio de venta</th>
              {isOwner && <th className="py-3 px-4 text-right">Te costó</th>}
              {isOwner && <th className="py-3 px-4 text-right">Ganas por pieza</th>}
              <th className="py-3 px-4 w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-nacre-100">
            {products.map((p) => {
              const { costNio, profit, pct } = profitPerPiece(p, exchangeRate);
              return (
                <tr key={p.id} className="hover:bg-coral-50/20">
                  <td className="py-2 px-4 max-w-xs">
                    <span className="font-bold text-deepSlate-900 block truncate">
                      {p.name || `Producto ${p.sku}`}
                    </span>
                    <span className="text-xs text-deepSlate-400">Código {p.sku}</span>
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-3">
                      <InlineNumber
                        display={`${p.stock_current} ${p.stock_current === 1 ? 'pieza' : 'piezas'}`}
                        initial={p.stock_current}
                        label="cantidad que tienes"
                        integer
                        onSave={saveStock(p)}
                      />
                      <StockBadge stock={p.stock_current} />
                    </div>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <InlineNumber
                      display={
                        <span className="text-right">
                          <span className="block text-coral-600">{fmtNio(p.price_nio)}</span>
                          <span className="block text-xs font-medium text-deepSlate-400">
                            {fmtUsd(p.price_usd)}
                          </span>
                        </span>
                      }
                      initial={p.price_nio}
                      prefix="C$"
                      label="precio en córdobas"
                      strong
                      onSave={savePrice(p)}
                    />
                  </td>
                  {isOwner && (
                    <td className="py-2 px-4 text-right text-deepSlate-600 font-semibold">
                      <InlineNumber
                        display={
                          <span className="text-right">
                            <span className="block text-deepSlate-700">{fmtNio(costNio)}</span>
                            <span className="block text-xs font-medium text-deepSlate-400">
                              {fmtUsd(costNio / exchangeRate)}
                            </span>
                          </span>
                        }
                        initial={round2(costNio)}
                        prefix="C$"
                        label="costo en córdobas"
                        onSave={saveCost(p)}
                      />
                    </td>
                  )}
                  {isOwner && (
                    <td className="py-2 px-4 text-right">
                      <span
                        className={`font-extrabold block ${
                          profit <= 0 ? 'text-rose-600' : pct < 15 ? 'text-amber-600' : 'text-emerald-700'
                        }`}
                      >
                        {fmtNio(profit)}
                      </span>
                      <span className="text-xs text-deepSlate-400 font-semibold">{pct.toFixed(0)}%</span>
                    </td>
                  )}
                  <td className="py-2 px-4">
                    <RowActions p={p} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Móvil y Tablet: tarjetas */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
        {products.map((p) => {
          const { costNio, profit, pct } = profitPerPiece(p, exchangeRate);
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-nacre-200 p-4 space-y-3 min-w-0 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-extrabold text-deepSlate-900 text-base leading-tight break-words">
                      {p.name || `Producto ${p.sku}`}
                    </p>
                    <p className="text-xs text-deepSlate-400 mt-0.5 break-all">Código {p.sku}</p>
                  </div>
                  <div className="shrink-0">
                    <StockBadge stock={p.stock_current} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-sm">
                  <div className="bg-nacre-50 rounded-xl p-3 min-w-0">
                    <p className="text-xs font-bold text-deepSlate-500 mb-0.5">Cuánto queda</p>
                    <InlineNumber
                      display={`${p.stock_current} ${p.stock_current === 1 ? 'pieza' : 'piezas'}`}
                      initial={p.stock_current}
                      label="cantidad que tienes"
                      integer
                      onSave={saveStock(p)}
                    />
                  </div>
                  <div className="bg-nacre-50 rounded-xl p-3 min-w-0">
                    <p className="text-xs font-bold text-deepSlate-500 mb-0.5">Precio de venta</p>
                    <InlineNumber
                      display={<span className="text-coral-600">{fmtNio(p.price_nio)}</span>}
                      initial={p.price_nio}
                      prefix="C$"
                      label="precio en córdobas"
                      strong
                      onSave={savePrice(p)}
                    />
                    <p className="text-xs text-deepSlate-400">{fmtUsd(p.price_usd)}</p>
                  </div>
                </div>
                {isOwner && (
                  <p className="text-sm text-deepSlate-600 break-words">
                    Te costó <strong>{fmtNio(costNio)}</strong> · Ganas{' '}
                    <strong className={profit <= 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      {fmtNio(profit)}
                    </strong>{' '}
                    ({pct.toFixed(0)}%)
                  </p>
                )}
              </div>
              <div className="border-t border-nacre-100 pt-1">
                <RowActions p={p} />
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={!!toDelete}
        title="¿Borrar este producto?"
        message={
          <>
            Vas a borrar <strong>{toDelete?.name || toDelete?.sku}</strong>
            {toDelete && toDelete.stock_current > 0
              ? ` (todavía tienes ${toDelete.stock_current} en existencia)`
              : ''}
            . Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Sí, borrar"
        cancelLabel="No, conservar"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await onDeleteProduct(toDelete.id);
          setToDelete(null);
        }}
      />
    </>
  );
};
