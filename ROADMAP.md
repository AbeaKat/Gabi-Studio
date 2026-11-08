# Plan de Trabajo e Iteración (Checklist de Avance)

Instrucciones para el Agente (Antigravity): A medida que completes una tarea, marca la casilla con `[x]` y documenta cualquier ajuste técnico debajo de la fase correspondiente.

## Sprint 1: Base Visual "Nacre & Coral", Landing Page y Auth Multi-Tenant
- [ ] Configurar proyecto Vite + React + TypeScript + Tailwind CSS con la paleta `nacre`, `coral` y `slate` definida en `DESIGN.md`.
- [ ] Construir **Landing Page Pública (`/`)**:
  - [ ] Hero section atractivo con propuesta de valor (Control de inventario y ganancias sin complicaciones).
  - [ ] Tarjetas comparativas de los **3 Niveles** y explicación de perfiles adicionales.
  - [ ] Botón de contacto directo a WhatsApp para contratación comercial.
  - [ ] Vista de **Login (`/login`)** conectada a Supabase Auth.
- [ ] Ejecutar script SQL en Supabase (`tenants`, `profiles`, `batches`, `products`, `price_history`, `sales_headers`, `sales_items`).
- [ ] Crear `AuthContext` que cargue al iniciar sesión el `tenant`, el `plan_tier` (1, 2 o 3) y el `role` (`global_owner` o `seller`).

## Sprint 2: Módulo de Catálogo e Inventario Estilo ClickUp (Nivel 1)
- [ ] Construir Layout privado con Sidebar nacarado, indicador de Nivel actual y Tasa de Cambio (`USD -> C$`) editable en la barra superior.
- [ ] Crear **Vista Tabla Tipo ClickUp (`/app/inventory`)**:
  - [ ] Agrupación por Colección/Lote (`batches`).
  - [ ] Creación y edición en línea de productos con cálculo automático de `Precio C$` y badge de semáforo de margen (`%`).
  - [ ] Ocultamiento automático de columnas `Costo ($)` y `Margen (%)` si el usuario tiene rol `seller`.
- [ ] Implementar **Importador de Catálogo Excel/CSV** en el navegador con vista previa y alertas de validación antes de guardar.
- [ ] Conectar disparador automático en `price_history` cada vez que se actualice el costo o precio de un producto.

## Sprint 3: Motor de Salidas (Venta en Vivo + Cierre Diario) y Finanzas Nivel 1
- [ ] Crear modal/vista de **Venta Rápida (1 a 1)** con buscador instantáneo por SKU y soporte de promoción/descuento (con candado si es Nivel 1).
- [ ] Crear vista de **Cierre del Día (`/app/closing`)**:
  - [ ] Pestaña 1: Subir Excel/CSV de códigos vendidos hoy con tabla de pre-visualización financiera.
  - [ ] Pestaña 2: Checklist manual rápido para marcar salidas del día.
- [ ] Asegurar que ambas vías guarden los **Snapshots Inmutables** en `sales_items` y descuenten `stock_current`.
- [ ] Construir **Dashboard Financiero Nivel 1 (`/app/finance`)**:
  - [ ] KPIs en vivo: Capital en Mercadería (Stock a costo), Valor de Venta Proyectado, Ventas del Periodo, Costo Recuperado y Ganancia Libre Real (USD y C$).

## Sprint 4: Módulos de Nivel 2 y Nivel 3 (Desbloqueo por Plan)
- [ ] **Nivel 2:** Calculadora de Importación en `batches` (prorrateo automático de Envío, Amazon y DHL al costo unitario de cada pieza del lote).
- [ ] **Nivel 2:** Barra visual de **Recuperación de Inversión por Lote** y registro de **Gastos Operativos**.
- [ ] **Nivel 2 y 3:** Gestión de Perfiles y Roles (verificación de límite de asientos según `max_owner_profiles`, `max_seller_profiles` y `extra_paid_profiles`).
- [ ] **Nivel 3:** Vista de **Historial de Precios (`price_history`)**, ajustes de Kardex por mermas/daños y **Estado de Resultados (P&L)** mensual.
