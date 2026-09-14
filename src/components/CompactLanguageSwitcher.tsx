'use client';

import { useLanguage } from '@/contexts/LanguageContext';

const OPTIONS = [
  { value: 'en' as const, label: 'EN', title: 'English' },
  { value: 'ar' as const, label: 'AR', title: 'العربية' },
];

export default function CompactLanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-border bg-card/90 p-1 shadow-[0_14px_40px_rgba(2,8,23,.16)] backdrop-blur-xl"
      role="group"
      aria-label="Language"
      data-i18n-skip
    >
      {OPTIONS.map(({ value, label, title }) => {
        const selected = language === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => setLanguage(value)}
            aria-pressed={selected}
            aria-label={title}
            title={title}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[10px] font-extrabold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              selected
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
