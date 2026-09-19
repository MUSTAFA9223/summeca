'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { ThemeSwitcher } from '@/components/GlobalThemeSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';

const navLinks = [
  { label: 'For Stores', href: '/#solutions' },
  { label: 'Products', href: '/products' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Support', href: '/support' },
];

export default function PublicNav() {
  const { user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const rawDisplayName =
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    user?.email?.split('@')[0] ||
    'SUMMECA';
  const firstDisplayName = rawDisplayName.split(/[\s._-]+/).filter(Boolean)[0] || 'SUMMECA';
  const headerDisplayName = firstDisplayName.length > 16
    ? `${firstDisplayName.slice(0, 16)}…`
    : firstDisplayName;
  const accountDisplayName = rawDisplayName.length > 36
    ? `${rawDisplayName.slice(0, 36)}…`
    : rawDisplayName;

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const handleSignOut = async () => {
    setAccountOpen(false);
    setMobileOpen(false);
    await signOut();
  };

  const trackSignupCta = (placement: 'desktop_nav' | 'mobile_nav') => {
    trackEvent('primary_cta_click', {
      placement,
      destination: 'signup',
      audience: 'small_ecommerce',
    });
  };

  return (
    <header
      data-public-nav="true"
      data-theme-switcher-host="true"
      className="sticky top-0 z-50 -mb-[70px] border-b border-primary/10 bg-background/90 shadow-sm shadow-primary/5 backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-300"
    >
      <div className="mx-auto max-w-screen-xl px-5 sm:px-6 lg:px-8">
        <div className="flex h-[70px] items-center justify-between">
          <Link href="/" className="group flex shrink-0 items-center" aria-label="SUMMECA home">
            <AppLogo variant="wordmark" size={50} className="transition-transform duration-200 group-hover:scale-[1.025]" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3.5 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/80 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeSwitcher compact />
            {loading ? (
              <div className="h-9 w-24 animate-pulse rounded-lg bg-secondary/70" aria-label="Loading account" />
            ) : user ? (
              <>
                <div ref={accountMenuRef} className="relative min-w-0">
                  <button
                    type="button"
                    onClick={() => setAccountOpen((open) => !open)}
                    className="flex min-w-0 max-w-[150px] items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80 hover:text-foreground"
                    aria-haspopup="menu"
                    aria-expanded={accountOpen}
                    title={rawDisplayName}
                  >
                    <User size={15} className="shrink-0 text-primary" />
                    <span dir="auto" className="min-w-0 flex-1 truncate text-start">{headerDisplayName}</span>
                    <ChevronDown size={13} className={`shrink-0 transition-transform ${accountOpen ? 'rotate-180 text-primary' : ''}`} />
                  </button>

                  {accountOpen && (
                    <div className="glass-card-premium absolute end-0 top-full mt-2 w-64 rounded-2xl p-2 shadow-xl" role="menu">
                      <div className="border-b border-border px-3 py-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Signed in as</div>
                        <div dir="auto" className="mt-0.5 truncate text-sm font-semibold text-foreground">{accountDisplayName}</div>
                        {user.email && <div className="mt-0.5 truncate text-xs text-muted-foreground" data-ltr>{user.email}</div>}
                      </div>
                      <Link href="/user-dashboard" onClick={() => setAccountOpen(false)} className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/70 hover:text-foreground" role="menuitem">
                        <LayoutDashboard size={15} /> Dashboard
                      </Link>
                      <Link href="/user-dashboard/settings" onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/70 hover:text-foreground" role="menuitem">
                        <Settings size={15} /> Account settings
                      </Link>
                      <button type="button" onClick={() => void handleSignOut()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-secondary-foreground transition hover:bg-secondary/70 hover:text-foreground" role="menuitem">
                        <LogOut size={15} /> Sign out
                      </button>
                    </div>
                  )}
                </div>
                <Link href="/user-dashboard" className="btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm"><LayoutDashboard size={13} />Dashboard</Link>
              </>
            ) : (
              <>
                <Link href="/sign-up-login-screen" className="rounded-lg px-3 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80 hover:text-foreground">Log in</Link>
                <Link href="/sign-up-login-screen" onClick={() => trackSignupCta('desktop_nav')} className="btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm"><Sparkles size={13} />Get Started</Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle mobile menu" aria-expanded={mobileOpen}>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="absolute inset-x-0 top-full border-t border-border bg-background/[0.98] shadow-xl backdrop-blur-xl lg:hidden">
          <div className="h-0.5 bg-gradient-to-r from-primary via-accent to-transparent" />
          <div className="space-y-1 px-4 py-4">
            {navLinks.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-secondary-foreground hover:bg-secondary hover:text-foreground" onClick={() => setMobileOpen(false)}>
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-4">
              <div className="flex min-h-11 items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2">
                <span className="text-sm font-semibold text-secondary-foreground">Theme</span>
                <ThemeSwitcher compact />
              </div>
              {loading ? (
                <div className="h-10 animate-pulse rounded-xl bg-secondary/70" aria-label="Loading account" />
              ) : user ? (
                <>
                  <div className="min-w-0 rounded-xl border border-border bg-secondary/40 px-3 py-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground"><User size={15} className="shrink-0 text-primary" /><span dir="auto" className="min-w-0 flex-1 truncate text-start">{headerDisplayName}</span></div>
                    {user.email && <div className="mt-1 truncate ps-[23px] text-xs text-muted-foreground" data-ltr>{user.email}</div>}
                  </div>
                  <Link href="/user-dashboard" className="btn-primary flex items-center justify-center gap-1.5 text-center text-sm" onClick={() => setMobileOpen(false)}><LayoutDashboard size={13} />Dashboard</Link>
                  <Link href="/user-dashboard/settings" className="btn-secondary flex items-center justify-center gap-1.5 text-center text-sm" onClick={() => setMobileOpen(false)}><Settings size={13} />Account settings</Link>
                  <button type="button" className="btn-secondary flex items-center justify-center gap-1.5 text-center text-sm" onClick={() => void handleSignOut()}><LogOut size={13} />Sign out</button>
                </>
              ) : (
                <>
                  <Link href="/sign-up-login-screen" className="btn-secondary text-center text-sm" onClick={() => setMobileOpen(false)}>Log in</Link>
                  <Link
                    href="/sign-up-login-screen"
                    className="btn-primary flex items-center justify-center gap-1.5 text-center text-sm"
                    onClick={() => {
                      setMobileOpen(false);
                      trackSignupCta('mobile_nav');
                    }}
                  >
                    <Sparkles size={13} />Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
