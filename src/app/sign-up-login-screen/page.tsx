import React from 'react';
import AuthScreen from '@/app/sign-up-login-screen/components/AuthScreen';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function SignUpLoginPage() {
  return <AuthScreen />;
}
