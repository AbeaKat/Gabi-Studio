import React, { useState, useEffect } from 'react';
import { X, History, ArrowRight, Loader2, Calendar, Tag, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Product, PriceHistory, UserRole } from '../../types';
import { getStoredPriceHistory } from '../../data/realInventoryData';
import { fmtNio, fmtUsd, productCostUsd } from './inventoryHelpers';

interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  role?: UserRole;
  exchangeRate?: number;
}

export const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({
  isOpen,
  onClose,
  product,
  role = 'global_owner',
  exchangeRate = 36.62,
}) => {
  const isOwner = role !== 'seller';
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      loadHistory(product.id);
    }
  }, [isOpen, product]);

  const loadHistory = async (productId: string) => {
    setIsLoading(true);
    try {
      const localItems = getStoredPriceHistory().filter((h) => h.product_id === productId);

      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('product_id', productId)
        .order('changed_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setHistory(data as PriceHistory[]);
      } else {
        setHistory(localItems);
      }
    } catch (err) {
      setHistory(getStoredPriceHistory().filter((h) => h.product_id === productId));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const visibleHistory = isOwner
    ? history
    : history.filter((h) => Math.abs((h.old_price_nio || 0) - (h.new_price_nio || 0)) >= 0.5);

  const costUsd = productCostUsd(product);
  const costNio = costUsd * exchangeRate;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-deepSlate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full border border-nacre-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-nacre-200 flex items-center justify-between bg-nacre-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-lg text-deepSlate-900 truncate">
                Cambios de precio
              </h3>
              <p className="text-sm text-deepSlate-500 truncate">
                {product.name || product.sku} · Código {product.sku}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="min-w-[44px] min-h-[44px] rounded-xl text-deepSlate-400 hover:text-deepSlate-700 hover:bg-nacre-100 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Valores actuales */}
          <div className="bg-coral-50/40 border border-coral-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-coral-700 uppercase tracking-wider block">
                Precio actual de venta
              </span>
              <span className="text-xl font-extrabold text-coral-600 block mt-0.5">
                {fmtNio(product.price_nio)}
              </span>
              <span className="text-sm font-medium text-deepSlate-500">
                {fmtUsd(product.price_usd)}
              </span>
            </div>
            {isOwner && (
              <div className="text-right">
                <span className="text-xs font-bold text-deepSlate-500 uppercase tracking-wider block">
                  Te cuesta
                </span>
                <span className="text-base font-extrabold text-deepSlate-900 block mt-0.5">
                  {fmtNio(costNio)}
                </span>
                <span className="text-sm text-deepSlate-500">
                  {fmtUsd(costUsd)}
                </span>
              </div>
            )}
          </div>

          {/* Línea de tiempo */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-deepSlate-700">
              Historial ({visibleHistory.length} {visibleHistory.length === 1 ? 'cambio' : 'cambios'})
            </h4>

            {isLoading ? (
              <div className="py-10 flex justify-center text-coral-500">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
            ) : visibleHistory.length === 0 ? (
              <div className="py-8 px-4 text-center text-sm text-deepSlate-500 bg-nacre-50 rounded-2xl border border-nacre-200">
                Aún no se ha cambiado el precio de este producto. Cuando cambies su precio en la lista, quedará guardado aquí.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleHistory.map((item) => {
                  const priceChanged = Math.abs((item.old_price_nio || 0) - (item.new_price_nio || 0)) >= 0.5;
                  const costChanged = isOwner && Math.abs((item.old_cost_usd || 0) - (item.new_cost_usd || 0)) >= 0.01;

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-deepSlate-600 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-deepSlate-400" />
                          <span>
                            {new Date(item.changed_at).toLocaleDateString('es-NI', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </span>
                        {item.reason && (
                          <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-lg border border-nacre-200 text-deepSlate-600">
                            {item.reason}
                          </span>
                        )}
                      </div>

                      {priceChanged && (
                        <div className="flex items-center gap-2 text-sm text-deepSlate-800">
                          <Tag className="w-4 h-4 text-coral-500 shrink-0" />
                          <span>
                            Precio pasó de{' '}
                            <strong className="line-through text-deepSlate-400">
                              {fmtNio(item.old_price_nio, 0)}
                            </strong>{' '}
                            <ArrowRight className="w-3.5 h-3.5 inline text-coral-500 mx-0.5" />{' '}
                            <strong className="text-coral-600">
                              {fmtNio(item.new_price_nio, 0)}
                            </strong>{' '}
                            <span className="text-deepSlate-500">
                              ({fmtUsd(item.new_price_usd)})
                            </span>
                          </span>
                        </div>
                      )}

                      {costChanged && (
                        <div className="flex items-center gap-2 text-sm text-deepSlate-700">
                          <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            Costo pasó de{' '}
                            <strong className="line-through text-deepSlate-400">
                              {fmtUsd(item.old_cost_usd)}
                            </strong>{' '}
                            <ArrowRight className="w-3.5 h-3.5 inline text-emerald-600 mx-0.5" />{' '}
                            <strong className="text-deepSlate-900">
                              {fmtUsd(item.new_cost_usd)}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-nacre-200 bg-nacre-50/70 flex justify-end">
          <button
            onClick={onClose}
            className="min-h-[48px] px-6 rounded-xl text-sm font-bold bg-white text-deepSlate-700 border border-nacre-200 hover:bg-nacre-100"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
