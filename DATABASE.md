# Arquitectura de Base de Datos (Supabase / PostgreSQL)

## 1. Modelo Multi-Empresa y Control de Perfiles
El sistema aísla los datos mediante `tenant_id` y aplica Row Level Security (RLS) en todas las tablas.

### Tabla: `tenants` (Empresas Clientes)
- `id` (uuid, PK)
- `name` (text) — Ej. "Stella & Georgina"
- `plan_tier` (int) — `1` (Esencial), `2` (Crecimiento), `3` (ERP Completo)
- `exchange_rate_nio` (numeric) — Ej. `36.62`
- `max_owner_profiles` (int) — Por defecto `1`
- `max_seller_profiles` (int) — Nivel 1: `0`, Nivel 2: `1`, Nivel 3: `2`
- `extra_paid_profiles` (int) — Perfiles adicionales comprados como add-on
- `is_active` (boolean)
- `created_at` (timestamptz)

### Tabla: `profiles` (Usuarios vinculados a `auth.users`)
- `id` (uuid, PK, FK a `auth.users.id`)
- `tenant_id` (uuid, FK a `tenants.id`)
- `full_name` (text)
- `role` (text) — `'global_owner'` | `'seller'`
- `created_at` (timestamptz)

## 2. Catálogo, Lotes y Auditoría de Precios

### Tabla: `batches` (Colecciones o Lotes de Importación)
- `id` (uuid, PK)
- `tenant_id` (uuid, FK)
- `name` (text) — Ej. "Línea Wayuu", "Inventario Georgina 4"
- `shipping_cost_usd` (numeric, default 0) — Nivel 2+
- `amazon_fee_usd` (numeric, default 0) — Nivel 2+
- `dhl_tax_usd` (numeric, default 0) — Nivel 2+
- `total_batch_investment_usd` (numeric) — Calculado para la barra de Recuperación de Inversión.

### Tabla: `products` (Inventario Maestro)
- `id` (uuid, PK)
- `tenant_id` (uuid, FK)
- `batch_id` (uuid, FK a `batches.id`)
- `sku` (text) — Ej. "AR02148" (Único por `tenant_id`)
- `name` (text, opcional)
- `stock_current` (int, default 1)
- `base_cost_usd` (numeric) — Costo base unitario
- `landed_cost_usd` (numeric) — Costo real unitario (Base + prorrateo de lote en Nivel 2+)
- `price_usd` (numeric) — Precio de lista en USD
- `price_nio` (numeric) — Precio final de venta en Córdobas (C$)
- `updated_at` (timestamptz)

### Tabla: `price_history` (Huella de Cambios de Costos y Precios)
- `id` (uuid, PK)
- `tenant_id` (uuid, FK)
- `product_id` (uuid, FK a `products.id`)
- `changed_by` (uuid, FK a `profiles.id`)
- `old_cost_usd` (numeric)
- `new_cost_usd` (numeric)
- `old_price_usd` (numeric)
- `new_price_usd` (numeric)
- `old_price_nio` (numeric)
- `new_price_nio` (numeric)
- `reason` (text) — Ej. "Ajuste de proveedor", "Actualización de tasa"
- `changed_at` (timestamptz)

## 3. Ventas (En Vivo o Cierre Diario) con Snapshots Inmutables

### Tabla: `sales_headers` (Agrupador de Venta Individual o Cierre del Día)
- `id` (uuid, PK)
- `tenant_id` (uuid, FK)
- `created_by` (uuid, FK a `profiles.id`)
- `entry_mode` (text) — `'single_sale'` (Venta en vivo) | `'daily_closing_excel'` | `'daily_closing_manual'`
- `sale_date` (date)
- `promo_tag` (text, nullable) — Ej. "Promo Quincena", "Descuento 10%" (Nivel 2+)
- `notes` (text)
- `created_at` (timestamptz)

### Tabla: `sales_items` (Detalle Inmutable Financiero)
- `id` (uuid, PK)
- `tenant_id` (uuid, FK)
- `sale_header_id` (uuid, FK a `sales_headers.id`)
- `product_id` (uuid, FK a `products.id`)
- `sku_snapshot` (text)
- `quantity` (int)
- `unit_cost_usd_snapshot` (numeric) — **Congelado al momento de la venta**
- `list_price_usd_snapshot` (numeric) — **Congelado al momento de la venta**
- `list_price_nio_snapshot` (numeric) — **Congelado al momento de la venta**
- `discount_nio` (numeric, default 0) — Monto descontado por promoción
- `final_unit_price_nio` (numeric) — Precio real cobrado en C$
- `final_unit_price_usd` (numeric) — Precio real cobrado equivalente en USD
- `exchange_rate_snapshot` (numeric) — Tasa vigente el día de la venta
- `net_profit_usd` (numeric) — `(final_unit_price_usd - unit_cost_usd_snapshot) * quantity`
