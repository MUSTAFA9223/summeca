import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-up-login-screen');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.is_admin === true) {
    redirect('/admin');
  }

  return children;
}
