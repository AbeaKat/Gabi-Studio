import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Home,
  ShoppingBag,
  Package,
  Wallet,
  Layers,
  History,
  Users,
  LogOut,
  Lock,
  Menu,
  X,
  Check,
  Edit2,
  Palette,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { OFFICIAL_WHATSAPP_NUMBER } from '../../data/realInventoryData';
import { NAV_ITEMS, NavItem, PLAN_INFO, UPGRADE_COPY } from '../../lib/navigation';
import { OwnerOnboardingModal } from '../onboarding/OwnerOnboardingModal';

const ICONS = {
  home: Home,
  sales: ShoppingBag,
  products: Package,
  money: Wallet,
  costs: Layers,
  history: History,
  team: Users,
};

export const AppLayout: React.FC = () => {
  const {
    profile,
    tenant,
    planTier,
    role,
    signOut,
    updateExchangeRate,
    openOnboardingModal,
  } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(tenant?.exchange_rate_nio ?? 36.62));
  const [upsellTier, setUpsellTier] = useState<2 | 3 | null>(null);

  const isOwner = role === 'global_owner';
  const businessName = tenant?.name || 'Mi Tienda';
  const items = NAV_ITEMS.filter((i) => !(i.ownerOnly && !isOwner));

  const saveRate = async () => {
    const n = parseFloat(rateInput);
    if (!isNaN(n) && n > 0) {
      await updateExchangeRate(n);
      setEditingRate(false);
    }
  };

  const logout = () => {
    signOut();
    navigate('/login');
  };

  const renderItem = (item: NavItem, onClick?: () => void) => {
    const Icon = ICONS[item.icon];
    if (planTier < item.minTier) {
      return (
        <button
          key={item.to}
          type="button"
          onClick={() => setUpsellTier(item.minTier as 2 | 3)}
          className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm text-deepSlate-400 hover:bg-nacre-200/50"
        >
          <span className="flex items-center gap-3">
            <Icon className="w-5 h-5" />
            {item.label}
          </span>
          <span className="flex items-center gap-1 text-[10px] bg-nacre-200 text-deepSlate-600 px-1.5 py-0.5 rounded font-bold">
            <Lock className="w-3 h-3" />
            {PLAN_INFO[item.minTier].short}
          </span>
        </button>
      );
    }
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onClick}
        title={item.hint}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
            isActive
              ? 'bg-coral-500 text-white shadow-sm'
              : 'text-deepSlate-700 hover:bg-white/80'
          }`
        }
      >
        <Icon className="w-5 h-5" />
        {item.label}
      </NavLink>
    );
  };

  const upgradeViaWhatsApp = () => {
    const text = encodeURIComponent(
      `Hola Gabi Studio! Mi tienda ${businessName} quiere actualizar al plan ${
        PLAN_INFO[upsellTier || 2].name
      }.`
    );
    window.open(`https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${text}`, '_blank');
    setUpsellTier(null);
  };

  const nav = (onClick?: () => void) => (
    <nav className="space-y-1">{items.map((i) => renderItem(i, onClick))}</nav>
  );

  return (
    <div className="min-h-screen bg-nacre-50 flex flex-col md:flex-row text-deepSlate-900 font-sans">
      {/* Asistente de Primer Inicio de Sesión y Personalización de Tienda (Solo Dueño) */}
      <OwnerOnboardingModal />

      {/* Sidebar escritorio */}
      <aside className="hidden md:flex flex-col w-64 bg-nacre-100 border-r border-nacre-200 shrink-0">
        <div className="h-16 px-5 flex items-center justify-between border-b border-nacre-200 bg-white/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-coral-500 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm truncate">{businessName}</span>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={openOnboardingModal}
              title="Personalizar tienda, colores y foto"
              className="p-1.5 rounded-lg text-deepSlate-500 hover:text-coral-600 hover:bg-coral-50 transition-colors"
            >
              <Palette className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tarjeta del Usuario Conectado */}
        <div className="p-4 border-b border-nacre-200/80 flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-11 h-11 rounded-2xl object-cover border-2 border-coral-500 shrink-0 bg-white"
            />
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-coral-500 text-white font-extrabold text-base flex items-center justify-center shrink-0">
              {(profile?.full_name || businessName || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-deepSlate-900 truncate">
              {profile?.full_name || 'Usuario'}
            </p>
            <p className="text-xs font-mono text-deepSlate-500 truncate">
              @{profile?.username || 'usuario'}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLAN_INFO[planTier].badgeColor}`}
              >
                Plan {PLAN_INFO[planTier].name}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-deepSlate-600 border border-nacre-200">
                {isOwner ? 'Dueño' : 'Empleado'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-3 overflow-y-auto">{nav()}</div>

        <div className="p-3 border-t border-nacre-200 space-y-2">
          {isOwner && (
            <button
              type="button"
              onClick={openOnboardingModal}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-coral-600 bg-coral-50 hover:bg-coral-100 border border-coral-200 rounded-xl transition-colors"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Estilizar tienda y tema</span>
            </button>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-deepSlate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-nacre-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-nacre-100"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-extrabold truncate">{businessName}</span>
            <span className="hidden sm:inline-flex text-xs font-mono text-deepSlate-400">
              @{profile?.username}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Precio del dólar */}
            {editingRate && isOwner ? (
              <div className="flex items-center gap-1.5 bg-white border-2 border-coral-500 rounded-xl px-2 py-1">
                <span className="text-xs text-deepSlate-500">1 dólar = C$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  autoFocus
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRate();
                    if (e.key === 'Escape') setEditingRate(false);
                  }}
                  className="w-20 text-xs font-bold text-coral-600 focus:outline-none"
                />
                <button
                  onClick={saveRate}
                  className="p-1 rounded bg-coral-500 text-white"
                  title="Guardar"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setEditingRate(false)}
                  className="p-1 text-deepSlate-400"
                  title="Cancelar"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (isOwner) {
                    setRateInput(String(tenant?.exchange_rate_nio ?? 36.62));
                    setEditingRate(true);
                  }
                }}
                title={
                  isOwner
                    ? 'Toca para cambiar el precio del dólar'
                    : 'Tasa de cambio configurada por el dueño'
                }
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                  isOwner
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-nacre-50 text-deepSlate-600 border-nacre-200 cursor-default'
                }`}
              >
                <span>Dólar hoy:</span>
                <span className="font-extrabold">
                  C$ {Number(tenant?.exchange_rate_nio ?? 36.62).toFixed(2)}
                </span>
                {isOwner && <Edit2 className="w-3 h-3 opacity-60" />}
              </button>
            )}
            <button
              onClick={logout}
              className="md:hidden p-2 rounded-lg text-deepSlate-500 hover:text-rose-600"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {menuOpen && (
          <div className="md:hidden bg-nacre-100 border-b border-nacre-200 p-3 shadow-lg space-y-2">
            {nav(() => setMenuOpen(false))}
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  openOnboardingModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold text-coral-600 bg-coral-50 border border-coral-200 rounded-xl"
              >
                <Palette className="w-4 h-4" />
                <span>Estilizar tienda y tema</span>
              </button>
            )}
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {upsellTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deepSlate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 relative">
            <button
              onClick={() => setUpsellTier(null)}
              className="absolute top-5 right-5 p-1 rounded-full text-deepSlate-400 hover:bg-nacre-100"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-coral-600 bg-coral-50 px-2.5 py-1 rounded-full">
              Incluido en el plan {PLAN_INFO[upsellTier].name}
            </span>
            <h3 className="text-xl font-extrabold mt-3 mb-2">{UPGRADE_COPY[upsellTier].title}</h3>
            <p className="text-sm text-deepSlate-500 leading-relaxed mb-6">
              {UPGRADE_COPY[upsellTier].body}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={upgradeViaWhatsApp}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white bg-coral-500 hover:bg-coral-600"
              >
                Solicitar este plan por WhatsApp
              </button>
              <button
                onClick={() => setUpsellTier(null)}
                className="py-3 px-4 rounded-xl text-sm font-bold text-deepSlate-600 bg-nacre-100 hover:bg-nacre-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
