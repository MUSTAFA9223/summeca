import React from 'react';
import Link from 'next/link';
import { ArrowRight, CreditCard, Download, Package, ShoppingBag } from 'lucide-react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';

const productSections = [
  {
    title: 'Orders',
    description: 'Review products and services you purchased with this account.',
    href: '/user-dashboard/orders',
    action: 'View orders',
    icon: ShoppingBag,
  },
  {
    title: 'Downloads',
    description: 'Access digital files that are currently available to your account.',
    href: '/user-dashboard/downloads',
    action: 'Open downloads',
    icon: Download,
  },
  {
    title: 'Subscriptions',
    description: 'View active plans and subscription status linked to your account.',
    href: '/user-dashboard/subscriptions',
    action: 'Manage subscriptions',
    icon: CreditCard,
  },
];

export default function MyProductsPage() {
  return (
    <DashboardLayout activeRoute="products">
      <div className="space-y-7">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Package size={14} className="text-primary" />
            </div>
            <span className="text-xs font-600 uppercase tracking-wide text-primary">Your account</span>
          </div>
          <h1 className="text-2xl font-700 text-foreground">My Products</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Access purchases, downloadable files, and subscriptions connected to your signed-in SUMMECA account.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {productSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-lg"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                <section.icon size={18} className="text-primary" />
              </div>
              <h2 className="text-sm font-700 text-foreground">{section.title}</h2>
              <p className="mt-1.5 min-h-12 text-xs leading-relaxed text-muted-foreground">{section.description}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-600 text-primary">
                {section.action}
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="rounded-2xl border border-primary/10 bg-primary/5 px-5 py-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Only account-linked purchases and entitlements are shown in the destination pages. If you have just completed a payment, use the Orders page to check its current status.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
