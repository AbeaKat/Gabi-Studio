import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  PlusCircle,
  TrendingUp,
  Clock,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Product, Batch, SalesHeader, SalesItem, PaymentMethod } from '../types';
import {
  getStoredProducts,
  getStoredBatches,
  getStoredSalesHeaders,
  saveStoredSalesHeaders,
  getStoredSalesItems,
  saveStoredSalesItems,
  TENANT_STELLA_ID,
} from '../data/realInventoryData';
import { QuickSaleModal } from '../components/sales/QuickSaleModal';
import { SalesHistory, SalesFilter } from '../components/sales/SalesHistory';
import { AbonoModal } from '../components/sales/AbonoModal';
import { AdvancedSalesTools } from '../components/sales/AdvancedSalesTools';
import {
  SaleRow,
  buildSaleRows,
  getPaymentMethodLabel,
  localIsoDate,
  money,
  moneyUsd,
} from '../components/sales/salesShared';
import { supabase } from '../lib/supabase';

export const ClosingPage: React.FC = () => {
  const { tenant, planTier, role, setSimulatedTier } = useAuth();
  const businessName = tenant?.name || 'Mi Negocio';
  const exchangeRate = Number(tenant?.exchange_rate_nio || 36.62);
  const isOwner = role !== 'seller';

  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [salesHeaders, setSalesHeaders] = useState<SalesHeader[]>([]);
  const [salesItems, setSalesItems] = useState<SalesItem[]>([]);

  // Flujo principal: modal para anotar una venta en pocos pasos
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);

  // Pestaña principal por defecto: historial de ventas; opciones avanzadas plegables
  const [historyFilter, setHistoryFilter] = useState<SalesFilter>('all');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Registro de abono para ventas con pago pendiente
  const [abonoTargetRow, setAbonoTargetRow] = useState<SaleRow | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const loadAll = () => {
    setProducts(getStoredProducts());
    setBatches(getStoredBatches());
    setSalesHeaders(getStoredSalesHeaders());
    setSalesItems(getStoredSalesItems());
  };

  useEffect(() => {
    loadAll();
  }, []);

  const rows = useMemo(
    () => buildSaleRows(salesHeaders, salesItems),
    [salesHeaders, salesItems]
  );

  // Resumen claro en lenguaje cotidiano
  const summary = useMemo(() => {
    const today = localIsoDate();
    const currentMonth = today.slice(0, 7);

    let todayTotalNio = 0;
    let todayCount = 0;
    let monthTotalNio = 0;
    let monthUnits = 0;
    let totalDueNio = 0;
    let debtSalesCount = 0;
    let totalProfitUsd = 0;

    rows.forEach((r) => {
      if (r.date === today) {
        todayTotalNio += r.total;
        todayCount += 1;
      }
      if (r.date.slice(0, 7) === currentMonth) {
        monthTotalNio += r.total;
        monthUnits += r.item.quantity;
      }
      if (r.due > 0) {
        totalDueNio += r.due;
        debtSalesCount += 1;
      }
      totalProfitUsd += Number(r.item.net_profit_usd || 0);
    });

    return {
      todayTotalNio,
      todayCount,
      monthTotalNio,
      monthUnits,
      totalDueNio,
      debtSalesCount,
      totalProfitUsd,
      totalProfitNio: totalProfitUsd * exchangeRate,
    };
  }, [rows, exchangeRate]);

  // Confirmar abono sobre una venta con pago pendiente
  const handleConfirmAbono = async (
    row: SaleRow,
    amountNio: number,
    method: PaymentMethod
  ) => {
    const newPaid = Math.min(row.total, row.paid + amountNio);
    const newDue = Math.max(0, Math.round((row.total - newPaid) * 100) / 100);
    const newStatus: 'paid' | 'partial' | 'pending' =
      newDue <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';

    const updatedItems = salesItems.map((it) =>
      it.id === row.item.id
        ? {
            ...it,
            amount_paid_nio: newPaid,
            balance_due_nio: newDue,
            payment_status: newStatus,
            abono_payment_method: method,
          }
        : it
    );

    const updatedHeaders = salesHeaders.map((hdr) => {
      if (hdr.id !== row.item.sale_header_id) return hdr;
      const headerItems = updatedItems.filter((i) => i.sale_header_id === hdr.id);
      const hdrPaid = headerItems.reduce((acc, i) => acc + (i.amount_paid_nio ?? 0), 0);
      const hdrDue = headerItems.reduce((acc, i) => acc + (i.balance_due_nio ?? 0), 0);
      const hdrStatus: 'paid' | 'partial' | 'pending' =
        hdrDue <= 0 ? 'paid' : hdrPaid > 0 ? 'partial' : 'pending';
      return {
        ...hdr,
        amount_paid_nio: hdrPaid,
        balance_due_nio: hdrDue,
        payment_status: hdrStatus,
      };
    });

    saveStoredSalesItems(updatedItems);
    saveStoredSalesHeaders(updatedHeaders);

    try {
      await supabase
        .from('sales_items')
        .update({
          amount_paid_nio: newPaid,
          balance_due_nio: newDue,
          payment_status: newStatus,
          abono_payment_method: method,
        })
        .eq('id', row.item.id);
    } catch {
      // Modo demo local
    }

    loadAll();
    setAbonoTargetRow(null);
    setFeedbackBanner(
      newDue <= 0
        ? `¡Pago completado! ${row.customer || 'El cliente'} pagó ${money(amountNio)} (${getPaymentMethodLabel(method)}) y ya no debe nada.`
        : `¡Abono guardado! Recibiste ${money(amountNio)} (${getPaymentMethodLabel(method)}). A ${row.customer || 'tu cliente'} le quedan por pagar ${money(newDue)}.`
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Encabezado principal con llamado claro a "Anotar una venta" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-nacre-200 p-5 sm:p-6 shadow-2xs">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900 tracking-tight">
            Mis ventas
          </h1>
          <p className="text-sm sm:text-base text-deepSlate-600">
            Anota lo que vendes en segundos, revisa tu historial por día y lleva el control de quién te debe.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsQuickSaleOpen(true)}
          className="min-h-[54px] px-6 py-3.5 rounded-2xl text-base font-extrabold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 active:scale-[0.99] transition-all inline-flex items-center justify-center gap-2.5 shrink-0"
        >
          <PlusCircle className="w-6 h-6" />
          <span>Anotar una venta</span>
        </button>
      </div>

      {/* Mensaje de confirmación cuando se registra un abono */}
      {feedbackBanner && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm sm:text-base font-bold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{feedbackBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-sm font-bold text-emerald-800 underline min-h-[40px] px-2 shrink-0"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Tarjetas de resumen en lenguaje simple (sin costos ni ganancias para vendedores) */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOwner ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        <div className="bg-white rounded-2xl border border-nacre-200 p-4 sm:p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-sm font-bold text-deepSlate-600">
            <span>Vendido hoy</span>
            <ShoppingBag className="w-5 h-5 text-coral-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-coral-600">
            {money(summary.todayTotalNio)}
          </p>
          <p className="text-sm text-deepSlate-500">
            {summary.todayCount === 0
              ? 'Aún no has anotado ventas hoy'
              : `${summary.todayCount} ${summary.todayCount === 1 ? 'venta anotada hoy' : 'ventas anotadas hoy'}`}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-nacre-200 p-4 sm:p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-sm font-bold text-deepSlate-600">
            <span>Vendido este mes</span>
            <CalendarCheck className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900">
            {money(summary.monthTotalNio)}
          </p>
          <p className="text-sm text-deepSlate-500">
            {summary.monthUnits} {summary.monthUnits === 1 ? 'unidad vendida' : 'unidades vendidas'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-nacre-200 p-4 sm:p-5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-sm font-bold text-deepSlate-600">
            <span>Pagos pendientes</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-700">
            {money(summary.totalDueNio)}
          </p>
          {summary.debtSalesCount > 0 ? (
            <button
              type="button"
              onClick={() => setHistoryFilter('debt')}
              className="text-sm font-bold text-coral-600 underline text-left"
            >
              Ver {summary.debtSalesCount} {summary.debtSalesCount === 1 ? 'cliente que debe' : 'clientes que deben'}
            </button>
          ) : (
            <p className="text-sm text-deepSlate-500">Nadie te debe dinero ahora</p>
          )}
        </div>

        {isOwner && (
          <div className="bg-white rounded-2xl border border-nacre-200 p-4 sm:p-5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-sm font-bold text-emerald-800">
              <span>Ganancia acumulada</span>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {money(summary.totalProfitNio)}
            </p>
            <p className="text-sm text-deepSlate-500">
              ≈ {moneyUsd(summary.totalProfitUsd)} libres de costo
            </p>
          </div>
        )}
      </div>

      {/* Historial de ventas por día (vista principal por defecto) */}
      <section aria-label="Historial de ventas" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold text-deepSlate-900">
            Historial de ventas
          </h2>
          <span className="text-sm text-deepSlate-500">
            {rows.length} {rows.length === 1 ? 'venta registrada' : 'ventas registradas'}
          </span>
        </div>

        <SalesHistory
          rows={rows}
          isOwner={isOwner}
          exchangeRate={exchangeRate}
          filter={historyFilter}
          onFilterChange={setHistoryFilter}
          onRegisterAbono={(row) => setAbonoTargetRow(row)}
          onNewSale={() => setIsQuickSaleOpen(true)}
        />
      </section>

      {/* Sección plegable: Opciones avanzadas (cierre masivo en lista, Excel y cuadre de caja) */}
      <section className="bg-white rounded-3xl border border-nacre-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          aria-expanded={showAdvancedOptions}
          onClick={() => setShowAdvancedOptions((v) => !v)}
          className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-3 text-left hover:bg-nacre-50/70 transition-colors min-h-[60px]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-nacre-100 flex items-center justify-center text-deepSlate-700 shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-base sm:text-lg font-extrabold text-deepSlate-900">
                Opciones avanzadas
              </span>
              <span className="block text-sm text-deepSlate-600">
                Anotar varias ventas de una lista, subir un archivo de Excel o contar el efectivo de la caja
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-coral-600 shrink-0">
            <span>{showAdvancedOptions ? 'Ocultar' : 'Abrir'}</span>
            {showAdvancedOptions ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </span>
        </button>

        {showAdvancedOptions && (
          <div className="p-5 sm:p-6 bg-nacre-50/50 border-t border-nacre-200">
            <AdvancedSalesTools
              products={products}
              batches={batches}
              salesHeaders={salesHeaders}
              salesItems={salesItems}
              exchangeRate={exchangeRate}
              planTier={planTier}
              role={role}
              businessName={businessName}
              tenantId={tenant?.id || TENANT_STELLA_ID}
              onDataChange={loadAll}
              onUpgradePlan={setSimulatedTier}
            />
          </div>
        )}
      </section>

      {/* Modal para anotar una venta paso a paso */}
      <QuickSaleModal
        isOpen={isQuickSaleOpen}
        onClose={() => setIsQuickSaleOpen(false)}
        exchangeRate={exchangeRate}
        planTier={planTier}
        role={role}
        tenantId={tenant?.id}
        onSaleSuccess={loadAll}
      />

      {/* Modal para registrar un abono en ventas con deuda */}
      <AbonoModal
        row={abonoTargetRow}
        onClose={() => setAbonoTargetRow(null)}
        onConfirm={handleConfirmAbono}
      />
    </div>
  );
};
