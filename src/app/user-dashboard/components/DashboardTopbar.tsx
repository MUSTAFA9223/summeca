'use client';

import React, { useState } from 'react';
import { Menu, Search, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import NotificationBell from '@/components/NotificationBell';

interface DashboardTopbarProps {
  onOpenMobileSidebar: () => void;
}

export default function DashboardTopbar({ onOpenMobileSidebar }: DashboardTopbarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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
    <header className="h-14 border-b border-border bg-card flex items-center gap-3 px-5 lg:px-8 flex-shrink-0 sticky top-0 z-20">
      {/* Mobile hamburger */}
      <button
        className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150"
        onClick={onOpenMobileSidebar}
        aria-label="Open sidebar"
      >
        <Menu size={18} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm text-muted-foreground cursor-pointer hover:border-primary/40 transition-all duration-150">
        <Search size={14} />
        <span>Search products, orders...</span>
        <kbd className="ml-auto text-xs bg-card border border-border rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Live Notification Bell */}
        <NotificationBell />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-secondary transition-all duration-150"
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <User size={13} className="text-primary" />
            </div>
            <span className="hidden sm:block text-sm font-600 text-foreground">{displayName}</span>
            <ChevronDown size={13} className="text-muted-foreground" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-card-lg p-2 fade-in z-50">
              <div className="px-3 py-2 mb-1 border-b border-border">
                <div className="text-xs font-600 text-foreground truncate">{displayName}</div>
                <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              </div>
              {[
                { label: 'Profile', icon: User, href: '/user-dashboard/settings' },
                { label: 'Settings', icon: Settings, href: '/user-dashboard/settings' },
              ].map(({ label, icon: IconComp, href }) => (
                <Link
                  key={`user-menu-${label}`}
                  href={href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-secondary-foreground hover:text-foreground hover:bg-secondary transition-all duration-150"
                  onClick={() => setUserMenuOpen(false)}
                >
                  {React.createElement(IconComp, { size: 14 })}
                  {label}
                </Link>
              ))}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/5 transition-all duration-150 mt-1 border-t border-border"
              >
                <LogOut size={14} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}