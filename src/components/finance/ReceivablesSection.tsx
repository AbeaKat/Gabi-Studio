import React, { useState } from 'react';
import { Wallet, CheckCircle2, Send, Clock } from 'lucide-react';
import { PaymentMethod, SalesHeader, SalesItem } from '../../types';
import { fmtC, todayLocalIso } from './financeUtils';
import { SectionCard, EmptyState } from './FinanceUI';

interface Props {
  items: SalesItem[]; // con saldo pendiente
  headers: SalesHeader[];
  successMsg: string | null;
  onDismissMsg: () => void;
  onPay: (item: SalesItem, amountNio: number, method: PaymentMethod) => void;
  onRemind: (item: SalesItem) => void;
}

const METHODS: { v: PaymentMethod; l: string }[] = [
  { v: 'cash_nio', l: 'Efectivo C$' },
  { v: 'cash_usd', l: 'Efectivo $ USD' },
  { v: 'transfer_bac', l: 'Transferencia BAC' },
  { v: 'transfer_lafise', l: 'Transferencia Lafise' },
  { v: 'transfer_banpro', l: 'Transferencia Banpro' },
  { v: 'pos_card', l: 'Tarjeta POS' },
];

export const ReceivablesSection: React.FC<Props> = ({ items, headers, successMsg, onDismissMsg, onPay, onRemind }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash_nio');
  const today = todayLocalIso();

  const rows = items.map((item) => {
    const hdr = headers.find((h) => h.id === item.sale_header_id);
    const name = item.customer_name || hdr?.customer_name || 'Cliente sin nombre';
    const phone = item.customer_phone || hdr?.customer_phone || '';
    const due = item.due_date || hdr?.due_date || '';
    return { item, name, phone, due, overdue: Boolean(due && due < today), saldo: Number(item.balance_due_nio || 0) };
  });

  const groups = new Map<string, typeof rows>();
  rows.forEach((r) => {
    const k = r.name.trim().toLowerCase();
    groups.set(k, [...(groups.get(k) || []), r]);
  });
  const customers = Array.from(groups.values())
    .map((g) => ({ name: g[0].name, rows: g, total: g.reduce((a, r) => a + r.saldo, 0), anyOverdue: g.some((r) => r.overdue) }))
    .sort((a, b) => Number(b.anyOverdue) - Number(a.anyOverdue) || b.total - a.total);
  const grand = customers.reduce((a, c) => a + c.total, 0);

  const open = (item: SalesItem) => {
    setActiveId(item.id);
    setAmount(String(Number(item.balance_due_nio || 0).toFixed(2)));
    setMethod(item.abono_payment_method || 'cash_nio');
  };

  return (
    <SectionCard
      title="Me deben"
      help="Clientes que se llevaron producto y todavía no terminan de pagar."
      icon={<Wallet className="w-5 h-5" />}
      right={
        items.length > 0 ? (
          <div className="px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-right">
            <span className="block text-sm text-amber-800">Total que te deben</span>
            <span className="text-xl font-extrabold text-amber-900">{fmtC(grand, 2)}</span>
          </div>
        ) : undefined
      }
    >
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-start justify-between gap-3">
          <span className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />{successMsg}</span>
          <button type="button" onClick={onDismissMsg} className="underline shrink-0">Cerrar</button>
        </div>
      )}

      {customers.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-8 h-8 text-emerald-600" />}
          title="¡Nadie te debe nada!"
          text="Cuando registres una venta a crédito o apartado, el cliente aparecerá aquí hasta que termine de pagar."
        />
      ) : (
        <div className="space-y-3">
          {customers.map((c) => (
            <div key={c.name} className="rounded-2xl border border-nacre-200 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-nacre-50 border-b border-nacre-200">
                <div>
                  <p className="text-base font-extrabold text-deepSlate-900">{c.name}</p>
                  {c.anyOverdue && <p className="text-sm font-bold text-rose-600">Tiene pagos vencidos</p>}
                </div>
                <p className="text-lg font-extrabold text-amber-800">Debe {fmtC(c.total, 2)}</p>
              </div>
              <ul className="divide-y divide-nacre-100">
                {c.rows.map(({ item, phone, due, overdue, saldo }) => {
                  const total = item.final_unit_price_nio * item.quantity;
                  const paid = Number(item.amount_paid_nio ?? Math.max(0, total - saldo));
                  return (
                    <li key={item.id} className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-deepSlate-900">
                            {item.product_name_snapshot || item.sku_snapshot} <span className="text-deepSlate-500 font-normal">× {item.quantity}</span>
                          </p>
                          <p className="text-sm text-deepSlate-600">
                            Total {fmtC(total, 2)} · Ha pagado {fmtC(paid, 2)} · <strong className="text-amber-800">Falta {fmtC(saldo, 2)}</strong>
                          </p>
                          <p className="text-sm text-deepSlate-500 flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span className={overdue ? 'text-rose-600 font-bold' : ''}>
                              {due ? (overdue ? `Venció el ${due}` : `Debe pagar antes del ${due}`) : 'Sin fecha límite'}
                            </span>
                            {phone ? <span>· Tel. {phone}</span> : null}
                          </p>
                        </div>
                        {activeId !== item.id && (
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => open(item)} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700">
                              Registrar pago
                            </button>
                            <button type="button" onClick={() => onRemind(item)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-deepSlate-800 bg-white border border-nacre-300 hover:bg-nacre-50">
                              <Send className="w-4 h-4 text-emerald-600" /> Recordar por WhatsApp
                            </button>
                          </div>
                        )}
                      </div>
                      {activeId === item.id && (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 rounded-2xl bg-nacre-50 border border-nacre-200">
                          <label className="sm:col-span-4 block">
                            <span className="text-sm font-bold text-deepSlate-700">¿Cuánto pagó? (C$)</span>
                            <input type="number" min="1" max={saldo} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus className="w-full mt-1 px-3 py-2.5 text-sm rounded-xl border border-coral-400 focus:outline-none" />
                          </label>
                          <label className="sm:col-span-4 block">
                            <span className="text-sm font-bold text-deepSlate-700">¿Cómo pagó?</span>
                            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="w-full mt-1 px-3 py-2.5 text-sm rounded-xl border border-nacre-300 bg-white">
                              {METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                            </select>
                          </label>
                          <div className="sm:col-span-4 flex items-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const n = parseFloat(amount);
                                if (isNaN(n) || n <= 0) return;
                                onPay(item, n, method);
                                setActiveId(null);
                              }}
                              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                            >
                              Guardar pago
                            </button>
                            <button type="button" onClick={() => setActiveId(null)} className="px-3 py-2.5 rounded-xl text-sm font-bold text-deepSlate-600 hover:bg-nacre-100">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};
