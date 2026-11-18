-- ==============================================================================
-- GABI STUDIO - SUPABASE DATABASE SCHEMA
-- Multi-Tenant SaaS: Control Interno de Inventario, Costeo y Rentabilidad
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TENANTS & MULTI-TENANT ACCESS CONTROL
-- ==============================================================================

-- Tabla: tenants (Empresas Clientes)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan_tier INT NOT NULL DEFAULT 1 CHECK (plan_tier IN (1, 2, 3)),
    exchange_rate_nio NUMERIC(10, 4) NOT NULL DEFAULT 36.6200,
    max_owner_profiles INT NOT NULL DEFAULT 1,
    max_seller_profiles INT NOT NULL DEFAULT 0,
    extra_paid_profiles INT NOT NULL DEFAULT 0,
    theme_palette TEXT NOT NULL DEFAULT 'coral' CHECK (theme_palette IN ('coral', 'emerald', 'sapphire', 'violet', 'amber', 'rose')),
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: profiles (Usuarios vinculados a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE,
    email TEXT,
    avatar_url TEXT,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    role TEXT NOT NULL CHECK (role IN ('global_owner', 'seller')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 2. CATÁLOGO, LOTES Y AUDITORÍA DE PRECIOS
-- ==============================================================================

-- Tabla: batches (Colecciones o Lotes de Importación)
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    shipping_cost_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amazon_fee_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    dhl_tax_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_batch_investment_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: products (Inventario Maestro)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    sku TEXT NOT NULL,
    name TEXT,
    stock_current INT NOT NULL DEFAULT 1 CHECK (stock_current >= 0),
    base_cost_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    landed_cost_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    price_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    price_nio NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_products_tenant_sku UNIQUE (tenant_id, sku)
);

-- Tabla: price_history (Huella de Cambios de Costos y Precios)
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    old_cost_usd NUMERIC(12, 2),
    new_cost_usd NUMERIC(12, 2),
    old_price_usd NUMERIC(12, 2),
    new_price_usd NUMERIC(12, 2),
    old_price_nio NUMERIC(12, 2),
    new_price_nio NUMERIC(12, 2),
    reason TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. VENTAS CON SNAPSHOTS FINANCIEROS INMUTABLES
-- ==============================================================================

-- Tabla: sales_headers (Agrupador de Venta Individual o Cierre Diario)
CREATE TABLE IF NOT EXISTS public.sales_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    entry_mode TEXT NOT NULL CHECK (entry_mode IN ('single_sale', 'daily_closing_excel', 'daily_closing_manual')),
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'cash_nio' CHECK (payment_method IN ('cash_nio', 'cash_usd', 'transfer_bac', 'transfer_lafise', 'transfer_banpro', 'pos_card', 'credit_layaway')),
    customer_name TEXT,
    customer_phone TEXT,
    amount_paid_nio NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_due_nio NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'pending')),
    due_date DATE,
    promo_tag TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: sales_items (Detalle Inmutable Financiero)
CREATE TABLE IF NOT EXISTS public.sales_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sale_header_id UUID NOT NULL REFERENCES public.sales_headers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    sku_snapshot TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_cost_usd_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    list_price_usd_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    list_price_nio_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_nio NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    final_unit_price_nio NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    final_unit_price_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    exchange_rate_snapshot NUMERIC(10, 4) NOT NULL DEFAULT 36.6200,
    net_profit_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'cash_nio' CHECK (payment_method IN ('cash_nio', 'cash_usd', 'transfer_bac', 'transfer_lafise', 'transfer_banpro', 'pos_card', 'credit_layaway')),
    abono_payment_method TEXT CHECK (abono_payment_method IN ('cash_nio', 'cash_usd', 'transfer_bac', 'transfer_lafise', 'transfer_banpro', 'pos_card', 'credit_layaway')),
    customer_name TEXT,
    customer_phone TEXT,
    amount_paid_nio NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_due_nio NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'pending')),
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3B. GASTOS OPERATIVOS (NIVEL 2+) Y KARDEX DE BODEGA (NIVEL 3)
-- ==============================================================================

-- 3B.1 Tabla: operating_expenses (Gastos Operativos del Mes)
CREATE TABLE IF NOT EXISTS public.operating_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'otros' CHECK (category IN ('publicidad', 'empaque', 'envio_local', 'renta_servicios', 'comisiones', 'otros')),
    description TEXT NOT NULL,
    amount_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_nio NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3B.2 Tabla: kardex_movements (Auditoría de Bodega, Mermas y Consignación)
CREATE TABLE IF NOT EXISTS public.kardex_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    sku TEXT NOT NULL,
    product_name TEXT NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada_compra', 'ajuste_conteo', 'merma_dano', 'consignacion_salida', 'consignacion_retorno')),
    location TEXT NOT NULL DEFAULT 'Bodega Principal',
    quantity_delta INT NOT NULL,
    stock_before INT NOT NULL,
    stock_after INT NOT NULL,
    unit_cost_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    reason TEXT NOT NULL,
    created_by_name TEXT NOT NULL DEFAULT 'Dirección General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 4. ÍNDICES DE RENDIMIENTO Y CLAVES FORÁNEAS
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_batches_tenant_id ON public.batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_batch_id ON public.products(batch_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_price_history_tenant ON public.price_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON public.price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_headers_tenant ON public.sales_headers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_headers_date ON public.sales_headers(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_items_tenant ON public.sales_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_header ON public.sales_items(sale_header_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_product ON public.sales_items(product_id);
CREATE INDEX IF NOT EXISTS idx_operating_expenses_tenant ON public.operating_expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operating_expenses_date ON public.operating_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_kardex_movements_tenant ON public.kardex_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kardex_movements_product ON public.kardex_movements(product_id);

-- ==============================================================================
-- 5. FUNCIONES Y TRIGGERS AUTOMÁTICOS
-- ==============================================================================

-- Función para actualizar updated_at en productos
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_products_updated_at ON public.products;
CREATE TRIGGER tr_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Función Trigger para auditar cambios de precio/costo en price_history
CREATE OR REPLACE FUNCTION public.track_product_price_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.landed_cost_usd IS DISTINCT FROM NEW.landed_cost_usd) OR
       (OLD.base_cost_usd IS DISTINCT FROM NEW.base_cost_usd) OR
       (OLD.price_usd IS DISTINCT FROM NEW.price_usd) OR
       (OLD.price_nio IS DISTINCT FROM NEW.price_nio) THEN
        
        INSERT INTO public.price_history (
            tenant_id,
            product_id,
            changed_by,
            old_cost_usd,
            new_cost_usd,
            old_price_usd,
            new_price_usd,
            old_price_nio,
            new_price_nio,
            reason,
            changed_at
        ) VALUES (
            NEW.tenant_id,
            NEW.id,
            auth.uid(),
            COALESCE(OLD.landed_cost_usd, OLD.base_cost_usd),
            COALESCE(NEW.landed_cost_usd, NEW.base_cost_usd),
            OLD.price_usd,
            NEW.price_usd,
            OLD.price_nio,
            NEW.price_nio,
            'Actualización de catálogo',
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_track_price_changes ON public.products;
CREATE TRIGGER tr_track_price_changes
AFTER UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.track_product_price_changes();

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Funciones helper de contexto de sesión
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Habilitar RLS en todas las tablas
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operating_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kardex_movements ENABLE ROW LEVEL SECURITY;

-- Políticas para TENANTS
CREATE POLICY "Users can read own tenant"
    ON public.tenants FOR SELECT
    USING (id = public.current_user_tenant_id());

-- El dueño solo puede actualizar nombre, tasa de cambio y tema de su tienda,
-- NUNCA su plan_tier ni los límites de cuentas (max_owner_profiles, max_seller_profiles, extra_paid_profiles)
CREATE OR REPLACE FUNCTION public.protect_tenant_seat_limits()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        NEW.plan_tier := OLD.plan_tier;
        NEW.max_owner_profiles := OLD.max_owner_profiles;
        NEW.max_seller_profiles := OLD.max_seller_profiles;
        NEW.extra_paid_profiles := OLD.extra_paid_profiles;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_tenant_seat_limits ON public.tenants;
CREATE TRIGGER tr_protect_tenant_seat_limits
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.protect_tenant_seat_limits();

CREATE POLICY "Owners can update own tenant settings"
    ON public.tenants FOR UPDATE
    USING (id = public.current_user_tenant_id() AND public.current_user_role() = 'global_owner');

-- Políticas para PROFILES (Las cuentas se crean únicamente desde base de datos / administración)
CREATE POLICY "Users can view members in same tenant"
    ON public.profiles FOR SELECT
    USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Owners can update profiles in their tenant"
    ON public.profiles FOR UPDATE
    USING (
        (id = auth.uid() AND public.current_user_role() = 'global_owner')
        OR (tenant_id = public.current_user_tenant_id() AND public.current_user_role() = 'global_owner')
    );

-- Políticas para BATCHES
CREATE POLICY "Tenant isolation for batches SELECT"
    ON public.batches FOR SELECT
    USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for batches INSERT"
    ON public.batches FOR INSERT
    WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for batches UPDATE"
    ON public.batches FOR UPDATE
    USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for batches DELETE"
    ON public.batches FOR DELETE
    USING (tenant_id = public.current_user_tenant_id());

-- Políticas para PRODUCTS
CREATE POLICY "Tenant isolation for products SELECT"
    ON public.products FOR SELECT
    USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for products INSERT"
    ON public.products FOR INSERT
    WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for products UPDATE"
    ON public.products FOR UPDATE
    USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for products DELETE"
    ON public.products FOR DELETE
    USING (tenant_id = public.current_user_tenant_id());

-- Políticas para PRICE_HISTORY
CREATE POLICY "Tenant isolation for price_history SELECT"
    ON public.price_history FOR SELECT
    USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for price_history INSERT"
    ON public.price_history FOR INSERT
    WITH CHECK (tenant_id = public.current_user_tenant_id());

-- Políticas para SALES_HEADERS
CREATE POLICY "Tenant isolation for sales_headers SELECT"
    ON public.sales_headers FOR SELECT
    USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for sales_headers INSERT"
    ON public.sales_headers FOR INSERT
    WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for sales_headers UPDATE"
    ON public.sales_headers FOR UPDATE
    USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for sales_headers DELETE"
    ON public.sales_headers FOR DELETE
    USING (tenant_id = public.current_user_tenant_id());

-- Políticas para SALES_ITEMS
CREATE POLICY "Tenant isolation for sales_items SELECT"
    ON public.sales_items FOR SELECT
    USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for sales_items INSERT"
    ON public.sales_items FOR INSERT
    WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for sales_items UPDATE"
    ON public.sales_items FOR UPDATE
    USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for sales_items DELETE"
    ON public.sales_items FOR DELETE
    USING (tenant_id = public.current_user_tenant_id());

-- Políticas para OPERATING_EXPENSES
CREATE POLICY "Tenant isolation for operating_expenses SELECT"
    ON public.operating_expenses FOR SELECT
    USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for operating_expenses INSERT"
    ON public.operating_expenses FOR INSERT
    WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for operating_expenses UPDATE"
    ON public.operating_expenses FOR UPDATE
    USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for operating_expenses DELETE"
    ON public.operating_expenses FOR DELETE
    USING (tenant_id = public.current_user_tenant_id());

-- Políticas para KARDEX_MOVEMENTS
CREATE POLICY "Tenant isolation for kardex_movements SELECT"
    ON public.kardex_movements FOR SELECT
    USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for kardex_movements INSERT"
    ON public.kardex_movements FOR INSERT
    WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for kardex_movements UPDATE"
    ON public.kardex_movements FOR UPDATE
    USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Tenant isolation for kardex_movements DELETE"
    ON public.kardex_movements FOR DELETE
    USING (tenant_id = public.current_user_tenant_id());

-- ==============================================================================
-- 7. CONFIGURACIÓN INICIAL TENANT PRINCIPAL (NIVEL 3 - GABI STUDIO)
-- ==============================================================================

-- Tenant Principal Nivel 3 (Vacío, listo para rellenarse)
INSERT INTO public.tenants (id, name, plan_tier, exchange_rate_nio, max_owner_profiles, max_seller_profiles, extra_paid_profiles, onboarding_completed, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Gabi Studio',
    3,
    36.6200,
    1,
    2,
    0,
    true,
    true
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    plan_tier = EXCLUDED.plan_tier,
    max_owner_profiles = EXCLUDED.max_owner_profiles,
    max_seller_profiles = EXCLUDED.max_seller_profiles,
    extra_paid_profiles = EXCLUDED.extra_paid_profiles,
    onboarding_completed = EXCLUDED.onboarding_completed;

