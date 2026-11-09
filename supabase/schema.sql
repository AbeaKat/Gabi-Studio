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
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: profiles (Usuarios vinculados a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
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

-- Políticas para TENANTS
CREATE POLICY "Users can read own tenant"
    ON public.tenants FOR SELECT
    USING (id = public.current_user_tenant_id());

CREATE POLICY "Owners can update own tenant settings"
    ON public.tenants FOR UPDATE
    USING (id = public.current_user_tenant_id() AND public.current_user_role() = 'global_owner');

-- Políticas para PROFILES
CREATE POLICY "Users can view members in same tenant"
    ON public.profiles FOR SELECT
    USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Owners can insert new profiles in their tenant"
    ON public.profiles FOR INSERT
    WITH CHECK (tenant_id = public.current_user_tenant_id() AND public.current_user_role() = 'global_owner');

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

-- ==============================================================================
-- 7. SEED DATA DEMO (Opcional para pruebas iniciales)
-- ==============================================================================

-- Tenant de Demostración (Multi-rubro agnóstico)
INSERT INTO public.tenants (id, name, plan_tier, exchange_rate_nio, max_owner_profiles, max_seller_profiles, extra_paid_profiles, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Comercial del Norte',
    2,
    36.6200,
    1,
    1,
    0,
    true
) ON CONFLICT (id) DO NOTHING;

-- Lote demo
INSERT INTO public.batches (id, tenant_id, name, shipping_cost_usd, amazon_fee_usd, dhl_tax_usd, total_batch_investment_usd)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'Lote Repuestos & Tecnología',
    35.00,
    15.00,
    20.00,
    550.00
) ON CONFLICT (id) DO NOTHING;

-- Productos demo multi-rubro
INSERT INTO public.products (id, tenant_id, batch_id, sku, name, stock_current, base_cost_usd, landed_cost_usd, price_usd, price_nio)
VALUES
    ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'REP-402', 'Kit Pastillas Freno Cerámicas Delanteras', 14, 15.00, 18.50, 38.00, 1390.00),
    ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'TEC-109', 'Adaptador USB-C Multipuerto 4K HDMI', 9, 8.50, 11.20, 26.00, 950.00),
    ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'FER-033', 'Juego Llaves Combinadas Cromo Vanadio', 22, 9.80, 12.40, 25.00, 915.00)
ON CONFLICT (tenant_id, sku) DO NOTHING;

