import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  TrendingUp,
  DollarSign,
  Coins,
  Package,
  ShieldAlert,
  Lock,
  Plus,
  Trash2,
  Receipt,
  BarChart3,
  FileSpreadsheet,
  ArrowUpRight,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  Product,
  Batch,
  SalesItem,
  OperatingExpense,
  KardexMovement,
} from '../types';
import {
  getStoredProducts,
  getStoredBatches,
  getStoredSalesItems,
  getStoredExpenses,
  saveStoredExpenses,
  getStoredKardex,
  TENANT_STELLA_ID,
} from '../data/realInventoryData';

const EXPENSE_CATEGORIES: Record<OperatingExpense['category'], string> = {
  publicidad: 'Publicidad & Redes Sociales',
  empaque: 'Empaque, Bolsas & Presentación',
  envio_local: 'Delivery & Envíos Locales',
  renta_servicios: 'Local, Renta & Servicios',
  comisiones: 'Comisiones Bancarias / POS',
  otros: 'Otros Gastos Operativos',
};

export const FinancePage: React.FC = () => {
  const { tenant, planTier, role, setSimulatedRole, setSimulatedTier } = useAuth();
  const exchangeRate = Number(tenant?.exchange_rate_nio || 36.62);

  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [kardex, setKardex] = useState<KardexMovement[]>([]);

  // New Expense Form (Tier 2+)
  const [expCategory, setExpCategory] = useState<OperatingExpense['category']>('publicidad');
  const [expDesc, setExpDesc] = useState('');
  const [expAmountUsd, setExpAmountUsd] = useState('');

  const loadFinanceData = () => {
    setProducts(getStoredProducts());
    setBatches(getStoredBatches());
    setSalesItems(getStoredSalesItems());
    setExpenses(getStoredExpenses());
    setKardex(getStoredKardex());
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  // Restrict Sellers from seeing Financial Dashboard
  if (role === 'seller') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
          Acceso Restringido • Rol Vendedor
        </span>
        <h2 className="text-2xl font-extrabold text-deepSlate-900 mt-3 mb-2">
          Módulo Confidencial de Dirección Financiera
        </h2>
        <p className="text-xs sm:text-sm text-deepSlate-500 leading-relaxed mb-6">
          El perfil de <strong>Vendedor</strong> tiene bloqueado el acceso a costos de importación, márgenes brutos, recuperación de lotes y estados de resultados.
        </p>
        <button
          onClick={() => setSimulatedRole('global_owner')}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25"
        >
          Simular Cambio a Modo Dueño
        </button>
      </div>
    );
  }

  // ==========================================================================
  // NIVEL 1: LIVE KPI CALCULATIONS
  // ==========================================================================
  const capitalInStockUsd = products.reduce(
    (acc, p) => acc + (p.stock_current || 0) * (p.landed_cost_usd || p.base_cost_usd || 0),
    0
  );
  const capitalInStockNio = capitalInStockUsd * exchangeRate;

  const projectedSalesUsd = products.reduce(
    (acc, p) => acc + (p.stock_current || 0) * (p.price_usd || 0),
    0
  );
  const projectedSalesNio = products.reduce(
    (acc, p) => acc + (p.stock_current || 0) * (p.price_nio || 0),
    0
  );

  const grossListSalesNio = salesItems.reduce(
    (acc, i) => acc + i.list_price_nio_snapshot * i.quantity,
    0
  );
  const totalDiscountsNio = salesItems.reduce(
    (acc, i) => acc + i.discount_nio * i.quantity,
    0
  );
  const netSalesNio = salesItems.reduce(
    (acc, i) => acc + i.final_unit_price_nio * i.quantity,
    0
  );
  const netSalesUsd = salesItems.reduce(
    (acc, i) => acc + i.final_unit_price_usd * i.quantity,
    0
  );

  const recoveredCostUsd = salesItems.reduce(
    (acc, i) => acc + i.unit_cost_usd_snapshot * i.quantity,
    0
  );
  const recoveredCostNio = recoveredCostUsd * exchangeRate;

  const grossProfitUsd = salesItems.reduce((acc, i) => acc + i.net_profit_usd, 0);
  const grossProfitNio = grossProfitUsd * exchangeRate;

  // ==========================================================================
  // NIVEL 2: OPERATING EXPENSES & BATCH RECOVERY
  // ==========================================================================
  const totalExpensesUsd = expenses.reduce((acc, e) => acc + e.amount_usd, 0);
  const totalExpensesNio = expenses.reduce((acc, e) => acc + e.amount_nio, 0);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const usd = parseFloat(expAmountUsd);
    if (!expDesc.trim() || isNaN(usd) || usd <= 0) return;

    const newExp: OperatingExpense = {
      id: `exp-${Date.now()}`,
      tenant_id: tenant?.id || TENANT_STELLA_ID,
      category: expCategory,
      description: expDesc.trim(),
      amount_usd: Math.round(usd * 100) / 100,
      amount_nio: Math.round(usd * exchangeRate * 100) / 100,
      expense_date: new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    };

    const updated = [newExp, ...expenses];
    setExpenses(updated);
    saveStoredExpenses(updated);
    setExpDesc('');
    setExpAmountUsd('');
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    saveStoredExpenses(updated);
  };

  // ==========================================================================
  // NIVEL 3: SHRINKAGE (MERMAS) & MONTHLY P&L STATEMENT
  // ==========================================================================
  const shrinkageLossUsd = kardex
    .filter((k) => k.movement_type === 'merma_dano')
    .reduce((acc, k) => acc + Math.abs(k.quantity_delta) * k.unit_cost_usd, 0);

  const netOperatingProfitUsd = grossProfitUsd - totalExpensesUsd - shrinkageLossUsd;
  const netOperatingProfitNio = netOperatingProfitUsd * exchangeRate;
  const netMarginPercent = netSalesUsd > 0 ? (netOperatingProfitUsd / netSalesUsd) * 100 : 0;

  const handleExportPL = () => {
    const rows = [
      { Concepto: '(+) Ventas Brutas a Precio de Lista', USD: (grossListSalesNio / exchangeRate).toFixed(2), Cordobas: grossListSalesNio.toFixed(2) },
      { Concepto: '(-) Descuentos y Promociones Otorgadas', USD: (totalDiscountsNio / exchangeRate).toFixed(2), Cordobas: totalDiscountsNio.toFixed(2) },
      { Concepto: '(=) Ventas Netas Efectivas', USD: netSalesUsd.toFixed(2), Cordobas: netSalesNio.toFixed(2) },
      { Concepto: '(-) Costo de Mercadería Vendida (COGS Snapshots)', USD: recoveredCostUsd.toFixed(2), Cordobas: recoveredCostNio.toFixed(2) },
      { Concepto: '(=) Utilidad Bruta Comercial', USD: grossProfitUsd.toFixed(2), Cordobas: grossProfitNio.toFixed(2) },
      { Concepto: '(-) Gastos Operativos del Mes', USD: totalExpensesUsd.toFixed(2), Cordobas: totalExpensesNio.toFixed(2) },
      { Concepto: '(-) Pérdidas por Mermas / Daños (Kardex)', USD: shrinkageLossUsd.toFixed(2), Cordobas: (shrinkageLossUsd * exchangeRate).toFixed(2) },
      { Concepto: '(=) UTILIDAD NETA LIBRE REAL (P&L)', USD: netOperatingProfitUsd.toFixed(2), Cordobas: netOperatingProfitNio.toFixed(2) },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estado_Resultados_PL');
    XLSX.writeFile(wb, `Estado_Resultados_StellaGeorgina_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900 tracking-tight">
              Dashboard Financiero & Rentabilidad Real
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-coral-50 text-coral-600 border border-coral-200">
              Nivel {planTier} Activo
            </span>
          </div>
          <p className="text-xs sm:text-sm text-deepSlate-500 mt-1">
            Métricas exactas calculadas a partir de tu inventario físico y los snapshots congelados en cada salida.
          </p>
        </div>

        {planTier >= 3 && (
          <button
            onClick={handleExportPL}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-nacre-100 text-deepSlate-800 border border-nacre-200 shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar P&L a Excel</span>
          </button>
        )}
      </div>

      {/* ==================================================================== */}
      {/* NIVEL 1: 5 CORE KPI CARDS                                            */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* 1. Capital en Mercadería */}
        <div className="bg-white rounded-2xl border border-nacre-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-deepSlate-400">
              1. Capital en Stock
            </span>
            <Package className="w-4 h-4 text-deepSlate-500" />
          </div>
          <p className="text-xl font-mono font-extrabold text-deepSlate-900">
            ${capitalInStockUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] font-mono text-deepSlate-500 block mt-0.5">
            C$ {capitalInStockNio.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* 2. Valor de Venta Proyectado */}
        <div className="bg-white rounded-2xl border border-nacre-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-coral-600">
              2. Venta Proyectada
            </span>
            <Coins className="w-4 h-4 text-coral-500" />
          </div>
          <p className="text-xl font-mono font-extrabold text-coral-600">
            C$ {projectedSalesNio.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] font-mono text-deepSlate-500 block mt-0.5">
            ≈ ${projectedSalesUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </span>
        </div>

        {/* 3. Ventas del Periodo */}
        <div className="bg-white rounded-2xl border border-nacre-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-deepSlate-400">
              3. Ventas del Periodo
            </span>
            <ArrowUpRight className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl font-mono font-extrabold text-deepSlate-900">
            C$ {netSalesNio.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] font-mono text-deepSlate-500 block mt-0.5">
            ${netSalesUsd.toFixed(2)} USD cobrados
          </span>
        </div>

        {/* 4. Costo Recuperado */}
        <div className="bg-white rounded-2xl border border-nacre-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-deepSlate-400">
              4. Costo Recuperado
            </span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-mono font-extrabold text-deepSlate-900">
            ${recoveredCostUsd.toFixed(2)}
          </p>
          <span className="text-[11px] font-mono text-deepSlate-500 block mt-0.5">
            C$ {recoveredCostNio.toFixed(2)} retorno capital
          </span>
        </div>

        {/* 5. Ganancia Libre Real (Bruta) */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 rounded-2xl border border-emerald-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
              5. Ganancia Bruta Real
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-mono font-extrabold text-emerald-600">
            +${grossProfitUsd.toFixed(2)} USD
          </p>
          <span className="text-[11px] font-mono font-bold text-emerald-800 block mt-0.5">
            +C$ {grossProfitNio.toFixed(2)} libres
          </span>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* NIVEL 2: BATCH INVESTMENT RECOVERY BARS & OPERATING EXPENSES         */}
      {/* ==================================================================== */}
      {planTier >= 2 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Batch Investment Recovery Progress Bars */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-nacre-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-deepSlate-900">
                    Recuperación de Inversión por Lote (Nivel 2)
                  </h3>
                  <p className="text-xs text-deepSlate-500">
                    Compara la inversión inicial de cada lote contra el efectivo ya recuperado en ventas
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-coral-50 text-coral-600 border border-coral-200">
                ROI por Colección
              </span>
            </div>

            <div className="space-y-4">
              {batches.map((b) => {
                const batchProds = products.filter((p) => p.batch_id === b.id);
                const currentStockCost = batchProds.reduce(
                  (acc, p) => acc + p.stock_current * (p.landed_cost_usd || p.base_cost_usd || 0),
                  0
                );
                const batchSales = salesItems.filter(
                  (s) =>
                    s.batch_id_snapshot === b.id ||
                    batchProds.some((p) => p.id === s.product_id || p.sku === s.sku_snapshot)
                );
                const revenueFromBatchUsd = batchSales.reduce(
                  (acc, s) => acc + s.final_unit_price_usd * s.quantity,
                  0
                );
                const soldCostUsd = batchSales.reduce(
                  (acc, s) => acc + s.unit_cost_usd_snapshot * s.quantity,
                  0
                );
                const totalBatchInvestment = Math.max(
                  b.total_batch_investment_usd || 0,
                  currentStockCost + soldCostUsd
                );
                const recoveryPct =
                  totalBatchInvestment > 0
                    ? Math.min(100, (revenueFromBatchUsd / totalBatchInvestment) * 100)
                    : 0;

                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl bg-nacre-50/70 border border-nacre-200 space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <span className="font-extrabold text-deepSlate-900">{b.name}</span>
                      <div className="flex items-center space-x-3 font-mono">
                        <span className="text-deepSlate-500">
                          Inversión: <strong>${totalBatchInvestment.toFixed(2)}</strong>
                        </span>
                        <span className="text-coral-600 font-bold">
                          Vendido: ${revenueFromBatchUsd.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-3 rounded-full bg-nacre-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          recoveryPct >= 100
                            ? 'bg-emerald-500'
                            : recoveryPct >= 30
                            ? 'bg-coral-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.max(4, recoveryPct)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-deepSlate-500">
                      <span>
                        {recoveryPct >= 100 ? (
                          <strong className="text-emerald-700 inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>¡Lote 100% recuperado! Todo lo demás es ganancia libre.</span>
                          </strong>
                        ) : (
                          `Faltan $${Math.max(0, totalBatchInvestment - revenueFromBatchUsd).toFixed(2)} USD para punto de equilibrio del lote`
                        )}
                      </span>
                      <span className="font-mono font-bold text-deepSlate-800">
                        {recoveryPct.toFixed(1)}% recuperado
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operating Expenses Registry */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-nacre-200 p-6 shadow-xs flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-deepSlate-900">
                      Gastos Operativos (Nivel 2)
                    </h3>
                    <p className="text-xs text-deepSlate-500">
                      Publicidad, empaque, envíos y comisiones
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                  -${totalExpensesUsd.toFixed(2)} USD
                </span>
              </div>

              {/* Add Expense Form */}
              <form
                onSubmit={handleAddExpense}
                className="p-3.5 rounded-2xl bg-nacre-50 border border-nacre-200 space-y-3"
              >
                <div className="grid grid-cols-2 gap-2.5">
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as OperatingExpense['category'])}
                    className="px-2.5 py-2 text-xs font-semibold rounded-xl bg-white border border-nacre-200"
                  >
                    {Object.entries(EXPENSE_CATEGORIES).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <div className="relative">
                    <span className="text-xs font-mono text-deepSlate-400 absolute left-3 top-1/2 -translate-y-1/2">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      placeholder="Monto USD"
                      value={expAmountUsd}
                      onChange={(e) => setExpAmountUsd(e.target.value)}
                      className="w-full pl-7 pr-2.5 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-nacre-200"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Descripción (ej. Pauta Instagram, Bolsas regalo)..."
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-white border border-nacre-200"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 flex items-center space-x-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Registrar</span>
                  </button>
                </div>
              </form>

              {/* Expenses List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-nacre-100 border border-nacre-200 rounded-2xl">
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3 flex items-center justify-between text-xs hover:bg-nacre-50/60"
                  >
                    <div className="pr-2">
                      <span className="font-bold text-deepSlate-800 block">{exp.description}</span>
                      <span className="text-[10px] text-deepSlate-400">
                        {EXPENSE_CATEGORIES[exp.category]} • {exp.expense_date}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0 font-mono">
                      <div className="text-right">
                        <span className="font-bold text-rose-600 block">
                          -${exp.amount_usd.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-deepSlate-400">
                          C$ {exp.amount_nio.toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 text-deepSlate-300 hover:text-rose-600"
                        title="Eliminar gasto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-nacre-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-coral-50 border border-coral-200 text-coral-500 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-coral-50 text-coral-600">
                Módulo Nivel 2 (Crecimiento)
              </span>
              <h3 className="text-base font-extrabold text-deepSlate-900 mt-1">
                Recuperación de Inversión por Lote & Control de Gastos Operativos
              </h3>
              <p className="text-xs text-deepSlate-500">
                Activa el Nivel 2 para visualizar qué porcentaje de cada colección ya recuperaste y descontar gastos operativos.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSimulatedTier(2)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shrink-0 shadow-sm"
          >
            Probar en Nivel 2 Ahora
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* NIVEL 3: MONTHLY P&L STATEMENT (ESTADO DE RESULTADOS)                */}
      {/* ==================================================================== */}
      {planTier >= 3 ? (
        <div className="bg-white rounded-3xl border border-nacre-200 shadow-xs overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-indigo-50/70 via-white to-coral-50/50 border-b border-nacre-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-deepSlate-900">
                  Estado de Resultados Mensual (P&L) — Nivel 3 ERP
                </h3>
                <p className="text-xs text-deepSlate-500">
                  Conciliación contable automática: Ingresos Brutos, Descuentos, Costo de Venta (Snapshots), Gastos y Mermas de Kardex.
                </p>
              </div>
            </div>
            <span className="font-mono text-xs font-extrabold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              Margen Neto Libre: {netMarginPercent.toFixed(1)}%
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-nacre-50 border-b border-nacre-200 text-deepSlate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-6">Concepto Financiero</th>
                  <th className="py-3 px-6 text-right">Monto ($ USD)</th>
                  <th className="py-3 px-6 text-right">Equivalente (C$ Córdobas)</th>
                  <th className="py-3 px-6 text-right">% sobre Ventas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nacre-100 font-mono">
                <tr>
                  <td className="py-3 px-6 font-sans font-semibold text-deepSlate-800">
                    (+) Ingresos Brutos a Precio de Lista
                  </td>
                  <td className="py-3 px-6 text-right text-deepSlate-700">
                    ${(grossListSalesNio / exchangeRate).toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-right text-deepSlate-700">
                    C$ {grossListSalesNio.toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-right text-deepSlate-400">100.0%</td>
                </tr>

                <tr>
                  <td className="py-3 px-6 font-sans text-rose-600">
                    (-) Descuentos y Promociones Aplicadas
                  </td>
                  <td className="py-3 px-6 text-right text-rose-600">
                    -${(totalDiscountsNio / exchangeRate).toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-right text-rose-600">
                    -C$ {totalDiscountsNio.toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-right text-rose-500">
                    {grossListSalesNio > 0
                      ? `-${((totalDiscountsNio / grossListSalesNio) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </td>
                </tr>

                <tr className="bg-nacre-50/80 font-bold">
                  <td className="py-3 px-6 font-sans text-deepSlate-900">
                    (=) Ventas Netas Efectivas Cobradas
                  </td>
                  <td className="py-3 px-6 text-right text-deepSlate-900">
                    ${netSalesUsd.toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-right text-coral-600">
                    C$ {netSalesNio.toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-right text-deepSlate-700">100.0%</td>
                </tr>

                <tr>
                  <td className="py-3 px-6 font-sans text-deepSlate-600">
                    (-) Costo de Mercadería Vendida (COGS Snapshots Inmutables)
                  </td>
                  <td className="py-3 px-6 text-right text-deepSlate-700">
                    -${recoveredCostUsd.toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-right text-deepSlate-700">
                    -C$ {recoveredCostNio.toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-right text-deepSlate-500">
                    {netSalesUsd > 0 ? `-${((recoveredCostUsd / netSalesUsd) * 100).toFixed(1)}%` : '0.0%'}
                  </td>
                </tr>

                <tr className="bg-emerald-50/40 font-bold">
                  <td className="py-3 px-6 font-sans text-emerald-900">
                    (=) Utilidad Bruta Comercial
                  </td>
                  <td className="py-3 px-6 text-right text-emerald-700">
                    +${grossProfitUsd.toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-right text-emerald-700">
                    +C$ {grossProfitNio.toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-right text-emerald-700">
                    {netSalesUsd > 0 ? `+${((grossProfitUsd / netSalesUsd) * 100).toFixed(1)}%` : '0.0%'}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-6 font-sans text-rose-700">
                    (-) Gastos Operativos del Periodo (Publicidad, Empaque, Delivery)
                  </td>
                  <td className="py-3 px-6 text-right text-rose-600">
                    -${totalExpensesUsd.toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-right text-rose-600">
                    -C$ {totalExpensesNio.toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-right text-rose-500">
                    {netSalesUsd > 0 ? `-${((totalExpensesUsd / netSalesUsd) * 100).toFixed(1)}%` : '0.0%'}
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-6 font-sans text-rose-700">
                    (-) Mermas y Averías de Inventario (Kardex Nivel 3)
                  </td>
                  <td className="py-3 px-6 text-right text-rose-600">
                    -${shrinkageLossUsd.toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-right text-rose-600">
                    -C$ {(shrinkageLossUsd * exchangeRate).toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-right text-rose-500">
                    {netSalesUsd > 0 ? `-${((shrinkageLossUsd / netSalesUsd) * 100).toFixed(1)}%` : '0.0%'}
                  </td>
                </tr>

                <tr className="bg-emerald-100/70 border-t-2 border-emerald-300 text-sm font-extrabold">
                  <td className="py-4 px-6 font-sans text-emerald-950">
                    (=) UTILIDAD NETA LIBRE REAL (EBITDA / BOLSILLO)
                  </td>
                  <td className="py-4 px-6 text-right text-emerald-800">
                    ${netOperatingProfitUsd.toFixed(2)} USD
                  </td>
                  <td className="py-4 px-6 text-right text-emerald-900">
                    C$ {netOperatingProfitNio.toFixed(2)}
                  </td>
                  <td className="py-4 px-6 text-right text-emerald-900">
                    {netMarginPercent.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-nacre-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                Módulo Nivel 3 (ERP Completo)
              </span>
              <h3 className="text-base font-extrabold text-deepSlate-900 mt-1">
                Estado de Resultados Mensual (P&L) & Descuento de Mermas
              </h3>
              <p className="text-xs text-deepSlate-500">
                Activa el Nivel 3 para consolidar Ventas Netas, COGS, Gastos Operativos y Mermas de Kardex en un reporte contable descargable.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSimulatedTier(3)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shrink-0 shadow-sm"
          >
            Probar en Nivel 3 Ahora
          </button>
        </div>
      )}

    </div>
  );
};

