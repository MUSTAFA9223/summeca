'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import GoogleOAuthButton from './GoogleOAuthButton';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormProps {
  onForgotPassword: () => void;
  onSwitchToSignup: () => void;
}

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  if (value.startsWith('/sign-up-login-screen')) return null;
  return value;
}

function getRequestedNextPath() {
  if (typeof window === 'undefined') return null;
  return getSafeNextPath(new URLSearchParams(window.location.search).get('next'));
}

export default function LoginForm({ onForgotPassword, onSwitchToSignup }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, setError } = useForm<LoginFormData>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const requestedNextPath = getRequestedNextPath();
      const response = await fetch('/api/auth/password-sign-in', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          next: requestedNextPath,
        }),
      });

      const result = await response.json().catch(() => null) as {
        success?: boolean;
        destination?: string;
        error?: string;
      } | null;

      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error || 'Invalid email or password. Please try again.');
      }

      const destination = getSafeNextPath(result.destination || null) ?? '/user-dashboard';
      toast.success('Welcome back to SUMMECA!');

      // The server response sets the Supabase session cookies. A full navigation
      // makes those first-party cookies available to Cloudflare middleware before
      // the protected dashboard request, including on mobile browsers and WebViews.
      window.location.replace(destination);
      return;
    } catch (error: any) {
      setError('root', { message: error?.message || 'Invalid email or password. Please try again.' });
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

      <GoogleOAuthButton label="Continue with Google" />
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
            <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm text-foreground placeholder-muted-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 ${errors.password ? 'border-danger' : 'border-input'}`} {...register('password', { required: 'Password is required' })}/>
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={isLoading} className="w-full bg-primary text-primary-foreground py-2.5 px-4 rounded-xl text-sm font-600 hover:bg-primary/90 disabled:opacity-60 transition-all duration-150">
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">New to SUMMECA?{' '}<button type="button" onClick={onSwitchToSignup} className="text-primary hover:text-primary/80 font-600">Create an account</button></p>
    </div>
  );
}
