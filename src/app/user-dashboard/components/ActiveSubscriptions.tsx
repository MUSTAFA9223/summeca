import React from 'react';
import Link from 'next/link';
import { CreditCard } from 'lucide-react';

/**
 * Legacy dashboard card retained for compatibility with older layouts.
 * The previous implementation contained fabricated subscription records.
 * Real subscription data now lives in DashboardOverview and the dedicated
 * subscriptions page, both scoped to the signed-in user.
 */
export default function ActiveSubscriptions() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-700 text-foreground">Active Subscriptions</h3>
        <Link
          href="/user-dashboard/subscriptions"
          className="text-xs text-primary font-600 hover:text-primary/80 transition-colors"
        >
          Manage all →
        </Link>
      </div>

      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
          <CreditCard size={20} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-600 text-foreground">Subscription data is account-specific</p>
        <p className="text-xs text-muted-foreground max-w-sm mt-1">
          Open your subscriptions page to view the live plans and renewal state linked to your account.
        </p>
        <Link href="/user-dashboard/subscriptions" className="btn-secondary text-xs px-3 py-2 mt-4">
          View subscriptions
        </Link>
      </div>
    </div>
  );
}
