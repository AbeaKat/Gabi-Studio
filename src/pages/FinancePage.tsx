import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  Product,
  SalesHeader,
  SalesItem,
  OperatingExpense,
  KardexMovement,
  PaymentMethod,
} from '../types';
import {
  getStoredProducts,
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
import { PeriodKey, computeMetrics, getRange } from '../components/finance/financeUtils';
import { PeriodSelector, LockedBlock } from '../components/finance/FinanceUI';
import { SummaryCards } from '../components/finance/SummaryCards';
import { MoneyBreakdown } from '../components/finance/MoneyBreakdown';
import { ExpensesSection } from '../components/finance/ExpensesSection';
import { TopProducts } from '../components/finance/TopProducts';
import { ReceivablesSection } from '../components/finance/ReceivablesSection';
import { DetailedReport } from '../components/finance/DetailedReport';

const OWNER_SALARY_STORAGE_KEY = 'gabi_studio_owner_salary_usd';

export const FinancePage: React.FC = () => {
  const { tenant, planTier, role, setSimulatedTier } = useAuth();
  const businessName = tenant?.name || 'Mi Empresa Demo';
  const exchangeRate = Number(tenant?.exchange_rate_nio || 36.62);

  const [period, setPeriod] = useState<PeriodKey>('month');
  const [products, setProducts] = useState<Product[]>([]);
  const [salesHeaders, setSalesHeaders] = useState<SalesHeader[]>([]);
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [kardex, setKardex] = useState<KardexMovement[]>([]);

  const [ownerSalaryUsd, setOwnerSalaryUsd] = useState<number>(() => {
    const saved = localStorage.getItem(OWNER_SALARY_STORAGE_KEY);
    const parsed = saved ? parseFloat(saved) : 0;
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  });
  const [ownerSalaryInput, setOwnerSalaryInput] = useState<string>(() => localStorage.getItem(OWNER_SALARY_STORAGE_KEY) || '0');

  const [receivableSuccessMsg, setReceivableSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setProducts(getStoredProducts());
    setSalesHeaders(getStoredSalesHeaders());
    setSalesItems(getStoredSalesItems());
    setExpenses(getStoredExpenses());
    setKardex(getStoredKardex());
  }, []);

  const range = useMemo(() => getRange(period), [period]);
  const m = useMemo(
    () => computeMetrics({ salesItems, salesHeaders, expenses, kardex, exchangeRate, range }),
    [salesItems, salesHeaders, expenses, kardex, exchangeRate, range]
  );

  const handleOwnerSalaryChange = (val: string) => {
    setOwnerSalaryInput(val);
    const num = Math.max(0, parseFloat(val) || 0);
    setOwnerSalaryUsd(num);
    localStorage.setItem(OWNER_SALARY_STORAGE_KEY, String(num));
  };

  if (role === 'seller') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-deepSlate-900 mb-2">Esta sección es solo para el dueño</h2>
        <p className="text-sm text-deepSlate-500 leading-relaxed">
          Con tu cuenta de <strong>Empleado</strong> no tienes acceso a los costos de compra ni a las finanzas de la tienda.
        </p>
      </div>
    );
  }

  // ---- Cuentas por cobrar (todas, sin importar el periodo) ----
  const activeReceivables = salesItems.filter((item) => (item.balance_due_nio || 0) > 0);
  const totalReceivableNio = activeReceivables.reduce((acc, item) => acc + (item.balance_due_nio || 0), 0);

  const handleConfirmAbono = async (item: SalesItem, rawAbono: number, abonoMethod: PaymentMethod) => {
    const currentDue = Number(item.balance_due_nio || 0);
    if (isNaN(rawAbono) || rawAbono <= 0) return;

    const appliedAbono = Math.min(currentDue, Math.round(rawAbono * 100) / 100);
    const totalSaleNio = item.final_unit_price_nio * item.quantity;
    const prevPaidNio = Number(item.amount_paid_nio ?? Math.max(0, totalSaleNio - currentDue));
    const newPaidNio = Math.min(totalSaleNio, Math.round((prevPaidNio + appliedAbono) * 100) / 100);
    const newBalanceDueNio = Math.max(0, Math.round((totalSaleNio - newPaidNio) * 100) / 100);
    const newStatus: 'paid' | 'partial' = newBalanceDueNio > 0 ? 'partial' : 'paid';

    const updatedItems = salesItems.map((si) =>
      si.id === item.id
        ? { ...si, amount_paid_nio: newPaidNio, balance_due_nio: newBalanceDueNio, payment_status: newStatus, abono_payment_method: abonoMethod }
        : si
    );
    setSalesItems(updatedItems);
    saveStoredSalesItems(updatedItems);

    const updatedHeaders = salesHeaders.map((sh) => {
      if (sh.id !== item.sale_header_id) return sh;
      const headerItems = updatedItems.filter((i) => i.sale_header_id === sh.id);
      const hdrPaid = headerItems.reduce((sum, i) => sum + (i.amount_paid_nio || 0), 0);
      const hdrDue = headerItems.reduce((sum, i) => sum + (i.balance_due_nio || 0), 0);
      return { ...sh, amount_paid_nio: hdrPaid, balance_due_nio: hdrDue, payment_status: (hdrDue > 0 ? 'partial' : 'paid') as 'paid' | 'partial' };
    });
    setSalesHeaders(updatedHeaders);
    saveStoredSalesHeaders(updatedHeaders);

    try {
      await supabase
        .from('sales_items')
        .update({ amount_paid_nio: newPaidNio, balance_due_nio: newBalanceDueNio, payment_status: newStatus })
        .eq('id', item.id);
      await supabase
        .from('sales_headers')
        .update({ amount_paid_nio: newPaidNio, balance_due_nio: newBalanceDueNio, payment_status: newStatus })
        .eq('id', item.sale_header_id);
    } catch (e) {
      // Demo fallback
    }

    const methodLabel = getPaymentMethodLabel(abonoMethod);
    const who = item.customer_name || 'el cliente';
    setReceivableSuccessMsg(
      newBalanceDueNio === 0
        ? `¡Cuenta saldada! Se registró el pago de C$ ${appliedAbono.toFixed(2)} (${methodLabel}) de ${who}.`
        : `Pago registrado: C$ ${appliedAbono.toFixed(2)} (${methodLabel}) de ${who}. Todavía debe C$ ${newBalanceDueNio.toFixed(2)}.`
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
    const url = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAddExpense = (d: { category: OperatingExpense['category']; amountNio: number; date: string; note: string }) => {
    const nio = Math.round(d.amountNio * 100) / 100;
    const newExp: OperatingExpense = {
      id: `exp-${Date.now()}`,
      tenant_id: tenant?.id || TENANT_STELLA_ID,
      category: d.category,
      description: d.note,
      amount_usd: Math.round((nio / exchangeRate) * 100) / 100,
      amount_nio: nio,
      expense_date: d.date,
      created_at: new Date().toISOString(),
    };
    const updated = [newExp, ...expenses];
    setExpenses(updated);
    saveStoredExpenses(updated);
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    saveStoredExpenses(updated);
  };

  const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-NI', { day: 'numeric', month: 'short' });
  const rangeText = range.from === range.to ? `Mostrando ${fmtDate(range.from)}` : `Mostrando del ${fmtDate(range.from)} al ${fmtDate(range.to)}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900 tracking-tight">Mi dinero</h1>
          <p className="text-sm sm:text-base text-deepSlate-500 mt-1">Cuánto entra, cuánto sale y cuánto te queda de verdad.</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} rangeText={rangeText} />
      </div>

      <SummaryCards m={m} periodLabel={range.label} pendingNio={totalReceivableNio} />

      <MoneyBreakdown m={m} />

      {planTier >= 2 ? (
        <ExpensesSection expenses={m.expenses} periodLabel={range.label} onAdd={handleAddExpense} onDelete={handleDeleteExpense} />
      ) : (
        <LockedBlock
          title="Mis gastos"
          what="Anota publicidad, empaques, envíos y renta para saber cuánto te queda realmente después de pagar todo."
          planName="Crece"
          onTry={() => setSimulatedTier(2)}
        />
      )}

      <TopProducts rows={m.products} periodLabel={range.label} />

      {planTier >= 2 ? (
        <ReceivablesSection
          items={activeReceivables}
          headers={salesHeaders}
          successMsg={receivableSuccessMsg}
          onDismissMsg={() => setReceivableSuccessMsg(null)}
          onPay={handleConfirmAbono}
          onRemind={handleWhatsAppCollectionReminder}
        />
      ) : (
        <LockedBlock
          title="Me deben"
          what="Lleva el control de quién te debe, registra sus pagos y envíales un recordatorio por WhatsApp."
          planName="Crece"
          onTry={() => setSimulatedTier(2)}
        />
      )}

      <DetailedReport
        m={m}
        planTier={planTier}
        setSimulatedTier={setSimulatedTier}
        periodLabel={range.label}
        businessName={businessName}
        exchangeRate={exchangeRate}
        ownerSalaryUsd={ownerSalaryUsd}
        ownerSalaryInput={ownerSalaryInput}
        onSalaryChange={handleOwnerSalaryChange}
        products={products}
        allSalesItems={salesItems}
        salesHeaders={salesHeaders}
        kardex={kardex}
        receivableNio={totalReceivableNio}
        receivableCount={activeReceivables.length}
      />
    </div>
  );
};
