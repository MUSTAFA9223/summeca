'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

const AuthContext = createContext<any>({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const getSiteUrl = () => {
    if (typeof window !== 'undefined') return window.location.origin;
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
    return 'https://summeca.com';
  };

  useEffect(() => {
    let active = true;

    const redirectRecoveryToResetPage = () => {
      if (typeof window !== 'undefined' && window.location.pathname !== '/reset-password') {
        const url = new URL('/reset-password', window.location.origin);
        const current = new URL(window.location.href);
        current.searchParams.forEach((value, key) => url.searchParams.set(key, value));
        url.hash = current.hash;
        window.location.replace(url.toString());
      }
    };

    const hasRecoveryMarkerInUrl = () => {
      if (typeof window === 'undefined') return false;
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const search = new URLSearchParams(window.location.search);
      return hash.get('type') === 'recovery' || search.get('type') === 'recovery' || Boolean(search.get('token_hash'));
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') redirectRecoveryToResetPage();
    });

    // A recovery token must establish its own fresh session. Do not refresh a
    // stale cookie in parallel with verifyOtp: that race can overwrite the new
    // recovery session with "Refresh Token Not Found" on another browser.
    if (hasRecoveryMarkerInUrl()) {
      setLoading(false);
    } else {
      supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
        if (!active) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setLoading(false);
      });
    }

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata?.fullName || '',
          avatar_url: metadata?.avatarUrl || '',
          referral_code: metadata?.referralCode || '',
        },
        emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    // Recovery must not rely on localStorage or the browser that requested it.
    // The recovery email should carry a TokenHash to /reset-password, where the
    // token is verified directly with Supabase and creates a fresh session.
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/reset-password`,
    });
    if (error) throw error;
    return data;
  };

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  const isEmailVerified = () => Boolean(user?.email_confirmed_at);

  const getUserProfile = async () => {
    if (!user) return null;
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
    if (error) return null;
    return data;
  };

  const updateProfile = async (updates: { full_name?: string; avatar_url?: string }) => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase.auth.updateUser({ data: updates });
    if (error) throw error;
    return data;
  };

  const value = { user, session, loading, signUp, signIn, signOut, resetPassword, getCurrentUser, isEmailVerified, getUserProfile, updateProfile };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
