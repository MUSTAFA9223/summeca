import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { Mail } from 'lucide-react';

const footerLinks = {
  Platform: [
    { label: 'AI Tools', href: '/ai' },
    { label: 'SaaS Apps', href: '/saas' },
    { label: 'Digital Products', href: '/digital' },
    { label: 'Pricing', href: '/pricing' },
  ],
  Company: [
    { label: 'About SUMMECA', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
  Support: [
    { label: 'Help Center', href: '/support' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Refund Policy', href: '/refunds' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookies' },
  ],
};

function TwitterIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function PublicFooter() {
  const socialLinks = [
    { Icon: TwitterIcon, href: 'https://x.com/summeca_', label: 'SUMMECA on X (@summeca_)' },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-white/8 bg-[#0A0F1E] text-white">
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(rgba(13,148,136,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,0.05) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[140px] w-[520px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative mx-auto max-w-screen-xl px-6 py-9 lg:px-8 lg:py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(4,1fr)] lg:gap-7">
          <div className="sm:col-span-2 lg:col-span-1">
            <AppLogo variant="wordmark" tone="light" size={44} />
            <p className="mt-3 max-w-[250px] text-sm leading-6 text-slate-400">Digital products, SaaS tools, and AI-focused solutions for modern work.</p>
            <div className="mt-4 flex items-center gap-2">
              {socialLinks.map(({ Icon, href, label }) => (
                <a key={`footer-social-${label}`} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-slate-400 transition hover:bg-primary/30 hover:text-white"><Icon size={15} /></a>
              ))}
              <a href="mailto:hello@summeca.com?subject=SUMMECA%20General%20Inquiry" aria-label="Email SUMMECA general inquiries" title="hello@summeca.com" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-slate-400 transition hover:bg-primary/30 hover:text-white"><Mail size={15} /></a>
            </div>
            <a
              href="https://www.producthunt.com/products/summeca?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-summeca"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View SUMMECA on Product Hunt"
              className="mt-5 inline-flex max-w-full rounded-lg bg-white p-1 shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1249344&theme=light&t=1789457265017"
                alt="SUMMECA — AI, SaaS and digital tools for faster business on Product Hunt"
                width="250"
                height="54"
                loading="lazy"
                decoding="async"
                className="h-auto max-w-full"
              />
            </a>
          </div>

          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={`footer-section-${section}`}>
              <h4 className="mb-3 text-[11px] font-700 uppercase tracking-widest text-slate-500">{section}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={`footer-link-${link.label}`}>
                    <Link href={link.href} className="text-sm text-slate-400 transition-colors hover:text-primary">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-white/8 pt-5 sm:flex-row">
          <p className="text-xs text-slate-600">© 2026 SUMMECA. All rights reserved.</p>
          <p className="text-xs text-slate-600">summeca.com</p>
        </div>
      </div>
    </footer>
  );
}
