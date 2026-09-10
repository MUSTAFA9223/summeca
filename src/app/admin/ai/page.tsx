import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminAIClient from './AdminAIClient';

export const metadata = { title: 'AI Marketing Engine — SUMMECA Admin' };

export default async function AdminAIPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect('/sign-up-login-screen?next=%2Fadmin%2Fai');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.is_admin !== true) redirect('/');

  return <AdminAIClient />;
}
