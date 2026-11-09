import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Package,
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  Layers,
  TrendingUp,
  DollarSign,
  Coins,
  ShieldCheck,
  RefreshCw,
  Loader2,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Product, Batch, PriceHistory } from '../types';
import { InventoryTable } from '../components/inventory/InventoryTable';
import { NewProductModal } from '../components/inventory/NewProductModal';
import { NewBatchModal } from '../components/inventory/NewBatchModal';
import { ImportCatalogModal } from '../components/inventory/ImportCatalogModal';
import { PriceHistoryModal } from '../components/inventory/PriceHistoryModal';
import { QuickSaleModal } from '../components/sales/QuickSaleModal';
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

export const InventoryPage: React.FC = () => {
  const { tenant, planTier, role } = useAuth();
  const exchangeRate = Number(tenant?.exchange_rate_nio || 36.62);

  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('');

  // Modals
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [newProductBatchId, setNewProductBatchId] = useState<string | undefined>(undefined);
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<Product | null>(null);
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);

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

  const handleCreateBatch = async (batchName: string) => {
    const newBatch: Batch = {
      id: crypto.randomUUID ? crypto.randomUUID() : `batch-${Date.now()}`,
      tenant_id: tenant?.id || TENANT_STELLA_ID,
      name: batchName,
      shipping_cost_usd: 0,
      amazon_fee_usd: 0,
      dhl_tax_usd: 0,
      total_batch_investment_usd: 0,
    };

    const newBatches = [...batches, newBatch];
    setBatches(newBatches);
    saveStoredBatches(newBatches);

    try {
      await supabase.from('batches').insert(newBatch);
    } catch (err) {
      // Local demo fallback
    }
  };

  const handleImportSuccess = async (importedProducts: Partial<Product>[], newBatchNames: string[]) => {
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

    const readyProducts: Product[] = importedProducts.map((p: any) => {
      const bId = p.batchName ? batchMap.get(p.batchName.toLowerCase()) : batches[0]?.id || null;
      return {
        id: crypto.randomUUID ? crypto.randomUUID() : `prod-${Date.now()}-${Math.random()}`,
        tenant_id: tenant?.id || TENANT_STELLA_ID,
        sku: p.sku,
        name: p.name,
        batch_id: bId || p.batch_id || null,
        stock_current: p.stock_current ?? 1,
        base_cost_usd: p.base_cost_usd ?? 0,
        landed_cost_usd: p.landed_cost_usd ?? p.base_cost_usd ?? 0,
        price_usd: p.price_usd ?? 0,
        price_nio: p.price_nio ?? Math.round((p.price_usd ?? 0) * exchangeRate * 100) / 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    const combined = [...readyProducts, ...products];
    setProducts(combined);
    saveStoredProducts(combined);
  };

  const handleExportExcel = () => {
    const exportData = products.map((p) => {
      const b = batches.find((item) => item.id === p.batch_id);
      const row: Record<string, any> = {
        SKU: p.sku,
        Producto: p.name,
        'Categoría/Lote': b?.name || 'General',
        'Stock Actual': p.stock_current,
      };

      if (role !== 'seller') {
        row['Costo Base USD ($)'] = p.base_cost_usd;
        row['Costo Landed USD ($)'] = p.landed_cost_usd || p.base_cost_usd;
      }

      row['Precio USD ($)'] = p.price_usd;
      row['Precio Córdobas (C$)'] = p.price_nio;

      if (role !== 'seller') {
        const cost = p.landed_cost_usd || p.base_cost_usd || 0;
        const margin = p.price_usd > 0 ? ((p.price_usd - cost) / p.price_usd) * 100 : 0;
        row['Margen Bruto (%)'] = `${margin.toFixed(1)}%`;
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario_Stella_Georgina');
    XLSX.writeFile(wb, `Inventario_StellaGeorgina_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // High-level KPI metrics
  const totalSkus = products.length;
  const totalUnits = products.reduce((acc, curr) => acc + (curr.stock_current || 0), 0);
  const totalStockCostUsd = products.reduce(
    (acc, curr) => acc + (curr.stock_current || 0) * (curr.landed_cost_usd || curr.base_cost_usd || 0),
    0
  );
  const totalProjectedRevenueUsd = products.reduce(
    (acc, curr) => acc + (curr.stock_current || 0) * (curr.price_usd || 0),
    0
  );
  const totalProjectedRevenueNio = products.reduce(
    (acc, curr) => acc + (curr.stock_current || 0) * (curr.price_nio || 0),
    0
  );
  const globalMarginPercent =
    totalProjectedRevenueUsd > 0
      ? ((totalProjectedRevenueUsd - totalStockCostUsd) / totalProjectedRevenueUsd) * 100
      : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900 tracking-tight">
              Catálogo e Inventario
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-coral-50 text-coral-600 border border-coral-200">
              {totalSkus} SKUs • {totalUnits} piezas
            </span>
          </div>
          <p className="text-xs sm:text-sm text-deepSlate-500 mt-1">
            Inventario real cargado: <strong>1. Línea Wayuu</strong>, <strong>2. Edición Stella</strong>, <strong>3. Georgina Lote 3</strong> y <strong>4. Georgina Lote 4</strong>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          <button
            onClick={() => setIsQuickSaleOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-2xs transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>+ Venta Rápida (1 a 1)</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-nacre-100 text-deepSlate-700 border border-nacre-200 shadow-2xs transition-all"
            title="Importar archivo Excel o CSV"
          >
            <Upload className="w-4 h-4 text-coral-500" />
            <span>Importar Excel/CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-nacre-100 text-deepSlate-700 border border-nacre-200 shadow-2xs transition-all"
            title="Descargar inventario en Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportar</span>
          </button>

          {role !== 'seller' && (
            <button
              onClick={() => setIsNewBatchOpen(true)}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-nacre-100 text-deepSlate-700 border border-nacre-200 shadow-2xs transition-all"
            >
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Nuevo Lote</span>
            </button>
          )}

          <button
            onClick={() => {
              setNewProductBatchId(undefined);
              setIsNewProductOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuevo Producto</span>
          </button>

        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* SKUs & Pieces */}
        <div className="bg-white rounded-2xl border border-nacre-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-deepSlate-400">
              Total de Piezas
            </span>
            <Package className="w-4 h-4 text-coral-500" />
          </div>
          <p className="text-2xl font-mono font-extrabold text-deepSlate-900">
            {totalUnits.toLocaleString()} <span className="text-xs font-sans font-normal text-deepSlate-500">uds</span>
          </p>
          <span className="text-[11px] text-deepSlate-500 mt-0.5 block">
            en {totalSkus} referencias reales
          </span>
        </div>

        {/* Stock Value at Cost (Only if Owner) */}
        {role !== 'seller' ? (
          <div className="bg-white rounded-2xl border border-nacre-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-deepSlate-400">
                Capital a Costo Landed
              </span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-mono font-extrabold text-deepSlate-900">
              ${totalStockCostUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-deepSlate-500 mt-0.5 block font-mono">
              Inversión activa en mercadería
            </span>
          </div>
        ) : (
          <div className="bg-nacre-100 rounded-2xl border border-nacre-200 p-4 shadow-2xs flex flex-col justify-center">
            <div className="flex items-center space-x-1.5 text-xs text-deepSlate-500 font-bold mb-1">
              <ShieldCheck className="w-4 h-4 text-coral-500" />
              <span>Modo Vendedor Activo</span>
            </div>
            <span className="text-[11px] text-deepSlate-400">
              Costos y márgenes comerciales confidenciales
            </span>
          </div>
        )}

        {/* Projected Revenue in C$ (Cordobas) */}
        <div className="bg-white rounded-2xl border border-nacre-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-coral-600">
              Venta Proyectada C$
            </span>
            <Coins className="w-4 h-4 text-coral-500" />
          </div>
          <p className="text-2xl font-mono font-extrabold text-coral-600">
            C$ {totalProjectedRevenueNio.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-deepSlate-500 mt-0.5 block font-mono">
            ≈ ${totalProjectedRevenueUsd.toFixed(2)} USD (Tasa {exchangeRate.toFixed(2)})
          </span>
        </div>

        {/* Global Profit Margin (Only if Owner) */}
        {role !== 'seller' ? (
          <div className="bg-white rounded-2xl border border-nacre-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-deepSlate-400">
                Margen Bruto Global
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-mono font-extrabold text-emerald-600">
              +{globalMarginPercent.toFixed(1)}%
            </p>
            <span className="text-[11px] text-deepSlate-500 mt-0.5 block font-mono">
              +${(totalProjectedRevenueUsd - totalStockCostUsd).toFixed(2)} USD utilidad proyectada
            </span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-nacre-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-deepSlate-400">
                Colecciones / Lotes
              </span>
              <Layers className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-mono font-extrabold text-deepSlate-900">
              {batches.length}
            </p>
            <span className="text-[11px] text-deepSlate-500 mt-0.5 block">
              Wayuu, Stella, Georgina 3 y 4
            </span>
          </div>
        )}

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-nacre-200 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-deepSlate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código (ej. Wayuu, AR-301, AN02144, EC01609)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900 transition-colors"
          />
        </div>

        {/* Batch Filter dropdown */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-deepSlate-400 shrink-0" />
          <select
            value={selectedBatchFilter}
            onChange={(e) => setSelectedBatchFilter(e.target.value)}
            className="w-full sm:w-72 px-3 py-2 text-xs font-semibold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 text-deepSlate-800"
          >
            <option value="">Todas las colecciones ({products.length} códigos)</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
            <option value="unassigned">Sin categoría asignada</option>
          </select>

          <button
            onClick={loadData}
            title="Recargar catálogo"
            className="p-2 rounded-xl text-deepSlate-500 hover:text-coral-500 hover:bg-nacre-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Main Inventory Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-coral-500 animate-spin" />
          <span className="text-xs font-bold text-deepSlate-500">
            Cargando catálogo e inventario...
          </span>
        </div>
      ) : (
        <InventoryTable
          products={products}
          batches={batches}
          exchangeRate={exchangeRate}
          role={role}
          searchQuery={searchQuery}
          selectedBatchFilter={selectedBatchFilter}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onOpenNewProductModal={(batchId) => {
            setNewProductBatchId(batchId);
            setIsNewProductOpen(true);
          }}
          onOpenPriceHistory={(prod) => setSelectedHistoryProduct(prod)}
        />
      )}

      {/* Modals */}
      <NewProductModal
        isOpen={isNewProductOpen}
        onClose={() => setIsNewProductOpen(false)}
        onSave={handleCreateProduct}
        batches={batches}
        exchangeRate={exchangeRate}
        role={role}
        defaultBatchId={newProductBatchId}
      />

      <NewBatchModal
        isOpen={isNewBatchOpen}
        onClose={() => setIsNewBatchOpen(false)}
        onSave={handleCreateBatch}
      />

      <ImportCatalogModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
        batches={batches}
        exchangeRate={exchangeRate}
        role={role}
      />

      <PriceHistoryModal
        isOpen={!!selectedHistoryProduct}
        onClose={() => setSelectedHistoryProduct(null)}
        product={selectedHistoryProduct}
      />

      <QuickSaleModal
        isOpen={isQuickSaleOpen}
        onClose={() => setIsQuickSaleOpen(false)}
        exchangeRate={exchangeRate}
        planTier={planTier}
        role={role}
        tenantId={tenant?.id}
        onSaleSuccess={loadData}
      />

    </div>
  );
};
