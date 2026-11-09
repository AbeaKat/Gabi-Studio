import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  LogOut,
  Building2,
  UserCheck,
  Coins,
  ShieldCheck,
  Package,
  CalendarCheck,
  TrendingUp,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DashboardPreview: React.FC = () => {
  const { user, profile, tenant, planTier, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const tierNames: Record<number, string> = {
    1: 'Nivel 1: Esencial',
    2: 'Nivel 2: Crecimiento',
    3: 'Nivel 3: ERP Completo',
  };

  return (
    <div className="min-h-screen bg-nacre-50 text-deepSlate-900 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-nacre-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-coral-500 to-coral-400 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-deepSlate-900">
                  GABI STUDIO
                </span>
                <span className="text-[10px] font-semibold text-deepSlate-500 uppercase -mt-0.5">
                  Panel de Control
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-xs font-mono font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tasa Global: C$ {tenant?.exchange_rate_nio ? Number(tenant.exchange_rate_nio).toFixed(2) : '36.62'}</span>
              </div>

              <button
                onClick={handleSignOut}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-deepSlate-600 hover:text-rose-600 bg-nacre-100 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Welcome Banner */}
        <div className="bg-white rounded-3xl border border-nacre-200 p-8 shadow-sm mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase text-coral-600 bg-coral-50 border border-coral-200">
                  {tierNames[planTier] || `Nivel ${planTier}`}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-deepSlate-700 bg-nacre-100 border border-nacre-200 flex items-center space-x-1">
                  <UserCheck className="w-3 h-3 text-coral-500" />
                  <span>Rol: {role === 'seller' ? 'Vendedor' : 'Dueño (Global Owner)'}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900 tracking-tight">
                Bienvenido, {profile?.full_name || user?.email?.split('@')[0] || 'Administrador'}
              </h1>
              
              <p className="text-sm text-deepSlate-500 flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-deepSlate-400" />
                <span>Empresa: <strong className="text-deepSlate-800">{tenant?.name || 'Gabi Studio Demo'}</strong></span>
                <span className="text-deepSlate-300">•</span>
                <span className="text-xs text-deepSlate-400">{user?.email}</span>
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-coral-50/70 border border-coral-200/80 rounded-2xl p-4 text-center min-w-[130px]">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-coral-600">
                  Plan Activo
                </span>
                <span className="text-xl font-extrabold text-coral-600">
                  Tier {planTier}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Modules Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-deepSlate-900 tracking-tight">
                Módulos del Sistema
              </h2>
              <p className="text-xs text-deepSlate-500">
                Acceso optimizado para tu nivel de plan ({tierNames[planTier]})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Inventory Card */}
            <div className="bg-white rounded-3xl border border-nacre-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-coral-500 text-white flex items-center justify-center shadow-md shadow-coral-500/20 mb-5 group-hover:scale-105 transition-transform">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-deepSlate-900 mb-2">
                  Catálogo e Inventario
                </h3>
                <p className="text-xs text-deepSlate-500 leading-relaxed mb-4">
                  Vista fluida de piezas, control bimoneda, edición rápida y agrupación por Lotes / Colecciones.
                </p>
              </div>
              <div className="pt-4 border-t border-nacre-100 flex items-center justify-between text-xs font-bold text-coral-600">
                <span>Sprint 2 (En desarrollo)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Daily Closing & Sales Card */}
            <div className="bg-white rounded-3xl border border-nacre-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 mb-5 group-hover:scale-105 transition-transform">
                  <CalendarCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-deepSlate-900 mb-2">
                  Cierres Diarios & Venta en Vivo
                </h3>
                <p className="text-xs text-deepSlate-500 leading-relaxed mb-4">
                  Registro de salidas con congelamiento inmutable de costos y utilidades históricas.
                </p>
              </div>
              <div className="pt-4 border-t border-nacre-100 flex items-center justify-between text-xs font-bold text-emerald-600">
                <span>Sprint 3 (En desarrollo)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Financial Dashboard Card */}
            <div className="bg-white rounded-3xl border border-nacre-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-deepSlate-900 text-white flex items-center justify-center shadow-md shadow-deepSlate-900/20 mb-5 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-deepSlate-900 mb-2">
                  Finanzas & Utilidad Real
                </h3>
                <p className="text-xs text-deepSlate-500 leading-relaxed mb-4">
                  KPIs de capital en inventario, ventas del periodo, costo recuperado y ganancia libre en USD y C$.
                </p>
              </div>
              <div className="pt-4 border-t border-nacre-100 flex items-center justify-between text-xs font-bold text-deepSlate-900">
                <span>Sprint 3 (En desarrollo)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>

          {/* Lotes & Importación (Tier 2/3 Feature) */}
          <div className="bg-white rounded-3xl border border-nacre-200 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-extrabold text-base text-deepSlate-900">
                    Calculadora de Importación & Prorrateo de Lotes
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                    Nivel 2+
                  </span>
                </div>
                <p className="text-xs text-deepSlate-500 mt-0.5">
                  Distribuye costos de fletes de envío, tarifas y aduanas a cada pieza individual del lote.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-deepSlate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>{planTier >= 2 ? 'Habilitado en tu plan' : 'Desbloqueable con Nivel 2'}</span>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

