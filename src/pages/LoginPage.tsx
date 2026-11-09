import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  MessageCircle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TEST_ACCOUNT_PRESETS } from '../data/realInventoryData';
import { TestAccountPreset } from '../types';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('nivel3@stella-georgina.com');
  const [password, setPassword] = useState('stella2026');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, signInWithPreset, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/app', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Por favor ingresa tu correo electrónico y contraseña.');
      return;
    }

    setIsSubmitting(true);
    const res = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(
        res.error === 'Invalid login credentials'
          ? 'Credenciales incorrectas. Verifica tu correo y contraseña.'
          : res.error || 'Ocurrió un error al iniciar sesión.'
      );
    } else {
      navigate('/app');
    }
  };

  const handlePresetQuickEnter = (preset: TestAccountPreset) => {
    signInWithPreset(preset);
    navigate('/app');
  };

  const handleWhatsAppContact = () => {
    const text = encodeURIComponent(
      'Hola Gabi Studio! Necesito asistencia para acceder a mi cuenta o dar de alta mi empresa.'
    );
    window.open(`https://wa.me/50588888888?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-nacre-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative selection:bg-coral-100 selection:text-coral-900">
      
      {/* Decorative Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-coral-400/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Back to Home Link */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-deepSlate-600 hover:text-coral-500 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-nacre-200 shadow-sm transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio</span>
        </Link>
      </div>

      <div className="max-w-5xl w-full mx-auto relative z-10 pt-8">
        
        {/* Brand Heading */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2.5 group mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-coral-500 to-coral-400 flex items-center justify-center text-white shadow-lg shadow-coral-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-deepSlate-900 tracking-tight">
            Acceso a Plataforma & Perfiles de Prueba por Nivel
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-deepSlate-500 max-w-xl mx-auto">
            Inicia sesión con tus credenciales o selecciona un <strong>Perfil de Prueba</strong> con el inventario real de <strong>Stella, Wayuu y Georgina</strong> precargado.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Standard Login Card */}
          <div className="lg:col-span-5 bg-white py-8 px-6 sm:px-8 rounded-3xl border border-nacre-200 shadow-xl shadow-deepSlate-900/5">
            <h2 className="text-base font-extrabold text-deepSlate-900 mb-4 flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-coral-500" />
              <span>Ingresar con Correo y Clave</span>
            </h2>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold text-deepSlate-700 uppercase tracking-wider mb-1.5"
                >
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-deepSlate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="nivel3@stella-georgina.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900 transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold text-deepSlate-700 uppercase tracking-wider"
                  >
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={handleWhatsAppContact}
                    className="text-xs font-medium text-coral-600 hover:text-coral-700 transition-colors"
                  >
                    ¿Olvidaste tu clave?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-deepSlate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-2.5 text-xs sm:text-sm font-mono rounded-xl bg-nacre-50 border border-nacre-200 focus:outline-none focus:border-coral-500 focus:bg-white text-deepSlate-900 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-deepSlate-400 hover:text-deepSlate-700"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-coral-500 hover:bg-coral-600 active:scale-98 shadow-md shadow-coral-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verificando credenciales...</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar al Sistema</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* WhatsApp Activation Note */}
            <div className="mt-6 pt-5 border-t border-nacre-200 text-center">
              <button
                onClick={handleWhatsAppContact}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center justify-center space-x-2"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Soporte Comercial por WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Right Column: 4 One-Click Test Profiles for Levels 1, 2, 3 */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-deepSlate-700 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-coral-500" />
                <span>Perfiles Listos para Probar Cada Nivel (1 Clic)</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                116 SKUs Reales Cargados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TEST_ACCOUNT_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="bg-white rounded-3xl border border-nacre-200 p-5 shadow-sm hover:border-coral-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          preset.plan_tier === 3
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : preset.role === 'seller'
                            ? 'bg-nacre-200 text-deepSlate-700'
                            : 'bg-coral-50 text-coral-600 border border-coral-200'
                        }`}
                      >
                        {preset.badge}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(preset.email);
                          setPassword(preset.password);
                        }}
                        className="text-[10px] font-bold text-coral-600 hover:underline"
                      >
                        Rellenar formulario
                      </button>
                    </div>

                    <h3 className="text-sm font-extrabold text-deepSlate-900">{preset.label}</h3>
                    <p className="text-[11px] text-deepSlate-500 leading-relaxed">
                      {preset.description}
                    </p>

                    <div className="p-2.5 rounded-xl bg-nacre-50 border border-nacre-200 font-mono text-[11px] space-y-0.5">
                      <div className="truncate">
                        <span className="text-deepSlate-400">Usuario: </span>
                        <strong className="text-deepSlate-900">{preset.email}</strong>
                      </div>
                      <div>
                        <span className="text-deepSlate-400">Clave: </span>
                        <strong className="text-coral-600">{preset.password}</strong>
                      </div>
                    </div>

                    <ul className="space-y-1 pt-1">
                      {preset.highlights.map((h, i) => (
                        <li
                          key={i}
                          className="text-[11px] text-deepSlate-600 flex items-start space-x-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePresetQuickEnter(preset)}
                    className="mt-4 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-deepSlate-900 hover:bg-coral-500 transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <span>Entrar con {preset.badge}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
