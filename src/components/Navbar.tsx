import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, MessageCircle, LogIn, Menu, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleWhatsAppContact = () => {
    const text = encodeURIComponent('Hola Gabi Studio! Quisiera solicitar información sobre sus planes de inventario y finanzas.');
    window.open(`https://wa.me/50588888888?text=${text}`, '_blank');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-nacre-200 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-coral-500 to-coral-400 flex items-center justify-center text-white shadow-md shadow-coral-500/20 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-deepSlate-900 group-hover:text-coral-500 transition-colors">
                GABI STUDIO
              </span>
              <span className="text-[10px] font-semibold tracking-widest text-deepSlate-500 uppercase -mt-1">
                Inventario & Finanzas
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#caracteristicas" className="text-sm font-medium text-deepSlate-700 hover:text-coral-500 transition-colors">
              Características
            </a>
            <a href="#planes" className="text-sm font-medium text-deepSlate-700 hover:text-coral-500 transition-colors">
              Planes & Niveles
            </a>
            <a href="#bimoneda" className="text-sm font-medium text-deepSlate-700 hover:text-coral-500 transition-colors">
              Bimoneda USD / C$
            </a>
            <a href="#preguntas" className="text-sm font-medium text-deepSlate-700 hover:text-coral-500 transition-colors">
              Preguntas Frecuentes
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={handleWhatsAppContact}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-3">
                <Link
                  to="/app"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-coral-500 hover:bg-coral-600 shadow-sm transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Mi Panel</span>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-xs font-semibold text-deepSlate-500 hover:text-deepSlate-900 px-2 py-1"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-coral-500 hover:bg-coral-600 shadow-sm shadow-coral-500/25 active:scale-95 transition-all duration-200"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-deepSlate-700 hover:bg-nacre-100 transition-colors"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-nacre-200 px-4 pt-3 pb-6 space-y-4 shadow-xl">
          <nav className="flex flex-col space-y-3">
            <a
              href="#caracteristicas"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-deepSlate-700 hover:text-coral-500 py-1"
            >
              Características
            </a>
            <a
              href="#planes"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-deepSlate-700 hover:text-coral-500 py-1"
            >
              Planes & Niveles
            </a>
            <a
              href="#bimoneda"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-deepSlate-700 hover:text-coral-500 py-1"
            >
              Bimoneda USD / C$
            </a>
            <a
              href="#preguntas"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-deepSlate-700 hover:text-coral-500 py-1"
            >
              Preguntas Frecuentes
            </a>
          </nav>

          <div className="pt-3 border-t border-nacre-200 flex flex-col space-y-2.5">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleWhatsAppContact();
              }}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Contáctanos por WhatsApp</span>
            </button>

            {user ? (
              <Link
                to="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-coral-500"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Ingresar al Sistema</span>
              </Link>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-coral-500 shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

