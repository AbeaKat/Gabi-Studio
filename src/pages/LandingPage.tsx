import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Coins,
  ShieldCheck,
  PackageCheck,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  Lock,
  Layers,
  History,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { WhatsAppFloatingButton } from '../components/WhatsAppFloatingButton';
import { PricingCardsSection } from '../components/PricingCard';

interface DemoProduct {
  sku: string;
  name: string;
  batch: string;
  stock: number;
  costUsd: number;
  priceUsd: number;
  priceNio: number;
}

const DEMO_PRODUCTS: DemoProduct[] = [
  {
    sku: 'REP-402',
    name: 'Kit Pastillas Freno Cerámicas Delanteras',
    batch: 'Repuestos Automotrices',
    stock: 14,
    costUsd: 18.50,
    priceUsd: 38.00,
    priceNio: 1390.00,
  },
  {
    sku: 'TEC-109',
    name: 'Adaptador USB-C Multipuerto 4K HDMI',
    batch: 'Tecnología & Gadgets',
    stock: 9,
    costUsd: 11.20,
    priceUsd: 26.00,
    priceNio: 950.00,
  },
  {
    sku: 'FER-033',
    name: 'Juego Llaves Combinadas Cromo Vanadio',
    batch: 'Ferretería & Taller',
    stock: 22,
    costUsd: 12.40,
    priceUsd: 25.00,
    priceNio: 915.00,
  },
  {
    sku: 'ACC-205',
    name: 'Mochila Impermeable Ergonómica Ejecutiva',
    batch: 'Artículos de Tienda',
    stock: 5,
    costUsd: 14.80,
    priceUsd: 32.00,
    priceNio: 1170.00,
  },
  {
    sku: 'ILU-711',
    name: 'Lámpara LED Solar Recargable Alta Potencia',
    batch: 'Hogar & Iluminación',
    stock: 2,
    costUsd: 9.50,
    priceUsd: 21.00,
    priceNio: 770.00,
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [roleView, setRoleView] = useState<'owner' | 'seller'>('owner');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const exchangeRate = 36.62;

  const filteredProducts = DEMO_PRODUCTS.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.batch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleWhatsAppContact = (msg?: string) => {
    const text = encodeURIComponent(msg || 'Hola Gabi Studio! Deseo solicitar acceso y asesoría comercial para mi tienda.');
    window.open(`https://wa.me/50588888888?text=${text}`, '_blank');
  };

  const faqs = [
    {
      q: '¿Cómo funciona el sistema de cobro y contratación?',
      a: 'Gabi Studio se activa mediante licencia multi-empresa directa. No requieres ingresar tarjetas de crédito en la web: la contratación, configuración inicial y soporte se coordinan de forma personalizada por WhatsApp.',
    },
    {
      q: '¿Qué significa que las ventas tienen "Snapshots Inmutables"?',
      a: 'Significa que cada vez que registras una venta, el sistema congela el costo exacto, el precio de lista, la tasa de cambio y el descuento del día. Si dentro de 6 meses actualizas los precios de tu catálogo, tus reportes de ganancias pasados jamás se alteran ni se descuadran.',
    },
    {
      q: '¿Mis colaboradores o vendedores pueden ver mis costos y ganancias?',
      a: 'En los Niveles 2 y 3 puedes asignar roles de Vendedor. El perfil de vendedor solo tiene acceso al catálogo para consultar stock, registrar ventas o cierres diarios, pero las columnas de costo, márgenes de ganancia y reportes financieros quedan completamente ocultas.',
    },
    {
      q: '¿Puedo importar mi catálogo actual desde Excel o CSV?',
      a: 'Sí. Gabi Studio incluye un importador client-side de alta velocidad que lee tu archivo de Excel o CSV directamente en tu navegador, valida códigos duplicados o formatos antes de guardar y no satura tu conexión.',
    },
    {
      q: '¿Cómo se maneja la bimoneda en Dólares y Córdobas?',
      a: 'Tú defines la tasa de cambio global de tu empresa (ej. 36.62). Al ingresar el costo o precio en USD, el sistema calcula automáticamente el equivalente en Córdobas y te permite redondear comercialmente el precio al público.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-nacre-50 text-deepSlate-900 selection:bg-coral-100 selection:text-coral-900">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-coral-400/10 blur-[130px] rounded-full pointer-events-none"></div>
        <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-emerald-400/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Hero Headings */}
          <div className="text-center max-w-4xl mx-auto mb-12">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-coral-200 shadow-sm text-coral-600 text-xs font-bold uppercase tracking-wider mb-6 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 text-coral-500" />
              <span>SaaS de Control Interno para Comercio, Distribución & Retail en Nicaragua</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-deepSlate-900 tracking-tight leading-[1.15]">
              El control financiero e inventario que tu negocio{' '}
              <span className="text-coral-500">
                realmente merece
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-deepSlate-500 max-w-2xl mx-auto leading-relaxed">
              Gestiona tu inventario con bimoneda nativa (<span className="font-semibold text-deepSlate-700">USD $ y Córdobas C$</span>), audita cambios de precios y congela tu rentabilidad real venta a venta con snapshots inmutables.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => handleWhatsAppContact()}
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base text-white bg-coral-500 hover:bg-coral-600 shadow-lg shadow-coral-500/30 hover:shadow-coral-500/40 active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <span>Solicitar Acceso por WhatsApp</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-7 py-4 rounded-xl font-bold text-base text-deepSlate-700 bg-white hover:bg-nacre-100 border border-nacre-200 hover:border-nacre-300 shadow-sm transition-all flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-5 h-5 text-coral-500" />
                <span>Acceso a Clientes</span>
              </button>
            </div>

            {/* Trust highlights */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-deepSlate-500">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Sin pasarelas ni comisiones por transacción</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Multi-empresa con aislamiento total</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Puesta en marcha asistida en 24h</span>
              </div>
            </div>
          </div>

          {/* Interactive Live Preview Component */}
          <div className="mt-8 max-w-5xl mx-auto bg-white rounded-3xl border border-nacre-200 shadow-2xl shadow-deepSlate-900/5 overflow-hidden">
            
            {/* Table Mockup Header Bar */}
            <div className="bg-gradient-to-r from-nacre-50 via-white to-nacre-100 border-b border-nacre-200 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                </div>
                <div className="h-4 w-px bg-nacre-200 mx-1"></div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm text-deepSlate-900 tracking-tight">Gabi Studio</span>
                  <span className="text-xs text-deepSlate-500">/ Catálogo e Inventario</span>
                </div>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Tasa: C${exchangeRate}
                </span>
              </div>

              {/* View Switcher Controls */}
              <div className="flex items-center space-x-2 bg-nacre-100 p-1 rounded-xl border border-nacre-200">
                <span className="text-[11px] font-semibold text-deepSlate-500 px-2">Simular Vista:</span>
                <button
                  onClick={() => setRoleView('owner')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ease-out-natural ${
                    roleView === 'owner'
                      ? 'bg-white text-coral-600 shadow-sm'
                      : 'text-deepSlate-500 hover:text-deepSlate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Dueño (Costos Visibles)</span>
                </button>
                <button
                  onClick={() => setRoleView('seller')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ease-out-natural ${
                    roleView === 'seller'
                      ? 'bg-white text-coral-600 shadow-sm'
                      : 'text-deepSlate-500 hover:text-deepSlate-900'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Vendedor (Costos Protegidos)</span>
                </button>
              </div>

            </div>

            {/* Table Mockup Filter & Actions */}
            <div className="p-4 sm:p-6 bg-white border-b border-nacre-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-deepSlate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por SKU o pieza..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-400 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="text-deepSlate-500 font-medium">Lote Activo:</span>
                <span className="px-2.5 py-1 rounded-lg bg-coral-50 text-coral-700 font-bold border border-coral-200">
                  Lote General - Importación
                </span>
                <span className="text-deepSlate-400 text-xs">| Total 52 piezas</span>
              </div>
            </div>

            {/* Table Itself */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-nacre-50/70 border-b border-nacre-200 text-deepSlate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Pieza / Producto</th>
                    <th className="py-3 px-4">Colección</th>
                    <th className="py-3 px-4 text-center">Stock</th>
                    {roleView === 'owner' ? (
                      <>
                        <th className="py-3 px-4 text-right">Costo ($)</th>
                        <th className="py-3 px-4 text-right">Precio ($)</th>
                        <th className="py-3 px-4 text-right">Precio (C$)</th>
                        <th className="py-3 px-4 text-right">Margen (%)</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 px-4 text-right">Precio ($)</th>
                        <th className="py-3 px-4 text-right">Precio (C$)</th>
                        <th className="py-3 px-4 text-center">Costos</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-nacre-100 font-sans">
                  {filteredProducts.map((p) => {
                    const marginPercent = ((p.priceUsd - p.costUsd) / p.priceUsd) * 100;
                    const isHealthy = marginPercent >= 35;

                    return (
                      <tr key={p.sku} className="hover:bg-coral-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-deepSlate-900">
                          {p.sku}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-deepSlate-900">
                          {p.name}
                        </td>
                        <td className="py-3.5 px-4 text-deepSlate-500">
                          <span className="px-2 py-0.5 rounded-full bg-nacre-100 text-[10px] font-semibold text-deepSlate-700">
                            {p.batch}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] ${
                            p.stock <= 2
                              ? 'bg-rose-100 text-rose-700 font-bold'
                              : 'bg-nacre-100 text-deepSlate-800'
                          }`}>
                            {p.stock} {p.stock === 1 ? 'ud' : 'uds'}
                          </span>
                        </td>

                        {roleView === 'owner' ? (
                          <>
                            <td className="py-3.5 px-4 text-right font-mono text-deepSlate-500 tabular-numbers">
                              ${p.costUsd.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-deepSlate-900 tabular-numbers">
                              ${p.priceUsd.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-coral-600 tabular-numbers">
                              C${p.priceNio.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                                isHealthy
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                +{marginPercent.toFixed(1)}%
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-deepSlate-900 tabular-numbers">
                              ${p.priceUsd.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-coral-600 tabular-numbers">
                              C${p.priceNio.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-nacre-100 text-deepSlate-500 border border-nacre-200">
                                <Lock className="w-3 h-3 text-deepSlate-400" />
                                <span>Confidencial</span>
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Mockup Footer Banner */}
            <div className="p-3 bg-nacre-50 border-t border-nacre-200 text-center text-xs text-deepSlate-500 flex items-center justify-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Esta es una demostración interactiva: explora el catálogo cambiando de rol en la barra superior.</span>
            </div>

          </div>

        </div>
      </section>

      {/* Core Features Grid */}
      <section id="caracteristicas" className="py-20 bg-white border-y border-nacre-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-coral-600 mb-2">
              Arquitectura Robusta & Moderna
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-deepSlate-900 tracking-tight">
              Diseñado para resolver los dolores reales de tu tienda
            </h3>
            <p className="mt-3 text-base text-deepSlate-500">
              Menos tiempo cuadrando cajas y hojas de cálculo desordenadas; más claridad para multiplicar tus ganancias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-nacre-50 border border-nacre-200 hover:border-coral-300 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-2xl bg-coral-500 text-white flex items-center justify-center shadow-md shadow-coral-500/20 mb-6 group-hover:scale-105 transition-transform">
                <Coins className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-deepSlate-900 mb-2.5">
                Bimoneda Nativa (USD y C$)
              </h4>
              <p className="text-sm text-deepSlate-500 leading-relaxed">
                Define la tasa de cambio global de tu empresa. El sistema calcula en vivo la equivalencia y te permite definir precios de venta redondeados comercialmente en Córdobas sin errores humanos.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-nacre-50 border border-nacre-200 hover:border-coral-300 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 mb-6 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-deepSlate-900 mb-2.5">
                Inmutabilidad Financiera
              </h4>
              <p className="text-sm text-deepSlate-500 leading-relaxed">
                Toda salida de stock congela un snapshot exacto del costo, precio de lista, descuento y tasa de cambio del momento. Si ajustas precios mañana, tus balances históricos jamás se verán alterados.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-nacre-50 border border-nacre-200 hover:border-coral-300 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-2xl bg-deepSlate-900 text-white flex items-center justify-center shadow-md shadow-deepSlate-900/20 mb-6 group-hover:scale-105 transition-transform">
                <PackageCheck className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-deepSlate-900 mb-2.5">
                Registro Dual de Ventas
              </h4>
              <p className="text-sm text-deepSlate-500 leading-relaxed">
                Registra ventas individuales en vivo pieza por pieza con un buscador instantáneo, o sube tu cierre masivo del día mediante Excel/CSV en segundos sin tediosos cuadres de caja manuales.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-3xl bg-nacre-50 border border-nacre-200 hover:border-coral-300 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 mb-6 group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-deepSlate-900 mb-2.5">
                Calculadora de Lotes & Importación
              </h4>
              <p className="text-sm text-deepSlate-500 leading-relaxed">
                Prorratea fletes de envío, tarifas de Amazon, DHL y aduanas al costo real de cada pieza. Mira en tiempo real la barra de recuperación de inversión por cada lote importado.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-3xl bg-nacre-50 border border-nacre-200 hover:border-coral-300 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 mb-6 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-deepSlate-900 mb-2.5">
                Privacidad y Roles para Vendedores
              </h4>
              <p className="text-sm text-deepSlate-500 leading-relaxed">
                Tus dependientes o vendedores en tienda consultan stock y marcan ventas sin ver jamás tus costos de adquisición, márgenes brutos ni estados financieros confidenciales.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-3xl bg-nacre-50 border border-nacre-200 hover:border-coral-300 transition-all duration-200 group">
              <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20 mb-6 group-hover:scale-105 transition-transform">
                <History className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-deepSlate-900 mb-2.5">
                Huella de Auditoría de Precios
              </h4>
              <p className="text-sm text-deepSlate-500 leading-relaxed">
                Cada cambio en el costo o precio de un producto queda registrado con el usuario responsable, el valor anterior, el nuevo y la razón del cambio. Control absoluto contra fugas.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing / Tiers Section */}
      <PricingCardsSection />

      {/* Currency & Financial Clarity Section */}
      <section id="bimoneda" className="py-20 bg-white border-t border-nacre-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-nacre-100 via-coral-50 to-nacre-50 rounded-3xl border border-coral-200 p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-12">
            
            <div className="max-w-xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border border-coral-200 text-coral-600 text-xs font-bold uppercase tracking-wider mb-4">
                <Coins className="w-3.5 h-3.5" />
                <span>Cero Fugas Cambiarias</span>
              </div>
              <h3 className="text-3xl font-extrabold text-deepSlate-900 tracking-tight">
                El fin de las confusiones entre Dólares y Córdobas
              </h3>
              <p className="mt-4 text-base text-deepSlate-600 leading-relaxed">
                En el comercio minorista, comprar en dólares e importar mercancía mientras se vende en moneda local suele ser la principal causa de descapitalización silenciosa.
              </p>
              <p className="mt-3 text-base text-deepSlate-600 leading-relaxed">
                Gabi Studio unifica tu costeo real, actualiza la equivalencia cambiaria en un solo clic y te garantiza que cada pieza vendida te deje el margen neto que calculaste.
              </p>

              <div className="mt-8">
                <button
                  onClick={() => handleWhatsAppContact('Hola Gabi Studio! Deseo una demostración de la gestión bimoneda USD y C$.')}
                  className="px-6 py-3.5 rounded-xl font-bold text-sm bg-coral-500 hover:bg-coral-600 text-white shadow-md shadow-coral-500/25 flex items-center space-x-2"
                >
                  <span>Pedir demostración personalizada</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Currency Showcase Card */}
            <div className="w-full lg:w-96 bg-white p-6 rounded-2xl border border-nacre-200 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-nacre-100 pb-3">
                <span className="text-xs font-bold text-deepSlate-700 uppercase">Tasa de Cambio Global</span>
                <span className="font-mono text-sm font-extrabold text-coral-600 bg-coral-50 px-2.5 py-1 rounded-lg">
                  1 USD = C$ 36.6200
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-nacre-100">
                  <span className="text-deepSlate-500">Costo Base Unitario:</span>
                  <span className="font-mono font-bold text-deepSlate-900">$8.50 USD</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-nacre-100">
                  <span className="text-deepSlate-500">Prorrateo Flete & Aduana:</span>
                  <span className="font-mono font-bold text-deepSlate-900">+$1.80 USD</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-nacre-100 bg-nacre-50 px-2 rounded">
                  <span className="text-deepSlate-700 font-semibold">Costo Real (Landed Cost):</span>
                  <span className="font-mono font-extrabold text-deepSlate-900">$10.30 USD</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-nacre-100">
                  <span className="text-deepSlate-500">Precio Público en USD:</span>
                  <span className="font-mono font-bold text-deepSlate-900">$28.00 USD</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-nacre-100 bg-coral-50/50 px-2 rounded">
                  <span className="text-coral-800 font-bold">Precio Final Sugerido en C$:</span>
                  <span className="font-mono font-extrabold text-coral-600">C$ 1,025.00</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-emerald-700 font-bold">Ganancia Bruta Congelada:</span>
                  <span className="font-mono font-extrabold text-emerald-600">+$17.70 USD (63.2%)</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="preguntas" className="py-20 bg-nacre-50 border-t border-nacre-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-coral-600 mb-2">
              <HelpCircle className="w-4 h-4" />
              <span>Resolvemos tus dudas</span>
            </div>
            <h3 className="text-3xl font-extrabold text-deepSlate-900 tracking-tight">
              Preguntas Frecuentes
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-nacre-200 overflow-hidden transition-all shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full py-5 px-6 text-left flex items-center justify-between text-base font-bold text-deepSlate-900 hover:text-coral-500 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-deepSlate-400 transition-transform duration-200 ${
                      openFaq === idx ? 'rotate-180 text-coral-500' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 text-sm text-deepSlate-500 leading-relaxed border-t border-nacre-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Direct WhatsApp Callout */}
          <div className="mt-12 text-center bg-white p-8 rounded-3xl border border-nacre-200 shadow-sm">
            <h4 className="text-lg font-bold text-deepSlate-900 mb-2">
              ¿Tienes una pregunta específica sobre tu negocio?
            </h4>
            <p className="text-sm text-deepSlate-500 mb-5">
              Chatea directamente con nuestro equipo de soporte técnico y comercial por WhatsApp.
            </p>
            <button
              onClick={() => handleWhatsAppContact('Hola Gabi Studio! Tengo una consulta antes de contratar.')}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/25 transition-all"
            >
              <span>Escribirnos al WhatsApp</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* Floating WhatsApp Action Button */}
      <WhatsAppFloatingButton />

      <Footer />
    </div>
  );
};

