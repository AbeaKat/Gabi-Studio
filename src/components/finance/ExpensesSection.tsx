import React, { useState } from 'react';
import { Receipt, Plus, Trash2 } from 'lucide-react';
import { OperatingExpense } from '../../types';
import { EXPENSE_CATEGORY_KEYS, EXPENSE_HINTS, EXPENSE_LABELS, fmtC, todayLocalIso } from './financeUtils';
import { SectionCard, EmptyState } from './FinanceUI';

interface Props {
  expenses: OperatingExpense[]; // ya filtrados por periodo
  periodLabel: string;
  onAdd: (data: { category: OperatingExpense['category']; amountNio: number; date: string; note: string }) => void;
  onDelete: (id: string) => void;
}

const inputCls =
  'w-full px-3 py-2.5 text-sm rounded-xl bg-white border border-nacre-300 focus:outline-none focus:border-coral-500 text-deepSlate-900';

export const ExpensesSection: React.FC<Props> = ({ expenses, periodLabel, onAdd, onDelete }) => {
  const [category, setCategory] = useState<OperatingExpense['category']>('publicidad');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayLocalIso());
  const [note, setNote] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) {
      setError('Escribe cuánto pagaste (un número mayor a 0).');
      return;
    }
    setError('');
    onAdd({ category, amountNio: n, date: date || todayLocalIso(), note: note.trim() });
    setAmount('');
    setNote('');
  };

  const totals = EXPENSE_CATEGORY_KEYS.map((k) => ({
    key: k,
    total: expenses.filter((x) => x.category === k).reduce((a, x) => a + x.amount_nio, 0),
  })).filter((t) => t.total > 0);
  const grand = totals.reduce((a, t) => a + t.total, 0);
  const sorted = [...expenses].sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at));

  const DeleteControl: React.FC<{ id: string }> = ({ id }) =>
    confirmId === id ? (
      <span className="inline-flex items-center gap-2">
        <span className="text-sm text-rose-700 font-semibold">¿Borrar?</span>
        <button
          type="button"
          onClick={() => {
            onDelete(id);
            setConfirmId(null);
          }}
          className="px-3 py-1.5 rounded-lg text-sm font-bold bg-rose-600 text-white hover:bg-rose-700"
        >
          Sí, borrar
        </button>
        <button type="button" onClick={() => setConfirmId(null)} className="px-3 py-1.5 rounded-lg text-sm font-bold text-deepSlate-600 hover:bg-nacre-100">
          No
        </button>
      </span>
    ) : (
      <button
        type="button"
        onClick={() => setConfirmId(id)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-deepSlate-500 hover:text-rose-600 hover:bg-rose-50"
        aria-label="Eliminar gasto"
      >
        <Trash2 className="w-4 h-4" /> Eliminar
      </button>
    );

  return (
    <SectionCard title="Mis gastos" help="Anota lo que pagas para que funcione tu negocio (sin contar lo que cuesta el producto)." icon={<Receipt className="w-5 h-5" />}>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 p-4 rounded-2xl bg-nacre-50 border border-nacre-200">
        <label className="lg:col-span-3 block">
          <span className="text-sm font-bold text-deepSlate-700">¿En qué gastaste?</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as OperatingExpense['category'])} className={`${inputCls} mt-1`}>
            {EXPENSE_CATEGORY_KEYS.map((k) => (
              <option key={k} value={k}>
                {EXPENSE_LABELS[k]}
              </option>
            ))}
          </select>
          <span className="text-sm text-deepSlate-500 mt-1 block">{EXPENSE_HINTS[category]}</span>
        </label>
        <label className="lg:col-span-2 block">
          <span className="text-sm font-bold text-deepSlate-700">Monto (C$)</span>
          <input type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={`${inputCls} mt-1`} />
        </label>
        <label className="lg:col-span-2 block">
          <span className="text-sm font-bold text-deepSlate-700">Fecha</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} mt-1`} />
        </label>
        <label className="lg:col-span-3 block">
          <span className="text-sm font-bold text-deepSlate-700">Nota (opcional)</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: anuncio de Instagram" className={`${inputCls} mt-1`} />
        </label>
        <div className="lg:col-span-2 flex items-end">
          <button type="submit" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/20">
            <Plus className="w-4 h-4" /> Agregar gasto
          </button>
        </div>
        {error && <p className="sm:col-span-2 lg:col-span-12 text-sm font-semibold text-rose-600">{error}</p>}
      </form>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-7 h-7" />}
          title={`No has anotado gastos ${periodLabel}`}
          text="Anota tus gastos (publicidad, bolsas, envíos…) para saber cuánto te queda de verdad."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {totals.map((t) => (
              <span key={t.key} className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sm text-sky-900">
                {EXPENSE_LABELS[t.key]}: <strong>{fmtC(t.total, 2)}</strong>
              </span>
            ))}
            <span className="px-3 py-1.5 rounded-xl bg-deepSlate-900 text-white text-sm font-bold">Total: {fmtC(grand, 2)}</span>
          </div>

          {/* Tabla en pantallas medianas+ */}
          <div className="hidden md:block overflow-x-auto border border-nacre-200 rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-nacre-100 text-deepSlate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Nota</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nacre-100">
                {sorted.map((x) => (
                  <tr key={x.id} className="hover:bg-nacre-50/60">
                    <td className="py-3.5 px-4 text-deepSlate-700">{x.expense_date}</td>
                    <td className="py-3.5 px-4 font-semibold text-deepSlate-900">{EXPENSE_LABELS[x.category]}</td>
                    <td className="py-3.5 px-4 text-deepSlate-600">{x.description}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-deepSlate-900">{fmtC(x.amount_nio, 2)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <DeleteControl id={x.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas en móvil */}
          <ul className="md:hidden space-y-2">
            {sorted.map((x) => (
              <li key={x.id} className="rounded-2xl border border-nacre-200 p-3.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-extrabold text-deepSlate-900">{EXPENSE_LABELS[x.category]}</p>
                    <p className="text-sm text-deepSlate-500">{x.expense_date}</p>
                  </div>
                  <p className="text-base font-extrabold text-deepSlate-900">{fmtC(x.amount_nio, 2)}</p>
                </div>
                {x.description && <p className="text-sm text-deepSlate-600">{x.description}</p>}
                <div className="flex justify-end">
                  <DeleteControl id={x.id} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  );
};
