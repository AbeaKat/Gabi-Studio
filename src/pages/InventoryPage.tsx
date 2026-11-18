import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Plus, Upload, Download, Search, Loader2, Package, AlertTriangle, Coins, X, PiggyBank } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Product, Batch, PriceHistory } from '../types';
import { InventoryTable } from '../components/inventory/InventoryTable';
import { NewProductModal } from '../components/inventory/NewProductModal';
import { ImportCatalogModal } from '../components/inventory/ImportCatalogModal';
import { PriceHistoryModal } from '../components/inventory/PriceHistoryModal';
import { getStockStatus, fmtNio, profitPerPiece, productCostUsd } from '../components/inventory/inventoryHelpers';
import {
  getStoredProducts,
  saveStoredProducts,
  getStoredBatches,
  saveStoredBatches,
  getStoredPriceHistory,
  saveStoredPriceHistory,
  ensureRealInventorySeeded,
  TENANT_STELLA_ID,
} from '../data/realInventoryData';

type QuickFilter = 'all' | 'low' | 'out';
type SortKey = 'name' | 'stock' | 'price' | 'profit';

const normalize = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const InventoryPage: React.FC = () => {
  const { tenant, role } = useAuth();
  const exchangeRate = Number(tenant?.exchange_rate_nio || 36.62);
  const isOwner = role !== 'seller';

  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('');

  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadData();
  }, [tenant?.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      ensureRealInventorySeeded();
      setProducts(getStoredProducts());
      setBatches(getStoredBatches());
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>, reason?: string) => {
    const existing = products.find((p) => p.id === id);
    if (!existing) return;

    const oldCost = existing.landed_cost_usd || existing.base_cost_usd;
    const oldPriceUsd = existing.price_usd;
    const oldPriceNio = existing.price_nio;

    const updatedProduct = { ...existing, ...updates, updated_at: new Date().toISOString() };

    const newProducts = products.map((p) => (p.id === id ? updatedProduct : p));
    setProducts(newProducts);
    saveStoredProducts(newProducts);

    // Record in Price History if cost or price changed
    const costChanged = updates.base_cost_usd !== undefined || updates.landed_cost_usd !== undefined;
    const priceChanged = updates.price_usd !== undefined || updates.price_nio !== undefined;

    if (costChanged || priceChanged) {
      const newHistoryItem: PriceHistory = {
        id: `ph-${Date.now()}`,
        tenant_id: existing.tenant_id,
        product_id: id,
        old_cost_usd: oldCost,
        new_cost_usd: updates.landed_cost_usd ?? updates.base_cost_usd ?? oldCost,
        old_price_usd: oldPriceUsd,
        new_price_usd: updates.price_usd ?? oldPriceUsd,
        old_price_nio: oldPriceNio,
        new_price_nio: updates.price_nio ?? oldPriceNio,
        reason: reason || 'Edición en línea de catálogo',
        changed_at: new Date().toISOString(),
      };
      saveStoredPriceHistory([newHistoryItem, ...getStoredPriceHistory()]);
    }

    try {
      await supabase.from('products').update(updates).eq('id', id);
    } catch (err) {
      // Local demo fallback
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const newProducts = products.filter((p) => p.id !== id);
    setProducts(newProducts);
    saveStoredProducts(newProducts);

    try {
      await supabase.from('products').delete().eq('id', id);
    } catch (err) {
      // Local demo fallback
    }
  };

  const handleCreateProduct = async (productData: Partial<Product>) => {
    const newProduct: Product = {
      id: crypto.randomUUID ? crypto.randomUUID() : `prod-${Date.now()}`,
      tenant_id: tenant?.id || TENANT_STELLA_ID,
      sku: productData.sku || '',
      name: productData.name || '',
      batch_id: productData.batch_id || null,
      stock_current: productData.stock_current ?? 1,
      base_cost_usd: productData.base_cost_usd ?? 0,
      landed_cost_usd: productData.landed_cost_usd ?? productData.base_cost_usd ?? 0,
      price_usd: productData.price_usd ?? 0,
      price_nio: productData.price_nio ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newProducts = [newProduct, ...products];
    setProducts(newProducts);
    saveStoredProducts(newProducts);

    try {
      await supabase.from('products').insert(newProduct);
    } catch (err) {
      // Local demo fallback
    }
  };

  const handleImportSuccess = async (
    importedProducts: (Partial<Product> & { batchName?: string })[],
    newBatchNames: string[]
  ) => {
    const updatedBatches = [...batches];

    for (const bName of newBatchNames) {
      const createdBatch: Batch = {
        id: crypto.randomUUID ? crypto.randomUUID() : `batch-${Date.now()}-${Math.random()}`,
        tenant_id: tenant?.id || TENANT_STELLA_ID,
        name: bName,
        shipping_cost_usd: 0,
        amazon_fee_usd: 0,
        dhl_tax_usd: 0,
        total_batch_investment_usd: 0,
      };
      updatedBatches.push(createdBatch);
    }
    setBatches(updatedBatches);
    saveStoredBatches(updatedBatches);

    const batchMap = new Map<string, string>();
    updatedBatches.forEach((b) => batchMap.set(b.name.toLowerCase(), b.id));

    const existingMap = new Map<string, Product>();
    products.forEach((p) => existingMap.set(p.sku.trim().toUpperCase(), p));

    const newProductsToPrepend: Product[] = [];
    const updatedExistingIds = new Map<string, Product>();
    const newPriceHistoryEntries: PriceHistory[] = [];
    const nowIso = new Date().toISOString();

    importedProducts.forEach((p) => {
      const rawSku = (p.sku || '').trim();
      const upperSku = rawSku.toUpperCase();
      const bId = p.batchName ? batchMap.get(p.batchName.toLowerCase()) : batches[0]?.id || null;
      const existing = existingMap.get(upperSku);

      if (existing) {
        const oldCost = existing.landed_cost_usd || existing.base_cost_usd || 0;
        const newBaseCost = p.base_cost_usd ?? existing.base_cost_usd;
        const newLandedCost = p.landed_cost_usd ?? p.base_cost_usd ?? existing.landed_cost_usd;
        const newPriceUsd = p.price_usd ?? existing.price_usd;
        const newPriceNio =
          p.price_nio ??
          Math.round(newPriceUsd * exchangeRate * 100) / 100;

        const updatedProd: Product = {
          ...existing,
          name: p.name || existing.name,
          batch_id: bId || p.batch_id || existing.batch_id,
          stock_current: p.stock_current ?? existing.stock_current,
          base_cost_usd: newBaseCost,
          landed_cost_usd: newLandedCost,
          price_usd: newPriceUsd,
          price_nio: newPriceNio,
          updated_at: nowIso,
        };
        updatedExistingIds.set(existing.id, updatedProd);

        if (
          Math.abs(newLandedCost - oldCost) > 0.001 ||
          Math.abs(newPriceUsd - existing.price_usd) > 0.001 ||
          Math.abs(newPriceNio - existing.price_nio) > 0.01
        ) {
          newPriceHistoryEntries.push({
            id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            tenant_id: existing.tenant_id,
            product_id: existing.id,
            old_cost_usd: oldCost,
            new_cost_usd: newLandedCost,
            old_price_usd: existing.price_usd,
            new_price_usd: newPriceUsd,
            old_price_nio: existing.price_nio,
            new_price_nio: newPriceNio,
            reason: 'Actualización por Importación Excel (Upsert)',
            changed_at: nowIso,
          });
        }
      } else {
        newProductsToPrepend.push({
          id: crypto.randomUUID ? crypto.randomUUID() : `prod-${Date.now()}-${Math.random()}`,
          tenant_id: tenant?.id || TENANT_STELLA_ID,
          sku: rawSku,
          name: p.name || `Producto ${rawSku}`,
          batch_id: bId || p.batch_id || null,
          stock_current: p.stock_current ?? 1,
          base_cost_usd: p.base_cost_usd ?? 0,
          landed_cost_usd: p.landed_cost_usd ?? p.base_cost_usd ?? 0,
          price_usd: p.price_usd ?? 0,
          price_nio: p.price_nio ?? Math.round((p.price_usd ?? 0) * exchangeRate * 100) / 100,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }
    });

    const mergedExisting = products.map((p) => updatedExistingIds.get(p.id) || p);
    const combined = [...newProductsToPrepend, ...mergedExisting];
    setProducts(combined);
    saveStoredProducts(combined);

    if (newPriceHistoryEntries.length > 0) {
      saveStoredPriceHistory([...newPriceHistoryEntries, ...getStoredPriceHistory()]);
    }
  };

  const handleExportExcel = () => {
    const exportData = products.map((p) => {
      const row: Record<string, any> = {
        Producto: p.name,
        Código: p.sku,
        'Cuánto queda': p.stock_current,
      };
      if (isOwner) {
        const { costNio, profit } = profitPerPiece(p, exchangeRate);
        row['Te costó (C$)'] = Math.round(costNio * 100) / 100;
        row['Ganas por pieza (C$)'] = Math.round(profit * 100) / 100;
      }
      row['Precio (C$)'] = p.price_nio;
      row['Precio (US$)'] = p.price_usd;
      return row;
    });

    const safeName = (tenant?.name || 'Mi_Negocio').replace(/[^a-zA-Z0-9_-]/g, '_');
    const date = new Date().toISOString().slice(0, 10);
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mis productos');
    XLSX.writeFile(wb, `Productos_${safeName}_${date}.xlsx`);
  };

  // Conteos y totales
  const lowCount = products.filter((p) => getStockStatus(p.stock_current) === 'low').length;
  const outCount = products.filter((p) => getStockStatus(p.stock_current) === 'out').length;
  const totalUnits = products.reduce((a, p) => a + (p.stock_current || 0), 0);
  const stockCostNio = products.reduce(
    (a, p) => a + (p.stock_current || 0) * productCostUsd(p) * exchangeRate,
    0
  );
  const stockSaleNio = products.reduce((a, p) => a + (p.stock_current || 0) * (p.price_nio || 0), 0);

  const filtered = useMemo(() => {
    const q = normalize(searchQuery.trim());
    const list = products.filter((p) => {
      if (q && !normalize(p.name || '').includes(q) && !normalize(p.sku).includes(q)) return false;
      if (quickFilter === 'out' && getStockStatus(p.stock_current) !== 'out') return false;
      if (quickFilter === 'low' && getStockStatus(p.stock_current) === 'ok') return false;
      if (selectedBatchFilter && p.batch_id !== selectedBatchFilter) return false;
      return true;
    });
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case 'stock':
          return a.stock_current - b.stock_current;
        case 'price':
          return (b.price_nio || 0) - (a.price_nio || 0);
        case 'profit':
          return profitPerPiece(b, exchangeRate).profit - profitPerPiece(a, exchangeRate).profit;
        default:
          return (a.name || a.sku).localeCompare(b.name || b.sku, 'es');
      }
    });
    return sorted;
  }, [products, searchQuery, quickFilter, sortKey, selectedBatchFilter, exchangeRate]);

  const hasActiveFilter = !!searchQuery || quickFilter !== 'all' || !!selectedBatchFilter;
  const clearFilters = () => {
    setSearchQuery('');
    setQuickFilter('all');
    setSelectedBatchFilter('');
  };

  const chips: { key: QuickFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: products.length },
    { key: 'low', label: 'Se acaban', count: lowCount + outCount },
    { key: 'out', label: 'Agotados', count: outCount },
  ];

  const btnSecondary =
    'min-h-[48px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-nacre-100 text-deepSlate-700 border border-nacre-200 text-center';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-6xl mx-auto w-full min-w-0">
      {/* Título y acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900 tracking-tight">Mis productos</h1>
          <p className="text-sm text-deepSlate-500 mt-1">
            Lo que tienes y cuánto queda. Toca un precio o una cantidad para cambiarlo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setIsNewProductOpen(true)}
            className="min-h-[50px] inline-flex items-center justify-center gap-2 px-5 rounded-xl text-sm sm:text-base font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 active:scale-95 transition-all w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 stroke-[2.5] shrink-0" />
            <span>Agregar producto</span>
          </button>
          <button onClick={() => setIsImportModalOpen(true)} className={btnSecondary}>
            <Upload className="w-4 h-4 text-coral-500 shrink-0" />
            <span>Subir lista de Excel</span>
          </button>
          <button onClick={handleExportExcel} className={btnSecondary} disabled={products.length === 0}>
            <Download className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Descargar</span>
          </button>
        </div>
      </div>

      {/* Resumen */}
      {products.length > 0 && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOwner ? 'xl:grid-cols-4' : 'lg:grid-cols-3'} gap-3`}>
          <div className="bg-white rounded-2xl border border-nacre-200 p-4 min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold text-deepSlate-500">
              <Package className="w-4 h-4 text-coral-500 shrink-0" /> <span>Tienes</span>
            </div>
            <p className="text-2xl font-extrabold text-deepSlate-900 mt-1 break-words">{totalUnits.toLocaleString('es-NI')}</p>
            <p className="text-sm text-deepSlate-500">piezas en {products.length} productos</p>
          </div>
          <button
            onClick={() => setQuickFilter(outCount > 0 ? 'out' : 'low')}
            className="bg-white rounded-2xl border border-nacre-200 p-4 text-left hover:border-amber-300 min-w-0"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-deepSlate-500">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> <span>Necesitan atención</span>
            </div>
            <p className="text-2xl font-extrabold text-deepSlate-900 mt-1">{lowCount + outCount}</p>
            <p className="text-sm text-deepSlate-500">
              {outCount} agotados · {lowCount} con pocos
            </p>
          </button>
          <div className="bg-white rounded-2xl border border-nacre-200 p-4 min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold text-deepSlate-500">
              <Coins className="w-4 h-4 text-coral-500 shrink-0" /> <span>Si vendes todo</span>
            </div>
            <p className="text-2xl font-extrabold text-coral-600 mt-1 break-words">{fmtNio(stockSaleNio, 0)}</p>
            <p className="text-sm text-deepSlate-500">a los precios de hoy</p>
          </div>
          {isOwner && (
            <div className="bg-white rounded-2xl border border-nacre-200 p-4 min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-deepSlate-500">
                <PiggyBank className="w-4 h-4 text-emerald-600 shrink-0" /> <span>Invertido en mercadería</span>
              </div>
              <p className="text-2xl font-extrabold text-deepSlate-900 mt-1 break-words">{fmtNio(stockCostNio, 0)}</p>
              <p className="text-sm text-deepSlate-500">
                Ganarías {fmtNio(stockSaleNio - stockCostNio, 0)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Buscar, filtros y orden */}
      {products.length > 0 && (
        <div className="bg-white rounded-2xl border border-nacre-200 p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-deepSlate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                aria-label="Buscar producto"
                placeholder="Buscar producto por nombre o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[48px] pl-12 pr-11 text-base rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Borrar búsqueda"
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-deepSlate-400 hover:text-deepSlate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              aria-label="Ordenar"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="min-h-[48px] px-3 text-sm font-semibold rounded-xl bg-nacre-50 border border-nacre-200 text-deepSlate-800"
            >
              <option value="name">Ordenar: nombre (A-Z)</option>
              <option value="stock">Ordenar: los que menos quedan</option>
              <option value="price">Ordenar: precio más alto</option>
              {isOwner && <option value="profit">Ordenar: los que más ganan</option>}
            </select>
            {batches.length > 1 && (
              <select
                aria-label="Filtrar por grupo"
                value={selectedBatchFilter}
                onChange={(e) => setSelectedBatchFilter(e.target.value)}
                className="min-h-[48px] px-3 text-sm font-semibold rounded-xl bg-nacre-50 border border-nacre-200 text-deepSlate-800 sm:max-w-[200px]"
              >
                <option value="">Todos los grupos</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => setQuickFilter(c.key)}
                aria-pressed={quickFilter === c.key}
                className={`min-h-[44px] px-4 rounded-full text-sm font-bold border transition-colors ${
                  quickFilter === c.key
                    ? 'bg-coral-500 text-white border-coral-500'
                    : 'bg-white text-deepSlate-700 border-nacre-200 hover:bg-nacre-100'
                }`}
              >
                {c.label} <span className="opacity-75">({c.count})</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-deepSlate-500" aria-live="polite">
            Mostrando {filtered.length} de {products.length} productos
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-coral-500 animate-spin" />
          <span className="text-sm font-bold text-deepSlate-500">Cargando tus productos...</span>
        </div>
      ) : (
        <InventoryTable
          products={filtered}
          totalProducts={products.length}
          exchangeRate={exchangeRate}
          role={role}
          hasActiveFilter={hasActiveFilter}
          onClearFilters={clearFilters}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onAddProduct={() => setIsNewProductOpen(true)}
          onImport={() => setIsImportModalOpen(true)}
          onOpenPriceHistory={(prod) => setSelectedHistoryProduct(prod)}
        />
      )}

      <NewProductModal
        isOpen={isNewProductOpen}
        onClose={() => setIsNewProductOpen(false)}
        onSave={handleCreateProduct}
        batches={batches}
        exchangeRate={exchangeRate}
        role={role}
        existingNames={products.map((p) => p.name || '')}
      />

      <ImportCatalogModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
        batches={batches}
        existingProducts={products}
        exchangeRate={exchangeRate}
        role={role}
      />

      <PriceHistoryModal
        isOpen={!!selectedHistoryProduct}
        onClose={() => setSelectedHistoryProduct(null)}
        product={selectedHistoryProduct}
        role={role}
        exchangeRate={exchangeRate}
      />
    </div>
  );
};
