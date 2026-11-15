import { Product } from '../../types';

export type StockStatus = 'out' | 'low' | 'ok';

export const LOW_STOCK_LIMIT = 2;

export const getStockStatus = (stock: number): StockStatus =>
  stock <= 0 ? 'out' : stock <= LOW_STOCK_LIMIT ? 'low' : 'ok';

export const STOCK_STATUS_UI: Record<
  StockStatus,
  { label: string; badge: string; dot: string }
> = {
  out: { label: 'Agotado', badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  low: { label: 'Pocos', badge: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  ok: { label: 'Bien', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};

export const fmtNio = (n: number, decimals = 2) =>
  `C$ ${Number(n || 0).toLocaleString('es-NI', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

export const fmtUsd = (n: number) =>
  `US$ ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const productCostUsd = (p: Product) => p.landed_cost_usd || p.base_cost_usd || 0;

/** Ganancia por pieza en córdobas y porcentaje sobre el precio de venta. */
export const profitPerPiece = (p: Product, exchangeRate: number) => {
  const costNio = productCostUsd(p) * exchangeRate;
  const profit = (p.price_nio || 0) - costNio;
  const pct = p.price_nio > 0 ? (profit / p.price_nio) * 100 : 0;
  return { costNio, profit, pct };
};

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const generateSku = () =>
  `P-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(Math.random() * 36)
    .toString(36)
    .toUpperCase()}`;
