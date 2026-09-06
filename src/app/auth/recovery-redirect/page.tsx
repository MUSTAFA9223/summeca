'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Fallback landing page for password recovery links.
 * Some Supabase email configurations can fall back to the Site URL instead of
 * preserving the requested redirect. This page immediately forwards recovery
 * sessions to the dedicated password reset form.
 */
export default function RecoveryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/reset-password');
  }, [router]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">Opening password reset...</p>
    </main>
  );
}
