import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { ChevronDown, FileSpreadsheet, Target, BarChart3, Layers, CheckCircle2, AlertTriangle } from 'lucide-react';
import { KardexMovement, OperatingExpense, Product, SalesHeader, SalesItem } from '../../types';
import { getPaymentMethodLabel } from '../sales/QuickSaleModal';
import { EXPENSE_LABELS, FinanceMetrics, fmtC } from './financeUtils';
import { LockedBlock } from './FinanceUI';

interface Props {
  m: FinanceMetrics;
  planTier: number;
  setSimulatedTier: (t: any) => void;
  periodLabel: string;
  businessName: string;
  exchangeRate: number;
  ownerSalaryUsd: number;
  ownerSalaryInput: string;
  onSalaryChange: (v: string) => void;
  products: Product[];
  allSalesItems: SalesItem[];
  salesHeaders: SalesHeader[];
  kardex: KardexMovement[];
  receivableNio: number;
  receivableCount: number;
}

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const DetailedReport: React.FC<Props> = (p) => {
  const { m, planTier, exchangeRate, ownerSalaryUsd } = p;
  const [open, setOpen] = useState(false);
  const [abcTab, setAbcTab] = useState<'A' | 'B' | 'C'>('A');

  // Punto de equilibrio
  const targetUsd = m.gastosUsd + ownerSalaryUsd;
  const progress = targetUsd > 0 ? Math.min(100, (m.grossProfitUsd / targetUsd) * 100) : 100;
  const missingUsd = Math.max(0, targetUsd - m.grossProfitUsd);

  // Matriz ABC (con todas las ventas históricas)
  const perf = p.products.map((pr) => {
    const sales = p.allSalesItems.filter((s) => s.product_id === pr.id || s.sku_snapshot.toUpperCase() === pr.sku.toUpperCase());
    const unitsSold = sales.reduce((a, s) => a + s.quantity, 0);
    const profitUsd = sales.reduce((a, s) => a + s.net_profit_usd, 0);
    const unitCost = Number(pr.landed_cost_usd || pr.base_cost_usd || 0);
    return { product: pr, unitsSold, profitUsd, immobilizedUsd: (pr.stock_current || 0) * unitCost };
  });
  const classA = perf.filter((x) => x.unitsSold > 0).sort((a, b) => b.profitUsd - a.profitUsd || b.unitsSold - a.unitsSold);
  const unsold = perf.filter((x) => x.unitsSold === 0 && x.product.stock_current > 0).sort((a, b) => b.immobilizedUsd - a.immobilizedUsd);
  const cut = Math.max(8, Math.ceil(unsold.length * 0.35));
  const classC = unsold.slice(0, cut);
  const classB = unsold.slice(cut);
  const stagnantUsd = classC.reduce((a, x) => a + x.immobilizedUsd, 0);
  const abcLists = { A: classA, B: classB, C: classC };
  const abcInfo = {
    A: 'Productos estrella: los que más ganancia te dejan.',
    B: 'Productos con stock que aún no se venden.',
    C: 'Dinero parado: mucha plata guardada en productos que no se venden.',
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const capitalUsd = p.products.reduce((a, x) => a + (x.stock_current || 0) * (x.landed_cost_usd || x.base_cost_usd || 0), 0);
    const projUsd = p.products.reduce((a, x) => a + (x.stock_current || 0) * (x.price_usd || 0), 0);
    const projNio = p.products.reduce((a, x) => a + (x.stock_current || 0) * (x.price_nio || 0), 0);
    const r2 = (n: number) => Number(n.toFixed(2));
    const summary = [
      { Concepto: `ESTADO DE RESULTADOS (${p.periodLabel}) — ${p.businessName}`, Monto_USD: '', Equivalente_Cordobas: '', Notas: `Tasa de cambio: C$ ${exchangeRate.toFixed(2)}` },
      { Concepto: '(+) Ventas Brutas a Precio de Lista', Monto_USD: r2(m.grossListSalesNio / exchangeRate), Equivalente_Cordobas: r2(m.grossListSalesNio), Notas: '100% Ingresos de lista' },
      { Concepto: '(-) Descuentos y Promociones Otorgadas', Monto_USD: r2(m.totalDiscountsNio / exchangeRate), Equivalente_Cordobas: r2(m.totalDiscountsNio), Notas: 'Promociones Nivel 2+' },
      { Concepto: '(=) Ventas Netas Efectivas Facturadas', Monto_USD: r2(m.netSalesUsd), Equivalente_Cordobas: r2(m.netSalesNio), Notas: 'Ingresos netos reales' },
      { Concepto: '(-) Costo de Mercadería Vendida (COGS Snapshots)', Monto_USD: r2(m.fullCostUsd), Equivalente_Cordobas: r2(m.fullCostNio), Notas: 'Costo congelado por venta' },
      { Concepto: '(=) Utilidad Bruta Comercial', Monto_USD: r2(m.grossProfitUsd), Equivalente_Cordobas: r2(m.grossProfitNio), Notas: 'Ganancia antes de gastos' },
      { Concepto: '(-) Gastos Operativos', Monto_USD: r2(m.gastosUsd), Equivalente_Cordobas: r2(m.gastosNio), Notas: `${m.expenses.length} gastos registrados` },
      { Concepto: '(-) Pérdidas por Mermas / Daños (Kardex)', Monto_USD: r2(m.shrinkageLossUsd), Equivalente_Cordobas: r2(m.shrinkageLossUsd * exchangeRate), Notas: 'Averías auditadas en bodega' },
      { Concepto: '(=) UTILIDAD NETA LIBRE REAL (EBITDA / P&L)', Monto_USD: r2(m.netOperatingProfitUsd), Equivalente_Cordobas: r2(m.netOperatingProfitNio), Notas: `Margen Neto Libre: ${m.netMarginPercent.toFixed(1)}%` },
      { Concepto: '--- INDICADORES DE BALANCE E INVENTARIO ---', Monto_USD: '', Equivalente_Cordobas: '', Notas: '' },
      { Concepto: 'Capital Activo en Inventario Físico (Al Costo)', Monto_USD: r2(capitalUsd), Equivalente_Cordobas: r2(capitalUsd * exchangeRate), Notas: `${p.products.reduce((a, x) => a + x.stock_current, 0)} unidades disponibles` },
      { Concepto: 'Valor de Venta Proyectado del Inventario', Monto_USD: r2(projUsd), Equivalente_Cordobas: r2(projNio), Notas: 'Proyección a precio de lista' },
      { Concepto: 'Cartera Activa por Cobrar (Créditos / Apartados)', Monto_USD: r2(p.receivableNio / exchangeRate), Equivalente_Cordobas: r2(p.receivableNio), Notas: `${p.receivableCount} cuentas activas` },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), '1_Resumen_PL');

    const salesRows = m.items.map((item) => {
      const hdr = p.salesHeaders.find((h) => h.id === item.sale_header_id);
      const method = item.payment_method || hdr?.payment_method || 'cash_nio';
      return {
        Fecha: hdr?.sale_date || item.created_at.slice(0, 10),
        Modo_Registro: hdr?.entry_mode || 'single_sale',
        SKU: item.sku_snapshot,
        Producto: item.product_name_snapshot || item.sku_snapshot,
        Cliente: item.customer_name || hdr?.customer_name || 'Contado',
        Cantidad: item.quantity,
        Costo_Unit_Snapshot_USD: r2(item.unit_cost_usd_snapshot),
        Costo_Total_COGS_USD: r2(item.unit_cost_usd_snapshot * item.quantity),
        Precio_Lista_Unit_NIO: r2(item.list_price_nio_snapshot),
        Descuento_Unit_NIO: r2(item.discount_nio),
        Total_Facturado_NIO: r2(item.final_unit_price_nio * item.quantity),
        Total_Facturado_USD: r2(item.final_unit_price_usd * item.quantity),
        Tasa_Cambio_Snapshot: r2(item.exchange_rate_snapshot),
        Metodo_Pago: getPaymentMethodLabel(method),
        Estado_Pago: item.payment_status || 'paid',
        Saldo_Pendiente_NIO: r2(item.balance_due_nio || 0),
        Utilidad_Neta_USD: r2(item.net_profit_usd),
        Utilidad_Neta_NIO: r2(item.net_profit_usd * item.exchange_rate_snapshot),
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesRows.length ? salesRows : [{ Mensaje: 'Sin ventas registradas en el periodo' }]), '2_Detalle_Ventas_COGS');

    const expRows = m.expenses.map((e: OperatingExpense) => ({
      Fecha: e.expense_date,
      Categoria: EXPENSE_LABELS[e.category] || e.category,
      Descripcion: e.description,
      Monto_USD: r2(e.amount_usd),
      Monto_Cordobas_NIO: r2(e.amount_nio),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows.length ? expRows : [{ Mensaje: 'Sin gastos operativos registrados en el periodo' }]), '3_Gastos_Operativos');

    const kRows = p.kardex.map((k) => ({
      Fecha: k.created_at.slice(0, 10),
      SKU: k.sku,
      Producto: k.product_name,
      Tipo_Movimiento: k.movement_type,
      Ubicacion_Bodega: k.location,
      Delta_Unidades: k.quantity_delta,
      Stock_Antes: k.stock_before,
      Stock_Despues: k.stock_after,
      Costo_Unitario_USD: r2(k.unit_cost_usd),
      Impacto_Costo_Total_USD: r2(Math.abs(k.quantity_delta) * k.unit_cost_usd),
      Motivo_Auditoria: k.reason,
      Responsable: k.created_by_name,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kRows.length ? kRows : [{ Mensaje: 'Sin movimientos de Kardex o mermas registrados' }]), '4_Kardex_y_Mermas');

    const safe = p.businessName.replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `Paquete_Contable_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const pl: { label: string; usd: number; nio: number; tone?: 'neg' | 'sub' | 'total' }[] = [
    { label: '(+) Ingresos a precio de lista', usd: m.grossListSalesNio / exchangeRate, nio: m.grossListSalesNio },
    { label: '(-) Descuentos y promociones', usd: -m.totalDiscountsNio / exchangeRate, nio: -m.totalDiscountsNio, tone: 'neg' },
    { label: '(=) Ventas netas facturadas', usd: m.netSalesUsd, nio: m.netSalesNio, tone: 'sub' },
    { label: '(-) Costo de mercadería vendida', usd: -m.fullCostUsd, nio: -m.fullCostNio, tone: 'neg' },
    { label: '(=) Utilidad bruta', usd: m.grossProfitUsd, nio: m.grossProfitNio, tone: 'sub' },
    { label: '(-) Gastos operativos', usd: -m.gastosUsd, nio: -m.gastosNio, tone: 'neg' },
    { label: '(-) Mermas y averías de inventario', usd: -m.shrinkageLossUsd, nio: -m.shrinkageLossUsd * exchangeRate, tone: 'neg' },
    { label: '(=) UTILIDAD NETA', usd: m.netOperatingProfitUsd, nio: m.netOperatingProfitNio, tone: 'total' },
  ];

  const h3 = 'text-base font-extrabold text-deepSlate-900';

  return (
    <section className="bg-white rounded-3xl border border-nacre-200 shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-6 text-left hover:bg-nacre-50"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-deepSlate-900 text-white flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-deepSlate-900">Ver reporte detallado (para tu contador)</h2>
            <p className="text-sm text-deepSlate-500">Estado de resultados, meta de salario, análisis de inventario y descarga en Excel.</p>
          </div>
        </div>
        <ChevronDown className={`w-6 h-6 text-deepSlate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-6 border-t border-nacre-200">
          {/* Salario y punto de equilibrio */}
          <div className="pt-6">
            {planTier >= 2 ? (
              <div className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-coral-600 mt-0.5" />
                    <div>
                      <h3 className={h3}>Salario del dueño y punto de equilibrio</h3>
                      <p className="text-sm text-deepSlate-500">Cuánto debes ganar {p.periodLabel} para cubrir tus gastos y pagarte tu salario.</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-3 bg-nacre-50 border border-nacre-200 rounded-2xl px-4 py-2.5 shrink-0">
                    <span className="text-sm font-bold text-deepSlate-700">
                      Mi salario (USD)
                      <span className="block text-sm font-normal text-deepSlate-500">≈ C$ {(ownerSalaryUsd * exchangeRate).toFixed(0)} al mes</span>
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={p.ownerSalaryInput}
                      onChange={(e) => p.onSalaryChange(e.target.value)}
                      className="w-28 px-3 py-2 text-sm font-bold rounded-xl bg-white border border-nacre-300 focus:outline-none focus:border-coral-500"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200">
                    <span className="text-deepSlate-500">Meta a cubrir (gastos + salario)</span>
                    <p className="text-lg font-extrabold text-deepSlate-900">{fmtC(targetUsd * exchangeRate, 2)}</p>
                    <span className="text-deepSlate-500">{usd(m.gastosUsd)} gastos + {usd(ownerSalaryUsd)} salario</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200">
                    <span className="text-deepSlate-500">Ganancia de tus ventas</span>
                    <p className="text-lg font-extrabold text-emerald-700">{fmtC(m.grossProfitNio, 2)}</p>
                    <span className="text-deepSlate-500">{usd(m.grossProfitUsd)} antes de gastos</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${missingUsd <= 0 ? 'bg-emerald-50 border-emerald-200' : progress >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'}`}>
                    <span className="text-deepSlate-600">{missingUsd <= 0 ? 'Te sobra después de todo' : 'Te falta para cubrir todo'}</span>
                    <p className="text-lg font-extrabold text-deepSlate-900">
                      {missingUsd <= 0 ? fmtC((m.grossProfitUsd - targetUsd) * exchangeRate, 2) : fmtC(missingUsd * exchangeRate, 2)}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="w-full h-3.5 rounded-full bg-nacre-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${progress >= 100 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.max(4, progress)}%` }}
                    />
                  </div>
                  <p className="text-sm text-deepSlate-700 mt-2 flex items-center gap-2">
                    {progress >= 100 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    {progress >= 100
                      ? '¡Ya cubriste tus gastos y tu salario! Lo que vendas de más es ganancia libre.'
                      : `Llevas ${progress.toFixed(0)}% de la meta.`}
                  </p>
                </div>
              </div>
            ) : (
              <LockedBlock
                title="Salario del dueño y punto de equilibrio"
                what="Te dice cuánto necesitas ganar cada mes para cubrir tus gastos y pagarte un sueldo."
                planName="Crece"
                onTry={() => p.setSimulatedTier(2)}
              />
            )}
          </div>

          {/* P&L */}
          {planTier >= 3 ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div>
                    <h3 className={h3}>Estado de resultados (P&L)</h3>
                    <p className="text-sm text-deepSlate-500">Resumen contable de ventas, costos, gastos y mermas {p.periodLabel}.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-800">Margen neto: {m.netMarginPercent.toFixed(1)}%</span>
                  <button type="button" onClick={handleExport} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700">
                    <FileSpreadsheet className="w-4 h-4" /> Descargar Excel
                  </button>
                </div>
              </div>
              <div className="hidden md:block overflow-x-auto border border-nacre-200 rounded-2xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-nacre-100 text-deepSlate-600 font-bold">
                    <tr>
                      <th className="py-3 px-4">Concepto</th>
                      <th className="py-3 px-4 text-right">USD</th>
                      <th className="py-3 px-4 text-right">Córdobas</th>
                      <th className="py-3 px-4 text-right">% de ventas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nacre-100">
                    {pl.map((r) => (
                      <tr key={r.label} className={r.tone === 'total' ? 'bg-emerald-100/70 font-extrabold' : r.tone === 'sub' ? 'bg-nacre-50 font-bold' : ''}>
                        <td className={`py-3.5 px-4 ${r.tone === 'neg' ? 'text-rose-700' : 'text-deepSlate-900'}`}>{r.label}</td>
                        <td className="py-3.5 px-4 text-right font-mono">{r.usd < 0 ? '-' : ''}{usd(Math.abs(r.usd))}</td>
                        <td className="py-3.5 px-4 text-right font-mono">{r.nio < 0 ? '-' : ''}{fmtC(Math.abs(r.nio), 2)}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-deepSlate-500">{m.netSalesUsd > 0 ? `${((r.usd / m.netSalesUsd) * 100).toFixed(1)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="md:hidden space-y-2">
                {pl.map((r) => (
                  <li
                    key={r.label}
                    className={`rounded-2xl border border-nacre-200 p-3.5 flex items-center justify-between gap-2 text-sm ${
                      r.tone === 'total' ? 'bg-emerald-100/70 font-extrabold' : r.tone === 'sub' ? 'bg-nacre-50 font-bold' : ''
                    }`}
                  >
                    <span className={r.tone === 'neg' ? 'text-rose-700' : 'text-deepSlate-900'}>{r.label}</span>
                    <span className="text-right font-mono shrink-0">
                      <span className="block">{r.nio < 0 ? '-' : ''}{fmtC(Math.abs(r.nio), 2)}</span>
                      <span className="block text-deepSlate-500">{r.usd < 0 ? '-' : ''}{usd(Math.abs(r.usd))}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <LockedBlock
              title="Estado de resultados y Excel para tu contador"
              what="Un resumen contable completo y un archivo de 4 hojas listo para entregar a tu contador."
              planName="Pro"
              onTry={() => p.setSimulatedTier(3)}
            />
          )}

          {/* ABC */}
          {planTier >= 3 ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Layers className="w-5 h-5 text-coral-600 mt-0.5" />
                <div>
                  <h3 className={h3}>Productos estrella vs. dinero parado (análisis ABC)</h3>
                  <p className="text-sm text-deepSlate-500">
                    Con todas tus ventas. Tienes <strong>{usd(stagnantUsd)}</strong> parados en productos que no se venden · {classA.filter((x) => x.product.stock_current <= 2).length} estrella(s) por reponer.
                  </p>
                </div>
              </div>
              <div className="inline-flex gap-1 p-1 rounded-2xl bg-nacre-100 border border-nacre-200">
                {(['A', 'B', 'C'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAbcTab(t)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold ${abcTab === t ? 'bg-white text-coral-600 border border-nacre-200' : 'text-deepSlate-600'}`}
                  >
                    {t === 'A' ? 'Estrella' : t === 'B' ? 'Sin rotación' : 'Dinero parado'} ({abcLists[t].length})
                  </button>
                ))}
              </div>
              <p className="text-sm text-deepSlate-600">{abcInfo[abcTab]}</p>
              {abcLists[abcTab].length === 0 ? (
                <p className="text-sm text-deepSlate-500 p-4 rounded-2xl bg-nacre-50 border border-nacre-200">No hay productos en este grupo.</p>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto border border-nacre-200 rounded-2xl max-h-96">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-nacre-100 text-deepSlate-600 font-bold sticky top-0">
                        <tr>
                          <th className="py-3 px-4">Producto</th>
                          <th className="py-3 px-4 text-right">En stock</th>
                          <th className="py-3 px-4 text-right">Vendidos</th>
                          <th className="py-3 px-4 text-right">{abcTab === 'A' ? 'Ganancia' : 'Dinero parado'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-nacre-100">
                        {abcLists[abcTab].map((x) => (
                          <tr key={x.product.id}>
                            <td className="py-3.5 px-4"><span className="font-semibold text-deepSlate-900">{x.product.name}</span> <span className="text-sm text-deepSlate-500">{x.product.sku}</span></td>
                            <td className="py-3.5 px-4 text-right">{x.product.stock_current}</td>
                            <td className="py-3.5 px-4 text-right">{x.unitsSold}</td>
                            <td className="py-3.5 px-4 text-right font-bold">{abcTab === 'A' ? usd(x.profitUsd) : usd(x.immobilizedUsd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ul className="md:hidden space-y-2 max-h-96 overflow-y-auto">
                    {abcLists[abcTab].map((x) => (
                      <li key={x.product.id} className="rounded-2xl border border-nacre-200 p-3.5 text-sm space-y-1">
                        <p className="font-bold text-deepSlate-900">{x.product.name} <span className="font-normal text-deepSlate-500">({x.product.sku})</span></p>
                        <div className="flex justify-between text-deepSlate-600">
                          <span>En stock: <strong>{x.product.stock_current}</strong> · Vendidos: <strong>{x.unitsSold}</strong></span>
                          <strong className="text-deepSlate-900">{abcTab === 'A' ? usd(x.profitUsd) : usd(x.immobilizedUsd)}</strong>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : (
            <LockedBlock
              title="Productos estrella vs. dinero parado"
              what="Detecta cuáles productos te hacen ganar y cuáles tienen tu dinero guardado sin venderse."
              planName="Pro"
              onTry={() => p.setSimulatedTier(3)}
            />
          )}
        </div>
      )}
    </section>
  );
};
