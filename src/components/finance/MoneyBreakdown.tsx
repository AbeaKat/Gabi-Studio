import React from 'react';
import { PieChart } from 'lucide-react';
import { FinanceMetrics, fmtC } from './financeUtils';
import { SectionCard, EmptyState } from './FinanceUI';

export const MoneyBreakdown: React.FC<{ m: FinanceMetrics }> = ({ m }) => {
  const base = m.entroNio;
  const profit = Math.max(0, m.meQuedoNio);
  const loss = m.meQuedoNio < 0;
  // si hay pérdida, la barra muestra costo + gastos sobre el total gastado
  const denom = loss ? m.salioNio : base;

  const parts = [
    { label: 'Costo del producto', value: m.costoNio, color: 'bg-amber-400', dot: 'bg-amber-400', hint: 'Lo que te costó lo que vendiste' },
    { label: 'Gastos', value: m.gastosNio, color: 'bg-sky-400', dot: 'bg-sky-400', hint: 'Publicidad, empaques, envíos, renta…' },
    ...(loss
      ? []
      : [{ label: 'Tu ganancia', value: profit, color: 'bg-emerald-500', dot: 'bg-emerald-500', hint: 'Lo que realmente queda para ti' }]),
  ];

  return (
    <SectionCard
      title="De cada venta: costo del producto, gastos y tu ganancia"
      help="Mira cómo se reparte cada córdoba que cobras para saber a dónde se va tu dinero."
      icon={<PieChart className="w-5 h-5" />}
    >
      {denom <= 0 ? (
        <EmptyState title="Aún no hay nada que repartir" text="Cuando cobres tus primeras ventas verás aquí cuánto es costo, cuánto es gasto y cuánto es tu ganancia." />
      ) : (
        <>
          <p className="text-sm font-bold text-deepSlate-800">De cada C$100 que cobras:</p>
          <div className="flex w-full h-8 rounded-full overflow-hidden bg-nacre-200" role="img" aria-label="Reparto del dinero">
            {parts.map((p) => (
              <div key={p.label} className={p.color} style={{ width: `${(p.value / denom) * 100}%` }} title={p.label} />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {parts.map((p) => (
              <div key={p.label} className="rounded-2xl border border-nacre-200 p-3">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${p.dot}`} />
                  <span className="text-sm font-bold text-deepSlate-900">{p.label}</span>
                </div>
                <p className="text-xl font-extrabold text-deepSlate-900 mt-1">C${((p.value / denom) * 100).toFixed(0)}</p>
                <p className="text-sm text-deepSlate-500">{fmtC(p.value)} · {p.hint}</p>
              </div>
            ))}
          </div>
          {loss && (
            <p className="text-sm text-rose-700 font-semibold">
              Estás gastando más de lo que cobras: te faltan {fmtC(Math.abs(m.meQuedoNio))}. Revisa tus gastos o tus precios.
            </p>
          )}
        </>
      )}
    </SectionCard>
  );
};
