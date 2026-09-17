'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { ArrowRight, CreditCard, Headphones, ShieldCheck, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type ProviderAvailability = {
  crypto: boolean | null;
  payoneer: boolean | null;
  fastspring: boolean | null;
};

const FRIENDLY_CATEGORY_LABELS: Record<string, string> = {
  'ai tool': 'AI Workflow',
  api: 'Developer Tool',
  plugin: 'Extension',
  template: 'Business Template',
  dataset: 'Digital Kit',
  course: 'Digital Kit',
  saas: 'Business SaaS',
  'saas app': 'Business SaaS',
  other: 'Digital Kit',
};

function productSlug(pathname: string | null) {
  if (!pathname?.startsWith('/products/')) return null;
  return pathname.slice('/products/'.length).split('/')[0] || null;
}

async function providerAvailable(url: string): Promise<boolean | null> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = (await response.json()) as { available?: boolean };
    return data.available === true;
  } catch {
    return null;
  }
}

export default function ProductPageEnhancements() {
  const pathname = usePathname();
  const { isArabic, t } = useLanguage();
  const slug = productSlug(pathname);
  const isSaasProduct = slug === 'summeca-invoiceflow' || slug === 'summeca-leadfollow-ai';
  const [providerAvailability, setProviderAvailability] = useState<ProviderAvailability>({
    crypto: null,
    payoneer: null,
    fastspring: null,
  });
  const [trustTarget, setTrustTarget] = useState<HTMLElement | null>(null);
  const [howTarget, setHowTarget] = useState<HTMLElement | null>(null);
  const [checkoutHref, setCheckoutHref] = useState<string | null>(null);
  const [checkoutLabel, setCheckoutLabel] = useState('Continue to checkout');
  const [showSticky, setShowSticky] = useState(false);

  const availableProviders = useMemo(
    () => [
      providerAvailability.fastspring === true ? (isArabic ? 'البطاقات / وسائل محلية' : 'Card / local methods') : null,
      providerAvailability.payoneer === true ? 'Payoneer' : null,
      providerAvailability.crypto === true ? (isArabic ? 'العملات الرقمية' : 'Crypto') : null,
    ].filter((value): value is string => Boolean(value)),
    [providerAvailability, isArabic],
  );

  useEffect(() => {
    if (!slug) return;
    let alive = true;

    void Promise.all([
      providerAvailable('/api/payment/crypto-status'),
      providerAvailable('/api/payment/payoneer-status'),
      providerAvailable('/api/payment/fastspring-status'),
    ]).then(([crypto, payoneer, fastspring]) => {
      if (alive) setProviderAvailability({ crypto, payoneer, fastspring });
    });

    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const frame = window.requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>('main section:first-of-type span').forEach((node) => {
        const key = node.textContent?.trim().toLowerCase();
        if (!key) return;
        const replacement = FRIENDLY_CATEGORY_LABELS[key];
        if (replacement) node.textContent = replacement;
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let frame = 0;
    let observer: MutationObserver | null = null;
    let slot: HTMLElement | null = null;

    const sync = () => {
      const anchor = document.querySelector<HTMLAnchorElement>('main a[href^="/checkout?"]');
      if (!anchor) return false;

      setCheckoutHref(anchor.getAttribute('href'));
      setCheckoutLabel(anchor.textContent?.replace(/\s+/g, ' ').trim() || 'Continue to checkout');

      const existing = document.getElementById('summeca-purchase-confidence-slot');
      if (existing) {
        slot = existing;
        setTrustTarget(existing);
        return true;
      }

      const host = anchor.parentElement;
      if (!host?.parentElement) return false;

      slot = document.createElement('div');
      slot.id = 'summeca-purchase-confidence-slot';
      slot.setAttribute('data-i18n-skip', 'true');
      host.insertAdjacentElement('afterend', slot);
      setTrustTarget(slot);
      return true;
    };

    frame = window.requestAnimationFrame(() => {
      if (sync()) return;
      observer = new MutationObserver(() => {
        if (sync()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      slot?.remove();
      setTrustTarget(null);
      setCheckoutHref(null);
    };
  }, [slug]);

  useEffect(() => {
    if (!slug || isSaasProduct) return;
    let slot: HTMLElement | null = null;
    const frame = window.requestAnimationFrame(() => {
      const existing = document.getElementById('summeca-how-it-works-slot');
      if (existing) {
        slot = existing;
        setHowTarget(existing);
        return;
      }

      const videoSlot = document.getElementById('summeca-real-product-video-slot');
      const firstSection = document.querySelector<HTMLElement>('main section');
      const anchor = videoSlot ?? firstSection;
      if (!anchor?.parentElement) return;

      slot = document.createElement('div');
      slot.id = 'summeca-how-it-works-slot';
      slot.setAttribute('data-i18n-skip', 'true');
      anchor.insertAdjacentElement('afterend', slot);
      setHowTarget(slot);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      slot?.remove();
      setHowTarget(null);
    };
  }, [slug, isSaasProduct]);

  useEffect(() => {
    if (!slug) return;

    const updateSticky = () => {
      const hero = document.querySelector<HTMLElement>('main section');
      const footer = document.querySelector<HTMLElement>('footer');
      if (!hero || !checkoutHref) {
        setShowSticky(false);
        return;
      }

      const pastHero = hero.getBoundingClientRect().bottom < 120;
      const footerIsNear = Boolean(footer && footer.getBoundingClientRect().top < window.innerHeight - 36);
      setShowSticky(pastHero && !footerIsNear);
    };

    updateSticky();
    window.addEventListener('scroll', updateSticky, { passive: true });
    window.addEventListener('resize', updateSticky);
    return () => {
      window.removeEventListener('scroll', updateSticky);
      window.removeEventListener('resize', updateSticky);
    };
  }, [slug, checkoutHref]);

  if (!slug) return null;

  const paymentCopy = availableProviders.length
    ? `${t('Available before checkout')}: ${availableProviders.join(' · ')}`
    : t('Payment availability is confirmed before checkout.');
  const languageCopy = slug === 'summeca-leadfollow-ai'
    ? t('Preview UI is shown in English; supported draft languages are selected inside LeadFollow AI.')
    : slug === 'summeca-invoiceflow'
      ? t('The product preview is shown in English for a consistent buying experience.')
      : null;

  const howSteps = [
    ['1', t('Review the product'), t('Check the real preview, included content, and active offer.')],
    ['2', t('Choose your offer'), t('Select the published plan or one-time option that fits.')],
    ['3', t('Checkout and access'), t('Complete protected checkout, then receive account access or the digital delivery after verification.')],
  ];

  return (
    <>
      <style>{`
        @keyframes summeca-product-fade-up {
          from { opacity: 0; transform: translate3d(0, 12px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        main section h1,
        main section h2,
        main section article,
        main #product-preview {
          animation: summeca-product-fade-up .52s cubic-bezier(.2,.8,.2,1) both;
        }
        main section article:nth-child(2) { animation-delay: 55ms; }
        main section article:nth-child(3) { animation-delay: 95ms; }
        main section article:nth-child(4) { animation-delay: 135ms; }
        main section article {
          transition-property: transform, border-color, box-shadow, background-color;
          transition-duration: 220ms;
        }
        main section article:hover { transform: translateY(-3px); }
        @media (prefers-reduced-motion: reduce) {
          main section h1,
          main section h2,
          main section article,
          main #product-preview { animation: none !important; }
          main section article:hover { transform: none; }
        }
      `}</style>

      {trustTarget && createPortal(
        <div className="mt-4 rounded-2xl border border-primary/15 bg-card/80 p-3.5 shadow-sm backdrop-blur" data-i18n-skip dir={isArabic ? 'rtl' : 'ltr'}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold text-muted-foreground sm:text-xs">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-primary" /> {t('Protected checkout')}</span>
            <span className="inline-flex items-center gap-1.5"><Zap size={14} className="text-primary" /> {t('Access after verified payment')}</span>
            <span className="inline-flex items-center gap-1.5"><Headphones size={14} className="text-primary" /> {t('SUMMECA support')}</span>
          </div>
          <div className="mt-2 flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground sm:text-xs">
            <CreditCard size={13} className="mt-0.5 shrink-0 text-primary" />
            <span>{paymentCopy}</span>
          </div>
          {languageCopy && <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">{languageCopy}</p>}
        </div>,
        trustTarget,
      )}

      {howTarget && !isSaasProduct && createPortal(
        <section className="border-y border-border bg-secondary/15" aria-label={t('How it works')} data-i18n-skip dir={isArabic ? 'rtl' : 'ltr'}>
          <div className="mx-auto max-w-screen-xl px-6 py-12 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{t('How it works')}</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">{t('From preview to access in three steps')}</h2>
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {howSteps.map(([number, title, text]) => (
                <article key={number} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">{number}</span>
                  <h3 className="mt-4 font-black text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>,
        howTarget,
      )}

      {showSticky && checkoutHref && (
        <div className="fixed inset-x-3 bottom-3 z-[105] sm:inset-x-auto sm:right-4 sm:w-auto" data-i18n-skip dir={isArabic ? 'rtl' : 'ltr'}>
          <a
            href={checkoutHref}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary px-5 text-sm font-black text-primary-foreground shadow-[0_16px_45px_rgba(0,0,0,.28)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transform-none"
          >
            {checkoutLabel} <ArrowRight size={15} className={isArabic ? 'rotate-180' : undefined} />
          </a>
        </div>
      )}
    </>
  );
}