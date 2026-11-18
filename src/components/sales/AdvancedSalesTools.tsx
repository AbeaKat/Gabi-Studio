import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  CheckSquare,
  FileSpreadsheet,
  Calculator,
  Upload,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Lock,
  Banknote,
  Landmark,
  CreditCard,
  Clock,
} from 'lucide-react';
import { Product, Batch, SalesHeader, SalesItem, PaymentMethod, PlanTier, UserRole } from '../../types';
import {
  saveStoredProducts,
  saveStoredSalesHeaders,
  saveStoredSalesItems,
  TENANT_STELLA_ID,
} from '../../data/realInventoryData';
import {
  PAYMENT_METHOD_OPTIONS,
  getPaymentMethodLabel,
  money,
  moneyUsd,
  localIsoDate,
  buildSalesItem,
} from './salesShared';
import { supabase } from '../../lib/supabase';

interface PreviewClosingRow {
  sku: string;
  quantity: number;
  discountNio: number;
  product?: Product;
  isValid: boolean;
  error?: string;
}

interface AdvancedSalesToolsProps {
  products: Product[];
  batches: Batch[];
  salesHeaders: SalesHeader[];
  salesItems: SalesItem[];
  exchangeRate: number;
  planTier: PlanTier;
  role: UserRole;
  businessName: string;
  tenantId: string;
  onDataChange: () => void;
  onUpgradePlan: (tier: PlanTier) => void;
}

export const AdvancedSalesTools: React.FC<AdvancedSalesToolsProps> = ({
  products,
  batches,
  salesHeaders,
  salesItems,
  exchangeRate,
  planTier,
  role,
  businessName,
  tenantId,
  onDataChange,
  onUpgradePlan,
}) => {
  const isOwner = role !== 'seller';
  const [activeTool, setActiveTool] = useState<'checklist' | 'excel' | 'cashbox'>('checklist');

  // ---------------------------------------------------------------------------
  // 1. Cierre manual masivo (lista rápida de productos vendidos)
  // ---------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [selectedQtyMap, setSelectedQtyMap] = useState<Record<string, number>>({});
  const [selectedDiscountMap, setSelectedDiscountMap] = useState<Record<string, number>>({});
  const [manualPaymentMethod, setManualPaymentMethod] = useState<PaymentMethod>('cash_nio');
  const [closingNotes, setClosingNotes] = useState('');
  const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null);

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
      tenant_id: tenantId || TENANT_STELLA_ID,
      entry_mode: 'daily_closing_manual',
      sale_date: localIsoDate(),
      payment_method: manualPaymentMethod,
      customer_name: null,
      customer_phone: null,
      amount_paid_nio: isCredit ? 0 : manualSummary.revenueNio,
      balance_due_nio: isCredit ? manualSummary.revenueNio : 0,
      payment_status: isCredit ? 'pending' : 'paid',
      promo_tag: 'Cierre en lista',
      notes: closingNotes.trim() || `Ventas anotadas en lista (${manualSummary.units} unidades)`,
      created_at: nowIso,
    };

    const newItems: SalesItem[] = [];
    const currentProds = [...products];

    selectedProductIds.forEach((id, idx) => {
      const p = currentProds.find((item) => item.id === id);
      if (!p) return;
      const qty = Math.min(p.stock_current, selectedQtyMap[id] || 1);
      if (qty <= 0) return;

      const discount = planTier >= 2 ? selectedDiscountMap[id] || 0 : 0;
      newItems.push(
        buildSalesItem({
          product: p,
          quantity: qty,
          discountNio: discount,
          paymentMethod: manualPaymentMethod,
          isCredit,
          exchangeRate,
          tenantId: tenantId || TENANT_STELLA_ID,
          headerId,
          idSuffix: idx,
          nowIso,
        })
      );

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

    try {
      await supabase.from('sales_headers').insert(newHeader);
      await supabase.from('sales_items').insert(newItems);
    } catch {
      // Guardado local en modo demo
    }

    setSelectedQtyMap({});
    setSelectedDiscountMap({});
    setClosingNotes('');
    onDataChange();
    setManualSuccessMsg(
      `¡Listo! Se guardaron ${newItems.length} ventas (${manualSummary.units} unidades) pagadas con ${getPaymentMethodLabel(manualPaymentMethod)}.`
    );
  };

  // ---------------------------------------------------------------------------
  // 2. Cierre por archivo Excel / CSV
  // ---------------------------------------------------------------------------
  const [excelRows, setExcelRows] = useState<PreviewClosingRow[]>([]);
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const [excelPaymentMethod, setExcelPaymentMethod] = useState<PaymentMethod>('cash_nio');
  const [excelSuccessMsg, setExcelSuccessMsg] = useState<string | null>(null);
  const [excelErrorMsg, setExcelErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        return { sku: '(Vacío)', quantity: qty, discountNio: discount, isValid: false, error: 'Código vacío' };
      }
      if (!matched) {
        return {
          sku: rawSku,
          quantity: qty,
          discountNio: discount,
          isValid: false,
          error: 'No encontramos este código',
        };
      }
      if (matched.stock_current < qty) {
        return {
          sku: matched.sku,
          quantity: qty,
          discountNio: discount,
          product: matched,
          isValid: false,
          error: `Solo quedan ${matched.stock_current} disponibles`,
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);
    setExcelSuccessMsg(null);
    setExcelErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        parseExcelClosing(rawJson);
      } catch {
        setExcelErrorMsg('No pudimos leer ese archivo. Asegúrate de que sea un archivo Excel (.xlsx) o CSV.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleLoadSampleExcelClosing = () => {
    setExcelSuccessMsg(null);
    setExcelErrorMsg(null);
    const safeTenantSlug = businessName.replace(/[^a-zA-Z0-9_-]/g, '_');
    setExcelFileName(`Ventas_Del_Dia_${safeTenantSlug}_Ejemplo.xlsx`);
    const available = products.filter((p) => p.stock_current > 0).slice(0, 5);
    const sampleRaw = available.map((p, i) => ({
      Codigo: p.sku,
      Cantidad: 1,
      Descuento_Cordobas: planTier >= 2 && i === 1 ? 40 : 0,
    }));
    parseExcelClosing(sampleRaw);
  };

  const handleDownloadTemplate = () => {
    const available = products.filter((p) => p.stock_current > 0).slice(0, 3);
    const sample =
      available.length > 0
        ? available.map((p, idx) => ({
            Codigo: p.sku,
            Cantidad: 1,
            Descuento_Cordobas: idx === 2 ? 20 : 0,
          }))
        : [
            { Codigo: 'ART-Aqua', Cantidad: 1, Descuento_Cordobas: 0 },
            { Codigo: 'AR-297-T51', Cantidad: 1, Descuento_Cordobas: 0 },
          ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas_Del_Dia');
    const safeTenantSlug = businessName.replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `Plantilla_Ventas_${safeTenantSlug}.xlsx`);
  };

  const handleConfirmExcelClosing = async () => {
    const valid = excelRows.filter((r) => r.isValid && r.product);
    if (valid.length === 0) return;

    const nowIso = new Date().toISOString();
    const headerId = `sale-hdr-${Date.now()}`;
    const isCredit = planTier >= 2 && excelPaymentMethod === 'credit_layaway';

    const newItems: SalesItem[] = [];
    const currentProds = [...products];
    let totalHeaderNio = 0;

    valid.forEach((row, idx) => {
      const p = row.product!;
      const discount = planTier >= 2 ? row.discountNio : 0;
      const item = buildSalesItem({
        product: p,
        quantity: row.quantity,
        discountNio: discount,
        paymentMethod: excelPaymentMethod,
        isCredit,
        exchangeRate,
        tenantId: tenantId || TENANT_STELLA_ID,
        headerId,
        idSuffix: idx,
        nowIso,
      });
      totalHeaderNio += item.final_unit_price_nio * row.quantity;
      newItems.push(item);

      const prodIdx = currentProds.findIndex((prod) => prod.id === p.id);
      if (prodIdx !== -1) {
        currentProds[prodIdx] = {
          ...currentProds[prodIdx],
          stock_current: Math.max(0, currentProds[prodIdx].stock_current - row.quantity),
          updated_at: nowIso,
        };
      }
    });

    const newHeader: SalesHeader = {
      id: headerId,
      tenant_id: tenantId || TENANT_STELLA_ID,
      entry_mode: 'daily_closing_excel',
      sale_date: localIsoDate(),
      payment_method: excelPaymentMethod,
      customer_name: null,
      customer_phone: null,
      amount_paid_nio: isCredit ? 0 : totalHeaderNio,
      balance_due_nio: isCredit ? totalHeaderNio : 0,
      payment_status: isCredit ? 'pending' : 'paid',
      promo_tag: 'Archivo Excel',
      notes: `Ventas cargadas desde archivo (${excelFileName || 'Excel'}) — ${valid.length} productos`,
      created_at: nowIso,
    };

    saveStoredProducts(currentProds);
    saveStoredSalesHeaders([newHeader, ...salesHeaders]);
    saveStoredSalesItems([...newItems, ...salesItems]);

    try {
      await supabase.from('sales_headers').insert(newHeader);
      await supabase.from('sales_items').insert(newItems);
    } catch {
      // Guardado local en modo demo
    }

    onDataChange();
    setExcelRows([]);
    setExcelFileName(null);
    setExcelSuccessMsg(
      `¡Ventas de Excel guardadas! Se descontaron ${valid.reduce((a, b) => a + b.quantity, 0)} unidades (${getPaymentMethodLabel(excelPaymentMethod)}).`
    );
  };

  // ---------------------------------------------------------------------------
  // 3. Cuadre de efectivo en caja
  // ---------------------------------------------------------------------------
  const todayIso = localIsoDate();
  const [arqueoScope, setArqueoScope] = useState<'today' | 'all'>('today');
  const [countedCashNioInput, setCountedCashNioInput] = useState<string>('');
  const [countedCashUsdInput, setCountedCashUsdInput] = useState<string>('');

  const scopedArqueoItems =
    arqueoScope === 'today'
      ? salesItems.filter((item) => {
          const hdr = salesHeaders.find((h) => h.id === item.sale_header_id);
          const itemDate = hdr?.sale_date || item.created_at.slice(0, 10);
          return itemDate === todayIso;
        })
      : salesItems;

  const arqueo = scopedArqueoItems.reduce(
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
        const abonoChannel: PaymentMethod = item.abono_payment_method || 'cash_nio';

        if (abonoChannel === 'cash_usd') {
          acc.cashUsd += paidNio / exchangeRate;
          acc.cashUsdInNio += paidNio;
        } else if (abonoChannel === 'transfer_bac') {
          acc.bacNio += paidNio;
        } else if (abonoChannel === 'transfer_lafise') {
          acc.lafiseNio += paidNio;
        } else if (abonoChannel === 'transfer_banpro') {
          acc.banproNio += paidNio;
        } else if (abonoChannel === 'pos_card') {
          acc.posNio += paidNio;
        } else {
          acc.cashNio += paidNio;
        }
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
    <div className="space-y-5">
      {/* Selector de herramienta avanzada */}
      <div className="bg-white rounded-2xl border border-nacre-200 p-2 flex flex-col sm:flex-row flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTool('checklist')}
          className={`flex items-center justify-center sm:justify-start gap-2 min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center ${
            activeTool === 'checklist'
              ? 'bg-coral-500 text-white shadow-xs'
              : 'text-deepSlate-700 hover:bg-nacre-50'
          }`}
        >
          <CheckSquare className="w-4 h-4 shrink-0" />
          <span>Anotar varias ventas de una lista</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('excel')}
          className={`flex items-center justify-center sm:justify-start gap-2 min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center ${
            activeTool === 'excel'
              ? 'bg-coral-500 text-white shadow-xs'
              : 'text-deepSlate-700 hover:bg-nacre-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 shrink-0" />
          <span>Subir ventas desde Excel</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('cashbox')}
          className={`flex items-center justify-center sm:justify-start gap-2 min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center ${
            activeTool === 'cashbox'
              ? 'bg-coral-500 text-white shadow-xs'
              : 'text-deepSlate-700 hover:bg-nacre-50'
          }`}
        >
          <Calculator className="w-4 h-4 shrink-0" />
          <span>Contar dinero en caja</span>
        </button>
      </div>

      {/* 1. LISTA RÁPIDA DE CIERRE MANUAL */}
      {activeTool === 'checklist' && (
        <div className="space-y-4">
          {manualSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{manualSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setManualSuccessMsg(null)}
                className="text-sm font-bold text-emerald-800 underline min-h-[40px] px-2"
              >
                Cerrar
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-nacre-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-5 h-5 text-deepSlate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder="Buscar por nombre o código del producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="w-full sm:w-64 min-h-[44px] px-3 py-2 text-sm font-semibold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500"
              >
                <option value="">Todas las colecciones / compras</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-nacre-200 shadow-xs overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-nacre-100 border-b border-nacre-200 text-deepSlate-700 font-bold z-10">
                  <tr>
                    <th className="py-3 px-4 w-14 text-center">Vendido</th>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4 text-center">Disponibles</th>
                    <th className="py-3 px-4 text-right">Precio (C$)</th>
                    <th className="py-3 px-4 text-center w-32">Cantidad</th>
                    <th className="py-3 px-4 text-right w-40">Descuento C$</th>
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
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            disabled={p.stock_current <= 0}
                            checked={isChecked}
                            onChange={() => toggleProductSelection(p)}
                            className="w-5 h-5 accent-coral-500 rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-deepSlate-900">{p.sku}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-deepSlate-900 block">{p.name}</span>
                          <span className="text-sm text-deepSlate-500">{bName}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-sm font-bold ${
                              p.stock_current > 0
                                ? 'bg-nacre-100 text-deepSlate-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {p.stock_current > 0 ? `${p.stock_current} uds` : 'Agotado'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-coral-600">
                          {money(p.price_nio)}
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
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
                              className="w-20 min-h-[40px] px-2 py-1 text-center font-bold rounded-xl border-2 border-coral-500 bg-white"
                            />
                          ) : (
                            <span className="text-deepSlate-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
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
                                className="w-24 min-h-[40px] px-2 py-1 text-right font-bold rounded-xl border border-nacre-300 bg-white"
                              />
                            ) : (
                              <span className="inline-flex items-center gap-1 text-sm text-deepSlate-500">
                                <Lock className="w-3.5 h-3.5 text-coral-500" />
                                <span>Plan Crece</span>
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

            <div className="p-4 sm:px-6 bg-nacre-50 border-t border-nacre-200 flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div>
                  <span className="text-deepSlate-600">Seleccionados: </span>
                  <strong className="text-deepSlate-900">{manualSummary.units} unidades</strong>
                </div>
                <div>
                  <span className="text-deepSlate-600">Total a cobrar: </span>
                  <strong className="text-coral-600 text-base">{money(manualSummary.revenueNio)}</strong>
                </div>
                {isOwner && (
                  <div>
                    <span className="text-deepSlate-600">Ganancia: </span>
                    <strong className="text-emerald-700">
                      +{moneyUsd(manualSummary.profitUsd)}
                    </strong>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                <select
                  value={manualPaymentMethod}
                  onChange={(e) => setManualPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full sm:w-auto min-h-[44px] px-3 py-2 text-sm font-bold rounded-xl bg-white border border-nacre-300 focus:outline-none focus:border-coral-500"
                >
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <option
                      key={opt.id}
                      value={opt.id}
                      disabled={opt.requiresTier2 && planTier < 2}
                    >
                      {opt.shortLabel} {opt.requiresTier2 && planTier < 2 ? '(Plan Crece)' : ''}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Nota opcional (ej. ventas de la tarde)..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="min-h-[44px] px-3 py-2 text-sm rounded-xl bg-white border border-nacre-300 focus:outline-none focus:border-coral-500 w-full sm:w-56"
                />
                <button
                  type="button"
                  disabled={selectedProductIds.length === 0}
                  onClick={handleConfirmManualClosing}
                  className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl text-sm font-extrabold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 disabled:opacity-40 flex items-center justify-center gap-2 text-center"
                >
                  <span>Guardar ventas seleccionadas ({manualSummary.units})</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SUBIR ARCHIVO EXCEL */}
      {activeTool === 'excel' && (
        <div className="bg-white rounded-3xl border border-nacre-200 p-5 sm:p-6 space-y-5 shadow-xs">
          {excelSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{excelSuccessMsg}</span>
            </div>
          )}
          {excelErrorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{excelErrorMsg}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-nacre-200">
            <div>
              <h3 className="text-lg font-extrabold text-deepSlate-900">
                Subir ventas del día desde un archivo Excel
              </h3>
              <p className="text-sm text-deepSlate-600">
                Sube una hoja con las columnas <strong>Codigo</strong> y <strong>Cantidad</strong> para descontar los productos vendidos.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSampleExcelClosing}
                className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold bg-coral-50 hover:bg-coral-100 text-coral-700 border border-coral-200 transition-colors"
              >
                Probar con datos de ejemplo
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold bg-nacre-100 hover:bg-nacre-200 text-deepSlate-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Descargar plantilla Excel</span>
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
              <Upload className="w-10 h-10 text-coral-500 mx-auto mb-3" />
              <p className="text-base font-extrabold text-deepSlate-900">
                Toca aquí para elegir tu archivo Excel o CSV
              </p>
              <p className="text-sm text-deepSlate-600 mt-1">
                Si no tienes uno listo, descarga la plantilla de arriba o usa el botón de ejemplo.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-nacre-50 p-4 rounded-2xl border border-nacre-200 text-sm">
                <span className="font-bold text-deepSlate-800">
                  Archivo: <span className="font-mono text-coral-600">{excelFileName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setExcelRows([]);
                    setExcelFileName(null);
                  }}
                  className="text-coral-600 font-bold hover:underline min-h-[40px]"
                >
                  Quitar y subir otro
                </button>
              </div>

              <div className="overflow-x-auto border border-nacre-200 rounded-2xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-nacre-100 border-b border-nacre-200 text-deepSlate-700 font-bold">
                    <tr>
                      <th className="py-3 px-4">Revisión</th>
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4">Producto</th>
                      <th className="py-3 px-4 text-center">Cantidad</th>
                      <th className="py-3 px-4 text-right">Total (C$)</th>
                      {isOwner && <th className="py-3 px-4 text-right">Ganancia</th>}
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
                          <td className="py-3 px-4">
                            {r.isValid ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Listo</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-rose-600 font-bold">
                                <AlertTriangle className="w-4 h-4" />
                                <span>{r.error}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">{r.sku}</td>
                          <td className="py-3 px-4">{p?.name || '—'}</td>
                          <td className="py-3 px-4 text-center font-bold">{r.quantity}</td>
                          <td className="py-3 px-4 text-right font-extrabold text-coral-600">
                            {money(finalNio * r.quantity)}
                          </td>
                          {isOwner && (
                            <td className="py-3 px-4 text-right font-bold text-emerald-700">
                              +{moneyUsd(profit)}
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
                  className="min-h-[48px] px-4 py-2.5 text-sm font-bold rounded-xl bg-nacre-50 border border-nacre-300 focus:outline-none focus:border-coral-500"
                >
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <option
                      key={opt.id}
                      value={opt.id}
                      disabled={opt.requiresTier2 && planTier < 2}
                    >
                      Cómo se cobró: {opt.shortLabel} {opt.requiresTier2 && planTier < 2 ? '(Plan Crece)' : ''}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleConfirmExcelClosing}
                  disabled={excelRows.filter((r) => r.isValid).length === 0}
                  className="min-h-[48px] px-6 py-2.5 rounded-xl text-sm font-extrabold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 flex items-center gap-2 disabled:opacity-50"
                >
                  <span>
                    Guardar {excelRows.filter((r) => r.isValid).length} ventas válidas
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. CUADRE DE EFECTIVO EN CAJA */}
      {activeTool === 'cashbox' && (
        <div className="bg-white rounded-3xl border border-nacre-200 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-nacre-200 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-deepSlate-900">
                ¿Dónde está el dinero de las ventas?
              </h3>
              <p className="text-sm text-deepSlate-600">
                Revisa cuánto dinero entró en efectivo, transferencias bancarias, tarjeta o pagos pendientes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center p-1 rounded-xl bg-nacre-100 border border-nacre-200">
                <button
                  type="button"
                  onClick={() => setArqueoScope('today')}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    arqueoScope === 'today'
                      ? 'bg-coral-500 text-white shadow-2xs'
                      : 'text-deepSlate-700 hover:text-deepSlate-900'
                  }`}
                >
                  Ventas de hoy
                </button>
                <button
                  type="button"
                  onClick={() => setArqueoScope('all')}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    arqueoScope === 'all'
                      ? 'bg-coral-500 text-white shadow-2xs'
                      : 'text-deepSlate-700 hover:text-deepSlate-900'
                  }`}
                >
                  Todas las ventas ({salesItems.length})
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-nacre-200 bg-nacre-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-deepSlate-800">Efectivo en caja</span>
                <Banknote className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-xl font-extrabold text-deepSlate-900">{money(arqueo.cashNio)}</p>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-nacre-200">
                <span className="text-deepSlate-600">En dólares:</span>
                <span className="font-bold text-emerald-700">
                  {moneyUsd(arqueo.cashUsd)} ({money(arqueo.cashUsdInNio)})
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-nacre-200 bg-nacre-50/70 p-4 space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-deepSlate-800">Transferencias</span>
                <Landmark className="w-5 h-5 text-coral-500 shrink-0" />
              </div>
              <p className="text-xl font-extrabold text-coral-600 break-words">{money(totalBankTransfersNio)}</p>
              <div className="space-y-1 pt-2 border-t border-nacre-200 text-xs sm:text-sm text-deepSlate-700">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-deepSlate-500">BAC</span>
                  <span className="font-semibold">{money(arqueo.bacNio)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-deepSlate-500">Lafise</span>
                  <span className="font-semibold">{money(arqueo.lafiseNio)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-deepSlate-500">Banpro</span>
                  <span className="font-semibold">{money(arqueo.banproNio)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-nacre-200 bg-nacre-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-deepSlate-800">Pagos con tarjeta</span>
                <CreditCard className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-xl font-extrabold text-deepSlate-900">{money(arqueo.posNio)}</p>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-nacre-200">
                <span className="text-deepSlate-600">Equivalente:</span>
                <span className="font-semibold text-deepSlate-700">
                  {moneyUsd(arqueo.posNio / exchangeRate)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-nacre-200 bg-nacre-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-deepSlate-800">Pagos pendientes</span>
                {planTier >= 2 ? (
                  <Clock className="w-5 h-5 text-amber-600" />
                ) : (
                  <Lock className="w-5 h-5 text-coral-500" />
                )}
              </div>
              {planTier >= 2 ? (
                <>
                  <p className="text-xl font-extrabold text-amber-700">{money(arqueo.creditDueNio)}</p>
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-nacre-200">
                    <span className="text-deepSlate-600">Por cobrar:</span>
                    <span className="text-amber-800 font-bold">
                      {moneyUsd(arqueo.creditDueNio / exchangeRate)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-sm text-deepSlate-600">
                    Lleva el control de quién te dejó un adelanto y cuánto te falta por cobrar.
                  </p>
                  <button
                    type="button"
                    onClick={() => onUpgradePlan(2)}
                    className="text-sm text-coral-600 font-bold underline"
                  >
                    Probar Plan Crece
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Calculadora de efectivo en caja */}
          <div className="rounded-2xl bg-nacre-50 border border-nacre-200 p-4 sm:p-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-4 space-y-1">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-coral-500" />
                  <h4 className="text-base font-extrabold text-deepSlate-900">
                    Comprobar efectivo en caja
                  </h4>
                </div>
                <p className="text-sm text-deepSlate-600">
                  Cuenta tus billetes y escríbelos aquí para ver si coinciden con los{' '}
                  <strong className="text-deepSlate-900">{money(expectedDrawerTotalNio)}</strong> que deberían estar en caja.
                </p>
              </div>

              <div className="lg:col-span-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-deepSlate-700 mb-1">
                    Billetes en C$
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    placeholder={`Ej. ${arqueo.cashNio.toFixed(0)}`}
                    value={countedCashNioInput}
                    onChange={(e) => setCountedCashNioInput(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-base font-bold rounded-xl bg-white border border-nacre-300 focus:outline-none focus:border-coral-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-deepSlate-700 mb-1">
                    Billetes en $ USD
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder={`Ej. ${arqueo.cashUsd.toFixed(0)}`}
                    value={countedCashUsdInput}
                    onChange={(e) => setCountedCashUsdInput(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-base font-bold rounded-xl bg-white border border-nacre-300 focus:outline-none focus:border-coral-500"
                  />
                </div>
              </div>

              <div className="lg:col-span-4">
                {!hasCountedInput ? (
                  <div className="p-3.5 rounded-xl bg-white border border-nacre-200 flex items-center justify-between gap-2 text-sm">
                    <div>
                      <span className="text-deepSlate-500 block">Debería haber en caja:</span>
                      <strong className="text-base text-deepSlate-900">
                        {money(expectedDrawerTotalNio)}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCountedCashNioInput(arqueo.cashNio.toFixed(2));
                        setCountedCashUsdInput(arqueo.cashUsd > 0 ? arqueo.cashUsd.toFixed(2) : '0');
                      }}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl text-sm font-bold bg-coral-50 hover:bg-coral-100 text-coral-600 border border-coral-200"
                    >
                      Probar conteo exacto
                    </button>
                  </div>
                ) : isExactMatch ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-extrabold text-emerald-900 block">
                          ¡La caja cuadra perfecto!
                        </span>
                        <span className="text-emerald-700">
                          Contaste {money(totalCountedInNio)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCountedCashNioInput('');
                        setCountedCashUsdInput('');
                      }}
                      className="text-sm font-bold text-emerald-800 underline ml-2"
                    >
                      Limpiar
                    </button>
                  </div>
                ) : drawerDiffNio > 0 ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-extrabold text-amber-900 block">
                          Sobran {money(drawerDiffNio)} en caja
                        </span>
                        <span className="text-amber-800">
                          Contaste {money(totalCountedInNio)} vs {money(expectedDrawerTotalNio)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCountedCashNioInput('');
                        setCountedCashUsdInput('');
                      }}
                      className="text-sm font-bold text-amber-900 underline ml-2"
                    >
                      Limpiar
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      <div>
                        <span className="font-extrabold text-rose-900 block">
                          Faltan {money(Math.abs(drawerDiffNio))} en caja
                        </span>
                        <span className="text-rose-700">
                          Contaste {money(totalCountedInNio)} vs {money(expectedDrawerTotalNio)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCountedCashNioInput('');
                        setCountedCashUsdInput('');
                      }}
                      className="text-sm font-bold text-rose-800 underline ml-2"
                    >
                      Limpiar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
