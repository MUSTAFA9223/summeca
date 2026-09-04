import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminAIClient from './AdminAIClient';

export const metadata = { title: 'AI Marketing Engine — SUMMECA Admin' };

export default async function AdminAIPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase?.auth?.getUser();

  if (!user) redirect('/sign-up-login-screen');

  const { data: profile } = await supabase?.from('user_profiles')?.select('role')?.eq('id', user?.id)?.single();

  if (profile?.role !== 'admin') redirect('/admin');

  return <AdminAIClient />;
}
