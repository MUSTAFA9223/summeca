'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { Menu, X, ChevronDown, Zap, LayoutDashboard, FileText, Brain, Sparkles, BarChart3, User, GitCompare } from 'lucide-react';

const navItems = [
  {
    label: 'Products',
    href: '/products',
    children: [
      { label: 'AI Tools', href: '/ai', icon: Brain, desc: 'Intelligent automation & AI' },
      { label: 'SaaS Apps', href: '/saas', icon: LayoutDashboard, desc: 'Cloud-based applications' },
      { label: 'Digital Products', href: '/digital', icon: FileText, desc: 'Templates & digital assets' },
      { label: 'Compare Products', href: '/compare', icon: GitCompare, desc: 'Side-by-side comparison' },
    ],
  },
  {
    label: 'AI Solutions',
    href: '/ai',
    children: [
      { label: 'AI Solutions', href: '/ai', icon: Sparkles, desc: 'Explore intelligent SUMMECA products' },
      { label: 'AI Analytics', href: '/ai', icon: BarChart3, desc: 'Business intelligence' },
      { label: 'AI Tools', href: '/ai', icon: Zap, desc: 'Productivity automation' },
    ],
  },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Support', href: '/support' },
];

export default function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-xl border-b border-primary/8 shadow-sm shadow-primary/5' : 'bg-transparent'}`}>
      <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px]">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-teal flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200"><AppLogo size={20} /></div>
            <span className="font-extrabold text-xl tracking-tight text-foreground">SUMME<span className="text-gradient-primary">CA</span></span>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5">
            {navItems.map((item) => (
              <div key={`nav-${item.label}`} className="relative">
                {item.children ? (
                  <button className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-500 text-secondary-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-150" onMouseEnter={() => setActiveDropdown(item.label)} onMouseLeave={() => setActiveDropdown(null)}>
                    {item.label}<ChevronDown size={13} className={`transition-transform duration-200 ${activeDropdown === item.label ? 'rotate-180 text-primary' : ''}`} />
                  </button>
                ) : (
                  <Link href={item.href} className="px-3.5 py-2 rounded-lg text-sm font-500 text-secondary-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-150 block">{item.label}</Link>
                )}
                {item.children && activeDropdown === item.label && (
                  <div className="absolute top-full left-0 mt-2 w-64 glass-card-premium rounded-2xl p-2 fade-in shadow-xl" onMouseEnter={() => setActiveDropdown(item.label)} onMouseLeave={() => setActiveDropdown(null)}>
                    <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-primary/60 to-accent/40 rounded-full" />
                    {item.children.map((child) => (
                      <Link key={`dropdown-${child.label}`} href={child.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/70 transition-all duration-150 group mt-1">
                        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-gradient-teal group-hover:shadow-sm transition-all duration-200"><child.icon size={15} className="text-primary group-hover:text-white transition-colors duration-200" /></div>
                        <div><div className="text-sm font-600 text-foreground">{child.label}</div><div className="text-xs text-muted-foreground">{child.desc}</div></div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <Link href="/user-dashboard" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-500 text-secondary-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-150"><User size={15} />Account</Link>
            <Link href="/sign-up-login-screen" className="text-sm font-600 text-secondary-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-secondary/80 transition-all duration-150">Log in</Link>
            <Link href="/sign-up-login-screen" className="btn-primary text-sm px-5 py-2.5 flex items-center gap-1.5 rounded-xl"><Sparkles size={13} />Get Started</Link>
          </div>

          <button className="lg:hidden w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-150" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle mobile menu">{mobileOpen ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-white/98 backdrop-blur-xl border-t border-border shadow-xl fade-in">
          <div className="h-0.5 bg-gradient-to-r from-primary via-accent to-transparent" />
          <div className="px-4 py-5 space-y-1">
            {navItems.map((item) => (
              <Link key={`mobile-nav-${item.label}`} href={item.href} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-500 text-secondary-foreground hover:text-foreground hover:bg-secondary transition-all duration-150" onClick={() => setMobileOpen(false)}>{item.label}</Link>
            ))}
            <div className="pt-4 border-t border-border flex flex-col gap-2.5">
              <Link href="/sign-up-login-screen" className="btn-secondary text-sm text-center" onClick={() => setMobileOpen(false)}>Log in</Link>
              <Link href="/sign-up-login-screen" className="btn-primary text-sm text-center flex items-center justify-center gap-1.5" onClick={() => setMobileOpen(false)}><Sparkles size={13} />Get Started Free</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
