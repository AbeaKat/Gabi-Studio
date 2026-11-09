import {
  Batch,
  Product,
  SalesHeader,
  SalesItem,
  PriceHistory,
  OperatingExpense,
  KardexMovement,
  Profile,
  TestAccountPreset,
} from '../types';

export const TENANT_STELLA_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_EXCHANGE_RATE = 36.62;

// ============================================================================
// PERFILES DE PRUEBA PARA CADA NIVEL DEL SISTEMA (1, 2 y 3 + Dueño y Vendedor)
// ============================================================================
export const TEST_ACCOUNT_PRESETS: TestAccountPreset[] = [
  {
    id: 'tier1-owner',
    label: 'Nivel 1: Esencial (Dueño)',
    badge: 'Nivel 1 • Dueño',
    email: 'nivel1@stella-georgina.com',
    password: 'stella2026',
    plan_tier: 1,
    role: 'global_owner',
    full_name: 'Stella & Georgina (Dueña Nivel 1)',
    tenant_name: 'Stella & Georgina Studio',
    max_owner_profiles: 1,
    max_seller_profiles: 0,
    extra_paid_profiles: 0,
    description: 'Control esencial de catálogo estilo ClickUp, venta rápida 1 a 1, cierre diario Excel/Manual y KPIs básicos.',
    highlights: [
      '1 Perfil Dueño incluido',
      'Catálogo completo Stella, Wayuu y Georgina (116 SKUs)',
      'Venta 1 a 1 (Promociones con candado Nivel 2)',
      'Dashboard Financiero Nivel 1 (Capital y Ganancia Bruta)',
    ],
  },
  {
    id: 'tier2-owner',
    label: 'Nivel 2: Crecimiento (Dueño)',
    badge: 'Nivel 2 • Dueño',
    email: 'nivel2@stella-georgina.com',
    password: 'stella2026',
    plan_tier: 2,
    role: 'global_owner',
    full_name: 'Georgina Dirección (Dueña Nivel 2)',
    tenant_name: 'Stella & Georgina Studio',
    max_owner_profiles: 1,
    max_seller_profiles: 1,
    extra_paid_profiles: 0,
    description: 'Desbloquea Calculadora de Importación (Amazon, Envío, DHL), descuentos en ventas, gastos operativos y recuperación por lote.',
    highlights: [
      '1 Dueño + 1 Vendedor incluidos',
      'Calculadora de Prorrateo (Envío $1.27 / Amazon $1.11 / DHL $0.43)',
      'Motor de Descuentos y Promociones desbloqueado',
      'Barra de Recuperación de Inversión por Lote y Gastos Operativos',
    ],
  },
  {
    id: 'tier2-seller',
    label: 'Nivel 2: Crecimiento (Vendedor)',
    badge: 'Nivel 2 • Vendedor',
    email: 'vendedor@stella-georgina.com',
    password: 'stella2026',
    plan_tier: 2,
    role: 'seller',
    full_name: 'Valeria Atención Sala (Vendedora)',
    tenant_name: 'Stella & Georgina Studio',
    max_owner_profiles: 1,
    max_seller_profiles: 1,
    extra_paid_profiles: 0,
    description: 'Vista protegida para personal de tienda: permite consultar precios en C$/USD y registrar salidas sin ver costos ni ganancias.',
    highlights: [
      'Oculta automáticamente Costo ($) y Margen (%)',
      'Bloquea acceso al Dashboard Financiero y Calculadora de Costos',
      'Permite registrar Venta Rápida 1 a 1 y Cierre Diario',
      'Tasa de cambio en modo solo lectura',
    ],
  },
  {
    id: 'tier3-owner',
    label: 'Nivel 3: ERP Completo (Dueño Global)',
    badge: 'Nivel 3 • ERP Total',
    email: 'nivel3@stella-georgina.com',
    password: 'stella2026',
    plan_tier: 3,
    role: 'global_owner',
    full_name: 'Dirección General (ERP Nivel 3)',
    tenant_name: 'Stella & Georgina Studio',
    max_owner_profiles: 1,
    max_seller_profiles: 2,
    extra_paid_profiles: 1,
    description: 'Control corporativo total: Kardex auditable (mermas, averías, consignación), historial global de precios y Estado de Resultados (P&L).',
    highlights: [
      '1 Dueño Global + 2 Vendedores (+1 asiento extra activo)',
      'Kardex Auditable (Mermas, Averías, Consignación y Ajustes)',
      'Auditoría Global de Precios (Price History completo)',
      'Estado de Resultados (P&L) Mensual con Utilidad Neta Real',
    ],
  },
];

// ============================================================================
// LOTES REALES DEL EXCEL (STELLA, WAYUU Y GEORGINA 3 & 4)
// ============================================================================
export const BATCH_IDS = {
  WAYUU: '00000000-0000-0000-0000-000000000101',
  STELLA: '00000000-0000-0000-0000-000000000102',
  GEORGINA_3: '00000000-0000-0000-0000-000000000103',
  GEORGINA_4: '00000000-0000-0000-0000-000000000104',
};

export const REAL_BATCHES: Batch[] = [
  {
    id: BATCH_IDS.WAYUU,
    tenant_id: TENANT_STELLA_ID,
    name: '1. Línea Wayuu (Edición Stella)',
    shipping_cost_usd: 0.00,
    amazon_fee_usd: 0.00,
    dhl_tax_usd: 0.00,
    total_batch_investment_usd: 60.00,
    created_at: '2026-10-01T10:00:00Z',
  },
  {
    id: BATCH_IDS.STELLA,
    tenant_id: TENANT_STELLA_ID,
    name: '2. Inventario Stella (Colección Principal)',
    shipping_cost_usd: 0.00,
    amazon_fee_usd: 0.00,
    dhl_tax_usd: 0.00,
    total_batch_investment_usd: 577.30,
    created_at: '2026-10-05T10:00:00Z',
  },
  {
    id: BATCH_IDS.GEORGINA_3,
    tenant_id: TENANT_STELLA_ID,
    name: '3. Inventario 3 - Georgina (Actualizado)',
    shipping_cost_usd: 50.80,
    amazon_fee_usd: 0.00,
    dhl_tax_usd: 17.20,
    total_batch_investment_usd: 288.40,
    created_at: '2026-10-15T10:00:00Z',
  },
  {
    id: BATCH_IDS.GEORGINA_4,
    tenant_id: TENANT_STELLA_ID,
    name: '4. Inventario 4 - Georgina (Códigos Proveedores)',
    shipping_cost_usd: 33.84,
    amazon_fee_usd: 39.96,
    dhl_tax_usd: 14.40,
    total_batch_investment_usd: 390.30,
    created_at: '2026-10-25T10:00:00Z',
  },
];

// Helper para deducir nombre descriptivo según el prefijo del código real
function inferProductName(sku: string, batchLabel: string): string {
  const upper = sku.toUpperCase();
  if (upper.startsWith('WAYUU')) return `${sku} — Bolso Artesanal Colección Wayuu`;
  if (upper.startsWith('AN')) return `Anillo Diseño ${sku} (${batchLabel})`;
  if (upper.startsWith('AR-') || upper.startsWith('AR0') || upper.startsWith('AR5')) {
    return `Aretes ${sku} (${batchLabel})`;
  }
  if (upper.startsWith('ARETE')) return `Arete Corazón Edición Especial (${batchLabel})`;
  if (upper.startsWith('CN')) return `Collar / Cadena ${sku} (${batchLabel})`;
  if (upper.startsWith('PU')) return `Pulsera ${sku} (${batchLabel})`;
  if (upper.startsWith('EC')) return `Ear Cuff / Accesorio ${sku} (${batchLabel})`;
  if (upper.startsWith('JEW')) return `Joya Set Especial ${sku} (${batchLabel})`;
  if (upper.startsWith('TOP')) return `Topos / Aretes ${sku} (${batchLabel})`;
  return `Pieza ${sku} (${batchLabel})`;
}

interface RawItemSeed {
  sku: string;
  name?: string;
  batch_id: string;
  batchLabel: string;
  stock: number;
  base_cost_usd: number;
  landed_cost_usd: number;
  price_usd: number;
  price_nio: number;
}

const RAW_PRODUCTS_SEED: RawItemSeed[] = [
  // ==========================================================================
  // 1. LÍNEA WAYUU (Edición Stella / Colección Wayuu)
  // ==========================================================================
  { sku: 'Wayuu Aqua', name: 'Bolso Wayuu Aqua (Colección Wayuu)', batch_id: BATCH_IDS.WAYUU, batchLabel: 'Wayuu', stock: 1, base_cost_usd: 20, landed_cost_usd: 20, price_usd: 43.69, price_nio: 1600 },
  { sku: 'Wayuu Rojo', name: 'Bolso Wayuu Rojo (Colección Wayuu)', batch_id: BATCH_IDS.WAYUU, batchLabel: 'Wayuu', stock: 1, base_cost_usd: 20, landed_cost_usd: 20, price_usd: 43.69, price_nio: 1600 },
  { sku: 'Wayuu Rosado', name: 'Bolso Wayuu Rosado (Colección Wayuu)', batch_id: BATCH_IDS.WAYUU, batchLabel: 'Wayuu', stock: 1, base_cost_usd: 20, landed_cost_usd: 20, price_usd: 43.69, price_nio: 1600 },

  // ==========================================================================
  // 2. INVENTARIO STELLA (40 referencias)
  // ==========================================================================
  { sku: 'AR-297-T51', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 10, landed_cost_usd: 10, price_usd: 16.38, price_nio: 600 },
  { sku: 'AR-301-T30', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 11, landed_cost_usd: 11, price_usd: 18.02, price_nio: 660 },
  { sku: 'AR-301-T30 CELESTE', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 11, landed_cost_usd: 11, price_usd: 18.02, price_nio: 660 },
  { sku: 'AR-302-T44C', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 13, landed_cost_usd: 13, price_usd: 21.29, price_nio: 780 },
  { sku: 'AR-302-T65', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 13, landed_cost_usd: 13, price_usd: 21.29, price_nio: 780 },
  { sku: 'AR-302-T75', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 13, landed_cost_usd: 13, price_usd: 21.29, price_nio: 780 },
  { sku: 'AR-311-11', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 10, landed_cost_usd: 10, price_usd: 16.38, price_nio: 600 },
  { sku: 'AR-311-19', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 10, landed_cost_usd: 10, price_usd: 16.38, price_nio: 600 },
  { sku: 'AR-311-5', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 10, landed_cost_usd: 10, price_usd: 16.38, price_nio: 600 },
  { sku: 'AR-312-10C', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 16, landed_cost_usd: 16, price_usd: 28.66, price_nio: 1050 },
  { sku: 'AR-316-26', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 16, landed_cost_usd: 16, price_usd: 16.38, price_nio: 600 },
  { sku: 'AR-316-4', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 16, landed_cost_usd: 16, price_usd: 16.38, price_nio: 600 },
  { sku: 'AR-336-4C', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 16, landed_cost_usd: 16, price_usd: 28.66, price_nio: 1050 },
  { sku: 'AR-336-19C', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 16, landed_cost_usd: 16, price_usd: 28.66, price_nio: 1050 },
  { sku: 'AR-342-T175', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 18, landed_cost_usd: 18, price_usd: 31.39, price_nio: 1150 },
  { sku: 'AR-342-T56', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 18, landed_cost_usd: 18, price_usd: 31.39, price_nio: 1150 },
  { sku: 'AR-353-T48', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 10, landed_cost_usd: 10, price_usd: 16.38, price_nio: 600 },
  { sku: 'AR-353-T75', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 10, landed_cost_usd: 10, price_usd: 16.38, price_nio: 600 },
  { sku: 'AR-398-19C', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 14, landed_cost_usd: 14, price_usd: 23.20, price_nio: 850 },
  { sku: 'AR-398-6C', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 14, landed_cost_usd: 14, price_usd: 23.20, price_nio: 850 },
  { sku: 'AR-402-6 NARA', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 18, landed_cost_usd: 18, price_usd: 31.39, price_nio: 1150 },
  { sku: 'AR-402-7C', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 18, landed_cost_usd: 18, price_usd: 31.39, price_nio: 1150 },
  { sku: 'AR-449-38', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 25, landed_cost_usd: 25, price_usd: 43.67, price_nio: 1600 },
  { sku: 'AR-450-105', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 25, landed_cost_usd: 25, price_usd: 43.67, price_nio: 1600 },
  { sku: 'AR-462-1C', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 16, landed_cost_usd: 16, price_usd: 28.66, price_nio: 1050 },
  { sku: 'AR-477 Na', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 20, landed_cost_usd: 20, price_usd: 34.94, price_nio: 1280 },
  { sku: 'AR-477 RO', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 20, landed_cost_usd: 20, price_usd: 34.94, price_nio: 1280 },
  { sku: 'AR-505-27', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 18, landed_cost_usd: 18, price_usd: 31.39, price_nio: 1150 },
  { sku: 'AR-975-12C', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 13, landed_cost_usd: 13, price_usd: 21.29, price_nio: 780 },
  { sku: 'AR541-2-48', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 10.50, landed_cost_usd: 10.50, price_usd: 17.74, price_nio: 650 },
  { sku: 'JEW-205326', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 23.35, landed_cost_usd: 23.35, price_usd: 25.93, price_nio: 950 },
  { sku: 'JEW118321', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 14, landed_cost_usd: 14, price_usd: 16.38, price_nio: 600 },
  { sku: 'JEW118321 / ROSA', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 14, landed_cost_usd: 14, price_usd: 16.38, price_nio: 600 },
  { sku: 'PU-499-3', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 16.07, landed_cost_usd: 16.07, price_usd: 19.11, price_nio: 700 },
  { sku: 'PU-832', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 18, landed_cost_usd: 18, price_usd: 31.39, price_nio: 1150 },
  { sku: 'PU-975-1', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 13, landed_cost_usd: 13, price_usd: 21.29, price_nio: 780 },
  { sku: 'PU203-T21/31', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 18, landed_cost_usd: 18, price_usd: 31.39, price_nio: 1150 },
  { sku: 'Top-035-14', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 10.88, landed_cost_usd: 10.88, price_usd: 18.48, price_nio: 677 },
  { sku: 'Top-036-T50', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 12, landed_cost_usd: 12, price_usd: 15.01, price_nio: 550 },
  { sku: 'ARETE CORAZON', batch_id: BATCH_IDS.STELLA, batchLabel: 'Edición Stella', stock: 1, base_cost_usd: 12.00, landed_cost_usd: 12.00, price_usd: 20.25, price_nio: 742 },

  // ==========================================================================
  // 3. INVENTARIO 3 - GEORGINA (Línea Georgina / Actualizado)
  // Incluye Costo Base (Valor Unitario) y Costo Unitario Landed (+Envío $1.27 +DHL $0.43)
  // ==========================================================================
  { sku: 'AN02144', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 4.20, landed_cost_usd: 5.90, price_usd: 10.92, price_nio: 400 },
  { sku: 'AN02107', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 4.00, landed_cost_usd: 5.70, price_usd: 10.55, price_nio: 390 },
  { sku: 'AN02092', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 4.00, landed_cost_usd: 5.70, price_usd: 10.55, price_nio: 390 },
  { sku: 'AN02134', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 4.20, landed_cost_usd: 5.90, price_usd: 10.92, price_nio: 400 },
  { sku: 'AN02146', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 4.20, landed_cost_usd: 5.90, price_usd: 10.92, price_nio: 400 },
  { sku: 'AR02064', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 1.90, landed_cost_usd: 3.60, price_usd: 6.66, price_nio: 250 },
  { sku: 'AR02070', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 2, base_cost_usd: 1.90, landed_cost_usd: 3.60, price_usd: 6.66, price_nio: 250 },
  { sku: 'AR02072', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 2.40, landed_cost_usd: 4.10, price_usd: 7.59, price_nio: 280 },
  { sku: 'AR02081', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 2, base_cost_usd: 2.40, landed_cost_usd: 4.10, price_usd: 7.59, price_nio: 280 },
  { sku: 'AR01928', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 2, base_cost_usd: 1.50, landed_cost_usd: 3.20, price_usd: 5.92, price_nio: 220 },
  { sku: 'AR01993', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 4.20, landed_cost_usd: 5.90, price_usd: 10.92, price_nio: 400 },
  { sku: 'AR02111', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 4.70, landed_cost_usd: 6.40, price_usd: 11.84, price_nio: 440 },
  { sku: 'AR02113', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 2, base_cost_usd: 5.80, landed_cost_usd: 7.50, price_usd: 13.88, price_nio: 510 },
  { sku: 'AR02068', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 3, base_cost_usd: 3.00, landed_cost_usd: 4.70, price_usd: 8.70, price_nio: 320 },
  { sku: 'AR01825', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 4.00, landed_cost_usd: 5.70, price_usd: 10.55, price_nio: 390 },
  { sku: 'AR02140', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 4.20, landed_cost_usd: 5.90, price_usd: 10.92, price_nio: 400 },
  { sku: 'AR01826', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 4.20, landed_cost_usd: 5.90, price_usd: 10.92, price_nio: 400 },
  { sku: 'AR02075', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 7.60, landed_cost_usd: 9.30, price_usd: 17.21, price_nio: 630 },
  { sku: 'AR02154', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 7.60, landed_cost_usd: 9.30, price_usd: 17.21, price_nio: 630 },
  { sku: 'AR02069', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 2, base_cost_usd: 7.90, landed_cost_usd: 9.60, price_usd: 17.76, price_nio: 650 },
  { sku: 'CN02153', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 5.70, landed_cost_usd: 7.40, price_usd: 13.69, price_nio: 500 },
  { sku: 'CN02003', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 6.00, landed_cost_usd: 7.70, price_usd: 14.25, price_nio: 520 },
  { sku: 'CN02008', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 9.70, landed_cost_usd: 11.40, price_usd: 21.09, price_nio: 780 },
  { sku: 'PU02020', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 5.00, landed_cost_usd: 6.70, price_usd: 12.40, price_nio: 460 },
  { sku: 'PU02007', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 2, base_cost_usd: 2.80, landed_cost_usd: 4.50, price_usd: 8.33, price_nio: 310 },
  { sku: 'PU02037', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 5.00, landed_cost_usd: 6.70, price_usd: 12.40, price_nio: 460 },
  { sku: 'AN02090', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 4.00, landed_cost_usd: 5.70, price_usd: 10.55, price_nio: 390 },
  { sku: 'AR02079', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 4.60, landed_cost_usd: 6.30, price_usd: 11.66, price_nio: 430 },
  { sku: 'AR02136', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 5.70, landed_cost_usd: 7.40, price_usd: 13.69, price_nio: 500 },
  { sku: 'AR02067', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 5.40, landed_cost_usd: 7.10, price_usd: 13.14, price_nio: 480 },
  { sku: 'CN02013', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 5.00, landed_cost_usd: 6.70, price_usd: 12.40, price_nio: 460 },
  { sku: 'CN02004', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 5.70, landed_cost_usd: 7.40, price_usd: 13.69, price_nio: 500 },
  { sku: 'PU01937', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 7.00, landed_cost_usd: 8.70, price_usd: 16.10, price_nio: 590 },
  { sku: 'AR01973', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 5.50, landed_cost_usd: 7.20, price_usd: 13.32, price_nio: 490 },
  { sku: 'AR02116', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 7.30, landed_cost_usd: 9.00, price_usd: 16.65, price_nio: 610 },
  { sku: 'AR02148', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 11.40, landed_cost_usd: 13.10, price_usd: 24.24, price_nio: 500 },
  { sku: 'AR01976', batch_id: BATCH_IDS.GEORGINA_3, batchLabel: 'Georgina Lote 3', stock: 1, base_cost_usd: 12.40, landed_cost_usd: 14.10, price_usd: 26.09, price_nio: 540 },

  // ==========================================================================
  // 4. INVENTARIO 4 - GEORGINA (Línea Georgina / Códigos Proveedores)
  // Incluye Costo Real Base y Costo Landed (+Amazon $1.11 +Envío $0.94 +DHL $0.40)
  // ==========================================================================
  { sku: 'EC01609', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 2.60, landed_cost_usd: 5.05, price_usd: 9.34, price_nio: 345 },
  { sku: 'EC01748', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 2.70, landed_cost_usd: 5.15, price_usd: 9.53, price_nio: 350 },
  { sku: 'EC01744', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 2.70, landed_cost_usd: 5.15, price_usd: 9.53, price_nio: 350 },
  { sku: 'AN01732', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 4.00, landed_cost_usd: 6.45, price_usd: 11.93, price_nio: 440 },
  { sku: 'AN01685', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 3.70, landed_cost_usd: 6.15, price_usd: 11.38, price_nio: 420 },
  { sku: 'AN01815', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 7.20, landed_cost_usd: 9.65, price_usd: 17.85, price_nio: 660 },
  { sku: 'AN01733', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 4.00, landed_cost_usd: 6.45, price_usd: 11.93, price_nio: 440 },
  { sku: 'AN01998', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 3.70, landed_cost_usd: 6.15, price_usd: 11.38, price_nio: 420 },
  { sku: 'AN01731', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 4.70, landed_cost_usd: 7.15, price_usd: 13.23, price_nio: 490 },
  { sku: 'AN01817', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 3.20, landed_cost_usd: 5.65, price_usd: 10.45, price_nio: 390 },
  { sku: 'AN01854', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 2, base_cost_usd: 12.50, landed_cost_usd: 14.95, price_usd: 27.66, price_nio: 1015 },
  { sku: 'AN01851', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 19.10, landed_cost_usd: 21.55, price_usd: 34.48, price_nio: 1253 },
  { sku: 'AN01853', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 14.40, landed_cost_usd: 16.85, price_usd: 31.17, price_nio: 1150 },
  { sku: 'AR01931', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 11.80, landed_cost_usd: 14.25, price_usd: 26.36, price_nio: 570 },
  { sku: 'AR02000', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 11.80, landed_cost_usd: 14.25, price_usd: 26.36, price_nio: 570 },
  { sku: 'AR01995', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 3.50, landed_cost_usd: 5.95, price_usd: 11.01, price_nio: 400 },
  { sku: 'AR01598', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 5.00, landed_cost_usd: 7.45, price_usd: 13.78, price_nio: 510 },
  { sku: 'AR01602', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 5.70, landed_cost_usd: 8.15, price_usd: 15.08, price_nio: 560 },
  { sku: 'AR01613', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 2, base_cost_usd: 5.70, landed_cost_usd: 8.15, price_usd: 15.08, price_nio: 560 },
  { sku: 'AR01975', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 6.50, landed_cost_usd: 8.95, price_usd: 16.56, price_nio: 610 },
  { sku: 'AR01824', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 8.50, landed_cost_usd: 10.95, price_usd: 20.26, price_nio: 750 },
  { sku: 'AR01827', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 5.20, landed_cost_usd: 7.65, price_usd: 14.15, price_nio: 520 },
  { sku: 'AR01828', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 8.30, landed_cost_usd: 10.75, price_usd: 19.89, price_nio: 730 },
  { sku: 'AR01830', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 6.50, landed_cost_usd: 8.95, price_usd: 16.56, price_nio: 600 },
  { sku: 'AR01867', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 15.50, landed_cost_usd: 17.95, price_usd: 33.21, price_nio: 1220 },
  { sku: 'AR01859', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 22.70, landed_cost_usd: 25.15, price_usd: 46.53, price_nio: 1705 },
  { sku: 'PU01887', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 5.70, landed_cost_usd: 8.15, price_usd: 15.08, price_nio: 560 },
  { sku: 'PU01880', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 5.70, landed_cost_usd: 8.15, price_usd: 15.08, price_nio: 560 },
  { sku: 'PU01902', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 10.00, landed_cost_usd: 12.45, price_usd: 23.03, price_nio: 510 },
  { sku: 'PU01885', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 16.00, landed_cost_usd: 18.45, price_usd: 34.13, price_nio: 710 },
  { sku: 'PU01913', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 14.00, landed_cost_usd: 16.45, price_usd: 30.43, price_nio: 640 },
  { sku: 'CN01882', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 10.10, landed_cost_usd: 12.55, price_usd: 23.22, price_nio: 850 },
  { sku: 'CN01879', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 10.10, landed_cost_usd: 12.55, price_usd: 23.22, price_nio: 850 },
  { sku: 'CN01910', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 9.10, landed_cost_usd: 11.55, price_usd: 21.37, price_nio: 790 },
  { sku: 'CN01896', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 10.10, landed_cost_usd: 12.55, price_usd: 23.22, price_nio: 850 },
  { sku: 'CN01894', batch_id: BATCH_IDS.GEORGINA_4, batchLabel: 'Georgina Lote 4', stock: 1, base_cost_usd: 10.10, landed_cost_usd: 12.55, price_usd: 23.22, price_nio: 850 },
];

export const REAL_PRODUCTS: Product[] = RAW_PRODUCTS_SEED.map((item, idx) => ({
  id: `00000000-0000-0000-0001-${String(idx + 1).padStart(12, '0')}`,
  tenant_id: TENANT_STELLA_ID,
  batch_id: item.batch_id,
  sku: item.sku,
  name: item.name || inferProductName(item.sku, item.batchLabel),
  stock_current: item.stock,
  base_cost_usd: item.base_cost_usd,
  landed_cost_usd: item.landed_cost_usd,
  price_usd: item.price_usd,
  price_nio: item.price_nio,
  created_at: '2026-10-15T10:00:00Z',
  updated_at: '2026-11-01T10:00:00Z',
}));

// ============================================================================
// VENTAS DEMO INICIALES CON SNAPSHOTS INMUTABLES (SOBRE EL INVENTARIO REAL)
// ============================================================================
export const INITIAL_SALES_HEADERS: SalesHeader[] = [
  {
    id: 'sale-hdr-001',
    tenant_id: TENANT_STELLA_ID,
    created_by: '00000000-0000-0000-0000-000000000099',
    entry_mode: 'single_sale',
    sale_date: '2026-11-06',
    promo_tag: 'Cliente Showroom',
    notes: 'Venta en vivo colección Wayuu + Stella',
    created_at: '2026-11-06T15:30:00Z',
  },
  {
    id: 'sale-hdr-002',
    tenant_id: TENANT_STELLA_ID,
    created_by: '00000000-0000-0000-0000-000000000099',
    entry_mode: 'daily_closing_excel',
    sale_date: '2026-11-07',
    promo_tag: 'Cierre Viernes',
    notes: 'Cierre diario importado desde Excel (Línea Georgina 3 y 4)',
    created_at: '2026-11-07T19:10:00Z',
  },
  {
    id: 'sale-hdr-003',
    tenant_id: TENANT_STELLA_ID,
    created_by: '00000000-0000-0000-0000-000000000099',
    entry_mode: 'daily_closing_manual',
    sale_date: '2026-11-08',
    promo_tag: 'Promo Fin de Semana',
    notes: 'Salidas marcadas por checklist manual hoy',
    created_at: '2026-11-08T14:20:00Z',
  },
];

export const INITIAL_SALES_ITEMS: SalesItem[] = [
  {
    id: 'sale-itm-001',
    tenant_id: TENANT_STELLA_ID,
    sale_header_id: 'sale-hdr-001',
    product_id: REAL_PRODUCTS[0].id, // Wayuu Aqua
    sku_snapshot: 'Wayuu Aqua',
    product_name_snapshot: 'Bolso Wayuu Aqua (Colección Wayuu)',
    batch_id_snapshot: BATCH_IDS.WAYUU,
    quantity: 1,
    unit_cost_usd_snapshot: 20.00,
    list_price_usd_snapshot: 43.69,
    list_price_nio_snapshot: 1600.00,
    discount_nio: 0,
    final_unit_price_nio: 1600.00,
    final_unit_price_usd: 43.69,
    exchange_rate_snapshot: 36.62,
    net_profit_usd: 23.69,
    created_at: '2026-11-06T15:30:00Z',
  },
  {
    id: 'sale-itm-002',
    tenant_id: TENANT_STELLA_ID,
    sale_header_id: 'sale-hdr-001',
    product_id: REAL_PRODUCTS[12].id, // AR-312-10C
    sku_snapshot: 'AR-312-10C',
    product_name_snapshot: 'Aretes AR-312-10C (Edición Stella)',
    batch_id_snapshot: BATCH_IDS.STELLA,
    quantity: 1,
    unit_cost_usd_snapshot: 16.00,
    list_price_usd_snapshot: 28.66,
    list_price_nio_snapshot: 1050.00,
    discount_nio: 50.00,
    final_unit_price_nio: 1000.00,
    final_unit_price_usd: 27.31,
    exchange_rate_snapshot: 36.62,
    net_profit_usd: 11.31,
    created_at: '2026-11-06T15:30:00Z',
  },
  {
    id: 'sale-itm-003',
    tenant_id: TENANT_STELLA_ID,
    sale_header_id: 'sale-hdr-002',
    product_id: REAL_PRODUCTS[43].id, // AN02144
    sku_snapshot: 'AN02144',
    product_name_snapshot: 'Anillo Diseño AN02144 (Georgina Lote 3)',
    batch_id_snapshot: BATCH_IDS.GEORGINA_3,
    quantity: 1,
    unit_cost_usd_snapshot: 5.90,
    list_price_usd_snapshot: 10.92,
    list_price_nio_snapshot: 400.00,
    discount_nio: 0,
    final_unit_price_nio: 400.00,
    final_unit_price_usd: 10.92,
    exchange_rate_snapshot: 36.62,
    net_profit_usd: 5.02,
    created_at: '2026-11-07T19:10:00Z',
  },
  {
    id: 'sale-itm-004',
    tenant_id: TENANT_STELLA_ID,
    sale_header_id: 'sale-hdr-002',
    product_id: REAL_PRODUCTS[65].id, // CN02008
    sku_snapshot: 'CN02008',
    product_name_snapshot: 'Collar / Cadena CN02008 (Georgina Lote 3)',
    batch_id_snapshot: BATCH_IDS.GEORGINA_3,
    quantity: 1,
    unit_cost_usd_snapshot: 11.40,
    list_price_usd_snapshot: 21.09,
    list_price_nio_snapshot: 780.00,
    discount_nio: 0,
    final_unit_price_nio: 780.00,
    final_unit_price_usd: 21.30,
    exchange_rate_snapshot: 36.62,
    net_profit_usd: 9.90,
    created_at: '2026-11-07T19:10:00Z',
  },
  {
    id: 'sale-itm-005',
    tenant_id: TENANT_STELLA_ID,
    sale_header_id: 'sale-hdr-003',
    product_id: REAL_PRODUCTS[90].id, // AN01854
    sku_snapshot: 'AN01854',
    product_name_snapshot: 'Anillo Diseño AN01854 (Georgina Lote 4)',
    batch_id_snapshot: BATCH_IDS.GEORGINA_4,
    quantity: 1,
    unit_cost_usd_snapshot: 14.95,
    list_price_usd_snapshot: 27.66,
    list_price_nio_snapshot: 1015.00,
    discount_nio: 15.00,
    final_unit_price_nio: 1000.00,
    final_unit_price_usd: 27.31,
    exchange_rate_snapshot: 36.62,
    net_profit_usd: 12.36,
    created_at: '2026-11-08T14:20:00Z',
  },
  {
    id: 'sale-itm-006',
    tenant_id: TENANT_STELLA_ID,
    sale_header_id: 'sale-hdr-003',
    product_id: REAL_PRODUCTS[105].id, // AR01859
    sku_snapshot: 'AR01859',
    product_name_snapshot: 'Aretes AR01859 (Georgina Lote 4)',
    batch_id_snapshot: BATCH_IDS.GEORGINA_4,
    quantity: 1,
    unit_cost_usd_snapshot: 25.15,
    list_price_usd_snapshot: 46.53,
    list_price_nio_snapshot: 1705.00,
    discount_nio: 0,
    final_unit_price_nio: 1705.00,
    final_unit_price_usd: 46.56,
    exchange_rate_snapshot: 36.62,
    net_profit_usd: 21.41,
    created_at: '2026-11-08T14:20:00Z',
  },
];

// ============================================================================
// HISTORIAL DE AUDITORÍA DE PRECIOS INICIAL (NIVEL 3)
// ============================================================================
export const INITIAL_PRICE_HISTORY: PriceHistory[] = [
  {
    id: 'ph-001',
    tenant_id: TENANT_STELLA_ID,
    product_id: REAL_PRODUCTS[43].id, // AN02144
    old_cost_usd: 4.20,
    new_cost_usd: 5.90,
    old_price_usd: 9.50,
    new_price_usd: 10.92,
    old_price_nio: 350,
    new_price_nio: 400,
    reason: 'Prorrateo Lote 3 Georgina (+Envío $1.27 +DHL $0.43)',
    changed_at: '2026-10-16T11:20:00Z',
  },
  {
    id: 'ph-002',
    tenant_id: TENANT_STELLA_ID,
    product_id: REAL_PRODUCTS[80].id, // EC01609
    old_cost_usd: 2.60,
    new_cost_usd: 5.05,
    old_price_usd: 8.00,
    new_price_usd: 9.34,
    old_price_nio: 295,
    new_price_nio: 345,
    reason: 'Prorrateo Lote 4 Georgina (+Amazon $1.11 +Envío $0.94 +DHL $0.40)',
    changed_at: '2026-10-26T09:45:00Z',
  },
  {
    id: 'ph-003',
    tenant_id: TENANT_STELLA_ID,
    product_id: REAL_PRODUCTS[25].id, // AR-449-38
    old_cost_usd: 25.00,
    new_cost_usd: 25.00,
    old_price_usd: 40.96,
    new_price_usd: 43.67,
    old_price_nio: 1500,
    new_price_nio: 1600,
    reason: 'Ajuste comercial colección Stella',
    changed_at: '2026-11-02T16:15:00Z',
  },
  {
    id: 'ph-004',
    tenant_id: TENANT_STELLA_ID,
    product_id: REAL_PRODUCTS[93].id, // AR01931
    old_cost_usd: 14.25,
    new_cost_usd: 14.25,
    old_price_usd: 26.36,
    new_price_usd: 26.36,
    old_price_nio: 966,
    new_price_nio: 570,
    reason: 'Redondeo promocional Precio Final (C$ 966 -> C$ 570)',
    changed_at: '2026-11-04T12:00:00Z',
  },
];

// ============================================================================
// GASTOS OPERATIVOS INICIALES (NIVEL 2 y 3)
// ============================================================================
export const INITIAL_OPERATING_EXPENSES: OperatingExpense[] = [
  {
    id: 'exp-001',
    tenant_id: TENANT_STELLA_ID,
    category: 'empaque',
    description: 'Bolsas de terciopelo, cajas de regalo y tarjetas Stella & Georgina',
    amount_usd: 18.50,
    amount_nio: 677.47,
    expense_date: '2026-11-02',
    created_at: '2026-11-02T10:00:00Z',
  },
  {
    id: 'exp-002',
    tenant_id: TENANT_STELLA_ID,
    category: 'publicidad',
    description: 'Pauta Instagram & Facebook Ads — Colección Wayuu y Georgina',
    amount_usd: 25.00,
    amount_nio: 915.50,
    expense_date: '2026-11-05',
    created_at: '2026-11-05T14:00:00Z',
  },
  {
    id: 'exp-003',
    tenant_id: TENANT_STELLA_ID,
    category: 'envio_local',
    description: 'Motorizado entregas Managua (3 envíos subsidiados)',
    amount_usd: 8.20,
    amount_nio: 300.28,
    expense_date: '2026-11-07',
    created_at: '2026-11-07T18:00:00Z',
  },
];

// ============================================================================
// MOVIMIENTOS DE KARDEX Y AUDITORÍA DE BODEGA (NIVEL 3)
// ============================================================================
export const INITIAL_KARDEX_MOVEMENTS: KardexMovement[] = [
  {
    id: 'kdx-001',
    tenant_id: TENANT_STELLA_ID,
    product_id: REAL_PRODUCTS[56].id, // AR02068
    sku: 'AR02068',
    product_name: 'Aretes AR02068 (Georgina Lote 3)',
    movement_type: 'consignacion_salida',
    location: 'Showroom Aliado — Galerías',
    quantity_delta: -1,
    stock_before: 4,
    stock_after: 3,
    unit_cost_usd: 4.70,
    reason: 'Traslado a exhibición en consignación',
    created_by_name: 'Dirección General',
    created_at: '2026-11-03T11:00:00Z',
  },
  {
    id: 'kdx-002',
    tenant_id: TENANT_STELLA_ID,
    product_id: REAL_PRODUCTS[49].id, // AR02070
    sku: 'AR02070',
    product_name: 'Aretes AR02070 (Georgina Lote 3)',
    movement_type: 'merma_dano',
    location: 'Bodega Principal',
    quantity_delta: -1,
    stock_before: 3,
    stock_after: 2,
    unit_cost_usd: 3.60,
    reason: 'Broche averiado en revisión de control de calidad',
    created_by_name: 'Dirección General',
    created_at: '2026-11-05T16:40:00Z',
  },
];

// ============================================================================
// PERFILES DE EQUIPO INICIALES (GESTIÓN DE ASIENTOS NIVEL 2 y 3)
// ============================================================================
export const INITIAL_TEAM_PROFILES: Profile[] = [
  {
    id: '00000000-0000-0000-0000-000000000099',
    tenant_id: TENANT_STELLA_ID,
    full_name: 'Stella & Georgina (Dueña Global)',
    role: 'global_owner',
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000105',
    tenant_id: TENANT_STELLA_ID,
    full_name: 'Valeria Morales (Vendedora Sala)',
    role: 'seller',
    created_at: '2026-10-12T09:30:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000106',
    tenant_id: TENANT_STELLA_ID,
    full_name: 'Camila Rivas (Vendedora Turno PM / WhatsApp)',
    role: 'seller',
    created_at: '2026-10-20T14:00:00Z',
  },
];

// ============================================================================
// STORAGE KEYS & DATA SYNCHRONIZATION HELPERS
// ============================================================================
export const STORAGE_KEYS = {
  DATA_VERSION: 'gabi_studio_data_version',
  PRODUCTS: 'gabi_studio_products',
  BATCHES: 'gabi_studio_batches',
  SALES_HEADERS: 'gabi_studio_sales_headers',
  SALES_ITEMS: 'gabi_studio_sales_items',
  PRICE_HISTORY: 'gabi_studio_price_history',
  EXPENSES: 'gabi_studio_operating_expenses',
  KARDEX: 'gabi_studio_kardex_movements',
  TEAM_PROFILES: 'gabi_studio_team_profiles',
};

const CURRENT_DATA_VERSION = 'stella-georgina-v1';

export function ensureRealInventorySeeded(forceReset = false): void {
  const currentVersion = localStorage.getItem(STORAGE_KEYS.DATA_VERSION);
  if (forceReset || currentVersion !== CURRENT_DATA_VERSION) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(REAL_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(REAL_BATCHES));
    localStorage.setItem(STORAGE_KEYS.SALES_HEADERS, JSON.stringify(INITIAL_SALES_HEADERS));
    localStorage.setItem(STORAGE_KEYS.SALES_ITEMS, JSON.stringify(INITIAL_SALES_ITEMS));
    localStorage.setItem(STORAGE_KEYS.PRICE_HISTORY, JSON.stringify(INITIAL_PRICE_HISTORY));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(INITIAL_OPERATING_EXPENSES));
    localStorage.setItem(STORAGE_KEYS.KARDEX, JSON.stringify(INITIAL_KARDEX_MOVEMENTS));
    localStorage.setItem(STORAGE_KEYS.TEAM_PROFILES, JSON.stringify(INITIAL_TEAM_PROFILES));
    localStorage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
  }
}

export function getStoredProducts(): Product[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  return raw ? JSON.parse(raw) : REAL_PRODUCTS;
}

export function saveStoredProducts(products: Product[]): void {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

export function getStoredBatches(): Batch[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.BATCHES);
  return raw ? JSON.parse(raw) : REAL_BATCHES;
}

export function saveStoredBatches(batches: Batch[]): void {
  localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(batches));
}

export function getStoredSalesHeaders(): SalesHeader[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.SALES_HEADERS);
  return raw ? JSON.parse(raw) : INITIAL_SALES_HEADERS;
}

export function saveStoredSalesHeaders(headers: SalesHeader[]): void {
  localStorage.setItem(STORAGE_KEYS.SALES_HEADERS, JSON.stringify(headers));
}

export function getStoredSalesItems(): SalesItem[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.SALES_ITEMS);
  return raw ? JSON.parse(raw) : INITIAL_SALES_ITEMS;
}

export function saveStoredSalesItems(items: SalesItem[]): void {
  localStorage.setItem(STORAGE_KEYS.SALES_ITEMS, JSON.stringify(items));
}

export function getStoredPriceHistory(): PriceHistory[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.PRICE_HISTORY);
  return raw ? JSON.parse(raw) : INITIAL_PRICE_HISTORY;
}

export function saveStoredPriceHistory(history: PriceHistory[]): void {
  localStorage.setItem(STORAGE_KEYS.PRICE_HISTORY, JSON.stringify(history));
}

export function getStoredExpenses(): OperatingExpense[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
  return raw ? JSON.parse(raw) : INITIAL_OPERATING_EXPENSES;
}

export function saveStoredExpenses(expenses: OperatingExpense[]): void {
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
}

export function getStoredKardex(): KardexMovement[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.KARDEX);
  return raw ? JSON.parse(raw) : INITIAL_KARDEX_MOVEMENTS;
}

export function saveStoredKardex(movements: KardexMovement[]): void {
  localStorage.setItem(STORAGE_KEYS.KARDEX, JSON.stringify(movements));
}

export function getStoredTeamProfiles(): Profile[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.TEAM_PROFILES);
  return raw ? JSON.parse(raw) : INITIAL_TEAM_PROFILES;
}

export function saveStoredTeamProfiles(profiles: Profile[]): void {
  localStorage.setItem(STORAGE_KEYS.TEAM_PROFILES, JSON.stringify(profiles));
}

