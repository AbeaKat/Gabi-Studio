import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Package,
  CalendarCheck,
  TrendingUp,
  Layers,
  History,
  Users,
  LogOut,
  Building2,
  Lock,
  Edit2,
  Check,
  X,
  Menu,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PlanTier, UserRole } from '../../types';

export const AppLayout: React.FC = () => {
  const {
    tenant,
    planTier,
    role,
    signOut,
    updateExchangeRate,
    setSimulatedRole,
    setSimulatedTier,
  } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(
    tenant?.exchange_rate_nio ? String(tenant.exchange_rate_nio) : '36.62'
  );
  const [rateSaving, setRateSaving] = useState(false);
  const [lockedModalTier, setLockedModalTier] = useState<PlanTier | null>(null);

  const tierLabels: Record<number, { name: string; badgeColor: string }> = {
    1: { name: 'Nivel 1: Esencial', badgeColor: 'bg-nacre-200 text-deepSlate-700' },
    2: { name: 'Nivel 2: Crecimiento', badgeColor: 'bg-coral-50 text-coral-600 border border-coral-200' },
    3: { name: 'Nivel 3: ERP Completo', badgeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  };

  const handleSaveRate = async () => {
    const parsed = parseFloat(rateInput);
    if (!isNaN(parsed) && parsed > 0) {
      setRateSaving(true);
      await updateExchangeRate(parsed);
      setRateSaving(false);
      setEditingRate(false);
    }
  };

  const handleToggleSimulatedRole = () => {
    const nextRole: UserRole = role === 'global_owner' ? 'seller' : 'global_owner';
    setSimulatedRole(nextRole);
  };

  const handleLockedFeatureClick = (requiredTier: PlanTier) => {
    setLockedModalTier(requiredTier);
  };

  const handleWhatsAppUpgrade = () => {
    const text = encodeURIComponent(
      `Hola Gabi Studio! Mi empresa ${tenant?.name || ''} desea consultar la actualización al Nivel ${lockedModalTier || 2}.`
    );
    window.open(`https://wa.me/50588888888?text=${text}`, '_blank');
    setLockedModalTier(null);
  };

  return (
    <div className="min-h-screen bg-nacre-50 flex flex-col md:flex-row text-deepSlate-900 font-sans selection:bg-coral-100 selection:text-coral-900">
      
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-nacre-100 border-r border-nacre-200 shrink-0 select-none">
        
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-nacre-200 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-coral-500 to-coral-400 flex items-center justify-center text-white shadow-sm shadow-coral-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-deepSlate-900">
                GABI STUDIO
              </span>
              <span className="text-[9px] font-semibold text-deepSlate-500 uppercase -mt-0.5 tracking-wider">
                Control & Finanzas
              </span>
            </div>
          </div>
        </div>

        {/* Tenant info chip */}
        <div className="p-4 border-b border-nacre-200/80 bg-white/30">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-coral-50 border border-coral-200 flex items-center justify-center text-coral-600 shrink-0 font-bold text-xs">
              {tenant?.name?.charAt(0) || 'S'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-deepSlate-900 truncate" title={tenant?.name}>
                {tenant?.name || 'Stella & Georgina'}
              </p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    tierLabels[planTier]?.badgeColor || 'bg-coral-50 text-coral-600'
                  }`}
                >
                  Nivel {planTier}
                </span>
                <span className="text-[10px] text-deepSlate-400 capitalize">
                  {role === 'seller' ? 'Vendedor' : 'Dueño'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          
          <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-deepSlate-400">
            Operación Diaria (Nivel 1+)
          </div>

          <NavLink
            to="/app/inventory"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-coral-500 text-white shadow-sm shadow-coral-500/25'
                  : 'text-deepSlate-700 hover:bg-white/80 hover:text-deepSlate-900'
              }`
            }
          >
            <Package className="w-4 h-4" />
            <span>Catálogo e Inventario</span>
          </NavLink>

          <NavLink
            to="/app/closing"
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-coral-500 text-white shadow-sm'
                  : 'text-deepSlate-700 hover:bg-white/80 hover:text-deepSlate-900'
              }`
            }
          >
            <div className="flex items-center space-x-3">
              <CalendarCheck className="w-4 h-4" />
              <span>Cierre & Ventas 1a1</span>
            </div>
          </NavLink>

          <NavLink
            to="/app/finance"
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-coral-500 text-white shadow-sm'
                  : 'text-deepSlate-700 hover:bg-white/80 hover:text-deepSlate-900'
              }`
            }
          >
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-4 h-4" />
              <span>Finanzas, Gastos & P&L</span>
            </div>
            {role === 'seller' && <Lock className="w-3.5 h-3.5 opacity-60" />}
          </NavLink>

          {/* Tier 2+ Advanced Modules */}
          <div className="pt-4 px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-deepSlate-400">
            Crecimiento & ERP (N2 / N3)
          </div>

          {planTier >= 2 ? (
            <NavLink
              to="/app/batches"
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-coral-500 text-white shadow-sm'
                    : 'text-deepSlate-700 hover:bg-white/80 hover:text-deepSlate-900'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Layers className="w-4 h-4" />
                <span>Calculadora de Lotes</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-coral-100/80 text-coral-800 font-mono">
                N2
              </span>
            </NavLink>
          ) : (
            <button
              type="button"
              onClick={() => handleLockedFeatureClick(2)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-deepSlate-400 hover:bg-nacre-200/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Layers className="w-4 h-4 text-deepSlate-400" />
                <span>Calculadora de Lotes</span>
              </div>
              <span className="flex items-center space-x-1 text-[10px] bg-nacre-200 text-deepSlate-600 px-1.5 py-0.5 rounded font-bold">
                <Lock className="w-2.5 h-2.5" />
                <span>Nivel 2</span>
              </span>
            </button>
          )}

          {planTier >= 3 ? (
            <NavLink
              to="/app/audit"
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-coral-500 text-white shadow-sm'
                    : 'text-deepSlate-700 hover:bg-white/80 hover:text-deepSlate-900'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <History className="w-4 h-4" />
                <span>Kardex & Auditoría</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono">
                N3
              </span>
            </NavLink>
          ) : (
            <button
              type="button"
              onClick={() => handleLockedFeatureClick(3)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-deepSlate-400 hover:bg-nacre-200/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <History className="w-4 h-4 text-deepSlate-400" />
                <span>Kardex & Auditoría</span>
              </div>
              <span className="flex items-center space-x-1 text-[10px] bg-nacre-200 text-deepSlate-600 px-1.5 py-0.5 rounded font-bold">
                <Lock className="w-2.5 h-2.5" />
                <span>Nivel 3</span>
              </span>
            </button>
          )}

          <NavLink
            to="/app/team"
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-coral-500 text-white shadow-sm'
                  : 'text-deepSlate-700 hover:bg-white/80 hover:text-deepSlate-900'
              }`
            }
          >
            <div className="flex items-center space-x-3">
              <Users className="w-4 h-4" />
              <span>Perfiles & Niveles</span>
            </div>
          </NavLink>

        </nav>

        {/* Interactive Level & Role Simulator in sidebar bottom */}
        <div className="p-3.5 border-t border-nacre-200 bg-white/40 space-y-2.5">
          
          {/* Tier Switcher */}
          <div className="bg-nacre-50 border border-nacre-200 rounded-xl p-2 space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-deepSlate-500 block px-1">
              Probar Nivel del Plan:
            </span>
            <div className="grid grid-cols-3 gap-1">
              {([1, 2, 3] as PlanTier[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setSimulatedTier(t)}
                  className={`py-1 rounded-lg text-[11px] font-extrabold transition-all ${
                    planTier === t
                      ? 'bg-coral-500 text-white shadow-2xs'
                      : 'bg-white text-deepSlate-600 hover:bg-coral-50'
                  }`}
                >
                  Nivel {t}
                </button>
              ))}
            </div>
          </div>

          {/* Role Switcher */}
          <div className="bg-nacre-50 border border-nacre-200 rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {role === 'seller' ? (
                <EyeOff className="w-3.5 h-3.5 text-coral-600" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className="text-[11px] font-bold text-deepSlate-700">
                {role === 'seller' ? 'Modo Vendedor' : 'Modo Dueño'}
              </span>
            </div>
            <button
              onClick={handleToggleSimulatedRole}
              title="Alternar entre Dueño y Vendedor para probar la protección de costos"
              className="text-[10px] font-bold px-2 py-1 rounded bg-white hover:bg-coral-50 text-coral-600 border border-coral-200 shadow-2xs"
            >
              Cambiar
            </button>
          </div>

          <button
            onClick={() => {
              signOut();
              navigate('/');
            }}
            className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-bold text-deepSlate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>

      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-nacre-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          
          {/* Mobile hamburger & title */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-deepSlate-700 hover:bg-nacre-100"
              aria-label="Abrir navegación móvil"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5">
              <Building2 className="w-4 h-4 text-coral-500 hidden sm:block" />
              <span className="font-extrabold text-sm sm:text-base text-deepSlate-900 truncate">
                {tenant?.name || 'Stella & Georgina'}
              </span>
              <span
                className={`hidden sm:inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  tierLabels[planTier]?.badgeColor || 'bg-coral-50 text-coral-600'
                }`}
              >
                {tierLabels[planTier]?.name || `Tier ${planTier}`}
              </span>
            </div>
          </div>

          {/* Right Header Controls (Editable Exchange Rate + User Role) */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* Editable Exchange Rate USD -> C$ */}
            <div className="relative">
              {editingRate ? (
                <div className="flex items-center space-x-1.5 bg-white border-2 border-coral-500 rounded-xl px-2 py-1 shadow-md">
                  <span className="text-xs font-mono font-bold text-deepSlate-500">1 USD = C$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    className="w-20 px-1 py-0.5 text-xs font-mono font-extrabold text-coral-600 focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRate();
                      if (e.key === 'Escape') setEditingRate(false);
                    }}
                  />
                  <button
                    onClick={handleSaveRate}
                    disabled={rateSaving}
                    className="p-1 rounded bg-coral-500 hover:bg-coral-600 text-white"
                    title="Guardar Tasa"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setEditingRate(false)}
                    className="p-1 rounded text-deepSlate-400 hover:text-deepSlate-700"
                    title="Cancelar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (role === 'global_owner') {
                      setRateInput(String(tenant?.exchange_rate_nio || 36.62));
                      setEditingRate(true);
                    }
                  }}
                  title={
                    role === 'global_owner'
                      ? 'Haz clic para editar la tasa de cambio global'
                      : 'Tasa de cambio global vigente'
                  }
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                    role === 'global_owner'
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 cursor-pointer shadow-2xs'
                      : 'bg-nacre-100 text-deepSlate-700 border-nacre-200 cursor-default'
                  }`}
                >
                  <span className="text-emerald-600 text-[11px] font-sans font-semibold">Tasa C$:</span>
                  <span className="text-emerald-900 font-extrabold">
                    {Number(tenant?.exchange_rate_nio || 36.62).toFixed(2)}
                  </span>
                  {role === 'global_owner' && (
                    <Edit2 className="w-3 h-3 text-emerald-600 opacity-60 hover:opacity-100" />
                  )}
                </button>
              )}
            </div>

            {/* Role indicator badge */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleToggleSimulatedRole}
                title="Haz clic para cambiar entre Dueño y Vendedor"
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  role === 'seller'
                    ? 'bg-nacre-200 text-deepSlate-700 hover:bg-nacre-300'
                    : 'bg-coral-50 text-coral-700 border border-coral-200 hover:bg-coral-100'
                }`}
              >
                <UserCheck className="w-3 h-3" />
                <span className="hidden sm:inline">{role === 'seller' ? 'Vendedor' : 'Dueño'}</span>
              </button>
            </div>

            {/* Quick logout for mobile */}
            <button
              onClick={() => {
                signOut();
                navigate('/');
              }}
              className="md:hidden p-2 rounded-lg text-deepSlate-500 hover:text-rose-600 hover:bg-rose-50"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>

        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-nacre-100 border-b border-nacre-200 p-4 space-y-2 shadow-lg">
            <NavLink
              to="/app/inventory"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold text-deepSlate-800 hover:bg-white"
            >
              <Package className="w-4 h-4" />
              <span>Catálogo e Inventario</span>
            </NavLink>
            <NavLink
              to="/app/closing"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold text-deepSlate-800 hover:bg-white"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Cierre & Ventas 1a1</span>
            </NavLink>
            <NavLink
              to="/app/finance"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold text-deepSlate-800 hover:bg-white"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Finanzas, Gastos & P&L</span>
            </NavLink>
            <NavLink
              to="/app/batches"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold text-deepSlate-800 hover:bg-white"
            >
              <Layers className="w-4 h-4" />
              <span>Calculadora de Lotes (Nivel 2)</span>
            </NavLink>
            <NavLink
              to="/app/audit"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold text-deepSlate-800 hover:bg-white"
            >
              <History className="w-4 h-4" />
              <span>Kardex & Auditoría (Nivel 3)</span>
            </NavLink>
            <NavLink
              to="/app/team"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-bold text-deepSlate-800 hover:bg-white"
            >
              <Users className="w-4 h-4" />
              <span>Perfiles & Niveles</span>
            </NavLink>
          </div>
        )}

        {/* Page Viewport Outlet */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

      </div>

      {/* Upsell / Locked Module Modal */}
      {lockedModalTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deepSlate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-nacre-200 shadow-modal-depth relative animate-modal-enter">
            <button
              onClick={() => setLockedModalTier(null)}
              className="absolute top-5 right-5 p-1 rounded-full text-deepSlate-400 hover:text-deepSlate-700 hover:bg-nacre-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-coral-50 border border-coral-200 flex items-center justify-center text-coral-500 mb-4">
              <Lock className="w-6 h-6" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-coral-600 bg-coral-50 px-2.5 py-1 rounded-full">
              Función de Nivel {lockedModalTier}
            </span>

            <h3 className="text-xl font-extrabold text-deepSlate-900 mt-3 mb-2">
              {lockedModalTier === 2
                ? 'Calculadora de Lotes & Prorrateo de Importaciones'
                : 'Kardex Auditable & Historial de Cambios'}
            </h3>

            <p className="text-xs sm:text-sm text-deepSlate-500 leading-relaxed mb-6">
              {lockedModalTier === 2
                ? 'El Nivel 2 (Crecimiento) te permite distribuir fletes de envío, tarifas e impuestos a cada pieza individual, además de registrar gastos operativos y bloquear costos a vendedores.'
                : 'El Nivel 3 (ERP Completo) habilita trazabilidad completa de mermas, consignación, auditoría de precios y Estado de Resultados (P&L) mensual.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => {
                  setSimulatedTier(lockedModalTier);
                  navigate(lockedModalTier === 2 ? '/app/batches' : '/app/audit');
                  setLockedModalTier(null);
                }}
                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 transition-all text-center"
              >
                Activar Nivel {lockedModalTier} para Probar
              </button>
              <button
                onClick={handleWhatsAppUpgrade}
                className="w-full sm:w-auto py-3 px-4 rounded-xl text-xs font-bold text-deepSlate-600 bg-nacre-100 hover:bg-nacre-200 transition-colors"
              >
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
