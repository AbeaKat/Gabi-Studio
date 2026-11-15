import React from 'react';
import { Check, ShieldCheck, Sparkles, MessageCircle, ArrowRight, UserPlus } from 'lucide-react';
import { OFFICIAL_WHATSAPP_NUMBER } from '../data/realInventoryData';

export interface TierFeature {
  text: string;
  highlight?: boolean;
}

export interface TierData {
  id: number;
  name: string;
  tagline: string;
  badge?: string;
  isPopular?: boolean;
  profilesIncluded: string;
  features: TierFeature[];
  whatsappMessage: string;
  ctaText: string;
}

export const TIERS_DATA: TierData[] = [
  {
    id: 1,
    name: 'Básico',
    tagline: 'Para vender con orden: sabes qué tienes, qué vendiste y cuánto ganaste.',
    profilesIncluded: '1 usuario dueño (puedes agregar más)',
    ctaText: 'Quiero el plan Básico',
    whatsappMessage: 'Hola Gabi Studio! Quiero información del plan Básico.',
    features: [
      { text: 'Anota tus ventas en segundos y envía el recibo por WhatsApp', highlight: true },
      { text: 'Mira cuánto te queda de cada producto y cuáles se están acabando', highlight: true },
      { text: 'Precios en córdobas y dólares, con el dólar del día que tú decidas' },
      { text: 'Pantalla de inicio: cuánto vendiste, cuánto ganaste y cuánto te deben' },
      { text: 'Sube tus ventas del día desde Excel si ya las llevas ahí' },
    ],
  },
  {
    id: 2,
    name: 'Crece',
    tagline: 'Para saber cuánto ganas de verdad en cada producto y trabajar con vendedores.',
    badge: 'MÁS POPULAR',
    isPopular: true,
    profilesIncluded: '1 dueño + 1 vendedor incluidos',
    ctaText: 'Quiero el plan Crece',
    whatsappMessage: 'Hola Gabi Studio! Quiero información del plan Crece.',
    features: [
      { text: 'Todo lo del plan Básico', highlight: true },
      { text: 'Calcula el costo real de lo que importas (producto + envío + impuestos)', highlight: true },
      { text: 'Te sugiere a cuánto vender para ganar lo que quieres' },
      { text: 'Tus vendedores venden, pero no ven costos ni ganancias' },
      { text: 'Controla clientes que te deben y cobra por WhatsApp' },
      { text: 'Registra tus gastos y descubre si estás ganando o perdiendo' },
    ],
  },
  {
    id: 3,
    name: 'Pro',
    tagline: 'Para negocios que quieren control total y reportes listos para su contador.',
    badge: 'CONTROL TOTAL',
    profilesIncluded: '1 dueño + 2 vendedores incluidos',
    ctaText: 'Quiero el plan Pro',
    whatsappMessage: 'Hola Gabi Studio! Quiero información del plan Pro.',
    features: [
      { text: 'Todo lo del plan Crece', highlight: true },
      { text: 'Historial de todo: quién cambió un precio, qué se dañó o se prestó', highlight: true },
      { text: 'Reporte mensual de ganancias detallado' },
      { text: 'Descubre qué productos se venden más y cuáles están parados' },
      { text: 'Reportes en Excel para tu contador' },
      { text: 'Acompañamiento personalizado para empezar' },
    ],
  },
];
interface PricingCardsSectionProps {
  phoneNumber?: string;
}

export const PricingCardsSection: React.FC<PricingCardsSectionProps> = ({
  phoneNumber = OFFICIAL_WHATSAPP_NUMBER,
}) => {
  const handleOpenWhatsApp = (message: string) => {
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <section id="planes" className="py-20 bg-gradient-to-b from-nacre-50 via-white to-nacre-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-coral-50 border border-coral-200 text-coral-600 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Planes</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-deepSlate-900 tracking-tight">
            Elige el plan que se ajusta a tu negocio
          </h2>
          <p className="mt-4 text-base sm:text-lg text-deepSlate-500">
            Empieza con lo básico y pasa a otro plan cuando lo necesites. Sin letra pequeña.
          </p>
        </div>

        {/* 3 Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {TIERS_DATA.map((tier) => {
            const isPopular = tier.isPopular;

            return (
              <div
                key={tier.id}
                className={`relative rounded-3xl flex flex-col justify-between transition-all duration-300 ${
                  isPopular
                    ? 'bg-white border-2 border-coral-500 shadow-2xl shadow-coral-500/15 scale-100 md:-translate-y-2 z-10'
                    : 'bg-white/80 hover:bg-white border border-nacre-200 shadow-sm hover:shadow-xl'
                }`}
              >
                {/* Popular / Feature Badge */}
                {tier.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center space-x-1 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider text-white bg-coral-gradient shadow-md shadow-coral-500/30">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{tier.badge}</span>
                    </span>
                  </div>
                )}

                {/* Card Top Content */}
                <div className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-coral-600 bg-coral-50 px-3 py-1 rounded-full">
                      Tier {tier.id}
                    </span>
                    <span className="text-xs font-semibold text-deepSlate-500 flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-coral-500" />
                      <span>Multi-Empresa</span>
                    </span>
                  </div>

                  <h3 className="text-2xl font-extrabold text-deepSlate-900 mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-sm text-deepSlate-500 mb-6 leading-relaxed">
                    {tier.tagline}
                  </p>

                  {/* Included Profiles Pill */}
                  <div className="mb-6 p-3 rounded-xl bg-nacre-100 border border-nacre-200 flex items-start space-x-2.5">
                    <UserPlus className="w-4 h-4 text-coral-500 mt-0.5 shrink-0" />
                    <span className="text-xs font-medium text-deepSlate-700">
                      {tier.profilesIncluded}
                    </span>
                  </div>

                  {/* Feature Checklist */}
                  <div className="border-t border-nacre-200 pt-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-deepSlate-700 mb-4">
                      ¿Qué incluye?
                    </p>
                    <ul className="space-y-3">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start space-x-3 text-sm">
                          <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                            feature.highlight
                              ? 'bg-coral-500 text-white'
                              : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </div>
                          <span className={feature.highlight ? 'font-semibold text-deepSlate-900' : 'text-deepSlate-700'}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Footer / CTA */}
                <div className="p-8 pt-0">
                  <button
                    onClick={() => handleOpenWhatsApp(tier.whatsappMessage)}
                    className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all duration-200 shadow-md ${
                      isPopular
                        ? 'bg-coral-500 hover:bg-coral-600 text-white shadow-coral-500/25 hover:shadow-coral-500/35 active:scale-98'
                        : 'bg-white hover:bg-nacre-50 text-deepSlate-900 border border-nacre-200 hover:border-coral-300'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                    <span>{tier.ctaText}</span>
                    <ArrowRight className="w-4 h-4 opacity-70" />
                  </button>
                  <p className="text-center text-[11px] text-deepSlate-500 mt-2.5">
                    Respuesta rápida vía WhatsApp institucional
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Extra Profiles Add-on Banner */}
        <div className="mt-14 max-w-4xl mx-auto bg-gradient-to-r from-coral-50 via-white to-nacre-100 border border-coral-200 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-coral-500/10 border border-coral-200 flex items-center justify-center text-coral-600 shrink-0">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-base sm:text-lg text-deepSlate-900">
                ¿Necesitas perfiles o sucursales adicionales?
              </h4>
              <p className="text-xs sm:text-sm text-deepSlate-500 mt-0.5">
                Puedes añadir asientos adicionales para dueños o vendedores a tu plan contratado en cualquier momento sin perder tu información histórica.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenWhatsApp('Hola Gabi Studio! Me gustaría cotizar perfiles adicionales para mi cuenta.')}
            className="shrink-0 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white text-coral-600 border border-coral-300 hover:bg-coral-50 transition-colors shadow-sm"
          >
            Cotizar perfiles extra
          </button>
        </div>

      </div>
    </section>
  );
};


