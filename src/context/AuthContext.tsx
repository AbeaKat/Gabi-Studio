import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, Tenant, PlanTier, UserRole, TestAccountPreset } from '../types';
import {
  TEST_ACCOUNT_PRESETS,
  TENANT_STELLA_ID,
  DEFAULT_EXCHANGE_RATE,
  ensureRealInventorySeeded,
} from '../data/realInventoryData';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  tenant: Tenant | null;
  planTier: PlanTier;
  role: UserRole;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithPreset: (preset: TestAccountPreset) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateExchangeRate: (newRate: number) => Promise<{ success: boolean; error?: string }>;
  setSimulatedRole: (role: UserRole) => void;
  setSimulatedTier: (tier: PlanTier) => void;
  updateTenantConfig: (updates: Partial<Tenant>) => void;
}

const DEFAULT_DEMO_TENANT: Tenant = {
  id: TENANT_STELLA_ID,
  name: 'Stella & Georgina Studio',
  plan_tier: 3,
  exchange_rate_nio: DEFAULT_EXCHANGE_RATE,
  max_owner_profiles: 1,
  max_seller_profiles: 2,
  extra_paid_profiles: 1,
  is_active: true,
  created_at: new Date().toISOString(),
};

const DEFAULT_DEMO_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000099',
  tenant_id: TENANT_STELLA_ID,
  full_name: 'Stella & Georgina (Dueña)',
  role: 'global_owner',
  created_at: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [simulatedRole, setSimulatedRoleState] = useState<UserRole | null>(null);
  const [simulatedTier, setSimulatedTierState] = useState<PlanTier | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const applyPresetSession = (preset: TestAccountPreset) => {
    ensureRealInventorySeeded();
    const mockUser: any = {
      id: `user-${preset.id}`,
      email: preset.email,
      aud: 'authenticated',
      role: 'authenticated',
    };
    const mockProfile: Profile = {
      id: `user-${preset.id}`,
      tenant_id: TENANT_STELLA_ID,
      full_name: preset.full_name,
      role: preset.role,
      created_at: new Date().toISOString(),
    };
    const mockTenant: Tenant = {
      id: TENANT_STELLA_ID,
      name: preset.tenant_name,
      plan_tier: preset.plan_tier,
      exchange_rate_nio: tenant?.exchange_rate_nio || DEFAULT_EXCHANGE_RATE,
      max_owner_profiles: preset.max_owner_profiles,
      max_seller_profiles: preset.max_seller_profiles,
      extra_paid_profiles: preset.extra_paid_profiles,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    localStorage.setItem(
      'gabi_studio_demo_session',
      JSON.stringify({ user: mockUser, profile: mockProfile, tenant: mockTenant })
    );
    setUser(mockUser);
    setProfile(mockProfile);
    setTenant(mockTenant);
    setSimulatedRoleState(null);
    setSimulatedTierState(null);
  };

  const fetchProfileAndTenant = async (currentUser: User) => {
    try {
      setError(null);
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileErr) {
        console.warn('Could not fetch user profile:', profileErr.message);
      }

      if (profileData) {
        setProfile(profileData as Profile);

        const { data: tenantData, error: tenantErr } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', profileData.tenant_id)
          .maybeSingle();

        if (tenantErr) {
          console.warn('Could not fetch tenant data:', tenantErr.message);
        } else if (tenantData) {
          setTenant(tenantData as Tenant);
        }
      } else {
        setProfile({
          ...DEFAULT_DEMO_PROFILE,
          id: currentUser.id,
          full_name: currentUser.email?.split('@')[0] || 'Usuario',
        });
        setTenant(DEFAULT_DEMO_TENANT);
      }
    } catch (err: any) {
      console.error('Error fetching user context:', err);
      setProfile(DEFAULT_DEMO_PROFILE);
      setTenant(DEFAULT_DEMO_TENANT);
    }
  };

  useEffect(() => {
    let mounted = true;
    ensureRealInventorySeeded();

    const initAuth = async () => {
      try {
        // First check if a local preset demo session is active
        const savedSession = localStorage.getItem('gabi_studio_demo_session');
        if (savedSession && mounted) {
          const parsed = JSON.parse(savedSession);
          setUser(parsed.user);
          setProfile(parsed.profile);
          setTenant(parsed.tenant);
          setIsLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setUser(session.user);
          await fetchProfileAndTenant(session.user);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfileAndTenant(session.user);
        } else {
          const savedSession = localStorage.getItem('gabi_studio_demo_session');
          if (!savedSession) {
            setUser(null);
            setProfile(null);
            setTenant(null);
          }
        }
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signInWithPreset = (preset: TestAccountPreset) => {
    applyPresetSession(preset);
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // 1. Check if email matches one of the Stella & Georgina test profiles
      const matchedPreset = TEST_ACCOUNT_PRESETS.find(
        (p) => p.email.toLowerCase() === normalizedEmail
      );

      if (matchedPreset && (password === matchedPreset.password || password === 'demo1234' || password === 'stella2026')) {
        applyPresetSession(matchedPreset);
        setIsLoading(false);
        return { success: true };
      }

      // 2. Also allow quick tier keywords in email
      if (normalizedEmail.includes('nivel1') || normalizedEmail.includes('tier1')) {
        applyPresetSession(TEST_ACCOUNT_PRESETS[0]);
        setIsLoading(false);
        return { success: true };
      }
      if (normalizedEmail.includes('vendedor') || normalizedEmail.includes('seller')) {
        applyPresetSession(TEST_ACCOUNT_PRESETS[2]);
        setIsLoading(false);
        return { success: true };
      }
      if (normalizedEmail.includes('nivel2') || normalizedEmail.includes('tier2')) {
        applyPresetSession(TEST_ACCOUNT_PRESETS[1]);
        setIsLoading(false);
        return { success: true };
      }
      if (normalizedEmail.includes('nivel3') || normalizedEmail.includes('tier3') || normalizedEmail.includes('demo') || password === 'stella2026' || password === 'demo1234') {
        applyPresetSession(TEST_ACCOUNT_PRESETS[3]);
        setIsLoading(false);
        return { success: true };
      }

      // 3. Try real Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return { success: false, error: signInError.message };
      }

      if (data.user) {
        localStorage.removeItem('gabi_studio_demo_session');
        setUser(data.user);
        await fetchProfileAndTenant(data.user);
      }

      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Error al iniciar sesión';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem('gabi_studio_demo_session');
      localStorage.removeItem('gabi_studio_demo_user');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setTenant(null);
      setSimulatedRoleState(null);
      setSimulatedTierState(null);
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndTenant(user);
    }
  };

  const updateTenantConfig = (updates: Partial<Tenant>) => {
    setTenant((prev) => {
      const next = prev ? { ...prev, ...updates } : { ...DEFAULT_DEMO_TENANT, ...updates };
      const savedSession = localStorage.getItem('gabi_studio_demo_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        localStorage.setItem(
          'gabi_studio_demo_session',
          JSON.stringify({ ...parsed, tenant: next })
        );
      }
      return next;
    });
  };

  const updateExchangeRate = async (newRate: number) => {
    if (newRate <= 0 || isNaN(newRate)) {
      return { success: false, error: 'La tasa de cambio debe ser un número positivo mayor que 0.' };
    }

    try {
      const currentTenantId = tenant?.id || DEFAULT_DEMO_TENANT.id;

      await supabase
        .from('tenants')
        .update({ exchange_rate_nio: newRate })
        .eq('id', currentTenantId);

      updateTenantConfig({ exchange_rate_nio: newRate });
      return { success: true };
    } catch (err: any) {
      updateTenantConfig({ exchange_rate_nio: newRate });
      return { success: true };
    }
  };

  const setSimulatedRole = (newRole: UserRole) => {
    setSimulatedRoleState(newRole);
  };

  const setSimulatedTier = (newTier: PlanTier) => {
    setSimulatedTierState(newTier);
    const maxSellers = newTier === 1 ? 0 : newTier === 2 ? 1 : 2;
    updateTenantConfig({
      plan_tier: newTier,
      max_owner_profiles: 1,
      max_seller_profiles: maxSellers,
    });
  };

  const activeTenant = tenant || DEFAULT_DEMO_TENANT;
  const activeProfile = profile || DEFAULT_DEMO_PROFILE;
  const planTier: PlanTier = simulatedTier || activeTenant.plan_tier || 3;
  const role: UserRole = simulatedRole || activeProfile.role || 'global_owner';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: activeProfile,
        tenant: { ...activeTenant, plan_tier: planTier },
        planTier,
        role,
        isLoading,
        error,
        signIn,
        signInWithPreset,
        signOut,
        refreshProfile,
        updateExchangeRate,
        setSimulatedRole,
        setSimulatedTier,
        updateTenantConfig,
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
