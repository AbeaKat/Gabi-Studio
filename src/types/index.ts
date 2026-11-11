export type PlanTier = 1 | 2 | 3;
export type UserRole = 'global_owner' | 'seller';

export interface Tenant {
  id: string;
  name: string;
  plan_tier: PlanTier;
  exchange_rate_nio: number;
  max_owner_profiles: number;
  max_seller_profiles: number;
  extra_paid_profiles: number;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Batch {
  id: string;
  tenant_id: string;
  name: string;
  shipping_cost_usd: number;
  amazon_fee_usd: number;
  dhl_tax_usd: number;
  total_batch_investment_usd: number;
  created_at?: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  batch_id?: string | null;
  sku: string;
  name?: string | null;
  stock_current: number;
  base_cost_usd: number;
  landed_cost_usd: number;
  price_usd: number;
  price_nio: number;
  created_at?: string;
  updated_at?: string;
}

export interface PriceHistory {
  id: string;
  tenant_id: string;
  product_id: string;
  changed_by?: string | null;
  old_cost_usd: number;
  new_cost_usd: number;
  old_price_usd: number;
  new_price_usd: number;
  old_price_nio: number;
  new_price_nio: number;
  reason?: string | null;
  changed_at: string;
}

export type SalesEntryMode = 'single_sale' | 'daily_closing_excel' | 'daily_closing_manual';

export type PaymentMethod = 'cash_nio' | 'cash_usd' | 'transfer_bac' | 'transfer_lafise' | 'transfer_banpro' | 'pos_card' | 'credit_layaway';

export interface SalesHeader {
  id: string;
  tenant_id: string;
  created_by?: string | null;
  entry_mode: SalesEntryMode;
  sale_date: string;
  payment_method: PaymentMethod;
  customer_name?: string | null;
  customer_phone?: string | null;
  amount_paid_nio?: number;
  balance_due_nio?: number;
  payment_status?: 'paid' | 'partial' | 'pending';
  due_date?: string | null;
  promo_tag?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface SalesItem {
  id: string;
  tenant_id: string;
  sale_header_id: string;
  product_id?: string | null;
  sku_snapshot: string;
  product_name_snapshot?: string;
  batch_id_snapshot?: string | null;
  quantity: number;
  unit_cost_usd_snapshot: number;
  list_price_usd_snapshot: number;
  list_price_nio_snapshot: number;
  discount_nio: number;
  final_unit_price_nio: number;
  final_unit_price_usd: number;
  exchange_rate_snapshot: number;
  net_profit_usd: number;
  payment_method: PaymentMethod;
  customer_name?: string | null;
  customer_phone?: string | null;
  amount_paid_nio?: number;
  balance_due_nio?: number;
  payment_status?: 'paid' | 'partial' | 'pending';
  due_date?: string | null;
  created_at: string;
}

export interface OperatingExpense {
  id: string;
  tenant_id: string;
  category: 'publicidad' | 'empaque' | 'envio_local' | 'renta_servicios' | 'comisiones' | 'otros';
  description: string;
  amount_usd: number;
  amount_nio: number;
  expense_date: string;
  created_at: string;
}

export type KardexMovementType =
  | 'merma_dano'
  | 'consignacion_salida'
  | 'consignacion_retorno'
  | 'ajuste_positivo'
  | 'ajuste_negativo';

export interface KardexMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  movement_type: KardexMovementType;
  location: string;
  quantity_delta: number;
  stock_before: number;
  stock_after: number;
  unit_cost_usd: number;
  reason: string;
  created_by_name: string;
  created_at: string;
}

export interface TestAccountPreset {
  id: string;
  label: string;
  badge: string;
  email: string;
  password: string;
  plan_tier: PlanTier;
  role: UserRole;
  full_name: string;
  tenant_name: string;
  max_owner_profiles: number;
  max_seller_profiles: number;
  extra_paid_profiles: number;
  description: string;
  highlights: string[];
}


