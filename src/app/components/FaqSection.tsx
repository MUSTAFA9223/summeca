'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    id: 'faq-01',
    question: 'What types of products does SUMMECA offer?',
    answer: 'SUMMECA offers three product categories: AI Tools (intelligent automation for writing, analysis, and business tasks), SaaS Applications (cloud-based software subscriptions), and Digital Products (templates, planners, and prompt packs available as one-time purchases).',
  },
  {
    id: 'faq-04',
    question: 'How do digital product downloads work?',
    answer: 'After purchasing a digital product, it appears in your Downloads section. Download links are securely generated and tied to your account. You can re-download purchased files at any time from your dashboard.',
  },
  {
    id: 'faq-05',
    question: 'What AI providers power the tools?',
    answer: 'SUMMECA uses an AI gateway that abstracts across multiple providers including OpenAI, Anthropic, and Google. This means tools can route to the best model for each task without you needing to manage individual API keys.',
  },
];

export default function FaqSection() {
  const [openId, setOpenId] = useState<string | null>('faq-01');

  return (
    <section className="py-24 bg-white">
      <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 mb-4">
              <span className="text-xs font-600 text-primary uppercase tracking-wider">FAQ</span>
            </div>
            <h2 className="text-3xl font-800 text-foreground mb-3">
              Frequently asked questions
            </h2>
            <p className="text-secondary-foreground text-sm">
              Everything you need to know about SUMMECA.
            </p>
          </div>

          <div className="space-y-2.5">
            {faqs?.map((faq) => {
              const isOpen = openId === faq?.id;
              return (
                <div
                  key={faq?.id}
                  className={`rounded-2xl border transition-all duration-250 overflow-hidden ${
                    isOpen
                      ? 'border-primary/25 bg-gradient-to-br from-primary/4 to-accent/3 shadow-card'
                      : 'border-border bg-white hover:border-primary/20 hover:shadow-card'
                  }`}
                >
                  <button
                    className="w-full flex items-center justify-between px-6 py-4 text-left"
                    onClick={() => setOpenId(isOpen ? null : faq?.id)}
                  >
                    <span className={`text-sm font-600 pr-4 ${isOpen ? 'text-primary' : 'text-foreground'}`}>
                      {faq?.question}
                    </span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      isOpen ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'
                    }`}>
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 fade-in">
                      <p className="text-sm text-secondary-foreground leading-relaxed">
                        {faq?.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
