'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

type SignUpMetadata = {
  fullName?: string;
  avatarUrl?: string;
  referralCode?: string;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: SignUpMetadata) => Promise<unknown>;
  signIn: (email: string, password: string) => Promise<unknown>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<unknown>;
  getCurrentUser: () => Promise<User | null>;
  isEmailVerified: () => boolean;
  getUserProfile: () => Promise<Record<string, unknown> | null>;
  updateProfile: (updates: { full_name?: string; avatar_url?: string }) => Promise<unknown>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const getSiteUrl = () => {
    // Prefer the configured canonical production origin. Using window.origin
    // first can generate redirect URLs such as www.summeca.com on mobile even
    // when only summeca.com is allow-listed in Supabase Auth.
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
    if (typeof window !== 'undefined') return window.location.origin;
    return 'https://summeca.com';
  };

  useEffect(() => {
    let active = true;

    const hasRecoveryMarkerInUrl = () => {
      if (typeof window === 'undefined') return false;
      const search = new URLSearchParams(window.location.search);
      return search.get('type') === 'recovery' || Boolean(search.get('token_hash'));
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    // A recovery token-hash establishes its own isolated server-side verification
    // path. Never refresh a stale browser session while /reset-password is holding
    // that token, and never copy URL fragments containing access/refresh tokens.
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

  const signUp = async (email: string, password: string, metadata: SignUpMetadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.fullName || '',
          avatar_url: metadata.avatarUrl || '',
          referral_code: metadata.referralCode || '',
        },
        emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      },
    });
    if (error) {
      console.warn('[auth] Sign-up failed:', error.code || 'signup_failed');
      throw new Error('Unable to create your account. Please check your details and try again.');
    }
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.warn('[auth] Sign-in failed:', error.code || 'signin_failed');
      throw new Error('Unable to sign in. Check your email and password and try again.');
    }
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    // Recovery must not rely on localStorage or the browser that requested it.
    // The hosted Supabase recovery template must carry TokenHash directly to
    // /reset-password; verification and the password update happen server-side.
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/reset-password`,
    });
    if (error) {
      console.warn('[auth] Password reset request failed:', error.code || 'request_failed');
      throw new Error('Unable to request a password reset right now. Please try again.');
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
    return data as Record<string, unknown>;
  };

  const updateProfile = async (updates: { full_name?: string; avatar_url?: string }) => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase.auth.updateUser({ data: updates });
    if (error) throw error;
    return data;
  };

  const value: AuthContextValue = { user, session, loading, signUp, signIn, signOut, resetPassword, getCurrentUser, isEmailVerified, getUserProfile, updateProfile };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
