import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { Mail, ArrowRight, Zap, Shield, Globe } from 'lucide-react';

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
    { label: 'Status', href: '/status' },
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

  const trustBadges = [
    { icon: Shield, text: 'Enterprise Security' },
    { icon: Zap, text: 'AI-Powered' },
    { icon: Globe, text: '150+ Countries' },
  ];

  return (
    <footer className="bg-[#0A0F1E] text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'linear-gradient(rgba(13,148,136,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="relative border-b border-white/6">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-center gap-6">
            {trustBadges.map(({ icon: IconComponent, text }) => (
              <div key={text} className="flex items-center gap-2 text-slate-400">
                <IconComponent size={13} className="text-primary/70" />
                <span className="text-xs font-500">{text}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-500 text-slate-400">All systems operational</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-b border-white/8">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-700 text-white mb-1">Stay ahead with SUMMECA</h3>
              <p className="text-sm text-slate-400">Product updates, AI insights, and exclusive offers.</p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-64 px-4 py-2.5 rounded-xl bg-white/8 border border-white/12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/60 focus:bg-white/10 transition-all duration-200"
              />
              <button className="btn-primary text-sm px-4 py-2.5 flex items-center gap-1.5 whitespace-nowrap rounded-xl">
                Subscribe <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-screen-xl mx-auto px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-10">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-teal flex items-center justify-center shadow-md">
                <AppLogo size={20} />
              </div>
              <span className="font-extrabold text-lg text-white">SUMMECA</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-5 max-w-[220px]">
              AI-powered business technology for the modern enterprise. Built for scale.
            </p>
            <div className="w-12 h-0.5 bg-gradient-to-r from-primary to-accent rounded-full mb-5" />
            <div className="flex items-center gap-2">
              {socialLinks.map(({ Icon, href, label }) => (
                <a
                  key={`footer-social-${label}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-primary/30 hover:scale-110 transition-all duration-200"
                >
                  <Icon size={15} />
                </a>
              ))}
              <a
                href="mailto:hello@summeca.com"
                aria-label="Email"
                className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-primary/30 hover:scale-110 transition-all duration-200"
              >
                <Mail size={15} />
              </a>
            </div>
          </div>

          {Object.entries(footerLinks)?.map(([section, links]) => (
            <div key={`footer-section-${section}`}>
              <h4 className="text-xs font-700 uppercase tracking-widest text-slate-500 mb-4">
                {section}
              </h4>
              <ul className="space-y-2.5">
                {links?.map((link) => (
                  <li key={`footer-link-${link?.label}`}>
                    <Link
                      href={link?.href}
                      className="text-sm text-slate-400 hover:text-primary transition-colors duration-150 hover:translate-x-0.5 inline-block"
                    >
                      {link?.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            © 2026 SUMMECA Technologies. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
              <p className="text-xs text-slate-600">Powered by AI</p>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-700" />
            <p className="text-xs text-slate-600">SUMMECA v37</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
