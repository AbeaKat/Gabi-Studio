# Sistema SaaS Multi-Nivel de Inventario y Finanzas (Back-Office ERP Ligero)

## 1. Descripción del Proyecto
Plataforma web SaaS multi-empresa (Multi-Tenant) de control interno de inventario, costeo y rentabilidad automática, inspirada en la fluidez visual de **ClickUp**. 
- **NO es un e-commerce público ni usa pasarelas de pago.**
- El flujo inicia en una **Landing Page informativa** con botón de contacto comercial vía WhatsApp (`wa.me`) y acceso al **Login**.
- Al iniciar sesión, el sistema detecta automáticamente a qué **Empresa (`tenant_id`)**, **Nivel de Plan (`tier_1`, `tier_2`, `tier_3`)** y **Rol (`owner`, `seller`, `global_admin`)** pertenece el usuario, renderizando únicamente los módulos y columnas permitidos.

## 2. Stack Tecnológico (Optimizado para Costo $0 en Lanzamiento)
- **Frontend:** React 18 + Vite + TypeScript.
- **Estilos:** Tailwind CSS + Lucide Icons (Estética "Nacre & Coral").
- **Backend & Auth:** Supabase (PostgreSQL + Supabase Auth + Row Level Security).
- **Procesamiento de Archivos (Client-Side):** `xlsx` (SheetJS) / `papaparse` para leer Excel/CSV de catálogo y cierres diarios directamente en el navegador sin consumir servidor.
- **Hosting:** Cloudflare Pages / Vercel.

## 3. Reglas de Negocio Inquebrantables (Core Rules)
1. **Inmutabilidad Financiera (Snapshots en cada Venta):**
   - Los costos y precios del catálogo pueden variar en cualquier momento o tener promociones.
   - Toda salida de stock (sea venta individual en vivo o carga de cierre diario) DEBE guardar una copia congelada (`unit_cost_snapshot`, `list_price_snapshot`, `discount_amount`, `final_price_snapshot`, `exchange_rate_snapshot`). Jamás se calculan ganancias históricas multiplicando por el precio actual del catálogo.
2. **Huella de Auditoría de Precios:**
   - Cualquier cambio en el costo o precio de un producto existente registra automáticamente una fila en `price_history` indicando el valor anterior, el valor nuevo, la fecha y el usuario.
3. **Bimoneda Nativa (USD `$` y Córdobas `C$`):**
   - Cada empresa define su tasa de cambio global vigente (ej. `36.62`). El sistema calcula equivalencias en tiempo real y permite definir un `precio_final_nio` redondeado comercialmente.
4. **Registro Dual de Ventas (Sin Cierres de Caja Manuales):**
   - Como los precios ya viven en el sistema, las ventas se registran por dos vías:
     - **Venta en Vivo (1 a 1):** Buscador rápido para dar de baja una pieza al instante (con opción de aplicar promoción/descuento en Nivel 2 y 3).
     - **Cierre Diario (Masivo o Checklist):** Subida de archivo Excel/CSV con códigos vendidos en el día o selección múltiple rápida.

## 4. Estructura de los 3 Niveles y Perfiles (Licenciamiento)
- **Nivel 1 (Esencial):** 1 Perfil Dueño incluido (+ opción de comprar asientos extra Nivel 1). Vista Tabla editable tipo ClickUp, importador Excel/CSV, ventas en vivo o cierre diario, utilidad bruta automática. Todos los perfiles Nivel 1 ven lo mismo.
- **Nivel 2 (Crecimiento):** 1 Perfil Dueño + 1 Perfil Vendedor incluidos. El rol Vendedor NO ve costos ni márgenes ni finanzas. Desbloquea Calculadora de Importación por Lote (prorrateo de Envío, Amazon, DHL/Impuestos), Motor de Promociones/Descuentos, Gastos Operativos y barra de Recuperación de Inversión por Lote.
- **Nivel 3 (ERP Completo):** 1 Perfil Global + 2 Perfiles Vendedores incluidos. Desbloquea Multibodega/Consignación, Kardex Auditable completo (mermas, averías, devoluciones), Historial visual de cambios de precios y Estado de Resultados (P&L) mensual.
