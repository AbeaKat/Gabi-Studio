import { createClient, User } from '@supabase/supabase-js';
import { PlanTier, Profile, Tenant, ThemePaletteId, UserRole } from '../types';
import { normalizeImageFileToPngBuffer, resolveAvatarUrl } from './avatars';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://ezyqmcrmekiqbkztbcvn.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_2gBXhIVPOusesttjO77pzA_lJFMGMLu';

const adminProxyUrl =
  typeof window !== 'undefined' && window.location?.origin
    ? `${window.location.origin}/supabase-admin`
    : supabaseUrl;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const supabaseAdmin = createClient(adminProxyUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export function mapAuthUserToProfile(u: User, fallbackTenantId: string): Profile {
  const meta = u.user_metadata || {};
  const role: UserRole = meta.role === 'seller' ? 'seller' : 'global_owner';
  const defaultUsername =
    meta.username ||
    (u.email ? u.email.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '_') : 'usuario');

  return {
    id: u.id,
    tenant_id: meta.tenant_id || fallbackTenantId,
    full_name: meta.full_name || u.email?.split('@')[0] || 'Usuario',
    username: defaultUsername,
    email: u.email || '',
    avatar_url: resolveAvatarUrl(meta.avatar_url || ''),
    onboarding_completed:
      role === 'seller' ? true : Boolean(meta.onboarding_completed),
    role,
    created_at: u.created_at || new Date().toISOString(),
  };
}

/**
 * Resolves either a username (e.g. "Gabi Studio" or "@gabi_studio") or an email
 * to the registered Supabase Auth email address.
 */
export async function resolveLoginIdentifierToEmail(
  identifier: string
): Promise<{ email: string; error?: string }> {
  const clean = identifier.trim().replace(/^@/, '').toLowerCase();
  if (!clean) {
    return { email: '', error: 'Ingresa tu nombre de usuario o correo electrónico.' };
  }

  if (clean.includes('@')) {
    return { email: clean };
  }

  const normalizeKey = (val: string) =>
    val.trim().replace(/^@/, '').toLowerCase().replace(/[\s_-]+/g, '');
  const cleanNorm = normalizeKey(clean);

  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    if (error || !data?.users) {
      return {
        email: cleanNorm === 'gabistudio' ? 'gabistudio@gabistudio.com' : `${cleanNorm}@gabistudio.com`,
      };
    }

    const matched = data.users.find((u) => {
      const metaUsername = String(u.user_metadata?.username || '')
        .trim()
        .replace(/^@/, '')
        .toLowerCase();
      const metaFullName = String(u.user_metadata?.full_name || '').trim().toLowerCase();
      const metaStoreName = String(u.user_metadata?.store_name || '').trim().toLowerCase();
      const emailPrefix = String(u.email || '')
        .split('@')[0]
        .toLowerCase();
      return (
        metaUsername === clean ||
        metaFullName === clean ||
        metaStoreName === clean ||
        emailPrefix === clean ||
        normalizeKey(metaUsername) === cleanNorm ||
        normalizeKey(metaFullName) === cleanNorm ||
        normalizeKey(metaStoreName) === cleanNorm ||
        normalizeKey(emailPrefix) === cleanNorm
      );
    });

    if (!matched || !matched.email) {
      return {
        email: '',
        error: `No encontramos ninguna cuenta con el usuario "${identifier}". Verifica tu nombre de usuario o ingresa con tu correo.`,
      };
    }

    return { email: matched.email };
  } catch (err: any) {
    return {
      email: cleanNorm === 'gabistudio' ? 'gabistudio@gabistudio.com' : `${cleanNorm}@gabistudio.com`,
    };
  }
}

/**
 * Uploads a profile picture or store logo directly to the public 'avatars' bucket in Supabase Storage
 * and returns a same-origin URL that renders reliably in all browsers.
 */
export async function uploadAvatarToSupabase(
  userId: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  try {
    const { buffer, contentType, ext } = await normalizeImageFileToPngBuffer(file);
    const filePath = `${userId}/avatar-${Date.now()}.${ext}`;

    const uploadRes = await fetch(`/supabase-admin/storage/v1/object/avatars/${filePath}`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'x-upsert': 'true',
        'cache-control': 'max-age=3600',
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return { error: `Error al subir imagen (${uploadRes.status}): ${errText}` };
    }

    return {
      url: `/supabase-admin/storage/v1/object/public/avatars/${filePath}`,
    };
  } catch (err: any) {
    return { error: err?.message || 'No se pudo subir la imagen a Supabase Storage.' };
  }
}

/**
 * Loads the shared tenant configuration from Supabase (checks Postgres table first, then Supabase Storage 'tenant-data' + Owner metadata).
 */
export async function fetchCloudTenantConfig(
  tenantId: string,
  fallbackMeta?: Record<string, any>
): Promise<Tenant> {
  const planTier = (Number(fallbackMeta?.plan_tier) || 3) as PlanTier;
  const maxSellers = planTier === 1 ? 0 : planTier === 2 ? 1 : 2;

  const baseTenant: Tenant = {
    id: tenantId,
    name: fallbackMeta?.store_name || 'Mi Tienda',
    plan_tier: planTier,
    exchange_rate_nio: Number(fallbackMeta?.exchange_rate_nio || 36.62),
    max_owner_profiles: 1,
    max_seller_profiles: maxSellers,
    extra_paid_profiles: Number(fallbackMeta?.extra_paid_profiles || 0),
    is_active: true,
    theme_palette: (fallbackMeta?.theme_palette as ThemePaletteId) || 'coral',
    onboarding_completed: Boolean(fallbackMeta?.onboarding_completed),
    created_at: new Date().toISOString(),
  };

  // 1. Try reading from Supabase Storage 'tenant-data' bucket
  try {
    const { data: blob, error: storageErr } = await supabaseAdmin.storage
      .from('tenant-data')
      .download(`tenants/${tenantId}/config.json`);

    if (!storageErr && blob) {
      const text = await blob.text();
      const parsed = JSON.parse(text);
      Object.assign(baseTenant, parsed, { id: tenantId });
    }
  } catch {
    // Ignore if not created yet
  }

  // 2. Also check owner user_metadata in Supabase Auth so employee accounts inherit owner's store name & theme
  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
    const ownerUser = data?.users?.find(
      (u) =>
        u.user_metadata?.tenant_id === tenantId &&
        u.user_metadata?.role === 'global_owner' &&
        u.user_metadata?.onboarding_completed
    );
    if (ownerUser?.user_metadata) {
      const om = ownerUser.user_metadata;
      if (om.store_name) baseTenant.name = om.store_name;
      if (om.theme_palette) baseTenant.theme_palette = om.theme_palette as ThemePaletteId;
      if (om.exchange_rate_nio) baseTenant.exchange_rate_nio = Number(om.exchange_rate_nio);
    }
  } catch {
    // Ignore
  }

  // 3. Try reading from Postgres 'tenants' table if present
  try {
    const { data: row, error: dbErr } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .maybeSingle();

    if (!dbErr && row) {
      Object.assign(baseTenant, row);
    }
  } catch {
    // Table may not be migrated yet
  }

  return baseTenant;
}

/**
 * Saves the shared tenant configuration to Supabase Cloud (Storage + Postgres table if present).
 * Seat limits and plan_tier are strictly read-only from the database and cannot be altered by the client.
 */
export async function saveCloudTenantConfig(
  tenantId: string,
  config: Partial<Tenant>
): Promise<void> {
  try {
    const current = await fetchCloudTenantConfig(tenantId, config);
    const merged: Tenant = {
      ...current,
      name: config.name ?? current.name,
      exchange_rate_nio: config.exchange_rate_nio ?? current.exchange_rate_nio,
      theme_palette: config.theme_palette ?? current.theme_palette,
      onboarding_completed: config.onboarding_completed ?? current.onboarding_completed,
      id: tenantId,
    };
    const blob = new Blob([JSON.stringify(merged, null, 2)], {
      type: 'application/json',
    });

    await supabaseAdmin.storage
      .from('tenant-data')
      .upload(`tenants/${tenantId}/config.json`, blob, {
        upsert: true,
        contentType: 'application/json',
      });
  } catch {
    // Ignore storage error
  }

  try {
    await supabaseAdmin
      .from('tenants')
      .update({
        name: config.name,
        exchange_rate_nio: config.exchange_rate_nio,
        theme_palette: config.theme_palette,
        onboarding_completed: config.onboarding_completed,
      })
      .eq('id', tenantId);
  } catch {
    // Ignore if table not created
  }
}

/**
 * Lists all real user accounts (Owner + associated Employees) belonging to a tenant in Supabase Auth,
 * strictly respecting the database-assigned employee quota (maxSellersAllowed).
 */
export async function listTenantTeamProfiles(
  tenantId: string,
  maxSellersAllowed?: number
): Promise<Profile[]> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    if (error || !data?.users) return [];

    const matching = data.users
      .filter(
        (u) =>
          (u.user_metadata?.tenant_id || '00000000-0000-0000-0000-000000000001') === tenantId
      )
      .map((u) => mapAuthUserToProfile(u, tenantId));

    const owners = matching.filter((p) => p.role === 'global_owner');
    const sellers = matching
      .filter((p) => p.role === 'seller')
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    const limitedSellers =
      typeof maxSellersAllowed === 'number'
        ? sellers.slice(0, Math.max(0, maxSellersAllowed))
        : sellers;

    return [...owners, ...limitedSellers];
  } catch {
    return [];
  }
}

/**
 * Checks if a username is already taken by another user in Supabase Auth.
 */
export async function isUsernameTaken(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  const clean = username.trim().replace(/^@/, '').toLowerCase();
  if (!clean) return false;

  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    if (!data?.users) return false;

    return data.users.some((u) => {
      if (excludeUserId && u.id === excludeUserId) return false;
      const existing = String(u.user_metadata?.username || '')
        .trim()
        .replace(/^@/, '')
        .toLowerCase();
      return existing === clean;
    });
  } catch {
    return false;
  }
}

/**
 * Updates an Employee ('seller') account in Supabase Auth (username, full_name, password, avatar_url).
 */
export async function updateEmployeeInSupabase(
  employeeId: string,
  updates: {
    username?: string;
    full_name?: string;
    password?: string;
    avatar_url?: string;
  }
): Promise<{ success: boolean; profile?: Profile; error?: string }> {
  try {
    const { data: existingData, error: getErr } =
      await supabaseAdmin.auth.admin.getUserById(employeeId);

    if (getErr || !existingData?.user) {
      return {
        success: false,
        error: getErr?.message || 'No se encontró la cuenta del empleado en Supabase.',
      };
    }

    const currentMeta = existingData.user.user_metadata || {};
    const nextUsername =
      updates.username !== undefined
        ? updates.username.trim().replace(/^@/, '').toLowerCase()
        : currentMeta.username;

    if (updates.username !== undefined) {
      if (!nextUsername || nextUsername.length < 3) {
        return {
          success: false,
          error: 'El nombre de usuario debe tener al menos 3 caracteres.',
        };
      }
      const taken = await isUsernameTaken(nextUsername, employeeId);
      if (taken) {
        return {
          success: false,
          error: `El nombre de usuario "@${nextUsername}" ya está en uso. Elige otro.`,
        };
      }
    }

    if (updates.password !== undefined && updates.password.trim().length > 0) {
      if (updates.password.trim().length < 6) {
        return {
          success: false,
          error: 'La contraseña debe tener al menos 6 caracteres.',
        };
      }
    }

    const nextMeta = {
      ...currentMeta,
      full_name:
        updates.full_name !== undefined ? updates.full_name.trim() : currentMeta.full_name,
      username: nextUsername,
      avatar_url:
        updates.avatar_url !== undefined ? updates.avatar_url : currentMeta.avatar_url,
      onboarding_completed: true,
    };

    const updatePayload: {
      user_metadata: Record<string, any>;
      password?: string;
    } = {
      user_metadata: nextMeta,
    };

    if (updates.password && updates.password.trim().length >= 6) {
      updatePayload.password = updates.password.trim();
    }

    const { data: updatedUser, error: updateErr } =
      await supabaseAdmin.auth.admin.updateUserById(employeeId, updatePayload);

    if (updateErr || !updatedUser?.user) {
      return {
        success: false,
        error: updateErr?.message || 'No se pudo actualizar la cuenta del empleado.',
      };
    }

    try {
      await supabaseAdmin
        .from('profiles')
        .update({
          full_name: nextMeta.full_name,
          username: nextMeta.username,
          avatar_url: nextMeta.avatar_url,
        })
        .eq('id', employeeId);
    } catch {
      // Ignore if table not created
    }

    return {
      success: true,
      profile: mapAuthUserToProfile(
        updatedUser.user,
        currentMeta.tenant_id || '00000000-0000-0000-0000-000000000001'
      ),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error al actualizar la cuenta del empleado.',
    };
  }
}

/**
 * Employee creation from the client is strictly forbidden; employee accounts are provisioned only in the database.
 */
export async function createEmployeeInSupabase(_params: {
  tenantId: string;
  planTier: PlanTier;
  full_name: string;
  username: string;
  password: string;
  email?: string;
}): Promise<{ success: boolean; profile?: Profile; error?: string }> {
  return {
    success: false,
    error:
      'No puedes crear más cuentas de empleado desde la aplicación. La asignación de cuentas de empleado se maneja exclusivamente desde la base de datos.',
  };
}

/**
 * Employee deletion from the client is strictly forbidden; employee accounts are managed only in the database.
 */
export async function deleteEmployeeInSupabase(
  _employeeId: string
): Promise<{ success: boolean; error?: string }> {
  return {
    success: false,
    error:
      'Las cuentas de empleado asignadas solo pueden darse de alta o baja desde la base de datos.',
  };
}
