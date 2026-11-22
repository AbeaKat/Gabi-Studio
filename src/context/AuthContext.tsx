import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import {
  supabase,
  supabaseAdmin,
  mapAuthUserToProfile,
  resolveLoginIdentifierToEmail,
  fetchCloudTenantConfig,
  saveCloudTenantConfig,
  listTenantTeamProfiles,
  isUsernameTaken,
  uploadAvatarToSupabase,
  updateEmployeeInSupabase,
  createEmployeeInSupabase,
  deleteEmployeeInSupabase,
} from '../lib/supabase';
import {
  Profile,
  Tenant,
  PlanTier,
  UserRole,
  TestAccountPreset,
  ThemePaletteId,
} from '../types';
import {
  TENANT_STELLA_ID,
  DEFAULT_EXCHANGE_RATE,
  ensureRealInventorySeeded,
  hydrateStoreFromSupabaseCloud,
} from '../data/realInventoryData';
import { applyThemePalette } from '../lib/themes';

export interface OnboardingPayload {
  storeName: string;
  themePalette: ThemePaletteId;
  exchangeRateNio?: number;
  ownerFullName: string;
  ownerUsername: string;
  ownerAvatarUrl?: string;
  employeeUpdates?: Array<{
    id: string;
    username: string;
    full_name: string;
    password?: string;
  }>;
}

export interface StoreAndOwnerUpdatePayload {
  storeName?: string;
  themePalette?: ThemePaletteId;
  ownerFullName?: string;
  ownerUsername?: string;
  ownerAvatarUrl?: string;
  ownerNewPassword?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  tenant: Tenant | null;
  planTier: PlanTier;
  role: UserRole;
  teamMembers: Profile[];
  isLoading: boolean;
  error: string | null;
  needsOnboarding: boolean;
  isOnboardingOpen: boolean;
  openOnboardingModal: () => void;
  closeOnboardingModal: () => void;
  signIn: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithPreset: (preset: TestAccountPreset) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshTeamMembers: () => Promise<void>;
  updateExchangeRate: (newRate: number) => Promise<{ success: boolean; error?: string }>;
  updateTenantConfig: (updates: Partial<Tenant>) => void;
  completeOwnerOnboarding: (
    payload: OnboardingPayload
  ) => Promise<{ success: boolean; error?: string }>;
  updateStoreAndOwnerProfile: (
    payload: StoreAndOwnerUpdatePayload
  ) => Promise<{ success: boolean; error?: string }>;
  uploadProfilePhoto: (file: File) => Promise<{ url?: string; error?: string }>;
  updateEmployeeAccount: (
    employeeId: string,
    updates: { username?: string; full_name?: string; password?: string; avatar_url?: string }
  ) => Promise<{ success: boolean; profile?: Profile; error?: string }>;
  createEmployeeAccount: (params: {
    full_name: string;
    username: string;
    password: string;
    email?: string;
  }) => Promise<{ success: boolean; profile?: Profile; error?: string }>;
  deleteEmployeeAccount: (employeeId: string) => Promise<{ success: boolean; error?: string }>;
  resetOwnerOnboardingForTest: () => Promise<void>;
  setSimulatedRole: (role: UserRole) => void;
  setSimulatedTier: (tier: PlanTier) => void;
}

const DEFAULT_FALLBACK_TENANT: Tenant = {
  id: TENANT_STELLA_ID,
  name: 'Gabi Studio',
  plan_tier: 3,
  exchange_rate_nio: DEFAULT_EXCHANGE_RATE,
  max_owner_profiles: 1,
  max_seller_profiles: 2,
  extra_paid_profiles: 0,
  is_active: true,
  theme_palette: 'coral',
  onboarding_completed: true,
  created_at: new Date().toISOString(),
};

const DEFAULT_FALLBACK_PROFILE: Profile = {
  id: 'ca12a054-9229-42bc-97a7-fdbeac2d5e01',
  tenant_id: TENANT_STELLA_ID,
  full_name: 'Gabi Studio',
  username: 'Gabi Studio',
  role: 'global_owner',
  onboarding_completed: true,
  created_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  const loadFullUserSession = async (currentUser: User) => {
    try {
      setError(null);

      // Fetch latest user record from Admin API so user_metadata is always fresh
      let freshUser = currentUser;
      try {
        const { data: adminUserData } = await supabaseAdmin.auth.admin.getUserById(currentUser.id);
        if (adminUserData?.user) {
          freshUser = adminUserData.user;
        }
      } catch {
        // Use session user
      }

      const mappedProfile = mapAuthUserToProfile(freshUser, TENANT_STELLA_ID);

      // Check if Postgres 'profiles' row has overrides
      try {
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', freshUser.id)
          .maybeSingle();

        if (dbProfile) {
          if (dbProfile.full_name) mappedProfile.full_name = dbProfile.full_name;
          if (dbProfile.username) mappedProfile.username = dbProfile.username;
          if (dbProfile.avatar_url) mappedProfile.avatar_url = dbProfile.avatar_url;
          if (dbProfile.role) mappedProfile.role = dbProfile.role as UserRole;
        }
      } catch {
        // Ignore if table not migrated yet
      }

      const loadedTenant = await fetchCloudTenantConfig(
        mappedProfile.tenant_id,
        freshUser.user_metadata
      );

      // Ensure plan_tier matches owner's account tier if logging in with a tier-specific owner account
      if (mappedProfile.role === 'global_owner' && freshUser.user_metadata?.plan_tier) {
        const ownerTier = Number(freshUser.user_metadata.plan_tier) as PlanTier;
        loadedTenant.plan_tier = ownerTier;
        loadedTenant.max_seller_profiles = ownerTier === 1 ? 0 : ownerTier === 2 ? 1 : 2;
      }

      await hydrateStoreFromSupabaseCloud(loadedTenant.id);
      const maxAllowedSellers =
        (loadedTenant.max_seller_profiles ?? 0) + (loadedTenant.extra_paid_profiles ?? 0);
      const members = await listTenantTeamProfiles(loadedTenant.id, maxAllowedSellers);

      setUser(freshUser);
      setProfile(mappedProfile);
      setTenant(loadedTenant);
      setTeamMembers(members);

      applyThemePalette(loadedTenant.theme_palette || 'coral');

      // Open onboarding automatically on first login for Owner accounts
      if (mappedProfile.role === 'global_owner' && !mappedProfile.onboarding_completed) {
        setIsOnboardingOpen(true);
      } else {
        setIsOnboardingOpen(false);
      }
    } catch (err: any) {
      console.error('Error loading user session from Supabase:', err);
    }
  };

  useEffect(() => {
    let mounted = true;
    // Remove any legacy demo session key
    localStorage.removeItem('gabi_studio_demo_session');
    localStorage.removeItem('gabi_studio_demo_user');
    ensureRealInventorySeeded();

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          await loadFullUserSession(session.user);
        } else {
          applyThemePalette('coral');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return;
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          await loadFullUserSession(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setTenant(null);
        setTeamMembers([]);
        setIsOnboardingOpen(false);
        applyThemePalette('coral');
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (identifier: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const resolved = await resolveLoginIdentifierToEmail(identifier);
      if (resolved.error || !resolved.email) {
        const msg = resolved.error || 'Usuario o correo inválido.';
        setError(msg);
        return { success: false, error: msg };
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: resolved.email,
        password,
      });

      if (signInError || !data.user) {
        const msg =
          signInError?.message === 'Invalid login credentials'
            ? 'Usuario/correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.'
            : signInError?.message || 'No se pudo iniciar sesión.';
        setError(msg);
        return { success: false, error: msg };
      }

      await loadFullUserSession(data.user);
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Error al iniciar sesión en Supabase.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithPreset = async (preset: TestAccountPreset) => {
    return signIn(preset.email, preset.password);
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem('gabi_studio_demo_session');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setTenant(null);
      setTeamMembers([]);
      setIsOnboardingOpen(false);
      applyThemePalette('coral');
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadFullUserSession(user);
    }
  };

  const refreshTeamMembers = async () => {
    const tId = tenant?.id || profile?.tenant_id || TENANT_STELLA_ID;
    const maxAllowedSellers =
      (tenant?.max_seller_profiles ?? 2) + (tenant?.extra_paid_profiles ?? 0);
    const members = await listTenantTeamProfiles(tId, maxAllowedSellers);
    setTeamMembers(members);
  };

  const updateTenantConfig = (updates: Partial<Tenant>) => {
    if (profile?.role === 'seller') return; // Employees cannot change tenant config
    // Seat limits and plan_tier are managed exclusively in the database
    const {
      max_owner_profiles: _mo,
      max_seller_profiles: _ms,
      extra_paid_profiles: _ep,
      plan_tier: _pt,
      ...safeUpdates
    } = updates;
    setTenant((prev) => {
      const next = prev
        ? { ...prev, ...safeUpdates }
        : { ...DEFAULT_FALLBACK_TENANT, ...safeUpdates };
      if (safeUpdates.theme_palette) {
        applyThemePalette(safeUpdates.theme_palette);
      }
      saveCloudTenantConfig(next.id, next);
      return next;
    });
  };

  const updateExchangeRate = async (newRate: number) => {
    if (profile?.role === 'seller') {
      return {
        success: false,
        error: 'Las cuentas de empleado no tienen permiso para modificar la tasa de cambio.',
      };
    }
    if (newRate <= 0 || isNaN(newRate)) {
      return {
        success: false,
        error: 'La tasa de cambio debe ser un número positivo mayor que 0.',
      };
    }

    try {
      const currentTenantId = tenant?.id || DEFAULT_FALLBACK_TENANT.id;
      updateTenantConfig({ exchange_rate_nio: newRate });

      if (user) {
        const meta = user.user_metadata || {};
        await supabase.auth.updateUser({
          data: { ...meta, exchange_rate_nio: newRate },
        });
      }

      await saveCloudTenantConfig(currentTenantId, {
        ...tenant,
        exchange_rate_nio: newRate,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error al guardar tasa de cambio.' };
    }
  };

  const uploadProfilePhoto = async (file: File) => {
    if (!user) return { error: 'No hay sesión activa.' };
    if (profile?.role === 'seller') {
      return { error: 'Las cuentas de empleado no pueden modificar la configuración de perfil.' };
    }
    return uploadAvatarToSupabase(user.id, file);
  };

  const completeOwnerOnboarding = async (payload: OnboardingPayload) => {
    if (!user || !profile) {
      return { success: false, error: 'No hay sesión activa.' };
    }
    if (profile.role === 'seller') {
      return {
        success: false,
        error: 'Las cuentas de empleado no pueden realizar configuración de tienda.',
      };
    }

    const cleanStoreName = payload.storeName.trim();
    const cleanOwnerName = payload.ownerFullName.trim();
    const cleanUsername = payload.ownerUsername
      .trim()
      .replace(/^@/, '');

    if (!cleanStoreName) {
      return { success: false, error: 'Por favor escribe el nombre de tu tienda.' };
    }
    if (!cleanOwnerName) {
      return { success: false, error: 'Por favor escribe tu nombre.' };
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      return {
        success: false,
        error: 'Tu nombre de usuario debe tener al menos 3 caracteres.',
      };
    }

    const taken = await isUsernameTaken(cleanUsername, user.id);
    if (taken) {
      return {
        success: false,
        error: `El nombre de usuario "@${cleanUsername}" ya está ocupado. Elige otro.`,
      };
    }

    try {
      const currentMeta = user.user_metadata || {};
      const nextRate =
        payload.exchangeRateNio && payload.exchangeRateNio > 0
          ? payload.exchangeRateNio
          : tenant?.exchange_rate_nio || DEFAULT_EXCHANGE_RATE;

      const nextMeta = {
        ...currentMeta,
        full_name: cleanOwnerName,
        username: cleanUsername,
        avatar_url:
          payload.ownerAvatarUrl !== undefined
            ? payload.ownerAvatarUrl
            : profile.avatar_url || '',
        store_name: cleanStoreName,
        theme_palette: payload.themePalette,
        exchange_rate_nio: nextRate,
        onboarding_completed: true,
      };

      const { data: updatedAuth, error: updateErr } = await supabase.auth.updateUser({
        data: nextMeta,
      });

      if (updateErr) {
        return { success: false, error: updateErr.message };
      }
      if (updatedAuth?.user) {
        setUser(updatedAuth.user);
      }

      const tenantId = tenant?.id || profile.tenant_id || TENANT_STELLA_ID;
      const updatedTenant: Tenant = {
        ...(tenant || DEFAULT_FALLBACK_TENANT),
        id: tenantId,
        name: cleanStoreName,
        theme_palette: payload.themePalette,
        exchange_rate_nio: nextRate,
        onboarding_completed: true,
      };

      await saveCloudTenantConfig(tenantId, updatedTenant);

      // Update any employee accounts configured during onboarding
      if (payload.employeeUpdates && payload.employeeUpdates.length > 0) {
        for (const emp of payload.employeeUpdates) {
          if (emp.id && emp.username.trim()) {
            await updateEmployeeInSupabase(emp.id, {
              username: emp.username,
              full_name: emp.full_name,
              password: emp.password && emp.password.trim().length >= 6 ? emp.password : undefined,
            });
          }
        }
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: cleanOwnerName,
              username: cleanUsername,
              avatar_url: nextMeta.avatar_url,
              onboarding_completed: true,
            }
          : prev
      );
      setTenant(updatedTenant);
      applyThemePalette(payload.themePalette);
      setIsOnboardingOpen(false);
      await refreshTeamMembers();

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Error al guardar la configuración en Supabase.',
      };
    }
  };

  const updateStoreAndOwnerProfile = async (payload: StoreAndOwnerUpdatePayload) => {
    if (!user || !profile) {
      return { success: false, error: 'No hay sesión activa.' };
    }
    if (profile.role === 'seller') {
      return {
        success: false,
        error: 'El usuario de cuenta empleado no puede modificar la configuración de la cuenta.',
      };
    }

    try {
      const currentMeta = user.user_metadata || {};
      const nextUsername =
        payload.ownerUsername !== undefined
          ? payload.ownerUsername
              .trim()
              .replace(/^@/, '')
          : profile.username || currentMeta.username;

      if (payload.ownerUsername !== undefined) {
        if (!nextUsername || nextUsername.length < 3) {
          return {
            success: false,
            error: 'Tu nombre de usuario debe tener al menos 3 caracteres.',
          };
        }
        const taken = await isUsernameTaken(nextUsername, user.id);
        if (taken) {
          return {
            success: false,
            error: `El nombre de usuario "@${nextUsername}" ya está en uso.`,
          };
        }
      }

      if (payload.ownerNewPassword && payload.ownerNewPassword.trim().length < 6) {
        return {
          success: false,
          error: 'La nueva contraseña debe tener al menos 6 caracteres.',
        };
      }

      const nextStoreName =
        payload.storeName !== undefined ? payload.storeName.trim() : tenant?.name || 'Mi Tienda';
      const nextTheme =
        payload.themePalette !== undefined
          ? payload.themePalette
          : tenant?.theme_palette || 'coral';
      const nextFullName =
        payload.ownerFullName !== undefined ? payload.ownerFullName.trim() : profile.full_name;
      const nextAvatar =
        payload.ownerAvatarUrl !== undefined ? payload.ownerAvatarUrl : profile.avatar_url || '';

      const nextMeta = {
        ...currentMeta,
        full_name: nextFullName,
        username: nextUsername,
        avatar_url: nextAvatar,
        store_name: nextStoreName,
        theme_palette: nextTheme,
        onboarding_completed: true,
      };

      const selfUpdatePayload: { data: Record<string, any>; password?: string } = {
        data: nextMeta,
      };
      if (payload.ownerNewPassword && payload.ownerNewPassword.trim().length >= 6) {
        selfUpdatePayload.password = payload.ownerNewPassword.trim();
      }

      const { data: updatedAuth, error: updateErr } = await supabase.auth.updateUser(
        selfUpdatePayload
      );
      if (updateErr) {
        return { success: false, error: updateErr.message };
      }
      if (updatedAuth?.user) {
        setUser(updatedAuth.user);
      }

      const tenantId = tenant?.id || profile.tenant_id || TENANT_STELLA_ID;
      const updatedTenant: Tenant = {
        ...(tenant || DEFAULT_FALLBACK_TENANT),
        id: tenantId,
        name: nextStoreName,
        theme_palette: nextTheme,
        onboarding_completed: true,
      };

      await saveCloudTenantConfig(tenantId, updatedTenant);

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: nextFullName,
              username: nextUsername,
              avatar_url: nextAvatar,
              onboarding_completed: true,
            }
          : prev
      );
      setTenant(updatedTenant);
      applyThemePalette(nextTheme);
      await refreshTeamMembers();

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'No se pudieron guardar los cambios en Supabase.',
      };
    }
  };

  const updateEmployeeAccount = async (
    employeeId: string,
    updates: { username?: string; full_name?: string; password?: string; avatar_url?: string }
  ) => {
    if (profile?.role === 'seller') {
      return {
        success: false,
        error: 'Las cuentas de empleado no tienen permiso para gestionar usuarios.',
      };
    }
    const res = await updateEmployeeInSupabase(employeeId, updates);
    if (res.success) {
      await refreshTeamMembers();
    }
    return res;
  };

  const createEmployeeAccount = async (params: {
    full_name: string;
    username: string;
    password: string;
    email?: string;
  }) => {
    if (profile?.role === 'seller') {
      return {
        success: false,
        error: 'Las cuentas de empleado no tienen permiso para crear usuarios.',
      };
    }
    const tId = tenant?.id || profile?.tenant_id || TENANT_STELLA_ID;
    const currentTier = tenant?.plan_tier || 3;
    const res = await createEmployeeInSupabase({
      tenantId: tId,
      planTier: currentTier,
      ...params,
    });
    if (res.success) {
      await refreshTeamMembers();
    }
    return res;
  };

  const deleteEmployeeAccount = async (employeeId: string) => {
    if (profile?.role === 'seller') {
      return {
        success: false,
        error: 'Las cuentas de empleado no tienen permiso para eliminar usuarios.',
      };
    }
    const res = await deleteEmployeeInSupabase(employeeId);
    if (res.success) {
      await refreshTeamMembers();
    }
    return res;
  };

  const resetOwnerOnboardingForTest = async () => {
    if (!user || profile?.role === 'seller') return;
    const currentMeta = user.user_metadata || {};
    const { data: updatedAuth } = await supabase.auth.updateUser({
      data: { ...currentMeta, onboarding_completed: false },
    });
    if (updatedAuth?.user) {
      setUser(updatedAuth.user);
    }
    setProfile((prev) => (prev ? { ...prev, onboarding_completed: false } : prev));
    setIsOnboardingOpen(true);
  };

  const activeTenant = tenant || DEFAULT_FALLBACK_TENANT;
  const activeProfile = profile || DEFAULT_FALLBACK_PROFILE;
  const planTier: PlanTier = activeTenant.plan_tier || 3;
  const role: UserRole = activeProfile.role || 'global_owner';
  const needsOnboarding = role === 'global_owner' && !activeProfile.onboarding_completed;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: activeProfile,
        tenant: { ...activeTenant, plan_tier: planTier },
        planTier,
        role,
        teamMembers,
        isLoading,
        error,
        needsOnboarding,
        isOnboardingOpen,
        openOnboardingModal: () => {
          if (role === 'global_owner') setIsOnboardingOpen(true);
        },
        closeOnboardingModal: () => setIsOnboardingOpen(false),
        signIn,
        signInWithPreset,
        signOut,
        refreshProfile,
        refreshTeamMembers,
        updateExchangeRate,
        updateTenantConfig,
        completeOwnerOnboarding,
        updateStoreAndOwnerProfile,
        uploadProfilePhoto,
        updateEmployeeAccount,
        createEmployeeAccount,
        deleteEmployeeAccount,
        resetOwnerOnboardingForTest,
        setSimulatedRole: () => {},
        setSimulatedTier: (newTier: PlanTier) => {
          if (role === 'global_owner') {
            const maxSellers = newTier === 1 ? 0 : newTier === 2 ? 1 : 2;
            updateTenantConfig({
              plan_tier: newTier,
              max_owner_profiles: 1,
              max_seller_profiles: maxSellers,
            });
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
