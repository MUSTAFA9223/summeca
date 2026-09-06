'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Check, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
  agreeTerms: boolean;
}

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (password.length === 0) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-danger' };
  if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-warning' };
  if (score <= 3) return { score: 3, label: 'Good', color: 'bg-info' };
  return { score: 4, label: 'Strong', color: 'bg-success' };
}

export default function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const { signUp } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<SignupFormData>({
    defaultValues: { fullName: '', email: '', password: '', agreeTerms: false },
  });

  const passwordValue = watch('password', '');
  const strength = getPasswordStrength(passwordValue);

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      const result = await signUp(data.email, data.password, { fullName: data.fullName });
      if (result?.session) {
        toast.success('Account created! Welcome to SUMMECA.');
        router.push('/user-dashboard');
        router.refresh();
      } else {
        setRegisteredEmail(data.email);
        setEmailSent(true);
      }
    } catch (error: any) {
      setError('root', {
        message: error?.message || 'Failed to create account. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="fade-in text-center py-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <Mail size={28} className="text-primary" />
        </div>
        <h2 className="text-xl font-700 text-foreground mb-2">Check your inbox</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto mb-6">
          We sent a confirmation link to{' '}
          <span className="font-600 text-foreground">{registeredEmail}</span>.
          Click the link to activate your account.
        </p>
        <button onClick={onSwitchToLogin} className="text-sm text-primary font-600 hover:text-primary/80 transition-colors">
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="mb-7">
        <h1 className="text-2xl font-700 text-foreground mb-1">Create your account</h1>
        <p className="text-sm text-muted-foreground">Access SUMMECA free tools and digital products.</p>
      </div>

      <button type="button" className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-secondary transition-all duration-150 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 0 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        <span className="text-sm font-600 text-foreground">Sign up with Google</span>
      </button>

      <div className="flex items-center gap-3 mb-5"><div className="flex-1 h-px bg-border"></div><span className="text-xs text-muted-foreground">or with email</span><div className="flex-1 h-px bg-border"></div></div>

      {errors.root && <div className="mb-4 px-4 py-3 rounded-xl bg-danger/5 border border-danger/20"><p className="text-xs text-danger font-500">{errors.root.message}</p></div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="signup-name">Full name</label>
          <input id="signup-name" type="text" autoComplete="name" placeholder="Alex Morgan" className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-foreground placeholder-muted-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 ${errors.fullName ? 'border-danger' : 'border-input'}`} {...register('fullName', { required: 'Full name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })} />
          {errors.fullName && <p className="mt-1 text-xs text-danger">{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="signup-email">Work email</label>
          <input id="signup-email" type="email" autoComplete="email" placeholder="you@company.com" className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-foreground placeholder-muted-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 ${errors.email ? 'border-danger' : 'border-input'}`} {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } })} />
          {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="signup-password">Password</label>
          <p className="text-xs text-muted-foreground mb-1.5">At least 8 characters with a mix of letters, numbers, and symbols.</p>
          <div className="relative">
            <input id="signup-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Create a strong password" className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm text-foreground placeholder-muted-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 ${errors.password ? 'border-danger' : 'border-input'}`} {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Password must be at least 8 characters' } })} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
          {passwordValue.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">{[1,2,3,4].map((level) => <div key={`strength-${level}`} className={`flex-1 h-1 rounded-full transition-all duration-300 ${strength.score >= level ? strength.color : 'bg-border'}`}></div>)}</div>
              {strength.label && <p className="text-xs text-muted-foreground">Strength: <span className="font-600 text-foreground">{strength.label}</span></p>}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-start gap-2.5">
            <input id="agree-terms" type="checkbox" className="w-4 h-4 mt-0.5 rounded border-input accent-primary flex-shrink-0" {...register('agreeTerms', { required: 'You must accept the terms to continue' })} />
            <label htmlFor="agree-terms" className="text-sm text-secondary-foreground cursor-pointer leading-relaxed">I agree to the <a href="/terms" className="text-primary hover:text-primary/80 font-500">Terms of Service</a> and <a href="/privacy" className="text-primary hover:text-primary/80 font-500">Privacy Policy</a></label>
          </div>
          {errors.agreeTerms && <p className="mt-1 text-xs text-danger">{errors.agreeTerms.message}</p>}
        </div>

        <button type="submit" disabled={isLoading} className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed" style={{ minHeight: '44px' }}>
          {isLoading ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div><span>Creating account...</span></> : <><Check size={15} /><span>Create Free Account</span></>}
        </button>
      </form>

      <div className="mt-5 p-4 rounded-xl bg-success/5 border border-success/20">
        <p className="text-xs font-700 text-success uppercase tracking-wide mb-2">What you get for free</p>
        <ul className="space-y-1.5">
          {['Access to all free tools', 'Download free digital products'].map((item) => (
            <li key={`benefit-${item}`} className="flex items-center gap-2 text-xs text-secondary-foreground"><Check size={11} className="text-success flex-shrink-0" />{item}</li>
          ))}
        </ul>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-5">Already have an account? <button onClick={onSwitchToLogin} className="text-primary font-600 hover:text-primary/80 transition-colors">Sign in</button></p>
    </div>
  );
}
