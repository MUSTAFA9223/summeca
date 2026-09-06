'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

const AuthContext = createContext<any>({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const getSiteUrl = () => {
    // Client-side auth actions must use the domain the visitor is actually on.
    // This avoids stale deployment environment values sending recovery links
    // back to an old preview/Rocket URL.
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL;
    }
    return 'https://summeca.com';
  };

  useEffect(() => {
    const redirectRecoveryToResetPage = () => {
      if (typeof window !== 'undefined' && window.location.pathname !== '/reset-password') {
        window.location.replace('/reset-password');
      }
    };

    const hasRecoveryMarkerInUrl = () => {
      if (typeof window === 'undefined') return false;
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const search = new URLSearchParams(window.location.search);
      return hash.get('type') === 'recovery' || search.get('type') === 'recovery';
    };

    // Subscribe before reading the initial session so PASSWORD_RECOVERY cannot
    // be missed while Supabase is processing the recovery link.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (event === 'PASSWORD_RECOVERY') {
        redirectRecoveryToResetPage();
      }
    });

    // Get initial session. If Supabase already consumed an implicit recovery
    // URL before the listener fired, the URL marker plus a valid session is a
    // safe fallback signal to open the password form.
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);

      if (initialSession && hasRecoveryMarkerInUrl()) {
        redirectRecoveryToResetPage();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Email/Password Sign Up
  const signUp = async (email: string, password: string, metadata: any = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata?.fullName || '',
          avatar_url: metadata?.avatarUrl || '',
        },
        emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  };

  // Email/Password Sign In
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  // Sign Out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Reset Password (sends email)
  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
    });
    if (error) throw error;
    return data;
  };

  // Get Current User
  const getCurrentUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  // Check if Email is Verified
  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null;
  };

  // Get User Profile from Database
  const getUserProfile = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) {
      // Profile may not exist yet — return null gracefully
      return null;
    }
    return data;
  };

  // Update User Profile
  const updateProfile = async (updates: { full_name?: string; avatar_url?: string }) => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase.auth.updateUser({ data: updates });
    if (error) throw error;
    return data;
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    getCurrentUser,
    isEmailVerified,
    getUserProfile,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
