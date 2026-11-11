import React, { useState, useMemo } from 'react';
import {
  X,
  ShoppingBag,
  Search,
  Lock,
  Percent,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Tag,
  ArrowRight,
  Coins,
  Banknote,
  Landmark,
  CreditCard,
  Clock,
  User,
  Phone,
  Send,
  Receipt
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

export const PAYMENT_METHOD_OPTIONS: Array<{
  id: PaymentMethod;
  label: string;
  shortLabel: string;
  group: 'cash' | 'bank' | 'pos' | 'credit';
  requiresTier2?: boolean;
}> = [
  { id: 'cash_nio', label: 'Efectivo C$', shortLabel: 'Efectivo (Córdobas)', group: 'cash' },
  { id: 'cash_usd', label: 'Efectivo $ USD', shortLabel: 'Efectivo (Dólares)', group: 'cash' },
  { id: 'transfer_bac', label: 'Transf. BAC', shortLabel: 'Transferencia BAC', group: 'bank' },
  { id: 'transfer_lafise', label: 'Transf. Lafise', shortLabel: 'Transferencia Lafise', group: 'bank' },
  { id: 'transfer_banpro', label: 'Transf. Banpro', shortLabel: 'Transferencia Banpro', group: 'bank' },
  { id: 'pos_card', label: 'Tarjeta POS', shortLabel: 'Tarjeta / POS Bancario', group: 'pos' },
  {
    id: 'credit_layaway',
    label: 'Crédito / Apartado',
    shortLabel: 'Crédito / Apartado',
    group: 'credit',
    requiresTier2: true,
  },
];

export const getPaymentMethodLabel = (method?: PaymentMethod): string => {
  const found = PAYMENT_METHOD_OPTIONS.find((m) => m.id === method);
  return found ? found.shortLabel : 'Efectivo (Córdobas)';
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
  const { tenant } = useAuth();
  const businessName = tenant?.name || 'Mi Empresa Demo';

  const defaultDueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct);
  const [quantity, setQuantity] = useState<number>(1);
  const [discountNio, setDiscountNio] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_nio');
  const [initialPaymentNio, setInitialPaymentNio] = useState<string>('0');
  const [dueDate, setDueDate] = useState<string>(defaultDueDate);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [promoTag, setPromoTag] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saleCompleted, setSaleCompleted] = useState(false);
  const [lastReceiptId, setLastReceiptId] = useState<string>('');

  const products = useMemo(() => {
    if (!isOpen) return [];
    return getStoredProducts();
  }, [isOpen]);

  const matchingProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products.filter((p) => p.stock_current > 0).slice(0, 8);
    return products
      .filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          (p.name && p.name.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [products, searchQuery]);

  if (!isOpen) return null;

  const activeProd = selectedProduct;
  const listPriceNio = activeProd ? Number(activeProd.price_nio || 0) : 0;
  const listPriceUsd = activeProd ? Number(activeProd.price_usd || 0) : 0;
  const unitCostUsd = activeProd
    ? Number(activeProd.landed_cost_usd || activeProd.base_cost_usd || 0)
    : 0;

  // Discount only allowed in Tier 2+
  const parsedDiscountNio = planTier >= 2 ? Math.max(0, parseFloat(discountNio) || 0) : 0;
  const finalUnitPriceNio = Math.max(0, listPriceNio - parsedDiscountNio);
  const finalUnitPriceUsd =
    parsedDiscountNio > 0
      ? Math.round((finalUnitPriceNio / exchangeRate) * 100) / 100
      : listPriceUsd;

  const totalChargeNio = finalUnitPriceNio * quantity;
  const totalChargeUsd = finalUnitPriceUsd * quantity;
  const totalDiscountNio = parsedDiscountNio * quantity;
  const netProfitUsd = Math.round((finalUnitPriceUsd - unitCostUsd) * quantity * 100) / 100;

  // Credit / Layaway calculations (Tier 2+)
  const isCreditMode = planTier >= 2 && paymentMethod === 'credit_layaway';
  const parsedAbonoNio = isCreditMode
    ? Math.min(totalChargeNio, Math.max(0, parseFloat(initialPaymentNio) || 0))
    : totalChargeNio;
  const balanceDueNio = isCreditMode ? Math.max(0, totalChargeNio - parsedAbonoNio) : 0;
  const paymentStatus: 'paid' | 'partial' | 'pending' = !isCreditMode
    ? 'paid'
    : balanceDueNio > 0
    ? 'partial'
    : 'paid';

  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!activeProd) {
      setErrorMessage('Selecciona un producto del catálogo para registrar la venta.');
      return;
    }

    if (quantity <= 0 || quantity > activeProd.stock_current) {
      setErrorMessage(
        `Stock insuficiente. El SKU ${activeProd.sku} tiene ${activeProd.stock_current} unidad(es) disponible(s).`
      );
      return;
    }

    if (isCreditMode) {
      if (!customerName.trim() || !customerPhone.trim()) {
        setErrorMessage(
          'Para ventas al Crédito / Apartado es obligatorio ingresar el Nombre del Cliente y su WhatsApp.'
        );
        return;
      }
      if (!dueDate) {
        setErrorMessage('Selecciona una Fecha Límite de Pago para el Crédito / Apartado.');
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
        sale_date: nowIso.slice(0, 10),
        payment_method: paymentMethod,
        customer_name: cleanCustomerName,
        customer_phone: cleanCustomerPhone,
        amount_paid_nio: parsedAbonoNio,
        balance_due_nio: balanceDueNio,
        payment_status: paymentStatus,
        due_date: effectiveDueDate,
        promo_tag: planTier >= 2 && promoTag.trim() ? promoTag.trim() : null,
        notes: notes.trim() || `Venta en vivo 1 a 1 (${activeProd.sku})`,
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
        quantity,
        unit_cost_usd_snapshot: unitCostUsd,
        list_price_usd_snapshot: listPriceUsd,
        list_price_nio_snapshot: listPriceNio,
        discount_nio: parsedDiscountNio,
        final_unit_price_nio: finalUnitPriceNio,
        final_unit_price_usd: finalUnitPriceUsd,
        exchange_rate_snapshot: exchangeRate,
        net_profit_usd: netProfitUsd,
        payment_method: paymentMethod,
        customer_name: cleanCustomerName,
        customer_phone: cleanCustomerPhone,
        amount_paid_nio: parsedAbonoNio,
        balance_due_nio: balanceDueNio,
        payment_status: paymentStatus,
        due_date: effectiveDueDate,
        created_at: nowIso,
      };

      // 1. Update local storage snapshots & deduct stock_current
      const updatedProducts = getStoredProducts().map((p) =>
        p.id === activeProd.id
          ? { ...p, stock_current: Math.max(0, p.stock_current - quantity), updated_at: nowIso }
          : p
      );
      saveStoredProducts(updatedProducts);

      const headers = [newHeader, ...getStoredSalesHeaders()];
      saveStoredSalesHeaders(headers);

      const items = [newItem, ...getStoredSalesItems()];
      saveStoredSalesItems(items);

      // 2. Sync to Supabase if connected
      try {
        await supabase.from('sales_headers').insert(newHeader);
        await supabase.from('sales_items').insert(newItem);
        await supabase
          .from('products')
          .update({ stock_current: Math.max(0, activeProd.stock_current - quantity) })
          .eq('id', activeProd.id);
      } catch (dbErr) {
        console.warn('Guardado en almacenamiento local (modo demo):', dbErr);
      }

      setLastReceiptId(`REC-${shortCode}`);
      setSaleCompleted(true);
      if (onSaleSuccess) onSaleSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al registrar la venta.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendWhatsAppReceipt = () => {
    if (!activeProd) return;
    const rawDigits = customerPhone.replace(/[^0-9]/g, '');
    const formattedPhone =
      rawDigits.length === 8 ? `505${rawDigits}` : rawDigits;

    const dateStr = new Date().toLocaleDateString('es-NI', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const lines = [
      `*COMPROBANTE DIGITAL DE COMPRA*`,
      `*${businessName}*`,
      `Recibo: ${lastReceiptId || 'REC-001'} • Fecha: ${dateStr}`,
      customerName.trim() ? `Cliente: ${customerName.trim()}` : null,
      `--------------------------------`,
      `• *SKU:* ${activeProd.sku}`,
      `• *Producto:* ${activeProd.name || activeProd.sku}`,
      `• *Cantidad:* ${quantity} ud(s) x C$ ${listPriceNio.toFixed(2)}`,
      totalDiscountNio > 0 ? `• *Descuento Aplicado:* -C$ ${totalDiscountNio.toFixed(2)}` : null,
      `--------------------------------`,
      `*TOTAL:* C$ ${totalChargeNio.toFixed(2)} (≈ $${totalChargeUsd.toFixed(2)} USD)`,
      `*Método de Pago:* ${getPaymentMethodLabel(paymentMethod)}`,
      isCreditMode
        ? `*Abono Inicial:* C$ ${parsedAbonoNio.toFixed(2)}\n*Saldo Pendiente:* C$ ${balanceDueNio.toFixed(2)} (≈ $${(balanceDueNio / exchangeRate).toFixed(2)} USD)\n*Fecha Límite:* ${dueDate}`
        : `*Estado:* PAGADO`,
      `--------------------------------`,
      `¡Gracias por su preferencia!`,
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
    setSaleCompleted(false);
    setSelectedProduct(null);
    setQuantity(1);
    setDiscountNio('0');
    setPaymentMethod('cash_nio');
    setInitialPaymentNio('0');
    setDueDate(defaultDueDate);
    setCustomerName('');
    setCustomerPhone('');
    setPromoTag('');
    setNotes('');
    setErrorMessage(null);
  };

  const resetAndClose = () => {
    resetForNextSale();
    setSearchQuery('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deepSlate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-nacre-200 shadow-modal-depth overflow-hidden flex flex-col max-h-[92vh] animate-modal-enter">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-nacre-200 flex items-center justify-between bg-nacre-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-coral-500 text-white flex items-center justify-center shadow-sm shadow-coral-500/25">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-deepSlate-900">
                {saleCompleted ? 'Recibo Digital de Venta' : 'Venta Rápida en Vivo (1 a 1)'}
              </h3>
              <p className="text-xs text-deepSlate-500">
                {saleCompleted
                  ? `${businessName} • Comprobante listo para enviar por WhatsApp`
                  : 'Descuenta stock al instante y congela el snapshot financiero inmutable'}
              </p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1.5 rounded-xl text-deepSlate-400 hover:text-deepSlate-700 hover:bg-nacre-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {saleCompleted && activeProd ? (
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Digital Receipt Card */}
            <div className="bg-nacre-50 rounded-2xl border border-nacre-200 p-5 max-w-md mx-auto space-y-4">
              <div className="flex items-center justify-between border-b border-nacre-200 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-deepSlate-900 block">
                      {businessName}
                    </span>
                    <span className="text-[11px] font-mono text-deepSlate-500">
                      {lastReceiptId} • {new Date().toLocaleDateString('es-NI')}
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center space-x-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isCreditMode && balanceDueNio > 0 ? 'Apartado' : 'Pagado'}</span>
                </span>
              </div>

              {/* Customer Info if provided */}
              {(customerName.trim() || customerPhone.trim()) && (
                <div className="text-xs bg-white rounded-xl p-3 border border-nacre-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-deepSlate-400 block">
                      Cliente
                    </span>
                    <span className="font-bold text-deepSlate-800">
                      {customerName.trim() || 'Cliente de Contado'}
                    </span>
                  </div>
                  {customerPhone.trim() && (
                    <span className="font-mono text-xs text-deepSlate-600">
                      +{customerPhone.replace(/[^0-9]/g, '')}
                    </span>
                  )}
                </div>
              )}

              {/* Itemized Breakdown */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-start">
                  <span className="font-sans text-deepSlate-500">SKU / Producto:</span>
                  <div className="text-right">
                    <span className="font-bold text-deepSlate-900 block">{activeProd.sku}</span>
                    <span className="font-sans text-[11px] text-deepSlate-600 block max-w-[220px] truncate">
                      {activeProd.name || activeProd.sku}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="font-sans text-deepSlate-500">Cantidad x Precio Lista:</span>
                  <span className="text-deepSlate-800">
                    {quantity} ud(s) x C$ {listPriceNio.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="font-sans text-deepSlate-500">Descuento Aplicado:</span>
                  <span className={totalDiscountNio > 0 ? 'text-rose-600 font-bold' : 'text-deepSlate-400'}>
                    {totalDiscountNio > 0 ? `-C$ ${totalDiscountNio.toFixed(2)}` : 'C$ 0.00'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="font-sans text-deepSlate-500">Método de Pago:</span>
                  <span className="font-sans font-bold text-deepSlate-900">
                    {getPaymentMethodLabel(paymentMethod)}
                  </span>
                </div>

                <div className="pt-2.5 border-t border-nacre-200 flex justify-between items-baseline">
                  <span className="font-sans font-bold text-deepSlate-800">Total Venta (C$):</span>
                  <span className="text-base font-extrabold text-coral-600">
                    C$ {totalChargeNio.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="font-sans text-deepSlate-500">Equivalente ($ USD):</span>
                  <span className="font-bold text-deepSlate-900">
                    ${totalChargeUsd.toFixed(2)} USD (Tasa {exchangeRate.toFixed(2)})
                  </span>
                </div>

                {isCreditMode && (
                  <div className="pt-2 border-t border-nacre-200 space-y-1">
                    <div className="flex justify-between text-emerald-700">
                      <span className="font-sans font-semibold">Abono Inicial Recibido:</span>
                      <span className="font-bold">C$ {parsedAbonoNio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-amber-700">
                      <span className="font-sans font-bold">Saldo Pendiente por Cobrar:</span>
                      <span className="font-extrabold">
                        C$ {balanceDueNio.toFixed(2)} (≈ ${(balanceDueNio / exchangeRate).toFixed(2)})
                      </span>
                    </div>
                    {dueDate && (
                      <div className="flex justify-between text-deepSlate-600">
                        <span className="font-sans">Fecha Límite de Pago:</span>
                        <span className="font-bold">{dueDate}</span>
                      </div>
                    )}
                  </div>
                )}

                {role !== 'seller' && (
                  <div className="flex justify-between pt-2 border-t border-nacre-200">
                    <span className="text-emerald-700 font-sans font-bold">
                      Ganancia Neta Congelada:
                    </span>
                    <span className="font-extrabold text-emerald-600">
                      +${netProfitUsd.toFixed(2)} USD
                    </span>
                  </div>
                )}
              </div>

              {/* Quick WhatsApp Phone Input & CTA */}
              <div className="pt-3 border-t border-nacre-200 space-y-2.5">
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-deepSlate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="WhatsApp del cliente (ej. 50588888888)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-white border border-nacre-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendWhatsAppReceipt}
                  className="w-full py-3 px-4 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm active:scale-98 transition-all flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Recibo por WhatsApp</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-1">
              <button
                type="button"
                onClick={resetForNextSale}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-nacre-100 hover:bg-nacre-200 text-deepSlate-800"
              >
                Registrar Otra Venta
              </button>
              <button
                type="button"
                onClick={resetAndClose}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25"
              >
                Listo, Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmSale} className="p-6 overflow-y-auto space-y-5">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Step 1: Instant Search by SKU */}
            <div>
              <label className="block text-xs font-bold text-deepSlate-700 uppercase tracking-wider mb-1.5">
                1. Buscar Pieza por Código SKU o Nombre
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-deepSlate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Escribe ej. REP-402, TEC-109, FER-033 o código del catálogo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900 font-medium"
                  autoFocus
                />
              </div>

              {/* Search Results */}
              <div className="mt-2 max-h-36 overflow-y-auto rounded-2xl border border-nacre-200 divide-y divide-nacre-100 bg-white">
                {matchingProducts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-deepSlate-400">
                    No se encontraron productos con ese código SKU.
                  </div>
                ) : (
                  matchingProducts.map((p) => {
                    const isSelected = activeProd?.id === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          setSelectedProduct(p);
                          setQuantity(1);
                        }}
                        className={`w-full px-3.5 py-2 text-left flex items-center justify-between text-xs transition-colors ${
                          isSelected
                            ? 'bg-coral-50/80 text-coral-900 font-bold'
                            : 'hover:bg-nacre-50 text-deepSlate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 overflow-hidden">
                          <span className="font-mono font-extrabold text-deepSlate-900 bg-nacre-100 px-2 py-0.5 rounded border border-nacre-200">
                            {p.sku}
                          </span>
                          <span className="truncate text-deepSlate-600">{p.name}</span>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0 font-mono">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              p.stock_current > 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {p.stock_current} uds
                          </span>
                          <span className="font-extrabold text-coral-600">C$ {p.price_nio}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Product & Details */}
            {activeProd && (
              <div className="space-y-4 pt-1">
                <div className="p-3.5 rounded-2xl bg-coral-50/50 border border-coral-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-coral-600 block">
                      Pieza Seleccionada
                    </span>
                    <span className="text-sm font-extrabold font-mono text-deepSlate-900">
                      {activeProd.sku}
                    </span>
                    <span className="text-xs text-deepSlate-600 block">{activeProd.name}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-sm font-extrabold text-coral-600 block">
                      C$ {activeProd.price_nio.toFixed(2)}
                    </span>
                    <span className="text-xs text-deepSlate-500">
                      ${activeProd.price_usd.toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Quantity & Discount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-deepSlate-700 uppercase tracking-wider mb-1.5">
                      Cantidad a Vender (Stock: {activeProd.stock_current})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={Math.max(1, activeProd.stock_current)}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500"
                    />
                  </div>

                  {/* Discount / Promotion (Tier 2+ unlocked, Tier 1 locked) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-deepSlate-700 uppercase tracking-wider flex items-center space-x-1">
                        <Percent className="w-3.5 h-3.5 text-coral-500" />
                        <span>Descuento por Ud (C$)</span>
                      </label>
                      {planTier === 1 && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-nacre-200 text-deepSlate-700">
                          <Lock className="w-2.5 h-2.5 text-coral-500" />
                          <span>Nivel 2</span>
                        </span>
                      )}
                    </div>
                    {planTier >= 2 ? (
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={discountNio}
                        onChange={(e) => setDiscountNio(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500"
                      />
                    ) : (
                      <div
                        title="El motor de promociones y descuentos está disponible a partir del Nivel 2 (Crecimiento)"
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-nacre-100 border border-nacre-200 text-deepSlate-400 flex items-center justify-between cursor-not-allowed select-none"
                      >
                        <span>Bloqueado en Nivel 1</span>
                        <Lock className="w-3.5 h-3.5 text-deepSlate-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 2: Visual Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold text-deepSlate-700 uppercase tracking-wider mb-2">
                    2. Método de Pago (Arqueo de Caja)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PAYMENT_METHOD_OPTIONS.map((opt) => {
                      const isLocked = opt.requiresTier2 && planTier < 2;
                      const isSelected = paymentMethod === opt.id;
                      const IconComponent =
                        opt.group === 'cash'
                          ? Banknote
                          : opt.group === 'bank'
                          ? Landmark
                          : opt.group === 'pos'
                          ? CreditCard
                          : Clock;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            if (!isLocked) setPaymentMethod(opt.id);
                          }}
                          className={`px-3 py-2 rounded-xl border text-left transition-all flex items-center justify-between ${
                            isLocked
                              ? 'bg-nacre-100 border-nacre-200 text-deepSlate-400 cursor-not-allowed opacity-75'
                              : isSelected
                              ? 'bg-coral-50 border-coral-500 text-coral-900 font-bold shadow-2xs'
                              : 'bg-white border-nacre-200 text-deepSlate-700 hover:bg-nacre-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <IconComponent
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected ? 'text-coral-600' : 'text-deepSlate-400'
                              }`}
                            />
                            <span className="text-[11px] truncate">{opt.label}</span>
                          </div>
                          {isLocked && (
                            <span className="inline-flex items-center space-x-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-nacre-200 text-deepSlate-600 shrink-0 ml-1">
                              <Lock className="w-2.5 h-2.5 text-coral-500" />
                              <span>N2</span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Layaway / Credit Initial Payment & Due Date Input (Tier 2+) */}
                  {isCreditMode && (
                    <div className="mt-2.5 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                        <div>
                          <label className="block text-[11px] font-bold text-amber-900 mb-1">
                            Abono Inicial (C$)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={totalChargeNio}
                            step="10"
                            value={initialPaymentNio}
                            onChange={(e) => setInitialPaymentNio(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-white border border-amber-300 focus:outline-none focus:border-coral-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-amber-900 mb-1">
                            Fecha Límite de Pago *
                          </label>
                          <input
                            type="date"
                            required={isCreditMode}
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-white border border-amber-300 focus:outline-none focus:border-coral-500"
                          />
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-[10px] font-sans font-bold uppercase text-amber-800 block">
                            Saldo Pendiente ({paymentStatus === 'partial' ? 'Parcial' : 'Pagado'})
                          </span>
                          <span className="text-sm font-extrabold text-amber-900 block">
                            C$ {balanceDueNio.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-amber-700">
                            ≈ ${(balanceDueNio / exchangeRate).toFixed(2)} USD
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3: Customer Fields (Required in Credit Mode, Optional otherwise) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-deepSlate-600 uppercase tracking-wider mb-1">
                      Nombre del Cliente {isCreditMode ? <span className="text-rose-600">* (Obligatorio)</span> : '(Opcional)'}
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-deepSlate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required={isCreditMode}
                        placeholder="Ej. María Fernanda López"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-nacre-50 border focus:outline-none focus:border-coral-500 ${
                          isCreditMode && !customerName.trim() ? 'border-amber-300 bg-amber-50/30' : 'border-nacre-200'
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-deepSlate-600 uppercase tracking-wider mb-1">
                      WhatsApp del Cliente {isCreditMode ? <span className="text-rose-600">* (Obligatorio)</span> : '(Opcional)'}
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-deepSlate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required={isCreditMode}
                        placeholder="Ej. 50588888888"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className={`w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-nacre-50 border focus:outline-none focus:border-coral-500 ${
                          isCreditMode && !customerPhone.trim() ? 'border-amber-300 bg-amber-50/30' : 'border-nacre-200'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Promo tag if Tier 2+ */}
                {planTier >= 2 && (
                  <div>
                    <label className="block text-[11px] font-bold text-deepSlate-600 uppercase tracking-wider mb-1">
                      Etiqueta de Promoción (Opcional)
                    </label>
                    <div className="relative">
                      <Tag className="w-3.5 h-3.5 text-deepSlate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Ej. Promo Quincena, Descuento VIP, Feria..."
                        value={promoTag}
                        onChange={(e) => setPromoTag(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500"
                      />
                    </div>
                  </div>
                )}

                {/* Live Financial Snapshot Preview */}
                <div className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-deepSlate-700 pb-1 border-b border-nacre-200">
                    <span className="flex items-center space-x-1.5">
                      <Coins className="w-4 h-4 text-coral-500" />
                      <span>Resumen de Snapshot Inmutable</span>
                    </span>
                    <span className="font-mono text-[11px] text-deepSlate-500">
                      {getPaymentMethodLabel(paymentMethod)} • Tasa C$ {exchangeRate.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between font-mono">
                    <span className="font-sans text-deepSlate-500">Total a Cobrar en Córdobas:</span>
                    <span className="font-extrabold text-sm text-coral-600">
                      C$ {totalChargeNio.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between font-mono">
                    <span className="font-sans text-deepSlate-500">Equivalente en Dólares:</span>
                    <span className="font-bold text-deepSlate-900">
                      ${totalChargeUsd.toFixed(2)} USD
                    </span>
                  </div>

                  {role !== 'seller' && (
                    <div className="flex justify-between font-mono pt-1.5 border-t border-nacre-200/70">
                      <span className="font-sans text-emerald-700 font-bold flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Utilidad Neta Congelada (Costo ${unitCostUsd.toFixed(2)}):</span>
                      </span>
                      <span className="font-extrabold text-emerald-600">
                        +${netProfitUsd.toFixed(2)} USD
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-3 border-t border-nacre-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-deepSlate-600 hover:bg-nacre-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!activeProd || isSaving || activeProd.stock_current <= 0}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <span>{isSaving ? 'Registrando salida...' : 'Confirmar Venta y Generar Recibo'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
