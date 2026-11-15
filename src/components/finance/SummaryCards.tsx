import React from 'react';
import { ArrowDownCircle, ArrowUpCircle, PiggyBank } from 'lucide-react';
import { FinanceMetrics, fmtC } from './financeUtils';

export const SummaryCards: React.FC<{ m: FinanceMetrics; periodLabel: string; pendingNio: number }> = ({ m, periodLabel, pendingNio }) => {
  const positive = m.meQuedoNio >= 0;
  const hasSales = m.entroNio > 0;
  const pct = Math.abs(m.centavosPorCien);

  let phrase: string;
  if (!hasSales && m.gastosNio === 0) phrase = `Todavía no hay movimientos ${periodLabel}.`;
  else if (!hasSales) phrase = `${periodLabel[0].toUpperCase() + periodLabel.slice(1)} solo hay gastos, aún no has cobrado ventas.`;
  else if (positive) phrase = `Por cada C$100 que vendes te quedan C$${pct.toFixed(0)}.`;
  else phrase = `Cuidado: por cada C$100 que vendes estás perdiendo C$${pct.toFixed(0)}.`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-3xl bg-white border border-nacre-200 p-5 shadow-xs">
        <div className="flex items-center gap-2 text-deepSlate-600">
          <ArrowDownCircle className="w-5 h-5 text-sky-600" />
          <span className="text-sm font-bold">Entró</span>
        </div>
        <p className="text-3xl font-extrabold text-deepSlate-900 mt-2">{fmtC(m.entroNio)}</p>
        <p className="text-sm text-deepSlate-500 mt-1">Ventas que ya cobraste.</p>
        {pendingNio > 0 && <p className="text-sm text-amber-700 mt-1">Aparte, te deben {fmtC(pendingNio)}.</p>}
      </div>

      <div className="rounded-3xl bg-white border border-nacre-200 p-5 shadow-xs">
        <div className="flex items-center gap-2 text-deepSlate-600">
          <ArrowUpCircle className="w-5 h-5 text-amber-600" />
          <span className="text-sm font-bold">Salió</span>
        </div>
        <p className="text-3xl font-extrabold text-deepSlate-900 mt-2">{fmtC(m.salioNio)}</p>
        <p className="text-sm text-deepSlate-500 mt-1">
          Costo de lo que vendiste ({fmtC(m.costoNio)}) + gastos ({fmtC(m.gastosNio)}).
        </p>
      </div>

      <div className={`rounded-3xl border p-5 shadow-xs ${positive ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
        <div className={`flex items-center gap-2 ${positive ? 'text-emerald-800' : 'text-rose-800'}`}>
          <PiggyBank className="w-5 h-5" />
          <span className="text-sm font-bold">Me quedó</span>
        </div>
        <p className={`text-3xl font-extrabold mt-2 ${positive ? 'text-emerald-700' : 'text-rose-600'}`}>
          {positive ? '' : '-'}
          {fmtC(Math.abs(m.meQuedoNio))}
        </p>
        <p className={`text-sm font-semibold mt-1 ${positive ? 'text-emerald-800' : 'text-rose-700'}`}>{phrase}</p>
      </div>
    </div>
  );
};
