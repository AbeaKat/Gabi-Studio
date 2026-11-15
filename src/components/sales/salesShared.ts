import { Product, SalesHeader, SalesItem, PaymentMethod } from '../../types';

// ---------------------------------------------------------------------------
// Formas de pago (lenguaje simple para dueños y vendedores)
// ---------------------------------------------------------------------------
export const PAYMENT_METHOD_OPTIONS: Array<{
  id: PaymentMethod;
  label: string;
  shortLabel: string;
  group: 'cash' | 'bank' | 'pos' | 'credit';
  requiresTier2?: boolean;
}> = [
  { id: 'cash_nio', label: 'Efectivo C$', shortLabel: 'Efectivo (córdobas)', group: 'cash' },
  { id: 'cash_usd', label: 'Efectivo $', shortLabel: 'Efectivo (dólares)', group: 'cash' },
  { id: 'transfer_bac', label: 'Transf. BAC', shortLabel: 'Transferencia BAC', group: 'bank' },
  { id: 'transfer_lafise', label: 'Transf. Lafise', shortLabel: 'Transferencia Lafise', group: 'bank' },
  { id: 'transfer_banpro', label: 'Transf. Banpro', shortLabel: 'Transferencia Banpro', group: 'bank' },
  { id: 'pos_card', label: 'Tarjeta', shortLabel: 'Tarjeta', group: 'pos' },
  {
    id: 'credit_layaway',
    label: 'Paga después',
    shortLabel: 'Pago pendiente',
    group: 'credit',
    requiresTier2: true,
  },
];

export const getPaymentMethodLabel = (method?: PaymentMethod): string => {
  const found = PAYMENT_METHOD_OPTIONS.find((m) => m.id === method);
  return found ? found.shortLabel : 'Efectivo (córdobas)';
};

export const BANK_OPTIONS: Array<{ id: PaymentMethod; label: string }> = [
  { id: 'transfer_bac', label: 'BAC' },
  { id: 'transfer_lafise', label: 'Lafise' },
  { id: 'transfer_banpro', label: 'Banpro' },
];

export const isTransfer = (m: PaymentMethod) =>
  m === 'transfer_bac' || m === 'transfer_lafise' || m === 'transfer_banpro';

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------
export const money = (n: number): string =>
  `C$ ${(Number(n) || 0).toLocaleString('es-NI', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const moneyUsd = (n: number): string => `$${(Number(n) || 0).toFixed(2)}`;

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha local (AAAA-MM-DD) — evita que ventas de la noche cuenten como "mañana". */
export const localIsoDate = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseIsoDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const dayLabel = (iso: string): string => {
  const today = localIsoDate();
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  if (iso === today) return 'Hoy';
  if (iso === localIsoDate(yest)) return 'Ayer';
  const text = parseIsoDate(iso).toLocaleDateString('es-NI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const startOfWeekIso = (): string => {
  const d = new Date();
  const diff = (d.getDay() + 6) % 7; // lunes = inicio de semana
  d.setDate(d.getDate() - diff);
  return localIsoDate(d);
};

// ---------------------------------------------------------------------------
// Filas del historial
// ---------------------------------------------------------------------------
export type SaleStatus = 'paid' | 'partial' | 'pending';

export interface SaleRow {
  item: SalesItem;
  header?: SalesHeader;
  date: string;
  total: number;
  paid: number;
  due: number;
  status: SaleStatus;
  customer: string;
  method: PaymentMethod;
  name: string;
  code: string;
}

export const buildSaleRows = (headers: SalesHeader[], items: SalesItem[]): SaleRow[] => {
  const hdrMap = new Map(headers.map((h) => [h.id, h]));
  return items.map((item) => {
    const header = hdrMap.get(item.sale_header_id);
    const total = item.final_unit_price_nio * item.quantity;
    const method: PaymentMethod = item.payment_method || header?.payment_method || 'cash_nio';
    const due =
      method === 'credit_layaway' || (item.balance_due_nio ?? 0) > 0
        ? Math.max(0, Number(item.balance_due_nio ?? Math.max(0, total - (item.amount_paid_nio ?? 0))))
        : 0;
    const paid = Math.max(0, total - due);
    const status: SaleStatus = due > 0 ? (paid > 0 ? 'partial' : 'pending') : 'paid';
    return {
      item,
      header,
      date: header?.sale_date || item.created_at.slice(0, 10),
      total,
      paid,
      due,
      status,
      customer: (item.customer_name || header?.customer_name || '').trim(),
      method,
      name: item.product_name_snapshot || item.sku_snapshot,
      code: item.sku_snapshot,
    };
  });
};

// ---------------------------------------------------------------------------
// Construcción de una línea de venta (misma lógica de snapshots de siempre)
// ---------------------------------------------------------------------------
export const buildSalesItem = (args: {
  product: Product;
  quantity: number;
  discountNio: number;
  paymentMethod: PaymentMethod;
  isCredit: boolean;
  exchangeRate: number;
  tenantId: string;
  headerId: string;
  idSuffix: string | number;
  nowIso: string;
  customerName?: string | null;
  customerPhone?: string | null;
}): SalesItem => {
  const { product: p, quantity, discountNio, exchangeRate } = args;
  const unitCost = Number(p.landed_cost_usd || p.base_cost_usd || 0);
  const listPriceUsd = Number(p.price_usd || 0);
  const listPriceNio = Number(p.price_nio || 0);
  const finalNio = Math.max(0, listPriceNio - discountNio);
  const finalUsd =
    discountNio > 0 ? Math.round((finalNio / exchangeRate) * 100) / 100 : listPriceUsd;
  const profitUsd = Math.round((finalUsd - unitCost) * quantity * 100) / 100;
  const lineTotalNio = finalNio * quantity;
  return {
    id: `sale-itm-${Date.now()}-${args.idSuffix}`,
    tenant_id: args.tenantId,
    sale_header_id: args.headerId,
    product_id: p.id,
    sku_snapshot: p.sku,
    product_name_snapshot: p.name || p.sku,
    batch_id_snapshot: p.batch_id || null,
    quantity,
    unit_cost_usd_snapshot: unitCost,
    list_price_usd_snapshot: listPriceUsd,
    list_price_nio_snapshot: listPriceNio,
    discount_nio: discountNio,
    final_unit_price_nio: finalNio,
    final_unit_price_usd: finalUsd,
    exchange_rate_snapshot: exchangeRate,
    net_profit_usd: profitUsd,
    payment_method: args.paymentMethod,
    customer_name: args.customerName ?? null,
    customer_phone: args.customerPhone ?? null,
    amount_paid_nio: args.isCredit ? 0 : lineTotalNio,
    balance_due_nio: args.isCredit ? lineTotalNio : 0,
    payment_status: args.isCredit ? 'pending' : 'paid',
    created_at: args.nowIso,
  };
};
