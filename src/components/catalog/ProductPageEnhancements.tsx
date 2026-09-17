'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { ArrowRight, CreditCard, Headphones, ShieldCheck, Zap } from 'lucide-react';

type ProviderAvailability = {
  crypto: boolean | null;
  payoneer: boolean | null;
  fastspring: boolean | null;
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
  const slug = productSlug(pathname);
  const [providerAvailability, setProviderAvailability] = useState<ProviderAvailability>({
    crypto: null,
    payoneer: null,
    fastspring: null,
  });
  const [trustTarget, setTrustTarget] = useState<HTMLElement | null>(null);
  const [checkoutHref, setCheckoutHref] = useState<string | null>(null);
  const [checkoutLabel, setCheckoutLabel] = useState('Continue to checkout');
  const [showSticky, setShowSticky] = useState(false);

  const availableProviders = useMemo(
    () => [
      providerAvailability.fastspring === true ? 'Card / local methods' : null,
      providerAvailability.payoneer === true ? 'Payoneer' : null,
      providerAvailability.crypto === true ? 'Crypto' : null,
    ].filter((value): value is string => Boolean(value)),
    [providerAvailability],
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
    ? `Available before checkout: ${availableProviders.join(' · ')}`
    : 'Payment availability is confirmed before checkout.';
  const languageCopy = slug === 'summeca-leadfollow-ai'
    ? 'Preview UI is shown in English; supported draft languages are selected inside LeadFollow AI.'
    : slug === 'summeca-invoiceflow'
      ? 'The product preview is shown in English for a consistent buying experience.'
      : null;

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
        main section article:hover {
          transform: translateY(-3px);
        }
        @media (prefers-reduced-motion: reduce) {
          main section h1,
          main section h2,
          main section article,
          main #product-preview {
            animation: none !important;
          }
          main section article:hover { transform: none; }
        }
      `}</style>

      {trustTarget && createPortal(
        <div className="mt-4 rounded-2xl border border-primary/15 bg-card/80 p-3.5 shadow-sm backdrop-blur" data-i18n-skip>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold text-muted-foreground sm:text-xs">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-primary" /> Protected checkout</span>
            <span className="inline-flex items-center gap-1.5"><Zap size={14} className="text-primary" /> Access after verified payment</span>
            <span className="inline-flex items-center gap-1.5"><Headphones size={14} className="text-primary" /> SUMMECA support</span>
          </div>
          <div className="mt-2 flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground sm:text-xs">
            <CreditCard size={13} className="mt-0.5 shrink-0 text-primary" />
            <span>{paymentCopy}</span>
          </div>
          {languageCopy && <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">{languageCopy}</p>}
        </div>,
        trustTarget,
      )}

      {showSticky && checkoutHref && (
        <div className="fixed inset-x-3 bottom-3 z-[105] sm:inset-x-auto sm:right-4 sm:w-auto" data-i18n-skip>
          <a
            href={checkoutHref}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary px-5 text-sm font-black text-primary-foreground shadow-[0_16px_45px_rgba(0,0,0,.28)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transform-none"
          >
            {checkoutLabel} <ArrowRight size={15} />
          </a>
        </div>
      )}
    </>
  );
}
