'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PricingRefundFaq() {
  const { isArabic } = useLanguage();

  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-black text-foreground">
        {isArabic ? 'هل يمكنني طلب استرداد؟' : 'Can I request a refund?'}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {isArabic ? (
          <>
            تعتمد أهلية الاسترداد على المنتج، وحالة التسليم، وسبب الطلب، وطريقة الدفع، والقانون المطبق. راجع{' '}
            <Link href="/refunds" className="font-semibold text-primary underline-offset-4 hover:underline">
              سياسة الاسترداد
            </Link>{' '}
            قبل الشراء؛ تقديم الطلب لا يضمن الموافقة عليه.
          </>
        ) : (
          <>
            Refund eligibility depends on the product, delivery state, request reason, payment method, and applicable law. Review the{' '}
            <Link href="/refunds" className="font-semibold text-primary underline-offset-4 hover:underline">
              Refund Policy
            </Link>{' '}
            before purchase; submitting a request does not guarantee approval.
          </>
        )}
      </p>
    </article>
  );
}
