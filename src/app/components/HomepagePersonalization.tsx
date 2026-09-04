'use client';

import React from 'react';
import RecommendedForYou from '@/components/RecommendedForYou';
import { RecentPurchaseToast, CustomerCountBadge } from '@/components/SocialProof';

export default function HomepagePersonalization() {
  return (
    <>
      {/* Recommended For You section */}
      <section className="py-16 bg-gradient-to-br from-[#F0FDFA] to-white border-y border-border">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
          <RecommendedForYou
            title="Recommended For You"
            subtitle="AI-powered picks based on your interests and activity"
            maxItems={4}
          />
          <div className="mt-6 flex justify-center">
            <CustomerCountBadge count={1200} />
          </div>
        </div>
      </section>

      {/* Social proof toast — renders globally */}
      <RecentPurchaseToast />
    </>
  );
}
