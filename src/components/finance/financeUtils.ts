import { OperatingExpense, SalesHeader, SalesItem, KardexMovement } from '../../types';

export type PeriodKey = 'today' | 'week' | 'month' | 'lastMonth';

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'month', label: 'Este mes' },
  { key: 'lastMonth', label: 'Mes pasado' },
  { key: 'week', label: 'Esta semana' },
  { key: 'today', label: 'Hoy' },
];

export const EXPENSE_LABELS: Record<OperatingExpense['category'], string> = {
  publicidad: 'Publicidad',
  empaque: 'Empaques',
  envio_local: 'Envíos locales',
  renta_servicios: 'Renta y servicios',
  comisiones: 'Comisiones',
  otros: 'Otros',
};

export const EXPENSE_HINTS: Record<OperatingExpense['category'], string> = {
  publicidad: 'Anuncios, redes sociales, volantes',
  empaque: 'Bolsas, cajas, etiquetas',
  envio_local: 'Delivery, taxis, mensajería',
  renta_servicios: 'Local, luz, agua, internet',
  comisiones: 'Banco, POS, plataformas',
  otros: 'Cualquier otro gasto del negocio',
};

export const EXPENSE_CATEGORY_KEYS = Object.keys(EXPENSE_LABELS) as OperatingExpense['category'][];

export const pad = (n: number) => String(n).padStart(2, '0');
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayLocalIso = () => toIso(new Date());

export interface DateRange {
  from: string;
  to: string;
  label: string;
}

export function getRange(key: PeriodKey): DateRange {
  const now = new Date();
  if (key === 'today') {
    const t = toIso(now);
    return { from: t, to: t, label: 'hoy' };
  }
  if (key === 'week') {
    const d = new Date(now);
    const diff = (d.getDay() + 6) % 7; // lunes = inicio
    d.setDate(d.getDate() - diff);
    return { from: toIso(d), to: toIso(now), label: 'esta semana' };
  }
  if (key === 'lastMonth') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toIso(first), to: toIso(last), label: 'el mes pasado' };
  }
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toIso(first), to: toIso(now), label: 'este mes' };
}

export const inRange = (date: string, r: DateRange) => date >= r.from && date <= r.to;

export const fmtC = (n: number, decimals = 0) =>
  `C$ ${n.toLocaleString('es-NI', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export interface ProductRow {
  key: string;
  name: string;
  sku: string;
  units: number;
  revenueNio: number;
  profitNio: number;
}

export interface FinanceMetrics {
  items: SalesItem[];
  expenses: OperatingExpense[];
  // Base de caja (lo que ya se cobró)
  entroNio: number;
  costoNio: number;
  gastosNio: number;
  salioNio: number;
  meQuedoNio: number;
  centavosPorCien: number;
  // Base facturada (todo lo vendido, cobrado o no)
  grossListSalesNio: number;
  totalDiscountsNio: number;
  netSalesNio: number;
  netSalesUsd: number;
  fullCostNio: number;
  fullCostUsd: number;
  grossProfitNio: number;
  grossProfitUsd: number;
  gastosUsd: number;
  shrinkageLossUsd: number;
  netOperatingProfitUsd: number;
  netOperatingProfitNio: number;
  netMarginPercent: number;
  products: ProductRow[];
}

export function lineTotals(i: SalesItem) {
  const total = i.final_unit_price_nio * i.quantity;
  const due = Number(i.balance_due_nio || 0);
  const paid = due <= 0 ? total : Number(i.amount_paid_nio ?? Math.max(0, total - due));
  const ratio = total > 0 ? Math.min(1, Math.max(0, paid / total)) : 1;
  const rate = i.exchange_rate_snapshot || 1;
  return { total, due, paid, ratio, costNio: i.unit_cost_usd_snapshot * i.quantity * rate, profitNio: i.net_profit_usd * rate };
}

export function computeMetrics(args: {
  salesItems: SalesItem[];
  salesHeaders: SalesHeader[];
  expenses: OperatingExpense[];
  kardex: KardexMovement[];
  exchangeRate: number;
  range: DateRange;
}): FinanceMetrics {
  const { salesItems, salesHeaders, expenses, kardex, exchangeRate, range } = args;
  const headerById = new Map(salesHeaders.map((h) => [h.id, h]));
  const items = salesItems.filter((i) => {
    const d = headerById.get(i.sale_header_id)?.sale_date || i.created_at.slice(0, 10);
    return inRange(d, range);
  });
  const periodExpenses = expenses.filter((e) => inRange(e.expense_date, range));

  let entro = 0, costo = 0, gross = 0, disc = 0, net = 0, netUsd = 0, fullCost = 0, fullCostUsd = 0, profitNio = 0, profitUsd = 0;
  const byProduct = new Map<string, ProductRow>();
  items.forEach((i) => {
    const l = lineTotals(i);
    entro += l.paid;
    costo += l.costNio * l.ratio;
    gross += i.list_price_nio_snapshot * i.quantity;
    disc += i.discount_nio * i.quantity;
    net += l.total;
    netUsd += i.final_unit_price_usd * i.quantity;
    fullCost += l.costNio;
    fullCostUsd += i.unit_cost_usd_snapshot * i.quantity;
    profitNio += l.profitNio;
    profitUsd += i.net_profit_usd;
    const key = i.product_id || i.sku_snapshot;
    const row = byProduct.get(key) || { key, name: i.product_name_snapshot || i.sku_snapshot, sku: i.sku_snapshot, units: 0, revenueNio: 0, profitNio: 0 };
    row.units += i.quantity;
    row.revenueNio += l.total;
    row.profitNio += l.profitNio;
    byProduct.set(key, row);
  });

  const gastosNio = periodExpenses.reduce((a, e) => a + e.amount_nio, 0);
  const gastosUsd = periodExpenses.reduce((a, e) => a + e.amount_usd, 0);
  const salio = costo + gastosNio;
  const meQuedo = entro - salio;
  const shrinkage = kardex
    .filter((k) => k.movement_type === 'merma_dano' && inRange(k.created_at.slice(0, 10), range))
    .reduce((a, k) => a + Math.abs(k.quantity_delta) * k.unit_cost_usd, 0);
  const netOpUsd = profitUsd - gastosUsd - shrinkage;

  return {
    items,
    expenses: periodExpenses,
    entroNio: entro,
    costoNio: costo,
    gastosNio,
    salioNio: salio,
    meQuedoNio: meQuedo,
    centavosPorCien: entro > 0 ? (meQuedo / entro) * 100 : 0,
    grossListSalesNio: gross,
    totalDiscountsNio: disc,
    netSalesNio: net,
    netSalesUsd: netUsd,
    fullCostNio: fullCost,
    fullCostUsd,
    grossProfitNio: profitNio,
    grossProfitUsd: profitUsd,
    gastosUsd,
    shrinkageLossUsd: shrinkage,
    netOperatingProfitUsd: netOpUsd,
    netOperatingProfitNio: netOpUsd * exchangeRate,
    netMarginPercent: netUsd > 0 ? (netOpUsd / netUsd) * 100 : 0,
    products: Array.from(byProduct.values()).sort((a, b) => b.profitNio - a.profitNio),
  };
}
