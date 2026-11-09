import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  EyeOff,
  Eye,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Profile, UserRole } from '../types';
import {
  getStoredTeamProfiles,
  saveStoredTeamProfiles,
  TEST_ACCOUNT_PRESETS,
  TENANT_STELLA_ID,
  ensureRealInventorySeeded,
} from '../data/realInventoryData';

export const ProfilesPage: React.FC = () => {
  const {
    tenant,
    planTier,
    role,
    setSimulatedRole,
    setSimulatedTier,
    updateTenantConfig,
    signInWithPreset,
  } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('seller');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadProfiles = () => {
    setProfiles(getStoredTeamProfiles());
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const maxOwners = tenant?.max_owner_profiles ?? 1;
  const maxSellers = tenant?.max_seller_profiles ?? (planTier === 1 ? 0 : planTier === 2 ? 1 : 2);
  const extraPaid = tenant?.extra_paid_profiles ?? 0;

  const totalAllowedSeats = maxOwners + maxSellers + extraPaid;
  const currentOwners = profiles.filter((p) => p.role === 'global_owner').length;
  const currentSellers = profiles.filter((p) => p.role === 'seller').length;
  const usedSeats = profiles.length;
  const remainingSeats = Math.max(0, totalAllowedSeats - usedSeats);

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newName.trim()) {
      setErrorMsg('Ingresa el nombre completo del integrante.');
      return;
    }

    if (usedSeats >= totalAllowedSeats) {
      setErrorMsg(
        `Has alcanzado el límite de ${totalAllowedSeats} asiento(s) de tu Nivel ${planTier}. Añade un asiento extra o sube de nivel para registrar más usuarios.`
      );
      return;
    }

    if (newRole === 'seller' && planTier === 1 && extraPaid === 0) {
      setErrorMsg(
        'El Nivel 1 (Esencial) no incluye perfiles de Vendedor por defecto. Activa un asiento adicional o cambia al Nivel 2.'
      );
      return;
    }

    const created: Profile = {
      id: `prof-${Date.now()}`,
      tenant_id: tenant?.id || TENANT_STELLA_ID,
      full_name: newName.trim(),
      role: newRole,
      created_at: new Date().toISOString(),
    };

    const updated = [...profiles, created];
    setProfiles(updated);
    saveStoredTeamProfiles(updated);
    setNewName('');
    setSuccessMsg(`Perfil "${created.full_name}" (${created.role === 'seller' ? 'Vendedor' : 'Dueño'}) creado exitosamente.`);
  };

  const handleRemoveProfile = (id: string) => {
    if (profiles.length <= 1) {
      setErrorMsg('Debe existir al menos 1 perfil Dueño activo en la empresa.');
      return;
    }
    const updated = profiles.filter((p) => p.id !== id);
    setProfiles(updated);
    saveStoredTeamProfiles(updated);
  };

  const handleAddExtraSeat = () => {
    updateTenantConfig({ extra_paid_profiles: extraPaid + 1 });
    setSuccessMsg('Se habilitó +1 asiento adicional (extra_paid_profiles) en la suscripción de tu empresa.');
  };

  const handleResetRealInventory = () => {
    ensureRealInventorySeeded(true);
    loadProfiles();
    setSuccessMsg('¡Inventario real Stella, Wayuu y Georgina (116 SKUs) restaurado a su estado original!');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900 tracking-tight">
              Perfiles, Roles & Licenciamiento por Nivel
            </h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-coral-50 text-coral-600 border border-coral-200">
              {usedSeats} / {totalAllowedSeats} Asientos
            </span>
          </div>
          <p className="text-xs sm:text-sm text-deepSlate-500 mt-1">
            Administra los accesos de Dueño y Vendedores y prueba al instante cada uno de los 3 Niveles del sistema.
          </p>
        </div>

        <button
          onClick={handleResetRealInventory}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-nacre-100 text-deepSlate-800 border border-nacre-200 shadow-2xs"
        >
          <RefreshCw className="w-4 h-4 text-coral-500" />
          <span>Restaurar Inventario Real Excel</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="underline">
            Cerrar
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* QUICK TEST PROFILES SWITCHER (1-CLICK TESTING FOR ALL LEVELS)        */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-3xl border border-nacre-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-coral-500 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-deepSlate-900">
                Conmutador Rápido de Perfiles de Prueba (Inventario Real Stella & Georgina)
              </h3>
              <p className="text-xs text-deepSlate-500">
                Haz clic en cualquiera de estos perfiles para cambiar inmediatamente de Nivel (`1`, `2` o `3`) y de Rol (`Dueño` o `Vendedor`).
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEST_ACCOUNT_PRESETS.map((preset) => {
            const isCurrent = planTier === preset.plan_tier && role === preset.role;
            return (
              <div
                key={preset.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-coral-50/70 border-2 border-coral-500 shadow-sm'
                    : 'bg-nacre-50/60 border-nacre-200 hover:bg-white'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-coral-600 border border-coral-200">
                      {preset.badge}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Activo
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-extrabold text-deepSlate-900">{preset.label}</h4>
                  <p className="text-[11px] text-deepSlate-600 leading-relaxed">
                    {preset.description}
                  </p>
                  <div className="p-2 rounded-xl bg-white border border-nacre-200 font-mono text-[10px] text-deepSlate-600 space-y-0.5">
                    <div>
                      <span className="text-deepSlate-400">Correo: </span>
                      <strong className="text-deepSlate-900">{preset.email}</strong>
                    </div>
                    <div>
                      <span className="text-deepSlate-400">Clave: </span>
                      <strong className="text-coral-600">{preset.password}</strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    signInWithPreset(preset);
                    setSuccessMsg(`Cambiado al perfil: ${preset.label}`);
                  }}
                  className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-emerald-600 text-white'
                      : 'bg-coral-500 hover:bg-coral-600 text-white shadow-sm'
                  }`}
                >
                  {isCurrent ? 'Perfil Actualmente Activo' : 'Activar Este Perfil'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SEAT LIMITS & TEAM MANAGEMENT (SPRINT 4)                             */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Seat Breakdown Card */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-nacre-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-deepSlate-900">
                Control de Asientos del Plan (Nivel {planTier})
              </h3>
              <p className="text-xs text-deepSlate-500">
                Verificación según `max_owner_profiles`, `max_seller_profiles` y `extra_paid_profiles`
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs font-mono bg-nacre-50 p-4 rounded-2xl border border-nacre-200">
            <div className="flex justify-between">
              <span className="font-sans text-deepSlate-600">Perfiles Dueño Incluidos (`max_owner_profiles`):</span>
              <strong className="text-deepSlate-900">{maxOwners}</strong>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-deepSlate-600">Perfiles Vendedor Incluidos (`max_seller_profiles`):</span>
              <strong className="text-deepSlate-900">{maxSellers}</strong>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-coral-600 font-bold">Asientos Adicionales Pagados (`extra_paid_profiles`):</span>
              <strong className="text-coral-600">+{extraPaid}</strong>
            </div>
            <div className="pt-2 border-t border-nacre-200 flex justify-between text-sm">
              <span className="font-sans font-extrabold text-deepSlate-900">Capacidad Total de Usuarios:</span>
              <strong className="text-emerald-600">{totalAllowedSeats} asientos</strong>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAddExtraSeat}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-coral-50 hover:bg-coral-100 text-coral-700 border border-coral-200 flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Simular +1 Asiento Extra</span>
            </button>

            <button
              type="button"
              onClick={() => setSimulatedTier(planTier === 3 ? 1 : ((planTier + 1) as 1 | 2 | 3))}
              className="py-2.5 px-4 rounded-xl text-xs font-bold bg-nacre-100 hover:bg-nacre-200 text-deepSlate-700"
            >
              Cambiar Nivel ({planTier}/3)
            </button>
          </div>
        </div>

        {/* Team Members List & Create Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-nacre-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-deepSlate-900">
                Usuarios Registrados en la Empresa ({usedSeats} activos)
              </h3>
              <p className="text-xs text-deepSlate-500">
                {remainingSeats > 0
                  ? `Tienes ${remainingSeats} asiento(s) disponible(s) para asignar.`
                  : 'Cupo de asientos lleno en este nivel.'}
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-deepSlate-500">
              {currentOwners} Dueño(s) • {currentSellers} Vendedor(es)
            </span>
          </div>

          {/* Add Member Form */}
          <form
            onSubmit={handleAddProfile}
            className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200 flex flex-col sm:flex-row items-center gap-3"
          >
            <input
              type="text"
              placeholder="Nombre completo del usuario (ej. Andrea Ventas)..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-nacre-200 focus:outline-none focus:border-coral-500"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="w-full sm:w-44 px-3 py-2 text-xs font-bold rounded-xl bg-white border border-nacre-200"
            >
              <option value="seller">Rol: Vendedor</option>
              <option value="global_owner">Rol: Dueño Global</option>
            </select>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 flex items-center justify-center space-x-1.5 shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Asignar Asiento</span>
            </button>
          </form>

          {/* Profiles Table */}
          <div className="divide-y divide-nacre-100 border border-nacre-200 rounded-2xl overflow-hidden">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="p-3.5 flex items-center justify-between text-xs hover:bg-nacre-50/60"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                      p.role === 'global_owner'
                        ? 'bg-coral-50 text-coral-600 border border-coral-200'
                        : 'bg-nacre-100 text-deepSlate-700 border border-nacre-200'
                    }`}
                  >
                    {p.role === 'global_owner' ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="font-extrabold text-deepSlate-900 block">{p.full_name}</span>
                    <span className="text-[11px] text-deepSlate-400">
                      {p.role === 'global_owner'
                        ? 'Acceso total a costos, márgenes, P&L y configuración'
                        : 'Vendedor: costos, márgenes y finanzas ocultos'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSimulatedRole(p.role)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-nacre-100 hover:bg-coral-50 hover:text-coral-600 text-deepSlate-700"
                  >
                    Probar Vista
                  </button>
                  <button
                    onClick={() => handleRemoveProfile(p.id)}
                    className="p-1.5 text-deepSlate-300 hover:text-rose-600"
                    title="Liberar asiento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
