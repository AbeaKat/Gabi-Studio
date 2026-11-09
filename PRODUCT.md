# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dueños de comercios, distribuidores e importadores (medianos y pequeños negocios) en Nicaragua que gestionan catálogos multi-rubro (autopartes, tecnología, ferretería, retail) y necesitan monitorear en tiempo real su stock, márgenes de ganancia reales y flujo de caja en un entorno bimoneda (USD y Córdobas C$). Rol secundario contemplado en niveles superiores: Vendedores con acceso restringido para registro rápido de salidas sin visibilidad de costos ni márgenes.

## Product Purpose

Gabi Studio es un SaaS Back-Office ERP ligero multi-empresa (Multi-Tenant) diseñado para sustituir hojas de cálculo desordenadas y sistemas contables rígidos. Su propósito es brindar control absoluto e inmutable de inventario, cálculo de utilidad neta/bruta por producto y lote, y registro rápido de ventas diarias sin la fricción de un punto de venta convencional. El éxito se define cuando el dueño de negocio conoce con certeza matemática su ganancia real y el estado de su capital en mercadería al instante.

## Positioning

A diferencia de los ERPs tradicionales lentos y costosos o los sistemas de e-commerce que exigen pasarelas de pago, Gabi Studio se enfoca exclusivamente en la gestión interna operativa para el mercado nicaragüense con bimoneda nativa (C$ y USD) y snapshots financieros inmutables por transacción, manteniendo una fluidez de interfaz inspirada en ClickUp/Linear que permite trabajar a velocidad de hoja de cálculo.

## Operating Context

- Operación diaria de escritorio y tablet en oficinas, mostradores y bodegas comerciales.
- Entorno comercial de Nicaragua con tasa de cambio oficial/paralela dinámica (ej. 36.62 C$/USD) que requiere conversión y redondeo comercial en tiempo real.
- Flujos de trabajo con proveedores externos (Amazon, DHL, fletes) que requieren prorrateo de costos de importación hacia el costo unitario final.
- Cierres de jornada con lectura y carga de archivos Excel/CSV para conciliar códigos vendidos sin doble digitación manual.

## Capabilities and Constraints

- **Multi-Tenant Estricto:** Aislamiento total de datos por `tenant_id` mediante Row Level Security (RLS) en Supabase / PostgreSQL.
- **Inmutabilidad Financiera:** Cada venta (individual o masiva) congela los valores históricos (`unit_cost_snapshot`, `list_price_snapshot`, `discount_amount`, `final_price_snapshot`, `exchange_rate_snapshot`) en `sales_items`.
- **Trazabilidad de Precios:** Registro auditable en `price_history` ante cualquier modificación de costo o precio.
- **Sin E-commerce Público:** No existen pasarelas de pago externas ni catálogo con carrito de compras para clientes finales; el acceso es privado por autenticación.
- **Confidencialidad Estricta:** Cero datos reales o confidenciales de clientes piloto en la Landing Page, componentes de demostración o datos de prueba.
- **Procesamiento Client-Side:** Análisis y validación de archivos Excel/CSV en el navegador del cliente mediante SheetJS/PapaParse para mantener costo de infraestructura en $0.

## Brand Commitments

- **Nombre Oficial:** Gabi Studio.
- **Tono y Voz:** Profesional, ágil, transparente, directo y centrado en la rentabilidad del negocio.
- **Filosofía Visual Comprometida:** Identidad "Nacre & Coral" inspirada en herramientas modernas de alta productividad (fondos nacarados perla `#FAF8F6`, acentos coral cálido `#F26B5B` y tipografía pizarra profunda `#1E242B`).

## Evidence on Hand

- Código fuente base implementado en React 18 + TypeScript + Vite + Tailwind CSS (`src/`).
- Esquema de base de datos relacional y políticas RLS documentadas en [DATABASE.md](file:///d:/kathe/Documents/Proyects/Gabi-Studio/DATABASE.md) y `supabase/schema.sql`.
- Sistema de diseño de referencia en [DESIGN.md](file:///d:/kathe/Documents/Proyects/Gabi-Studio/DESIGN.md).
- Hoja de ruta por fases y sprints en [ROADMAP.md](file:///d:/kathe/Documents/Proyects/Gabi-Studio/ROADMAP.md).
- Ausencia explícita: no se dispone ni se debe fabricar testimonios falsos de clientes o datos privados de empresas reales.

## Product Principles

1. **Claridad Financiera Inviolable:** Cada cifra de margen o ganancia debe ser exacta, transparente y respaldada por snapshots inmutables; nunca estimaciones volátiles.
2. **Velocidad de Hoja de Cálculo, Estructura de Base de Datos:** Las operaciones rutinarias (edición de precios, stock, registro de ventas) deben ejecutarse en un clic sin modales pesados ni fricción innecesaria.
3. **Adaptabilidad Multi-Rubro:** La interfaz y terminología deben ser universales para cualquier inventario (autopartes, ferretería, tecnología, moda), evitando sesgos de categoría.
4. **Respeto a la Realidad Bimoneda:** Tanto el dólar estadounidense como el córdoba nicaragüense son ciudadanos de primera clase en toda la experiencia de usuario.

## Accessibility & Inclusion

- Contraste legible según WCAG AA en todas las combinaciones de color de tablas numéricas y botones CTA.
- Soporte estricto de números tabulares (`tabular-nums` / fuente monoespaciada) para alineación visual exacta de columnas monetarias.

