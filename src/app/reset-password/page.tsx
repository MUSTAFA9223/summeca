'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';

const GENERIC_UPDATE_ERROR = 'Unable to update your password. Please request a new reset link and try again.';

export default function ResetPasswordPage() {
  const [checkingLink, setCheckingLink] = useState(true);
  const [pendingTokenHash, setPendingTokenHash] = useState<string | null>(null);
  const [recoveryTokenHash, setRecoveryTokenHash] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = new URL(window.location.href);
    const tokenHash = url.searchParams.get('token_hash')?.trim() ?? '';
    const type = url.searchParams.get('type');

    // Recovery is intentionally token-hash only. It must work when the email is
    // requested on device A and opened on device B, with no PKCE verifier or
    // localStorage/session dependency from the requesting browser.
    if (tokenHash && type === 'recovery') {
      setPendingTokenHash(tokenHash);
    }

    setCheckingLink(false);
  }, []);

  function confirmRecoveryLink() {
    if (!pendingTokenHash) return;
    setError('');

    // Keep the one-time token only in component memory after explicit user
    // action. Do not consume it on GET because mail scanners can prefetch links.
    setRecoveryTokenHash(pendingTokenHash);
    const url = new URL(window.location.href);
    url.searchParams.delete('token_hash');
    url.searchParams.delete('type');
    url.searchParams.delete('confirm');
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    setPendingTokenHash(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!recoveryTokenHash) return setError('This reset link is invalid or has expired.');
    if (password.length < 8) return setError('Password must be at least 8 characters long.');
    if (password.length > 128) return setError('Password must be no more than 128 characters long.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/recovery/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenHash: recoveryTokenHash, newPassword: password }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || GENERIC_UPDATE_ERROR);

      setSuccess(true);
      setRecoveryTokenHash(null);
      setPassword('');
      setConfirmPassword('');
      window.setTimeout(() => {
        window.location.replace('/sign-up-login-screen?password_reset=success');
      }, 1200);
    } catch (updateError: unknown) {
      const message = updateError instanceof Error ? updateError.message : GENERIC_UPDATE_ERROR;
      setError(message || GENERIC_UPDATE_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingLink) return <main className="min-h-screen bg-background flex items-center justify-center px-4"><div className="flex items-center gap-3 text-muted-foreground"><Loader2 size={20} className="animate-spin" /><span className="text-sm">Checking reset link...</span></div></main>;

  if (success) return <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12"><section className="w-full max-w-md bg-card border border-border rounded-2xl p-7 shadow-sm text-center"><div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-5"><CheckCircle2 size={28} className="text-success" /></div><h1 className="text-2xl font-700 text-foreground mb-2">Password updated</h1><p className="text-sm text-muted-foreground mb-6">Your SUMMECA password has been changed successfully. Redirecting you to a clean sign-in page...</p><a href="/sign-up-login-screen?password_reset=success" className="btn-primary w-full inline-flex items-center justify-center py-2.5">Continue to sign in</a></section></main>;

  if (pendingTokenHash) return <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12"><section className="w-full max-w-md bg-card border border-border rounded-2xl p-7 shadow-sm text-center"><div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5"><KeyRound size={27} className="text-primary" /></div><h1 className="text-2xl font-700 text-foreground mb-2">Confirm password reset</h1><p className="text-sm text-muted-foreground mb-6">Tap the button below to continue and choose a new password. The secure link will only be used when you submit the new password.</p><button type="button" onClick={confirmRecoveryLink} className="btn-primary w-full py-2.5 inline-flex items-center justify-center">Continue password reset</button></section></main>;

  if (!recoveryTokenHash) return <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12"><section className="w-full max-w-md bg-card border border-border rounded-2xl p-7 shadow-sm text-center"><div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-5"><KeyRound size={27} className="text-danger" /></div><h1 className="text-2xl font-700 text-foreground mb-2">Reset link is invalid</h1><p className="text-sm text-muted-foreground mb-6">This password reset link is invalid, expired, or has already been used. Request a fresh SUMMECA reset email and open only its newest link.</p>{error && <p className="text-xs text-danger mb-4">{error}</p>}<Link href="/sign-up-login-screen" className="btn-primary w-full inline-flex items-center justify-center py-2.5">Request a new reset link</Link></section></main>;

  return <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12"><section className="w-full max-w-md bg-card border border-border rounded-2xl p-7 shadow-sm"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5"><KeyRound size={22} className="text-primary" /></div><h1 className="text-2xl font-700 text-foreground mb-1">Choose a new password</h1><p className="text-sm text-muted-foreground mb-6">Set a new password for your SUMMECA account. It must contain at least 8 characters.</p>{error && <div className="mb-4 px-4 py-3 rounded-xl bg-danger/5 border border-danger/20"><p className="text-xs text-danger font-500">{error}</p></div>}<form onSubmit={handleSubmit} className="space-y-4"><div><label htmlFor="new-password" className="block text-sm font-600 text-foreground mb-1.5">New password</label><div className="relative"><input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={128} required className="w-full px-3.5 pr-11 py-2.5 rounded-xl border border-input text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div><div><label htmlFor="confirm-password" className="block text-sm font-600 text-foreground mb-1.5">Confirm new password</label><input id="confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} maxLength={128} required className="w-full px-3.5 py-2.5 rounded-xl border border-input text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" /></div><button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-60">{submitting && <Loader2 size={16} className="animate-spin" />}{submitting ? 'Updating password...' : 'Update password'}</button></form></section></main>;
}
