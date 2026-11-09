import React, { useState, useEffect } from 'react';
import { X, History, ArrowRight, Loader2, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Product, PriceHistory } from '../../types';
import { getStoredPriceHistory } from '../../data/realInventoryData';

interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deepSlate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-nacre-200 shadow-modal-depth overflow-hidden flex flex-col max-h-[85vh] animate-modal-enter">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-nacre-200 flex items-center justify-between bg-nacre-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-deepSlate-900">
                Historial de Auditoría de Precios
              </h3>
              <p className="text-xs text-deepSlate-500 font-mono">
                {product.sku} • {product.name}
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* Current values card */}
          <div className="bg-coral-50/40 border border-coral-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-coral-700 uppercase tracking-wider block">
                Valores Vigentes en Catálogo
              </span>
              <span className="text-xs font-semibold text-deepSlate-700 font-mono">
                Costo Landed: ${(product.landed_cost_usd || product.base_cost_usd || 0).toFixed(2)} USD
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-extrabold font-mono text-deepSlate-900 block">
                ${product.price_usd.toFixed(2)} USD
              </span>
              <span className="text-xs font-bold font-mono text-coral-600">
                C$ {product.price_nio.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Timeline of changes */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-deepSlate-500 block">
              Registro Histórico ({history.length} cambios)
            </span>

            {isLoading ? (
              <div className="py-8 flex justify-center text-coral-500">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="py-8 text-center text-xs text-deepSlate-400 bg-nacre-50 rounded-2xl border border-nacre-200">
                No hay cambios manuales de precios registrados para este SKU aún. Haz clic en su precio o costo en la tabla para editarlo y generar una huella de auditoría.
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-deepSlate-700 flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-deepSlate-400" />
                        <span>{new Date(item.changed_at).toLocaleString('es-NI')}</span>
                      </span>
                      <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-nacre-200 text-deepSlate-600">
                        {item.reason || 'Actualización de catálogo'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-nacre-200/60">
                      <div>
                        <span className="text-deepSlate-400 text-[10px] block">Costo USD:</span>
                        <div className="flex items-center space-x-1.5 font-mono">
                          <span className="text-deepSlate-500 line-through">${Number(item.old_cost_usd || 0).toFixed(2)}</span>
                          <ArrowRight className="w-3 h-3 text-coral-500" />
                          <span className="font-bold text-deepSlate-900">${Number(item.new_cost_usd || 0).toFixed(2)}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-deepSlate-400 text-[10px] block">Precio USD / C$:</span>
                        <div className="flex items-center space-x-1.5 font-mono">
                          <span className="text-deepSlate-500 line-through">
                            C$ {Number(item.old_price_nio || 0).toFixed(0)}
                          </span>
                          <ArrowRight className="w-3 h-3 text-coral-500" />
                          <span className="font-bold text-coral-600">
                            C$ {Number(item.new_price_nio || 0).toFixed(0)} (${Number(item.new_price_usd || 0).toFixed(2)})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-nacre-200 bg-nacre-50/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-white text-deepSlate-700 border border-nacre-200 hover:bg-nacre-100"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
