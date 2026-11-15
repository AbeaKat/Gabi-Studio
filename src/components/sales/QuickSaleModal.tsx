import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Lock,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Landmark,
  CreditCard,
  Clock,
  Send,
  Minus,
  Plus,
  Coins,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Product, PlanTier, UserRole, SalesHeader, SalesItem, PaymentMethod } from '../../types';
import {
  getStoredProducts,
  saveStoredProducts,
  getStoredSalesHeaders,
  saveStoredSalesHeaders,
  getStoredSalesItems,
  saveStoredSalesItems,
  TENANT_STELLA_ID,
} from '../../data/realInventoryData';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  PAYMENT_METHOD_OPTIONS,
  getPaymentMethodLabel,
  BANK_OPTIONS,
  money,
  moneyUsd,
  localIsoDate,
} from './salesShared';

// Se re-exportan para no romper otras pantallas que ya los importan desde aquí.
export { PAYMENT_METHOD_OPTIONS, getPaymentMethodLabel };

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchangeRate: number;
  planTier: PlanTier;
  role: UserRole;
  tenantId?: string;
  onSaleSuccess?: () => void;
  initialProduct?: Product | null;
}

type PayChoice = 'cash_nio' | 'cash_usd' | 'transfer' | 'pos_card' | 'credit_layaway';

const PAY_TILES: Array<{ id: PayChoice; label: string; hint: string; icon: React.ElementType }> = [
  { id: 'cash_nio', label: 'Efectivo córdobas', hint: 'Billetes C$', icon: Banknote },
  { id: 'cash_usd', label: 'Efectivo dólares', hint: 'Billetes $', icon: Coins },
  { id: 'transfer', label: 'Transferencia', hint: 'BAC, Lafise o Banpro', icon: Landmark },
  { id: 'pos_card', label: 'Tarjeta', hint: 'Pago con tarjeta', icon: CreditCard },
  { id: 'credit_layaway', label: 'Me deja un abono / paga después', hint: 'Queda con pago pendiente', icon: Clock },
];

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localIsoDate(d);
};

export const QuickSaleModal: React.FC<QuickSaleModalProps> = ({
  isOpen,
  onClose,
  exchangeRate,
  planTier,
  role,
  tenantId = TENANT_STELLA_ID,
  onSaleSuccess,
  initialProduct = null,
}) => {
  const { tenant, setSimulatedTier } = useAuth();
  const businessName = tenant?.name || 'Mi Negocio';
  const isOwnerView = role !== 'seller';
  const searchRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct);
  const [quantity, setQuantity] = useState<string>('1');
  const [discountNio, setDiscountNio] = useState<string>('');
  const [showDiscount, setShowDiscount] = useState(false);
  const [payChoice, setPayChoice] = useState<PayChoice>('cash_nio');
  const [bank, setBank] = useState<PaymentMethod>('transfer_bac');
  const [initialPaymentNio, setInitialPaymentNio] = useState<string>('');
  const [abonoMethod, setAbonoMethod] = useState<PaymentMethod>('cash_nio');
  const [dueDate, setDueDate] = useState<string>(addDays(15));
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [showCustomer, setShowCustomer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState<null | {
    product: Product;
    qty: number;
    total: number;
    totalUsd: number;
    discountTotal: number;
    method: PaymentMethod;
    paidNow: number;
    due: number;
    dueDate: string | null;
    profitUsd: number;
    customer: string;
    receiptId: string;
  }>(null);

  const products = useMemo(() => {
    if (!isOpen) return [];
    return getStoredProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, saved]);

  const matchingProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? products.filter(
          (p) => p.sku.toLowerCase().includes(q) || (p.name && p.name.toLowerCase().includes(q))
        )
      : products.filter((p) => p.stock_current > 0);
    return list.slice(0, 8);
  }, [products, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      setSelectedProduct(initialProduct);
      if (!initialProduct) setTimeout(() => searchRef.current?.focus(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const hasCrece = planTier >= 2;
  const activeProd = selectedProduct;
  const qtyNum = Math.max(0, parseInt(quantity, 10) || 0);
  const listPriceNio = activeProd ? Number(activeProd.price_nio || 0) : 0;
  const listPriceUsd = activeProd ? Number(activeProd.price_usd || 0) : 0;
  const unitCostUsd = activeProd ? Number(activeProd.landed_cost_usd || activeProd.base_cost_usd || 0) : 0;

  const parsedDiscountNio = hasCrece ? Math.max(0, parseFloat(discountNio) || 0) : 0;
  const finalUnitPriceNio = Math.max(0, listPriceNio - parsedDiscountNio);
  const finalUnitPriceUsd =
    parsedDiscountNio > 0 ? Math.round((finalUnitPriceNio / exchangeRate) * 100) / 100 : listPriceUsd;
  const totalChargeNio = finalUnitPriceNio * qtyNum;
  const totalChargeUsd = finalUnitPriceUsd * qtyNum;
  const totalDiscountNio = parsedDiscountNio * qtyNum;
  const netProfitUsd = Math.round((finalUnitPriceUsd - unitCostUsd) * qtyNum * 100) / 100;

  const isCreditMode = hasCrece && payChoice === 'credit_layaway';
  const paymentMethod: PaymentMethod =
    payChoice === 'transfer' ? bank : (payChoice as PaymentMethod);
  const parsedAbonoNio = isCreditMode
    ? Math.min(totalChargeNio, Math.max(0, parseFloat(initialPaymentNio) || 0))
    : totalChargeNio;
  const balanceDueNio = isCreditMode ? Math.max(0, totalChargeNio - parsedAbonoNio) : 0;
  const paymentStatus: 'paid' | 'partial' | 'pending' = !isCreditMode
    ? 'paid'
    : balanceDueNio > 0
    ? parsedAbonoNio > 0
      ? 'partial'
      : 'pending'
    : 'paid';

  const pickProduct = (p: Product) => {
    if (p.stock_current <= 0) return;
    setSelectedProduct(p);
    setQuantity('1');
    setDiscountNio('');
    setErrorMessage(null);
    setSearchQuery('');
  };

  const changeQty = (delta: number) => {
    const max = activeProd?.stock_current ?? 999;
    setQuantity(String(Math.min(max, Math.max(1, qtyNum + delta))));
  };

  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!activeProd) {
      setErrorMessage('Primero busca y elige qué producto vendiste.');
      return;
    }
    if (qtyNum <= 0) {
      setErrorMessage('Escribe cuántas unidades vendiste (mínimo 1).');
      return;
    }
    if (qtyNum > activeProd.stock_current) {
      setErrorMessage(
        `Solo te quedan ${activeProd.stock_current} unidad(es) de "${activeProd.name || activeProd.sku}". Baja la cantidad o actualiza tus productos.`
      );
      return;
    }
    if (parsedDiscountNio > listPriceNio) {
      setErrorMessage(`El descuento no puede ser mayor que el precio (${money(listPriceNio)}).`);
      return;
    }
    if (hasCrece && payChoice === 'credit_layaway') {
      if (!customerName.trim()) {
        setShowCustomer(true);
        setErrorMessage('Si el cliente paga después, anota su nombre para saber quién te debe.');
        return;
      }
      if (!customerPhone.trim()) {
        setShowCustomer(true);
        setErrorMessage('Anota el WhatsApp del cliente para poder recordarle su pago.');
        return;
      }
      if ((parseFloat(initialPaymentNio) || 0) > totalChargeNio) {
        setErrorMessage(`El abono no puede ser mayor que el total (${money(totalChargeNio)}).`);
        return;
      }
      if (!dueDate) {
        setErrorMessage('Elige hasta qué fecha el cliente se compromete a pagar.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const shortCode = String(Date.now()).slice(-6);
      const headerId = `sale-hdr-${Date.now()}`;
      const itemId = `sale-itm-${Date.now()}`;
      const cleanCustomerName = customerName.trim() || null;
      const cleanCustomerPhone = customerPhone.trim() || null;
      const effectiveDueDate = isCreditMode && balanceDueNio > 0 ? dueDate : null;

      const newHeader: SalesHeader = {
        id: headerId,
        tenant_id: tenantId,
        entry_mode: 'single_sale',
        sale_date: localIsoDate(),
        payment_method: paymentMethod,
        customer_name: cleanCustomerName,
        customer_phone: cleanCustomerPhone,
        amount_paid_nio: parsedAbonoNio,
        balance_due_nio: balanceDueNio,
        payment_status: paymentStatus,
        due_date: effectiveDueDate,
        promo_tag: null,
        notes: `Venta anotada (${activeProd.sku})`,
        created_at: nowIso,
      };

      const newItem: SalesItem = {
        id: itemId,
        tenant_id: tenantId,
        sale_header_id: headerId,
        product_id: activeProd.id,
        sku_snapshot: activeProd.sku,
        product_name_snapshot: activeProd.name || activeProd.sku,
        batch_id_snapshot: activeProd.batch_id || null,
        quantity: qtyNum,
        unit_cost_usd_snapshot: unitCostUsd,
        list_price_usd_snapshot: listPriceUsd,
        list_price_nio_snapshot: listPriceNio,
        discount_nio: parsedDiscountNio,
        final_unit_price_nio: finalUnitPriceNio,
        final_unit_price_usd: finalUnitPriceUsd,
        exchange_rate_snapshot: exchangeRate,
        net_profit_usd: netProfitUsd,
        payment_method: paymentMethod,
        ...(isCreditMode && parsedAbonoNio > 0 ? { abono_payment_method: abonoMethod } : {}),
        customer_name: cleanCustomerName,
        customer_phone: cleanCustomerPhone,
        amount_paid_nio: parsedAbonoNio,
        balance_due_nio: balanceDueNio,
        payment_status: paymentStatus,
        due_date: effectiveDueDate,
        created_at: nowIso,
      };

      const updatedProducts = getStoredProducts().map((p) =>
        p.id === activeProd.id
          ? { ...p, stock_current: Math.max(0, p.stock_current - qtyNum), updated_at: nowIso }
          : p
      );
      saveStoredProducts(updatedProducts);
      saveStoredSalesHeaders([newHeader, ...getStoredSalesHeaders()]);
      saveStoredSalesItems([newItem, ...getStoredSalesItems()]);

      try {
        await supabase.from('sales_headers').insert(newHeader);
        await supabase.from('sales_items').insert(newItem);
        await supabase
          .from('products')
          .update({ stock_current: Math.max(0, activeProd.stock_current - qtyNum) })
          .eq('id', activeProd.id);
      } catch (dbErr) {
        console.warn('Guardado en este dispositivo (modo demo):', dbErr);
      }

      setSaved({
        product: activeProd,
        qty: qtyNum,
        total: totalChargeNio,
        totalUsd: totalChargeUsd,
        discountTotal: totalDiscountNio,
        method: paymentMethod,
        paidNow: parsedAbonoNio,
        due: balanceDueNio,
        dueDate: effectiveDueDate,
        profitUsd: netProfitUsd,
        customer: cleanCustomerName || '',
        receiptId: `REC-${shortCode}`,
      });
      if (onSaleSuccess) onSaleSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || 'No se pudo guardar la venta. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendWhatsAppReceipt = () => {
    if (!saved) return;
    const rawDigits = customerPhone.replace(/[^0-9]/g, '');
    const formattedPhone = rawDigits.length === 8 ? `505${rawDigits}` : rawDigits;
    const dateStr = new Date().toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' });

    const lines = [
      `*COMPROBANTE DE COMPRA*`,
      `*${businessName}*`,
      `Recibo: ${saved.receiptId} • Fecha: ${dateStr}`,
      saved.customer ? `Cliente: ${saved.customer}` : null,
      `--------------------------------`,
      `• *Producto:* ${saved.product.name || saved.product.sku}`,
      `• *Cantidad:* ${saved.qty} x ${money(Number(saved.product.price_nio || 0))}`,
      saved.discountTotal > 0 ? `• *Descuento:* -${money(saved.discountTotal)}` : null,
      `--------------------------------`,
      `*TOTAL:* ${money(saved.total)}`,
      `*Pagó con:* ${getPaymentMethodLabel(saved.method)}`,
      saved.due > 0
        ? `*Abonó:* ${money(saved.paidNow)}\n*Le queda por pagar:* ${money(saved.due)}${saved.dueDate ? `\n*Fecha de pago:* ${saved.dueDate}` : ''}`
        : `*Estado:* PAGADO`,
      `--------------------------------`,
      `¡Gracias por tu compra!`,
    ]
      .filter(Boolean)
      .join('\n');

    const encodedText = encodeURIComponent(lines);
    const waUrl = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const resetForNextSale = () => {
    setSaved(null);
    setSelectedProduct(null);
    setQuantity('1');
    setDiscountNio('');
    setShowDiscount(false);
    setPayChoice('cash_nio');
    setBank('transfer_bac');
    setInitialPaymentNio('');
    setAbonoMethod('cash_nio');
    setDueDate(addDays(15));
    setCustomerName('');
    setCustomerPhone('');
    setShowCustomer(false);
    setErrorMessage(null);
    setSearchQuery('');
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const resetAndClose = () => {
    resetForNextSale();
    onClose();
  };

  const inputCls =
    'w-full px-4 py-3 text-base rounded-xl bg-white border border-nacre-300 text-deepSlate-900 placeholder:text-deepSlate-400 focus:outline-none focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20';
  const labelCls = 'block text-sm font-bold text-deepSlate-700 mb-1.5';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-deepSlate-900/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Anotar una venta"
    >
      <div className="bg-white sm:rounded-3xl rounded-t-3xl max-w-2xl w-full border border-nacre-200 shadow-modal-depth overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] animate-modal-enter">
        {/* Encabezado */}
        <div className="px-5 sm:px-6 py-4 border-b border-nacre-200 flex items-center justify-between bg-nacre-50/70">
          <div>
            <h3 className="font-extrabold text-lg sm:text-xl text-deepSlate-900">
              {saved ? '¡Venta guardada!' : 'Anotar una venta'}
            </h3>
            <p className="text-sm text-deepSlate-500">
              {saved ? 'Ya se descontó de tus productos.' : 'Elige el producto, cuánto pagó y listo.'}
            </p>
          </div>
          <button
            onClick={resetAndClose}
            aria-label="Cerrar"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-deepSlate-500 hover:text-deepSlate-800 hover:bg-nacre-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {saved ? (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <p className="text-3xl font-extrabold text-deepSlate-900">{money(saved.total)}</p>
              <p className="text-base text-deepSlate-600">
                {saved.qty} × {saved.product.name || saved.product.sku}
                {saved.customer ? ` · ${saved.customer}` : ''}
              </p>
            </div>

            <div className="bg-nacre-50 rounded-2xl border border-nacre-200 p-4 space-y-2 text-base">
              <div className="flex justify-between">
                <span className="text-deepSlate-500">Cómo pagó</span>
                <span className="font-bold text-deepSlate-900">{getPaymentMethodLabel(saved.method)}</span>
              </div>
              {saved.discountTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-deepSlate-500">Descuento</span>
                  <span className="font-bold text-rose-600">-{money(saved.discountTotal)}</span>
                </div>
              )}
              {saved.due > 0 ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-deepSlate-500">Ya pagó</span>
                    <span className="font-bold text-emerald-700">{money(saved.paidNow)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-deepSlate-500">Todavía te debe</span>
                    <span className="font-extrabold text-amber-700">{money(saved.due)}</span>
                  </div>
                  {saved.dueDate && (
                    <div className="flex justify-between">
                      <span className="text-deepSlate-500">Se comprometió a pagar antes del</span>
                      <span className="font-bold text-deepSlate-900">{saved.dueDate}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-deepSlate-500">Estado</span>
                  <span className="font-bold text-emerald-700">Pagado completo</span>
                </div>
              )}
              {isOwnerView && (
                <div className="flex justify-between pt-2 border-t border-nacre-200">
                  <span className="text-deepSlate-500">Ganancia de esta venta</span>
                  <span className="font-extrabold text-emerald-700">
                    {moneyUsd(saved.profitUsd)} ≈ {money(saved.profitUsd * exchangeRate)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <input
                type="tel"
                inputMode="tel"
                placeholder="WhatsApp del cliente para enviarle el recibo (opcional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className={inputCls}
              />
              <button
                type="button"
                onClick={handleSendWhatsAppReceipt}
                className="w-full min-h-[52px] px-4 rounded-xl text-base font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Enviar recibo por WhatsApp
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={resetForNextSale}
                className="min-h-[52px] px-4 rounded-xl text-base font-extrabold text-white bg-coral-500 hover:bg-coral-600"
              >
                Anotar otra venta
              </button>
              <button
                type="button"
                onClick={resetAndClose}
                className="min-h-[52px] px-4 rounded-xl text-base font-bold text-deepSlate-700 bg-nacre-100 hover:bg-nacre-200"
              >
                Listo, cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmSale} className="flex flex-col min-h-0 flex-1">
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* 1. Producto */}
              <section>
                <label className={labelCls}>1. ¿Qué vendiste?</label>
                {activeProd ? (
                  <div className="flex items-center justify-between gap-3 p-4 rounded-2xl border-2 border-coral-500 bg-coral-50/50">
                    <div className="min-w-0">
                      <p className="text-base font-extrabold text-deepSlate-900 truncate">
                        {activeProd.name || activeProd.sku}
                      </p>
                      <p className="text-sm text-deepSlate-600">
                        Código {activeProd.sku} · {money(listPriceNio)} · quedan {activeProd.stock_current}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="shrink-0 min-h-[44px] px-4 rounded-xl text-sm font-bold text-coral-600 bg-white border border-coral-200 hover:bg-coral-50"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-5 h-5 text-deepSlate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        ref={searchRef}
                        type="text"
                        placeholder="Escribe el nombre o el código del producto"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`${inputCls} pl-12`}
                      />
                    </div>
                    <div className="rounded-2xl border border-nacre-200 divide-y divide-nacre-100 overflow-hidden max-h-64 overflow-y-auto">
                      {matchingProducts.length === 0 ? (
                        <p className="p-4 text-base text-deepSlate-500">
                          No encontramos “{searchQuery}”. Revisa el nombre o prueba con el código.
                        </p>
                      ) : (
                        matchingProducts.map((p) => {
                          const out = p.stock_current <= 0;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={out}
                              onClick={() => pickProduct(p)}
                              className={`w-full text-left px-4 py-3 min-h-[56px] flex items-center justify-between gap-3 ${
                                out ? 'opacity-50 cursor-not-allowed bg-nacre-50' : 'hover:bg-coral-50/60 active:bg-coral-50'
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block text-base font-bold text-deepSlate-900 truncate">
                                  {p.name || p.sku}
                                </span>
                                <span className="block text-sm text-deepSlate-500">
                                  Código {p.sku} · {out ? 'Agotado' : `quedan ${p.stock_current}`}
                                </span>
                              </span>
                              <span className="shrink-0 text-base font-extrabold text-coral-600">
                                {money(Number(p.price_nio || 0))}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* 2. Cantidad y descuento */}
              <section className="space-y-3">
                <label className={labelCls}>2. ¿Cuántos vendiste?</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => changeQty(-1)}
                    aria-label="Quitar uno"
                    className="w-14 h-14 rounded-xl bg-nacre-100 hover:bg-nacre-200 flex items-center justify-center text-deepSlate-700"
                  >
                    <Minus className="w-6 h-6" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-24 h-14 text-center text-2xl font-extrabold rounded-xl border border-nacre-300 focus:outline-none focus:border-coral-500"
                  />
                  <button
                    type="button"
                    onClick={() => changeQty(1)}
                    aria-label="Agregar uno"
                    className="w-14 h-14 rounded-xl bg-nacre-100 hover:bg-nacre-200 flex items-center justify-center text-deepSlate-700"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>

                {hasCrece ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowDiscount((v) => !v)}
                      className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-bold text-coral-600"
                    >
                      {showDiscount ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {showDiscount || parsedDiscountNio > 0 ? 'Descuento por unidad' : '¿Le hiciste descuento?'}
                    </button>
                    {(showDiscount || parsedDiscountNio > 0) && (
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        placeholder="Cuántos córdobas le rebajaste a cada unidad (ej. 20)"
                        value={discountNio}
                        onChange={(e) => setDiscountNio(e.target.value)}
                        className={inputCls}
                      />
                    )}
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-deepSlate-500">
                    <Lock className="w-4 h-4 text-coral-500" />
                    Los descuentos se activan con el plan Crece.
                  </p>
                )}
              </section>

              {/* 3. Cliente */}
              <section>
                <button
                  type="button"
                  onClick={() => setShowCustomer((v) => !v)}
                  className="w-full flex items-center justify-between min-h-[48px] text-left"
                >
                  <span className={`${labelCls} mb-0`}>
                    3. ¿Quién compró?{' '}
                    <span className="font-normal text-deepSlate-500">
                      {isCreditMode ? '(necesario si paga después)' : '(opcional)'}
                    </span>
                  </span>
                  {showCustomer || isCreditMode ? (
                    <ChevronUp className="w-5 h-5 text-deepSlate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-deepSlate-400" />
                  )}
                </button>
                {(showCustomer || isCreditMode) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <input
                      type="text"
                      placeholder="Nombre del cliente"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="WhatsApp (ej. 88888888)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                )}
              </section>

              {/* 4. Cómo pagó */}
              <section className="space-y-3">
                <label className={labelCls}>4. ¿Cómo pagó?</label>
                <div className="grid grid-cols-2 gap-3">
                  {PAY_TILES.map((t) => {
                    const Icon = t.icon;
                    const locked = t.id === 'credit_layaway' && !hasCrece;
                    const active = payChoice === t.id && !locked;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          if (locked) {
                            setErrorMessage('Anotar ventas con abono o pago pendiente es parte del plan Crece.');
                            return;
                          }
                          setErrorMessage(null);
                          setPayChoice(t.id);
                        }}
                        className={`text-left p-3.5 min-h-[76px] rounded-2xl border-2 transition-all ${
                          t.id === 'credit_layaway' ? 'col-span-2' : ''
                        } ${
                          active
                            ? 'border-coral-500 bg-coral-50'
                            : locked
                            ? 'border-nacre-200 bg-nacre-50 opacity-70'
                            : 'border-nacre-200 bg-white hover:border-coral-300'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-base font-extrabold text-deepSlate-900">
                          <Icon className={`w-5 h-5 ${active ? 'text-coral-600' : 'text-deepSlate-500'}`} />
                          {t.label}
                          {locked && <Lock className="w-4 h-4 text-coral-500" />}
                        </span>
                        <span className="block text-sm text-deepSlate-500 mt-0.5">
                          {locked ? 'Disponible en el plan Crece' : t.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!hasCrece && (
                  <button
                    type="button"
                    onClick={() => setSimulatedTier(2)}
                    className="text-sm font-bold text-coral-600 underline min-h-[40px]"
                  >
                    Probar el plan Crece
                  </button>
                )}

                {payChoice === 'transfer' && (
                  <div>
                    <p className="text-sm font-bold text-deepSlate-700 mb-1.5">¿A qué banco te lo enviaron?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {BANK_OPTIONS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setBank(b.id)}
                          className={`min-h-[48px] rounded-xl text-base font-bold border-2 ${
                            bank === b.id
                              ? 'border-coral-500 bg-coral-50 text-coral-700'
                              : 'border-nacre-200 text-deepSlate-700 hover:border-coral-300'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isCreditMode && (
                  <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-4 space-y-3">
                    <div>
                      <label className={labelCls}>¿Cuánto te dejó ahora? (si no dejó nada, deja en blanco)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={totalChargeNio}
                        placeholder="C$ 0"
                        value={initialPaymentNio}
                        onChange={(e) => setInitialPaymentNio(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    {parsedAbonoNio > 0 && (
                      <div>
                        <label className={labelCls}>¿Cómo te dio ese abono?</label>
                        <select
                          value={abonoMethod}
                          onChange={(e) => setAbonoMethod(e.target.value as PaymentMethod)}
                          className={inputCls}
                        >
                          {PAYMENT_METHOD_OPTIONS.filter((m) => m.id !== 'credit_layaway').map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.shortLabel}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className={labelCls}>¿Hasta qué fecha te va a pagar el resto?</label>
                      <input
                        type="date"
                        value={dueDate}
                        min={localIsoDate()}
                        onChange={(e) => setDueDate(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Pie fijo: total grande + guardar */}
            <div className="border-t border-nacre-200 bg-white px-5 sm:px-6 py-4 space-y-3">
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm font-semibold text-rose-700"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-deepSlate-500">Total a cobrar</p>
                  <p className="text-4xl font-extrabold text-coral-600 leading-none">{money(totalChargeNio)}</p>
                  {isCreditMode && balanceDueNio > 0 ? (
                    <p className="text-sm font-bold text-amber-700 mt-1">
                      Te quedará debiendo {money(balanceDueNio)}
                    </p>
                  ) : (
                    totalDiscountNio > 0 && (
                      <p className="text-sm text-deepSlate-500 mt-1">Con descuento de {money(totalDiscountNio)}</p>
                    )
                  )}
                </div>
                <p className="text-sm text-deepSlate-500 text-right">≈ {moneyUsd(totalChargeUsd)}</p>
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full min-h-[56px] rounded-xl text-lg font-extrabold text-white bg-coral-500 hover:bg-coral-600 active:scale-[0.99] disabled:opacity-60 shadow-md shadow-coral-500/25"
              >
                {isSaving ? 'Guardando…' : 'Guardar venta'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
