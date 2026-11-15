import { PlanTier } from '../types';

/**
 * Fuente única de verdad para el menú y los nombres de planes.
 * Lenguaje cotidiano: cada nombre dice QUÉ PUEDES HACER, no el término contable.
 */
export interface NavItem {
  to: string;
  label: string;
  hint: string; // frase corta que explica para qué sirve
  icon: 'home' | 'sales' | 'products' | 'money' | 'costs' | 'history' | 'team';
  minTier: PlanTier;
  ownerOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/app/home', label: 'Inicio', hint: 'Cómo va tu negocio hoy', icon: 'home', minTier: 1 },
  { to: '/app/closing', label: 'Mis ventas', hint: 'Anota lo que vendiste', icon: 'sales', minTier: 1 },
  { to: '/app/inventory', label: 'Mis productos', hint: 'Lo que tienes y cuánto queda', icon: 'products', minTier: 1 },
  { to: '/app/finance', label: 'Mi dinero', hint: 'Cuánto entra, cuánto sale, cuánto ganas', icon: 'money', minTier: 1, ownerOnly: true },
  { to: '/app/batches', label: 'Costo de mis compras', hint: 'Cuánto te cuesta realmente cada producto que importas', icon: 'costs', minTier: 2, ownerOnly: true },
  { to: '/app/audit', label: 'Historial de cambios', hint: 'Qué se perdió, dañó o cambió de precio', icon: 'history', minTier: 3, ownerOnly: true },
  { to: '/app/team', label: 'Mi tienda y equipo', hint: 'Personaliza tu tienda, tema de colores y cuentas de empleados', icon: 'team', minTier: 1, ownerOnly: true },
];

export const PLAN_INFO: Record<
  PlanTier,
  { name: string; short: string; promise: string; badgeColor: string }
> = {
  1: {
    name: 'Básico',
    short: 'Básico',
    promise: 'Vende y controla tu inventario',
    badgeColor: 'bg-nacre-200 text-deepSlate-700',
  },
  2: {
    name: 'Crece',
    short: 'Crece',
    promise: 'Sabe cuánto ganas de verdad en cada producto',
    badgeColor: 'bg-coral-50 text-coral-600 border border-coral-200',
  },
  3: {
    name: 'Pro',
    short: 'Pro',
    promise: 'Controla todo: pérdidas, cambios y reportes completos',
    badgeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  },
};

/** Qué desbloquea cada plan, explicado sin términos técnicos. */
export const UPGRADE_COPY: Record<2 | 3, { title: string; body: string }> = {
  2: {
    title: 'Descubre cuánto te cuesta de verdad cada producto',
    body:
      'Cuando importas, pagas envío e impuestos además del producto. El plan Crece reparte esos gastos en cada pieza para que sepas si realmente estás ganando.',
  },
  3: {
    title: 'Ten un historial de todo lo que pasa en tu negocio',
    body:
      'El plan Pro guarda quién cambió un precio, qué producto se dañó o se prestó, y te da un reporte mensual de ganancias.',
  },
};
