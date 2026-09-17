'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { useTheme, type SiteTheme } from '@/contexts/ThemeContext';

const OPTIONS: Array<{ value: SiteTheme; label: string; icon: typeof Moon }> = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`flex items-center gap-1 rounded-full border border-border bg-card/90 shadow-[0_14px_40px_rgba(2,8,23,.16)] backdrop-blur-xl ${compact ? 'p-1' : 'p-1.5'}`}
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
            aria-label={`${label} theme`}
            title={`${label} theme`}
            className={`inline-flex items-center justify-center rounded-full text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${compact ? 'h-8 w-8 p-0' : 'h-9 gap-2 px-3'} ${selected ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
          >
            <Icon size={14} />
            <span className={compact ? 'sr-only' : 'hidden sm:inline'}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function GlobalThemeSwitcher() {
  const pathname = usePathname();
  const [hasHostedSwitcher, setHasHostedSwitcher] = useState<boolean | null>(null);
  const isAuthSurface = Boolean(
    pathname?.startsWith('/sign-up-login-screen') ||
      pathname?.startsWith('/reset-password') ||
      pathname?.startsWith('/auth/'),
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHasHostedSwitcher(Boolean(document.querySelector('[data-theme-switcher-host="true"]')));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  if (hasHostedSwitcher !== false || isAuthSurface) return null;

  return (
    <div
      className="fixed bottom-2 left-2 z-[115] print:hidden sm:bottom-4 sm:left-4"
      style={{
        bottom: 'max(.5rem, env(safe-area-inset-bottom))',
        left: 'max(.5rem, env(safe-area-inset-left))',
      }}
    >
      <div className="sm:hidden"><ThemeSwitcher compact /></div>
      <div className="hidden sm:block"><ThemeSwitcher /></div>
    </div>
  );
}
