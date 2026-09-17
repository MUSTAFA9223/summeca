'use client';

import React from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

export default function NotFound() {
  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history?.back();
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4" aria-labelledby="not-found-title">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center" aria-hidden="true">
          <div className="relative text-9xl font-bold text-primary opacity-20">404</div>
        </div>

        <h1 id="not-found-title" className="mb-2 text-2xl font-medium text-foreground">Page Not Found</h1>
        <p className="mb-8 text-muted-foreground">
          The page you're looking for doesn't exist. Let's get you back!
        </p>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
          >
            <Icon name="ArrowLeftIcon" size={16} />
            Go Back
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 font-medium text-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
          >
            <Icon name="HomeIcon" size={16} />
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
