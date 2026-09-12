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
import {
  isAppLanguage,
  LANGUAGE_COOKIE_KEY,
  LANGUAGE_STORAGE_KEY,
  type AppLanguage,
} from '@/lib/i18n';
import { translateUiText } from '@/lib/i18n-extra';

type LanguageContextValue = {
  language: AppLanguage;
  isArabic: boolean;
  setLanguage: (language: AppLanguage) => void;
  t: (english: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const SKIP_SELECTOR = [
  '[data-i18n-skip]',
  '[translate="no"]',
  '.notranslate',
  '[contenteditable="true"]',
  'script',
  'style',
  'code',
  'pre',
  'noscript',
  'textarea',
  'svg',
].join(',');

const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'aria-label', 'title'] as const;

function shouldSkipElement(element: Element | null) {
  return Boolean(element?.closest(SKIP_SELECTOR));
}

function translateTextNode(node: Text) {
  if (shouldSkipElement(node.parentElement)) return;
  const current = node.nodeValue ?? '';
  const translated = translateUiText(current);
  if (translated !== current) node.nodeValue = translated;
}

function translateElementAttributes(element: Element) {
  if (shouldSkipElement(element)) return;

  for (const attribute of TRANSLATABLE_ATTRIBUTES) {
    const current = element.getAttribute(attribute);
    if (!current) continue;
    const translated = translateUiText(current);
    if (translated !== current) element.setAttribute(attribute, translated);
  }
}

function localizeNode(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text);
    return;
  }

  if (!(root instanceof Element) && !(root instanceof DocumentFragment) && root !== document.body) return;

  if (root instanceof Element) {
    if (shouldSkipElement(root)) return;
    translateElementAttributes(root);
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current: Node | null = walker.nextNode();

  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      translateTextNode(current as Text);
    } else if (current instanceof Element) {
      translateElementAttributes(current);
    }
    current = walker.nextNode();
  }
}

function readCookieLanguage(): AppLanguage | null {
  if (typeof document === 'undefined') return null;
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LANGUAGE_COOKIE_KEY}=`));
  const value = cookie?.split('=')[1] ?? null;
  return isAppLanguage(value) ? value : null;
}

function persistLanguage(language: AppLanguage) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${LANGUAGE_COOKIE_KEY}=${language}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const preferred = isAppLanguage(stored) ? stored : readCookieLanguage();
    if (preferred) setLanguageState(preferred);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.language = language;

    if (language !== 'ar' || !document.body) return undefined;

    localizeNode(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          translateTextNode(mutation.target as Text);
          continue;
        }

        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          translateElementAttributes(mutation.target);
          continue;
        }

        mutation.addedNodes.forEach((node) => localizeNode(node));
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });

    return () => observer.disconnect();
  }, [language]);

  const setLanguage = useCallback(
    (nextLanguage: AppLanguage) => {
      persistLanguage(nextLanguage);
      if (nextLanguage === language) return;

      // Reloading gives React a clean source-language DOM before the Arabic
      // localization bridge runs, so switching in either direction is reliable.
      window.location.reload();
    },
    [language],
  );

  const t = useCallback(
    (english: string) => (language === 'ar' ? translateUiText(english) : english),
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isArabic: language === 'ar',
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
