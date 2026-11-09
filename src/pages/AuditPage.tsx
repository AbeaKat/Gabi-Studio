import React, { useState, useEffect } from 'react';
import {
  History,
  ClipboardCheck,
  ArrowRight,
  Lock,
  Plus,
  Search,
  CheckCircle2,
  MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  Product,
  PriceHistory,
  KardexMovement,
  KardexMovementType,
} from '../types';
import {
  getStoredProducts,
  saveStoredProducts,
  getStoredPriceHistory,
  getStoredKardex,
  saveStoredKardex,
  TENANT_STELLA_ID,
} from '../data/realInventoryData';

const MOVEMENT_LABELS: Record<
  KardexMovementType,
  { label: string; isNegative: boolean; badgeColor: string }
> = {
  merma_dano: {
    label: 'Merma / Avería / Daño (-)',
    isNegative: true,
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  consignacion_salida: {
    label: 'Salida a Consignación Externa (-)',
    isNegative: true,
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  consignacion_retorno: {
    label: 'Retorno de Consignación (+)',
    isNegative: false,
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  ajuste_positivo: {
    label: 'Entrada / Conteo Físico (+)',
    isNegative: false,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  ajuste_negativo: {
    label: 'Baja por Conteo Físico (-)',
    isNegative: true,
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

export const AuditPage: React.FC = () => {
  const { tenant, profile, planTier, role, setSimulatedTier } = useAuth();

  const [activeTab, setActiveTab] = useState<'kardex' | 'prices'>('kardex');
  const [products, setProducts] = useState<Product[]>([]);
  const [kardexList, setKardexList] = useState<KardexMovement[]>([]);
  const [priceHistoryList, setPriceHistoryList] = useState<PriceHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Kardex Form
  const [selectedProdId, setSelectedProdId] = useState<string>('');
  const [movementType, setMovementType] = useState<KardexMovementType>('merma_dano');
  const [location, setLocation] = useState<string>('Bodega Principal');
  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadAll = () => {
    const prods = getStoredProducts();
    setProducts(prods);
    if (!selectedProdId && prods.length > 0) {
      setSelectedProdId(prods[0].id);
    }
    setKardexList(getStoredKardex());
    setPriceHistoryList(getStoredPriceHistory());
  };

  useEffect(() => {
    loadAll();
  }, []);

  if (planTier < 3) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
          Módulo Nivel 3 (ERP Completo)
        </span>
        <h2 className="text-2xl font-extrabold text-deepSlate-900 mt-3 mb-2">
          Kardex Auditable, Mermas & Historial Global de Precios
        </h2>
        <p className="text-xs sm:text-sm text-deepSlate-500 mb-6">
          Activa el Nivel 3 para registrar ajustes de inventario por daños/averías, salidas a consignación multibodega y consultar la bitácora completa de cambios de costos y precios.
        </p>
        <button
          onClick={() => setSimulatedTier(3)}
          className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md"
        >
          Cambiar a Nivel 3 Ahora
        </button>
      </div>
    );
  }

  const handleRecordKardex = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === selectedProdId);
    const qtyNum = Math.max(1, parseInt(quantity, 10) || 1);
    if (!prod || !reason.trim()) return;

    const meta = MOVEMENT_LABELS[movementType];
    const delta = meta.isNegative ? -qtyNum : qtyNum;
    const stockBefore = prod.stock_current;
    const stockAfter = Math.max(0, stockBefore + delta);
    const nowIso = new Date().toISOString();

    const newMovement: KardexMovement = {
      id: `kdx-${Date.now()}`,
      tenant_id: tenant?.id || TENANT_STELLA_ID,
      product_id: prod.id,
      sku: prod.sku,
      product_name: prod.name || prod.sku,
      movement_type: movementType,
      location: location.trim() || 'Bodega Principal',
      quantity_delta: delta,
      stock_before: stockBefore,
      stock_after: stockAfter,
      unit_cost_usd: prod.landed_cost_usd || prod.base_cost_usd || 0,
      reason: reason.trim(),
      created_by_name: profile?.full_name || 'Dirección General',
      created_at: nowIso,
    };

    const updatedProducts = products.map((p) =>
      p.id === prod.id ? { ...p, stock_current: stockAfter, updated_at: nowIso } : p
    );

    const updatedKardex = [newMovement, ...kardexList];
    saveStoredProducts(updatedProducts);
    saveStoredKardex(updatedKardex);

    setProducts(updatedProducts);
    setKardexList(updatedKardex);
    setReason('');
    setQuantity('1');
    setSuccessMsg(
      `Movimiento de Kardex registrado para ${prod.sku}: Stock pasó de ${stockBefore} a ${stockAfter} uds.`
    );
  };

  const totalShrinkageUsd = kardexList
    .filter((k) => k.movement_type === 'merma_dano')
    .reduce((acc, k) => acc + Math.abs(k.quantity_delta) * k.unit_cost_usd, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900 tracking-tight">
              Kardex Auditable & Historial Global de Precios
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Nivel 3 ERP
            </span>
          </div>
          <p className="text-xs sm:text-sm text-deepSlate-500 mt-1">
            Control de mermas, averías, consignación en puntos aliados y huella inmutable de cambios de costos/precios.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-nacre-200 p-1.5 inline-flex gap-1 shadow-2xs">
          <button
            onClick={() => setActiveTab('kardex')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'kardex'
                ? 'bg-coral-500 text-white shadow-xs'
                : 'text-deepSlate-600 hover:bg-nacre-50'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Kardex & Mermas ({kardexList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('prices')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'prices'
                ? 'bg-coral-500 text-white shadow-xs'
                : 'text-deepSlate-600 hover:bg-nacre-50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Auditoría de Precios ({priceHistoryList.length})</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: KARDEX & SHRINKAGE                                            */}
      {/* ==================================================================== */}
      {activeTab === 'kardex' && (
        <div className="space-y-6">
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg(null)} className="underline">
                Ocultar
              </button>
            </div>
          )}

          {/* New Kardex Adjustment Card */}
          <form
            onSubmit={handleRecordKardex}
            className="bg-white rounded-3xl border border-nacre-200 p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-nacre-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-deepSlate-900">
                  Registrar Ajuste de Kardex / Movimiento de Bodega
                </h3>
                <p className="text-xs text-deepSlate-500">
                  Impacta inmediatamente las existencias del producto y contabiliza las mermas en el Estado de Resultados (P&L)
                </p>
              </div>
              {role !== 'seller' && (
                <div className="text-right font-mono text-xs">
                  <span className="text-deepSlate-400 block text-[10px] font-sans uppercase font-bold">
                    Impacto Acumulado Mermas:
                  </span>
                  <span className="font-extrabold text-rose-600">
                    -${totalShrinkageUsd.toFixed(2)} USD
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-deepSlate-600 mb-1">
                  Pieza / SKU *
                </label>
                <select
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-nacre-50 border border-nacre-200"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} ({p.stock_current} disp.) — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-deepSlate-600 mb-1">
                  Tipo de Movimiento *
                </label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as KardexMovementType)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-nacre-50 border border-nacre-200"
                >
                  {Object.entries(MOVEMENT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-deepSlate-600 mb-1">
                  Bodega / Punto Consignación
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-deepSlate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ej. Bodega Principal, Showroom..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-nacre-50 border border-nacre-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-deepSlate-600 mb-1">
                  Cantidad (Uds) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-nacre-50 border border-nacre-200"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                required
                placeholder="Motivo auditable obligatorio (ej. Pieza con broche dañado, traslado a exhibición aliada)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="flex-1 w-full px-3.5 py-2.5 text-xs rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500"
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 flex items-center justify-center space-x-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Guardar en Kardex</span>
              </button>
            </div>
          </form>

          {/* Kardex Movements Table */}
          <div className="bg-white rounded-3xl border border-nacre-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-nacre-100 border-b border-nacre-200 text-deepSlate-600 uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">SKU / Producto</th>
                    <th className="py-3 px-4">Tipo de Ajuste</th>
                    <th className="py-3 px-4">Ubicación / Bodega</th>
                    <th className="py-3 px-4 text-center">Variación Stock</th>
                    {role !== 'seller' && <th className="py-3 px-4 text-right">Impacto Costo ($)</th>}
                    <th className="py-3 px-4">Motivo / Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nacre-100">
                  {kardexList.map((k) => {
                    const meta = MOVEMENT_LABELS[k.movement_type];
                    return (
                      <tr key={k.id} className="hover:bg-nacre-50/60">
                        <td className="py-3 px-4 font-mono text-[11px] text-deepSlate-500">
                          {new Date(k.created_at).toLocaleDateString('es-NI')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-deepSlate-900 block">
                            {k.sku}
                          </span>
                          <span className="text-[11px] text-deepSlate-500">{k.product_name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta?.badgeColor}`}
                          >
                            {meta?.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-deepSlate-700">{k.location}</td>
                        <td className="py-3 px-4 text-center font-mono">
                          <span className="text-deepSlate-400">{k.stock_before}</span>
                          <ArrowRight className="w-3 h-3 inline mx-1 text-deepSlate-400" />
                          <strong className="text-deepSlate-900">{k.stock_after} uds</strong>
                          <span
                            className={`ml-1.5 font-bold ${
                              k.quantity_delta < 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            ({k.quantity_delta > 0 ? `+${k.quantity_delta}` : k.quantity_delta})
                          </span>
                        </td>
                        {role !== 'seller' && (
                          <td className="py-3 px-4 text-right font-mono font-bold text-deepSlate-800">
                            ${(Math.abs(k.quantity_delta) * k.unit_cost_usd).toFixed(2)}
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <span className="text-deepSlate-800 font-medium block">{k.reason}</span>
                          <span className="text-[10px] text-deepSlate-400">
                            Por: {k.created_by_name}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: GLOBAL PRICE HISTORY (`price_history`)                        */}
      {/* ==================================================================== */}
      {activeTab === 'prices' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-nacre-200 p-4 flex items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-deepSlate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar auditoría por SKU o motivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-nacre-50 border border-nacre-200"
              />
            </div>
            <span className="text-xs text-deepSlate-500 hidden sm:inline">
              Disparador automático activo al editar costos o precios en el catálogo
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-nacre-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-nacre-100 border-b border-nacre-200 text-deepSlate-600 uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4">SKU & Producto</th>
                    {role !== 'seller' && (
                      <th className="py-3 px-4 text-right">Cambio Costo ($ USD)</th>
                    )}
                    <th className="py-3 px-4 text-right">Cambio Precio ($ USD)</th>
                    <th className="py-3 px-4 text-right">Cambio Precio (C$)</th>
                    <th className="py-3 px-4">Motivo de Auditoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nacre-100 font-mono">
                  {priceHistoryList
                    .filter((ph) => {
                      const prod = products.find((p) => p.id === ph.product_id);
                      const target = `${prod?.sku || ''} ${prod?.name || ''} ${ph.reason || ''}`.toLowerCase();
                      return target.includes(searchQuery.toLowerCase());
                    })
                    .map((ph) => {
                      const prod = products.find((p) => p.id === ph.product_id);
                      return (
                        <tr key={ph.id} className="hover:bg-nacre-50/60">
                          <td className="py-3 px-4 text-[11px] text-deepSlate-500">
                            {new Date(ph.changed_at).toLocaleString('es-NI')}
                          </td>
                          <td className="py-3 px-4 font-sans">
                            <span className="font-mono font-bold text-deepSlate-900 block">
                              {prod?.sku || 'SKU'}
                            </span>
                            <span className="text-[11px] text-deepSlate-500">
                              {prod?.name || 'Producto'}
                            </span>
                          </td>
                          {role !== 'seller' && (
                            <td className="py-3 px-4 text-right">
                              <span className="text-deepSlate-400 line-through">
                                ${Number(ph.old_cost_usd || 0).toFixed(2)}
                              </span>
                              <ArrowRight className="w-3 h-3 inline mx-1 text-coral-500" />
                              <strong className="text-deepSlate-900">
                                ${Number(ph.new_cost_usd || 0).toFixed(2)}
                              </strong>
                            </td>
                          )}
                          <td className="py-3 px-4 text-right">
                            <span className="text-deepSlate-400 line-through">
                              ${Number(ph.old_price_usd || 0).toFixed(2)}
                            </span>
                            <ArrowRight className="w-3 h-3 inline mx-1 text-coral-500" />
                            <strong className="text-deepSlate-900">
                              ${Number(ph.new_price_usd || 0).toFixed(2)}
                            </strong>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-deepSlate-400 line-through">
                              C$ {Number(ph.old_price_nio || 0).toFixed(0)}
                            </span>
                            <ArrowRight className="w-3 h-3 inline mx-1 text-coral-500" />
                            <strong className="text-coral-600">
                              C$ {Number(ph.new_price_nio || 0).toFixed(0)}
                            </strong>
                          </td>
                          <td className="py-3 px-4 font-sans">
                            <span className="px-2.5 py-1 rounded-lg bg-nacre-100 text-deepSlate-700 font-semibold text-[11px]">
                              {ph.reason || 'Actualización de catálogo'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
