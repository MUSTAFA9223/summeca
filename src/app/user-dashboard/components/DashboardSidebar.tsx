'use client';

import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Package,
  CreditCard,
  ShoppingBag,
  Download,
  FileText,
  Activity,
  Key,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Heart,
  Gift,
  Bell,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  activeRoute: string;
}

const navGroups = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/user-dashboard', badge: null },
      { id: 'products', label: 'My Products', icon: Package, href: '/user-dashboard/products', badge: '3' },
      { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, href: '/user-dashboard/subscriptions', badge: null },
      { id: 'orders', label: 'Orders', icon: ShoppingBag, href: '/user-dashboard/orders', badge: null },
      { id: 'downloads', label: 'Downloads', icon: Download, href: '/user-dashboard/downloads', badge: '2' },
      { id: 'wishlist', label: 'Wishlist', icon: Heart, href: '/user-dashboard/wishlist', badge: null },
      { id: 'referrals', label: 'Referrals', icon: Gift, href: '/user-dashboard/referrals', badge: null },
      { id: 'notifications', label: 'Notifications', icon: Bell, href: '/user-dashboard/notifications', badge: null },
    ],
  },
  {
    id: 'billing',
    label: 'Billing & Usage',
    items: [
      { id: 'invoices', label: 'Invoices', icon: FileText, href: '/user-dashboard/invoices', badge: null },
      { id: 'usage', label: 'AI Usage', icon: Activity, href: '/user-dashboard/usage', badge: null },
      { id: 'api-keys', label: 'API Keys', icon: Key, href: '/user-dashboard/api-keys', badge: null },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      { id: 'security', label: 'Security', icon: Shield, href: '/user-dashboard/security', badge: null },
      { id: 'settings', label: 'Settings', icon: Settings, href: '/user-dashboard/settings', badge: null },
      { id: 'support', label: 'Support', icon: HelpCircle, href: '/user-dashboard/support', badge: '1' },
    ],
  },
];

export default function DashboardSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  activeRoute,
}: SidebarProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      router.push('/sign-up-login-screen');
      router.refresh();
    } catch {
      toast.error('Failed to sign out');
    }
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 border-b border-border px-4 flex-shrink-0 ${
          collapsed ? 'justify-center' : 'gap-2.5'
        }`}>
          <div className="w-7 h-7 rounded-lg bg-gradient-teal flex items-center justify-center flex-shrink-0">
            <AppLogo size={18} />
          </div>
          {!collapsed && (
            <span className="font-extrabold text-base text-foreground">
              SUMME<span className="text-gradient-primary">CA</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navGroups.map((group) => (
            <div key={`navgroup-${group.id}`} className="mb-5">
              {!collapsed && (
                <div className="px-3 mb-2">
                  <span className="text-xs font-700 uppercase tracking-widest text-muted-foreground">
                    {group.label}
                  </span>
                </div>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeRoute === item.id;
                  return (
                    <li key={`sidebar-${item.id}`}>
                      <Link
                        href={item.href}
                        className={`sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon size={17} className="flex-shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.badge && (
                              <span className="ml-auto text-xs font-700 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User + collapse */}
        <div className="border-t border-border p-2 flex-shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-3 py-2 mb-1 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5">
              <div className="w-7 h-7 rounded-full bg-gradient-teal flex items-center justify-center flex-shrink-0">
                <User size={13} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-600 text-foreground truncate">{displayName}</div>
                <div className="text-xs text-muted-foreground truncate">{user?.email || 'Loading...'}</div>
              </div>
            </div>
          )}
          <button
            className="sidebar-link w-full justify-center text-danger hover:bg-danger/5 hover:text-danger"
            onClick={handleSignOut}
            title="Log out"
          >
            <LogOut size={15} />
            {!collapsed && <span>Log out</span>}
          </button>
          <button
            onClick={onToggleCollapse}
            className="sidebar-link w-full justify-center mt-1"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            {!collapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 lg:hidden flex flex-col bg-white border-r border-border w-64 transition-transform duration-300 shadow-xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 border-b border-border px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-teal flex items-center justify-center">
              <AppLogo size={18} />
            </div>
            <span className="font-extrabold text-base text-foreground">
              SUMME<span className="text-gradient-primary">CA</span>
            </span>
          </div>
          <button
            onClick={onCloseMobile}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navGroups.map((group) => (
            <div key={`mobile-navgroup-${group.id}`} className="mb-5">
              <div className="px-3 mb-2">
                <span className="text-xs font-700 uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </span>
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeRoute === item.id;
                  return (
                    <li key={`mobile-sidebar-${item.id}`}>
                      <Link
                        href={item.href}
                        className={`sidebar-link ${isActive ? 'active' : ''}`}
                        onClick={onCloseMobile}
                      >
                        <item.icon size={17} className="flex-shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto text-xs font-700 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Mobile user + sign out */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User size={13} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-600 text-foreground truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email || ''}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="sidebar-link w-full text-danger hover:bg-danger/5"
          >
            <LogOut size={15} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}