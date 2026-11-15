import React from 'react';
import { Trophy, AlertTriangle } from 'lucide-react';
import { ProductRow, fmtC } from './financeUtils';
import { SectionCard, EmptyState } from './FinanceUI';

export const TopProducts: React.FC<{ rows: ProductRow[]; periodLabel: string }> = ({ rows, periodLabel }) => {
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.profitNio)));
  const lossCount = rows.filter((r) => r.profitNio < 0).length;

  return (
    <SectionCard
      title="Qué productos me dejan más"
      help="Ordenados de los que más ganancia dejan a los que menos; los que pierden dinero salen marcados."
      icon={<Trophy className="w-5 h-5" />}
    >
      {rows.length === 0 ? (
        <EmptyState title={`Sin ventas ${periodLabel}`} text="Cuando vendas algo, aquí verás qué productos te dejan más ganancia." />
      ) : (
        <>
          {lossCount > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {lossCount === 1 ? '1 producto te está dando pérdida' : `${lossCount} productos te están dando pérdida`}: vendes por menos de lo que te cuesta. Revisa su precio.
              </span>
            </div>
          )}

          <div className="hidden md:block overflow-x-auto border border-nacre-200 rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-nacre-100 text-deepSlate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4 text-right">Vendidos</th>
                  <th className="py-3 px-4 text-right">Vendí</th>
                  <th className="py-3 px-4 text-right">Me quedó</th>
                  <th className="py-3 px-4 w-48">Comparación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nacre-100">
                {rows.map((r) => {
                  const loss = r.profitNio < 0;
                  return (
                    <tr key={r.key} className={loss ? 'bg-rose-50/60' : 'hover:bg-nacre-50/60'}>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-deepSlate-900 block">{r.name}</span>
                        <span className="text-sm text-deepSlate-500">{r.sku}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-deepSlate-700">{r.units}</td>
                      <td className="py-3.5 px-4 text-right text-deepSlate-700">{fmtC(r.revenueNio)}</td>
                      <td className={`py-3.5 px-4 text-right font-extrabold ${loss ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {loss ? '-' : ''}
                        {fmtC(Math.abs(r.profitNio))}
                        {loss && <span className="block text-sm font-bold">¡Pierdes dinero!</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-3 rounded-full bg-nacre-200 overflow-hidden">
                          <div className={`h-full rounded-full ${loss ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(3, (Math.abs(r.profitNio) / maxAbs) * 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden space-y-2">
            {rows.map((r) => {
              const loss = r.profitNio < 0;
              return (
                <li key={r.key} className={`rounded-2xl border p-3.5 space-y-2 ${loss ? 'bg-rose-50 border-rose-200' : 'border-nacre-200'}`}>
                  <p className="text-sm font-extrabold text-deepSlate-900">{r.name}</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div><span className="block text-sm text-deepSlate-500">Vendidos</span><strong>{r.units}</strong></div>
                    <div><span className="block text-sm text-deepSlate-500">Vendí</span><strong>{fmtC(r.revenueNio)}</strong></div>
                    <div><span className="block text-sm text-deepSlate-500">Me quedó</span><strong className={loss ? 'text-rose-600' : 'text-emerald-700'}>{loss ? '-' : ''}{fmtC(Math.abs(r.profitNio))}</strong></div>
                  </div>
                  <div className="h-2.5 rounded-full bg-nacre-200 overflow-hidden">
                    <div className={`h-full rounded-full ${loss ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(3, (Math.abs(r.profitNio) / maxAbs) * 100)}%` }} />
                  </div>
                  {loss && <p className="text-sm font-bold text-rose-700">¡Pierdes dinero con este producto!</p>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </SectionCard>
  );
};
