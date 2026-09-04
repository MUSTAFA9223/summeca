import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Shield, Database, Key } from 'lucide-react';

export const metadata = { title: 'Admin Settings — SUMMECA' };

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user!.id).single();

  return (
    <div className="space-y-6 fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-800 text-foreground">Admin Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">System configuration and admin account details</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield size={16} className="text-primary" />
          </div>
          <h2 className="text-sm font-700 text-foreground">Admin Account</h2>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Email</span>
            <span className="font-600 text-foreground">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Name</span>
            <span className="font-600 text-foreground">{profile?.full_name || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Admin Role</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-600 bg-success/10 text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />Active
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <Database size={16} className="text-accent" />
          </div>
          <h2 className="text-sm font-700 text-foreground">Database</h2>
        </div>
        <div className="space-y-2 text-sm">
          {['user_profiles', 'products', 'product_plans', 'orders', 'subscriptions', 'downloads', 'payment_events', 'coupons'].map((table) => (
            <div key={table} className="flex items-center justify-between py-1.5">
              <span className="font-mono text-xs text-foreground">{table}</span>
              <span className="inline-flex items-center gap-1 text-xs text-success"><span className="w-1.5 h-1.5 rounded-full bg-success" />Connected</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center">
            <Key size={16} className="text-warning" />
          </div>
          <h2 className="text-sm font-700 text-foreground">Payment Architecture</h2>
        </div>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Payment Abstraction Layer', status: 'Active' },
            { label: 'Payoneer Provider', status: 'Stub (future)' },
            { label: 'Crypto Provider', status: 'Stub (future)' },
            { label: 'Webhook Handler', status: 'Active' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-foreground">{item.label}</span>
              <span className={`text-xs font-600 ${item.status === 'Active' ? 'text-success' : 'text-muted-foreground'}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
