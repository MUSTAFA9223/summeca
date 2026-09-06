import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                // Lax supports top-level navigation and OAuth callbacks.
                // The browser SDK must read cookies to refresh the session.
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                httpOnly: false,
              })
            );
          } catch {
            // Server Component read-only context — expected.
          }
        },
      },
    }
  );
}

/**
 * Privileged Supabase client for trusted server-only code such as verified
 * payment webhooks. Never import this helper into Client Components and never
 * expose SUPABASE_SERVICE_ROLE_KEY through NEXT_PUBLIC_* variables.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase service-role server configuration.');
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
