import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminShell from './components/AdminShell';

export const metadata = {
  title: 'Admin — SUMMECA',
  robots: 'noindex, nofollow',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-up-login-screen');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin, full_name, email')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    redirect('/');
  }

  return (
    <AdminShell adminName={profile.full_name || user.email?.split('@')[0] || 'Admin'} adminEmail={user.email || ''}>
      {children}
    </AdminShell>
  );
}
