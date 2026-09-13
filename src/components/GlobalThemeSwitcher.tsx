'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme, type SiteTheme } from '@/contexts/ThemeContext';

const OPTIONS: Array<{ value: SiteTheme; label: string; icon: typeof Moon }> = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
];

export default function GlobalThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="fixed bottom-4 left-4 z-[115] flex items-center gap-1 rounded-full border border-border bg-card/90 p-1.5 shadow-[0_14px_40px_rgba(2,8,23,.16)] backdrop-blur-xl"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      role="group"
      aria-label="Color theme"
      data-i18n-skip
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={selected}
            title={`${label} theme`}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              selected
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
