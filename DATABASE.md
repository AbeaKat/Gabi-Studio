# Arquitectura de Base de Datos (Supabase / PostgreSQL)

## 1. Modelo Multi-Empresa y Control de Perfiles
El sistema aísla los datos mediante `tenant_id` y aplica Row Level Security (RLS) en todas las tablas.

### Tabla: `tenants` (Empresas Clientes)
- `id` (uuid, PK)
- `name` (text) — Ej. "Boutique & Estudio Gabi"
- `plan_tier` (int) — `1` (Esencial), `2` (Crecimiento), `3` (ERP Completo)
- `exchange_rate_nio` (numeric) — Ej. `36.62`
- `max_owner_profiles` (int) — Por defecto `1`
- `max_seller_profiles` (int) — Nivel 1: `0`, Nivel 2: `1`, Nivel 3: `2`
- `extra_paid_profiles` (int) — Perfiles adicionales comprados como add-on
- `theme_palette` (text) — `'coral'` | `'emerald'` | `'sapphire'` | `'violet'` | `'amber'` | `'rose'`
- `onboarding_completed` (boolean) — Controla el asistente de primer inicio de sesión del dueño
- `logo_url` (text, opcional)
- `is_active` (boolean)
- `created_at` (timestamptz)

### Tabla: `profiles` (Usuarios vinculados a `auth.users`)
- `id` (uuid, PK, FK a `auth.users.id`)
- `tenant_id` (uuid, FK a `tenants.id`)
- `full_name` (text)
- `username` (text, único) — Nombre de usuario para login (`@dueno_pro`, `@valeria_ventas`, etc.)
- `email` (text)
- `avatar_url` (text) — Foto de perfil almacenada en bucket público `avatars` de Supabase Storage
- `onboarding_completed` (boolean)
- `role` (text) — `'global_owner'` | `'seller'`
- `created_at` (timestamptz)

## 2. Catálogo, Lotes y Auditoría de Precios

### Tabla: `batches` (Categorías o Lotes de Importación)
- `id` (uuid, PK)
- `tenant_id` (uuid, FK)
- `name` (text) — Ej. "Repuestos Freno Octubre", "Lote Electrónica"
- `shipping_cost_usd` (numeric, default 0) — Nivel 2+
- `amazon_fee_usd` (numeric, default 0) — Nivel 2+
- `dhl_tax_usd` (numeric, default 0) — Nivel 2+
- `total_batch_investment_usd` (numeric) — Calculado para la barra de Recuperación de Inversión.

### Tabla: `products` (Inventario Maestro)
- `id` (uuid, PK)
- `tenant_id` (uuid, FK)
- `batch_id` (uuid, FK a `batches.id`)
- `sku` (text) — Ej. "REP-402" (Único por `tenant_id`)
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
- `payment_method` (text) — `'cash_nio'` | `'cash_usd'` | `'transfer_bac'` | `'transfer_lafise'` | `'transfer_banpro'` | `'pos_card'` | `'credit_layaway'`
- `customer_name` (text, nullable)
- `customer_phone` (text, nullable)
- `amount_paid_nio` (numeric, default 0)
- `balance_due_nio` (numeric, default 0)
- `payment_status` (text) — `'paid'` | `'partial'` | `'pending'`
- `due_date` (date, nullable)
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
- `payment_method` (text) — Método de pago original de la línea
- `abono_payment_method` (text, nullable) — Método por el que ingresó el abono en cuentas al crédito/apartado
- `customer_name` (text, nullable)
- `customer_phone` (text, nullable)
- `amount_paid_nio` (numeric, default 0)
- `balance_due_nio` (numeric, default 0)
- `payment_status` (text) — `'paid'` | `'partial'` | `'pending'`
- `due_date` (date, nullable)
- `created_at` (timestamptz)

## 4. Gastos Operativos (Nivel 2+) y Kardex Auditable (Nivel 3)

### Tabla: `operating_expenses` (Gastos Operativos del Mes)
- `id` (uuid, PK)
- `tenant_id` (uuid, FK a `tenants.id`)
- `category` (text) — `'publicidad'` | `'empaque'` | `'envio_local'` | `'renta_servicios'` | `'comisiones'` | `'otros'`
- `description` (text)
- `amount_usd` (numeric)
- `amount_nio` (numeric)
- `expense_date` (date)
- `created_at` (timestamptz)

### Tabla: `kardex_movements` (Auditoría de Bodega, Mermas y Consignación)
- `id` (uuid, PK)
- `tenant_id` (uuid, FK a `tenants.id`)
- `product_id` (uuid, FK a `products.id`, nullable)
- `sku` (text)
- `product_name` (text)
- `movement_type` (text) — `'entrada_compra'` | `'ajuste_conteo'` | `'merma_dano'` | `'consignacion_salida'` | `'consignacion_retorno'`
- `location` (text) — Ej. "Bodega Principal", "Showroom Aliado"
- `quantity_delta` (int)
- `stock_before` (int)
- `stock_after` (int)
- `unit_cost_usd` (numeric)
- `reason` (text)
- `created_by_name` (text)
- `created_at` (timestamptz)
