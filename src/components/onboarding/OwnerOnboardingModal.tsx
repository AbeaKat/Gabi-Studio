import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Store,
  Palette,
  UserCircle2,
  Camera,
  Users,
  Check,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  RotateCcw,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AtSign,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { THEME_PALETTE_LIST, applyThemePalette, ThemePaletteId } from '../../lib/themes';
import { PLAN_INFO } from '../../lib/navigation';
import { PRESET_AVATARS, resolveAvatarUrl } from '../../lib/avatars';

interface EditableEmployee {
  id: string;
  full_name: string;
  username: string;
  email: string;
  password: string;
  showPassword?: boolean;
}

export const OwnerOnboardingModal: React.FC = () => {
  const {
    profile,
    tenant,
    planTier,
    role,
    teamMembers,
    isOnboardingOpen,
    needsOnboarding,
    closeOnboardingModal,
    completeOwnerOnboarding,
    uploadProfilePhoto,
  } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [storeName, setStoreName] = useState('');
  const [themePalette, setThemePalette] = useState<ThemePaletteId>('coral');
  const [exchangeRate, setExchangeRate] = useState('36.62');

  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerAvatarUrl, setOwnerAvatarUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [employees, setEmployees] = useState<EditableEmployee[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetBanner, setResetBanner] = useState<string | null>(null);

  const associatedSellers = teamMembers.filter((m) => m.role === 'seller');
  const hasEmployeeStep = associatedSellers.length > 0 || planTier >= 2;

  useEffect(() => {
    if (isOnboardingOpen && profile && tenant) {
      setStoreName(
        tenant.name && tenant.name !== 'Mi Tienda' && tenant.name !== 'Mi Empresa Demo'
          ? tenant.name
          : 'Mi Tienda'
      );
      setThemePalette(tenant.theme_palette || 'coral');
      setExchangeRate(String(tenant.exchange_rate_nio || 36.62));
      setOwnerFullName(profile.full_name || '');
      setOwnerUsername(profile.username || '');
      setOwnerAvatarUrl(resolveAvatarUrl(profile.avatar_url));
      setStep(1);
      setErrorMsg(null);
    }
  }, [isOnboardingOpen]);

  useEffect(() => {
    if (isOnboardingOpen) {
      setEmployees((prev) => {
        if (prev.length > 0 && prev.length === associatedSellers.length) return prev;
        return associatedSellers.map((emp) => ({
          id: emp.id,
          full_name: emp.full_name,
          username: emp.username || emp.email?.split('@')[0] || 'vendedor',
          email: emp.email || '',
          password: '',
          showPassword: false,
        }));
      });
    }
  }, [isOnboardingOpen, associatedSellers.length]);

  if (!isOnboardingOpen || role !== 'global_owner') {
    return null;
  }

  const totalSteps = hasEmployeeStep ? 3 : 2;

  const handleSelectTheme = (id: ThemePaletteId) => {
    setThemePalette(id);
    applyThemePalette(id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsUploadingPhoto(true);
    const res = await uploadProfilePhoto(file);
    setIsUploadingPhoto(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.url) {
      setOwnerAvatarUrl(res.url);
    }
  };

  const handleEmployeeChange = (
    id: string,
    field: keyof EditableEmployee,
    value: string | boolean
  ) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, [field]: value } : emp))
    );
  };

  const handleQuickResetEmployeePassword = (emp: EditableEmployee) => {
    const tempPass = 'clave2026';
    handleEmployeeChange(emp.id, 'password', tempPass);
    handleEmployeeChange(emp.id, 'showPassword', true);
    setResetBanner(
      `Se preparó la nueva clave "${tempPass}" para @${emp.username}. Se aplicará al guardar.`
    );
    setTimeout(() => setResetBanner(null), 5000);
  };

  const validateCurrentStep = (): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (!storeName.trim()) {
        setErrorMsg('Escribe el nombre de tu tienda para continuar.');
        return false;
      }
      const rateNum = parseFloat(exchangeRate);
      if (isNaN(rateNum) || rateNum <= 0) {
        setErrorMsg('Ingresa una tasa de cambio válida mayor a 0.');
        return false;
      }
    }
    if (step === 2) {
      if (!ownerFullName.trim()) {
        setErrorMsg('Escribe tu nombre completo o nombre visible.');
        return false;
      }
      const cleanUser = ownerUsername.trim().replace(/^@/, '');
      if (!cleanUser || cleanUser.length < 3) {
        setErrorMsg('Tu nombre de usuario debe tener al menos 3 caracteres.');
        return false;
      }
    }
    if (step === 3) {
      for (const emp of employees) {
        const cleanEmpUser = emp.username.trim().replace(/^@/, '');
        if (!cleanEmpUser || cleanEmpUser.length < 3) {
          setErrorMsg(
            `El nombre de usuario del empleado "${emp.full_name || 'Vendedor'}" debe tener al menos 3 caracteres.`
          );
          return false;
        }
        if (emp.password && emp.password.trim().length > 0 && emp.password.trim().length < 6) {
          setErrorMsg(
            `La nueva contraseña para @${cleanEmpUser} debe tener al menos 6 caracteres.`
          );
          return false;
        }
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateCurrentStep()) return;
    if (step === 1) setStep(2);
    else if (step === 2 && hasEmployeeStep) setStep(3);
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;

    setIsSaving(true);
    setErrorMsg(null);

    const res = await completeOwnerOnboarding({
      storeName: storeName.trim(),
      themePalette,
      exchangeRateNio: parseFloat(exchangeRate) || 36.62,
      ownerFullName: ownerFullName.trim(),
      ownerUsername: ownerUsername.trim().replace(/^@/, ''),
      ownerAvatarUrl,
      employeeUpdates: employees.map((emp) => ({
        id: emp.id,
        username: emp.username.trim().replace(/^@/, ''),
        full_name: emp.full_name.trim(),
        password: emp.password.trim() || undefined,
      })),
    });

    setIsSaving(false);
    if (!res.success) {
      setErrorMsg(res.error || 'No se pudo guardar la configuración.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-deepSlate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-nacre-200 shadow-modal-depth overflow-hidden my-auto animate-modal-enter">
        {/* Cabecera con gradiente dinámico según el tema elegido */}
        <div className="bg-coral-500 text-white px-6 py-5 sm:px-8 sm:py-6 relative transition-colors">
          {!needsOnboarding && (
            <button
              type="button"
              onClick={closeOnboardingModal}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
              aria-label="Cerrar asistente"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full w-fit mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              Configuración de Cuenta Dueño • Plan {PLAN_INFO[planTier].name}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {step === 1 && '1. Estiliza tu tienda a tu gusto'}
            {step === 2 && '2. Configura tu perfil y usuario de Dueño'}
            {step === 3 && '3. Configura las cuentas de tus empleados'}
          </h2>
          <p className="text-xs sm:text-sm text-white/90 mt-1">
            {step === 1 &&
              'Elige el nombre de tu negocio y la paleta de colores que verá todo tu equipo.'}
            {step === 2 &&
              'Sube tu foto de perfil y define tu nombre de usuario único para iniciar sesión.'}
            {step === 3 &&
              'Personaliza el nombre de usuario y la contraseña de las cuentas de empleado asociadas a tu tienda.'}
          </p>

          {/* Indicador de pasos */}
          <div className="flex items-center gap-2 mt-4">
            {Array.from({ length: totalSteps }, (_, idx) => {
              const s = (idx + 1) as 1 | 2 | 3;
              const isCurrent = step === s;
              const isDone = step > s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (s < step || validateCurrentStep()) setStep(s);
                  }}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    isCurrent || isDone ? 'bg-white' : 'bg-white/30'
                  }`}
                  aria-label={`Paso ${s}`}
                />
              );
            })}
          </div>
        </div>

        <form onSubmit={handleFinish} className="p-6 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resetBanner && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{resetBanner}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASO 1: NOMBRE DE LA TIENDA Y TEMA DE PALETA DE COLORES        */}
          {/* ============================================================== */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-deepSlate-700 mb-1.5">
                    Nombre de tu Tienda o Negocio
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-coral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. Boutique Gabi, Comercial del Norte..."
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-sm font-bold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900"
                    />
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-deepSlate-700 mb-1.5">
                    Tasa Dólar (C$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className="w-full px-4 py-3 text-sm font-bold font-mono rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-deepSlate-700 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-coral-500" />
                    <span>Elige el Tema de Paleta de Colores de tu Tienda</span>
                  </label>
                  <span className="text-[11px] font-semibold text-coral-600">
                    Vista previa en vivo
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {THEME_PALETTE_LIST.map((p) => {
                    const isSelected = themePalette === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectTheme(p.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2.5 ${
                          isSelected
                            ? 'border-2 border-coral-500 bg-coral-50/60 shadow-sm'
                            : 'border-nacre-200 bg-white hover:border-nacre-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center -space-x-1.5">
                            <span
                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: p.primaryHex }}
                            />
                            <span
                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: p.secondaryHex }}
                            />
                            <span
                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: p.softHex }}
                            />
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-coral-500 text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-deepSlate-900">{p.name}</p>
                          <p className="text-[11px] text-deepSlate-500 leading-tight mt-0.5">
                            {p.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASO 2: FOTO DE PERFIL Y NOMBRE DE USUARIO DEL DUEÑO           */}
          {/* ============================================================== */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Foto de perfil */}
              <div className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative group shrink-0">
                  {ownerAvatarUrl ? (
                    <img
                      src={resolveAvatarUrl(ownerAvatarUrl)}
                      alt={ownerFullName || 'Foto de perfil'}
                      onError={() => setOwnerAvatarUrl('')}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-coral-500 shadow-sm bg-white"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-coral-500 text-white flex items-center justify-center text-2xl font-extrabold shadow-sm">
                      {(ownerFullName || storeName || 'D').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-deepSlate-900 hover:bg-coral-600 text-white shadow-md transition-colors"
                    title="Subir foto"
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div>
                    <p className="text-sm font-extrabold text-deepSlate-900">
                      Tu foto de perfil
                    </p>
                    <p className="text-xs text-deepSlate-500">
                      Sube una foto desde tu dispositivo o elige un avatar rápido:
                    </p>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-coral-50 text-coral-600 border border-coral-200 transition-colors"
                    >
                      {isUploadingPhoto ? 'Subiendo...' : 'Subir imagen'}
                    </button>
                    {PRESET_AVATARS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setOwnerAvatarUrl(url)}
                        className={`w-8 h-8 rounded-xl overflow-hidden border-2 transition-all bg-white ${
                          ownerAvatarUrl === url
                            ? 'border-coral-500 scale-110'
                            : 'border-nacre-200 hover:border-coral-300'
                        }`}
                        title={`Elegir avatar ${idx + 1}`}
                      >
                        <img src={url} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-deepSlate-700 mb-1.5">
                    Tu Nombre Completo
                  </label>
                  <div className="relative">
                    <UserCircle2 className="w-4 h-4 text-coral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. Gabriela Mendoza"
                      value={ownerFullName}
                      onChange={(e) => setOwnerFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 text-sm font-bold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-deepSlate-700 mb-1.5">
                    Tu Nombre de Usuario (Para Login)
                  </label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 text-coral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="ej. gabi_duena"
                      value={ownerUsername}
                      onChange={(e) =>
                        setOwnerUsername(
                          e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '_')
                        )
                      }
                      className="w-full pl-10 pr-4 py-3 text-sm font-mono font-bold rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900"
                    />
                  </div>
                  <p className="text-[11px] text-deepSlate-500 mt-1">
                    Podrás iniciar sesión escribiendo <strong>@{ownerUsername || 'usuario'}</strong> o tu correo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASO 3: GESTIÓN DE CUENTAS DE EMPLEADOS ASOCIADAS              */}
          {/* ============================================================== */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-coral-50/60 border border-coral-200 flex items-start gap-3">
                <Users className="w-5 h-5 text-coral-600 shrink-0 mt-0.5" />
                <div className="text-xs text-deepSlate-700 leading-relaxed">
                  <strong>Control total sobre tus empleados:</strong> Aquí puedes definir el{' '}
                  <strong>nombre de usuario</strong> y la <strong>contraseña</strong> de las cuentas de
                  empleado asociadas a tu tienda. Ellos no podrán cambiar esta configuración ni ver tus costos.
                </div>
              </div>

              {employees.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-nacre-50 border border-nacre-200 space-y-1">
                  <p className="text-sm font-extrabold text-deepSlate-900">
                    Aún no tienes cuentas de empleado creadas
                  </p>
                  <p className="text-xs text-deepSlate-500">
                    Podrás crear y gestionar las cuentas de tus vendedores en cualquier momento desde la sección "Mi tienda y equipo".
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {employees.map((emp, index) => (
                    <div
                      key={emp.id}
                      className="p-4 rounded-2xl bg-nacre-50 border border-nacre-200 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-coral-700 bg-coral-50 px-2.5 py-0.5 rounded-full border border-coral-200">
                          Cuenta Empleado #{index + 1} (Solo Ventas)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickResetEmployeePassword(emp)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-coral-600 hover:text-coral-700 bg-white px-2.5 py-1 rounded-lg border border-coral-200 shadow-2xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reiniciar contraseña</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-deepSlate-600 mb-1">
                            Nombre del Empleado
                          </label>
                          <input
                            type="text"
                            value={emp.full_name}
                            onChange={(e) =>
                              handleEmployeeChange(emp.id, 'full_name', e.target.value)
                            }
                            placeholder="Nombre completo"
                            className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white border border-nacre-200 focus:outline-none focus:border-coral-500 text-deepSlate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-deepSlate-600 mb-1">
                            Usuario de Acceso (@)
                          </label>
                          <div className="relative">
                            <AtSign className="w-3.5 h-3.5 text-coral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={emp.username}
                              onChange={(e) =>
                                handleEmployeeChange(
                                  emp.id,
                                  'username',
                                  e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '_')
                                )
                              }
                              placeholder="usuario_empleado"
                              className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold rounded-xl bg-white border border-nacre-200 focus:outline-none focus:border-coral-500 text-deepSlate-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-deepSlate-600 mb-1">
                            Nueva Contraseña (opcional)
                          </label>
                          <div className="relative">
                            <KeyRound className="w-3.5 h-3.5 text-deepSlate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type={emp.showPassword ? 'text' : 'password'}
                              value={emp.password}
                              onChange={(e) =>
                                handleEmployeeChange(emp.id, 'password', e.target.value)
                              }
                              placeholder="Dejar igual (demo2026)"
                              className="w-full pl-8 pr-8 py-2 text-xs font-mono rounded-xl bg-white border border-nacre-200 focus:outline-none focus:border-coral-500 text-deepSlate-900"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleEmployeeChange(emp.id, 'showPassword', !emp.showPassword)
                              }
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-deepSlate-400 hover:text-deepSlate-700"
                            >
                              {emp.showPassword ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botones de navegación del asistente */}
          <div className="pt-4 border-t border-nacre-200 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as 1 | 2)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-deepSlate-600 bg-nacre-100 hover:bg-nacre-200 inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            ) : (
              <div className="text-xs text-deepSlate-400 font-semibold">
                Paso {step} de {totalSteps}
              </div>
            )}

            {step < totalSteps ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 inline-flex items-center gap-2"
              >
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-coral-500 hover:bg-coral-600 shadow-md shadow-coral-500/25 inline-flex items-center gap-2 disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando en Supabase...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Guardar y entrar a mi tienda</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

