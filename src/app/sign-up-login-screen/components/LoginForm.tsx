'use client';

import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import GoogleOAuthButton from './GoogleOAuthButton';

interface LoginFormProps {
  onForgotPassword: () => void;
  onSwitchToSignup: () => void;
}

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '';
  if (value.startsWith('/sign-up-login-screen')) return '';
  return value;
}

function getLoginError(value: string | null) {
  if (value === 'rate_limited') return 'Too many sign-in attempts. Please try again shortly.';
  if (value === 'invalid_request') return 'The sign-in request could not be completed. Please try again.';
  if (value === 'invalid_credentials') return 'Invalid email or password. Please try again.';
  return '';
}

export default function LoginForm({ onForgotPassword, onSwitchToSignup }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextPath, setNextPath] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(getSafeNextPath(params.get('next')));
    setLoginError(getLoginError(params.get('login_error')));
  }, []);

  return (
    <div className="fade-in">
      <div className="mb-7">
        <h1 className="text-2xl font-700 text-foreground mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to access your AI tools and products.</p>
      </div>

      <GoogleOAuthButton label="Continue with Google" />
      <div className="flex items-center gap-3 mb-5"><div className="flex-1 h-px bg-border"/><span className="text-xs text-muted-foreground">or with email</span><div className="flex-1 h-px bg-border"/></div>

      {loginError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-danger/5 border border-danger/20">
          <p className="text-xs text-danger font-500">{loginError}</p>
        </div>
      )}

      <form
        action="/api/auth/password-sign-in"
        method="post"
        className="space-y-4"
        onSubmit={() => setIsSubmitting(true)}
      >
        <input type="hidden" name="next" value={nextPath} />

        <div>
          <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={320}
            placeholder="you@company.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-input text-sm text-foreground placeholder-muted-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-600 text-foreground" htmlFor="login-password">Password</label>
            <button type="button" onClick={onForgotPassword} className="text-xs text-primary hover:text-primary/80 font-500 transition-colors">Forgot password?</button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              maxLength={256}
              placeholder="Enter your password"
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input text-sm text-foreground placeholder-muted-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-primary-foreground py-2.5 px-4 rounded-xl text-sm font-600 hover:bg-primary/90 disabled:opacity-60 transition-all duration-150">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">New to SUMMECA?{' '}<button type="button" onClick={onSwitchToSignup} className="text-primary hover:text-primary/80 font-600">Create an account</button></p>
    </div>
  );
}
