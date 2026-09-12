'use client';

import { Globe2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type LanguageSwitcherProps = {
  compact?: boolean;
  className?: string;
};

export default function LanguageSwitcher({ compact = false, className = '' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      data-i18n-skip
      dir="ltr"
      className={`inline-flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white/95 p-1 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-xl ${className}`}
      aria-label="English / العربية"
    >
      {!compact && <Globe2 size={14} className="mx-1 text-teal-600" aria-hidden="true" />}
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`rounded-lg px-2.5 py-1.5 transition ${language === 'en' ? 'bg-slate-950 text-white shadow-sm' : 'hover:bg-slate-100 hover:text-slate-950'}`}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('ar')}
        className={`rounded-lg px-2.5 py-1.5 transition ${language === 'ar' ? 'bg-teal-600 text-white shadow-sm' : 'hover:bg-teal-50 hover:text-teal-700'}`}
        aria-pressed={language === 'ar'}
      >
        العربية
      </button>
    </div>
  );
}
