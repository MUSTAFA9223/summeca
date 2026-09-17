'use client';

import type { MouseEvent } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SkipToContent() {
  const { language } = useLanguage();
  const label = language === 'ar' ? 'انتقل إلى المحتوى الرئيسي' : 'Skip to main content';

  const focusMain = (event: MouseEvent<HTMLAnchorElement>) => {
    const main = document.querySelector<HTMLElement>('main');
    if (!main) return;

    event.preventDefault();
    if (!main.id) main.id = 'main-content';
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: 'start' });
  };

  return (
    <a href="#main-content" className="skip-to-content" onClick={focusMain}>
      {label}
    </a>
  );
}
