'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  ChevronDown,
  FileText,
  GitCompare,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';

const productLinks = [
  { label: 'AI Tools', href: '/ai', icon: Brain, desc: 'Published AI tools, APIs, and plugins' },
  { label: 'SaaS Apps', href: '/saas', icon: LayoutDashboard, desc: 'Published software and services' },
  { label: 'Digital Products', href: '/digital', icon: FileText, desc: 'Published templates, datasets, and files' },
  { label: 'Compare Products', href: '/compare', icon: GitCompare, desc: 'Compare published product facts' },
];

const simpleLinks = [
  { label: 'Services', href: '/services' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Support', href: '/support' },
];

export default function PublicNav() {
  const { user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const rawDisplayName =
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    user?.email?.split('@')[0] ||
    'Account';
  const displayName = rawDisplayName.length > 24 ? `${rawDisplayName.slice(0, 24)}…` : rawDisplayName;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  return (
    <header className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-primary/8 bg-white/95 shadow-sm shadow-primary/5 backdrop-blur-xl' : 'bg-transparent'}`}>
      <div className="mx-auto max-w-screen-xl px-6 lg:px-8">
        <div className="flex h-[68px] items-center justify-between">
          <Link href="/" className="group flex shrink-0 items-center" aria-label="SUMMECA home">
            <AppLogo variant="wordmark" size={46} className="transition-transform duration-200 group-hover:scale-[1.02]" />
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex">
            <div className="relative" onMouseEnter={() => setProductsOpen(true)} onMouseLeave={() => setProductsOpen(false)}>
              <Link href="/products" className="flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/80 hover:text-foreground">
                Products <ChevronDown size={13} className={`transition-transform ${productsOpen ? 'rotate-180 text-primary' : ''}`} />
              </Link>
              {productsOpen && (
                <div className="glass-card-premium absolute left-0 top-full mt-2 w-72 rounded-2xl p-2 shadow-xl">
                  <div className="absolute left-4 right-4 top-0 h-0.5 rounded-full bg-gradient-to-r from-primary/60 to-accent/40" />
                  {productLinks.map((item) => (
                    <Link key={item.href} href={item.href} className="group mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-secondary/70">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 transition group-hover:bg-gradient-teal"><item.icon size={15} className="text-primary transition-colors group-hover:text-white" /></div>
                      <div><div className="text-sm font-semibold text-foreground">{item.label}</div><div className="text-xs text-muted-foreground">{item.desc}</div></div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {simpleLinks.map((item) => <Link key={item.href} href={item.href} className="block rounded-lg px-3.5 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/80 hover:text-foreground">{item.label}</Link>)}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {loading ? (
              <div className="h-9 w-28 animate-pulse rounded-lg bg-secondary/70" aria-label="Loading account" />
            ) : user ? (
              <>
                <div ref={accountMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountOpen((open) => !open)}
                    className="flex max-w-[220px] items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80 hover:text-foreground"
                    aria-haspopup="menu"
                    aria-expanded={accountOpen}
                  >
                    <User size={15} className="shrink-0 text-primary" />
                    <span className="truncate">{displayName}</span>
                    <ChevronDown size={13} className={`shrink-0 transition-transform ${accountOpen ? 'rotate-180 text-primary' : ''}`} />
                  </button>

                  {accountOpen && (
                    <div className="glass-card-premium absolute right-0 top-full mt-2 w-64 rounded-2xl p-2 shadow-xl" role="menu">
                      <div className="border-b border-border px-3 py-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Signed in as</div>
                        <div className="mt-0.5 truncate text-sm font-semibold text-foreground">{displayName}</div>
                        {user.email && <div className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</div>}
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
                <Link href="/user-dashboard" className="btn-primary flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm"><LayoutDashboard size={13} />Dashboard</Link>
              </>
            ) : (
              <>
                <Link href="/sign-up-login-screen" className="rounded-lg px-3 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80 hover:text-foreground">Log in</Link>
                <Link href="/sign-up-login-screen" className="btn-primary flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm"><Sparkles size={13} />Get Started</Link>
              </>
            )}
          </div>

          <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground lg:hidden" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle mobile menu">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-white/98 shadow-xl backdrop-blur-xl lg:hidden">
          <div className="h-0.5 bg-gradient-to-r from-primary via-accent to-transparent" />
          <div className="space-y-1 px-4 py-5">
            <Link href="/products" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary" onClick={() => setMobileOpen(false)}>Products</Link>
            {productLinks.map((item) => <Link key={item.href} href={item.href} className="block rounded-xl px-6 py-2 text-sm text-secondary-foreground hover:bg-secondary hover:text-foreground" onClick={() => setMobileOpen(false)}>{item.label}</Link>)}
            {simpleLinks.map((item) => <Link key={item.href} href={item.href} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-secondary-foreground hover:bg-secondary hover:text-foreground" onClick={() => setMobileOpen(false)}>{item.label}</Link>)}
            <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-4">
              {loading ? (
                <div className="h-10 animate-pulse rounded-xl bg-secondary/70" aria-label="Loading account" />
              ) : user ? (
                <>
                  <div className="rounded-xl border border-border bg-secondary/40 px-3 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><User size={15} className="text-primary" /><span className="truncate">{displayName}</span></div>
                    {user.email && <div className="mt-1 truncate pl-[23px] text-xs text-muted-foreground">{user.email}</div>}
                  </div>
                  <Link href="/user-dashboard" className="btn-primary flex items-center justify-center gap-1.5 text-center text-sm" onClick={() => setMobileOpen(false)}><LayoutDashboard size={13} />Dashboard</Link>
                  <Link href="/user-dashboard/settings" className="btn-secondary flex items-center justify-center gap-1.5 text-center text-sm" onClick={() => setMobileOpen(false)}><Settings size={13} />Account settings</Link>
                  <button type="button" className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground" onClick={() => void handleSignOut()}><LogOut size={13} className="mr-1.5 inline" />Sign out</button>
                </>
              ) : (
                <>
                  <Link href="/sign-up-login-screen" className="btn-secondary text-center text-sm" onClick={() => setMobileOpen(false)}>Log in</Link>
                  <Link href="/sign-up-login-screen" className="btn-primary flex items-center justify-center gap-1.5 text-center text-sm" onClick={() => setMobileOpen(false)}><Sparkles size={13} />Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
