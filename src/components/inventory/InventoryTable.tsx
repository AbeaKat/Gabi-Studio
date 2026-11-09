import React, { useState } from 'react';
import {
  ChevronDown,
  Plus,
  History,
  Trash2,
  Lock,
  Layers
} from 'lucide-react';
import { Product, Batch, UserRole } from '../../types';

interface InventoryTableProps {
  products: Product[];
  batches: Batch[];
  exchangeRate: number;
  role: UserRole;
  searchQuery: string;
  selectedBatchFilter: string;
  onUpdateProduct: (id: string, updates: Partial<Product>, reason?: string) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onOpenNewProductModal: (batchId?: string) => void;
  onOpenPriceHistory: (product: Product) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  products,
  batches,
  exchangeRate,
  role,
  searchQuery,
  selectedBatchFilter,
  onUpdateProduct,
  onDeleteProduct,
  onOpenNewProductModal,
  onOpenPriceHistory,
}) => {
  // Collapsed state for batch groups
  const [collapsedBatches, setCollapsedBatches] = useState<Record<string, boolean>>({});
  
  // Inline editing state: { productId, field }
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof Product } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [recentlySavedId, setRecentlySavedId] = useState<string | null>(null);

  const toggleBatch = (batchId: string) => {
    setCollapsedBatches((prev) => ({
      ...prev,
      [batchId]: !prev[batchId],
    }));
  };

  // Filter products by search and batch
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesBatch =
      !selectedBatchFilter ||
      (selectedBatchFilter === 'unassigned' ? !p.batch_id : p.batch_id === selectedBatchFilter);

    return matchesSearch && matchesBatch;
  });

  // Group products by batch
  const groupedProducts: { batch: Batch | null; items: Product[] }[] = [];

  // Add assigned batches
  batches.forEach((b) => {
    const items = filteredProducts.filter((p) => p.batch_id === b.id);
    if (items.length > 0 || !searchQuery) {
      groupedProducts.push({ batch: b, items });
    }
  });

  // Add unassigned products
  const unassignedItems = filteredProducts.filter((p) => !p.batch_id);
  if (unassignedItems.length > 0 || (batches.length === 0 && filteredProducts.length > 0)) {
    groupedProducts.push({ batch: null, items: unassignedItems });
  }

  const startEditing = (p: Product, field: keyof Product) => {
    // Seller cannot edit cost
    if (role === 'seller' && (field === 'base_cost_usd' || field === 'landed_cost_usd')) {
      return;
    }
    setEditingCell({ id: p.id, field });
    setEditValue(String(p[field] ?? ''));
  };

  const handleInlineSave = async (p: Product) => {
    if (!editingCell) return;
    const { field } = editingCell;
    const trimmed = editValue.trim();

    const updates: Partial<Product> = {};
    let reason = 'Edición en línea';

    if (field === 'sku') {
      if (trimmed && trimmed.toUpperCase() !== p.sku) {
        updates.sku = trimmed.toUpperCase();
      }
    } else if (field === 'name') {
      if (trimmed !== (p.name || '')) {
        updates.name = trimmed;
      }
    } else if (field === 'stock_current') {
      const val = parseInt(trimmed, 10);
      if (!isNaN(val) && val >= 0 && val !== p.stock_current) {
        updates.stock_current = val;
      }
    } else if (field === 'base_cost_usd' || field === 'landed_cost_usd') {
      const val = parseFloat(trimmed);
      if (!isNaN(val) && val >= 0 && val !== p[field]) {
        updates.base_cost_usd = val;
        updates.landed_cost_usd = val;
        reason = 'Ajuste de costo';
      }
    } else if (field === 'price_usd') {
      const val = parseFloat(trimmed);
      if (!isNaN(val) && val >= 0 && val !== p.price_usd) {
        updates.price_usd = val;
        // Auto calculate price_nio with current exchange rate
        updates.price_nio = Math.round(val * exchangeRate * 100) / 100;
        reason = 'Actualización de precio USD';
      }
    } else if (field === 'price_nio') {
      const val = parseFloat(trimmed);
      if (!isNaN(val) && val >= 0 && val !== p.price_nio) {
        updates.price_nio = val;
        reason = 'Ajuste manual precio C$';
      }
    }

    setEditingCell(null);

    if (Object.keys(updates).length > 0) {
      await onUpdateProduct(p.id, updates, reason);
      setRecentlySavedId(p.id);
      setTimeout(() => {
        setRecentlySavedId((current) => (current === p.id ? null : current));
      }, 1000);
    }
  };

  if (filteredProducts.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-nacre-200 p-12 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-coral-50 border border-coral-200 flex items-center justify-center text-coral-500 mx-auto mb-4">
          <Layers className="w-7 h-7" />
        </div>
        <h3 className="text-base font-extrabold text-deepSlate-900">
          No se encontraron productos en el inventario
        </h3>
        <p className="text-xs text-deepSlate-500 mt-1 max-w-sm mx-auto mb-6">
          {searchQuery
            ? 'Ningún producto coincide con tu búsqueda. Intenta con otro término.'
            : 'Tu catálogo está listo. Puedes crear tu primer producto o importar un archivo Excel/CSV.'}
        </p>
        <div className="flex items-center justify-center space-x-3">
          <button
            onClick={() => onOpenNewProductModal()}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Producto</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedProducts.map(({ batch, items }) => {
        const batchKey = batch ? batch.id : 'unassigned';
        const isCollapsed = !!collapsedBatches[batchKey];
        const batchName = batch ? batch.name : 'Inventario General / Sin Categoría';

        // Group financial totals
        const totalStock = items.reduce((acc, curr) => acc + (curr.stock_current || 0), 0);
        const totalInvestmentUsd = items.reduce(
          (acc, curr) => acc + (curr.stock_current || 0) * (curr.landed_cost_usd || curr.base_cost_usd || 0),
          0
        );
        const totalProjectedRevenueUsd = items.reduce(
          (acc, curr) => acc + (curr.stock_current || 0) * (curr.price_usd || 0),
          0
        );
        const totalProjectedRevenueNio = items.reduce(
          (acc, curr) => acc + (curr.stock_current || 0) * (curr.price_nio || 0),
          0
        );

        return (
          <div
            key={batchKey}
            className="bg-white rounded-3xl border border-nacre-200 shadow-xs overflow-hidden transition-all"
          >
            {/* Collapsible Group Header Bar */}
            <div className="bg-gradient-to-r from-nacre-100/90 via-white to-nacre-50 px-4 sm:px-6 py-3.5 border-b border-nacre-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => toggleBatch(batchKey)}
                  className="p-1 rounded-lg text-deepSlate-500 hover:text-coral-500 hover:bg-white transition-colors"
                  aria-label={isCollapsed ? 'Expandir grupo' : 'Colapsar grupo'}
                >
                  <ChevronDown
                    className={`w-5 h-5 transition-transform duration-200 ease-out-natural ${
                      isCollapsed ? '-rotate-90 text-deepSlate-400' : 'rotate-0 text-coral-500'
                    }`}
                  />
                </button>

                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm text-deepSlate-900 tracking-tight">
                    {batchName}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-nacre-200 text-deepSlate-700">
                    {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                  </span>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-coral-50 text-coral-700 border border-coral-200">
                    {totalStock} uds en stock
                  </span>
                </div>
              </div>

              {/* Financial metrics in group header (Only for Owner) */}
              <div className="flex items-center space-x-4 text-xs">
                {role !== 'seller' ? (
                  <div className="hidden lg:flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-[10px] text-deepSlate-400 block uppercase font-bold">Inversión Stock:</span>
                      <span className="font-mono font-bold text-deepSlate-800">
                        ${totalInvestmentUsd.toFixed(2)} USD
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-coral-600 block uppercase font-bold">Venta Proyectada:</span>
                      <span className="font-mono font-extrabold text-coral-600">
                        C$ {totalProjectedRevenueNio.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-deepSlate-400 block font-mono">
                        (${totalProjectedRevenueUsd.toFixed(2)} USD)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-xs text-deepSlate-400">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Márgenes protegidos</span>
                  </div>
                )}

                <button
                  onClick={() => onOpenNewProductModal(batch ? batch.id : undefined)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-coral-600 bg-coral-50 hover:bg-coral-100 border border-coral-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir a lote</span>
                </button>
              </div>

            </div>

            {/* Table of items inside this batch */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-nacre-50/70 border-b border-nacre-200 text-deepSlate-500 uppercase tracking-wider font-semibold select-none">
                      <th className="py-3 px-4 w-32">SKU</th>
                      <th className="py-3 px-4 min-w-[200px]">Producto / Descripción</th>
                      <th className="py-3 px-4 text-center w-24">Stock</th>
                      {role !== 'seller' && (
                        <th className="py-3 px-4 text-right w-28">Costo ($)</th>
                      )}
                      <th className="py-3 px-4 text-right w-32">Precio ($)</th>
                      <th className="py-3 px-4 text-right w-36">Precio (C$)</th>
                      {role !== 'seller' && (
                        <th className="py-3 px-4 text-center w-28">Margen (%)</th>
                      )}
                      <th className="py-3 px-4 text-center w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nacre-100 font-sans">
                    {items.map((p) => {
                      const cost = p.landed_cost_usd || p.base_cost_usd || 0;
                      const priceUsd = p.price_usd || 0;
                      const marginPercent = priceUsd > 0 ? ((priceUsd - cost) / priceUsd) * 100 : 0;
                      const isHealthy = marginPercent >= 35;
                      const isWarning = marginPercent >= 15 && marginPercent < 35;

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-coral-50/30 transition-colors group ${
                            recentlySavedId === p.id ? 'animate-cell-success' : ''
                          }`}
                        >
                          {/* SKU (Inline Editable) */}
                          <td className="py-3 px-4 font-mono font-bold text-deepSlate-900">
                            {editingCell?.id === p.id && editingCell?.field === 'sku' ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleInlineSave(p)}
                                onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(p)}
                                autoFocus
                                className="w-full px-2 py-1 text-xs font-mono font-bold rounded bg-white border-2 border-coral-500 text-deepSlate-900 uppercase focus:outline-none"
                              />
                            ) : (
                              <span
                                onClick={() => startEditing(p, 'sku')}
                                className="cursor-pointer hover:text-coral-600 hover:underline flex items-center space-x-1"
                                title="Haz clic para editar SKU"
                              >
                                <span>{p.sku}</span>
                              </span>
                            )}
                          </td>

                          {/* Product Name (Inline Editable) */}
                          <td className="py-3 px-4 font-medium text-deepSlate-900">
                            {editingCell?.id === p.id && editingCell?.field === 'name' ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleInlineSave(p)}
                                onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(p)}
                                autoFocus
                                className="w-full px-2 py-1 text-xs font-medium rounded bg-white border-2 border-coral-500 text-deepSlate-900 focus:outline-none"
                              />
                            ) : (
                              <span
                                onClick={() => startEditing(p, 'name')}
                                className="cursor-pointer hover:text-coral-600 hover:underline block truncate max-w-md"
                                title="Haz clic para editar nombre"
                              >
                                {p.name || `Producto ${p.sku}`}
                              </span>
                            )}
                          </td>

                          {/* Stock (Inline Editable) */}
                          <td className="py-3 px-4 text-center font-mono font-semibold">
                            {editingCell?.id === p.id && editingCell?.field === 'stock_current' ? (
                              <input
                                type="number"
                                min="0"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleInlineSave(p)}
                                onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(p)}
                                autoFocus
                                className="w-16 px-1.5 py-1 text-xs font-mono text-center font-bold rounded bg-white border-2 border-coral-500 focus:outline-none"
                              />
                            ) : (
                              <span
                                onClick={() => startEditing(p, 'stock_current')}
                                className={`cursor-pointer inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  p.stock_current <= 0
                                    ? 'bg-rose-100 text-rose-800'
                                    : p.stock_current <= 2
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-nacre-100 text-deepSlate-800 hover:bg-nacre-200'
                                }`}
                                title="Haz clic para editar stock"
                              >
                                {p.stock_current} {p.stock_current === 1 ? 'ud' : 'uds'}
                              </span>
                            )}
                          </td>

                          {/* Cost USD (Hidden if seller, Inline Editable if owner) */}
                          {role !== 'seller' && (
                            <td className="py-3 px-4 text-right font-mono text-deepSlate-600 tabular-numbers">
                              {editingCell?.id === p.id && editingCell?.field === 'landed_cost_usd' ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleInlineSave(p)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(p)}
                                  autoFocus
                                  className="w-20 px-1.5 py-1 text-xs font-mono text-right font-bold rounded bg-white border-2 border-coral-500 focus:outline-none"
                                />
                              ) : (
                                <span
                                  onClick={() => startEditing(p, 'landed_cost_usd')}
                                  className="cursor-pointer hover:text-coral-600 hover:underline"
                                  title="Haz clic para editar costo"
                                >
                                  ${cost.toFixed(2)}
                                </span>
                              )}
                            </td>
                          )}

                          {/* Price USD (Inline Editable) */}
                          <td className="py-3 px-4 text-right font-mono font-bold text-deepSlate-900 tabular-numbers">
                            {editingCell?.id === p.id && editingCell?.field === 'price_usd' ? (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleInlineSave(p)}
                                onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(p)}
                                autoFocus
                                className="w-24 px-1.5 py-1 text-xs font-mono text-right font-bold rounded bg-white border-2 border-coral-500 focus:outline-none"
                              />
                            ) : (
                              <span
                                onClick={() => startEditing(p, 'price_usd')}
                                className="cursor-pointer hover:text-coral-600 hover:underline"
                                title="Haz clic para editar precio USD"
                              >
                                ${priceUsd.toFixed(2)}
                              </span>
                            )}
                          </td>

                          {/* Price NIO (Inline Editable) */}
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-coral-600 tabular-numbers">
                            {editingCell?.id === p.id && editingCell?.field === 'price_nio' ? (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleInlineSave(p)}
                                onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(p)}
                                autoFocus
                                className="w-24 px-1.5 py-1 text-xs font-mono text-right font-extrabold rounded bg-white border-2 border-coral-500 text-coral-600 focus:outline-none"
                              />
                            ) : (
                              <span
                                onClick={() => startEditing(p, 'price_nio')}
                                className="cursor-pointer hover:text-coral-700 hover:underline"
                                title="Haz clic para editar o redondear precio en Córdobas"
                              >
                                C$ {Number(p.price_nio || 0).toFixed(2)}
                              </span>
                            )}
                          </td>

                          {/* Profit Margin Semaphore (Hidden if seller) */}
                          {role !== 'seller' && (
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                                  p.stock_current <= 0
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : isHealthy
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : isWarning
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                +{marginPercent.toFixed(1)}%
                              </span>
                            </td>
                          )}

                          {/* Row Action Buttons */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onOpenPriceHistory(p)}
                                className="p-1.5 rounded-lg text-deepSlate-400 hover:text-coral-500 hover:bg-coral-50 transition-colors"
                                title="Ver historial de auditoría de precios"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>

                              {role !== 'seller' && (
                                <button
                                  onClick={() => {
                                    if (confirm(`¿Estás seguro de eliminar el producto ${p.sku}?`)) {
                                      onDeleteProduct(p.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-deepSlate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Eliminar producto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
};
