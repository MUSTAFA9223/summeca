'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type SiteTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'summeca:theme';

type ThemeContextValue = {
  theme: SiteTheme;
  setTheme: (theme: SiteTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isSiteTheme(value: string | null): value is SiteTheme {
  return value === 'dark' || value === 'light';
}

function applyTheme(theme: SiteTheme) {
  document.documentElement.dataset.siteTheme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SiteTheme>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    const fromDocument = document.documentElement.dataset.siteTheme ?? null;
    const preferred = isSiteTheme(stored)
      ? stored
      : isSiteTheme(fromDocument)
        ? fromDocument
        : 'light';

    setThemeState(preferred);
    applyTheme(preferred);
  }, []);

  const setTheme = useCallback((nextTheme: SiteTheme) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setThemeState(nextTheme);
    applyTheme(nextTheme);
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
