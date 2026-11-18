import React, { useMemo, useState } from 'react';
import { Search, ShoppingBag, SearchX, HandCoins, X } from 'lucide-react';
import {
  SaleRow,
  SaleStatus,
  money,
  dayLabel,
  getPaymentMethodLabel,
  localIsoDate,
  startOfWeekIso,
} from './salesShared';

export type SalesFilter = 'all' | 'today' | 'week' | 'month' | 'debt';

const FILTERS: Array<{ id: SalesFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mes' },
  { id: 'debt', label: 'Debe dinero' },
];

interface SalesHistoryProps {
  rows: SaleRow[];
  isOwner: boolean;
  exchangeRate: number;
  filter: SalesFilter;
  onFilterChange: (f: SalesFilter) => void;
  onRegisterAbono: (row: SaleRow) => void;
  onNewSale: () => void;
}

export const StatusBadge: React.FC<{ status: SaleStatus; due: number }> = ({ status, due }) => {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Pagado
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-amber-50 text-amber-800 border border-amber-200">
        Debe {money(due)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-rose-50 text-rose-700 border border-rose-200">
      Pendiente · Debe {money(due)}
    </span>
  );
};

const timeOf = (row: SaleRow) => row.item.created_at || '';

export const SalesHistory: React.FC<SalesHistoryProps> = ({
  rows,
  isOwner,
  exchangeRate,
  filter,
  onFilterChange,
  onRegisterAbono,
  onNewSale,
}) => {
  const [query, setQuery] = useState('');

  const debtCount = useMemo(() => rows.filter((r) => r.due > 0).length, [rows]);

  const filtered = useMemo(() => {
    const today = localIsoDate();
    const week = startOfWeekIso();
    const month = today.slice(0, 7);
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filter === 'today' && r.date !== today) return false;
        if (filter === 'week' && r.date < week) return false;
        if (filter === 'month' && r.date.slice(0, 7) !== month) return false;
        if (filter === 'debt' && r.due <= 0) return false;
        if (q) {
          const hay = `${r.name} ${r.code} ${r.customer} ${getPaymentMethodLabel(r.method)}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.date === b.date ? timeOf(b).localeCompare(timeOf(a)) : b.date.localeCompare(a.date)));
  }, [rows, filter, query]);

  const groups = useMemo(() => {
    const map = new Map<string, SaleRow[]>();
    filtered.forEach((r) => {
      const arr = map.get(r.date) || [];
      arr.push(r);
      map.set(r.date, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const profitNio = (r: SaleRow) => r.item.net_profit_usd * (r.item.exchange_rate_snapshot || exchangeRate);

  return (
    <div className="space-y-4">
      {/* Filtros rápidos y buscador */}
      <div className="bg-white rounded-2xl border border-nacre-200 p-4 space-y-3 shadow-2xs">
        <div className="relative">
          <Search className="w-5 h-5 text-deepSlate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre del producto, código, cliente o forma de pago..."
            className="w-full pl-12 pr-11 py-3 text-base rounded-xl bg-nacre-50 border border-nacre-200 text-deepSlate-900 placeholder:text-deepSlate-400 focus:outline-none focus:border-coral-500 focus:bg-white"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-deepSlate-400 hover:text-deepSlate-700 hover:bg-nacre-200/60 absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar ventas">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const showDebtBadge = f.id === 'debt' && debtCount > 0;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => onFilterChange(f.id)}
                className={`min-h-[44px] px-4 rounded-full text-sm font-bold border transition-colors inline-flex items-center gap-2 ${
                  active
                    ? 'bg-coral-500 text-white border-coral-500 shadow-2xs'
                    : 'bg-white text-deepSlate-700 border-nacre-300 hover:border-coral-300'
                }`}
              >
                <span>{f.label}</span>
                {showDebtBadge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                      active ? 'bg-white text-coral-600' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {debtCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Estados vacíos */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-nacre-300 p-10 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-coral-50 flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-coral-500" />
          </div>
          <h3 className="text-xl font-extrabold text-deepSlate-900">Todavía no has anotado ventas</h3>
          <p className="text-base text-deepSlate-600 max-w-md mx-auto">
            Cada vez que vendas algo, anótalo aquí. Tus productos se descuentan solos y verás cuánto vendes cada día.
          </p>
          <button
            type="button"
            onClick={onNewSale}
            className="min-h-[52px] px-6 rounded-xl text-base font-extrabold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25"
          >
            Anotar mi primera venta
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-nacre-300 p-10 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-nacre-100 flex items-center justify-center">
            <SearchX className="w-8 h-8 text-deepSlate-400" />
          </div>
          <h3 className="text-xl font-extrabold text-deepSlate-900">
            {filter === 'debt' && !query ? '¡Nadie te debe dinero!' : 'No encontramos ventas con ese filtro'}
          </h3>
          <p className="text-base text-deepSlate-600">
            {filter === 'debt' && !query
              ? 'Todas tus ventas registradas están pagadas por completo.'
              : 'Prueba eligiendo otra fecha o limpiando el texto del buscador.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onFilterChange('all');
            }}
            className="min-h-[48px] px-5 rounded-xl text-base font-bold text-coral-600 bg-coral-50 hover:bg-coral-100"
          >
            Ver todas las ventas
          </button>
        </div>
      ) : (
        groups.map(([date, dayRows]) => {
          const dayTotal = dayRows.reduce((a, r) => a + r.total, 0);
          const dayDue = dayRows.reduce((a, r) => a + r.due, 0);
          const dayProfit = dayRows.reduce((a, r) => a + profitNio(r), 0);
          return (
            <section key={date} className="bg-white rounded-3xl border border-nacre-200 overflow-hidden shadow-2xs">
              <header className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-nacre-50 border-b border-nacre-200">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-extrabold text-deepSlate-900">{dayLabel(date)}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-sm font-semibold bg-white border border-nacre-200 text-deepSlate-600">
                    {dayRows.length} {dayRows.length === 1 ? 'venta' : 'ventas'}
                  </span>
                </div>
                <p className="text-base text-deepSlate-700">
                  Subtotal: <strong className="font-extrabold text-coral-600">{money(dayTotal)}</strong>
                  {dayDue > 0 && (
                    <span className="font-semibold text-amber-700"> · pago pendiente {money(dayDue)}</span>
                  )}
                  {isOwner && (
                    <span className="font-semibold text-emerald-700"> · ganancia {money(dayProfit)}</span>
                  )}
                </p>
              </header>

              {/* Tabla (pantallas grandes) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-deepSlate-600 font-bold border-b border-nacre-100 bg-nacre-50/40">
                    <tr>
                      <th className="py-3.5 px-5">Producto</th>
                      <th className="py-3.5 px-3 text-center">Cantidad</th>
                      <th className="py-3.5 px-3">Cliente</th>
                      <th className="py-3.5 px-3">Cómo pagó</th>
                      <th className="py-3.5 px-3 text-right">Total</th>
                      {isOwner && <th className="py-3.5 px-3 text-right">Ganancia</th>}
                      <th className="py-3.5 px-3">Estado</th>
                      <th className="py-3.5 px-5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nacre-100">
                    {dayRows.map((r) => (
                      <tr key={r.item.id} className="hover:bg-nacre-50/60 transition-colors">
                        <td className="py-3.5 px-5">
                          <span className="block text-base font-bold text-deepSlate-900">{r.name}</span>
                          <span className="block text-sm text-deepSlate-500">Código {r.code}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center text-base font-bold text-deepSlate-900">
                          {r.item.quantity}
                        </td>
                        <td className="py-3.5 px-3 text-base text-deepSlate-700">
                          {r.customer ? (
                            <span className="font-semibold text-deepSlate-800">{r.customer}</span>
                          ) : (
                            <span className="text-deepSlate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-base text-deepSlate-700">
                          {getPaymentMethodLabel(r.method)}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <span className="block text-base font-extrabold text-deepSlate-900">
                            {money(r.total)}
                          </span>
                          {r.item.discount_nio > 0 && (
                            <span className="block text-sm text-rose-600">
                              Desc. -{money(r.item.discount_nio * r.item.quantity)}
                            </span>
                          )}
                        </td>
                        {isOwner && (
                          <td className="py-3.5 px-3 text-right text-base font-bold text-emerald-700">
                            {money(profitNio(r))}
                          </td>
                        )}
                        <td className="py-3.5 px-3">
                          <StatusBadge status={r.status} due={r.due} />
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          {r.due > 0 && (
                            <button
                              type="button"
                              onClick={() => onRegisterAbono(r)}
                              className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-coral-600 bg-coral-50 hover:bg-coral-100 border border-coral-200 whitespace-nowrap inline-flex items-center gap-1.5"
                            >
                              <HandCoins className="w-4 h-4" />
                              <span>Registrar abono</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tarjetas (móvil y tablet) */}
              <ul className="lg:hidden divide-y divide-nacre-100">
                {dayRows.map((r) => (
                  <li key={r.item.id} className="p-4 space-y-2.5 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-extrabold text-deepSlate-900 break-words">{r.name}</p>
                        <p className="text-sm text-deepSlate-500 break-words">
                          {r.item.quantity} {r.item.quantity === 1 ? 'unidad' : 'unidades'} · Código {r.code}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-extrabold text-deepSlate-900">{money(r.total)}</p>
                        {r.item.discount_nio > 0 && (
                          <p className="text-sm text-rose-600">
                            Desc. -{money(r.item.discount_nio * r.item.quantity)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-deepSlate-600">
                      <span className="font-semibold text-deepSlate-700">{getPaymentMethodLabel(r.method)}</span>
                      {r.customer && <span className="break-words">· Cliente: {r.customer}</span>}
                      {isOwner && (
                        <span className="text-emerald-700 font-bold">· Ganancia {money(profitNio(r))}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <StatusBadge status={r.status} due={r.due} />
                      {r.due > 0 && (
                        <button
                          type="button"
                          onClick={() => onRegisterAbono(r)}
                          className="min-h-[44px] px-4 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-coral-600 bg-coral-50 hover:bg-coral-100 border border-coral-200 w-full sm:w-auto"
                        >
                          <HandCoins className="w-4 h-4 shrink-0" />
                          <span>Registrar abono</span>
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
};
