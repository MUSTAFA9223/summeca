'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Package, ShieldCheck } from 'lucide-react';
import PricingPaymentMethods from '@/components/catalog/PricingPaymentMethods';
import PricingRefundFaq from '@/components/catalog/PricingRefundFaq';
import { useLanguage } from '@/contexts/LanguageContext';
import { getEffectivePrice } from '@/lib/pricing';
import type { PublicCatalogPlan, PublicCatalogProduct } from '@/lib/catalog/publicCatalog';

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  ai_tool: { en: 'AI Workflow', ar: 'سير عمل بالذكاء الاصطناعي' },
  api: { en: 'Developer Tool', ar: 'أداة للمطورين' },
  plugin: { en: 'Extension', ar: 'إضافة' },
  template: { en: 'Business Template', ar: 'قالب أعمال' },
  dataset: { en: 'Digital Kit', ar: 'حزمة رقمية' },
  course: { en: 'Digital Kit', ar: 'حزمة رقمية' },
  saas: { en: 'Business SaaS', ar: 'خدمة أعمال SaaS' },
  saas_app: { en: 'Business SaaS', ar: 'خدمة أعمال SaaS' },
  other: { en: 'Digital Kit', ar: 'حزمة رقمية' },
};

function categoryLabel(category: string, isArabic: boolean) {
  const labels = CATEGORY_LABELS[category] ?? { en: 'Digital Product', ar: 'منتج رقمي' };
  return isArabic ? labels.ar : labels.en;
}

function pricingFor(plan: PublicCatalogPlan) {
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

function money(value: number, currency: string, isArabic: boolean) {
  if (value === 0) return isArabic ? 'مجاني' : 'Free';
  try {
    return new Intl.NumberFormat(isArabic ? 'ar' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency || 'USD'} ${value % 1 === 0 ? value : value.toFixed(2)}`;
  }
}

function paymentLabel(period: PublicCatalogPlan['billing_period'], isArabic: boolean) {
  if (period === 'one_time' || period === 'lifetime') {
    return isArabic ? 'دفعة واحدة' : 'One-time payment';
  }
  if (period === 'monthly') return isArabic ? 'فترة شهرية' : 'Monthly period';
  return isArabic ? 'فترة سنوية' : 'Yearly period';
}

function accessLabel(period: PublicCatalogPlan['billing_period'], isArabic: boolean) {
  if (period === 'monthly') return isArabic ? 'شهر واحد' : '1 month';
  if (period === 'yearly') return isArabic ? 'سنة واحدة' : '1 year';
  if (period === 'lifetime') return isArabic ? 'مدى الحياة' : 'Lifetime';
  return isArabic ? 'غير محددة في بيانات الخطة' : 'Not specified in plan data';
}

function suffix(period: PublicCatalogPlan['billing_period']) {
  if (period === 'monthly') return '/mo';
  if (period === 'yearly') return '/yr';
  return '';
}

function planGridClass(planCount: number) {
  if (planCount <= 1) return 'mx-auto w-full max-w-3xl grid-cols-1';
  if (planCount === 2) return 'mx-auto w-full max-w-5xl md:grid-cols-2';
  return 'w-full md:grid-cols-2 xl:grid-cols-3';
}

function discountLabel(
  discountAmount: number,
  discountPercent: number,
  currency: string,
  isArabic: boolean
) {
  const amount = money(discountAmount, currency, isArabic);
  const percent = Number.isInteger(discountPercent)
    ? discountPercent.toFixed(0)
    : discountPercent.toFixed(1);
  return isArabic ? `وفّر ${amount} (${percent}٪)` : `Save ${amount} (${percent}%)`;
}

export default function PricingCatalogView({ products }: { products: PublicCatalogProduct[] }) {
  const { isArabic } = useLanguage();

  return (
    <main className="min-h-[70vh] overflow-x-clip bg-background pt-[68px]">
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            {isArabic ? 'أسعار واضحة' : 'Transparent Pricing'}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-5xl">
            {isArabic ? 'اختر الأداة المناسبة وشاهد السعر أولًا.' : 'Pick the tool you need. See the price first.'}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {isArabic
              ? 'الأسعار أدناه تأتي مباشرة من خطط SUMMECA النشطة في الإنتاج، دون فئات تجريبية أو أسعار مؤقتة.'
              : 'Prices below come directly from active SUMMECA production plans, with no placeholder tiers or temporary pricing.'}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        {products.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-7 text-center sm:p-12">
            <Package className="mx-auto text-primary" size={32} />
            <h2 className="mt-4 text-2xl font-bold text-foreground">
              {isArabic ? 'الأسعار غير متاحة مؤقتًا' : 'Pricing is temporarily unavailable'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {isArabic
                ? 'تعذر تحميل كتالوج الإنتاج النشط. تبقى صفحات المنتجات هي المصدر المرجعي للعروض المتاحة حاليًا.'
                : 'We could not load the active production catalog. Product pages remain the source of truth for currently available offers.'}
            </p>
            <Link href="/products" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline">
              {isArabic ? 'فتح كتالوج المنتجات' : 'Open product catalog'} <ArrowRight className="rtl:rotate-180" size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-8 lg:space-y-10">
            {products.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                <div className="border-b border-border bg-secondary/20 p-5 sm:p-6 lg:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                        {categoryLabel(product.category, isArabic)}
                      </p>
                      <h2 className="mt-1 break-words text-2xl font-bold text-foreground sm:text-3xl">{product.name}</h2>
                      {product.short_desc && (
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                          {product.short_desc}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/products/${product.slug}`}
                      className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start text-sm font-semibold text-primary hover:underline sm:self-auto"
                    >
                      {isArabic ? 'تفاصيل المنتج' : 'Product details'} <ArrowRight className="rtl:rotate-180" size={14} />
                    </Link>
                  </div>
                </div>

                <div className="p-4 sm:p-6 lg:p-8">
                  <div className={`grid gap-5 ${planGridClass(product.plans.length)}`}>
                    {product.plans.map((plan) => {
                      const pricing = pricingFor(plan);
                      const checkoutHref = `/checkout?product_id=${encodeURIComponent(product.id)}&plan_id=${encodeURIComponent(plan.id)}`;

                      return (
                        <div key={plan.id} className="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6">
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {product.name}
                              </p>
                              <h3 className="mt-1 break-words text-lg font-bold text-foreground">{plan.name}</h3>
                            </div>
                            {pricing.onSale && pricing.discountAmount > 0 && (
                              <span className="max-w-[12rem] shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-center text-xs font-bold text-success">
                                {discountLabel(pricing.discountAmount, pricing.discountPercent, plan.currency, isArabic)}
                              </span>
                            )}
                          </div>

                          <div className="mt-5">
                            {pricing.onSale && (
                              <div className="text-sm text-muted-foreground line-through">
                                {money(pricing.regularPrice, plan.currency, isArabic)}
                              </div>
                            )}
                            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                              <span className="text-3xl font-black text-foreground sm:text-4xl">
                                {money(pricing.finalPrice, plan.currency, isArabic)}
                              </span>
                              {pricing.finalPrice > 0 && suffix(plan.billing_period) && (
                                <span className="text-sm font-normal text-muted-foreground" dir="ltr">
                                  {suffix(plan.billing_period)}
                                </span>
                              )}
                            </div>
                          </div>

                          <dl className="mt-5 grid grid-cols-1 gap-2 rounded-xl border border-border/70 bg-secondary/20 p-3 text-sm sm:grid-cols-3 sm:gap-3">
                            <div>
                              <dt className="text-xs font-semibold text-muted-foreground">{isArabic ? 'العملة' : 'Currency'}</dt>
                              <dd className="mt-0.5 font-semibold text-foreground" dir="ltr">{(plan.currency || 'USD').toUpperCase()}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold text-muted-foreground">{isArabic ? 'الدفع' : 'Payment'}</dt>
                              <dd className="mt-0.5 font-semibold text-foreground">{paymentLabel(plan.billing_period, isArabic)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold text-muted-foreground">{isArabic ? 'مدة الوصول' : 'Access duration'}</dt>
                              <dd className="mt-0.5 font-semibold text-foreground">{accessLabel(plan.billing_period, isArabic)}</dd>
                            </div>
                          </dl>

                          {plan.description && (
                            <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground" title={plan.description}>
                              {plan.description}
                            </p>
                          )}

                          {(plan.features?.length ?? 0) > 0 && (
                            <ul className="mt-5 space-y-2.5">
                              {(plan.features ?? []).slice(0, 8).map((feature) => (
                                <li key={feature} className="flex items-start gap-2 text-sm text-secondary-foreground">
                                  <CheckCircle2 className="mt-0.5 shrink-0 text-primary" size={14} />
                                  <span className="break-words">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="mt-auto grid gap-2 pt-6">
                            <Link href={checkoutHref} className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 px-4 text-center text-sm">
                              {isArabic ? `متابعة مع ${plan.name}` : `Continue with ${plan.name}`} <ArrowRight className="rtl:rotate-180" size={14} />
                            </Link>
                            <Link href={`/products/${product.slug}`} className="flex min-h-11 w-full items-center justify-center text-center text-sm font-semibold text-primary hover:underline">
                              {isArabic ? 'مراجعة تفاصيل المنتج' : 'Review product details'}
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-6 text-secondary-foreground">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={18} />
            <p>
              {isArabic
                ? 'تعرض SUMMECA فترة الخطة المسجلة فقط. لا يُعتبر الاشتراك متجددًا تلقائيًا إلا إذا أوضح Checkout ومزوّد الدفع صراحةً إنشاء اتفاق فوترة متكررة. لا يُمنح الوصول المدفوع إلا بعد تحقق الخادم من عملية الدفع.'
                : 'SUMMECA shows the plan period stored in production. Automatic renewal applies only when checkout and the payment provider explicitly state that a recurring billing agreement is being created. Paid access is granted only after the server verifies the transaction.'}
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label={isArabic ? 'الأسئلة الشائعة عن الأسعار' : 'Pricing frequently asked questions'}>
          <article className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-black text-foreground">
              {isArabic ? 'ما طرق الدفع المتاحة؟' : 'Which payment methods can I use?'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isArabic
                ? 'نعرض هنا فقط مزوّدي الدفع الذين تؤكد نقاط حالة الإنتاج أنهم متاحون فعليًا الآن.'
                : 'Only providers whose production status endpoints confirm they are live and available are shown here.'}
            </p>
            <PricingPaymentMethods />
          </article>
          <article className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-black text-foreground">{isArabic ? 'متى أحصل على الوصول؟' : 'When do I get access?'}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isArabic
                ? 'يُمنح الوصول بعد اكتمال الطلب، وللطلبات المدفوعة بعد أن تتحقق SUMMECA من الدفع على الخادم. مدة الوصول المعروضة في كل خطة مأخوذة من فترة الخطة المسجلة.'
                : 'Access is released after the order completes and, for paid orders, after SUMMECA verifies payment server-side. Any duration shown on a plan comes from its stored plan period.'}
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-black text-foreground">{isArabic ? 'كيف يتم التسليم؟' : 'How is delivery handled?'}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isArabic
                ? 'راجع تفاصيل المنتج قبل الدفع لمعرفة ما إذا كان الوصول يتم داخل حساب SUMMECA أو عبر تسليم رقمي محمي بعد التحقق من الطلب.'
                : 'Review the product details before checkout to see whether access opens inside your SUMMECA account or uses protected digital delivery after order verification.'}
            </p>
          </article>
          <PricingRefundFaq />
        </div>
      </section>
    </main>
  );
}
