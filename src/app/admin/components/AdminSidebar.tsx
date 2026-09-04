'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  ShoppingBag,
  CreditCard,
  Package,
  Users,
  RefreshCw,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  BarChart2,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Bell,
  HelpCircle,
  Megaphone,
} from 'lucide-react';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  adminName: string;
  adminEmail: string;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, href: '/admin/orders' },
  { id: 'payments', label: 'Payments', icon: CreditCard, href: '/admin/payments' },
  { id: 'products', label: 'Products', icon: Package, href: '/admin/products' },
  { id: 'customers', label: 'Customers', icon: Users, href: '/admin/customers' },
  { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw, href: '/admin/subscriptions' },
  { id: 'entitlements', label: 'Entitlements', icon: Download, href: '/admin/entitlements' },
  { id: 'refunds', label: 'Refunds', icon: RotateCcw, href: '/admin/refunds' },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare, href: '/admin/reviews' },
  { id: 'support', label: 'Support', icon: HelpCircle, href: '/admin/support' },
  { id: 'notifications', label: 'Notifications', icon: Bell, href: '/admin/notifications' },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, href: '/admin/marketing' },
  { id: 'security', label: 'Security', icon: Shield, href: '/admin/security' },
  { id: 'reports', label: 'Reports', icon: BarChart2, href: '/admin/reports' },
  { id: 'ai', label: 'AI Engine', icon: Sparkles, href: '/admin/ai' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/admin/settings' },
];

function SidebarContent({
  collapsed,
  onCloseMobile,
  adminName,
  adminEmail,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onCloseMobile?: () => void;
  adminName: string;
  adminEmail: string;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success('Signed out');
      router.push('/sign-up-login-screen');
      router.refresh();
    } catch {
      toast.error('Failed to sign out');
    }
  };

  return (
    <>
      {/* Logo */}
      <div className={`flex items-center h-14 border-b border-border px-4 flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
        <AppLogo size={26} />
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-extrabold text-sm text-foreground leading-none">SUMMECA</span>
            <span className="text-xs text-primary font-600 flex items-center gap-1">
              <Shield size={9} />Admin
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`sidebar-link ${active ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={17} className="flex-shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User + actions */}
      <div className="border-t border-border p-2 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-700 text-primary">{adminName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-600 text-foreground truncate">{adminName}</div>
              <div className="text-xs text-muted-foreground truncate">{adminEmail}</div>
            </div>
          </div>
        )}
        <button className="sidebar-link w-full justify-center" onClick={handleSignOut} title="Log out">
          <LogOut size={15} />
          {!collapsed && <span>Log out</span>}
        </button>
        {onToggleCollapse && (
          <button onClick={onToggleCollapse} className="sidebar-link w-full justify-center mt-1" aria-label={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            {!collapsed && <span className="text-xs">Collapse</span>}
          </button>
        )}
      </div>
    </>
  );
}

export default function AdminSidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, adminName, adminEmail }: AdminSidebarProps) {
  return (
    <>
      {/* Desktop */}
      <aside className={`fixed left-0 top-0 bottom-0 z-40 hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        <SidebarContent collapsed={collapsed} adminName={adminName} adminEmail={adminEmail} onToggleCollapse={onToggleCollapse} />
      </aside>

      {/* Mobile */}
      <aside className={`fixed left-0 top-0 bottom-0 z-40 lg:hidden flex flex-col bg-card border-r border-border w-64 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-14 border-b border-border px-4">
          <div className="flex items-center gap-2">
            <AppLogo size={24} />
            <span className="font-extrabold text-sm text-foreground">SUMMECA Admin</span>
          </div>
          <button onClick={onCloseMobile} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">✕</button>
        </div>
        <SidebarContent collapsed={false} onCloseMobile={onCloseMobile} adminName={adminName} adminEmail={adminEmail} />
      </aside>
    </>
  );
}
