'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ForgotPasswordData {
  email: string;
}

export default function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const { resetPassword } = useAuth();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordData>();

  const onSubmit = async (data: ForgotPasswordData) => {
    setIsLoading(true);
    try {
      await resetPassword(data.email);
      setSubmittedEmail(data.email);
      setSubmitted(true);
    } catch (error: any) {
      setError('root', {
        message: error?.message || 'Failed to send reset email. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="fade-in text-center py-4">
        <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={28} className="text-success" />
        </div>
        <h2 className="text-xl font-700 text-foreground mb-2">Check your inbox</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
          If an account exists for{' '}
          <span className="font-600 text-foreground">{submittedEmail}</span>, a secure password reset link will be sent.
          Check your spam folder if you don&apos;t see it.
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="mb-7">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Mail size={22} className="text-primary" />
        </div>
        <h2 className="text-2xl font-700 text-foreground mb-1">Reset your password</h2>
        <p className="text-sm text-muted-foreground">
          Enter your account email and we&apos;ll send a reset link.
        </p>
      </div>

      {errors.root && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-danger/5 border border-danger/20">
          <p className="text-xs text-danger font-500">{errors.root.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="reset-email">
            Email address
          </label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-foreground placeholder-muted-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 ${
              errors.email ? 'border-danger' : 'border-input'
            }`}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
            })}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ minHeight: '44px' }}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
              Sending reset link...
            </>
          ) : (
            'Send Reset Link'
          )}
        </button>
      </form>
    </div>
  );
}
