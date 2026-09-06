import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Resolve the authenticated admin from the authoritative user_profiles.is_admin flag.
 * Never trust user_metadata/app_metadata for authorization decisions.
 */
export async function requireAdmin(
  supabase: SupabaseServerClient
): Promise<User | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || profile?.is_admin !== true) return null;
  return user;
}
