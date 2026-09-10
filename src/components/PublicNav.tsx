'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, ChevronDown, FileText, GitCompare, LayoutDashboard, Menu, Sparkles, User, X } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
            <Link href="/user-dashboard" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/80 hover:text-foreground"><User size={15} />Account</Link>
            <Link href="/sign-up-login-screen" className="rounded-lg px-3 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80 hover:text-foreground">Log in</Link>
            <Link href="/sign-up-login-screen" className="btn-primary flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm"><Sparkles size={13} />Get Started</Link>
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
              <Link href="/user-dashboard" className="btn-secondary text-center text-sm" onClick={() => setMobileOpen(false)}>Account</Link>
              <Link href="/sign-up-login-screen" className="btn-primary flex items-center justify-center gap-1.5 text-center text-sm" onClick={() => setMobileOpen(false)}><Sparkles size={13} />Get Started</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
