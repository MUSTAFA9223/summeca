'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function verifyRecoverySession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      setSessionValid(Boolean(user));
      setCheckingSession(false);
    }

    verifyRecoverySession();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      await supabase.auth.signOut();
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update your password. Please request a new reset link.');
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Verifying reset link...</span>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <section className="w-full max-w-md bg-card border border-border rounded-2xl p-7 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={28} className="text-success" />
          </div>
          <h1 className="text-2xl font-700 text-foreground mb-2">Password updated</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your password has been changed successfully. Sign in again with your new password.
          </p>
          <Link href="/sign-up-login-screen" className="btn-primary w-full inline-flex items-center justify-center py-2.5">
            Back to sign in
          </Link>
        </section>
      </main>
    );
  }

  if (!sessionValid) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <section className="w-full max-w-md bg-card border border-border rounded-2xl p-7 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-5">
            <KeyRound size={27} className="text-danger" />
          </div>
          <h1 className="text-2xl font-700 text-foreground mb-2">Reset link is invalid</h1>
          <p className="text-sm text-muted-foreground mb-6">
            This password reset link is invalid or has expired. Request a new link and try again.
          </p>
          <Link href="/sign-up-login-screen" className="btn-primary w-full inline-flex items-center justify-center py-2.5">
            Request a new reset link
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-md bg-card border border-border rounded-2xl p-7 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
          <KeyRound size={22} className="text-primary" />
        </div>

        <h1 className="text-2xl font-700 text-foreground mb-1">Choose a new password</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your new password below. It must contain at least 8 characters.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-danger/5 border border-danger/20">
            <p className="text-xs text-danger font-500">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-600 text-foreground mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                className="w-full px-3.5 pr-11 py-2.5 rounded-xl border border-input text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-600 text-foreground mb-1.5">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-input text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Updating password...' : 'Update password'}
          </button>
        </form>
      </section>
    </main>
  );
}
