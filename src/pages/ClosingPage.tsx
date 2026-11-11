import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  CalendarCheck,
  FileSpreadsheet,
  CheckSquare,
  ShoppingBag,
  Upload,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lock,
  Sparkles,
  History,
  Coins,
  TrendingUp,
  Banknote,
  Landmark,
  CreditCard,
  Clock,
  Calculator
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Product, Batch, SalesHeader, SalesItem, PaymentMethod } from '../types';
import {
  getStoredProducts,
  saveStoredProducts,
  getStoredBatches,
  getStoredSalesHeaders,
  saveStoredSalesHeaders,
  getStoredSalesItems,
  saveStoredSalesItems,
  TENANT_STELLA_ID,
} from '../data/realInventoryData';
import {
  QuickSaleModal,
  PAYMENT_METHOD_OPTIONS,
  getPaymentMethodLabel,
} from '../components/sales/QuickSaleModal';
import { supabase } from '../lib/supabase';

interface PreviewClosingRow {
  sku: string;
  quantity: number;
  discountNio: number;
  product?: Product;
  isValid: boolean;
  error?: string;
}

export const ClosingPage: React.FC = () => {
  const { tenant, planTier, role, setSimulatedTier } = useAuth();
  const businessName = tenant?.name || 'Mi Empresa Demo';
  const exchangeRate = Number(tenant?.exchange_rate_nio || 36.62);

  const [activeTab, setActiveTab] = useState<'excel' | 'manual' | 'history'>('manual');
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [salesHeaders, setSalesHeaders] = useState<SalesHeader[]>([]);
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);

  // Quick Sale Modal
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);

  // Cash Drawer Reconciliation Calculator State (Cuadre de Efectivo en Gaveta)
  const [countedCashNioInput, setCountedCashNioInput] = useState<string>('');
  const [countedCashUsdInput, setCountedCashUsdInput] = useState<string>('');

  // Tab 1: Excel/CSV Closing State
  const [excelRows, setExcelRows] = useState<PreviewClosingRow[]>([]);
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const [excelPaymentMethod, setExcelPaymentMethod] = useState<PaymentMethod>('cash_nio');
  const [excelSuccessMsg, setExcelSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 2: Manual Checklist State
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [selectedQtyMap, setSelectedQtyMap] = useState<Record<string, number>>({});
  const [selectedDiscountMap, setSelectedDiscountMap] = useState<Record<string, number>>({});
  const [manualPaymentMethod, setManualPaymentMethod] = useState<PaymentMethod>('cash_nio');
  const [closingNotes, setClosingNotes] = useState('');
  const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null);

  const loadAll = () => {
    setProducts(getStoredProducts());
    setBatches(getStoredBatches());
    setSalesHeaders(getStoredSalesHeaders());
    setSalesItems(getStoredSalesItems());
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ==========================================================================
  // TAB 1: EXCEL / CSV CLOSING LOGIC
  // ==========================================================================
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);
    setExcelSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        parseExcelClosing(rawJson);
      } catch (err) {
        alert('No se pudo leer el archivo Excel/CSV de cierre.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseExcelClosing = (rawRows: any[]) => {
    const catalogMap = new Map<string, Product>();
    products.forEach((p) => catalogMap.set(p.sku.trim().toUpperCase(), p));

    const parsed: PreviewClosingRow[] = rawRows.map((row) => {
      const normalized: Record<string, any> = {};
      Object.keys(row).forEach((k) => {
        normalized[k.trim().toLowerCase().replace(/[^a-z0-9]/g, '')] = row[k];
      });

      const rawSku = String(
        normalized['sku'] ||
          normalized['codigo'] ||
          normalized['producto'] ||
          normalized['item'] ||
          ''
      ).trim();

      const qty = Math.max(
        1,
        parseInt(String(normalized['cantidad'] || normalized['qty'] || normalized['unidades'] || 1), 10) || 1
      );

      const discount =
        planTier >= 2
          ? Math.max(0, parseFloat(String(normalized['descuento'] || normalized['descuentoc'] || 0)) || 0)
          : 0;

      const matched = catalogMap.get(rawSku.toUpperCase());

      if (!rawSku) {
        return { sku: '(Vacío)', quantity: qty, discountNio: discount, isValid: false, error: 'SKU vacío' };
      }
      if (!matched) {
        return {
          sku: rawSku,
          quantity: qty,
          discountNio: discount,
          isValid: false,
          error: 'No existe en catálogo',
        };
      }
      if (matched.stock_current < qty) {
        return {
          sku: matched.sku,
          quantity: qty,
          discountNio: discount,
          product: matched,
          isValid: false,
          error: `Stock insuficiente (${matched.stock_current} disp.)`,
        };
      }

      return {
        sku: matched.sku,
        quantity: qty,
        discountNio: discount,
        product: matched,
        isValid: true,
      };
    });

    setExcelRows(parsed);
  };

  const handleLoadSampleExcelClosing = () => {
    setExcelSuccessMsg(null);
    const safeTenantSlug = businessName.replace(/[^a-zA-Z0-9_-]/g, '_');
    setExcelFileName(`Cierre_Diario_${safeTenantSlug}_Demo.xlsx`);
    const available = products.filter((p) => p.stock_current > 0).slice(0, 5);
    const sampleRaw = available.map((p, i) => ({
      Codigo: p.sku,
      Cantidad: 1,
      Descuento_Cordobas: planTier >= 2 && i === 1 ? 40 : 0,
    }));
    parseExcelClosing(sampleRaw);
  };

  const handleDownloadTemplate = () => {
    const sample = [
      { Codigo: 'REP-402', Cantidad: 1, Descuento_Cordobas: 0 },
      { Codigo: 'TEC-109', Cantidad: 1, Descuento_Cordobas: 0 },
      { Codigo: 'FER-033', Cantidad: 1, Descuento_Cordobas: 20 },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cierre_Del_Dia');
    const safeTenantSlug = businessName.replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `Plantilla_Cierre_Diario_${safeTenantSlug}.xlsx`);
  };

  const handleConfirmExcelClosing = async () => {
    const valid = excelRows.filter((r) => r.isValid && r.product);
    if (valid.length === 0) return;

    const nowIso = new Date().toISOString();
    const headerId = `sale-hdr-${Date.now()}`;

    const newItems: SalesItem[] = [];
    const currentProds = [...products];
    let totalHeaderNio = 0;

    valid.forEach((row, idx) => {
      const p = row.product!;
      const unitCost = Number(p.landed_cost_usd || p.base_cost_usd || 0);
      const listPriceUsd = Number(p.price_usd || 0);
      const listPriceNio = Number(p.price_nio || 0);
      const discount = planTier >= 2 ? row.discountNio : 0;
      const finalNio = Math.max(0, listPriceNio - discount);
      const finalUsd = discount > 0 ? Math.round((finalNio / exchangeRate) * 100) / 100 : listPriceUsd;
      const profitUsd = Math.round((finalUsd - unitCost) * row.quantity * 100) / 100;
      const lineTotalNio = finalNio * row.quantity;
      totalHeaderNio += lineTotalNio;

      const isCredit = planTier >= 2 && excelPaymentMethod === 'credit_layaway';

      newItems.push({
        id: `sale-itm-${Date.now()}-${idx}`,
        tenant_id: tenant?.id || TENANT_STELLA_ID,
        sale_header_id: headerId,
        product_id: p.id,
        sku_snapshot: p.sku,
        product_name_snapshot: p.name || p.sku,
        batch_id_snapshot: p.batch_id || null,
        quantity: row.quantity,
        unit_cost_usd_snapshot: unitCost,
        list_price_usd_snapshot: listPriceUsd,
        list_price_nio_snapshot: listPriceNio,
        discount_nio: discount,
        final_unit_price_nio: finalNio,
        final_unit_price_usd: finalUsd,
        exchange_rate_snapshot: exchangeRate,
        net_profit_usd: profitUsd,
        payment_method: excelPaymentMethod,
        customer_name: null,
        customer_phone: null,
        amount_paid_nio: isCredit ? 0 : lineTotalNio,
        balance_due_nio: isCredit ? lineTotalNio : 0,
        payment_status: isCredit ? 'pending' : 'paid',
        created_at: nowIso,
      });

      const prodIdx = currentProds.findIndex((item) => item.id === p.id);
      if (prodIdx !== -1) {
        currentProds[prodIdx] = {
          ...currentProds[prodIdx],
          stock_current: Math.max(0, currentProds[prodIdx].stock_current - row.quantity),
          updated_at: nowIso,
        };
      }
    });

    const isHeaderCredit = planTier >= 2 && excelPaymentMethod === 'credit_layaway';
    const newHeader: SalesHeader = {
      id: headerId,
      tenant_id: tenant?.id || TENANT_STELLA_ID,
      entry_mode: 'daily_closing_excel',
      sale_date: nowIso.slice(0, 10),
      payment_method: excelPaymentMethod,
      customer_name: null,
      customer_phone: null,
      amount_paid_nio: isHeaderCredit ? 0 : totalHeaderNio,
      balance_due_nio: isHeaderCredit ? totalHeaderNio : 0,
      payment_status: isHeaderCredit ? 'pending' : 'paid',
      promo_tag: 'Cierre Excel',
      notes: `Cierre diario por archivo (${excelFileName || 'Excel'}) — ${valid.length} códigos`,
      created_at: nowIso,
    };

    saveStoredProducts(currentProds);
    saveStoredSalesHeaders([newHeader, ...salesHeaders]);
    saveStoredSalesItems([...newItems, ...salesItems]);

    try {
      await supabase.from('sales_headers').insert(newHeader);
      await supabase.from('sales_items').insert(newItems);
    } catch (e) {
      // Demo fallback
    }

    loadAll();
    setExcelRows([]);
    setExcelFileName(null);
    setExcelSuccessMsg(
      `¡Cierre Excel procesado! Se descontaron ${valid.reduce((a, b) => a + b.quantity, 0)} piezas (${getPaymentMethodLabel(excelPaymentMethod)}) y se congelaron sus snapshots financieros.`
    );
  };

  // ==========================================================================
  // TAB 2: MANUAL CHECKLIST LOGIC
  // ==========================================================================
  const filteredChecklistProducts = products.filter((p) => {
    const matchesSearch =
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesBatch = !batchFilter || p.batch_id === batchFilter;
    return matchesSearch && matchesBatch;
  });

  const toggleProductSelection = (prod: Product) => {
    if (prod.stock_current <= 0) return;
    setSelectedQtyMap((prev) => {
      const next = { ...prev };
      if (next[prod.id]) {
        delete next[prod.id];
      } else {
        next[prod.id] = 1;
      }
      return next;
    });
  };

  const selectedProductIds = Object.keys(selectedQtyMap);
  const manualSummary = selectedProductIds.reduce(
    (acc, id) => {
      const p = products.find((item) => item.id === id);
      if (!p) return acc;
      const qty = selectedQtyMap[id] || 1;
      const discount = planTier >= 2 ? selectedDiscountMap[id] || 0 : 0;
      const finalNio = Math.max(0, p.price_nio - discount);
      const finalUsd = discount > 0 ? finalNio / exchangeRate : p.price_usd;
      const costUsd = p.landed_cost_usd || p.base_cost_usd || 0;

      acc.units += qty;
      acc.revenueNio += finalNio * qty;
      acc.revenueUsd += finalUsd * qty;
      acc.profitUsd += (finalUsd - costUsd) * qty;
      return acc;
    },
    { units: 0, revenueNio: 0, revenueUsd: 0, profitUsd: 0 }
  );

  const handleConfirmManualClosing = async () => {
    if (selectedProductIds.length === 0) return;

    const nowIso = new Date().toISOString();
    const headerId = `sale-hdr-${Date.now()}`;
    const isCredit = planTier >= 2 && manualPaymentMethod === 'credit_layaway';

    const newHeader: SalesHeader = {
      id: headerId,
      tenant_id: tenant?.id || TENANT_STELLA_ID,
      entry_mode: 'daily_closing_manual',
      sale_date: nowIso.slice(0, 10),
      payment_method: manualPaymentMethod,
      customer_name: null,
      customer_phone: null,
      amount_paid_nio: isCredit ? 0 : manualSummary.revenueNio,
      balance_due_nio: isCredit ? manualSummary.revenueNio : 0,
      payment_status: isCredit ? 'pending' : 'paid',
      promo_tag: 'Checklist Diario',
      notes: closingNotes.trim() || `Cierre manual rápido (${manualSummary.units} piezas)`,
      created_at: nowIso,
    };

    const newItems: SalesItem[] = [];
    const currentProds = [...products];

    selectedProductIds.forEach((id, idx) => {
      const p = currentProds.find((item) => item.id === id);
      if (!p) return;
      const qty = Math.min(p.stock_current, selectedQtyMap[id] || 1);
      if (qty <= 0) return;

      const unitCost = Number(p.landed_cost_usd || p.base_cost_usd || 0);
      const listPriceUsd = Number(p.price_usd || 0);
      const listPriceNio = Number(p.price_nio || 0);
      const discount = planTier >= 2 ? selectedDiscountMap[id] || 0 : 0;
      const finalNio = Math.max(0, listPriceNio - discount);
      const finalUsd = discount > 0 ? Math.round((finalNio / exchangeRate) * 100) / 100 : listPriceUsd;
      const profitUsd = Math.round((finalUsd - unitCost) * qty * 100) / 100;
      const lineTotalNio = finalNio * qty;

      newItems.push({
        id: `sale-itm-${Date.now()}-${idx}`,
        tenant_id: tenant?.id || TENANT_STELLA_ID,
        sale_header_id: headerId,
        product_id: p.id,
        sku_snapshot: p.sku,
        product_name_snapshot: p.name || p.sku,
        batch_id_snapshot: p.batch_id || null,
        quantity: qty,
        unit_cost_usd_snapshot: unitCost,
        list_price_usd_snapshot: listPriceUsd,
        list_price_nio_snapshot: listPriceNio,
        discount_nio: discount,
        final_unit_price_nio: finalNio,
        final_unit_price_usd: finalUsd,
        exchange_rate_snapshot: exchangeRate,
        net_profit_usd: profitUsd,
        payment_method: manualPaymentMethod,
        customer_name: null,
        customer_phone: null,
        amount_paid_nio: isCredit ? 0 : lineTotalNio,
        balance_due_nio: isCredit ? lineTotalNio : 0,
        payment_status: isCredit ? 'pending' : 'paid',
        created_at: nowIso,
      });

      const pIndex = currentProds.findIndex((item) => item.id === p.id);
      if (pIndex !== -1) {
        currentProds[pIndex] = {
          ...currentProds[pIndex],
          stock_current: Math.max(0, currentProds[pIndex].stock_current - qty),
          updated_at: nowIso,
        };
      }
    });

    saveStoredProducts(currentProds);
    saveStoredSalesHeaders([newHeader, ...salesHeaders]);
    saveStoredSalesItems([...newItems, ...salesItems]);

    setSelectedQtyMap({});
    setSelectedDiscountMap({});
    setClosingNotes('');
    loadAll();
    setManualSuccessMsg(
      `¡Cierre del día guardado! Se registraron ${newItems.length} referencias (${getPaymentMethodLabel(manualPaymentMethod)}) con sus snapshots financieros inmutables.`
    );
  };

  // ==========================================================================
  // TOTALS & CASH DRAWER RECONCILIATION (ARQUEO DE CAJA POR MÉTODO DE PAGO)
  // ==========================================================================
  const totalSoldUnits = salesItems.reduce((acc, i) => acc + i.quantity, 0);
  const totalRevenueNio = salesItems.reduce((acc, i) => acc + i.final_unit_price_nio * i.quantity, 0);
  const totalRevenueUsd = salesItems.reduce((acc, i) => acc + i.final_unit_price_usd * i.quantity, 0);
  const totalProfitUsd = salesItems.reduce((acc, i) => acc + i.net_profit_usd, 0);

  const arqueo = salesItems.reduce(
    (acc, item) => {
      const hdr = salesHeaders.find((h) => h.id === item.sale_header_id);
      const method: PaymentMethod = item.payment_method || hdr?.payment_method || 'cash_nio';
      const lineTotalNio = item.final_unit_price_nio * item.quantity;
      const lineTotalUsd = item.final_unit_price_usd * item.quantity;

      if (method === 'cash_nio') {
        acc.cashNio += lineTotalNio;
      } else if (method === 'cash_usd') {
        acc.cashUsd += lineTotalUsd;
        acc.cashUsdInNio += lineTotalNio;
      } else if (method === 'transfer_bac') {
        acc.bacNio += lineTotalNio;
      } else if (method === 'transfer_lafise') {
        acc.lafiseNio += lineTotalNio;
      } else if (method === 'transfer_banpro') {
        acc.banproNio += lineTotalNio;
      } else if (method === 'pos_card') {
        acc.posNio += lineTotalNio;
      } else if (method === 'credit_layaway') {
        const paidNio = item.amount_paid_nio ?? 0;
        const dueNio = item.balance_due_nio ?? Math.max(0, lineTotalNio - paidNio);
        acc.cashNio += paidNio;
        acc.creditDueNio += dueNio;
      }
      return acc;
    },
    {
      cashNio: 0,
      cashUsd: 0,
      cashUsdInNio: 0,
      bacNio: 0,
      lafiseNio: 0,
      banproNio: 0,
      posNio: 0,
      creditDueNio: 0,
    }
  );

  const totalBankTransfersNio = arqueo.bacNio + arqueo.lafiseNio + arqueo.banproNio;
  const expectedDrawerTotalNio = arqueo.cashNio + arqueo.cashUsdInNio;

  const hasCountedInput = countedCashNioInput.trim() !== '' || countedCashUsdInput.trim() !== '';
  const parsedCountedNio = Math.max(0, parseFloat(countedCashNioInput) || 0);
  const parsedCountedUsd = Math.max(0, parseFloat(countedCashUsdInput) || 0);
  const totalCountedInNio = parsedCountedNio + parsedCountedUsd * exchangeRate;
  const drawerDiffNio = totalCountedInNio - expectedDrawerTotalNio;
  const isExactMatch = hasCountedInput && Math.abs(drawerDiffNio) < 0.5;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900 tracking-tight">
              Motor de Salidas & Cierre Diario
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Snapshots Activos
            </span>
          </div>
          <p className="text-xs sm:text-sm text-deepSlate-500 mt-1">
            Registra ventas individuales con recibo WhatsApp o procesa el cierre diario y arqueo de caja de {businessName}.
          </p>
        </div>

        <button
          onClick={() => setIsQuickSaleOpen(true)}
          className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 active:scale-95 transition-all"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>+ Venta Rápida (1 a 1)</span>
        </button>
      </div>

      {/* Summary KPIs of Recorded Sales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-nacre-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-deepSlate-400">
              Piezas Vendidas
            </span>
            <CalendarCheck className="w-4 h-4 text-coral-500" />
          </div>
          <p className="text-2xl font-mono font-extrabold text-deepSlate-900">
            {totalSoldUnits} <span className="text-xs font-sans font-normal text-deepSlate-500">uds</span>
          </p>
          <span className="text-[11px] text-deepSlate-500">En {salesHeaders.length} cierres/ventas</span>
        </div>

        <div className="bg-white rounded-2xl border border-nacre-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-coral-600">
              Ventas Totales (C$)
            </span>
            <Coins className="w-4 h-4 text-coral-500" />
          </div>
          <p className="text-2xl font-mono font-extrabold text-coral-600">
            C$ {totalRevenueNio.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-deepSlate-500 font-mono">
            Snapshots en Córdobas
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-nacre-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-deepSlate-400">
              Equivalente ($ USD)
            </span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-mono font-extrabold text-deepSlate-900">
            ${totalRevenueUsd.toFixed(2)}
          </p>
          <span className="text-[11px] text-deepSlate-500 font-mono">
            Tasa vigente: C$ {exchangeRate.toFixed(2)}
          </span>
        </div>

        {role !== 'seller' ? (
          <div className="bg-white rounded-2xl border border-nacre-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Ganancia Libre Congelada
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-mono font-extrabold text-emerald-600">
              +${totalProfitUsd.toFixed(2)}
            </p>
            <span className="text-[11px] text-deepSlate-500 font-mono">
              ≈ C$ {(totalProfitUsd * exchangeRate).toFixed(2)} netos
            </span>
          </div>
        ) : (
          <div className="bg-nacre-100 rounded-2xl border border-nacre-200 p-4 flex flex-col justify-center">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-deepSlate-600">
              <Lock className="w-3.5 h-3.5 text-coral-500" />
              <span>Utilidad Protegida</span>
            </div>
            <span className="text-[11px] text-deepSlate-400 mt-0.5">
              Modo Vendedor activo
            </span>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* ARQUEO DE CAJA POR MÉTODO DE PAGO & CUADRE DE GAVETA                 */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-3xl border border-nacre-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-nacre-200 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-deepSlate-900">
              Arqueo de Caja por Método de Pago
            </h2>
            <p className="text-xs text-deepSlate-500">
              Desglose exacto de las ventas registradas según dónde debe estar el dinero (Gaveta física, Bancos, POS o Apartados).
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-nacre-100 text-deepSlate-700 self-start sm:self-auto">
            Efectivo Esperado en Gaveta: C$ {expectedDrawerTotalNio.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* 4 Payment Destination Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Efectivo en Gaveta (C$ y USD) */}
          <div className="rounded-2xl border border-nacre-200 bg-nacre-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-deepSlate-800">
                Efectivo en Gaveta
              </span>
              <Banknote className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="font-mono space-y-1">
              <p className="text-lg font-extrabold text-deepSlate-900">
                C$ {arqueo.cashNio.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-nacre-200">
                <span className="font-sans text-deepSlate-500">Billetes USD:</span>
                <span className="font-bold text-emerald-700">
                  ${arqueo.cashUsd.toFixed(2)} USD (C$ {arqueo.cashUsdInNio.toFixed(0)})
                </span>
              </div>
            </div>
          </div>

          {/* 2. Dinero en Bancos / Transferencias (BAC, Lafise, Banpro) */}
          <div className="rounded-2xl border border-nacre-200 bg-nacre-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-deepSlate-800">
                Bancos / Transferencias
              </span>
              <Landmark className="w-4 h-4 text-coral-500" />
            </div>
            <p className="text-lg font-mono font-extrabold text-coral-600">
              C$ {totalBankTransfersNio.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </p>
            <div className="grid grid-cols-3 gap-1 pt-1 border-t border-nacre-200 text-[10px] font-mono text-deepSlate-600">
              <div>
                <span className="font-sans font-bold block text-deepSlate-400">BAC</span>
                <span>C$ {arqueo.bacNio.toFixed(0)}</span>
              </div>
              <div>
                <span className="font-sans font-bold block text-deepSlate-400">Lafise</span>
                <span>C$ {arqueo.lafiseNio.toFixed(0)}</span>
              </div>
              <div>
                <span className="font-sans font-bold block text-deepSlate-400">Banpro</span>
                <span>C$ {arqueo.banproNio.toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* 3. Tarjeta / POS */}
          <div className="rounded-2xl border border-nacre-200 bg-nacre-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-deepSlate-800">
                Tarjeta / POS
              </span>
              <CreditCard className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-lg font-mono font-extrabold text-deepSlate-900">
              C$ {arqueo.posNio.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-nacre-200 font-mono">
              <span className="font-sans text-deepSlate-500">Equivalente USD:</span>
              <span className="text-deepSlate-700">
                ${(arqueo.posNio / exchangeRate).toFixed(2)} USD
              </span>
            </div>
          </div>

          {/* 4. Por Cobrar / Apartados (Nivel 2+) */}
          <div className="rounded-2xl border border-nacre-200 bg-nacre-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-deepSlate-800">
                Por Cobrar / Apartados
              </span>
              {planTier >= 2 ? (
                <Clock className="w-4 h-4 text-amber-600" />
              ) : (
                <Lock className="w-4 h-4 text-coral-500" />
              )}
            </div>
            {planTier >= 2 ? (
              <>
                <p className="text-lg font-mono font-extrabold text-amber-700">
                  C$ {arqueo.creditDueNio.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-nacre-200 font-mono">
                  <span className="font-sans text-deepSlate-500">Saldo clientes:</span>
                  <span className="text-amber-800 font-bold">
                    ${(arqueo.creditDueNio / exchangeRate).toFixed(2)} USD
                  </span>
                </div>
              </>
            ) : (
              <div className="pt-0.5 space-y-1.5">
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-coral-50 text-coral-600 border border-coral-200">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Módulo Nivel 2+</span>
                </span>
                <p className="text-[11px] text-deepSlate-500">
                  Controla abonos y saldos pendientes de clientes.{' '}
                  <button
                    type="button"
                    onClick={() => setSimulatedTier(2)}
                    className="text-coral-600 font-bold underline"
                  >
                    Probar Nivel 2
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Fast Cash Drawer Reconciliation Calculator (Cuadre de Efectivo en Gaveta) */}
        <div className="rounded-2xl bg-nacre-50 border border-nacre-200 p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-4 space-y-1">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-coral-500" />
                <h3 className="text-xs sm:text-sm font-extrabold text-deepSlate-900">
                  Calculadora de Cuadre de Efectivo en Gaveta
                </h3>
              </div>
              <p className="text-[11px] text-deepSlate-500">
                Digita el efectivo físico contado al cerrar para verificar si cuadra contra los{' '}
                <strong className="font-mono text-deepSlate-800">
                  C$ {expectedDrawerTotalNio.toFixed(2)}
                </strong>{' '}
                esperados en gaveta.
              </p>
            </div>

            <div className="lg:col-span-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-deepSlate-600 mb-1">
                  Efectivo Contado (C$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  placeholder={`Ej. ${arqueo.cashNio.toFixed(0)}`}
                  value={countedCashNioInput}
                  onChange={(e) => setCountedCashNioInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-nacre-200 focus:outline-none focus:border-coral-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-deepSlate-600 mb-1">
                  Billetes Contados ($ USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder={`Ej. ${arqueo.cashUsd.toFixed(0)}`}
                  value={countedCashUsdInput}
                  onChange={(e) => setCountedCashUsdInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-nacre-200 focus:outline-none focus:border-coral-500"
                />
              </div>
            </div>

            <div className="lg:col-span-4">
              {!hasCountedInput ? (
                <div className="p-3 rounded-xl bg-white border border-nacre-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-deepSlate-500 block">Esperado en Gaveta:</span>
                    <strong className="font-mono text-sm text-deepSlate-900">
                      C$ {expectedDrawerTotalNio.toFixed(2)}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCountedCashNioInput(arqueo.cashNio.toFixed(2));
                      setCountedCashUsdInput(arqueo.cashUsd > 0 ? arqueo.cashUsd.toFixed(2) : '0');
                    }}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-coral-50 hover:bg-coral-100 text-coral-600 border border-coral-200 transition-colors"
                  >
                    Simular Conteo Exacto
                  </button>
                </div>
              ) : isExactMatch ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-extrabold text-emerald-900 block">
                        ¡Gaveta Cuadrada Exacta!
                      </span>
                      <span className="font-mono text-[11px] text-emerald-700">
                        Contado: C$ {totalCountedInNio.toFixed(2)} (Dif: C$ 0.00)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCountedCashNioInput('');
                      setCountedCashUsdInput('');
                    }}
                    className="text-[11px] font-bold text-emerald-800 underline ml-2"
                  >
                    Limpiar
                  </button>
                </div>
              ) : drawerDiffNio > 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-extrabold text-amber-900 block">
                        Sobrante en Gaveta: +C$ {drawerDiffNio.toFixed(2)}
                      </span>
                      <span className="font-mono text-[11px] text-amber-800">
                        Contado C$ {totalCountedInNio.toFixed(2)} vs Esperado C$ {expectedDrawerTotalNio.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCountedCashNioInput('');
                      setCountedCashUsdInput('');
                    }}
                    className="text-[11px] font-bold text-amber-900 underline ml-2"
                  >
                    Limpiar
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <span className="font-extrabold text-rose-900 block">
                        Faltante en Gaveta: -C$ {Math.abs(drawerDiffNio).toFixed(2)}
                      </span>
                      <span className="font-mono text-[11px] text-rose-700">
                        Contado C$ {totalCountedInNio.toFixed(2)} vs Esperado C$ {expectedDrawerTotalNio.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCountedCashNioInput('');
                      setCountedCashUsdInput('');
                    }}
                    className="text-[11px] font-bold text-rose-800 underline ml-2"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="bg-white rounded-2xl border border-nacre-200 p-1.5 inline-flex flex-wrap gap-1 shadow-2xs">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'manual'
              ? 'bg-coral-500 text-white shadow-xs'
              : 'text-deepSlate-600 hover:bg-nacre-50'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Pestaña 1: Checklist Manual Rápido</span>
        </button>

        <button
          onClick={() => setActiveTab('excel')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'excel'
              ? 'bg-coral-500 text-white shadow-xs'
              : 'text-deepSlate-600 hover:bg-nacre-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Pestaña 2: Subir Excel / CSV del Día</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-coral-500 text-white shadow-xs'
              : 'text-deepSlate-600 hover:bg-nacre-50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Snapshots Guardados ({salesItems.length})</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB: MANUAL CHECKLIST                                                */}
      {/* ==================================================================== */}
      {activeTab === 'manual' && (
        <div className="space-y-4">
          {manualSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{manualSuccessMsg}</span>
              </div>
              <button onClick={() => setManualSuccessMsg(null)} className="text-emerald-700 underline">
                Ocultar
              </button>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-nacre-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-deepSlate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar SKU vendido hoy (ej. REP-402, TEC-109, FER-033)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 text-xs font-semibold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500"
              >
                <option value="">Todos los Lotes ({businessName})</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Checklist Table */}
          <div className="bg-white rounded-3xl border border-nacre-200 shadow-xs overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-nacre-100 border-b border-nacre-200 text-deepSlate-600 uppercase font-bold z-10">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Vendido</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Producto / Colección</th>
                    <th className="py-3 px-4 text-center">Stock Disp.</th>
                    <th className="py-3 px-4 text-right">Precio (C$)</th>
                    <th className="py-3 px-4 text-center w-28">Cant. Vendida</th>
                    <th className="py-3 px-4 text-right w-36">
                      Descuento C$ {planTier === 1 && '(N2)'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nacre-100">
                  {filteredChecklistProducts.map((p) => {
                    const isChecked = !!selectedQtyMap[p.id];
                    const bName = batches.find((b) => b.id === p.batch_id)?.name || 'General';
                    return (
                      <tr
                        key={p.id}
                        onClick={() => toggleProductSelection(p)}
                        className={`cursor-pointer transition-colors ${
                          p.stock_current <= 0
                            ? 'opacity-45 bg-nacre-50 cursor-not-allowed'
                            : isChecked
                            ? 'bg-coral-50/70'
                            : 'hover:bg-nacre-50/70'
                        }`}
                      >
                        <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            disabled={p.stock_current <= 0}
                            checked={isChecked}
                            onChange={() => toggleProductSelection(p)}
                            className="w-4 h-4 accent-coral-500 rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-deepSlate-900">{p.sku}</td>
                        <td className="py-2.5 px-4">
                          <span className="font-medium text-deepSlate-800 block">{p.name}</span>
                          <span className="text-[10px] text-deepSlate-400">{bName}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              p.stock_current > 0
                                ? 'bg-nacre-100 text-deepSlate-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {p.stock_current} uds
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-extrabold text-coral-600">
                          C$ {p.price_nio.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          {isChecked ? (
                            <input
                              type="number"
                              min="1"
                              max={p.stock_current}
                              value={selectedQtyMap[p.id] || 1}
                              onChange={(e) =>
                                setSelectedQtyMap((prev) => ({
                                  ...prev,
                                  [p.id]: Math.min(
                                    p.stock_current,
                                    Math.max(1, parseInt(e.target.value, 10) || 1)
                                  ),
                                }))
                              }
                              className="w-16 px-2 py-1 text-center font-mono font-bold rounded-lg border-2 border-coral-500 bg-white"
                            />
                          ) : (
                            <span className="text-deepSlate-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {isChecked ? (
                            planTier >= 2 ? (
                              <input
                                type="number"
                                min="0"
                                step="5"
                                value={selectedDiscountMap[p.id] || 0}
                                onChange={(e) =>
                                  setSelectedDiscountMap((prev) => ({
                                    ...prev,
                                    [p.id]: Math.max(0, parseFloat(e.target.value) || 0),
                                  }))
                                }
                                className="w-24 px-2 py-1 text-right font-mono font-bold rounded-lg border border-nacre-200 bg-white"
                              />
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-[10px] text-deepSlate-400">
                                <Lock className="w-3 h-3" />
                                <span>Nivel 2</span>
                              </span>
                            )
                          ) : (
                            <span className="text-deepSlate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Sticky Confirmation Footer */}
            <div className="p-4 sm:px-6 bg-nacre-50 border-t border-nacre-200 flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-deepSlate-500">Seleccionados: </span>
                  <strong className="font-mono text-deepSlate-900">{manualSummary.units} uds</strong>
                </div>
                <div>
                  <span className="text-deepSlate-500">Total C$: </span>
                  <strong className="font-mono text-coral-600">
                    C$ {manualSummary.revenueNio.toFixed(2)}
                  </strong>
                </div>
                {role !== 'seller' && (
                  <div>
                    <span className="text-deepSlate-500">Utilidad Neta: </span>
                    <strong className="font-mono text-emerald-600">
                      +${manualSummary.profitUsd.toFixed(2)} USD
                    </strong>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
                <select
                  value={manualPaymentMethod}
                  onChange={(e) => setManualPaymentMethod(e.target.value as PaymentMethod)}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-white border border-nacre-200 focus:outline-none focus:border-coral-500"
                >
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <option
                      key={opt.id}
                      value={opt.id}
                      disabled={opt.requiresTier2 && planTier < 2}
                    >
                      {opt.shortLabel} {opt.requiresTier2 && planTier < 2 ? '(Nivel 2)' : ''}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Nota opcional del cierre..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-white border border-nacre-200 focus:outline-none focus:border-coral-500 w-full sm:w-48"
                />
                <button
                  type="button"
                  disabled={selectedProductIds.length === 0}
                  onClick={handleConfirmManualClosing}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 disabled:opacity-40 flex items-center space-x-2 shrink-0"
                >
                  <span>Confirmar Cierre ({manualSummary.units})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB: EXCEL / CSV UPLOAD                                              */}
      {/* ==================================================================== */}
      {activeTab === 'excel' && (
        <div className="bg-white rounded-3xl border border-nacre-200 p-6 space-y-6 shadow-xs">
          {excelSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{excelSuccessMsg}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-nacre-200">
            <div>
              <h3 className="text-base font-extrabold text-deepSlate-900">
                Conciliación Masiva de Cierre Diario por Excel / CSV
              </h3>
              <p className="text-xs text-deepSlate-500">
                Sube una hoja con las columnas <strong>Codigo</strong> y <strong>Cantidad</strong> para cruzar contra el catálogo de {businessName} y guardar los snapshots del día.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleLoadSampleExcelClosing}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-coral-50 hover:bg-coral-100 text-coral-700 border border-coral-200 transition-colors"
              >
                Simular Excel con SKUs Activos
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-nacre-100 hover:bg-nacre-200 text-deepSlate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Plantilla .xlsx</span>
              </button>
            </div>
          </div>

          {excelRows.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-coral-200 hover:border-coral-400 bg-coral-50/20 rounded-3xl p-10 text-center cursor-pointer transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-coral-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-deepSlate-900">
                Haz clic para subir tu archivo Excel/CSV de ventas del día
              </p>
              <p className="text-xs text-deepSlate-500 mt-1">
                O descarga la plantilla con códigos de ejemplo (<code>REP-402</code>, <code>TEC-109</code>, <code>FER-033</code>).
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-nacre-50 p-3.5 rounded-2xl border border-nacre-200 text-xs">
                <span className="font-bold text-deepSlate-800">
                  Archivo cargado: <span className="font-mono text-coral-600">{excelFileName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setExcelRows([]);
                    setExcelFileName(null);
                  }}
                  className="text-coral-600 font-bold hover:underline"
                >
                  Limpiar y subir otro
                </button>
              </div>

              <div className="overflow-x-auto border border-nacre-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-nacre-100 border-b border-nacre-200 text-deepSlate-600 uppercase font-bold">
                    <tr>
                      <th className="py-2.5 px-4">Estado</th>
                      <th className="py-2.5 px-4">SKU</th>
                      <th className="py-2.5 px-4">Producto en Catálogo</th>
                      <th className="py-2.5 px-4 text-center">Cant.</th>
                      {role !== 'seller' && <th className="py-2.5 px-4 text-right">Costo Snapshot</th>}
                      <th className="py-2.5 px-4 text-right">Precio Final (C$)</th>
                      {role !== 'seller' && <th className="py-2.5 px-4 text-right">Ganancia Neta</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nacre-100">
                    {excelRows.map((r, i) => {
                      const p = r.product;
                      const cost = p ? p.landed_cost_usd || p.base_cost_usd : 0;
                      const finalNio = p ? Math.max(0, p.price_nio - r.discountNio) : 0;
                      const finalUsd = p
                        ? r.discountNio > 0
                          ? finalNio / exchangeRate
                          : p.price_usd
                        : 0;
                      const profit = (finalUsd - cost) * r.quantity;

                      return (
                        <tr key={i} className={r.isValid ? '' : 'bg-rose-50/50'}>
                          <td className="py-2.5 px-4">
                            {r.isValid ? (
                              <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Listo</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-rose-600 font-bold">
                                <AlertTriangle className="w-4 h-4" />
                                <span>{r.error}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold">{r.sku}</td>
                          <td className="py-2.5 px-4">{p?.name || '—'}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold">{r.quantity}</td>
                          {role !== 'seller' && (
                            <td className="py-2.5 px-4 text-right font-mono">${cost.toFixed(2)}</td>
                          )}
                          <td className="py-2.5 px-4 text-right font-mono font-extrabold text-coral-600">
                            C$ {(finalNio * r.quantity).toFixed(2)}
                          </td>
                          {role !== 'seller' && (
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                              +${profit.toFixed(2)} USD
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <select
                  value={excelPaymentMethod}
                  onChange={(e) => setExcelPaymentMethod(e.target.value as PaymentMethod)}
                  className="px-3 py-2.5 text-xs font-bold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500"
                >
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <option
                      key={opt.id}
                      value={opt.id}
                      disabled={opt.requiresTier2 && planTier < 2}
                    >
                      Método: {opt.shortLabel} {opt.requiresTier2 && planTier < 2 ? '(Nivel 2)' : ''}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleConfirmExcelClosing}
                  disabled={excelRows.filter((r) => r.isValid).length === 0}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 flex items-center space-x-2 disabled:opacity-50"
                >
                  <span>
                    Procesar Cierre y Congelar {excelRows.filter((r) => r.isValid).length} Snapshots
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB: IMMUTABLE SNAPSHOTS HISTORY                                     */}
      {/* ==================================================================== */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-nacre-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 bg-nacre-50 border-b border-nacre-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-deepSlate-900">
                Bitácora de Salidas con Snapshots Financieros Congelados
              </h3>
              <p className="text-xs text-deepSlate-500">
                Aunque cambies el costo o el precio en el catálogo hoy, estas ventas históricas conservan su costo, método de pago y tasa exactos del momento en que ocurrieron.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-nacre-100 border-b border-nacre-200 text-deepSlate-600 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">Fecha / Modo</th>
                  <th className="py-3 px-4">SKU Snapshot</th>
                  <th className="py-3 px-4">Producto / Cliente</th>
                  <th className="py-3 px-4">Método de Pago</th>
                  <th className="py-3 px-4 text-center">Cant.</th>
                  {role !== 'seller' && <th className="py-3 px-4 text-right">Costo Congelado</th>}
                  <th className="py-3 px-4 text-right">Descuento</th>
                  <th className="py-3 px-4 text-right">Cobrado (C$)</th>
                  <th className="py-3 px-4 text-right">Equiv. ($ USD)</th>
                  {role !== 'seller' && <th className="py-3 px-4 text-right">Utilidad Libre</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-nacre-100 font-mono">
                {salesItems.map((item) => {
                  const hdr = salesHeaders.find((h) => h.id === item.sale_header_id);
                  const modeBadge =
                    hdr?.entry_mode === 'single_sale'
                      ? 'Venta 1a1'
                      : hdr?.entry_mode === 'daily_closing_excel'
                      ? 'Cierre Excel'
                      : 'Checklist';
                  const method = item.payment_method || hdr?.payment_method || 'cash_nio';
                  const customer = item.customer_name || hdr?.customer_name;

                  return (
                    <tr key={item.id} className="hover:bg-nacre-50/60">
                      <td className="py-3 px-4 font-sans">
                        <span className="font-bold text-deepSlate-800 block">
                          {hdr?.sale_date || item.created_at.slice(0, 10)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-nacre-100 text-deepSlate-600 font-bold">
                          {modeBadge}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-deepSlate-900">{item.sku_snapshot}</td>
                      <td className="py-3 px-4 font-sans text-deepSlate-700">
                        <span className="block">{item.product_name_snapshot || item.sku_snapshot}</span>
                        {customer && (
                          <span className="text-[10px] text-deepSlate-400 font-semibold">
                            Cliente: {customer}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-coral-50 text-coral-700 border border-coral-200">
                          {getPaymentMethodLabel(method)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">{item.quantity}</td>
                      {role !== 'seller' && (
                        <td className="py-3 px-4 text-right text-deepSlate-500">
                          ${Number(item.unit_cost_usd_snapshot).toFixed(2)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right text-deepSlate-500">
                        {item.discount_nio > 0 ? `-C$ ${item.discount_nio.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-coral-600">
                        C$ {(item.final_unit_price_nio * item.quantity).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-deepSlate-900">
                        ${(item.final_unit_price_usd * item.quantity).toFixed(2)}
                      </td>
                      {role !== 'seller' && (
                        <td className="py-3 px-4 text-right font-extrabold text-emerald-600">
                          +${Number(item.net_profit_usd).toFixed(2)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Sale Modal */}
      <QuickSaleModal
        isOpen={isQuickSaleOpen}
        onClose={() => setIsQuickSaleOpen(false)}
        exchangeRate={exchangeRate}
        planTier={planTier}
        role={role}
        tenantId={tenant?.id}
        onSaleSuccess={loadAll}
      />
    </div>
  );
};
