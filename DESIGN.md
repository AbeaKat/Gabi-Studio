# Sistema de Diseño UI/UX: "Nacre & Coral" (Estilo ClickUp)

## 1. Filosofía Visual
Una interfaz luminosa, fresca, moderna y acogedora que combina fondos **nacarados/perla** con acentos en **coral cálido** y **pizarra profundo (slate)** para la tipografía técnica. Es atractiva para un público mayoritariamente femenino en el sector retail/joyería/moda, pero mantiene la sobriedad geométrica y neutralidad de un software financiero profesional para cualquier dueño de negocio.

## 2. Paleta de Colores (Configuración para `tailwind.config.js`)

### Fondos Nacarados y Superficies (Nacre & Pearl)
- **Background Principal (`bg-nacre-50`):** `#FAF8F6` (Blanco perla cálido, evita la fatiga visual del blanco puro).
- **Superficie de Tarjetas / Tablas (`bg-white`):** `#FFFFFF` con borde sutil `#EFECE6`.
- **Sidebar / Paneles Secundarios (`bg-nacre-100`):** `#F4EFEA` (Tono arena nacarado suave).
- **Efecto Perlado en Headers/Cards Destacadas:** `bg-gradient-to-r from-[#FAF8F6] via-[#FFFDFB] to-[#F7EFEA]`.

### Acentos Principales (Living Coral & Terracotta)
- **Primario / Botones CTA (`coral-500`):** `#F26B5B` (Coral vivo, fresco y energético).
- **Primario Hover (`coral-600`):** `#E05343`.
- **Acento Suave / Badges / Selección (`coral-50` a `coral-100`):** `#FFF1EF` / `#FFE1DC` (Fondo suave para filas activas o etiquetas).

### Contraste Neutro y Tipografía (Deep Slate)
- **Texto Principal (`slate-900`):** `#1E242B` (Gris pizarra profundo, máxima legibilidad para números).
- **Texto Secundario / Labels (`slate-500`):** `#64748B`.
- **Bordes y Divisores (`nacre-200`):** `#E6E0D6`.

### Semáforo Financiero (Márgenes y Stock)
- **Éxito / Margen Saludable (>35%) (`emerald-600`):** `#0D9488` (Verde agua/esmeralda elegante, fondo `#F0FDFA`).
- **Alerta / Margen Bajo (15% - 34%) (`amber-500`):** `#F59E0B` (Ámbar cálido, fondo `#FEF3C7`).
- **Peligro / Margen Crítico (<15% o Sin Stock) (`rose-600`):** `#E11D48` (Rojo frambuesa, fondo `#FFE4E6`).

## 3. Tipografía
- **Títulos y UI (`font-sans`):** `Plus Jakarta Sans` o `Inter` (limpia, redondeada y moderna).
- **Números, Códigos SKU y Monedas (`font-mono`):** `JetBrains Mono` o `tabular-nums` en `Inter` para que todas las cifras en las tablas financieras alineen exactamente punto con punto.

## 4. Componentes Clave de la Interfaz
1. **Landing Page Pública (`/`):**
   - Hero section con estética nacarada, previsualización interactiva de las tablas tipo ClickUp, comparativa clara de los **3 Niveles**, botón flotante y CTA **"Contáctanos por WhatsApp"** para contratar, y botón **"Iniciar Sesión"** en la esquina superior derecha.
2. **Vistas estilo ClickUp (`/app/inventory`):**
   - Cabecera compacta con conmutador de vistas (`Vista Tabla`, `Vista Lotes`, `Historial Precios`), buscador instantáneo por SKU y botón primario coral `+ Registrar Venta / Cierre`.
   - Agrupación por Colección/Lote con cabeceras colapsables que muestran el resumen financiero del grupo en la misma barra.
   - Edición en línea (Inline Editing): Al hacer clic en una celda de precio o stock, se edita directamente sin abrir modales pesados.
3. **Indicador de Módulos Bloqueados (Upsell sutil):**
   - Las funciones de Nivel 2 o 3 para un usuario de Nivel 1 se muestran con un badge nacarado/coral `Nivel 2` o `Nivel 3` y un ícono de candado elegante que, al hacer clic, abre un modal explicando el beneficio y un botón directo a WhatsApp para mejorar su plan o comprar perfiles extra.
