import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Package, AlertTriangle, ArrowRight, PlusCircle, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getStoredProducts,
  getStoredSalesHeaders,
  getStoredSalesItems,
  getStoredExpenses,
} from '../data/realInventoryData';
import { PLAN_INFO } from '../lib/navigation';

const LOW_STOCK_LIMIT = 3;

const money = (nio: number) => `C$ ${Math.round(nio).toLocaleString('es-NI')}`;

export const HomePage: React.FC = () => {
  const { tenant, role, planTier } = useAuth();
  const rate = Number(tenant?.exchange_rate_nio || 36.62);
  const isOwner = role === 'global_owner';

  const data = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const headers = getStoredSalesHeaders();
    const items = getStoredSalesItems();
    const products = getStoredProducts();
    const expenses = getStoredExpenses();

    const dateOf = new Map(headers.map((h) => [h.id, h.sale_date]));
    const monthItems = items.filter(
      (i) => (dateOf.get(i.sale_header_id) || i.created_at).slice(0, 7) === month
    );

    const sold = monthItems.reduce((a, i) => a + i.final_unit_price_nio * i.quantity, 0);
    const profitUsd = monthItems.reduce((a, i) => a + i.net_profit_usd, 0);
    const spentUsd = expenses
      .filter((e) => e.expense_date.slice(0, 7) === month)
      .reduce((a, e) => a + e.amount_usd, 0);
    const owed = headers.reduce((a, h) => a + (h.balance_due_nio || 0), 0);
    const lowStock = products
      .filter((p) => p.stock_current <= LOW_STOCK_LIMIT)
      .sort((a, b) => a.stock_current - b.stock_current);

    return {
      sold,
      salesCount: new Set(monthItems.map((i) => i.sale_header_id)).size,
      earned: (profitUsd - spentUsd) * rate,
      owed,
      lowStock,
      productCount: products.length,
    };
  }, [rate]);

  const monthName = new Date().toLocaleDateString('es-NI', { month: 'long' });

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900">
          Hola 👋 Así va {tenant?.name || 'tu negocio'}
        </h1>
        <p className="text-sm text-deepSlate-500 mt-1">
          Resumen de {monthName}. Plan {PLAN_INFO[planTier].name}: {PLAN_INFO[planTier].promise.toLowerCase()}.
        </p>
      </div>

      {/* Acción principal */}
      <Link
        to="/app/closing"
        className="flex items-center justify-between bg-coral-500 hover:bg-coral-600 text-white rounded-2xl p-5 shadow-md shadow-coral-500/25 transition-colors"
      >
        <div className="flex items-center gap-3">
          <PlusCircle className="w-7 h-7" />
          <div>
            <p className="font-extrabold text-lg">Anotar una venta</p>
            <p className="text-xs text-white/80">Lo más usado: registra lo que acabas de vender</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5" />
      </Link>

      {/* Respuestas simples */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card icon={<ShoppingBag className="w-5 h-5" />} question={`¿Cuánto vendí en ${monthName}?`}>
          <Big>{money(data.sold)}</Big>
          <Small>{data.salesCount} {data.salesCount === 1 ? 'venta' : 'ventas'} este mes</Small>
        </Card>

        {isOwner && (
          <Card icon={<Wallet className="w-5 h-5" />} question="¿Cuánto gané de verdad?">
            <Big tone={data.earned >= 0 ? 'good' : 'bad'}>{money(data.earned)}</Big>
            <Small>Lo vendido, menos lo que costó el producto y tus gastos</Small>
            <MoreLink to="/app/finance">Ver detalle</MoreLink>
          </Card>
        )}

        <Card icon={<Package className="w-5 h-5" />} question="¿Cuánto me deben?">
          <Big>{money(data.owed)}</Big>
          <Small>{data.owed > 0 ? 'Dinero pendiente de clientes (abonos)' : 'Nadie te debe por ahora 🎉'}</Small>
        </Card>

        <Card icon={<AlertTriangle className="w-5 h-5" />} question="¿Qué se me está acabando?">
          {data.lowStock.length === 0 ? (
            <Small>Todo tu inventario tiene suficiente stock 👌</Small>
          ) : (
            <ul className="text-sm space-y-1">
              {data.lowStock.slice(0, 4).map((p) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span className="truncate text-deepSlate-700">{p.name || p.sku}</span>
                  <span className={`font-bold shrink-0 ${p.stock_current === 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                    {p.stock_current === 0 ? 'Agotado' : `Quedan ${p.stock_current}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <MoreLink to="/app/inventory">Ver mis productos</MoreLink>
        </Card>
      </div>
    </div>
  );
};

const Card: React.FC<{ icon: React.ReactNode; question: string; children: React.ReactNode }> = ({
  icon,
  question,
  children,
}) => (
  <div className="bg-white border border-nacre-200 rounded-2xl p-5 space-y-2 shadow-2xs">
    <div className="flex items-center gap-2 text-deepSlate-500">
      {icon}
      <h2 className="text-sm font-bold">{question}</h2>
    </div>
    {children}
  </div>
);

const Big: React.FC<{ children: React.ReactNode; tone?: 'good' | 'bad' }> = ({ children, tone }) => (
  <p
    className={`text-3xl font-extrabold ${
      tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-rose-600' : 'text-deepSlate-900'
    }`}
  >
    {children}
  </p>
);

const Small: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs text-deepSlate-500">{children}</p>
);

const MoreLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link to={to} className="inline-flex items-center gap-1 text-xs font-bold text-coral-600 hover:text-coral-700">
    {children} <ArrowRight className="w-3 h-3" />
  </Link>
);

