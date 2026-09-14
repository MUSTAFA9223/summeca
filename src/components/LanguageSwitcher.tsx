'use client';

import { Globe2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type LanguageSwitcherProps = {
  compact?: boolean;
  className?: string;
};

export default function LanguageSwitcher({ compact = false, className = '' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  const optionClass = (selected: boolean) =>
    `inline-flex items-center justify-center rounded-full text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
      compact ? 'h-8 min-w-8 px-2 text-[10px] font-extrabold' : 'h-9 px-3'
    } ${
      selected
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
    }`;

  return (
    <div
      data-i18n-skip
      data-language-switcher="true"
      data-active-language={language}
      dir="ltr"
      role="group"
      aria-label="English / العربية"
      className={`flex items-center gap-1 rounded-full border border-border bg-card/90 shadow-[0_14px_40px_rgba(2,8,23,.16)] backdrop-blur-xl ${
        compact ? 'p-1' : 'p-1.5'
      } ${className}`}
    >
      {!compact && (
        <span
          aria-hidden="true"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-primary"
        >
          <Globe2 size={15} />
        </span>
      )}

      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        aria-label="English"
        title="English"
        className={optionClass(language === 'en')}
      >
        EN
      </button>

      <button
        type="button"
        onClick={() => setLanguage('ar')}
        aria-pressed={language === 'ar'}
        aria-label="العربية"
        title="العربية"
        className={optionClass(language === 'ar')}
      >
        العربية
      </button>
    </div>
  );
}
