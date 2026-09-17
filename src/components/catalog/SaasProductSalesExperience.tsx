'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Play, ShieldCheck } from 'lucide-react';
import BaseSaasProductSalesExperience from './SaasProductSalesExperienceBase';
import type {
  SaasSalesPlan,
  SaasSalesProduct,
} from './SaasProductSalesExperienceBase';
import { useLanguage } from '@/contexts/LanguageContext';
import { getEffectivePrice } from '@/lib/pricing';

export * from './SaasProductSalesExperienceBase';

type DemoSlug = 'summeca-invoiceflow' | 'summeca-leadfollow-ai';

// Publish only recordings captured from the real customer-facing workspaces.
// Keep a slug absent until its final demo file is hosted and verified.
const DEMO_VIDEO_BY_SLUG: Partial<Record<DemoSlug, string>> = {
  'summeca-invoiceflow': '/assets/product-videos/summeca-invoiceflow-6s.mp4',
  'summeca-leadfollow-ai': '/assets/product-videos/summeca-leadfollow-ai-6s.mp4',
};

const STAGE5_AR: Record<string, string> = {
  'Account-based SaaS': 'وصول SaaS عبر الحساب',
  'Choose plan': 'اختر الخطة',
  'Buy now': 'اشترِ الآن',
  'Product FAQ': 'الأسئلة الشائعة عن المنتج',
  'Clear answers before you choose a plan': 'إجابات واضحة قبل اختيار الخطة',
  'What type of product is this?': 'ما نوع هذا المنتج؟',
  'When do I get access?': 'متى أحصل على الوصول؟',
  'How does pricing work?': 'كيف يعمل التسعير؟',
  'What limits apply?': 'ما الحدود المطبقة؟',
  'Where do I find the product after purchase?': 'أين أجد المنتج بعد الشراء؟',
  'How do I get support?': 'كيف أحصل على الدعم؟',
  'This is an account-based SaaS workspace inside SUMMECA. It is not delivered as a ZIP download.':
    'هذا المنتج مساحة عمل SaaS داخل حساب SUMMECA، ولا يتم تسليمه كملف ZIP قابل للتنزيل.',
  'Access is unlocked in the SUMMECA account used at checkout only after the current server-side payment verification flow confirms payment.':
    'يتم فتح الوصول في حساب SUMMECA المستخدم عند الدفع فقط بعد أن يؤكد مسار التحقق الحالي على الخادم نجاح الدفع.',
  'The active plan cards show the current price, currency and access period used by checkout. Recurring billing applies only when checkout explicitly states that a recurring agreement is being created.':
    'تعرض بطاقات الخطط النشطة السعر والعملة ومدة الوصول المستخدمة في الدفع. ولا تكون الفوترة متكررة إلا عندما يوضح الدفع صراحةً أنه سيتم إنشاء اتفاق فوترة متكررة.',
  'Limits vary by active plan. Review the Plans and limits section above for the exact features and limits attached to each currently published plan.':
    'تختلف الحدود حسب الخطة النشطة. راجع قسم الخطط والحدود أعلاه لمعرفة الميزات والحدود الدقيقة لكل خطة منشورة حاليًا.',
  'After verified purchase, open your SUMMECA account and dashboard. The product is available there according to the existing entitlement rules.':
    'بعد تأكيد الشراء، افتح حساب SUMMECA ولوحة التحكم. سيظهر المنتج هناك وفق قواعد الوصول الحالية.',
  'Use the SUMMECA support page if you need help with access or the product.':
    'استخدم صفحة دعم SUMMECA إذا احتجت مساعدة في الوصول أو استخدام المنتج.',
  'LeadFollow AI generates a draft for review and editing. It is not sent before the user explicitly confirms the send action.':
    'ينشئ LeadFollow AI مسودة للمراجعة والتعديل، ولا يتم إرسالها قبل أن يؤكد المستخدم الإرسال صراحةً.',
  'InvoiceFlow supports the current client, invoice, line-item, tax, notes, terms, PDF/share and status workflow shown on this page.':
    'يدعم InvoiceFlow سير العمل الحالي للعملاء والفواتير وبنود الفاتورة والضرائب والملاحظات والشروط وPDF/المشاركة وحالة الفاتورة كما هو موضح في هذه الصفحة.',
  Support: 'الدعم',
};

function demoVideoFor(slug: string) {
  if (slug !== 'summeca-invoiceflow' && slug !== 'summeca-leadfollow-ai') return null;
  const url = DEMO_VIDEO_BY_SLUG[slug];
  if (!url) return null;
  return url.startsWith('/') || url.startsWith('https://') ? url : null;
}

function safePrice(plan: SaasSalesPlan) {
  try {
    return getEffectivePrice(plan);
  } catch {
    const regularPrice = Number(plan.price) || 0;
    return {
      regularPrice,
      salePrice: null,
      finalPrice: regularPrice,
      discountAmount: 0,
      discountPercent: 0,
      onSale: false,
    };
  }
}

function money(value: number, currency: string) {
  if (value === 0) return 'Free';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency || 'USD'} ${value % 1 === 0 ? value : value.toFixed(2)}`;
  }
}

function activeSortedPlans(plans: SaasSalesPlan[]) {
  return plans.filter((plan) => plan.is_active).sort((a, b) => a.sort_order - b.sort_order);
}

function startingPlan(plans: SaasSalesPlan[]) {
  const active = activeSortedPlans(plans);
  if (!active.length) return null;
  return active.reduce((lowest, plan) =>
    safePrice(plan).finalPrice < safePrice(lowest).finalPrice ? plan : lowest,
  );
}

function RealProductPreview({ product }: { product: SaasSalesProduct }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const demoVideoUrl = demoVideoFor(product.slug);

  useEffect(() => {
    setImageFailed(false);
    setVideoFailed(false);
    setPlaying(false);
    if (!product.thumbnail_url && !demoVideoUrl) {
      setTarget(null);
      return;
    }

    setTarget(document.getElementById('product-preview'));
  }, [product.slug, product.thumbnail_url, demoVideoUrl]);

  if (!target) return null;

  const showVideo = Boolean(demoVideoUrl && !videoFailed);
  const showImage = Boolean(product.thumbnail_url && !imageFailed);
  if (!showVideo && !showImage) return null;

  const playVideo = () => {
    const node = videoRef.current;
    if (!node) return;
    void node.play();
  };

  return createPortal(
    <>
      <style>{`#product-preview > div:not([data-real-product-preview="true"]) { display: none !important; }`}</style>
      <div
        data-real-product-preview="true"
        className="overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-2xl shadow-primary/10 transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-primary/15 motion-reduce:transform-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/30 px-4 py-3 sm:px-5">
          <span className="text-xs font-bold text-foreground">{product.name}</span>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {showVideo && (
              <span className="text-[10px] font-semibold text-muted-foreground sm:text-[11px]">
                15-second real product walkthrough
              </span>
            )}
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary sm:text-[11px]">
              {showVideo ? 'REAL PRODUCT DEMO' : 'ACTUAL PRODUCT'}
            </span>
          </div>
        </div>
        {showVideo ? (
          <div className="relative aspect-video overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={demoVideoUrl ?? undefined}
              poster={product.thumbnail_url ?? undefined}
              controls={playing}
              muted
              loop
              playsInline
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => setVideoFailed(true)}
              className="h-full w-full object-contain"
              aria-label={`${product.name} real product demo, 15 seconds`}
            />
            {!playing && (
              <button
                type="button"
                onClick={playVideo}
                aria-label={`Play ${product.name} 15-second demo`}
                className="group absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary"
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/25 bg-white/95 text-slate-950 shadow-2xl transition duration-200 group-hover:scale-105 motion-reduce:transform-none">
                  <Play size={32} className="ml-1 fill-current" aria-hidden="true" />
                </span>
              </button>
            )}
            {!playing && (
              <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-[11px] font-bold text-white">
                0:15
              </span>
            )}
          </div>
        ) : (
          <img
            src={product.thumbnail_url ?? undefined}
            alt={`${product.name} actual product screenshot`}
            loading="eager"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="block h-auto w-full bg-white object-contain object-top"
          />
        )}
      </div>
    </>,
    target,
  );
}

function ProductFaq({ product, target }: { product: SaasSalesProduct; target: HTMLElement | null }) {
  const { isArabic, t } = useLanguage();
  const localize = (value: string) => (isArabic ? STAGE5_AR[value] ?? t(value) : value);

  if (!target) return null;

  const productSpecific =
    product.slug === 'summeca-leadfollow-ai'
      ? 'LeadFollow AI generates a draft for review and editing. It is not sent before the user explicitly confirms the send action.'
      : 'InvoiceFlow supports the current client, invoice, line-item, tax, notes, terms, PDF/share and status workflow shown on this page.';

  const faq = [
    {
      question: 'What type of product is this?',
      answer:
        'This is an account-based SaaS workspace inside SUMMECA. It is not delivered as a ZIP download.',
    },
    {
      question: 'When do I get access?',
      answer:
        'Access is unlocked in the SUMMECA account used at checkout only after the current server-side payment verification flow confirms payment.',
    },
    {
      question: 'How does pricing work?',
      answer:
        'The active plan cards show the current price, currency and access period used by checkout. Recurring billing applies only when checkout explicitly states that a recurring agreement is being created.',
    },
    {
      question: 'What limits apply?',
      answer:
        'Limits vary by active plan. Review the Plans and limits section above for the exact features and limits attached to each currently published plan.',
    },
    {
      question: 'Where do I find the product after purchase?',
      answer:
        'After verified purchase, open your SUMMECA account and dashboard. The product is available there according to the existing entitlement rules.',
    },
    {
      question: 'How do I get support?',
      answer: 'Use the SUMMECA support page if you need help with access or the product.',
    },
  ];

  return createPortal(
    <section data-stage5-product-faq className="border-t border-border bg-secondary/10">
      <div className="mx-auto max-w-screen-xl px-6 py-14 lg:px-8 lg:py-18">
        <div className="mx-auto max-w-3xl">
          <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {localize('Product FAQ')}
          </p>
          <h2 className="mt-2 text-center text-3xl font-black tracking-tight text-foreground">
            {localize('Clear answers before you choose a plan')}
          </h2>
          <div className="mt-8 rounded-2xl border border-primary/15 bg-primary/[0.035] p-4 text-sm leading-6 text-secondary-foreground sm:p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <p>{localize(productSpecific)}</p>
            </div>
          </div>
          <div className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {faq.map((item) => (
              <details key={item.question} className="group p-5 open:bg-secondary/20 sm:p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                  <span>{localize(item.question)}</span>
                  <ChevronDown
                    size={17}
                    aria-hidden="true"
                    className="shrink-0 text-primary transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <p className="mt-3 pr-7 text-sm leading-6 text-muted-foreground rtl:pl-7 rtl:pr-0">
                  {localize(item.answer)}
                </p>
                {item.question === 'How do I get support?' && (
                  <Link
                    href="/support"
                    className="mt-3 inline-flex min-h-10 items-center font-bold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {localize('Support')}
                  </Link>
                )}
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>,
    target,
  );
}

function StickyPurchaseBar({ product, plans }: { product: SaasSalesProduct; plans: SaasSalesPlan[] }) {
  const { isArabic, t } = useLanguage();
  const activePlans = useMemo(() => activeSortedPlans(plans), [plans]);
  const cheapest = useMemo(() => startingPlan(activePlans), [activePlans]);
  const [selectedPlanId, setSelectedPlanId] = useState(cheapest?.id ?? activePlans[0]?.id ?? '');
  const [pastHero, setPastHero] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    setSelectedPlanId(cheapest?.id ?? activePlans[0]?.id ?? '');
  }, [cheapest?.id, activePlans]);

  useEffect(() => {
    const hero = document.querySelector('.summeca-saas-sales-shell main > section:first-of-type');
    const footer = document.querySelector('.summeca-saas-sales-shell footer');
    if (!hero || typeof IntersectionObserver === 'undefined') return;

    const heroObserver = new IntersectionObserver(([entry]) => {
      setPastHero(!entry.isIntersecting && entry.boundingClientRect.bottom < 80);
    });
    heroObserver.observe(hero);

    const footerObserver = footer
      ? new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), { threshold: 0.05 })
      : null;
    if (footer && footerObserver) footerObserver.observe(footer);

    return () => {
      heroObserver.disconnect();
      footerObserver?.disconnect();
    };
  }, []);

  const selectedPlan = activePlans.find((plan) => plan.id === selectedPlanId) ?? cheapest;
  if (!selectedPlan || !pastHero || footerVisible) return null;

  const pricing = safePrice(selectedPlan);
  const localize = (value: string) => (isArabic ? STAGE5_AR[value] ?? t(value) : value);
  const checkoutHref = `/checkout?product_id=${encodeURIComponent(product.id)}&plan_id=${encodeURIComponent(selectedPlan.id)}`;

  return (
    <aside
      data-stage5-sticky-cta
      aria-label={`${product.name} purchase options`}
      className="fixed inset-x-3 z-40 mx-auto max-w-4xl rounded-2xl border border-primary/25 bg-card/95 p-3 shadow-2xl shadow-black/20 backdrop-blur-md sm:p-4 lg:inset-x-auto lg:left-1/2 lg:w-[min(56rem,calc(100vw-2rem))] lg:-translate-x-1/2"
      style={{ bottom: 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 4.75rem))' }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-foreground sm:text-sm">{product.name}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2" dir="ltr">
            <span className="text-lg font-black text-foreground sm:text-xl">
              {money(pricing.finalPrice, selectedPlan.currency)}
            </span>
            {pricing.onSale && (
              <span className="text-xs text-muted-foreground line-through">
                {money(pricing.regularPrice, selectedPlan.currency)}
              </span>
            )}
            <span className="text-[11px] font-semibold text-muted-foreground">
              {selectedPlan.currency || 'USD'} · {localize('Account-based SaaS')}
            </span>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {activePlans.length > 1 && (
            <label className="min-w-0 flex-1 sm:w-44 sm:flex-none">
              <span className="sr-only">{localize('Choose plan')}</span>
              <select
                value={selectedPlan.id}
                onChange={(event) => setSelectedPlanId(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={localize('Choose plan')}
              >
                {activePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Link
            href={checkoutHref}
            className="btn-primary inline-flex min-h-11 shrink-0 items-center justify-center px-4 text-sm font-black sm:px-5"
          >
            {localize('Buy now')}
          </Link>
        </div>
      </div>
    </aside>
  );
}

export default function SaasProductSalesExperience({
  product,
  plans,
}: {
  product: SaasSalesProduct;
  plans: SaasSalesPlan[];
}) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [mainTarget, setMainTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMainTarget(shellRef.current?.querySelector('main') ?? null);
  }, [product.slug]);

  return (
    <div ref={shellRef} className="summeca-saas-sales-shell">
      <style>{`
        .summeca-saas-sales-shell main {
          padding-top: 70px !important;
        }

        @media (max-width: 639px) {
          .summeca-saas-sales-shell main > section:first-of-type > div.relative {
            padding-top: 1rem;
            padding-bottom: 1.75rem;
          }

          .summeca-saas-sales-shell #product-preview {
            margin-top: 0.25rem;
          }
        }

        @media (min-width: 1024px) {
          .summeca-saas-sales-shell main > section:first-of-type > div.relative {
            align-items: start;
            gap: 2rem;
            padding-top: 1.5rem;
            padding-bottom: 2.25rem;
          }

          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(2) {
            margin-top: 0.7rem;
          }

          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(3) {
            margin-top: 0.55rem;
            font-size: clamp(2.55rem, 4vw, 3.55rem);
            line-height: 1.02;
          }

          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(4),
          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(5),
          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(6),
          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(8),
          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(9) {
            margin-top: 0.8rem;
          }

          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(5) {
            padding: 0.8rem 0.9rem;
          }

          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(5) ul {
            margin-top: 0.55rem;
          }

          .summeca-saas-sales-shell #product-preview {
            align-self: start;
            margin-top: 0.25rem;
          }

          .summeca-saas-sales-shell [data-stage5-sticky-cta] {
            bottom: 1rem !important;
          }
        }
      `}</style>
      <BaseSaasProductSalesExperience product={product} plans={plans} />
      <RealProductPreview product={product} />
      <ProductFaq product={product} target={mainTarget} />
      <StickyPurchaseBar product={product} plans={plans} />
    </div>
  );
}
