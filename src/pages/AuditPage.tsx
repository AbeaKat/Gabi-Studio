import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Lock,
  Plus,
  Search,
  CheckCircle2,
  MapPin,
  AlertTriangle,
  Store,
  RotateCcw,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  Product,
  PriceHistory,
  KardexMovement,
  KardexMovementType,
} from '../types';
import { PLAN_INFO, UPGRADE_COPY } from '../lib/navigation';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { fmtNio, fmtUsd } from '../components/inventory/inventoryHelpers';
import {
  getStoredProducts,
  saveStoredProducts,
  getStoredPriceHistory,
  getStoredKardex,
  saveStoredKardex,
  TENANT_STELLA_ID,
} from '../data/realInventoryData';

type TimelineFilter = 'all' | 'prices' | 'damaged' | 'loaned' | 'adjustment';

export const MOVEMENT_META: Record<
  KardexMovementType,
  {
    label: string;
    shortLabel: string;
    helper: string;
    isNegative: boolean;
    badgeColor: string;
    iconBg: string;
  }
> = {
  merma_dano: {
    label: 'Producto dañado o perdido',
    shortLabel: 'Producto dañado o perdido',
    helper: 'Resta piezas porque se rompieron, mancharon o extraviaron.',
    isNegative: true,
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
  },
  consignacion_salida: {
    label: 'Producto prestado a otra tienda',
    shortLabel: 'Producto prestado a otra tienda',
    helper: 'Resta piezas de tu tienda porque las dejaste en exhibición en otro local.',
    isNegative: true,
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    iconBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  consignacion_retorno: {
    label: 'Producto devuelto',
    shortLabel: 'Producto devuelto',
    helper: 'Suma piezas que regresaron a tu tienda desde otro local o de un cliente.',
    isNegative: false,
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  },
  ajuste_positivo: {
    label: 'Ajuste de inventario (entraron piezas)',
    shortLabel: 'Ajuste de inventario (+)',
    helper: 'Suma piezas cuando contaste tu mercadería y encontraste más de las que decía el sistema.',
    isNegative: false,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  ajuste_negativo: {
    label: 'Ajuste de inventario (faltaron piezas)',
    shortLabel: 'Ajuste de inventario (-)',
    helper: 'Resta piezas cuando contaste tu mercadería y había menos de las que decía el sistema.',
    isNegative: true,
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
  },
};

type TimelineEvent =
  | {
      kind: 'movement';
      id: string;
      timestamp: string;
      movement: KardexMovement;
    }
  | {
      kind: 'price';
      id: string;
      timestamp: string;
      priceHistory: PriceHistory;
      product?: Product;
    };

function formatDayHeader(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return 'Fecha reciente';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';

  const formatted = d.toLocaleDateString('es-NI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export const AuditPage: React.FC = () => {
  const { tenant, profile, planTier, role, setSimulatedTier } = useAuth();
  const isOwner = role !== 'seller';
  const exchangeRate = Number(tenant?.exchange_rate_nio || 36.62);

  const [products, setProducts] = useState<Product[]>([]);
  const [kardexList, setKardexList] = useState<KardexMovement[]>([]);
  const [priceHistoryList, setPriceHistoryList] = useState<PriceHistory[]>([]);

  const [filter, setFilter] = useState<TimelineFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Formulario para anotar un cambio
  const [selectedProdId, setSelectedProdId] = useState<string>('');
  const [movementType, setMovementType] = useState<KardexMovementType>('merma_dano');
  const [location, setLocation] = useState<string>('Mi tienda');
  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [movementToDelete, setMovementToDelete] = useState<KardexMovement | null>(null);

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
    const planInfo = PLAN_INFO[3];
    const upgradeInfo = UPGRADE_COPY[3];
    return (
      <div className="p-6 sm:p-8 max-w-xl mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto mb-4">
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
          onClick={() => setSimulatedTier(3)}
          className="min-h-[48px] px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md"
        >
          Probar el plan {planInfo.name} ahora
        </button>
      </div>
    );
  }

  const selectedProduct = products.find((p) => p.id === selectedProdId);
  const activeMeta = MOVEMENT_META[movementType];
  const parsedQty = Math.max(0, parseInt(quantity, 10) || 0);
  const previewStockAfter = selectedProduct
    ? Math.max(
        0,
        selectedProduct.stock_current + (activeMeta.isNegative ? -parsedQty : parsedQty)
      )
    : 0;

  const handleRecordKardex = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) {
      setFormError('Elige el producto que quieres actualizar.');
      return;
    }
    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setFormError('Escribe cuántas unidades son (debe ser 1 o más).');
      return;
    }
    if (!reason.trim()) {
      setFormError('Escribe una nota corta explicando qué pasó, por ejemplo: "Se rompió el broche".');
      return;
    }

    const meta = MOVEMENT_META[movementType];
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
      location: location.trim() || 'Mi tienda',
      quantity_delta: delta,
      stock_before: stockBefore,
      stock_after: stockAfter,
      unit_cost_usd: prod.landed_cost_usd || prod.base_cost_usd || 0,
      reason: reason.trim(),
      created_by_name: profile?.full_name || 'Dueño del negocio',
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
    setIsFormOpen(false);
    setSuccessMsg(
      `Guardado: ${meta.shortLabel} en "${prod.name || prod.sku}". Ahora quedan ${stockAfter} unidades.`
    );
  };

  const handleDeleteMovement = (mov: KardexMovement) => {
    const updatedKardex = kardexList.filter((k) => k.id !== mov.id);
    saveStoredKardex(updatedKardex);
    setKardexList(updatedKardex);
    setMovementToDelete(null);
    setSuccessMsg('Se borró el registro del historial.');
  };

  // Totales amigables
  const damagedCount = kardexList
    .filter((k) => k.movement_type === 'merma_dano')
    .reduce((acc, k) => acc + Math.abs(k.quantity_delta), 0);
  const totalShrinkageUsd = kardexList
    .filter((k) => k.movement_type === 'merma_dano')
    .reduce((acc, k) => acc + Math.abs(k.quantity_delta) * k.unit_cost_usd, 0);
  const loanedCount = kardexList
    .filter((k) => k.movement_type === 'consignacion_salida')
    .reduce((acc, k) => acc + Math.abs(k.quantity_delta), 0);

  // Construir línea de tiempo unificada y filtrada
  const timelineGroups = useMemo(() => {
    const productMap = new Map<string, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    const events: TimelineEvent[] = [];

    kardexList.forEach((m) => {
      events.push({
        kind: 'movement',
        id: `mov-${m.id}`,
        timestamp: m.created_at,
        movement: m,
      });
    });

    priceHistoryList.forEach((ph) => {
      const priceChanged = Math.abs((ph.old_price_nio || 0) - (ph.new_price_nio || 0)) >= 0.5;
      const costChanged = Math.abs((ph.old_cost_usd || 0) - (ph.new_cost_usd || 0)) >= 0.01;
      // Si es vendedor, nunca mostrar eventos que solo fueron de costo
      if (!isOwner && !priceChanged) return;
      if (!priceChanged && !costChanged) return;

      events.push({
        kind: 'price',
        id: `ph-${ph.id}`,
        timestamp: ph.changed_at,
        priceHistory: ph,
        product: productMap.get(ph.product_id),
      });
    });

    const q = searchQuery.trim().toLowerCase();

    const filtered = events.filter((ev) => {
      if (filter === 'prices' && ev.kind !== 'price') return false;
      if (filter === 'damaged' && (ev.kind !== 'movement' || ev.movement.movement_type !== 'merma_dano'))
        return false;
      if (
        filter === 'loaned' &&
        (ev.kind !== 'movement' ||
          (ev.movement.movement_type !== 'consignacion_salida' &&
            ev.movement.movement_type !== 'consignacion_retorno'))
      )
        return false;
      if (
        filter === 'adjustment' &&
        (ev.kind !== 'movement' ||
          (ev.movement.movement_type !== 'ajuste_positivo' &&
            ev.movement.movement_type !== 'ajuste_negativo'))
      )
        return false;

      if (q) {
        if (ev.kind === 'movement') {
          const m = ev.movement;
          const text = `${m.product_name} ${m.sku} ${m.reason} ${m.location} ${MOVEMENT_META[m.movement_type]?.label || ''}`.toLowerCase();
          return text.includes(q);
        } else {
          const pName = ev.product?.name || '';
          const pSku = ev.product?.sku || '';
          const text = `${pName} ${pSku} ${ev.priceHistory.reason || ''}`.toLowerCase();
          return text.includes(q);
        }
      }
      return true;
    });

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Agrupar por día
    const groups: { dayKey: string; dayLabel: string; items: TimelineEvent[] }[] = [];
    filtered.forEach((ev) => {
      const d = new Date(ev.timestamp);
      const dayKey = isNaN(d.getTime()) ? 'reciente' : d.toISOString().slice(0, 10);
      const existingGroup = groups.find((g) => g.dayKey === dayKey);
      if (existingGroup) {
        existingGroup.items.push(ev);
      } else {
        groups.push({
          dayKey,
          dayLabel: formatDayHeader(ev.timestamp),
          items: [ev],
        });
      }
    });

    return groups;
  }, [kardexList, priceHistoryList, products, filter, searchQuery, isOwner]);

  const filterChips: { key: TimelineFilter; label: string }[] = [
    { key: 'all', label: 'Todo el historial' },
    { key: 'prices', label: 'Cambios de precio' },
    { key: 'damaged', label: 'Producto dañado o perdido' },
    { key: 'loaned', label: 'Prestado o devuelto' },
    { key: 'adjustment', label: 'Ajuste de inventario' },
  ];

  const renderMovementPhrase = (m: KardexMovement) => {
    const qty = Math.abs(m.quantity_delta);
    const unitWord = qty === 1 ? 'unidad' : 'unidades';
    const name = m.product_name || m.sku;

    switch (m.movement_type) {
      case 'merma_dano':
        return (
          <>
            {qty === 1 ? 'Se dañó o perdió' : 'Se dañaron o perdieron'}{' '}
            <strong>
              {qty} {unitWord}
            </strong>{' '}
            de <strong>{name}</strong>
          </>
        );
      case 'consignacion_salida':
        return (
          <>
            Prestaste{' '}
            <strong>
              {qty} {unitWord}
            </strong>{' '}
            de <strong>{name}</strong> a otra tienda ({m.location})
          </>
        );
      case 'consignacion_retorno':
        return (
          <>
            Te devolvieron{' '}
            <strong>
              {qty} {unitWord}
            </strong>{' '}
            de <strong>{name}</strong> ({m.location})
          </>
        );
      case 'ajuste_positivo':
        return (
          <>
            Ajuste de inventario: sumaste{' '}
            <strong>
              {qty} {unitWord}
            </strong>{' '}
            a <strong>{name}</strong>
          </>
        );
      case 'ajuste_negativo':
        return (
          <>
            Ajuste de inventario: restaste{' '}
            <strong>
              {qty} {unitWord}
            </strong>{' '}
            de <strong>{name}</strong>
          </>
        );
    }
  };

  const renderMovementIcon = (type: KardexMovementType) => {
    switch (type) {
      case 'merma_dano':
        return <AlertTriangle className="w-5 h-5" />;
      case 'consignacion_salida':
        return <Store className="w-5 h-5" />;
      case 'consignacion_retorno':
        return <RotateCcw className="w-5 h-5" />;
      case 'ajuste_positivo':
      case 'ajuste_negativo':
        return <SlidersHorizontal className="w-5 h-5" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full min-w-0">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900 tracking-tight">
              Historial de cambios
            </h1>
            <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${PLAN_INFO[3].badgeColor}`}>
              Plan {PLAN_INFO[3].name}
            </span>
          </div>
          <p className="text-sm text-deepSlate-500 mt-1">
            Revisa día por día qué producto cambió de precio, se dañó o se prestó a otra tienda.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen((v) => !v)}
          className="w-full sm:w-auto min-h-[52px] inline-flex items-center justify-center gap-2 px-5 rounded-xl text-sm font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 active:scale-95 transition-all shrink-0 text-center"
        >
          {isFormOpen ? <X className="w-5 h-5 shrink-0" /> : <Plus className="w-5 h-5 shrink-0" />}
          <span>{isFormOpen ? 'Cerrar formulario' : 'Anotar cambio en inventario'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-sm font-bold underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-nacre-200 p-4">
          <span className="text-sm font-bold text-deepSlate-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" /> Producto dañado o perdido
          </span>
          <p className="text-2xl font-extrabold text-deepSlate-900 mt-1">
            {damagedCount} {damagedCount === 1 ? 'pieza' : 'piezas'}
          </p>
          {isOwner ? (
            <p className="text-sm text-rose-600 font-semibold">
              Equivale a {fmtNio(totalShrinkageUsd * exchangeRate, 0)} ({fmtUsd(totalShrinkageUsd)})
            </p>
          ) : (
            <p className="text-sm text-deepSlate-500">Registradas en el historial</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-nacre-200 p-4">
          <span className="text-sm font-bold text-deepSlate-500 flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-500" /> Prestado a otra tienda
          </span>
          <p className="text-2xl font-extrabold text-deepSlate-900 mt-1">
            {loanedCount} {loanedCount === 1 ? 'pieza' : 'piezas'}
          </p>
          <p className="text-sm text-deepSlate-500">En exhibición fuera de tu local</p>
        </div>

        <div className="bg-white rounded-2xl border border-nacre-200 p-4">
          <span className="text-sm font-bold text-deepSlate-500 flex items-center gap-2">
            <Tag className="w-4 h-4 text-coral-500" /> Cambios de precio
          </span>
          <p className="text-2xl font-extrabold text-deepSlate-900 mt-1">
            {priceHistoryList.length}
          </p>
          <p className="text-sm text-deepSlate-500">Guardados automáticamente</p>
        </div>
      </div>

      {/* Formulario amigable para anotar un movimiento de inventario */}
      {isFormOpen && (
        <form
          onSubmit={handleRecordKardex}
          noValidate
          className="bg-white rounded-3xl border-2 border-coral-300 p-5 sm:p-6 shadow-md space-y-5"
        >
          <div className="flex items-start justify-between gap-3 border-b border-nacre-200 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-deepSlate-900">
                Anotar un cambio en tus productos
              </h2>
              <p className="text-sm text-deepSlate-500">
                El sistema actualizará automáticamente cuántas piezas te quedan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="min-w-[44px] min-h-[44px] rounded-xl text-deepSlate-400 hover:bg-nacre-100 flex items-center justify-center"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Qué pasó */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-deepSlate-800">
              1. ¿Qué pasó con el producto?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {(Object.keys(MOVEMENT_META) as KardexMovementType[]).map((key) => {
                const m = MOVEMENT_META[key];
                const selected = movementType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMovementType(key)}
                    className={`min-h-[52px] p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                      selected
                        ? 'bg-coral-50/70 border-2 border-coral-500 shadow-2xs'
                        : 'bg-nacre-50/60 border-nacre-200 hover:bg-white'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${m.iconBg}`}>
                      {renderMovementIcon(key)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-deepSlate-900 leading-snug">
                        {m.label}
                      </p>
                      <p className="text-xs text-deepSlate-500 mt-0.5">{m.helper}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Producto, cantidad y lugar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-sm font-bold text-deepSlate-800 mb-1.5" htmlFor="kdx-prod">
                2. ¿Cuál producto?
              </label>
              <select
                id="kdx-prod"
                value={selectedProdId}
                onChange={(e) => setSelectedProdId(e.target.value)}
                className="w-full min-h-[48px] px-3 text-sm font-semibold rounded-xl bg-nacre-50 border border-nacre-200 text-deepSlate-900 focus:outline-none focus:border-coral-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.sku} ({p.stock_current} disp.)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-deepSlate-800 mb-1.5" htmlFor="kdx-qty">
                3. ¿Cuántas unidades?
              </label>
              <input
                id="kdx-qty"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full min-h-[48px] px-4 text-base font-extrabold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-deepSlate-800 mb-1.5" htmlFor="kdx-loc">
                4. ¿En qué lugar o tienda?
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-deepSlate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="kdx-loc"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej. Mi tienda, Tienda aliada..."
                  className="w-full min-h-[48px] pl-10 pr-3 text-sm rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500"
                />
              </div>
            </div>
          </div>

          {/* 5. Nota y vista previa */}
          <div>
            <label className="block text-sm font-bold text-deepSlate-800 mb-1.5" htmlFor="kdx-reason">
              5. Nota corta (¿por qué pasó?)
            </label>
            <input
              id="kdx-reason"
              type="text"
              placeholder="Ej. Venía con el broche quebrado, se llevó a exhibición en tienda aliada..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full min-h-[48px] px-4 text-sm rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500"
            />
          </div>

          {selectedProduct && (
            <div className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-sm text-deepSlate-700">
                <span>Así quedará tu inventario de </span>
                <strong className="text-deepSlate-900">{selectedProduct.name || selectedProduct.sku}</strong>
                <span>: tenías </span>
                <strong>{selectedProduct.stock_current}</strong>
                <span> → quedarán </span>
                <strong className="text-coral-600 text-base">{previewStockAfter} unidades</strong>.
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="min-h-[48px] px-4 rounded-xl text-sm font-bold text-deepSlate-700 bg-white border border-nacre-200 hover:bg-nacre-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] px-6 rounded-xl text-sm font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/20"
                >
                  Guardar cambio
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Buscador y filtros por tipo */}
      <div className="bg-white rounded-2xl border border-nacre-200 p-4 space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-deepSlate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            aria-label="Buscar en el historial"
            placeholder="Buscar por nombre del producto, código o nota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[48px] pl-12 pr-10 text-sm rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-deepSlate-400 hover:text-deepSlate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={`min-h-[44px] px-4 rounded-full text-sm font-bold border transition-colors ${
                filter === chip.key
                  ? 'bg-coral-500 text-white border-coral-500'
                  : 'bg-white text-deepSlate-700 border-nacre-200 hover:bg-nacre-100'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Línea de tiempo agrupada por día */}
      {timelineGroups.length === 0 ? (
        <div className="bg-white rounded-3xl border border-nacre-200 p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-nacre-100 text-deepSlate-500 flex items-center justify-center mx-auto">
            <History className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold text-deepSlate-900">
            No encontramos movimientos con ese filtro
          </h3>
          <p className="text-sm text-deepSlate-500 max-w-md mx-auto">
            Prueba cambiando el filtro de arriba o anota un cambio usando el botón "Anotar cambio en inventario".
          </p>
          {(filter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setSearchQuery('');
              }}
              className="min-h-[44px] px-5 rounded-xl text-sm font-bold text-coral-700 bg-coral-50 border border-coral-200"
            >
              Ver todo el historial
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {timelineGroups.map((group) => (
            <div key={group.dayKey} className="space-y-3">
              {/* Encabezado del día */}
              <div className="flex items-center gap-2 px-1">
                <Calendar className="w-4 h-4 text-coral-500" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-deepSlate-600">
                  {group.dayLabel}
                </h3>
                <span className="flex-1 h-px bg-nacre-200" />
              </div>

              {/* Eventos de ese día */}
              <div className="space-y-3">
                {group.items.map((ev) => {
                  if (ev.kind === 'movement') {
                    const m = ev.movement;
                    const meta = MOVEMENT_META[m.movement_type];
                    const lossUsd = Math.abs(m.quantity_delta) * (m.unit_cost_usd || 0);
                    const lossNio = lossUsd * exchangeRate;
                    return (
                      <div
                        key={ev.id}
                        className="bg-white rounded-2xl border border-nacre-200 p-4 sm:p-5 flex items-start justify-between gap-4 hover:border-nacre-300 transition-all"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${meta.iconBg}`}
                          >
                            {renderMovementIcon(m.movement_type)}
                          </div>
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.badgeColor}`}
                              >
                                {meta.shortLabel}
                              </span>
                              <span className="text-xs text-deepSlate-400">
                                Código {m.sku}
                              </span>
                            </div>

                            <p className="text-base text-deepSlate-900 leading-snug">
                              {renderMovementPhrase(m)}
                            </p>

                            <p className="text-sm text-deepSlate-600">
                              Nota: <span className="font-semibold text-deepSlate-800">“{m.reason}”</span>
                            </p>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-deepSlate-500 pt-0.5">
                              <span>
                                Existencia: tenías <strong>{m.stock_before}</strong> → quedaron{' '}
                                <strong>{m.stock_after} piezas</strong>
                              </span>
                              <span>Lugar: {m.location}</span>
                              <span>Anotado por: {m.created_by_name}</span>
                              {isOwner && m.movement_type === 'merma_dano' && lossUsd > 0 && (
                                <span className="text-rose-600 font-bold">
                                  Valor del producto: {fmtNio(lossNio, 0)} ({fmtUsd(lossUsd)})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => setMovementToDelete(m)}
                            aria-label="Borrar este registro"
                            title="Borrar este registro"
                            className="min-w-[44px] min-h-[44px] rounded-xl text-deepSlate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  } else {
                    const ph = ev.priceHistory;
                    const prodName = ev.product?.name || ev.product?.sku || 'Producto';
                    const prodSku = ev.product?.sku || '';
                    const priceChanged =
                      Math.abs((ph.old_price_nio || 0) - (ph.new_price_nio || 0)) >= 0.5;
                    const costChanged =
                      isOwner && Math.abs((ph.old_cost_usd || 0) - (ph.new_cost_usd || 0)) >= 0.01;

                    return (
                      <div
                        key={ev.id}
                        className="bg-white rounded-2xl border border-nacre-200 p-4 sm:p-5 flex items-start gap-3.5 hover:border-nacre-300 transition-all"
                      >
                        <div className="w-11 h-11 rounded-2xl border bg-coral-50 text-coral-600 border-coral-200 flex items-center justify-center shrink-0">
                          <Tag className="w-5 h-5" />
                        </div>
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border bg-coral-50 text-coral-700 border-coral-200">
                              Cambio de precio
                            </span>
                            {prodSku && (
                              <span className="text-xs text-deepSlate-400">Código {prodSku}</span>
                            )}
                          </div>

                          {priceChanged ? (
                            <p className="text-base text-deepSlate-900 leading-snug">
                              Cambiaste el precio de <strong>{prodName}</strong> de{' '}
                              <span className="line-through text-deepSlate-400">
                                {fmtNio(ph.old_price_nio, 0)}
                              </span>{' '}
                              a{' '}
                              <strong className="text-coral-600">
                                {fmtNio(ph.new_price_nio, 0)}
                              </strong>{' '}
                              <span className="text-sm text-deepSlate-500">
                                ({fmtUsd(ph.new_price_usd)})
                              </span>
                            </p>
                          ) : (
                            costChanged && (
                              <p className="text-base text-deepSlate-900 leading-snug">
                                Actualizaste cuánto te cuesta <strong>{prodName}</strong> de{' '}
                                <span className="line-through text-deepSlate-400">
                                  {fmtNio(ph.old_cost_usd * exchangeRate)} ({fmtUsd(ph.old_cost_usd)})
                                </span>{' '}
                                a{' '}
                                <strong className="text-deepSlate-900">
                                  {fmtNio(ph.new_cost_usd * exchangeRate)} ({fmtUsd(ph.new_cost_usd)})
                                </strong>
                              </p>
                            )
                          )}

                          {priceChanged && costChanged && (
                            <p className="text-sm text-deepSlate-600">
                              También cambió lo que te cuesta: de {fmtUsd(ph.old_cost_usd)} a{' '}
                              <strong>{fmtUsd(ph.new_cost_usd)}</strong>.
                            </p>
                          )}

                          {ph.reason && (
                            <p className="text-sm text-deepSlate-500">
                              Motivo: <span className="font-medium text-deepSlate-700">{ph.reason}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!movementToDelete}
        title="¿Borrar este registro del historial?"
        message={
          <>
            Vas a quitar del historial el registro de{' '}
            <strong>{movementToDelete?.product_name}</strong> (“{movementToDelete?.reason}”).
          </>
        }
        confirmLabel="Sí, borrar registro"
        cancelLabel="No, volver"
        onCancel={() => setMovementToDelete(null)}
        onConfirm={() => {
          if (movementToDelete) handleDeleteMovement(movementToDelete);
        }}
      />
    </div>
  );
};
