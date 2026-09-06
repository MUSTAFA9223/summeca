'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
