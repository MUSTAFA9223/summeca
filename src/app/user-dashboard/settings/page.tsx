'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Lock, MapPin, CreditCard, Settings2, Save, Eye, EyeOff, CheckCircle, AlertCircle, RefreshCw, Bell, Globe, Shield } from 'lucide-react';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';


type Tab = 'profile' | 'security' | 'billing' | 'payment' | 'preferences';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  website: string;
  company: string;
  plan_tier: string;
}

interface BillingAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface AccountPreferences {
  email_notifications: boolean;
  marketing_emails: boolean;
  product_updates: boolean;
  security_alerts: boolean;
  language: string;
  timezone: string;
}

const TABS: { id: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing Address', icon: MapPin },
  { id: 'payment', label: 'Payment Methods', icon: CreditCard },
  { id: 'preferences', label: 'Preferences', icon: Settings2 },
];

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<any>; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-sm font-700 text-foreground mb-5 flex items-center gap-2">
        <Icon size={15} className="text-primary" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function InputField({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled,
  hint,
  icon: Icon,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
  icon?: React.ComponentType<any>;
}) {
  return (
    <div>
      <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full ${Icon ? 'pl-10' : 'pl-3.5'} pr-3.5 py-2.5 rounded-xl border border-input text-sm text-foreground placeholder-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 ${disabled ? 'opacity-60 cursor-not-allowed bg-secondary' : ''}`}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SaveButton({ loading, label = 'Save Changes' }: { loading: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-primary px-5 py-2.5 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Save size={14} />
          {label}
        </>
      )}
    </button>
  );
}

// ─── Profile Tab ────────────────────────────────────────────────────────────
function ProfileTab({ profile, onRefresh }: { profile: UserProfile | null; onRefresh: () => void }) {
  const { user } = useAuth();
  const supabase = createClient();
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setWebsite(profile.website || '');
      setCompany(profile.company || '');
    } else if (user) {
      setFullName(user.user_metadata?.full_name || '');
    }
  }, [profile, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName, bio, website, company })
        .eq('id', user.id);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: fullName } });
      toast.success('Profile updated successfully');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="space-y-6 max-w-2xl">
      <SectionCard title="Personal Information" icon={User}>
        {/* Avatar row */}
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

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Full Name"
              id="full-name"
              value={fullName}
              onChange={setFullName}
              placeholder="Your full name"
              icon={User}
            />
            <InputField
              label="Company"
              id="company"
              value={company}
              onChange={setCompany}
              placeholder="Your company"
            />
          </div>
          <InputField
            label="Website"
            id="website"
            value={website}
            onChange={setWebsite}
            placeholder="https://yourwebsite.com"
            icon={Globe}
          />
          <div>
            <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="bio">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a bit about yourself..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-input text-sm text-foreground placeholder-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150 resize-none"
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-muted-foreground">
              Plan: <span className="font-600 text-foreground capitalize">{profile?.plan_tier || 'Free'}</span>
            </div>
            <SaveButton loading={saving} />
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

// ─── Security Tab ────────────────────────────────────────────────────────────
function SecurityTab() {
  const { user } = useAuth();
  const supabase = createClient();

  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState('');

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: `${window.location.origin}/auth/callback?next=/user-dashboard/settings` }
      );
      if (error) throw error;
      toast.success('Confirmation sent to new email address');
      setNewEmail('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update email');
    } finally {
      setSavingEmail(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (!currentPassword) { setPwError('Current password is required'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setSavingPw(true);
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
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update password');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Email */}
      <SectionCard title="Email Address" icon={Mail}>
        <div className="mb-4 px-4 py-3 rounded-xl bg-secondary border border-border">
          <p className="text-xs text-muted-foreground">Current email</p>
          <p className="text-sm font-600 text-foreground mt-0.5">{user?.email}</p>
        </div>
        <form onSubmit={handleEmailUpdate} className="space-y-4">
          <InputField
            label="New Email Address"
            id="new-email"
            type="email"
            value={newEmail}
            onChange={setNewEmail}
            placeholder="Enter new email address"
            icon={Mail}
            hint="A confirmation link will be sent to your new email address."
          />
          <SaveButton loading={savingEmail} label="Update Email" />
        </form>
      </SectionCard>

      {/* Password */}
      <SectionCard title="Change Password" icon={Lock}>
        {pwError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-danger/5 border border-danger/20 flex items-center gap-2">
            <AlertCircle size={14} className="text-danger flex-shrink-0" />
            <p className="text-xs text-danger font-500">{pwError}</p>
          </div>
        )}
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="current-pw">
              Current Password
            </label>
            <div className="relative">
              <input
                id="current-pw"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter current password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input text-sm text-foreground placeholder-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="new-pw">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-pw"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Enter new password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input text-sm text-foreground placeholder-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="confirm-pw">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirm-pw"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Confirm new password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input text-sm text-foreground placeholder-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <SaveButton loading={savingPw} label="Update Password" />
        </form>
      </SectionCard>

      {/* Account info */}
      <SectionCard title="Account Details" icon={Shield}>
        <div className="space-y-3">
          {[
            { label: 'User ID', value: user?.id || '—' },
            { label: 'Account created', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
            { label: 'Last sign in', value: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="text-xs font-mono text-foreground truncate max-w-[200px]">{row.value}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Billing Address Tab ─────────────────────────────────────────────────────
function BillingTab({ profile }: { profile: UserProfile | null }) {
  const { user } = useAuth();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [addr, setAddr] = useState<BillingAddress>({
    line1: '', line2: '', city: '', state: '', postal_code: '', country: '',
  });

  useEffect(() => {
    if (profile) {
      // Billing address stored in user_profiles metadata JSONB via auth metadata
      const meta = user?.user_metadata?.billing_address || {};
      setAddr({
        line1: meta.line1 || '',
        line2: meta.line2 || '',
        city: meta.city || '',
        state: meta.state || '',
        postal_code: meta.postal_code || '',
        country: meta.country || '',
      });
    }
  }, [profile, user]);

  const set = (field: keyof BillingAddress) => (val: string) =>
    setAddr((prev) => ({ ...prev, [field]: val }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { billing_address: addr },
      });
      if (error) throw error;
      toast.success('Billing address saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save billing address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SectionCard title="Billing Address" icon={MapPin}>
        <form onSubmit={handleSave} className="space-y-4">
          <InputField label="Address Line 1" id="line1" value={addr.line1} onChange={set('line1')} placeholder="123 Main Street" icon={MapPin} />
          <InputField label="Address Line 2" id="line2" value={addr.line2} onChange={set('line2')} placeholder="Apt, Suite, Unit (optional)" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="City" id="city" value={addr.city} onChange={set('city')} placeholder="New York" />
            <InputField label="State / Province" id="state" value={addr.state} onChange={set('state')} placeholder="NY" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Postal Code" id="postal" value={addr.postal_code} onChange={set('postal_code')} placeholder="10001" />
            <InputField label="Country" id="country" value={addr.country} onChange={set('country')} placeholder="United States" />
          </div>
          <div className="pt-1">
            <SaveButton loading={saving} label="Save Address" />
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

// ─── Payment Methods Tab ─────────────────────────────────────────────────────
function PaymentTab() {
  return (
    <div className="space-y-6 max-w-2xl">
      <SectionCard title="Payment Methods" icon={CreditCard}>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <h3 className="text-sm font-700 text-foreground">Payment details are not stored by SUMMECA</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Enter payment details only on the secure checkout page of the selected provider. SUMMECA currently supports Payoneer and available cryptocurrency checkout options and does not collect or save card numbers or security codes in your profile.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Preferences Tab ─────────────────────────────────────────────────────────
function PreferencesTab() {
  const { user } = useAuth();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<AccountPreferences>({
    email_notifications: true,
    marketing_emails: false,
    product_updates: true,
    security_alerts: true,
    language: 'en',
    timezone: 'UTC',
  });

  useEffect(() => {
    if (user?.user_metadata?.preferences) {
      setPrefs((prev) => ({ ...prev, ...user.user_metadata.preferences }));
    }
  }, [user]);

  const toggle = (key: keyof AccountPreferences) => {
    if (typeof prefs[key] === 'boolean') {
      setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { preferences: prefs } });
      if (error) throw error;
      toast.success('Preferences saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const ToggleRow = ({ label, description, field }: { label: string; description: string; field: keyof AccountPreferences }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <div className="text-sm font-600 text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => toggle(field)}
        className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex-shrink-0 ${prefs[field] ? 'bg-primary' : 'bg-border'}`}
        style={{ height: '22px', width: '40px' }}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${prefs[field] ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <SectionCard title="Notification Preferences" icon={Bell}>
        <form onSubmit={handleSave}>
          <ToggleRow label="Email Notifications" description="Receive order confirmations and account updates" field="email_notifications" />
          <ToggleRow label="Marketing Emails" description="Receive promotions, deals, and product announcements" field="marketing_emails" />
          <ToggleRow label="Product Updates" description="Get notified about new features and improvements" field="product_updates" />
          <ToggleRow label="Security Alerts" description="Receive alerts for suspicious account activity" field="security_alerts" />
          <div className="pt-4">
            <SaveButton loading={saving} label="Save Preferences" />
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Regional Settings" icon={Globe}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="language">
              Language
            </label>
            <select
              id="language"
              value={prefs.language}
              onChange={(e) => setPrefs((p) => ({ ...p, language: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-input text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-600 text-foreground mb-1.5" htmlFor="timezone">
              Timezone
            </label>
            <select
              id="timezone"
              value={prefs.timezone}
              onChange={(e) => setPrefs((p) => ({ ...p, timezone: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-input text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-150"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Asia/Singapore">Singapore (SGT)</option>
            </select>
          </div>
          <SaveButton loading={saving} label="Save Settings" />
        </form>
      </SectionCard>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data || null);
    } catch {
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [user, supabase]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  return (
    <DashboardLayout activeRoute="settings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-700 text-foreground">Account Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your profile, security, billing, and preferences.
            </p>
          </div>
          <button
            onClick={fetchProfile}
            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150"
            title="Refresh"
          >
            <RefreshCw size={15} className={loadingProfile ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Tab nav */}
        <div className="flex items-center gap-1 bg-secondary/50 border border-border rounded-2xl p-1 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-600 whitespace-nowrap transition-all duration-150 flex-shrink-0 ${
                  isActive
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {loadingProfile ? (
          <div className="space-y-4 max-w-2xl">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 bg-secondary/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'profile' && <ProfileTab profile={profile} onRefresh={fetchProfile} />}
            {activeTab === 'security' && <SecurityTab />}
            {activeTab === 'billing' && <BillingTab profile={profile} />}
            {activeTab === 'payment' && <PaymentTab />}
            {activeTab === 'preferences' && <PreferencesTab />}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
