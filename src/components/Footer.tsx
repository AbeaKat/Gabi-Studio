import React from 'react';
import { Sparkles, MessageCircle, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const handleWhatsApp = () => {
    const text = encodeURIComponent('Hola Gabi Studio! Deseo comunicarme con el equipo de soporte.');
    window.open(`https://wa.me/50588888888?text=${text}`, '_blank');
  };

  return (
    <footer className="bg-white border-t border-nacre-200 pt-16 pb-12 text-xs text-deepSlate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-nacre-200">
          
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-coral-500 to-coral-400 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-deepSlate-900">
                GABI STUDIO
              </span>
            </div>
            <p className="text-sm text-deepSlate-500 max-w-sm leading-relaxed">
              Sistema integral multi-empresa de gestión de inventarios, costeo y rentabilidad bimoneda (USD y Córdobas). Claridad financiera y control total para tu negocio.
            </p>
            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={handleWhatsApp}
                className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors font-semibold"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Atención WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h5 className="font-bold text-deepSlate-900 uppercase tracking-wider text-[11px]">
              Navegación
            </h5>
            <ul className="space-y-2">
              <li>
                <a href="#caracteristicas" className="hover:text-coral-500 transition-colors">Características</a>
              </li>
              <li>
                <a href="#planes" className="hover:text-coral-500 transition-colors">Planes & Niveles</a>
              </li>
              <li>
                <a href="#bimoneda" className="hover:text-coral-500 transition-colors">Bimoneda USD / C$</a>
              </li>
              <li>
                <a href="#preguntas" className="hover:text-coral-500 transition-colors">Preguntas Frecuentes</a>
              </li>
            </ul>
          </div>

          {/* Access & Security */}
          <div className="space-y-3">
            <h5 className="font-bold text-deepSlate-900 uppercase tracking-wider text-[11px]">
              Acceso a Clientes
            </h5>
            <ul className="space-y-2">
              <li>
                <Link to="/login" className="font-semibold text-coral-600 hover:text-coral-700 transition-colors">
                  Iniciar Sesión
                </Link>
              </li>
              <li>
                <span className="text-deepSlate-400">Multi-Tenant RLS Aislado</span>
              </li>
              <li>
                <span className="text-deepSlate-400">Snapshots Inmutables</span>
              </li>
              <li>
                <span className="text-deepSlate-400">PostgreSQL Cloud</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Credits */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Gabi Studio. Todos los derechos reservados.</p>
          <p className="flex items-center space-x-1">
            <span>Hecho con</span>
            <Heart className="w-3.5 h-3.5 text-coral-500 fill-coral-500" />
            <span>para negocios y tiendas de retail moderno.</span>
          </p>
        </div>

      </div>
    </footer>
  );
};

