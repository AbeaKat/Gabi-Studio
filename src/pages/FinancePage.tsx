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
  Layers,
  Clock,
  Send,
  Target,
  AlertTriangle,
  Wallet,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  Product,
  Batch,
  SalesHeader,
  SalesItem,
  OperatingExpense,
  KardexMovement,
} from '../types';
import {
  getStoredProducts,
  getStoredBatches,
  getStoredSalesHeaders,
  saveStoredSalesHeaders,
  getStoredSalesItems,
  saveStoredSalesItems,
  getStoredExpenses,
  saveStoredExpenses,
  getStoredKardex,
  TENANT_STELLA_ID,
} from '../data/realInventoryData';
import { getPaymentMethodLabel } from '../components/sales/QuickSaleModal';
import { supabase } from '../lib/supabase';

const EXPENSE_CATEGORIES: Record<OperatingExpense['category'], string> = {
  publicidad: 'Publicidad & Redes Sociales',
  empaque: 'Empaque, Bolsas & Presentación',
  envio_local: 'Delivery & Envíos Locales',
  renta_servicios: 'Local, Renta & Servicios',
  comisiones: 'Comisiones Bancarias / POS',
  otros: 'Otros Gastos Operativos',
};

const OWNER_SALARY_STORAGE_KEY = 'gabi_studio_owner_salary_usd';

export const FinancePage: React.FC = () => {
  const { tenant, planTier, role, setSimulatedRole, setSimulatedTier } = useAuth();
  const businessName = tenant?.name || 'Mi Empresa Demo';
  const exchangeRate = Number(tenant?.exchange_rate_nio || 36.62);

  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [salesHeaders, setSalesHeaders] = useState<SalesHeader[]>([]);
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [kardex, setKardex] = useState<KardexMovement[]>([]);

  // New Expense Form (Tier 2+)
  const [expCategory, setExpCategory] = useState<OperatingExpense['category']>('publicidad');
  const [expDesc, setExpDesc] = useState('');
  const [expAmountUsd, setExpAmountUsd] = useState('');

  // Break-Even / Owner Salary Target (Tier 2+)
  const [ownerSalaryUsd, setOwnerSalaryUsd] = useState<number>(() => {
    const saved = localStorage.getItem(OWNER_SALARY_STORAGE_KEY);
    const parsed = saved ? parseFloat(saved) : 120;
    return isNaN(parsed) || parsed < 0 ? 120 : parsed;
  });
  const [ownerSalaryInput, setOwnerSalaryInput] = useState<string>(() => {
    const saved = localStorage.getItem(OWNER_SALARY_STORAGE_KEY);
    return saved || '120';
  });

  // Accounts Receivable Payment Form State (Tier 2+)
  const [activePaymentItemId, setActivePaymentItemId] = useState<string | null>(null);
  const [paymentAmountNio, setPaymentAmountNio] = useState<string>('');
  const [receivableSuccessMsg, setReceivableSuccessMsg] = useState<string | null>(null);

  // ABC Matrix Active Tab (Tier 3)
  const [abcTab, setAbcTab] = useState<'A' | 'B' | 'C'>('A');

  const loadFinanceData = () => {
    setProducts(getStoredProducts());
    setBatches(getStoredBatches());
    setSalesHeaders(getStoredSalesHeaders());
    setSalesItems(getStoredSalesItems());
    setExpenses(getStoredExpenses());
    setKardex(getStoredKardex());
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  const handleOwnerSalaryChange = (val: string) => {
    setOwnerSalaryInput(val);
    const num = Math.max(0, parseFloat(val) || 0);
    setOwnerSalaryUsd(num);
    localStorage.setItem(OWNER_SALARY_STORAGE_KEY, String(num));
  };

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
  // NIVEL 2: OPERATING EXPENSES, BREAK-EVEN & ACCOUNTS RECEIVABLE
  // ==========================================================================
  const totalExpensesUsd = expenses.reduce((acc, e) => acc + e.amount_usd, 0);
  const totalExpensesNio = expenses.reduce((acc, e) => acc + e.amount_nio, 0);

  // Break-even calculations (Gastos Operativos del Mes + Salario del Dueño)
  const breakEvenTargetUsd = totalExpensesUsd + ownerSalaryUsd;
  const breakEvenTargetNio = breakEvenTargetUsd * exchangeRate;
  const breakEvenProgressPct =
    breakEvenTargetUsd > 0 ? Math.min(100, (grossProfitUsd / breakEvenTargetUsd) * 100) : 100;
  const remainingBreakEvenUsd = Math.max(0, breakEvenTargetUsd - grossProfitUsd);
  const remainingBreakEvenNio = remainingBreakEvenUsd * exchangeRate;
  const surplusProfitUsd = Math.max(0, grossProfitUsd - breakEvenTargetUsd);
  const surplusProfitNio = surplusProfitUsd * exchangeRate;

  // Accounts Receivable (Cuentas por Cobrar Activas: balance_due_nio > 0)
  const todayIso = new Date().toISOString().slice(0, 10);
  const activeReceivables = salesItems.filter((item) => (item.balance_due_nio || 0) > 0);
  const totalReceivableNio = activeReceivables.reduce(
    (acc, item) => acc + (item.balance_due_nio || 0),
    0
  );
  const totalReceivableUsd = totalReceivableNio / exchangeRate;

  const handleOpenAbonoForm = (item: SalesItem) => {
    setActivePaymentItemId(item.id);
    setPaymentAmountNio(String((item.balance_due_nio || 0).toFixed(2)));
    setReceivableSuccessMsg(null);
  };

  const handleConfirmAbono = async (item: SalesItem, customAmountNio?: number) => {
    const currentDue = Number(item.balance_due_nio || 0);
    const rawAbono = customAmountNio !== undefined ? customAmountNio : parseFloat(paymentAmountNio);
    if (isNaN(rawAbono) || rawAbono <= 0) return;

    const appliedAbono = Math.min(currentDue, Math.round(rawAbono * 100) / 100);
    const totalSaleNio = item.final_unit_price_nio * item.quantity;
    const prevPaidNio = Number(item.amount_paid_nio ?? Math.max(0, totalSaleNio - currentDue));
    const newPaidNio = Math.min(totalSaleNio, Math.round((prevPaidNio + appliedAbono) * 100) / 100);
    const newBalanceDueNio = Math.max(0, Math.round((totalSaleNio - newPaidNio) * 100) / 100);
    const newStatus: 'paid' | 'partial' = newBalanceDueNio > 0 ? 'partial' : 'paid';

    const updatedItems = salesItems.map((si) =>
      si.id === item.id
        ? {
            ...si,
            amount_paid_nio: newPaidNio,
            balance_due_nio: newBalanceDueNio,
            payment_status: newStatus,
          }
        : si
    );
    setSalesItems(updatedItems);
    saveStoredSalesItems(updatedItems);

    const updatedHeaders = salesHeaders.map((sh) => {
      if (sh.id !== item.sale_header_id) return sh;
      const headerItems = updatedItems.filter((i) => i.sale_header_id === sh.id);
      const hdrPaid = headerItems.reduce((sum, i) => sum + (i.amount_paid_nio || 0), 0);
      const hdrDue = headerItems.reduce((sum, i) => sum + (i.balance_due_nio || 0), 0);
      return {
        ...sh,
        amount_paid_nio: hdrPaid,
        balance_due_nio: hdrDue,
        payment_status: (hdrDue > 0 ? 'partial' : 'paid') as 'paid' | 'partial',
      };
    });
    setSalesHeaders(updatedHeaders);
    saveStoredSalesHeaders(updatedHeaders);

    try {
      await supabase
        .from('sales_items')
        .update({
          amount_paid_nio: newPaidNio,
          balance_due_nio: newBalanceDueNio,
          payment_status: newStatus,
        })
        .eq('id', item.id);
      await supabase
        .from('sales_headers')
        .update({
          amount_paid_nio: newPaidNio,
          balance_due_nio: newBalanceDueNio,
          payment_status: newStatus,
        })
        .eq('id', item.sale_header_id);
    } catch (e) {
      // Demo fallback
    }

    setActivePaymentItemId(null);
    setPaymentAmountNio('');
    setReceivableSuccessMsg(
      newBalanceDueNio === 0
        ? `¡Cuenta liquidada! Se registró el pago de C$ ${appliedAbono.toFixed(2)} de ${item.customer_name || 'Cliente'}.`
        : `Abono registrado: C$ ${appliedAbono.toFixed(2)} aplicado a ${item.customer_name || 'Cliente'}. Nuevo saldo: C$ ${newBalanceDueNio.toFixed(2)}.`
    );
  };

  const handleWhatsAppCollectionReminder = (item: SalesItem) => {
    const hdr = salesHeaders.find((h) => h.id === item.sale_header_id);
    const customerName = item.customer_name || hdr?.customer_name || 'Cliente';
    const rawPhone = (item.customer_phone || hdr?.customer_phone || '').replace(/[^0-9]/g, '');
    const formattedPhone = rawPhone.length === 8 ? `505${rawPhone}` : rawPhone;

    const totalNio = item.final_unit_price_nio * item.quantity;
    const dueNio = Number(item.balance_due_nio || 0);
    const paidNio = Number(item.amount_paid_nio ?? Math.max(0, totalNio - dueNio));
    const dueUsd = dueNio / exchangeRate;
    const prodLabel = `${item.sku_snapshot}${item.product_name_snapshot ? ` - ${item.product_name_snapshot}` : ''}`;

    const message = `Hola ${customerName}, te saludamos de ${businessName}. Te compartimos el estado de cuenta de tu pedido (${prodLabel}): Total C$ ${totalNio.toFixed(2)}, Abonado C$ ${paidNio.toFixed(2)}, Saldo pendiente: C$ ${dueNio.toFixed(2)} (≈ $${dueUsd.toFixed(2)} USD). ¡Gracias por tu preferencia!`;

    const encoded = encodeURIComponent(message);
    const url = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

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
  // NIVEL 3: ABC INVENTORY ROTATION MATRIX, SHRINKAGE & 4-SHEET EXCEL EXPORT
  // ==========================================================================
  const shrinkageLossUsd = kardex
    .filter((k) => k.movement_type === 'merma_dano')
    .reduce((acc, k) => acc + Math.abs(k.quantity_delta) * k.unit_cost_usd, 0);

  const netOperatingProfitUsd = grossProfitUsd - totalExpensesUsd - shrinkageLossUsd;
  const netOperatingProfitNio = netOperatingProfitUsd * exchangeRate;
  const netMarginPercent = netSalesUsd > 0 ? (netOperatingProfitUsd / netSalesUsd) * 100 : 0;

  // ABC Matrix Calculation (cross-referencing products with salesItems)
  const productPerformanceList = products.map((p) => {
    const prodSales = salesItems.filter(
      (s) => s.product_id === p.id || s.sku_snapshot.toUpperCase() === p.sku.toUpperCase()
    );
    const unitsSold = prodSales.reduce((sum, s) => sum + s.quantity, 0);
    const revenueNio = prodSales.reduce((sum, s) => sum + s.final_unit_price_nio * s.quantity, 0);
    const profitUsd = prodSales.reduce((sum, s) => sum + s.net_profit_usd, 0);
    const unitCostUsd = Number(p.landed_cost_usd || p.base_cost_usd || 0);
    const immobilizedCapitalUsd = (p.stock_current || 0) * unitCostUsd;

    return {
      product: p,
      unitsSold,
      revenueNio,
      profitUsd,
      unitCostUsd,
      immobilizedCapitalUsd,
    };
  });

  // Class A: Star Products (have sales, sorted by highest accumulated net profit & units sold)
  const classAItems = productPerformanceList
    .filter((item) => item.unitsSold > 0)
    .sort((a, b) => b.profitUsd - a.profitUsd || b.unitsSold - a.unitsSold);

  // Unsold products with stock > 0 sorted by highest immobilized capital
  const unsoldWithStock = productPerformanceList
    .filter((item) => item.unitsSold === 0 && item.product.stock_current > 0)
    .sort((a, b) => b.immobilizedCapitalUsd - a.immobilizedCapitalUsd);

  // Class C: Stagnant Capital / "Hueso" (top 35% highest immobilized capital with 0 sales, min 8 items)
  const classCCutoff = Math.max(8, Math.ceil(unsoldWithStock.length * 0.35));
  const classCItems = unsoldWithStock.slice(0, classCCutoff);
  const classBItems = unsoldWithStock.slice(classCCutoff);

  const totalStagnantCapitalUsd = classCItems.reduce(
    (sum, item) => sum + item.immobilizedCapitalUsd,
    0
  );
  const totalStarProfitUsd = classAItems.reduce((sum, item) => sum + item.profitUsd, 0);
  const urgentRestockCount = classAItems.filter((item) => item.product.stock_current <= 2).length;

  const handleExportPL = () => {
    const wb = XLSX.utils.book_new();

    // Pestaña 1: 1_Resumen_PL
    const summaryRows = [
      { Concepto: `ESTADO DE RESULTADOS MENSUAL (P&L) — ${businessName}`, Monto_USD: '', Equivalente_Cordobas: '', Notas: `Tasa de cambio: C$ ${exchangeRate.toFixed(2)}` },
      { Concepto: '(+) Ventas Brutas a Precio de Lista', Monto_USD: Number((grossListSalesNio / exchangeRate).toFixed(2)), Equivalente_Cordobas: Number(grossListSalesNio.toFixed(2)), Notas: '100% Ingresos de lista' },
      { Concepto: '(-) Descuentos y Promociones Otorgadas', Monto_USD: Number((totalDiscountsNio / exchangeRate).toFixed(2)), Equivalente_Cordobas: Number(totalDiscountsNio.toFixed(2)), Notas: 'Promociones Nivel 2+' },
      { Concepto: '(=) Ventas Netas Efectivas Facturadas', Monto_USD: Number(netSalesUsd.toFixed(2)), Equivalente_Cordobas: Number(netSalesNio.toFixed(2)), Notas: 'Ingresos netos reales' },
      { Concepto: '(-) Costo de Mercadería Vendida (COGS Snapshots)', Monto_USD: Number(recoveredCostUsd.toFixed(2)), Equivalente_Cordobas: Number(recoveredCostNio.toFixed(2)), Notas: 'Costo congelado por venta' },
      { Concepto: '(=) Utilidad Bruta Comercial', Monto_USD: Number(grossProfitUsd.toFixed(2)), Equivalente_Cordobas: Number(grossProfitNio.toFixed(2)), Notas: 'Ganancia antes de gastos' },
      { Concepto: '(-) Gastos Operativos del Mes', Monto_USD: Number(totalExpensesUsd.toFixed(2)), Equivalente_Cordobas: Number(totalExpensesNio.toFixed(2)), Notas: `${expenses.length} gastos registrados` },
      { Concepto: '(-) Pérdidas por Mermas / Daños (Kardex)', Monto_USD: Number(shrinkageLossUsd.toFixed(2)), Equivalente_Cordobas: Number((shrinkageLossUsd * exchangeRate).toFixed(2)), Notas: 'Averías auditadas en bodega' },
      { Concepto: '(=) UTILIDAD NETA LIBRE REAL (EBITDA / P&L)', Monto_USD: Number(netOperatingProfitUsd.toFixed(2)), Equivalente_Cordobas: Number(netOperatingProfitNio.toFixed(2)), Notas: `Margen Neto Libre: ${netMarginPercent.toFixed(1)}%` },
      { Concepto: '--- INDICADORES DE BALANCE E INVENTARIO ---', Monto_USD: '', Equivalente_Cordobas: '', Notas: '' },
      { Concepto: 'Capital Activo en Inventario Físico (Al Costo)', Monto_USD: Number(capitalInStockUsd.toFixed(2)), Equivalente_Cordobas: Number(capitalInStockNio.toFixed(2)), Notas: `${products.reduce((a, p) => a + p.stock_current, 0)} unidades disponibles` },
      { Concepto: 'Valor de Venta Proyectado del Inventario', Monto_USD: Number(projectedSalesUsd.toFixed(2)), Equivalente_Cordobas: Number(projectedSalesNio.toFixed(2)), Notas: 'Proyección a precio de lista' },
      { Concepto: 'Cartera Activa por Cobrar (Créditos / Apartados)', Monto_USD: Number(totalReceivableUsd.toFixed(2)), Equivalente_Cordobas: Number(totalReceivableNio.toFixed(2)), Notas: `${activeReceivables.length} cuentas activas` },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, '1_Resumen_PL');

    // Pestaña 2: 2_Detalle_Ventas_COGS
    const salesDetailRows = salesItems.map((item) => {
      const hdr = salesHeaders.find((h) => h.id === item.sale_header_id);
      const method = item.payment_method || hdr?.payment_method || 'cash_nio';
      const totalCobradoNio = item.final_unit_price_nio * item.quantity;
      const totalCobradoUsd = item.final_unit_price_usd * item.quantity;
      const cogsTotalUsd = item.unit_cost_usd_snapshot * item.quantity;

      return {
        Fecha: hdr?.sale_date || item.created_at.slice(0, 10),
        Modo_Registro: hdr?.entry_mode || 'single_sale',
        SKU: item.sku_snapshot,
        Producto: item.product_name_snapshot || item.sku_snapshot,
        Cliente: item.customer_name || hdr?.customer_name || 'Contado',
        Cantidad: item.quantity,
        Costo_Unit_Snapshot_USD: Number(item.unit_cost_usd_snapshot.toFixed(2)),
        Costo_Total_COGS_USD: Number(cogsTotalUsd.toFixed(2)),
        Precio_Lista_Unit_NIO: Number(item.list_price_nio_snapshot.toFixed(2)),
        Descuento_Unit_NIO: Number(item.discount_nio.toFixed(2)),
        Total_Facturado_NIO: Number(totalCobradoNio.toFixed(2)),
        Total_Facturado_USD: Number(totalCobradoUsd.toFixed(2)),
        Tasa_Cambio_Snapshot: Number(item.exchange_rate_snapshot.toFixed(2)),
        Metodo_Pago: getPaymentMethodLabel(method),
        Estado_Pago: item.payment_status || 'paid',
        Saldo_Pendiente_NIO: Number((item.balance_due_nio || 0).toFixed(2)),
        Utilidad_Neta_USD: Number(item.net_profit_usd.toFixed(2)),
        Utilidad_Neta_NIO: Number((item.net_profit_usd * item.exchange_rate_snapshot).toFixed(2)),
      };
    });
    const wsSales = XLSX.utils.json_to_sheet(
      salesDetailRows.length > 0
        ? salesDetailRows
        : [{ Mensaje: 'Sin ventas registradas en el periodo' }]
    );
    XLSX.utils.book_append_sheet(wb, wsSales, '2_Detalle_Ventas_COGS');

    // Pestaña 3: 3_Gastos_Operativos
    const expenseRows = expenses.map((exp) => ({
      Fecha: exp.expense_date,
      Categoria: EXPENSE_CATEGORIES[exp.category] || exp.category,
      Descripcion: exp.description,
      Monto_USD: Number(exp.amount_usd.toFixed(2)),
      Monto_Cordobas_NIO: Number(exp.amount_nio.toFixed(2)),
    }));
    const wsExpenses = XLSX.utils.json_to_sheet(
      expenseRows.length > 0
        ? expenseRows
        : [{ Mensaje: 'Sin gastos operativos registrados en el periodo' }]
    );
    XLSX.utils.book_append_sheet(wb, wsExpenses, '3_Gastos_Operativos');

    // Pestaña 4: 4_Kardex_y_Mermas
    const kardexRows = kardex.map((k) => ({
      Fecha: k.created_at.slice(0, 10),
      SKU: k.sku,
      Producto: k.product_name,
      Tipo_Movimiento: k.movement_type,
      Ubicacion_Bodega: k.location,
      Delta_Unidades: k.quantity_delta,
      Stock_Antes: k.stock_before,
      Stock_Despues: k.stock_after,
      Costo_Unitario_USD: Number(k.unit_cost_usd.toFixed(2)),
      Impacto_Costo_Total_USD: Number((Math.abs(k.quantity_delta) * k.unit_cost_usd).toFixed(2)),
      Motivo_Auditoria: k.reason,
      Responsable: k.created_by_name,
    }));
    const wsKardex = XLSX.utils.json_to_sheet(
      kardexRows.length > 0
        ? kardexRows
        : [{ Mensaje: 'Sin movimientos de Kardex o mermas registrados' }]
    );
    XLSX.utils.book_append_sheet(wb, wsKardex, '4_Kardex_y_Mermas');

    const safeTenantName = businessName.replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(
      wb,
      `Paquete_Contable_${safeTenantName}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
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
            <span>Exportar Paquete Contable (4 Hojas .xlsx)</span>
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
            ${netSalesUsd.toFixed(2)} USD facturados
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
      {/* NIVEL 2: BREAK-EVEN SEMAPHORE, ACCOUNTS RECEIVABLE, BATCHES & EXP.   */}
      {/* ==================================================================== */}
      {planTier >= 2 ? (
        <div className="space-y-6">
          
          {/* 1. Meta de Supervivencia & Punto de Equilibrio Mensual */}
          <div className="bg-white rounded-3xl border border-nacre-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-nacre-200 pb-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-deepSlate-900">
                    Meta de Supervivencia & Punto de Equilibrio Mensual
                  </h2>
                  <p className="text-xs text-deepSlate-500">
                    Compara tu <strong>Ganancia Bruta Real del Mes</strong> contra tus <strong>Gastos Operativos + Salario del Dueño</strong> para saber cuándo empiezas a ganar libre.
                  </p>
                </div>
              </div>

              {/* Configurable Owner Salary Input */}
              <div className="flex items-center space-x-3 bg-nacre-50 border border-nacre-200 rounded-2xl px-4 py-2.5 shrink-0">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-deepSlate-500">
                    Meta Salario del Dueño ($ USD)
                  </label>
                  <span className="text-[11px] font-mono text-deepSlate-500">
                    ≈ C$ {(ownerSalaryUsd * exchangeRate).toFixed(0)} / mes
                  </span>
                </div>
                <div className="relative w-28">
                  <span className="text-xs font-mono font-bold text-deepSlate-400 absolute left-3 top-1/2 -translate-y-1/2">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={ownerSalaryInput}
                    onChange={(e) => handleOwnerSalaryChange(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1.5 text-xs font-mono font-extrabold rounded-xl bg-white border border-nacre-200 focus:outline-none focus:border-coral-500 text-deepSlate-900"
                  />
                </div>
              </div>
            </div>

            {/* Break-Even Metrics & Semaphore Progress Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-nacre-50/70 border border-nacre-200">
                <span className="text-[11px] font-bold text-deepSlate-500 block">
                  Meta Mensual a Cubrir (Gastos + Salario)
                </span>
                <p className="text-lg font-mono font-extrabold text-deepSlate-900 mt-1">
                  C$ {breakEvenTargetNio.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-[11px] font-mono text-deepSlate-500">
                  ${breakEvenTargetUsd.toFixed(2)} USD (${totalExpensesUsd.toFixed(2)} gastos + ${ownerSalaryUsd.toFixed(2)} salario)
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-nacre-50/70 border border-nacre-200">
                <span className="text-[11px] font-bold text-deepSlate-500 block">
                  Ganancia Bruta Real Generada
                </span>
                <p className="text-lg font-mono font-extrabold text-emerald-600 mt-1">
                  C$ {grossProfitNio.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-[11px] font-mono text-deepSlate-500">
                  +${grossProfitUsd.toFixed(2)} USD acumulados en snapshots
                </span>
              </div>

              <div
                className={`p-4 rounded-2xl border ${
                  remainingBreakEvenUsd <= 0
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : breakEvenProgressPct >= 50
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <span
                  className={`text-[11px] font-bold block ${
                    remainingBreakEvenUsd <= 0
                      ? 'text-emerald-800'
                      : breakEvenProgressPct >= 50
                      ? 'text-amber-800'
                      : 'text-rose-800'
                  }`}
                >
                  {remainingBreakEvenUsd <= 0
                    ? 'Excedente Neto sobre Punto de Equilibrio'
                    : 'Utilidad Faltante para Punto de Equilibrio'}
                </span>
                <p
                  className={`text-lg font-mono font-extrabold mt-1 ${
                    remainingBreakEvenUsd <= 0
                      ? 'text-emerald-700'
                      : breakEvenProgressPct >= 50
                      ? 'text-amber-700'
                      : 'text-rose-600'
                  }`}
                >
                  {remainingBreakEvenUsd <= 0
                    ? `+C$ ${surplusProfitNio.toFixed(2)}`
                    : `C$ ${remainingBreakEvenNio.toFixed(2)}`}
                </p>
                <span className="text-[11px] font-mono text-deepSlate-600">
                  {remainingBreakEvenUsd <= 0
                    ? `+$${surplusProfitUsd.toFixed(2)} USD libres después de gastos y salario`
                    : `Faltan $${remainingBreakEvenUsd.toFixed(2)} USD de utilidad este mes`}
                </span>
              </div>
            </div>

            {/* Semaphore Progress Bar */}
            <div className="space-y-2">
              <div className="w-full h-3.5 rounded-full bg-nacre-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    breakEvenProgressPct >= 100
                      ? 'bg-emerald-500'
                      : breakEvenProgressPct >= 50
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(4, breakEvenProgressPct)}%` }}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  {breakEvenProgressPct >= 100 ? (
                    <span className="inline-flex items-center space-x-1.5 font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        ¡Punto de equilibrio superado! Cada córdoba adicional vendido este mes es ganancia neta libre.
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1.5 font-semibold text-deepSlate-700">
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 ${
                          breakEvenProgressPct >= 50 ? 'text-amber-500' : 'text-rose-500'
                        }`}
                      />
                      <span>
                        Te faltan generar{' '}
                        <strong className="font-mono text-deepSlate-900">
                          C$ {remainingBreakEvenNio.toFixed(2)}
                        </strong>{' '}
                        (≈ <strong className="font-mono">${remainingBreakEvenUsd.toFixed(2)} USD</strong>) de utilidad bruta para cubrir costos fijos + salario del dueño.
                      </span>
                    </span>
                  )}
                </div>
                <span className="font-mono font-extrabold text-deepSlate-900 shrink-0">
                  {breakEvenProgressPct.toFixed(1)}% de la meta mensual
                </span>
              </div>
            </div>
          </div>

          {/* 2. Cartera por Cobrar & Apartados (Cuentas por Cobrar Activas) */}
          <div className="bg-white rounded-3xl border border-nacre-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-nacre-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-deepSlate-900">
                    Cartera por Cobrar & Apartados Activos (Nivel 2)
                  </h2>
                  <p className="text-xs text-deepSlate-500">
                    Control de créditos, fiados y apartados con recordatorio de cobro por WhatsApp en 1 clic y registro de abonos.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right font-mono bg-amber-50/80 border border-amber-200 px-3.5 py-2 rounded-2xl">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-amber-800 block">
                    Total Pendiente por Cobrar ({activeReceivables.length})
                  </span>
                  <span className="text-sm font-extrabold text-amber-900">
                    C$ {totalReceivableNio.toLocaleString('es-NI', { minimumFractionDigits: 2 })} (≈ ${totalReceivableUsd.toFixed(2)} USD)
                  </span>
                </div>
              </div>
            </div>

            {receivableSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{receivableSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReceivableSuccessMsg(null)}
                  className="text-emerald-700 underline ml-3"
                >
                  Ocultar
                </button>
              </div>
            )}

            {activeReceivables.length === 0 ? (
              <div className="p-8 rounded-2xl bg-nacre-50 border border-nacre-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-extrabold text-deepSlate-900">
                  ¡Excelente! No tienes cuentas por cobrar ni apartados pendientes
                </p>
                <p className="text-xs text-deepSlate-500 max-w-md mx-auto">
                  Cuando registres una venta con el método <strong>Crédito / Apartado</strong> desde Venta Rápida (1 a 1), aparecerá aquí hasta ser liquidada.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-nacre-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-nacre-100 border-b border-nacre-200 text-deepSlate-600 uppercase font-bold">
                    <tr>
                      <th className="py-3 px-4">Cliente / WhatsApp</th>
                      <th className="py-3 px-4">SKU / Producto</th>
                      <th className="py-3 px-4 text-right">Total Venta</th>
                      <th className="py-3 px-4 text-right">Abonado</th>
                      <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                      <th className="py-3 px-4 text-center">Estado / Límite</th>
                      <th className="py-3 px-4 text-right">Acciones Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nacre-100">
                    {activeReceivables.map((item) => {
                      const hdr = salesHeaders.find((h) => h.id === item.sale_header_id);
                      const customerName = item.customer_name || hdr?.customer_name || 'Cliente Registrado';
                      const customerPhone = item.customer_phone || hdr?.customer_phone || '';
                      const dueDate = item.due_date || hdr?.due_date || '';
                      const isOverdue = Boolean(dueDate && dueDate < todayIso);

                      const totalVentaNio = item.final_unit_price_nio * item.quantity;
                      const saldoDueNio = Number(item.balance_due_nio || 0);
                      const abonadoNio = Number(
                        item.amount_paid_nio ?? Math.max(0, totalVentaNio - saldoDueNio)
                      );
                      const saldoDueUsd = saldoDueNio / exchangeRate;
                      const isEditingAbono = activePaymentItemId === item.id;

                      return (
                        <tr key={item.id} className="hover:bg-nacre-50/60">
                          <td className="py-3 px-4">
                            <span className="font-extrabold text-deepSlate-900 block">
                              {customerName}
                            </span>
                            <span className="font-mono text-[11px] text-deepSlate-500">
                              {customerPhone ? `+${customerPhone.replace(/[^0-9]/g, '')}` : 'Sin teléfono'}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-deepSlate-900 block">
                              {item.sku_snapshot} ({item.quantity} ud)
                            </span>
                            <span className="text-[11px] text-deepSlate-500 block max-w-[200px] truncate">
                              {item.product_name_snapshot || item.sku_snapshot}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-deepSlate-800">
                            C$ {totalVentaNio.toFixed(2)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            C$ {abonadoNio.toFixed(2)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono">
                            <span className="font-extrabold text-amber-800 block">
                              C$ {saldoDueNio.toFixed(2)}
                            </span>
                            <span className="text-[11px] text-deepSlate-500">
                              ≈ ${saldoDueUsd.toFixed(2)} USD
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isOverdue
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{isOverdue ? 'Vencido' : 'Al día'}</span>
                            </span>
                            {dueDate && (
                              <span className="block font-mono text-[10px] text-deepSlate-400 mt-0.5">
                                Límite: {dueDate}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            {isEditingAbono ? (
                              <div className="inline-flex items-center space-x-1.5 bg-nacre-50 p-1.5 rounded-xl border border-nacre-200">
                                <span className="text-[10px] font-mono font-bold text-deepSlate-500 pl-1">
                                  C$
                                </span>
                                <input
                                  type="number"
                                  min="1"
                                  max={saldoDueNio}
                                  step="10"
                                  value={paymentAmountNio}
                                  onChange={(e) => setPaymentAmountNio(e.target.value)}
                                  className="w-20 px-2 py-1 text-xs font-mono font-bold rounded-lg bg-white border border-coral-400 focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleConfirmAbono(item)}
                                  title="Confirmar Abono"
                                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActivePaymentItemId(null)}
                                  title="Cancelar"
                                  className="p-1.5 rounded-lg text-deepSlate-400 hover:text-deepSlate-700"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAbonoForm(item)}
                                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-coral-50 hover:bg-coral-100 text-coral-700 border border-coral-200 transition-colors"
                                >
                                  Registrar Abono / Liquidar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleWhatsAppCollectionReminder(item)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Cobrar por WhatsApp</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 3. Batch Investment Recovery & Operating Expenses */}
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
                      placeholder="Descripción (ej. Pauta redes, Bolsas empaque)..."
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
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-nacre-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-coral-50 border border-coral-200 text-coral-500 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-coral-50 text-coral-600">
                Módulos Nivel 2 (Crecimiento)
              </span>
              <h3 className="text-base font-extrabold text-deepSlate-900 mt-1">
                Cartera por Cobrar (WhatsApp), Punto de Equilibrio Mensual & Recuperación por Lote
              </h3>
              <p className="text-xs text-deepSlate-500">
                Activa el Nivel 2 para controlar ventas al crédito/apartados con cobro en 1 clic, semáforo de supervivencia mensual y gastos operativos.
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
      {/* NIVEL 3: ABC ROTATION MATRIX & MONTHLY P&L STATEMENT                 */}
      {/* ==================================================================== */}
      {planTier >= 3 ? (
        <div className="space-y-6">
          
          {/* Radar de Rotación de Inventario — Matriz ABC */}
          <div className="bg-white rounded-3xl border border-nacre-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-nacre-200 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-deepSlate-900">
                  Inteligencia de Capital: Productos Estrella vs. Capital Estancado (Matriz ABC)
                </h2>
                <p className="text-xs text-deepSlate-500">
                  Clasificación automática en el navegador cruzando rotación de ventas reales contra el capital inmovilizado en bodega.
                </p>
              </div>
              <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-nacre-100 text-deepSlate-800 self-start lg:self-auto">
                Capital en Clase C: ${totalStagnantCapitalUsd.toFixed(2)} USD (C$ {(totalStagnantCapitalUsd * exchangeRate).toFixed(0)})
              </span>
            </div>

            {/* 3 Interactive ABC Category Cards / Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Clase A: Productos Estrella */}
              <button
                type="button"
                onClick={() => setAbcTab('A')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  abcTab === 'A'
                    ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                    : 'bg-nacre-50/60 border-nacre-200 hover:bg-nacre-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold text-emerald-900">
                    Clase A • Productos Estrella ({classAItems.length})
                  </span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-lg font-mono font-extrabold text-emerald-700">
                  +${totalStarProfitUsd.toFixed(2)} USD
                </p>
                <span className="text-[11px] text-deepSlate-600 block mt-0.5">
                  Mayor utilidad neta acumulada •{' '}
                  <strong className={urgentRestockCount > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    {urgentRestockCount} por reponer urgente
                  </strong>
                </span>
              </button>

              {/* Clase B: Rotación Estándar */}
              <button
                type="button"
                onClick={() => setAbcTab('B')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  abcTab === 'B'
                    ? 'bg-coral-50/80 border-coral-500 shadow-xs'
                    : 'bg-nacre-50/60 border-nacre-200 hover:bg-nacre-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold text-deepSlate-900">
                    Clase B • Catálogo Estable ({classBItems.length})
                  </span>
                  <Package className="w-4 h-4 text-coral-500" />
                </div>
                <p className="text-lg font-mono font-extrabold text-deepSlate-900">
                  ${classBItems.reduce((s, i) => s + i.immobilizedCapitalUsd, 0).toFixed(2)} USD
                </p>
                <span className="text-[11px] text-deepSlate-600 block mt-0.5">
                  Inversión moderada disponible en exhibición
                </span>
              </button>

              {/* Clase C: Capital Estancado / "Hueso" */}
              <button
                type="button"
                onClick={() => setAbcTab('C')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  abcTab === 'C'
                    ? 'bg-amber-50/90 border-amber-500 shadow-xs'
                    : 'bg-nacre-50/60 border-nacre-200 hover:bg-nacre-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-extrabold text-amber-900">
                    Clase C • Capital Estancado / "Hueso" ({classCItems.length})
                  </span>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-lg font-mono font-extrabold text-amber-800">
                  ${totalStagnantCapitalUsd.toFixed(2)} USD
                </p>
                <span className="text-[11px] text-amber-900 block mt-0.5">
                  0 ventas registradas y mayor capital inmovilizado
                </span>
              </button>
            </div>

            {/* Active ABC Category Table */}
            <div className="overflow-x-auto border border-nacre-200 rounded-2xl max-h-96 overflow-y-auto">
              {abcTab === 'A' && (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-nacre-100 border-b border-nacre-200 text-deepSlate-600 uppercase font-bold">
                    <tr>
                      <th className="py-3 px-4">SKU Estrella</th>
                      <th className="py-3 px-4">Producto</th>
                      <th className="py-3 px-4 text-center">Unidades Vendidas</th>
                      <th className="py-3 px-4 text-right">Ingresos (C$)</th>
                      <th className="py-3 px-4 text-right">Utilidad Acumulada</th>
                      <th className="py-3 px-4 text-center">Stock Actual & Alerta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nacre-100 font-mono">
                    {classAItems.map(({ product: p, unitsSold, revenueNio, profitUsd }) => {
                      const needsRestock = p.stock_current <= 2;
                      return (
                        <tr key={p.id} className="hover:bg-nacre-50/60">
                          <td className="py-3 px-4 font-bold text-deepSlate-900">{p.sku}</td>
                          <td className="py-3 px-4 font-sans text-deepSlate-700">
                            {p.name || p.sku}
                          </td>
                          <td className="py-3 px-4 text-center font-extrabold text-deepSlate-900">
                            {unitsSold} uds
                          </td>
                          <td className="py-3 px-4 text-right text-coral-600 font-bold">
                            C$ {revenueNio.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-emerald-600">
                            +${profitUsd.toFixed(2)} USD
                          </td>
                          <td className="py-3 px-4 text-center font-sans">
                            <div className="inline-flex items-center space-x-2">
                              <span className="font-mono font-bold text-deepSlate-800">
                                {p.stock_current} uds
                              </span>
                              {needsRestock && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>¡Reponer urgente!</span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {abcTab === 'B' && (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-nacre-100 border-b border-nacre-200 text-deepSlate-600 uppercase font-bold">
                    <tr>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Producto</th>
                      <th className="py-3 px-4 text-center">Stock Disp.</th>
                      <th className="py-3 px-4 text-right">Costo Unit. ($ USD)</th>
                      <th className="py-3 px-4 text-right">Capital en Stock</th>
                      <th className="py-3 px-4 text-right">Precio Lista (C$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nacre-100 font-mono">
                    {classBItems.slice(0, 25).map(({ product: p, unitCostUsd, immobilizedCapitalUsd }) => (
                      <tr key={p.id} className="hover:bg-nacre-50/60">
                        <td className="py-2.5 px-4 font-bold text-deepSlate-900">{p.sku}</td>
                        <td className="py-2.5 px-4 font-sans text-deepSlate-700">{p.name || p.sku}</td>
                        <td className="py-2.5 px-4 text-center">{p.stock_current} uds</td>
                        <td className="py-2.5 px-4 text-right text-deepSlate-600">
                          ${unitCostUsd.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-deepSlate-900">
                          ${immobilizedCapitalUsd.toFixed(2)} USD
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-coral-600">
                          C$ {p.price_nio.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {abcTab === 'C' && (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-nacre-100 border-b border-nacre-200 text-deepSlate-600 uppercase font-bold">
                    <tr>
                      <th className="py-3 px-4">SKU Estancado</th>
                      <th className="py-3 px-4">Producto</th>
                      <th className="py-3 px-4 text-center">Stock sin Rotar</th>
                      <th className="py-3 px-4 text-right">Capital Inmovilizado</th>
                      <th className="py-3 px-4 text-right">Precio Actual</th>
                      <th className="py-3 px-4">Sugerencia Automática de Liquidación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nacre-100 font-mono">
                    {classCItems.map(({ product: p, immobilizedCapitalUsd }) => {
                      const promoPriceNio = Math.round(p.price_nio * 0.85);
                      return (
                        <tr key={p.id} className="hover:bg-amber-50/40">
                          <td className="py-3 px-4 font-bold text-deepSlate-900">{p.sku}</td>
                          <td className="py-3 px-4 font-sans text-deepSlate-700">
                            {p.name || p.sku}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-amber-800">
                            {p.stock_current} uds (0 ventas)
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-rose-600">
                            ${immobilizedCapitalUsd.toFixed(2)} USD
                            <span className="block text-[10px] text-deepSlate-400">
                              C$ {(immobilizedCapitalUsd * exchangeRate).toFixed(0)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-deepSlate-800">
                            C$ {p.price_nio.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 font-sans">
                            <span className="inline-block px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900">
                              Sugerencia: Aplicar descuento promocional del 15% (C$ {promoPriceNio}) para liberar{' '}
                              <strong className="font-mono">${immobilizedCapitalUsd.toFixed(2)} USD</strong> de capital
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Estado de Resultados Mensual (P&L) */}
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
              <div className="flex items-center space-x-2.5">
                <span className="font-mono text-xs font-extrabold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Margen Neto Libre: {netMarginPercent.toFixed(1)}%
                </span>
                <button
                  type="button"
                  onClick={handleExportPL}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Descargar Excel (4 Hojas)</span>
                </button>
              </div>
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
                    (=) Ventas Netas Efectivas Facturadas
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
                Matriz ABC de Capital Estancado, Estado de Resultados (P&L) & Paquete Contable 4 Hojas
              </h3>
              <p className="text-xs text-deepSlate-500">
                Activa el Nivel 3 para detectar productos estrella vs. capital estancado ("hueso") y exportar el libro contable completo (.xlsx con 4 pestañas).
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
