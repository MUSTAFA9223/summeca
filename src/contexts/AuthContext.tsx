'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

const AuthContext = createContext<any>({});
const RECOVERY_PENDING_KEY = 'summeca:recovery-pending-at';
const SIGNUP_PENDING_KEY = 'summeca:signup-pending-at';
const AUTH_FLOW_MAX_AGE_MS = 60 * 60 * 1000;

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
        window.location.replace('/reset-password');
      }
    };

    const hasRecentMarker = (key: string) => {
      if (typeof window === 'undefined') return false;
      const value = Number(window.localStorage.getItem(key) || '0');
      return value > 0 && Date.now() - value < AUTH_FLOW_MAX_AGE_MS;
    };

    const clearMarker = (key: string) => {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    };

    const hasRecoveryMarkerInUrl = () => {
      if (typeof window === 'undefined') return false;
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const search = new URLSearchParams(window.location.search);
      return hash.get('type') === 'recovery' || search.get('type') === 'recovery';
    };

    const handleStrayAuthCode = async () => {
      if (typeof window === 'undefined' || window.location.pathname === '/auth/callback' || window.location.pathname === '/reset-password') return false;

      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const flowId = url.searchParams.get('sb_flow_id');
      if (!code) return false;

      const wasRecovery = hasRecentMarker(RECOVERY_PENDING_KEY);
      const wasSignup = hasRecentMarker(SIGNUP_PENDING_KEY);
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined,
      );

      if (!active || error || !data.session) return false;

      url.searchParams.delete('code');
      url.searchParams.delete('sb_flow_id');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);

      if (wasRecovery) {
        clearMarker(RECOVERY_PENDING_KEY);
        redirectRecoveryToResetPage();
        return true;
      }
      if (wasSignup) {
        clearMarker(SIGNUP_PENDING_KEY);
        window.location.replace('/user-dashboard');
        return true;
      }
      return false;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') {
        clearMarker(RECOVERY_PENDING_KEY);
        redirectRecoveryToResetPage();
      }
    });

    handleStrayAuthCode().then((handled) => {
      if (handled || !active) return;
      supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
        if (!active) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setLoading(false);
        if (initialSession && (hasRecoveryMarkerInUrl() || hasRecentMarker(RECOVERY_PENDING_KEY))) {
          clearMarker(RECOVERY_PENDING_KEY);
          redirectRecoveryToResetPage();
        }
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(SIGNUP_PENDING_KEY, String(Date.now()));
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
    if (error) {
      if (typeof window !== 'undefined') window.localStorage.removeItem(SIGNUP_PENDING_KEY);
      throw error;
    }
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
    if (typeof window !== 'undefined') window.localStorage.setItem(RECOVERY_PENDING_KEY, String(Date.now()));
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/reset-password`,
    });
    if (error) {
      if (typeof window !== 'undefined') window.localStorage.removeItem(RECOVERY_PENDING_KEY);
      throw error;
    }
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
