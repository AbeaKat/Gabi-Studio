import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Truck,
  ShoppingBag,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Lock,
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
  Package,
  TrendingUp,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Batch, Product, PriceHistory } from '../types';
import { PLAN_INFO, UPGRADE_COPY } from '../lib/navigation';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { fmtNio, fmtUsd, round2 } from '../components/inventory/inventoryHelpers';
import {
  getStoredBatches,
  saveStoredBatches,
  getStoredProducts,
  saveStoredProducts,
  getStoredPriceHistory,
  saveStoredPriceHistory,
  BATCH_IDS,
  TENANT_STELLA_ID,
} from '../data/realInventoryData';

type WizardStep = 1 | 2 | 3 | 4;

const STEP_INFO: { step: WizardStep; title: string; subtitle: string }[] = [
  { step: 1, title: '1. El pedido', subtitle: 'Lo que pagaste en la tienda' },
  { step: 2, title: '2. El envío', subtitle: 'Lo que costó traerlo' },
  { step: 3, title: '3. Impuestos', subtitle: 'Aduana o cargos al recibir' },
  { step: 4, title: '4. Resultado', subtitle: 'Costo real y precio sugerido' },
];

export const BatchesPage: React.FC = () => {
  const { tenant, planTier, role, setSimulatedTier } = useAuth();
  const exchangeRate = Number(tenant?.exchange_rate_nio || 36.62);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(BATCH_IDS.GEORGINA_3);
  const [step, setStep] = useState<WizardStep>(1);

  // Inputs del asistente
  const [shippingUsd, setShippingUsd] = useState<string>('50.80');
  const [amazonFeeUsd, setAmazonFeeUsd] = useState<string>('0.00');
  const [dhlTaxUsd, setDhlTaxUsd] = useState<string>('17.20');
  const [prorateMode, setProrateMode] = useState<'per_item' | 'by_cost_weight'>('per_item');
  const [targetMarginPct, setTargetMarginPct] = useState<number>(45);

  // Mensajes y diálogos
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
  const [savedProductId, setSavedProductId] = useState<string | null>(null);

  const loadData = () => {
    const bList = getStoredBatches();
    const pList = getStoredProducts();
    setBatches(bList);
    setProducts(pList);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const current = batches.find((b) => b.id === selectedBatchId);
    if (current) {
      setShippingUsd(String(current.shipping_cost_usd ?? 0));
      setAmazonFeeUsd(String(current.amazon_fee_usd ?? 0));
      setDhlTaxUsd(String(current.dhl_tax_usd ?? 0));
    }
  }, [selectedBatchId, batches]);

  // Vista protegida para vendedores
  if (role === 'seller') {
    return (
      <div className="p-6 sm:p-8 max-w-xl mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-deepSlate-900 mb-2">
          Solo el dueño puede ver los costos de compra
        </h2>
        <p className="text-sm text-deepSlate-600 leading-relaxed">
          Con tu cuenta de <strong>Empleado</strong> puedes registrar ventas y consultar inventario, pero los costos de importación y ganancias son exclusivos del dueño.
        </p>
      </div>
    );
  }

  // Vista de bloqueo si está en Plan Básico (Nivel 1)
  if (planTier < 2) {
    const planInfo = PLAN_INFO[2];
    const upgradeInfo = UPGRADE_COPY[2];
    return (
      <div className="p-6 sm:p-8 max-w-xl mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-coral-50 border border-coral-200 text-coral-500 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <span className={`inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${planInfo.badgeColor}`}>
          Incluido en el plan {planInfo.name}
        </span>
        <h2 className="text-2xl font-extrabold text-deepSlate-900 mt-3 mb-2">
          {upgradeInfo.title}
        </h2>
        <p className="text-sm text-deepSlate-600 mb-6 leading-relaxed">
          {upgradeInfo.body}
        </p>
        <button
          onClick={() => setSimulatedTier(2)}
          className="min-h-[48px] px-6 py-3 rounded-xl text-sm font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25"
        >
          Probar el plan {planInfo.name} ahora
        </button>
      </div>
    );
  }

  const activeBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];
  const batchProducts = products.filter((p) => p.batch_id === activeBatch?.id);

  const rawShip = parseFloat(shippingUsd);
  const rawAmz = parseFloat(amazonFeeUsd);
  const rawDhl = parseFloat(dhlTaxUsd);

  const hasInvalidInputs =
    (shippingUsd.trim() !== '' && (isNaN(rawShip) || rawShip < 0)) ||
    (amazonFeeUsd.trim() !== '' && (isNaN(rawAmz) || rawAmz < 0)) ||
    (dhlTaxUsd.trim() !== '' && (isNaN(rawDhl) || rawDhl < 0));

  const shipNum = Math.max(0, rawShip || 0);
  const amzNum = Math.max(0, rawAmz || 0);
  const dhlNum = Math.max(0, rawDhl || 0);
  const totalImportExtraUsd = shipNum + amzNum + dhlNum;

  const totalSkusInBatch = batchProducts.length;
  const totalUnitsInBatch = batchProducts.reduce((acc, p) => acc + Math.max(1, p.stock_current), 0);
  const totalBaseCostSum = batchProducts.reduce(
    (acc, p) => acc + (p.base_cost_usd || 0) * Math.max(1, p.stock_current),
    0
  );

  // Calcula cómo queda cada producto con los gastos de envío e impuestos
  const previewRows = batchProducts.map((p) => {
    const base = Number(p.base_cost_usd || 0);
    let extraPerUnit = 0;

    if (prorateMode === 'per_item') {
      extraPerUnit = totalSkusInBatch > 0 ? totalImportExtraUsd / totalSkusInBatch : 0;
    } else {
      extraPerUnit = totalBaseCostSum > 0 ? (base / totalBaseCostSum) * totalImportExtraUsd : 0;
    }

    const newLanded = round2(base + extraPerUnit);
    const newLandedNio = round2(newLanded * exchangeRate);
    const currentProfitNio = (p.price_nio || 0) - newLandedNio;
    const marginPct = p.price_nio > 0 ? (currentProfitNio / p.price_nio) * 100 : 0;

    // Precio sugerido para ganar targetMarginPct% sobre el precio de venta:
    // precio = costo / (1 - margen)
    const safeMarginRatio = Math.min(0.85, Math.max(0.05, targetMarginPct / 100));
    const suggestedUsd = round2(newLanded / (1 - safeMarginRatio));
    // Redondear a múltiplos de 5 córdobas para que sea un precio comercial limpio
    const rawSuggestedNio = suggestedUsd * exchangeRate;
    const suggestedNio = Math.max(5, Math.ceil(rawSuggestedNio / 5) * 5);
    const suggestedProfitNio = round2(suggestedNio - newLandedNio);

    return {
      product: p,
      base,
      baseNio: round2(base * exchangeRate),
      extraPerUnit: round2(extraPerUnit),
      extraNio: round2(extraPerUnit * exchangeRate),
      newLanded,
      newLandedNio,
      currentProfitNio,
      marginPct,
      suggestedUsd: round2(suggestedNio / exchangeRate),
      suggestedNio,
      suggestedProfitNio,
    };
  });

  const extraPerItemEqualUsd = totalSkusInBatch > 0 ? totalImportExtraUsd / totalSkusInBatch : 0;

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!newBatchName.trim()) {
      setErrorMsg('Escribe un nombre para identificar tu compra, por ejemplo "Pedido de mayo".');
      return;
    }
    const created: Batch = {
      id: `batch-${Date.now()}`,
      tenant_id: tenant?.id || TENANT_STELLA_ID,
      name: newBatchName.trim(),
      shipping_cost_usd: 0,
      amazon_fee_usd: 0,
      dhl_tax_usd: 0,
      total_batch_investment_usd: 0,
      created_at: new Date().toISOString(),
    };
    const updated = [...batches, created];
    setBatches(updated);
    saveStoredBatches(updated);
    setSelectedBatchId(created.id);
    setNewBatchName('');
    setIsNewBatchOpen(false);
    setStep(1);
    setSuccessMsg(`Creamos la compra "${created.name}".`);
  };

  const handleDeleteBatch = (batch: Batch) => {
    const remaining = batches.filter((b) => b.id !== batch.id);
    setBatches(remaining);
    saveStoredBatches(remaining);
    if (selectedBatchId === batch.id && remaining.length > 0) {
      setSelectedBatchId(remaining[0].id);
    }
    setBatchToDelete(null);
    setSuccessMsg(`Se borró la compra "${batch.name}".`);
  };

  const handleApplyProration = (alsoUpdateSuggestedPrices = false) => {
    if (!activeBatch) return;
    if (hasInvalidInputs) {
      setErrorMsg('Revisa que los montos de envío e impuestos sean números mayores o iguales a cero.');
      return;
    }

    const nowIso = new Date().toISOString();
    const newHistoryEntries: PriceHistory[] = [];

    const updatedProducts = products.map((p) => {
      if (p.batch_id !== activeBatch.id) return p;
      const preview = previewRows.find((r) => r.product.id === p.id);
      if (!preview) return p;

      const oldLanded = p.landed_cost_usd || p.base_cost_usd;
      const nextPriceNio = alsoUpdateSuggestedPrices ? preview.suggestedNio : p.price_nio;
      const nextPriceUsd = alsoUpdateSuggestedPrices ? preview.suggestedUsd : p.price_usd;

      const costChanged = Math.abs(oldLanded - preview.newLanded) >= 0.01;
      const priceChanged = Math.abs((p.price_nio || 0) - nextPriceNio) >= 0.5;

      if (costChanged || priceChanged) {
        newHistoryEntries.push({
          id: `ph-${Date.now()}-${p.sku}`,
          tenant_id: p.tenant_id,
          product_id: p.id,
          old_cost_usd: oldLanded,
          new_cost_usd: preview.newLanded,
          old_price_usd: p.price_usd,
          new_price_usd: nextPriceUsd,
          old_price_nio: p.price_nio,
          new_price_nio: nextPriceNio,
          reason: alsoUpdateSuggestedPrices
            ? `Costo real y precio sugerido (${targetMarginPct}% ganancia) en ${activeBatch.name}`
            : `Reparto de envío e impuestos en ${activeBatch.name}`,
          changed_at: nowIso,
        });
      }

      return {
        ...p,
        landed_cost_usd: preview.newLanded,
        price_nio: nextPriceNio,
        price_usd: nextPriceUsd,
        updated_at: nowIso,
      };
    });

    const totalNewBatchInvestment = previewRows.reduce(
      (acc, r) => acc + r.newLanded * Math.max(1, r.product.stock_current),
      0
    );

    const updatedBatches = batches.map((b) =>
      b.id === activeBatch.id
        ? {
            ...b,
            shipping_cost_usd: shipNum,
            amazon_fee_usd: amzNum,
            dhl_tax_usd: dhlNum,
            total_batch_investment_usd: round2(totalNewBatchInvestment),
          }
        : b
    );

    saveStoredProducts(updatedProducts);
    saveStoredBatches(updatedBatches);

    if (newHistoryEntries.length > 0) {
      saveStoredPriceHistory([...newHistoryEntries, ...getStoredPriceHistory()]);
    }

    setProducts(updatedProducts);
    setBatches(updatedBatches);
    setErrorMsg(null);
    setSuccessMsg(
      alsoUpdateSuggestedPrices
        ? `¡Listo! Guardamos el costo real y actualizamos los precios sugeridos en los ${batchProducts.length} productos de "${activeBatch.name}".`
        : `¡Listo! Guardamos cuánto te cuesta realmente cada uno de los ${batchProducts.length} productos de "${activeBatch.name}".`
    );
  };

  const handleApplySingleSuggestedPrice = (row: (typeof previewRows)[number]) => {
    const nowIso = new Date().toISOString();
    const p = row.product;
    const oldCost = p.landed_cost_usd || p.base_cost_usd;

    const newHistory: PriceHistory = {
      id: `ph-${Date.now()}-${p.sku}`,
      tenant_id: p.tenant_id,
      product_id: p.id,
      old_cost_usd: oldCost,
      new_cost_usd: row.newLanded,
      old_price_usd: p.price_usd,
      new_price_usd: row.suggestedUsd,
      old_price_nio: p.price_nio,
      new_price_nio: row.suggestedNio,
      reason: `Precio sugerido aplicado (${targetMarginPct}% de ganancia)`,
      changed_at: nowIso,
    };

    const updatedProducts = products.map((item) =>
      item.id === p.id
        ? {
            ...item,
            landed_cost_usd: row.newLanded,
            price_nio: row.suggestedNio,
            price_usd: row.suggestedUsd,
            updated_at: nowIso,
          }
        : item
    );

    saveStoredProducts(updatedProducts);
    saveStoredPriceHistory([newHistory, ...getStoredPriceHistory()]);
    setProducts(updatedProducts);
    setSavedProductId(p.id);
    setTimeout(() => setSavedProductId(null), 1800);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900 tracking-tight">
              Costo de mis compras
            </h1>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${PLAN_INFO[2].badgeColor}`}>
              Plan {PLAN_INFO[2].name}
            </span>
          </div>
          <p className="text-sm text-deepSlate-500 mt-1">
            Descubre cuánto te cuesta realmente cada producto sumando el pedido, el envío y los impuestos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsNewBatchOpen((v) => !v)}
          className="min-h-[48px] inline-flex items-center justify-center gap-2 px-4 rounded-xl text-sm font-bold bg-white hover:bg-nacre-100 text-deepSlate-800 border border-nacre-200"
        >
          <Plus className="w-4 h-4 text-coral-500" />
          Nueva compra o pedido
        </button>
      </div>

      {/* Formulario para crear un nuevo pedido */}
      {isNewBatchOpen && (
        <form
          onSubmit={handleCreateBatch}
          className="bg-white rounded-2xl border border-nacre-200 p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <input
            type="text"
            autoFocus
            placeholder="Nombre del pedido (ej. Pedido Shein Mayo, Importación #5)..."
            value={newBatchName}
            onChange={(e) => setNewBatchName(e.target.value)}
            className="flex-1 min-h-[48px] px-4 text-sm rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsNewBatchOpen(false)}
              className="min-h-[48px] px-4 rounded-xl text-sm font-bold text-deepSlate-600 bg-nacre-100 hover:bg-nacre-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[48px] px-5 rounded-xl text-sm font-bold text-white bg-coral-500 hover:bg-coral-600"
            >
              Crear pedido
            </button>
          </div>
        </form>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-sm font-bold underline">
            Cerrar
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-sm font-bold text-emerald-800 underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Selector de pedido / compra */}
      <div>
        <p className="text-sm font-bold text-deepSlate-700 mb-2.5">
          Elige qué compra o pedido quieres calcular:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {batches.map((b) => {
            const isSelected = b.id === activeBatch?.id;
            const bProds = products.filter((p) => p.batch_id === b.id);
            const totalUsd = Number(b.total_batch_investment_usd || 0);
            return (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-coral-50/70 border-2 border-coral-500 shadow-sm'
                    : 'bg-white border-nacre-200 hover:bg-nacre-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBatchId(b.id);
                    setSuccessMsg(null);
                  }}
                  className="text-left w-full"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        isSelected ? 'bg-coral-500 text-white' : 'bg-nacre-100 text-deepSlate-700'
                      }`}
                    >
                      {bProds.length} {bProds.length === 1 ? 'producto' : 'productos'}
                    </span>
                    {isSelected && (
                      <span className="text-xs font-bold text-coral-700">Seleccionado</span>
                    )}
                  </div>
                  <p className="text-sm font-extrabold text-deepSlate-900 truncate">{b.name}</p>
                  <p className="text-sm text-deepSlate-600 mt-1">
                    Invertido: <strong>{fmtNio(totalUsd * exchangeRate, 0)}</strong>{' '}
                    <span className="text-xs text-deepSlate-400">({fmtUsd(totalUsd)})</span>
                  </p>
                </button>
                {bProds.length === 0 && batches.length > 1 && (
                  <div className="mt-3 pt-2 border-t border-nacre-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setBatchToDelete(b)}
                      className="min-h-[36px] px-2.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Borrar pedido vacío
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Asistente en 4 pasos */}
      <div className="bg-white rounded-3xl border border-nacre-200 shadow-xs overflow-hidden">
        {/* Barra de pasos */}
        <div className="bg-nacre-50/70 border-b border-nacre-200 p-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STEP_INFO.map((s) => {
              const isActive = step === s.step;
              const isDone = step > s.step;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setStep(s.step)}
                  className={`min-h-[52px] p-2.5 rounded-2xl text-left border transition-all flex items-center gap-2.5 ${
                    isActive
                      ? 'bg-white border-2 border-coral-500 shadow-2xs'
                      : isDone
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-white/60 border-nacre-200 text-deepSlate-600 hover:bg-white'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-coral-500 text-white'
                        : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-nacre-200 text-deepSlate-700'
                    }`}
                  >
                    {isDone ? '✓' : s.step}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-deepSlate-900 truncate">{s.title}</p>
                    <p className="text-xs text-deepSlate-500 truncate hidden sm:block">{s.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido del paso activo */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* PASO 1: EL PEDIDO */}
          {step === 1 && (
            <div className="space-y-5 max-w-2xl">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-coral-50 border border-coral-200 text-coral-600 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-deepSlate-900">
                    Paso 1: ¿Cuánto pagaste por el pedido en la tienda?
                  </h2>
                  <p className="text-sm text-deepSlate-600 mt-1">
                    Estamos calculando la compra <strong>{activeBatch?.name}</strong>, que tiene{' '}
                    <strong>{totalSkusInBatch} productos</strong> ({totalUnitsInBatch} piezas en total).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200 space-y-2">
                <span className="text-sm font-bold text-deepSlate-600 block">
                  Suma de lo que costaron los productos en la factura:
                </span>
                <p className="text-2xl font-extrabold text-deepSlate-900">
                  {fmtUsd(totalBaseCostSum)}{' '}
                  <span className="text-base font-bold text-deepSlate-500">
                    ({fmtNio(totalBaseCostSum * exchangeRate, 0)})
                  </span>
                </p>
                <p className="text-sm text-deepSlate-500">
                  Este monto sale automáticamente de lo que pagaste por cada producto de este pedido.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-nacre-200 space-y-3">
                <label className="block text-base font-extrabold text-deepSlate-900" htmlFor="amz-fee-input">
                  ¿La tienda o página te cobró algún cargo extra? (Opcional)
                </label>
                <p className="text-sm text-deepSlate-500">
                  Por ejemplo: envío dentro de Estados Unidos, comisión de Amazon, Shein o recargo de tarjeta. Si no te cobraron nada extra, déjalo en 0.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative max-w-xs w-full">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-deepSlate-500">
                      US$
                    </span>
                    <input
                      id="amz-fee-input"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={amazonFeeUsd}
                      onChange={(e) => setAmazonFeeUsd(e.target.value)}
                      className="w-full min-h-[52px] pl-14 pr-4 text-lg font-extrabold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white"
                    />
                  </div>
                  <div className="text-sm text-deepSlate-600">
                    Equivale a <strong>{fmtNio(amzNum * exchangeRate, 0)}</strong>
                    {totalSkusInBatch > 0 && amzNum > 0 && (
                      <span className="block text-coral-600 font-bold">
                        Suma +{fmtUsd(amzNum / totalSkusInBatch)} ({fmtNio((amzNum / totalSkusInBatch) * exchangeRate)}) a cada producto
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="min-h-[52px] px-6 rounded-xl text-base font-bold text-white bg-coral-500 hover:bg-coral-600 inline-flex items-center gap-2 shadow-md shadow-coral-500/20"
                >
                  Siguiente: El envío <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: EL ENVÍO */}
          {step === 2 && (
            <div className="space-y-5 max-w-2xl">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-coral-50 border border-coral-200 text-coral-600 flex items-center justify-center shrink-0">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-deepSlate-900">
                    Paso 2: ¿Cuánto pagaste de envío para traer el pedido?
                  </h2>
                  <p className="text-sm text-deepSlate-600 mt-1">
                    Escribe lo que te cobró la agencia de envíos, casillero o transporte por traer la caja hasta tu negocio.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-nacre-50 border border-nacre-200 space-y-3">
                <label className="block text-base font-extrabold text-deepSlate-900" htmlFor="shipping-input">
                  Costo total del envío (en dólares US$)
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative max-w-xs w-full">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-deepSlate-500">
                      US$
                    </span>
                    <input
                      id="shipping-input"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={shippingUsd}
                      onChange={(e) => setShippingUsd(e.target.value)}
                      className="w-full min-h-[52px] pl-14 pr-4 text-lg font-extrabold rounded-xl bg-white border border-nacre-200 focus:outline-none focus:border-coral-500"
                    />
                  </div>
                  <div className="text-sm text-deepSlate-700 space-y-0.5">
                    <p>
                      Son <strong>{fmtNio(shipNum * exchangeRate, 0)}</strong> en total.
                    </p>
                    {totalSkusInBatch > 0 && (
                      <p className="text-coral-600 font-bold">
                        Cada producto paga +{fmtUsd(shipNum / totalSkusInBatch)} ({fmtNio((shipNum / totalSkusInBatch) * exchangeRate)}) de envío.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="min-h-[52px] px-5 rounded-xl text-sm font-bold text-deepSlate-700 bg-nacre-100 hover:bg-nacre-200 inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="min-h-[52px] px-6 rounded-xl text-base font-bold text-white bg-coral-500 hover:bg-coral-600 inline-flex items-center gap-2 shadow-md shadow-coral-500/20"
                >
                  Siguiente: Impuestos <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: IMPUESTOS Y MODO DE REPARTO */}
          {step === 3 && (
            <div className="space-y-5 max-w-2xl">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-coral-50 border border-coral-200 text-coral-600 flex items-center justify-center shrink-0">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-deepSlate-900">
                    Paso 3: ¿Pagaste impuestos, aduana o DHL?
                  </h2>
                  <p className="text-sm text-deepSlate-600 mt-1">
                    Si tuviste que pagar póliza de aduana, impuestos o desaduanaje al recibir tu paquete, anótalo aquí.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-nacre-50 border border-nacre-200 space-y-3">
                <label className="block text-base font-extrabold text-deepSlate-900" htmlFor="tax-input">
                  Impuestos o aduana pagados (US$)
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative max-w-xs w-full">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-deepSlate-500">
                      US$
                    </span>
                    <input
                      id="tax-input"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={dhlTaxUsd}
                      onChange={(e) => setDhlTaxUsd(e.target.value)}
                      className="w-full min-h-[52px] pl-14 pr-4 text-lg font-extrabold rounded-xl bg-white border border-nacre-200 focus:outline-none focus:border-coral-500"
                    />
                  </div>
                  <div className="text-sm text-deepSlate-700 space-y-0.5">
                    <p>
                      Son <strong>{fmtNio(dhlNum * exchangeRate, 0)}</strong> en total.
                    </p>
                    {totalSkusInBatch > 0 && (
                      <p className="text-coral-600 font-bold">
                        Suma +{fmtUsd(dhlNum / totalSkusInBatch)} ({fmtNio((dhlNum / totalSkusInBatch) * exchangeRate)}) por producto.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Cómo repartir los gastos */}
              <div className="space-y-2.5">
                <p className="text-sm font-bold text-deepSlate-800">
                  ¿Cómo quieres repartir los {fmtUsd(totalImportExtraUsd)} de envío e impuestos entre tus productos?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProrateMode('per_item')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      prorateMode === 'per_item'
                        ? 'bg-coral-50/70 border-2 border-coral-500'
                        : 'bg-white border-nacre-200 hover:bg-nacre-50'
                    }`}
                  >
                    <p className="text-sm font-extrabold text-deepSlate-900">
                      En partes iguales (Recomendado)
                    </p>
                    <p className="text-sm text-deepSlate-600 mt-1">
                      Cada producto recibe exactamente <strong>+{fmtUsd(extraPerItemEqualUsd)}</strong> (
                      {fmtNio(extraPerItemEqualUsd * exchangeRate)}) de costo extra.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProrateMode('by_cost_weight')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      prorateMode === 'by_cost_weight'
                        ? 'bg-coral-50/70 border-2 border-coral-500'
                        : 'bg-white border-nacre-200 hover:bg-nacre-50'
                    }`}
                  >
                    <p className="text-sm font-extrabold text-deepSlate-900">
                      Según lo que costó cada uno
                    </p>
                    <p className="text-sm text-deepSlate-600 mt-1">
                      Los productos más caros absorben una mayor parte del envío y los más baratos absorben menos.
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="min-h-[52px] px-5 rounded-xl text-sm font-bold text-deepSlate-700 bg-nacre-100 hover:bg-nacre-200 inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="min-h-[52px] px-6 rounded-xl text-base font-bold text-white bg-coral-500 hover:bg-coral-600 inline-flex items-center gap-2 shadow-md shadow-coral-500/20"
                >
                  Ver resultado y precios sugeridos <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 4: RESULTADO EN PALABRAS Y SUGERENCIA DE PRECIO */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Resumen explicado en palabras */}
              <div className="p-5 rounded-2xl bg-coral-50/60 border border-coral-200 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-coral-700">
                      Resumen de tu compra en palabras simples
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold text-deepSlate-900 leading-snug">
                      Por tus {totalSkusInBatch} productos pagaste {fmtUsd(totalBaseCostSum)} en la tienda, más{' '}
                      <span className="text-coral-600">
                        {fmtUsd(totalImportExtraUsd)} ({fmtNio(totalImportExtraUsd * exchangeRate, 0)})
                      </span>{' '}
                      de envío e impuestos.
                    </h3>
                    <p className="text-sm text-deepSlate-700">
                      {prorateMode === 'per_item' ? (
                        <>
                          Eso significa que traer cada producto hasta tu negocio te costó{' '}
                          <strong>
                            +{fmtNio(extraPerItemEqualUsd * exchangeRate)} ({fmtUsd(extraPerItemEqualUsd)}) adicionales
                          </strong>{' '}
                          sobre el precio de factura.
                        </>
                      ) : (
                        <>
                          Esos gastos se repartieron proporcionalmente según el valor de cada producto para que sepas tu costo real.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApplyProration(false)}
                      disabled={totalSkusInBatch === 0}
                      className="min-h-[52px] px-5 rounded-xl text-sm font-bold text-white bg-coral-500 hover:bg-coral-600 disabled:opacity-50 shadow-md shadow-coral-500/25 inline-flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Guardar costos reales
                    </button>
                  </div>
                </div>
              </div>

              {/* Selector interactivo: ¿Cuánto quieres ganar? */}
              <div className="p-4 sm:p-5 rounded-2xl bg-nacre-50 border border-nacre-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-deepSlate-900">
                      ¿Cuánto quieres ganar en cada producto?
                    </h4>
                    <p className="text-sm text-deepSlate-600">
                      Elige el porcentaje de ganancia que buscas y te sugerimos a qué precio vender cada pieza.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[30, 40, 45, 50, 60].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setTargetMarginPct(pct)}
                      className={`min-h-[44px] px-3.5 rounded-xl text-sm font-extrabold border transition-all ${
                        targetMarginPct === pct
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white text-deepSlate-700 border-nacre-200 hover:bg-nacre-100'
                      }`}
                    >
                      Ganar {pct}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleApplyProration(true)}
                    disabled={totalSkusInBatch === 0}
                    className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    Usar precios sugeridos en todos
                  </button>
                </div>
              </div>

              {/* Estado vacío si el pedido no tiene productos */}
              {previewRows.length === 0 ? (
                <div className="p-10 text-center rounded-2xl border border-nacre-200 bg-nacre-50/50 space-y-2">
                  <Package className="w-10 h-10 text-deepSlate-400 mx-auto" />
                  <h4 className="text-base font-extrabold text-deepSlate-900">
                    Este pedido aún no tiene productos
                  </h4>
                  <p className="text-sm text-deepSlate-500 max-w-md mx-auto">
                    Ve a "Mis productos" para agregar piezas a este pedido o selecciona otra compra arriba.
                  </p>
                </div>
              ) : (
                <>
                  {/* Escritorio: Tabla clara y escaneable */}
                  <div className="hidden md:block border border-nacre-200 rounded-2xl overflow-hidden">
                    <div className="max-h-[480px] overflow-y-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-nacre-100 border-b border-nacre-200 text-deepSlate-700 font-bold">
                          <tr>
                            <th className="py-3.5 px-4">Producto</th>
                            <th className="py-3.5 px-4">Cuánto te cuesta de verdad</th>
                            <th className="py-3.5 px-4 text-right">Tu precio actual</th>
                            <th className="py-3.5 px-4 text-right">
                              Sugerido para ganar {targetMarginPct}%
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-nacre-100">
                          {previewRows.map((row) => {
                            const {
                              product: p,
                              base,
                              extraPerUnit,
                              newLanded,
                              newLandedNio,
                              currentProfitNio,
                              marginPct,
                              suggestedNio,
                              suggestedUsd,
                              suggestedProfitNio,
                            } = row;
                            const isJustSaved = savedProductId === p.id;
                            return (
                              <tr key={p.id} className="hover:bg-nacre-50/70">
                                <td className="py-3 px-4 max-w-xs">
                                  <span className="font-bold text-deepSlate-900 block truncate">
                                    {p.name || p.sku}
                                  </span>
                                  <span className="text-xs text-deepSlate-400">
                                    Código {p.sku} · {p.stock_current} {p.stock_current === 1 ? 'pieza' : 'piezas'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <p className="font-extrabold text-deepSlate-900">
                                    Te cuesta {fmtNio(newLandedNio)}{' '}
                                    <span className="text-xs font-semibold text-deepSlate-500">
                                      ({fmtUsd(newLanded)})
                                    </span>
                                  </p>
                                  <p className="text-xs text-deepSlate-500 mt-0.5">
                                    Factura {fmtUsd(base)} + Envío/Imp. {fmtUsd(extraPerUnit)}
                                  </p>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="font-bold text-deepSlate-900 block">
                                    {fmtNio(p.price_nio, 0)}{' '}
                                    <span className="text-xs text-deepSlate-400 font-normal">
                                      ({fmtUsd(p.price_usd)})
                                    </span>
                                  </span>
                                  <span
                                    className={`text-xs font-bold ${
                                      currentProfitNio <= 0
                                        ? 'text-rose-600'
                                        : marginPct < 20
                                        ? 'text-amber-700'
                                        : 'text-emerald-700'
                                    }`}
                                  >
                                    {currentProfitNio <= 0
                                      ? `Pierdes ${fmtNio(Math.abs(currentProfitNio), 0)}`
                                      : `Ganas ${fmtNio(currentProfitNio, 0)} (${marginPct.toFixed(0)}%)`}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="inline-flex items-center justify-end gap-3">
                                    <div>
                                      <span className="font-extrabold text-coral-600 block">
                                        Vender a {fmtNio(suggestedNio, 0)}{' '}
                                        <span className="text-xs text-deepSlate-400 font-normal">
                                          ({fmtUsd(suggestedUsd)})
                                        </span>
                                      </span>
                                      <span className="text-xs text-emerald-700 font-semibold block">
                                        Ganas {fmtNio(suggestedProfitNio, 0)} por pieza
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleApplySingleSuggestedPrice(row)}
                                      className={`min-h-[40px] px-3 rounded-xl text-xs font-bold border transition-all ${
                                        isJustSaved
                                          ? 'bg-emerald-600 text-white border-emerald-600'
                                          : 'bg-white hover:bg-coral-50 text-coral-600 border-coral-200'
                                      }`}
                                    >
                                      {isJustSaved ? (
                                        <span className="inline-flex items-center gap-1">
                                          <Check className="w-3.5 h-3.5" /> Aplicado
                                        </span>
                                      ) : (
                                        'Usar precio'
                                      )}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Móvil: Tarjetas explicadas en palabras */}
                  <div className="md:hidden space-y-3">
                    {previewRows.map((row) => {
                      const {
                        product: p,
                        base,
                        extraPerUnit,
                        newLanded,
                        newLandedNio,
                        currentProfitNio,
                        marginPct,
                        suggestedNio,
                        suggestedProfitNio,
                      } = row;
                      const isJustSaved = savedProductId === p.id;
                      return (
                        <div
                          key={p.id}
                          className="rounded-2xl border border-nacre-200 bg-white p-4 space-y-3"
                        >
                          <div>
                            <p className="font-extrabold text-deepSlate-900 text-base">
                              {p.name || p.sku}
                            </p>
                            <p className="text-xs text-deepSlate-400">
                              Código {p.sku} · {p.stock_current} {p.stock_current === 1 ? 'pieza' : 'piezas'}
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-nacre-50 text-sm space-y-1">
                            <p className="text-deepSlate-600">
                              Pagaste <strong>{fmtUsd(base)}</strong> +{' '}
                              <strong>{fmtUsd(extraPerUnit)}</strong> de envío e impuestos:
                            </p>
                            <p className="font-extrabold text-deepSlate-900 text-base">
                              Te cuesta realmente {fmtNio(newLandedNio)} ({fmtUsd(newLanded)})
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-deepSlate-600">
                              Precio hoy: <strong>{fmtNio(p.price_nio, 0)}</strong>
                            </span>
                            <span
                              className={`font-bold ${
                                currentProfitNio <= 0 ? 'text-rose-600' : 'text-emerald-700'
                              }`}
                            >
                              {currentProfitNio <= 0
                                ? `Pierdes ${fmtNio(Math.abs(currentProfitNio), 0)}`
                                : `Ganas ${fmtNio(currentProfitNio, 0)} (${marginPct.toFixed(0)}%)`}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-coral-50/50 border border-coral-200 flex items-center justify-between gap-2">
                            <div className="text-sm">
                              <span className="text-xs font-bold text-coral-700 block">
                                Sugerido para ganar {targetMarginPct}%:
                              </span>
                              <strong className="text-coral-600 text-base">
                                {fmtNio(suggestedNio, 0)}
                              </strong>{' '}
                              <span className="text-xs text-emerald-700 font-semibold">
                                (Ganas {fmtNio(suggestedProfitNio, 0)})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleApplySingleSuggestedPrice(row)}
                              className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold shrink-0 ${
                                isJustSaved
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-coral-500 text-white'
                              }`}
                            >
                              {isJustSaved ? '¡Aplicado!' : 'Usar este precio'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-nacre-200">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="min-h-[48px] px-5 rounded-xl text-sm font-bold text-deepSlate-700 bg-nacre-100 hover:bg-nacre-200 inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver a impuestos
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyProration(false)}
                  disabled={totalSkusInBatch === 0}
                  className="min-h-[52px] px-6 rounded-xl text-base font-bold text-white bg-coral-500 hover:bg-coral-600 disabled:opacity-50 shadow-md shadow-coral-500/25 inline-flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Guardar costos reales en mis productos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!batchToDelete}
        title="¿Borrar este pedido?"
        message={
          <>
            Vas a borrar el pedido <strong>{batchToDelete?.name}</strong>. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Sí, borrar pedido"
        cancelLabel="No, conservar"
        onCancel={() => setBatchToDelete(null)}
        onConfirm={() => {
          if (batchToDelete) handleDeleteBatch(batchToDelete);
        }}
      />
    </div>
  );
};
