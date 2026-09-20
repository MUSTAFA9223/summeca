'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type SiteTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'summeca:theme';
const THEME_COOKIE_KEY = 'summeca:theme';
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type ThemeContextValue = {
  theme: SiteTheme;
  setTheme: (theme: SiteTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isSiteTheme(value: string | null | undefined): value is SiteTheme {
  return value === 'dark' || value === 'light';
}

function applyTheme(theme: SiteTheme) {
  document.documentElement.dataset.siteTheme = theme;
  document.documentElement.style.colorScheme = theme;
}

function persistTheme(theme: SiteTheme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The active page should still honor the selected theme if storage is unavailable.
  }

  document.cookie =
    `${THEME_COOKIE_KEY}=${theme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function ThemeProvider({
  children,
  initialTheme = 'light',
}: {
  children: ReactNode;
  initialTheme?: SiteTheme;
}) {
  const [theme, setThemeState] = useState<SiteTheme>(initialTheme);

  useLayoutEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Fall back to the theme that the inline bootstrap script/server selected.
    }

    const fromDocument = document.documentElement.dataset.siteTheme ?? null;
    const preferred = isSiteTheme(stored)
      ? stored
      : isSiteTheme(fromDocument)
        ? fromDocument
        : initialTheme;

    setThemeState(preferred);
    applyTheme(preferred);
    persistTheme(preferred);
  }, [initialTheme]);

  const setTheme = useCallback((nextTheme: SiteTheme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
    persistTheme(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [setTheme, theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
