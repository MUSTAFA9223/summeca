import React, { Suspense } from 'react';
import AuthScreen from '@/app/sign-up-login-screen/components/AuthScreen';

function AuthScreenFallback() {
  return <main className="min-h-screen bg-[#050807]" aria-busy="true" />;
}

export default function SignUpLoginPage() {
  return (
    <Suspense fallback={<AuthScreenFallback />}>
      <AuthScreen />
    </Suspense>
  );
}
