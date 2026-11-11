# Plan de Trabajo e Iteración (Checklist de Avance)

Instrucciones para el Agente (Antigravity): A medida que completes una tarea, marca la casilla con `[x]` y documenta cualquier ajuste técnico debajo de la fase correspondiente.

## Sprint 1: Base Visual "Nacre & Coral", Landing Page Universal y Auth Multi-Tenant
- [x] Configurar proyecto Vite + React + TypeScript + Tailwind CSS con la paleta `nacre`, `coral` y `slate` definida en `DESIGN.md`.
- [x] Construir **Landing Page Pública (`/`)**:
  - [x] Hero section con propuesta comercial universal para **Nicaragua (Bimoneda C$ / USD)**, sin encasillar en moda o joyería.
  - [x] Previsualización con datos 100% ficticios multi-rubro (Autopartes, Tecnología, Retail) — **Cero datos confidenciales de clientes reales**.
  - [x] Tarjetas comparativas de los **3 Niveles** y explicación de perfiles adicionales.
  - [x] Botón de contacto directo a WhatsApp para contratación comercial y botón flotante.
  - [x] Vista de **Login (`/login`)** conectada a Supabase Auth.
- [x] Generar script SQL en `supabase/schema.sql` listo para ejecutar en Supabase (`tenants`, `profiles`, `batches`, `products`, `price_history`, `sales_headers`, `sales_items`, triggers RLS e índices).
- [x] Crear `AuthContext` que cargue al iniciar sesión el `tenant`, el `plan_tier` (1, 2 o 3) y el `role` (`global_owner` o `seller`).

## Sprint 2: Módulo de Catálogo e Inventario Estilo ClickUp (Nivel 1)
- [x] Construir Layout privado con Sidebar nacarado, indicador de Nivel actual y Tasa de Cambio (`USD -> C$`) editable en la barra superior.
- [x] Crear **Vista Tabla Tipo ClickUp (`/app/inventory`)**:
  - [x] Agrupación por Categoría/Lote (`batches`).
  - [x] Creación y edición en línea de productos con cálculo automático de `Precio C$` y badge de semáforo de margen (`%`).
  - [x] Ocultamiento automático de columnas `Costo ($)` y `Margen (%)` si el usuario tiene rol `seller`.
- [x] Implementar **Importador de Catálogo Excel/CSV** en el navegador con vista previa y alertas de validación antes de guardar.
- [x] Conectar disparador automático en `price_history` cada vez que se actualice el costo o precio de un producto.

## Sprint 3: Motor de Salidas (Venta en Vivo + Cierre Diario) y Finanzas Nivel 1
- [x] Crear modal/vista de **Venta Rápida (1 a 1)** con buscador instantáneo por SKU y soporte de promoción/descuento (con candado si es Nivel 1).
- [x] Crear vista de **Cierre del Día (`/app/closing`)**:
  - [x] Pestaña 1: Subir Excel/CSV de códigos vendidos hoy con tabla de pre-visualización financiera.
  - [x] Pestaña 2: Checklist manual rápido para marcar salidas del día.
- [x] Asegurar que ambas vías guarden los **Snapshots Inmutables** en `sales_items` y descuenten `stock_current`.
- [x] Construir **Dashboard Financiero Nivel 1 (`/app/finance`)**:
  - [x] KPIs en vivo: Capital en Mercadería (Stock a costo), Valor de Venta Proyectado, Ventas del Periodo, Costo Recuperado y Ganancia Libre Real (USD y C$).

> **Ajustes Técnicos Sprint 3:**
> - Se implementó [`QuickSaleModal.tsx`](src/components/sales/QuickSaleModal.tsx) accesible tanto desde Catálogo (`/app/inventory`) como desde Cierres (`/app/closing`), bloqueando el campo de descuento en `planTier === 1` y habilitándolo en `planTier >= 2`.
> - Se construyó [`ClosingPage.tsx`](src/pages/ClosingPage.tsx) con triple pestaña: Checklist Manual Rápido por colección, Conciliador de Excel/CSV con simulador de 1 clic sobre SKUs reales, y Bitácora de Snapshots Financieros Inmutables (`unit_cost_usd_snapshot`, `list_price_nio_snapshot`, `final_unit_price_nio`, `exchange_rate_snapshot`, `net_profit_usd`).
> - Se construyó [`FinancePage.tsx`](src/pages/FinancePage.tsx) con protección de acceso por rol (`seller` bloqueado) y cálculo en tiempo real de los 5 KPIs financieros bimoneda.

## Sprint 4: Módulos de Nivel 2 y Nivel 3 (Desbloqueo por Plan)
- [x] **Nivel 2:** Calculadora de Importación en `batches` (prorrateo automático de Envío, Amazon y DHL al costo unitario de cada pieza del lote).
- [x] **Nivel 2:** Barra visual de **Recuperación de Inversión por Lote** y registro de **Gastos Operativos**.
- [x] **Nivel 2 y 3:** Gestión de Perfiles y Roles (verificación de límite de asientos según `max_owner_profiles`, `max_seller_profiles` y `extra_paid_profiles`).
- [x] **Nivel 3:** Vista de **Historial de Precios (`price_history`)**, ajustes de Kardex por mermas/daños y **Estado de Resultados (P&L)** mensual.

> **Ajustes Técnicos Sprint 4 & Datos Reales de Inventario:**
> - Se integró la base de datos real en [`realInventoryData.ts`](src/data/realInventoryData.ts) con los 4 lotes del Excel (**1. Línea Wayuu**, **2. Inventario Stella**, **3. Inventario 3 - Georgina**, **4. Inventario 4 - Georgina** — 116 SKUs únicos y 126 unidades físicas con sus costos base, prorrateos Amazon/Envío/DHL y precios en USD y Córdobas `C$`), manteniendo la Landing Page (`/`) 100% libre de datos privados.
> - Se implementó [`BatchesPage.tsx`](src/pages/BatchesPage.tsx) (`/app/batches`) con prorrateo equitativo por ítem o proporcional al costo, actualizando `landed_cost_usd` y registrando auditoría automática en `price_history`.
> - Se implementó [`AuditPage.tsx`](src/pages/AuditPage.tsx) (`/app/audit`) para Nivel 3 con registro de Kardex (mermas/averías, salidas a consignación y conteo físico) y tabla global auditable de `price_history`.
> - Se implementó [`ProfilesPage.tsx`](src/pages/ProfilesPage.tsx) (`/app/team`) con validación de cupos (`max_owner_profiles`, `max_seller_profiles`, `extra_paid_profiles`) y conmutador instantáneo de los 4 perfiles de prueba por nivel.

## Sprint 5: Arqueo de Caja, Cobranza por WhatsApp, Punto de Equilibrio e Inteligencia ABC ($0 Costo Servidor)
- [x] **Sanitización Multi-Tenant:** Reemplazo de nombres estáticos de clientes piloto en UI y plantillas descargables por el nombre dinámico del tenant (`tenant?.name || 'Mi Empresa Demo'`) y SKUs genéricos (`REP-402`, `TEC-109`, `FER-033`).
- [x] **Nivel 1 — Métodos de Pago, Recibo Digital WhatsApp y Arqueo de Caja:**
  - [x] Soporte de `PaymentMethod` (`cash_nio`, `cash_usd`, `transfer_bac`, `transfer_lafise`, `transfer_banpro`, `pos_card`, `credit_layaway`) en `SalesHeader`, `SalesItem` y `supabase/schema.sql`.
  - [x] Generador de **Recibo Digital** dentro de `QuickSaleModal.tsx` con envío directo al WhatsApp del cliente (`https://wa.me/`) sin APIs de pago.
  - [x] Panel de **Arqueo de Caja por Método de Pago** y **Calculadora de Cuadre de Efectivo en Gaveta** en `ClosingPage.tsx`.
- [x] **Nivel 2 — Cartera por Cobrar (Créditos/Apartados) y Punto de Equilibrio Mensual:**
  - [x] Registro de ventas al crédito/apartado con `Abono Inicial (C$)`, `Fecha Límite de Pago` (`due_date`) y cálculo automático de `balance_due_nio`.
  - [x] Panel de **Cartera por Cobrar & Apartados Activos** en `FinancePage.tsx` con botón de liquidación/abono en línea y recordatorio de cobro por WhatsApp en 1 clic.
  - [x] Tarjeta interactiva **Meta de Supervivencia & Punto de Equilibrio Mensual** con semáforo que compara la Ganancia Bruta Real contra Gastos Operativos + Meta de Salario del Dueño.
- [x] **Nivel 3 — Matriz ABC de Rotación de Inventario y Paquete Contable de 4 Hojas (.xlsx):**
  - [x] Panel **Inteligencia de Capital: Productos Estrella vs. Capital Estancado (Matriz ABC)** que detecta productos Clase A con alerta de reposición (`stock_current <= 2`) y productos Clase C ("Hueso") con sugerencia automática de liquidación del 15%.
  - [x] Exportador **Paquete Contable Multihierro (.xlsx)** con 4 pestañas listas para el contador: `1_Resumen_PL`, `2_Detalle_Ventas_COGS`, `3_Gastos_Operativos` y `4_Kardex_y_Mermas`.
  - [x] Actualización comercial de `TIERS_DATA` en `src/components/PricingCard.tsx`.
