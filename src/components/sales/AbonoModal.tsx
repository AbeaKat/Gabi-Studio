import React, { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { PaymentMethod } from '../../types';
import { SaleRow, PAYMENT_METHOD_OPTIONS, money } from './salesShared';

interface AbonoModalProps {
  row: SaleRow | null;
  onClose: () => void;
  onConfirm: (row: SaleRow, amountNio: number, method: PaymentMethod) => void;
}

export const AbonoModal: React.FC<AbonoModalProps> = ({ row, onClose, onConfirm }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash_nio');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (row) {
      setAmount(String(row.due.toFixed(2)));
      setMethod(row.item.abono_payment_method || 'cash_nio');
      setError(null);
    }
  }, [row]);

  if (!row) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setError('Escribe cuánto te pagó (un número mayor a 0).');
      return;
    }
    if (value > row.due + 0.001) {
      setError(`Solo te debe ${money(row.due)}. Escribe un monto menor o igual.`);
      return;
    }
    onConfirm(row, value, method);
  };

  const inputCls =
    'w-full px-4 py-3 text-base rounded-xl bg-white border border-nacre-300 focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-deepSlate-900/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Registrar abono"
    >
      <form
        onSubmit={submit}
        className="bg-white sm:rounded-3xl rounded-t-3xl w-full max-w-md border border-nacre-200 shadow-modal-depth overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-nacre-200 bg-nacre-50/70 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-deepSlate-900">Registrar abono</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-deepSlate-500 hover:bg-nacre-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-2xl bg-nacre-50 border border-nacre-200 p-4 space-y-1 text-base">
            <p className="font-extrabold text-deepSlate-900">{row.name}</p>
            <p className="text-deepSlate-600">Cliente: {row.customer || 'Sin nombre'}</p>
            <p className="text-deepSlate-600">
              Total {money(row.total)} · Ya pagó {money(row.paid)}
            </p>
            <p className="text-lg font-extrabold text-amber-700">Todavía debe {money(row.due)}</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-deepSlate-700 mb-1.5">¿Cuánto te pagó ahora? (C$)</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputCls}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setAmount(row.due.toFixed(2))}
              className="mt-1 min-h-[40px] text-sm font-bold text-coral-600 underline"
            >
              Pagó todo ({money(row.due)})
            </button>
          </div>

          <div>
            <label className="block text-sm font-bold text-deepSlate-700 mb-1.5">¿Cómo te pagó?</label>
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputCls}>
              {PAYMENT_METHOD_OPTIONS.filter((m) => m.id !== 'credit_layaway').map((m) => (
                <option key={m.id} value={m.id}>
                  {m.shortLabel}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm font-semibold text-rose-700">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full min-h-[52px] rounded-xl text-base font-extrabold text-white bg-coral-500 hover:bg-coral-600"
          >
            Guardar abono
          </button>
        </div>
      </form>
    </div>
  );
};
