'use client';

import Link from 'next/link';
import { CheckCircle2, CreditCard, LifeBuoy, PackageCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const STEP_ICONS = [PackageCheck, CreditCard, CheckCircle2] as const;

export default function HomepagePurchaseGuide() {
  const { isArabic } = useLanguage();

  const steps = isArabic
    ? [
        {
          title: 'اختر المنتج المناسب',
          text: 'راجع المعاينة الحقيقية ونوع المنتج والسعر الحالي قبل المتابعة.',
        },
        {
          title: 'أكمل الدفع المؤكد',
          text: 'تعرض صفحة الدفع وسائل الدفع المتاحة فعليًا، ويُتحقق من الطلب على الخادم.',
        },
        {
          title: 'افتح المنتج داخل حساب SUMMECA',
          text: 'تظهر تطبيقات SaaS داخل حسابك، بينما تستخدم المنتجات الرقمية المؤهلة تسليمًا محميًا.',
        },
      ]
    : [
        {
          title: 'Choose a product',
          text: 'Review the real preview, product type, and current price before you continue.',
        },
        {
          title: 'Complete verified checkout',
          text: 'Checkout shows currently available payment methods and the order is verified server-side.',
        },
        {
          title: 'Open it in your SUMMECA account',
          text: 'SaaS tools open from your account, while eligible digital products use protected delivery.',
        },
      ];

  const faqs = isArabic
    ? [
        {
          question: 'هل المنتج SaaS أم ملف تنزيل؟',
          answer: 'InvoiceFlow وLeadFollow AI يعملان داخل حساب SUMMECA وليسا ملفات ZIP. أما بعض الحزم والمنتجات الرقمية فتستخدم تنزيلًا محميًا، ويظهر نوع التسليم في صفحة المنتج قبل الدفع.',
        },
        {
          question: 'متى أحصل على الوصول؟',
          answer: 'يُمنح الوصول بعد إكمال الطلب، وللطلبات المدفوعة بعد تحقق SUMMECA من حالة الدفع على الخادم.',
        },
        {
          question: 'هل السعر مرة واحدة أم اشتراك؟',
          answer: 'تعرض كل خطة نوع الفوترة بوضوح. لا ينطبق التجديد التلقائي إلا إذا أوضحت صفحة الدفع ومزود الدفع صراحةً إنشاء دفعات متكررة.',
        },
        {
          question: 'أين أجد المنتج بعد الشراء؟',
          answer: 'تظل الطلبات وصلاحيات الوصول مرتبطة بحساب SUMMECA الذي أجرى الشراء، ويظهر نوع الوصول أو التسليم للمنتج قبل الدفع.',
        },
        {
          question: 'ما وسائل الدفع المتاحة؟',
          answer: 'تعرض صفحة المنتج والدفع فقط وسائل الدفع المفعلة والمتاحة حاليًا للعرض المحدد.',
        },
        {
          question: 'كيف أتواصل مع الدعم؟',
          answer: 'استخدم صفحة الدعم في SUMMECA لأي سؤال عن الطلب أو الوصول إلى المنتج.',
        },
      ]
    : [
        {
          question: 'Is this SaaS or a download?',
          answer: 'InvoiceFlow and LeadFollow AI run inside your SUMMECA account and are not ZIP downloads. Some digital kits use protected downloads, and the delivery type is shown on the product page before checkout.',
        },
        {
          question: 'When do I get access?',
          answer: 'Access is released after the order is completed and, for paid orders, after SUMMECA verifies the payment state on the server.',
        },
        {
          question: 'Is the price one-time or recurring?',
          answer: 'Each plan shows its billing type clearly. Automatic renewal applies only when checkout and the payment provider explicitly state that recurring billing is being created.',
        },
        {
          question: 'Where do I find the product after purchase?',
          answer: 'Orders and eligible access stay linked to the SUMMECA account used for the purchase, with the delivery or access type shown before checkout.',
        },
        {
          question: 'Which payment methods are available?',
          answer: 'The product page and checkout show only payment methods that are currently enabled and available for the selected offer.',
        },
        {
          question: 'How do I contact support?',
          answer: 'Use the SUMMECA support page for help with an order or product access.',
        },
      ];

  return (
    <>
      <section className="border-y border-border bg-secondary/20" aria-labelledby="how-it-works-title">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:py-14">
          <div className="max-w-2xl">
            <p className="text-[11px] font-800 uppercase tracking-[0.18em] text-primary">
              {isArabic ? 'ثلاث خطوات واضحة' : 'Three clear steps'}
            </p>
            <h2 id="how-it-works-title" className="mt-2 text-2xl font-800 tracking-tight text-foreground sm:text-3xl">
              {isArabic ? 'كيف يعمل الشراء والوصول' : 'How it works'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {isArabic
                ? 'اعرف ما ستحصل عليه وطريقة الوصول قبل إكمال الطلب.'
                : 'Know what you will receive and how access works before you complete an order.'}
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = STEP_ICONS[index];
              return (
                <article key={step.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={18} />
                    </span>
                    <span className="text-xs font-800 text-muted-foreground">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 text-base font-800 text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 sm:py-14" aria-labelledby="homepage-faq-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-800 uppercase tracking-[0.18em] text-primary">
              {isArabic ? 'قبل أن تشتري' : 'Before you buy'}
            </p>
            <h2 id="homepage-faq-title" className="mt-2 text-2xl font-800 tracking-tight text-foreground sm:text-3xl">
              {isArabic ? 'أسئلة شائعة مختصرة' : 'Quick answers'}
            </h2>
          </div>
          <Link href="/support" className="inline-flex min-h-10 items-center gap-2 self-start text-sm font-700 text-primary hover:underline sm:self-auto">
            <LifeBuoy size={15} /> {isArabic ? 'فتح الدعم' : 'Open support'}
          </Link>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {faqs.map((faq) => (
            <article key={faq.question} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-800 text-foreground">{faq.question}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
