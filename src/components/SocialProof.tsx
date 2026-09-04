'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingBag, Users, TrendingUp, Star } from 'lucide-react';

// Anonymous names for privacy
const ANONYMOUS_NAMES = [
  'Ahmed', 'Sara', 'Mohammed', 'Fatima', 'Omar', 'Layla', 'Yusuf', 'Nour',
  'Khalid', 'Amira', 'Hassan', 'Zainab', 'Ali', 'Mariam', 'Ibrahim', 'Hana',
  'Tariq', 'Rania', 'Bilal', 'Yasmin', 'Karim', 'Dina', 'Faisal', 'Lina',
];

const LOCATIONS = [
  'Yemen', 'Saudi Arabia', 'UAE', 'Egypt', 'Jordan', 'Kuwait', 'Qatar',
  'Morocco', 'Tunisia', 'Algeria', 'Iraq', 'Lebanon', 'Oman', 'Bahrain',
  'USA', 'UK', 'Germany', 'France', 'Canada', 'Australia',
];

const PRODUCT_NAMES = [
  'AI Cost Guard', 'AI PDF Analyzer', 'AI Content Generator',
  'Business Dashboard', 'Teacher Planner', 'AI Marketing Suite',
  'Data Analytics Pro', 'SEO Optimizer', 'Email Automation',
];

interface Notification {
  id: string;
  name: string;
  location: string;
  product: string;
  minutesAgo: number;
}

function generateNotification(): Notification {
  return {
    id: Math.random().toString(36).slice(2),
    name: ANONYMOUS_NAMES[Math.floor(Math.random() * ANONYMOUS_NAMES.length)],
    location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
    product: PRODUCT_NAMES[Math.floor(Math.random() * PRODUCT_NAMES.length)],
    minutesAgo: Math.floor(Math.random() * 30) + 1,
  };
}

interface RecentPurchaseToastProps {
  className?: string;
}

export function RecentPurchaseToast({ className = '' }: RecentPurchaseToastProps) {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show first notification after 5 seconds
    const initialTimer = setTimeout(() => {
      setNotification(generateNotification());
      setVisible(true);
    }, 5000);

    return () => clearTimeout(initialTimer);
  }, []);

  useEffect(() => {
    if (!visible) return;

    // Hide after 5 seconds
    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 5000);

    // Show next notification after 15-25 seconds
    const nextTimer = setTimeout(() => {
      setNotification(generateNotification());
      setVisible(true);
    }, 20000 + Math.random() * 10000);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, [visible, notification]);

  if (!notification) return null;

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
      } ${className}`}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-border p-4 flex items-center gap-3 max-w-xs">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
          <ShoppingBag size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-700 text-foreground">
            {notification.name} from {notification.location}
          </div>
          <div className="text-xs text-secondary-foreground truncate">
            purchased <span className="font-600 text-foreground">{notification.product}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {notification.minutesAgo} minute{notification.minutesAgo !== 1 ? 's' : ''} ago
          </div>
        </div>
        <div className="w-2 h-2 rounded-full bg-success flex-shrink-0 animate-pulse" />
      </div>
    </div>
  );
}

interface CustomerCountBadgeProps {
  count?: number;
  className?: string;
}

export function CustomerCountBadge({ count = 1200, className = '' }: CustomerCountBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-2 bg-white rounded-full border border-border px-4 py-2 shadow-sm ${className}`}>
      <div className="flex -space-x-1.5">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-white flex items-center justify-center"
          >
            <Users size={10} className="text-primary" />
          </div>
        ))}
      </div>
      <span className="text-xs font-700 text-foreground">
        {count.toLocaleString('en-US')}+ customers
      </span>
      <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
    </div>
  );
}

interface PopularityIndicatorProps {
  count: number;
  productName?: string;
  className?: string;
}

export function PopularityIndicator({ count, productName, className = '' }: PopularityIndicatorProps) {
  return (
    <div className={`flex items-center gap-1.5 text-xs text-secondary-foreground ${className}`}>
      <TrendingUp size={12} className="text-primary" />
      <span>
        <span className="font-700 text-foreground">{count}</span> customers purchased
        {productName ? ` ${productName}` : ' this'}
      </span>
    </div>
  );
}

interface VerifiedBuyerBadgeProps {
  className?: string;
}

export function VerifiedBuyerBadge({ className = '' }: VerifiedBuyerBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-600 bg-success/10 text-success px-2 py-0.5 rounded-full ${className}`}>
      <Star size={10} className="fill-success" />
      Verified Buyer
    </span>
  );
}

interface SocialProofStripProps {
  productName?: string;
  purchaseCount?: number;
  className?: string;
}

export function SocialProofStrip({ productName, purchaseCount = 120, className = '' }: SocialProofStripProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <PopularityIndicator count={purchaseCount} productName={productName} />
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5 text-xs text-secondary-foreground">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="font-600 text-foreground">Live</span> — people viewing now
      </div>
    </div>
  );
}
