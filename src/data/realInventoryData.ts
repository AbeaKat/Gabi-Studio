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
import { supabaseAdmin } from '../lib/supabase';

export const TENANT_STELLA_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_EXCHANGE_RATE = 36.62;
export const OFFICIAL_WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '50588888888';

// ============================================================================
// DETALLES INFORMATIVOS DE CADA TIPO DE CUENTA Y PLAN
// ============================================================================
export const TEST_ACCOUNT_PRESETS: TestAccountPreset[] = [
  {
    id: 'tier1-owner',
    label: 'Plan Básico (Cuenta Dueño)',
    badge: 'Nivel 1 • Plan Básico',
    email: '',
    username: '',
    password: '',
    plan_tier: 1,
    role: 'global_owner',
    full_name: 'Cuenta Dueño Nivel 1',
    tenant_name: 'Plan Básico',
    max_owner_profiles: 1,
    max_seller_profiles: 0,
    extra_paid_profiles: 0,
    description:
      'Diseñada para negocios individuales donde el dueño lleva el control directo de sus productos, ventas diarias y ganancias.',
    highlights: [
      '1 Cuenta Dueño incluida (uso individual)',
      'Personalización de nombre de tienda, foto y paleta de colores',
      'Catálogo de productos, alertas de stock bajo y ventas en C$ / US$',
    ],
  },
  {
    id: 'tier2-owner',
    label: 'Plan Crece (Dueño + 1 Empleado)',
    badge: 'Nivel 2 • Plan Crece',
    email: '',
    username: '',
    password: '',
    plan_tier: 2,
    role: 'global_owner',
    full_name: 'Cuenta Dueño Nivel 2',
    tenant_name: 'Plan Crece',
    max_owner_profiles: 1,
    max_seller_profiles: 1,
    extra_paid_profiles: 0,
    description:
      'Ideal para negocios en crecimiento que delegan la atención en mostrador y necesitan calcular costos reales de importación.',
    highlights: [
      '1 Cuenta Dueño + 1 Cuenta Empleado asociada',
      'Calculadora de costos de compra (prorrateo de envío e impuestos)',
      'Control de gastos operativos del mes y cuentas por cobrar (abonos)',
    ],
  },
  {
    id: 'tier3-owner',
    label: 'Plan Pro (Dueño + Equipo Completo)',
    badge: 'Nivel 3 • Plan Pro',
    email: '',
    username: '',
    password: '',
    plan_tier: 3,
    role: 'global_owner',
    full_name: 'Cuenta Dueño Nivel 3',
    tenant_name: 'Plan Pro',
    max_owner_profiles: 1,
    max_seller_profiles: 2,
    extra_paid_profiles: 0,
    description:
      'Control total para tiendas consolidadas con múltiples vendedores, auditoría histórica de precios y control de bodega.',
    highlights: [
      '1 Cuenta Dueño Global + 2 Cuentas de Empleado asociadas',
      'Historial de cambios de precios, mermas y mercadería en consignación',
      'Reportes financieros completos y gestión de accesos del equipo',
    ],
  },
  {
    id: 'seller-account',
    label: 'Cuenta Empleado Asociada (Vendedor)',
    badge: 'Rol Operativo • Vendedor',
    email: '',
    username: '',
    password: '',
    plan_tier: 3,
    role: 'seller',
    full_name: 'Cuenta Vendedor',
    tenant_name: 'Tienda Asociada',
    max_owner_profiles: 1,
    max_seller_profiles: 2,
    extra_paid_profiles: 0,
    description:
      'Cuenta operativa vinculada a la tienda del dueño: hereda el nombre y tema visual del negocio con permisos restringidos.',
    highlights: [
      'Registra ventas del día y consulta disponibilidad de inventario',
      'Oculta costos de compra, márgenes de ganancia y finanzas del dueño',
      'Sin acceso a modificar precios base ni configuración de la tienda',
    ],
  },
];

// ============================================================================
// ESTADO INICIAL VACÍO (LISTO PARA RELLENARSE)
// ============================================================================
export const BATCH_IDS = {
  WAYUU: '00000000-0000-0000-0000-000000000101',
  STELLA: '00000000-0000-0000-0000-000000000102',
  GEORGINA_3: '00000000-0000-0000-0000-000000000103',
  GEORGINA_4: '00000000-0000-0000-0000-000000000104',
};

export const REAL_BATCHES: Batch[] = [];
export const REAL_PRODUCTS: Product[] = [];
export const INITIAL_SALES_HEADERS: SalesHeader[] = [];
export const INITIAL_SALES_ITEMS: SalesItem[] = [];
export const INITIAL_PRICE_HISTORY: PriceHistory[] = [];
export const INITIAL_OPERATING_EXPENSES: OperatingExpense[] = [];
export const INITIAL_KARDEX_MOVEMENTS: KardexMovement[] = [];

export const INITIAL_TEAM_PROFILES: Profile[] = [
  {
    id: 'ca12a054-9229-42bc-97a7-fdbeac2d5e01',
    tenant_id: TENANT_STELLA_ID,
    full_name: 'Gabi Studio',
    username: 'Gabi Studio',
    role: 'global_owner',
    onboarding_completed: true,
    created_at: '2026-11-18T00:00:00Z',
  },
];

// ============================================================================
// STORAGE KEYS & DATA SYNCHRONIZATION HELPERS
// ============================================================================
export const STORAGE_KEYS = {
  DATA_VERSION: 'gabi_studio_data_version',
  UPDATED_AT: 'gabi_studio_updated_at',
  PRODUCTS: 'gabi_studio_products',
  BATCHES: 'gabi_studio_batches',
  SALES_HEADERS: 'gabi_studio_sales_headers',
  SALES_ITEMS: 'gabi_studio_sales_items',
  PRICE_HISTORY: 'gabi_studio_price_history',
  EXPENSES: 'gabi_studio_operating_expenses',
  KARDEX: 'gabi_studio_kardex_movements',
  TEAM_PROFILES: 'gabi_studio_team_profiles',
};

const CURRENT_DATA_VERSION = 'gabi-studio-empty-v1';

let activeCloudTenantId: string = TENANT_STELLA_ID;
let cloudSyncTimer: ReturnType<typeof setTimeout> | null = null;

function touchLocalUpdatedAt(): string {
  const nowIso = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.UPDATED_AT, nowIso);
  return nowIso;
}

export function setActiveCloudTenantId(tenantId: string): void {
  if (tenantId) {
    activeCloudTenantId = tenantId;
  }
}

export async function syncStoreDataToSupabaseCloudNow(
  tenantId = activeCloudTenantId,
  explicitlyCleared = false
): Promise<boolean> {
  if (cloudSyncTimer) {
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = null;
  }
  try {
    const updatedAt = localStorage.getItem(STORAGE_KEYS.UPDATED_AT) || touchLocalUpdatedAt();
    const payload = {
      updated_at: updatedAt,
      explicitly_cleared: explicitlyCleared,
      products: getStoredProducts(),
      batches: getStoredBatches(),
      sales_headers: getStoredSalesHeaders(),
      sales_items: getStoredSalesItems(),
      price_history: getStoredPriceHistory(),
      expenses: getStoredExpenses(),
      kardex: getStoredKardex(),
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const { error } = await supabaseAdmin.storage
      .from('tenant-data')
      .upload(`tenants/${tenantId}/store-data.json`, blob, {
        upsert: true,
        cacheControl: '0',
        contentType: 'application/json',
      });
    if (error) {
      console.warn('Error subiendo store-data.json a Supabase Storage:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error de red sincronizando con Supabase Storage:', err);
    return false;
  }
}

export function pushStoreDataToSupabaseCloud(tenantId = activeCloudTenantId): void {
  touchLocalUpdatedAt();
  if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    void syncStoreDataToSupabaseCloudNow(tenantId, false);
  }, 250);
}

export async function clearAllCatalogData(tenantId = activeCloudTenantId): Promise<boolean> {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.PRICE_HISTORY, JSON.stringify([]));
  touchLocalUpdatedAt();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('gabi-store-hydrated'));
  }
  return syncStoreDataToSupabaseCloudNow(tenantId, true);
}

export async function hydrateStoreFromSupabaseCloud(
  tenantId = activeCloudTenantId
): Promise<void> {
  setActiveCloudTenantId(tenantId);
  ensureRealInventorySeeded();
  try {
    const { data: blob, error } = await supabaseAdmin.storage
      .from('tenant-data')
      .download(`tenants/${tenantId}/store-data.json`);

    if (!error && blob) {
      const text = await blob.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.products)) {
        await syncStoreDataToSupabaseCloudNow(tenantId, false);
        return;
      }

      const cloudProductsLen = parsed.products.length;
      const cloudBatchesLen = Array.isArray(parsed.batches) ? parsed.batches.length : 0;
      const cloudSalesLen = Array.isArray(parsed.sales_headers) ? parsed.sales_headers.length : 0;
      const isCloudCompletelyEmpty =
        cloudProductsLen === 0 && cloudBatchesLen === 0 && cloudSalesLen === 0;

      const localProducts = getStoredProducts();
      const localUpdatedAt = localStorage.getItem(STORAGE_KEYS.UPDATED_AT) || '';
      const cloudUpdatedAt = typeof parsed.updated_at === 'string' ? parsed.updated_at : '';

      // Si la nube aún tiene el archivo inicial vacío pero el navegador tiene datos locales más recientes,
      // subimos los datos locales a la nube en vez de borrarlos.
      if (
        isCloudCompletelyEmpty &&
        !parsed.explicitly_cleared &&
        localProducts.length > 0
      ) {
        await syncStoreDataToSupabaseCloudNow(tenantId, false);
        return;
      }

      // Si el navegador tiene cambios locales más recientes que la nube (y la nube no fue formateada explícitamente después),
      // subimos la versión local más reciente.
      if (
        localUpdatedAt &&
        cloudUpdatedAt &&
        localUpdatedAt > cloudUpdatedAt &&
        !parsed.explicitly_cleared
      ) {
        await syncStoreDataToSupabaseCloudNow(tenantId, false);
        return;
      }

      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(parsed.products));
      if (Array.isArray(parsed.batches)) {
        localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(parsed.batches));
      }
      if (Array.isArray(parsed.sales_headers)) {
        localStorage.setItem(STORAGE_KEYS.SALES_HEADERS, JSON.stringify(parsed.sales_headers));
      }
      if (Array.isArray(parsed.sales_items)) {
        localStorage.setItem(STORAGE_KEYS.SALES_ITEMS, JSON.stringify(parsed.sales_items));
      }
      if (Array.isArray(parsed.price_history)) {
        localStorage.setItem(STORAGE_KEYS.PRICE_HISTORY, JSON.stringify(parsed.price_history));
      }
      if (Array.isArray(parsed.expenses)) {
        localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(parsed.expenses));
      }
      if (Array.isArray(parsed.kardex)) {
        localStorage.setItem(STORAGE_KEYS.KARDEX, JSON.stringify(parsed.kardex));
      }
      if (cloudUpdatedAt) {
        localStorage.setItem(STORAGE_KEYS.UPDATED_AT, cloudUpdatedAt);
      }
      localStorage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('gabi-store-hydrated'));
      }
    } else {
      await syncStoreDataToSupabaseCloudNow(tenantId, false);
    }
  } catch {
    // Fallback to local cache
  }
}

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
    localStorage.removeItem('gabi_studio_owner_salary_usd');
    localStorage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
    if (forceReset) {
      pushStoreDataToSupabaseCloud(activeCloudTenantId);
    }
  }
}

export function getStoredProducts(): Product[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  return raw ? JSON.parse(raw) : REAL_PRODUCTS;
}

export function saveStoredProducts(products: Product[]): void {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  pushStoreDataToSupabaseCloud();
}

export function getStoredBatches(): Batch[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.BATCHES);
  return raw ? JSON.parse(raw) : REAL_BATCHES;
}

export function saveStoredBatches(batches: Batch[]): void {
  localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(batches));
  pushStoreDataToSupabaseCloud();
}

export function getStoredSalesHeaders(): SalesHeader[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.SALES_HEADERS);
  return raw ? JSON.parse(raw) : INITIAL_SALES_HEADERS;
}

export function saveStoredSalesHeaders(headers: SalesHeader[]): void {
  localStorage.setItem(STORAGE_KEYS.SALES_HEADERS, JSON.stringify(headers));
  pushStoreDataToSupabaseCloud();
}

export function getStoredSalesItems(): SalesItem[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.SALES_ITEMS);
  return raw ? JSON.parse(raw) : INITIAL_SALES_ITEMS;
}

export function saveStoredSalesItems(items: SalesItem[]): void {
  localStorage.setItem(STORAGE_KEYS.SALES_ITEMS, JSON.stringify(items));
  pushStoreDataToSupabaseCloud();
}

export function getStoredPriceHistory(): PriceHistory[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.PRICE_HISTORY);
  return raw ? JSON.parse(raw) : INITIAL_PRICE_HISTORY;
}

export function saveStoredPriceHistory(history: PriceHistory[]): void {
  localStorage.setItem(STORAGE_KEYS.PRICE_HISTORY, JSON.stringify(history));
  pushStoreDataToSupabaseCloud();
}

export function getStoredExpenses(): OperatingExpense[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
  return raw ? JSON.parse(raw) : INITIAL_OPERATING_EXPENSES;
}

export function saveStoredExpenses(expenses: OperatingExpense[]): void {
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  pushStoreDataToSupabaseCloud();
}

export function getStoredKardex(): KardexMovement[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.KARDEX);
  return raw ? JSON.parse(raw) : INITIAL_KARDEX_MOVEMENTS;
}

export function saveStoredKardex(movements: KardexMovement[]): void {
  localStorage.setItem(STORAGE_KEYS.KARDEX, JSON.stringify(movements));
  pushStoreDataToSupabaseCloud();
}

export function getStoredTeamProfiles(): Profile[] {
  ensureRealInventorySeeded();
  const raw = localStorage.getItem(STORAGE_KEYS.TEAM_PROFILES);
  return raw ? JSON.parse(raw) : INITIAL_TEAM_PROFILES;
}

export function saveStoredTeamProfiles(profiles: Profile[]): void {
  localStorage.setItem(STORAGE_KEYS.TEAM_PROFILES, JSON.stringify(profiles));
}
