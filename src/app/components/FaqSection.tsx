'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    id: 'products',
    question: 'What types of products does SUMMECA offer?',
    answer: 'SUMMECA publishes AI tools, SaaS applications, templates, datasets, and other digital products. Only products with an active production offer appear in the public catalog.',
  },
  {
    id: 'delivery',
    question: 'How does product access work after checkout?',
    answer: 'Paid access is granted after the payment provider confirms the transaction server-side. Free offers are completed through the protected order flow. Downloads appear in your dashboard only when the purchased product includes a configured download entitlement.',
  },
  {
    id: 'payments',
    question: 'Which payment methods can I use?',
    answer: 'The checkout page shows the payment methods that are configured and available at that moment. SUMMECA does not advertise a payment processor as available when it is only in test mode or is not configured for production.',
  },
  {
    id: 'ai',
    question: 'How are SUMMECA AI features powered?',
    answer: 'AI features use the providers configured for the specific SUMMECA service. Provider and model availability can change, so the site does not promise a specific third-party model unless that product explicitly states it.',
  },
];

export default function FaqSection() {
  const [openId, setOpenId] = useState<string | null>('products');

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-screen-xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-3 py-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">FAQ</span>
            </div>
            <h2 className="text-3xl font-extrabold text-foreground">Frequently asked questions</h2>
            <p className="mt-3 text-sm text-secondary-foreground">Practical answers based on the production storefront.</p>
          </div>

          <div className="space-y-2.5">
            {faqs.map((faq) => {
              const open = openId === faq.id;
              return (
                <div key={faq.id} className={`overflow-hidden rounded-2xl border transition ${open ? 'border-primary/25 bg-primary/5' : 'border-border bg-white hover:border-primary/20'}`}>
                  <button className="flex w-full items-center justify-between px-6 py-4 text-left" onClick={() => setOpenId(open ? null : faq.id)}>
                    <span className={`pr-4 text-sm font-semibold ${open ? 'text-primary' : 'text-foreground'}`}>{faq.question}</span>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${open ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                      <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {open && <div className="px-6 pb-5"><p className="text-sm leading-7 text-secondary-foreground">{faq.answer}</p></div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
