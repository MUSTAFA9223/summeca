'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  onForgotPassword: () => void;
  onSwitchToSignup: () => void;
}

export default function LoginForm({ onForgotPassword, onSwitchToSignup }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const authData = await signIn(data.email, data.password);
      const signedInUser = authData?.user;
      if (!signedInUser?.id) throw new Error('Unable to verify the signed-in account.');

      // Never trust editable auth user_metadata for authorization. The database
      // profile is the source of truth for the admin role.
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', signedInUser.id)
        .single();

      if (profileError) throw profileError;

      toast.success('Welcome back to SUMMECA!');
      router.replace(profile?.is_admin ? '/admin' : '/user-dashboard');
      router.refresh();
    } catch (error: any) {
      setError('root', {
        message: error?.message || 'Invalid email or password. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="mb-7">
        <h1 className="text-2xl font-700 text-foreground mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to access your AI tools and products.</p>
      </div>

      <button type="button" className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-secondary transition-all duration-150 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="text-muted-foreground"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        <span className="text-sm font-600 text-foreground">Continue with Google</span>
      </button>

      <div className="flex items-center gap-3 mb-5"><div className="flex-1 h-px bg-border"/><span className="text-xs text-muted-foreground">or with email</span><div className="flex-1 h-px bg-border"/></div>

      {errors.root && <div className="mb-4 px-4 py-3 rounded-xl bg-danger/5 border border-danger/20"><p className="text-xs text-danger font-500">{errors.root.message}</p></div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="login-email">Email address</label>
          <input id="login-email" type="email" autoComplete="email" placeholder="you@company.com" className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-foreground placeholder-muted-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 ${errors.email ? 'border-danger' : 'border-input'}`} {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } })}/>
          {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-600 text-foreground" htmlFor="login-password">Password</label>
            <button type="button" onClick={onForgotPassword} className="text-xs text-primary hover:text-primary/80 font-500 transition-colors">Forgot password?</button>
          </div>
          <div className="relative">
            <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm text-foreground placeholder-muted-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 ${errors.password ? 'border-danger' : 'border-input'}`} {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Password must be at least 8 characters' } })}/>
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
        </div>

        <div className="flex items-center gap-2">
          <input id="remember-me" type="checkbox" className="w-4 h-4 rounded border-input accent-primary" {...register('rememberMe')}/>
          <label htmlFor="remember-me" className="text-sm text-secondary-foreground cursor-pointer">Remember me for 30 days</label>
        </div>

        <button type="submit" disabled={isLoading} className="w-full bg-primary text-primary-foreground py-2.5 px-4 rounded-xl text-sm font-600 hover:bg-primary/90 disabled:opacity-60 transition-all duration-150">
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">New to SUMMECA?{' '}<button type="button" onClick={onSwitchToSignup} className="text-primary hover:text-primary/80 font-600">Create an account</button></p>
    </div>
  );
}
