import React, { useState, useEffect } from 'react';
import {
  Layers,
  Calculator,
  Truck,
  ShoppingCart,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Batch, Product, PriceHistory } from '../types';
import {
  getStoredBatches,
  saveStoredBatches,
  getStoredProducts,
  saveStoredProducts,
  getStoredPriceHistory,
  saveStoredPriceHistory,
  BATCH_IDS,
} from '../data/realInventoryData';

export const BatchesPage: React.FC = () => {
  const { planTier, role, setSimulatedRole, setSimulatedTier } = useAuth();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(BATCH_IDS.GEORGINA_3);

  // Import Calculator Inputs
  const [shippingUsd, setShippingUsd] = useState<string>('50.80');
  const [amazonFeeUsd, setAmazonFeeUsd] = useState<string>('0.00');
  const [dhlTaxUsd, setDhlTaxUsd] = useState<string>('17.20');
  const [prorateMode, setProrateMode] = useState<'per_item' | 'by_cost_weight'>('per_item');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  if (role === 'seller') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-deepSlate-900 mb-2">
          Costeo de Importación Restringido
        </h2>
        <p className="text-xs sm:text-sm text-deepSlate-500 mb-6">
          Los vendedores no tienen acceso a la estructura de costos de importación ni al prorrateo de fletes.
        </p>
        <button
          onClick={() => setSimulatedRole('global_owner')}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600"
        >
          Simular Cambio a Modo Dueño
        </button>
      </div>
    );
  }

  if (planTier < 2) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-coral-50 border border-coral-200 text-coral-500 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-coral-600 bg-coral-50 px-3 py-1 rounded-full">
          Módulo Nivel 2 (Crecimiento)
        </span>
        <h2 className="text-2xl font-extrabold text-deepSlate-900 mt-3 mb-2">
          Calculadora de Importación y Prorrateo por Lote
        </h2>
        <p className="text-xs sm:text-sm text-deepSlate-500 mb-6">
          Activa el Nivel 2 para distribuir fletes de envío, cargos de Amazon e impuestos DHL directamente al costo unitario de cada pieza.
        </p>
        <button
          onClick={() => setSimulatedTier(2)}
          className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25"
        >
          Cambiar a Nivel 2 Ahora
        </button>
      </div>
    );
  }

  const activeBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];
  const batchProducts = products.filter((p) => p.batch_id === activeBatch?.id);

  const shipNum = Math.max(0, parseFloat(shippingUsd) || 0);
  const amzNum = Math.max(0, parseFloat(amazonFeeUsd) || 0);
  const dhlNum = Math.max(0, parseFloat(dhlTaxUsd) || 0);
  const totalImportExtraUsd = shipNum + amzNum + dhlNum;

  const totalSkusInBatch = batchProducts.length;
  const totalBaseCostSum = batchProducts.reduce(
    (acc, p) => acc + (p.base_cost_usd || 0) * Math.max(1, p.stock_current),
    0
  );

  // Calculate preview landed cost for each product in batch
  const previewRows = batchProducts.map((p) => {
    const base = Number(p.base_cost_usd || 0);
    let extraPerUnit = 0;

    if (prorateMode === 'per_item') {
      extraPerUnit = totalSkusInBatch > 0 ? totalImportExtraUsd / totalSkusInBatch : 0;
    } else {
      extraPerUnit = totalBaseCostSum > 0 ? (base / totalBaseCostSum) * totalImportExtraUsd : 0;
    }

    const newLanded = Math.round((base + extraPerUnit) * 100) / 100;
    const marginPct = p.price_usd > 0 ? ((p.price_usd - newLanded) / p.price_usd) * 100 : 0;

    return {
      product: p,
      base,
      extraPerUnit: Math.round(extraPerUnit * 100) / 100,
      newLanded,
      marginPct,
    };
  });

  const handleApplyProration = () => {
    if (!activeBatch) return;
    const nowIso = new Date().toISOString();
    const newHistoryEntries: PriceHistory[] = [];

    const updatedProducts = products.map((p) => {
      if (p.batch_id !== activeBatch.id) return p;
      const preview = previewRows.find((r) => r.product.id === p.id);
      if (!preview) return p;

      const oldLanded = p.landed_cost_usd || p.base_cost_usd;
      if (Math.abs(oldLanded - preview.newLanded) >= 0.01) {
        newHistoryEntries.push({
          id: `ph-${Date.now()}-${p.sku}`,
          tenant_id: p.tenant_id,
          product_id: p.id,
          old_cost_usd: oldLanded,
          new_cost_usd: preview.newLanded,
          old_price_usd: p.price_usd,
          new_price_usd: p.price_usd,
          old_price_nio: p.price_nio,
          new_price_nio: p.price_nio,
          reason: `Prorrateo Lote: Envío $${shipNum.toFixed(2)}, Amazon $${amzNum.toFixed(2)}, DHL $${dhlNum.toFixed(2)}`,
          changed_at: nowIso,
        });
      }

      return {
        ...p,
        landed_cost_usd: preview.newLanded,
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
            total_batch_investment_usd: Math.round(totalNewBatchInvestment * 100) / 100,
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
    setSuccessMsg(
      `¡Prorrateo aplicado a ${batchProducts.length} SKUs del lote "${activeBatch.name}"! Se actualizaron los costos Landed y el historial de auditoría.`
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900 tracking-tight">
              Calculadora de Lotes & Prorrateo de Importación
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-coral-50 text-coral-600 border border-coral-200">
              Nivel 2+
            </span>
          </div>
          <p className="text-xs sm:text-sm text-deepSlate-500 mt-1">
            Distribuye automáticamente fletes de envío, compra Amazon e impuestos DHL hacia el costo unitario real de cada pieza.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Batch Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {batches.map((b) => {
          const isSelected = b.id === activeBatch?.id;
          const bProds = products.filter((p) => p.batch_id === b.id);
          return (
            <button
              key={b.id}
              onClick={() => {
                setSelectedBatchId(b.id);
                setSuccessMsg(null);
              }}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'bg-coral-50/70 border-2 border-coral-500 shadow-sm'
                  : 'bg-white border-nacre-200 hover:bg-nacre-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Layers className={`w-4 h-4 ${isSelected ? 'text-coral-600' : 'text-deepSlate-400'}`} />
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-nacre-100 text-deepSlate-700">
                  {bProds.length} SKUs
                </span>
              </div>
              <p className="text-xs font-extrabold text-deepSlate-900 truncate">{b.name}</p>
              <p className="text-[11px] font-mono text-deepSlate-500 mt-1">
                Inversión Lote: <strong>${Number(b.total_batch_investment_usd || 0).toFixed(2)}</strong>
              </p>
            </button>
          );
        })}
      </div>

      {/* Import Cost Calculator Card */}
      <div className="bg-white rounded-3xl border border-nacre-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-nacre-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-coral-500 text-white flex items-center justify-center shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-deepSlate-900">
                Parámetros de Importación — {activeBatch?.name}
              </h3>
              <p className="text-xs text-deepSlate-500">
                Ajusta los gastos globales del lote y previsualiza el impacto en cada SKU antes de guardar
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-nacre-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setProrateMode('per_item')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                prorateMode === 'per_item'
                  ? 'bg-white text-deepSlate-900 shadow-2xs'
                  : 'text-deepSlate-500'
              }`}
            >
              Equitativo por Ítem
            </button>
            <button
              type="button"
              onClick={() => setProrateMode('by_cost_weight')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                prorateMode === 'by_cost_weight'
                  ? 'bg-white text-deepSlate-900 shadow-2xs'
                  : 'text-deepSlate-500'
              }`}
            >
              Proporcional al Costo (%)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Shipping */}
          <div className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200">
            <label className="text-[11px] font-bold uppercase tracking-wider text-deepSlate-600 flex items-center space-x-1.5 mb-2">
              <Truck className="w-3.5 h-3.5 text-coral-500" />
              <span>Envío Internacional ($ USD)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={shippingUsd}
              onChange={(e) => setShippingUsd(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono font-extrabold rounded-xl bg-white border border-nacre-200 focus:outline-none focus:border-coral-500"
            />
            <span className="text-[10px] text-deepSlate-400 font-mono mt-1 block">
              +{totalSkusInBatch > 0 ? `$${(shipNum / totalSkusInBatch).toFixed(2)}` : '$0.00'} / SKU
            </span>
          </div>

          {/* Amazon Fee */}
          <div className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200">
            <label className="text-[11px] font-bold uppercase tracking-wider text-deepSlate-600 flex items-center space-x-1.5 mb-2">
              <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
              <span>Compra Amazon / Cargos ($)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amazonFeeUsd}
              onChange={(e) => setAmazonFeeUsd(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono font-extrabold rounded-xl bg-white border border-nacre-200 focus:outline-none focus:border-coral-500"
            />
            <span className="text-[10px] text-deepSlate-400 font-mono mt-1 block">
              +{totalSkusInBatch > 0 ? `$${(amzNum / totalSkusInBatch).toFixed(2)}` : '$0.00'} / SKU
            </span>
          </div>

          {/* DHL / Customs */}
          <div className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200">
            <label className="text-[11px] font-bold uppercase tracking-wider text-deepSlate-600 flex items-center space-x-1.5 mb-2">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Impuestos / Aduana DHL ($)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={dhlTaxUsd}
              onChange={(e) => setDhlTaxUsd(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono font-extrabold rounded-xl bg-white border border-nacre-200 focus:outline-none focus:border-coral-500"
            />
            <span className="text-[10px] text-deepSlate-400 font-mono mt-1 block">
              +{totalSkusInBatch > 0 ? `$${(dhlNum / totalSkusInBatch).toFixed(2)}` : '$0.00'} / SKU
            </span>
          </div>

          {/* Summary & Apply CTA */}
          <div className="p-4 rounded-2xl bg-coral-50/60 border border-coral-200 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-coral-700 block">
                Total Gastos de Internación
              </span>
              <p className="text-xl font-mono font-extrabold text-coral-600 mt-0.5">
                +${totalImportExtraUsd.toFixed(2)} USD
              </p>
              <span className="text-[11px] font-mono text-deepSlate-600">
                +{totalSkusInBatch > 0 ? `$${(totalImportExtraUsd / totalSkusInBatch).toFixed(2)}` : '$0.00'} prorrateo/pieza
              </span>
            </div>

            <button
              type="button"
              onClick={handleApplyProration}
              className="mt-3 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 flex items-center justify-center space-x-1.5"
            >
              <span>Aplicar Prorrateo al Lote</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Preview Table */}
        <div className="border border-nacre-200 rounded-2xl overflow-hidden">
          <div className="max-h-96 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-nacre-100 border-b border-nacre-200 text-deepSlate-600 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                  <th className="py-3 px-4 text-right">Costo Base ($)</th>
                  <th className="py-3 px-4 text-right">+ Prorrateo ($)</th>
                  <th className="py-3 px-4 text-right">Costo Landed Final ($)</th>
                  <th className="py-3 px-4 text-right">Precio Venta ($ / C$)</th>
                  <th className="py-3 px-4 text-center">Margen Real (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nacre-100 font-mono">
                {previewRows.map(({ product: p, base, extraPerUnit, newLanded, marginPct }) => (
                  <tr key={p.id} className="hover:bg-nacre-50/60">
                    <td className="py-2.5 px-4 font-bold text-deepSlate-900">{p.sku}</td>
                    <td className="py-2.5 px-4 font-sans text-deepSlate-700">{p.name}</td>
                    <td className="py-2.5 px-4 text-center">{p.stock_current}</td>
                    <td className="py-2.5 px-4 text-right text-deepSlate-500">${base.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right text-amber-600 font-bold">
                      +${extraPerUnit.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-extrabold text-deepSlate-900 bg-nacre-50/80">
                      ${newLanded.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="font-bold text-deepSlate-900">${p.price_usd.toFixed(2)}</span>
                      <span className="text-coral-600 font-bold ml-2">(C$ {p.price_nio})</span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          marginPct >= 35
                            ? 'bg-emerald-50 text-emerald-700'
                            : marginPct >= 15
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        +{marginPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

