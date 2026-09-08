'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Lock, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function UserProfilePanel() {
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateProfile({ full_name: fullName });
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await fetch('/api/security/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Failed to update password');
      toast.success(result.emailNotificationSent
        ? 'Password updated and confirmation email sent'
        : 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const displayName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="space-y-7 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-700 text-foreground">Profile & Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account information and security settings.
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <User size={28} className="text-primary" />
          </div>
          <div>
            <div className="text-base font-700 text-foreground">{displayName}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle size={12} className="text-success" />
              <span className="text-xs text-success font-500">Verified account</span>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <h3 className="text-sm font-700 text-foreground mb-3">Personal Information</h3>

          <div>
            <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="profile-name">
              Full name
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="profile-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-input text-sm text-foreground placeholder-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="profile-email">
              Email address
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="profile-email"
                type="email"
                value={email}
                disabled
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-input text-sm text-foreground bg-secondary cursor-not-allowed opacity-70"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed here. Contact support if needed.</p>
          </div>

          <button
            type="submit"
            disabled={isSavingProfile}
            className="btn-primary px-5 py-2.5 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSavingProfile ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                Save Profile
              </>
            )}
          </button>
        </form>
      </div>

      {/* Password Card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-700 text-foreground mb-4 flex items-center gap-2">
          <Lock size={15} className="text-primary" />
          Change Password
        </h3>

        {passwordError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-danger/5 border border-danger/20">
            <p className="text-xs text-danger font-500">{passwordError}</p>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="current-password">
              Current password
            </label>
            <div className="relative">
              <input
                id="current-password"
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter current password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input text-sm text-foreground placeholder-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              />
              <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="new-password">
              New password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Enter new password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input text-sm text-foreground placeholder-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="confirm-password">
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showNewPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input text-sm text-foreground placeholder-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="btn-primary px-5 py-2.5 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSavingPassword ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                Updating...
              </>
            ) : (
              <>
                <Lock size={14} />
                Update Password
              </>
            )}
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-700 text-foreground mb-4">Account Details</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">User ID</span>
            <span className="text-xs font-mono text-foreground truncate max-w-[200px]">{user?.id}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Account created</span>
            <span className="text-sm text-foreground">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Last sign in</span>
            <span className="text-sm text-foreground">
              {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
