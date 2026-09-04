import React from 'react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import HeroSection from '@/app/components/HeroSection';
import FeaturedProducts from '@/app/components/FeaturedProducts';
import CategoryShowcase from '@/app/components/CategoryShowcase';
import HowItWorks from '@/app/components/HowItWorks';
import PricingSection from '@/app/components/PricingSection';
import FaqSection from '@/app/components/FaqSection';
import FinalCta from '@/app/components/FinalCta';
import HomepagePersonalization from '@/app/components/HomepagePersonalization';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main>
        <HeroSection />
        <FeaturedProducts />
        <HomepagePersonalization />
        <CategoryShowcase />
        <HowItWorks />
        <PricingSection />
        <FaqSection />
        <FinalCta />
      </main>
      <PublicFooter />
    </div>
  );
}