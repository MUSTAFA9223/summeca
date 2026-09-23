'use client';

import Link from 'next/link';
import { ArrowUpRight, Mail } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { useLanguage } from '@/contexts/LanguageContext';

const PRODUCT_HUNT_URL =
  'https://www.producthunt.com/products/summeca?utm_source=other&utm_medium=social';
const TOOLS_CAFE_URL = 'https://tools.cafe';
const LAUNCHSTAG_URL = 'https://launchstag.com/p/summeca';
const FAZIER_URL = 'https://fazier.com';
const SELLWITHBOOST_URL = 'https://sellwithboost.com';
const X_URL = 'https://x.com/summeca_';
const CONTACT_EMAIL = 'hello@summeca.com';

const footerSections = [
  {
    key: 'platform',
    label: { en: 'Platform', ar: 'المنصة' },
    links: [
      { label: { en: 'AI Tools', ar: 'أدوات الذكاء الاصطناعي' }, href: '/ai' },
      { label: { en: 'SaaS Apps', ar: 'تطبيقات SaaS' }, href: '/saas' },
      { label: { en: 'Digital Products', ar: 'المنتجات الرقمية' }, href: '/digital' },
      { label: { en: 'Pricing', ar: 'الأسعار' }, href: '/pricing' },
    ],
  },
  {
    key: 'company',
    label: { en: 'Company', ar: 'الشركة' },
    links: [
      { label: { en: 'About SUMMECA', ar: 'عن SUMMECA' }, href: '/about' },
      { label: { en: 'Contact', ar: 'تواصل معنا' }, href: '/contact' },
    ],
  },
  {
    key: 'support',
    label: { en: 'Support', ar: 'الدعم' },
    links: [
      { label: { en: 'Help Center', ar: 'مركز المساعدة' }, href: '/support' },
      { label: { en: 'FAQ', ar: 'الأسئلة الشائعة' }, href: '/faq' },
      { label: { en: 'Refund Policy', ar: 'سياسة الاسترداد' }, href: '/refunds' },
      { label: { en: 'Delivery Policy', ar: 'سياسة التسليم' }, href: '/shipping' },
    ],
  },
  {
    key: 'legal',
    label: { en: 'Legal', ar: 'قانوني' },
    links: [
      { label: { en: 'Privacy Policy', ar: 'سياسة الخصوصية' }, href: '/privacy' },
      { label: { en: 'Terms of Service', ar: 'شروط الخدمة' }, href: '/terms' },
      { label: { en: 'Cookie Policy', ar: 'سياسة ملفات الارتباط' }, href: '/cookies' },
    ],
  },
] as const;

function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function PublicFooter() {
  const { isArabic } = useLanguage();
  const language = isArabic ? 'ar' : 'en';
  const copy = isArabic
    ? {
        description: 'منتجات رقمية وتطبيقات SaaS وحلول تركّز على الذكاء الاصطناعي للعمل الحديث.',
        follow: 'تابع SUMMECA',
        xLabel: 'SUMMECA على X (@summeca_)',
        emailLabel: 'راسل SUMMECA',
        productHunt: 'عرض SUMMECA على Product Hunt',
        productHuntHint: 'يفتح الموقع الرسمي في علامة تبويب جديدة',
        toolsCafe: 'SUMMECA مميزة على tools.cafe',
        launchstag: 'SUMMECA مميزة على Launchstag',
        fazier: 'تم إطلاق SUMMECA على Fazier',
        sellwithboost: 'SUMMECA مدرجة على Sell With Boost',
        rights: 'جميع الحقوق محفوظة.',
      }
    : {
        description: 'Digital products, SaaS tools, and AI-focused solutions for modern work.',
        follow: 'Follow SUMMECA',
        xLabel: 'SUMMECA on X (@summeca_)',
        emailLabel: 'Email SUMMECA',
        productHunt: 'View SUMMECA on Product Hunt',
        productHuntHint: 'Opens the official listing in a new tab',
        toolsCafe: 'SUMMECA is featured on tools.cafe',
        launchstag: 'SUMMECA is featured on Launchstag',
        fazier: 'SUMMECA launched on Fazier',
        sellwithboost: 'SUMMECA is listed on Sell With Boost',
        rights: 'All rights reserved.',
      };

  return (
    <footer
      data-public-footer="true"
      dir={isArabic ? 'rtl' : 'ltr'}
      className="relative overflow-hidden border-t border-white/10 bg-[#0A0F1E] text-white"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'linear-gradient(rgba(13,148,136,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,0.05) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[140px] w-[520px] max-w-full -translate-x-1/2 rounded-full bg-primary/5 blur-3xl"
      />

      <div className="relative mx-auto max-w-screen-xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-[1.55fr_repeat(4,minmax(0,1fr))] lg:gap-x-7">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="inline-flex max-w-full">
              <AppLogo variant="wordmark" tone="light" size={52} />
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">{copy.description}</p>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {copy.follow}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={X_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={copy.xLabel}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-medium text-slate-200 transition hover:border-primary/40 hover:bg-primary/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <XIcon />
                <span>X</span>
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=SUMMECA%20General%20Inquiry`}
                aria-label={copy.emailLabel}
                className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-medium text-slate-200 transition hover:border-primary/40 hover:bg-primary/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Mail size={18} aria-hidden="true" />
                <span className="break-all">{CONTACT_EMAIL}</span>
              </a>
            </div>

            <a
              href={PRODUCT_HUNT_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={copy.productHunt}
              className="mt-5 inline-flex min-h-12 max-w-full items-center gap-3 rounded-xl border border-primary/35 bg-white/[0.06] px-4 py-2.5 text-start text-slate-100 transition hover:border-primary/60 hover:bg-primary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{copy.productHunt}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-400">
                  {copy.productHuntHint}
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={TOOLS_CAFE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={copy.toolsCafe}
                className="inline-flex max-w-full rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {/* tools.cafe verifies this official badge URL for free listings. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- the directory requires its exact external badge URL. */}
                <img
                  src="https://tools.cafe/b/light.svg"
                  alt="Featured on tools.cafe"
                  width="256"
                  height="80"
                  loading="lazy"
                  className="h-auto max-w-full"
                />
              </a>

              <a
                href={LAUNCHSTAG_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={copy.launchstag}
                className="inline-flex max-w-full rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {/* Launchstag verifies this exact badge and destination for free listings. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- the directory requires its exact external badge URL. */}
                <img
                  src="https://launchstag.com/badge-light.svg"
                  alt="Featured on Launchstag"
                  width="198"
                  height="62"
                  loading="lazy"
                  className="h-auto max-w-full"
                />
              </a>

              <a
                href={FAZIER_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={copy.fazier}
                className="inline-flex max-w-full rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {/* Fazier verifies this exact badge and destination for free launches. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- the directory requires its exact external badge URL. */}
                <img
                  src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=light"
                  alt="Fazier badge"
                  width="120"
                  loading="lazy"
                  className="h-auto max-w-full"
                />
              </a>

              <a
                href={SELLWITHBOOST_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={copy.sellwithboost}
                className="inline-flex max-w-full rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {/* Sell With Boost verifies this exact backlink and badge URL for the free listing. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- the directory requires its exact external badge URL. */}
                <img
                  src="https://sellwithboost.com/badge/listing.svg"
                  alt="Listed on Sell with boost"
                  loading="lazy"
                  style={{ height: 40, width: 'auto' }}
                />
              </a>
            </div>
          </div>

          {footerSections.map((section) => (
            <nav key={section.key} aria-label={section.label[language]}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                {section.label[language]}
              </h2>
              <ul className="space-y-1">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-10 items-center py-1 text-sm leading-5 text-slate-300 transition-colors hover:text-primary focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {link.label[language]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 SUMMECA. {copy.rights}</p>
          <p dir="ltr" className={isArabic ? 'self-end sm:self-auto' : undefined}>
            summeca.com
          </p>
        </div>
      </div>
    </footer>
  );
}