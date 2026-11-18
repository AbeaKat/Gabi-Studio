import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  EyeOff,
  Eye,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Check,
  ShieldCheck,
  Store,
  Palette,
  Camera,
  AtSign,
  KeyRound,
  RotateCcw,
  Loader2,
  Copy,
  Lock,
  Save,
  UserCircle2,
  Database,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PlanTier, Profile, ThemePaletteId } from '../types';
import { PLAN_INFO } from '../lib/navigation';
import { THEME_PALETTE_LIST, applyThemePalette } from '../lib/themes';
import { PRESET_AVATARS, resolveAvatarUrl } from '../lib/avatars';

const PLAN_FEATURES: Record<PlanTier, { people: string; bullets: string[] }> = {
  1: {
    people: '1 Cuenta Dueño',
    bullets: [
      'Personaliza nombre de tu tienda, foto y tema de colores',
      'Anota tus ventas del día en córdobas o dólares',
      'Lista de productos clara con aviso cuando quedan pocos',
      'Resumen de cuánto dinero entra y cuánto ganas',
    ],
  },
  2: {
    people: '1 Dueño + 1 Cuenta Empleado',
    bullets: [
      'Todo lo del plan Básico + 1 cuenta de empleado asociada',
      'Gestiona el usuario y contraseña de tu empleado desde tu cuenta',
      'Costo de mis compras: reparte envío e impuestos en cada producto',
      'Control de gastos del negocio y ventas al crédito o apartados',
    ],
  },
  3: {
    people: '1 Dueño + 2 Cuentas Empleado',
    bullets: [
      'Todo lo del plan Crece + 2 cuentas de empleado asociadas',
      'Historial de cambios día por día (precios, productos dañados o prestados)',
      'Control de mercadería prestada a otras tiendas',
      'Reporte mensual completo de ganancias y pérdidas',
    ],
  },
};

export const ProfilesPage: React.FC = () => {
  const {
    profile,
    tenant,
    planTier,
    role,
    teamMembers,
    updateStoreAndOwnerProfile,
    uploadProfilePhoto,
    updateEmployeeAccount,
    openOnboardingModal,
    resetOwnerOnboardingForTest,
  } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado del Dueño y Tienda
  const [storeName, setStoreName] = useState(tenant?.name || 'Mi Tienda');
  const [selectedTheme, setSelectedTheme] = useState<ThemePaletteId>(
    tenant?.theme_palette || 'coral'
  );
  const [ownerFullName, setOwnerFullName] = useState(profile?.full_name || '');
  const [ownerUsername, setOwnerUsername] = useState(profile?.username || '');
  const [ownerAvatarUrl, setOwnerAvatarUrl] = useState(profile?.avatar_url || '');
  const [ownerNewPassword, setOwnerNewPassword] = useState('');
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [isSavingOwner, setIsSavingOwner] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Estado de edición por empleado asignado en base de datos
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [empFullName, setEmpFullName] = useState('');
  const [empUsername, setEmpUsername] = useState('');
  const [empNewPassword, setEmpNewPassword] = useState('');
  const [showEmpPassword, setShowEmpPassword] = useState(false);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [credentialsBox, setCredentialsBox] = useState<{
    title: string;
    username: string;
    password: string;
  } | null>(null);

  useEffect(() => {
    if (tenant) {
      setStoreName(tenant.name || 'Mi Tienda');
      setSelectedTheme(tenant.theme_palette || 'coral');
    }
    if (profile) {
      setOwnerFullName(profile.full_name || '');
      setOwnerUsername(profile.username || '');
      setOwnerAvatarUrl(resolveAvatarUrl(profile.avatar_url));
    }
  }, [tenant?.name, tenant?.theme_palette, profile?.full_name, profile?.username, profile?.avatar_url]);

  // ==========================================================================
  // BLOQUEO ESTRICTO PARA CUENTA EMPLEADO ('seller')
  // ==========================================================================
  if (role === 'seller') {
    return (
      <div className="p-6 sm:p-10 max-w-xl mx-auto">
        <div className="bg-white rounded-3xl border border-nacre-200 p-8 text-center space-y-5 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-coral-50 border border-coral-200 text-coral-600 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-deepSlate-900">
              Configuración exclusiva para el Dueño
            </h1>
            <p className="text-sm text-deepSlate-500 leading-relaxed">
              Tu cuenta de <strong>Empleado (@{profile?.username})</strong> está asociada a{' '}
              <strong>{tenant?.name || 'la tienda'}</strong>. Por seguridad, solo la cuenta del dueño puede
              cambiar el nombre de la tienda, tema de colores, nombres de usuario o contraseñas.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200 text-left text-xs space-y-1">
            <div>
              <span className="text-deepSlate-400">Tu nombre: </span>
              <strong className="text-deepSlate-900">{profile?.full_name}</strong>
            </div>
            <div>
              <span className="text-deepSlate-400">Tu usuario: </span>
              <strong className="font-mono text-deepSlate-900">@{profile?.username}</strong>
            </div>
            <div>
              <span className="text-deepSlate-400">Tienda asignada: </span>
              <strong className="text-deepSlate-900">{tenant?.name}</strong>
            </div>
          </div>
          <Link
            to="/app/closing"
            className="inline-flex items-center justify-center w-full py-3 px-5 rounded-xl text-sm font-bold text-white bg-coral-500 hover:bg-coral-600 transition-colors"
          >
            Ir a Mis Ventas
          </Link>
        </div>
      </div>
    );
  }

  const sellers = teamMembers.filter((m) => m.role === 'seller');
  const maxSellers = tenant?.max_seller_profiles ?? (planTier === 1 ? 0 : planTier === 2 ? 1 : 2);
  const extraPaid = tenant?.extra_paid_profiles ?? 0;
  const allowedSellerSeats = maxSellers + extraPaid;

  const handleThemeSelect = async (themeId: ThemePaletteId) => {
    setSelectedTheme(themeId);
    applyThemePalette(themeId);
    const res = await updateStoreAndOwnerProfile({ themePalette: themeId });
    if (res.success) {
      setSuccessMsg('Tema de colores de la tienda actualizado en Supabase.');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setIsUploadingAvatar(true);
    const res = await uploadProfilePhoto(file);
    setIsUploadingAvatar(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.url) {
      setOwnerAvatarUrl(res.url);
      await updateStoreAndOwnerProfile({ ownerAvatarUrl: res.url });
      setSuccessMsg('Tu foto de perfil se subió y guardó en Supabase Storage.');
    }
  };

  const handleSaveOwnerAndStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!storeName.trim()) {
      setErrorMsg('Escribe el nombre de tu tienda.');
      return;
    }
    if (!ownerFullName.trim()) {
      setErrorMsg('Escribe tu nombre completo.');
      return;
    }
    const cleanUser = ownerUsername.trim().replace(/^@/, '');
    if (!cleanUser || cleanUser.length < 3) {
      setErrorMsg('Tu nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }

    setIsSavingOwner(true);
    const res = await updateStoreAndOwnerProfile({
      storeName: storeName.trim(),
      themePalette: selectedTheme,
      ownerFullName: ownerFullName.trim(),
      ownerUsername: cleanUser,
      ownerAvatarUrl,
      ownerNewPassword: ownerNewPassword.trim() || undefined,
    });
    setIsSavingOwner(false);

    if (!res.success) {
      setErrorMsg(res.error || 'No se pudieron guardar los cambios.');
    } else {
      setOwnerNewPassword('');
      setSuccessMsg(
        'Se guardaron los datos de tu tienda y tu perfil de dueño en Supabase.'
      );
    }
  };

  const startEditingEmployee = (emp: Profile) => {
    setEditingEmployeeId(emp.id);
    setEmpFullName(emp.full_name);
    setEmpUsername(emp.username || '');
    setEmpNewPassword('');
    setShowEmpPassword(false);
    setErrorMsg(null);
  };

  const handleSaveEmployeeChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployeeId) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUser = empUsername.trim().replace(/^@/, '');
    if (!cleanUser || cleanUser.length < 3) {
      setErrorMsg('El nombre de usuario del empleado debe tener al menos 3 caracteres.');
      return;
    }

    setIsSavingEmployee(true);
    const res = await updateEmployeeAccount(editingEmployeeId, {
      full_name: empFullName.trim(),
      username: cleanUser,
      password: empNewPassword.trim() || undefined,
    });
    setIsSavingEmployee(false);

    if (!res.success) {
      setErrorMsg(res.error || 'No se pudo actualizar la cuenta del empleado.');
    } else {
      if (empNewPassword.trim()) {
        setCredentialsBox({
          title: `Credenciales actualizadas para ${empFullName.trim()}`,
          username: cleanUser,
          password: empNewPassword.trim(),
        });
      }
      setEditingEmployeeId(null);
      setEmpNewPassword('');
      setSuccessMsg(
        `Se actualizó la cuenta del empleado @${cleanUser} en Supabase Auth.`
      );
    }
  };

  const handleResetEmployeePassword = async (emp: Profile) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const tempPassword = `tienda${Math.floor(1000 + Math.random() * 9000)}`;
    setIsSavingEmployee(true);
    const res = await updateEmployeeAccount(emp.id, {
      password: tempPassword,
    });
    setIsSavingEmployee(false);

    if (!res.success) {
      setErrorMsg(res.error || 'No se pudo reiniciar la contraseña.');
    } else {
      setCredentialsBox({
        title: `Contraseña reiniciada para ${emp.full_name}`,
        username: emp.username || emp.email || '',
        password: tempPassword,
      });
      setSuccessMsg(
        `Se reinició la contraseña de @${emp.username}. Copia la nueva clave temporal abajo.`
      );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900 tracking-tight">
              Mi tienda y equipo
            </h1>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${PLAN_INFO[planTier].badgeColor}`}
            >
              Plan {PLAN_INFO[planTier].name}
            </span>
          </div>
          <p className="text-sm text-deepSlate-500 mt-1">
            Personaliza el estilo de tu tienda, tu perfil de dueño y administra las cuentas de tus empleados.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={openOnboardingModal}
            className="min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-sm inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Asistente de personalización</span>
          </button>
          <button
            type="button"
            onClick={resetOwnerOnboardingForTest}
            className="min-h-[42px] px-3.5 rounded-xl text-xs font-bold text-deepSlate-700 bg-white hover:bg-nacre-100 border border-nacre-200 inline-flex items-center gap-1.5"
            title="Simular el primer inicio de sesión de cuenta dueño"
          >
            <RotateCcw className="w-3.5 h-3.5 text-coral-500" />
            <span>Simular 1er inicio de sesión</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-sm font-bold underline">
            Cerrar
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-sm font-bold underline">
            Cerrar
          </button>
        </div>
      )}

      {credentialsBox && (
        <div className="p-5 rounded-3xl bg-coral-50 border-2 border-coral-500 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-deepSlate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-coral-600" />
              <span>{credentialsBox.title}</span>
            </h3>
            <button
              type="button"
              onClick={() => setCredentialsBox(null)}
              className="text-xs font-bold text-deepSlate-500 hover:text-deepSlate-900"
            >
              Cerrar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-2xl border border-coral-200 font-mono text-xs">
            <div>
              <span className="text-deepSlate-400">Usuario de acceso: </span>
              <strong className="text-deepSlate-900">@{credentialsBox.username}</strong>
            </div>
            <div>
              <span className="text-deepSlate-400">Contraseña activa: </span>
              <strong className="text-coral-600">{credentialsBox.password}</strong>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-deepSlate-600">
              Tu empleado ya puede iniciar sesión en la pantalla de Login con este usuario y contraseña.
            </p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(
                  `Tienda: ${tenant?.name}\nUsuario: @${credentialsBox.username}\nContraseña: ${credentialsBox.password}`
                );
                setSuccessMsg('Credenciales copiadas al portapapeles.');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-deepSlate-900 text-white hover:bg-coral-600 inline-flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar datos de acceso</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECCIÓN 1: ESTILO DE MI TIENDA Y PERFIL DE DUEÑO                     */}
      {/* ==================================================================== */}
      <form
        onSubmit={handleSaveOwnerAndStore}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        {/* Columna izquierda: Foto y Perfil del Dueño */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-nacre-200 p-6 space-y-5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <UserCircle2 className="w-5 h-5 text-coral-500" />
            <h2 className="text-lg font-extrabold text-deepSlate-900">
              Mi perfil de Dueño
            </h2>
          </div>

          {/* Foto de perfil */}
          <div className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200 flex items-center gap-4">
            <div className="relative shrink-0">
              {ownerAvatarUrl ? (
                <img
                  src={resolveAvatarUrl(ownerAvatarUrl)}
                  alt={ownerFullName}
                  onError={() => setOwnerAvatarUrl('')}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-coral-500 bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-coral-500 text-white text-xl font-extrabold flex items-center justify-center">
                  {(ownerFullName || storeName || 'D').charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-xl bg-deepSlate-900 hover:bg-coral-600 text-white shadow-sm"
                title="Cambiar foto de perfil"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <p className="text-xs font-extrabold text-deepSlate-900">Foto de perfil</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-coral-200 text-coral-600 hover:bg-coral-50"
                >
                  Subir foto
                </button>
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setOwnerAvatarUrl(url)}
                    className={`w-7 h-7 rounded-lg overflow-hidden border-2 bg-white ${
                      ownerAvatarUrl === url ? 'border-coral-500' : 'border-nacre-200'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-deepSlate-700 mb-1">
                Tu nombre completo
              </label>
              <input
                type="text"
                required
                value={ownerFullName}
                onChange={(e) => setOwnerFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-deepSlate-700 mb-1">
                Tu nombre de usuario (Login)
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-coral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={ownerUsername}
                  onChange={(e) =>
                    setOwnerUsername(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '_')
                    )
                  }
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm font-mono font-bold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-deepSlate-700 mb-1">
                Cambiar mi contraseña (opcional)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-deepSlate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showOwnerPassword ? 'text' : 'password'}
                  placeholder="Dejar en blanco para mantener actual"
                  value={ownerNewPassword}
                  onChange={(e) => setOwnerNewPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-xs font-mono rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-deepSlate-400"
                >
                  {showOwnerPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: Nombre de la Tienda y Paleta de Colores */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-nacre-200 p-6 flex flex-col justify-between space-y-5 shadow-2xs">
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <Store className="w-5 h-5 text-coral-500" />
              <h2 className="text-lg font-extrabold text-deepSlate-900">
                Nombre y Tema de Colores de mi Tienda
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-deepSlate-700 mb-1">
                Nombre comercial de la tienda
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ej. Boutique & Estudio Gabi"
                className="w-full px-4 py-3 text-base font-extrabold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-deepSlate-700 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-coral-500" />
                  <span>Tema de paleta de colores</span>
                </label>
                <span className="text-[11px] font-semibold text-coral-600">
                  Cambia en tiempo real
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {THEME_PALETTE_LIST.map((p) => {
                  const isSelected = selectedTheme === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleThemeSelect(p.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-2 ${
                        isSelected
                          ? 'border-2 border-coral-500 bg-coral-50/60 shadow-2xs'
                          : 'border-nacre-200 bg-white hover:border-nacre-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center -space-x-1">
                          <span
                            className="w-5 h-5 rounded-full border border-white"
                            style={{ backgroundColor: p.primaryHex }}
                          />
                          <span
                            className="w-5 h-5 rounded-full border border-white"
                            style={{ backgroundColor: p.secondaryHex }}
                          />
                          <span
                            className="w-5 h-5 rounded-full border border-white"
                            style={{ backgroundColor: p.softHex }}
                          />
                        </div>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-coral-500 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-deepSlate-900">{p.name}</p>
                        <p className="text-[10px] text-deepSlate-500 leading-tight">
                          {p.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-nacre-200 flex justify-end">
            <button
              type="submit"
              disabled={isSavingOwner}
              className="min-h-[46px] px-6 rounded-xl text-sm font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-sm inline-flex items-center gap-2 disabled:opacity-60"
            >
              {isSavingOwner ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando en Supabase...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar cambios de tienda y perfil</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* ==================================================================== */}
      {/* SECCIÓN 2: GESTIÓN DE CUENTAS DE EMPLEADOS ASOCIADAS                 */}
      {/* ==================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna izquierda: Cupos y permisos */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-nacre-200 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-coral-50 border border-coral-200 text-coral-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-deepSlate-900">
                  Cuentas de Empleados Asociadas
                </h2>
                <p className="text-xs text-deepSlate-500">
                  Tú controlas su nombre de usuario y su contraseña.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-coral-50/40 border border-coral-200 space-y-1">
                <div className="flex items-center gap-2 font-extrabold text-deepSlate-900">
                  <Eye className="w-4 h-4 text-coral-600" />
                  <span>Cuenta Dueño (@{profile?.username})</span>
                </div>
                <p className="text-deepSlate-600 leading-relaxed">
                  Personaliza la tienda, ve costos y ganancias, y administra usuarios y contraseñas de empleados.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-nacre-50 border border-nacre-200 space-y-1">
                <div className="flex items-center gap-2 font-extrabold text-deepSlate-900">
                  <EyeOff className="w-4 h-4 text-deepSlate-600" />
                  <span>Cuenta Empleado (Vendedor)</span>
                </div>
                <p className="text-deepSlate-600 leading-relaxed">
                  No puede modificar nada de la configuración de cuenta ni ver costos o ganancias. Solo registra ventas y consulta stock.
                </p>
              </div>
            </div>

            {/* Cupos de empleados controlados exclusivamente por Base de Datos */}
            <div className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-deepSlate-700 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-coral-500" />
                  <span>Cuentas asignadas</span>
                </span>
                <span className="font-extrabold text-deepSlate-900">
                  {sellers.length} de {allowedSellerSeats} en BD
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-nacre-200 overflow-hidden">
                <div
                  className="h-full bg-coral-500 rounded-full transition-all"
                  style={{
                    width: `${
                      allowedSellerSeats > 0
                        ? Math.min(100, (sellers.length / allowedSellerSeats) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-deepSlate-500 leading-relaxed">
                El número de cuentas de empleado asignadas a tu tienda está definido en la base de datos según tu plan. No es posible crear cuentas adicionales desde aquí.
              </p>
            </div>
          </div>
        </div>

        {/* Columna derecha: Lista de empleados asignados y gestión de usuario/contraseña */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-nacre-200 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-deepSlate-900">
              Cuentas de Empleado Asignadas ({sellers.length})
            </h2>
            <p className="text-xs text-deepSlate-500">
              Configura el nombre de usuario, cambia o reinicia la contraseña de las cuentas de empleado asignadas a tu tienda en la base de datos.
            </p>
          </div>

          {/* Lista de cuentas de empleados asociadas */}
          {sellers.length === 0 ? (
            <div className="p-6 text-center rounded-2xl border border-nacre-200 bg-nacre-50/50 space-y-1.5">
              <Users className="w-7 h-7 text-deepSlate-400 mx-auto" />
              <p className="text-sm font-extrabold text-deepSlate-900">
                Tu cuenta no tiene cuentas de empleado asignadas
              </p>
              <p className="text-xs text-deepSlate-500">
                Las cuentas de empleado se habilitan y asignan directamente desde la base de datos según tu plan contratado.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sellers.map((emp) => {
                const isEditing = editingEmployeeId === emp.id;
                return (
                  <div
                    key={emp.id}
                    className="p-4 rounded-2xl border border-nacre-200 bg-nacre-50/40 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-coral-50 border border-coral-200 text-coral-600 font-extrabold flex items-center justify-center shrink-0">
                          {(emp.full_name || 'E').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-deepSlate-900 truncate">
                            {emp.full_name}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="font-mono font-bold text-coral-600">
                              @{emp.username}
                            </span>
                            {emp.email && (
                              <span className="text-deepSlate-400 truncate">({emp.email})</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            isEditing ? setEditingEmployeeId(null) : startEditingEmployee(emp)
                          }
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-coral-50 text-deepSlate-800 border border-nacre-200 inline-flex items-center gap-1.5"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-coral-500" />
                          <span>{isEditing ? 'Cancelar' : 'Configurar usuario / clave'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResetEmployeePassword(emp)}
                          disabled={isSavingEmployee}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-coral-50 hover:bg-coral-100 text-coral-700 border border-coral-200 inline-flex items-center gap-1.5"
                          title="Generar una contraseña temporal nueva para este empleado"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reiniciar clave</span>
                        </button>
                      </div>
                    </div>

                    {isEditing && (
                      <form
                        onSubmit={handleSaveEmployeeChanges}
                        className="pt-3 border-t border-nacre-200 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl"
                      >
                        <div>
                          <label className="block text-[11px] font-bold text-deepSlate-600 mb-1">
                            Nombre del empleado
                          </label>
                          <input
                            type="text"
                            required
                            value={empFullName}
                            onChange={(e) => setEmpFullName(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-deepSlate-600 mb-1">
                            Nombre de usuario (@)
                          </label>
                          <input
                            type="text"
                            required
                            value={empUsername}
                            onChange={(e) =>
                              setEmpUsername(
                                e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '_')
                              )
                            }
                            className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-deepSlate-600 mb-1">
                            Nueva contraseña
                          </label>
                          <div className="relative">
                            <input
                              type={showEmpPassword ? 'text' : 'password'}
                              placeholder="Opcional (mín. 6)"
                              value={empNewPassword}
                              onChange={(e) => setEmpNewPassword(e.target.value)}
                              className="w-full pl-3 pr-8 py-2 text-xs font-mono rounded-lg bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEmpPassword(!showEmpPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-deepSlate-400"
                            >
                              {showEmpPassword ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="sm:col-span-3 flex justify-end gap-2 pt-1">
                          <button
                            type="submit"
                            disabled={isSavingEmployee}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-coral-500 hover:bg-coral-600 inline-flex items-center gap-1.5"
                          >
                            {isSavingEmployee ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Guardar cambios del empleado</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECCIÓN 3: COMPARADOR DE PLANES                                      */}
      {/* ==================================================================== */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-deepSlate-900">Tu plan y qué incluye cada uno</h2>
          <p className="text-sm text-deepSlate-500 mt-0.5">
            Resumen de capacidades y cuentas de empleado incluidas según el plan de tu tienda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([1, 2, 3] as PlanTier[]).map((tier) => {
            const info = PLAN_INFO[tier];
            const details = PLAN_FEATURES[tier];
            const isCurrent = planTier === tier;

            return (
              <div
                key={tier}
                className={`rounded-3xl p-6 flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-coral-50/50 border-2 border-coral-500 shadow-md'
                    : 'bg-white border border-nacre-200'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full ${info.badgeColor}`}
                    >
                      Plan {info.name}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-white bg-coral-500 px-3 py-1 rounded-full">
                        <Check className="w-3.5 h-3.5" /> Plan activo
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-deepSlate-900">{info.name}</h3>
                    <p className="text-sm font-semibold text-deepSlate-600 mt-1">{info.promise}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-nacre-50 border border-nacre-200 text-sm font-bold text-deepSlate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-coral-500 shrink-0" />
                    <span>Incluye: {details.people}</span>
                  </div>

                  <ul className="space-y-2.5 text-sm text-deepSlate-700">
                    {details.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
