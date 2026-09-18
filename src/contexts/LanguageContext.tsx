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
  LANGUAGE_COOKIE_KEY,
  LANGUAGE_STORAGE_KEY,
  type AppLanguage,
} from '@/lib/i18n';
import { translateHomepageText } from '@/lib/i18n-homepage';
import { translateSupportText } from '@/lib/i18n-support';
import { translateSurfaceText } from '@/lib/i18n-surfaces';
import { translateAdminDashboardText } from '@/lib/i18n-admin-dashboard';
import { translateDashboardDetailsText } from '@/lib/i18n-dashboard-details';
import { translateLeadFollowEmailText } from '@/lib/i18n-leadfollow-email';
import { translateSiteText } from '@/lib/i18n-products';
import { isInternationalSeoPath, localizePublicPath } from '@/lib/locale-routing';

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
  'svg',
].join(',');

const TRANSLATABLE_ATTRIBUTES = [
  'placeholder',
  'aria-label',
  'aria-description',
  'title',
  'alt',
] as const;

function shouldSkipElement(element: Element | null) {
  return Boolean(element?.closest(SKIP_SELECTOR));
}

function translateValue(value: string) {
  const homepage = translateHomepageText(value);
  const support = translateSupportText(homepage);
  const surface = translateSurfaceText(support);
  const dashboard = translateAdminDashboardText(surface);
  const dashboardDetails = translateDashboardDetailsText(dashboard);
  const leadFollowEmail = translateLeadFollowEmailText(dashboardDetails);
  return translateSiteText(leadFollowEmail);
}

function translateTextNode(node: Text) {
  if (shouldSkipElement(node.parentElement)) return;
  const current = node.nodeValue ?? '';
  const translated = translateValue(current);
  if (translated !== current) node.nodeValue = translated;
}

function translateElementAttributes(element: Element) {
  if (shouldSkipElement(element)) return;

  for (const attribute of TRANSLATABLE_ATTRIBUTES) {
    const current = element.getAttribute(attribute);
    if (!current) continue;
    const translated = translateValue(current);
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

function persistLanguage(language: AppLanguage) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${LANGUAGE_COOKIE_KEY}=${language}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function LanguageProvider({
  children,
  initialLanguage = 'en',
}: {
  children: ReactNode;
  initialLanguage?: AppLanguage;
}) {
  const [language] = useState<AppLanguage>(initialLanguage);

  useEffect(() => {
    if (language !== 'ar' || !document.body) return undefined;

    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    let observer: MutationObserver | null = null;

    const startLocalization = () => {
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (cancelled || !document.body) return;

          localizeNode(document.body);

          observer = new MutationObserver((mutations) => {
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
        });
      });
    };

    if (document.readyState === 'complete') {
      startLocalization();
    } else {
      window.addEventListener('load', startLocalization, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('load', startLocalization);
      if (firstFrame) window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
      observer?.disconnect();
    };
  }, [language]);

  const setLanguage = useCallback(
    (nextLanguage: AppLanguage) => {
      persistLanguage(nextLanguage);
      if (nextLanguage === language) return;

      if (isInternationalSeoPath(window.location.pathname)) {
        const nextPath = localizePublicPath(window.location.pathname, nextLanguage);
        window.location.assign(`${nextPath}${window.location.search}${window.location.hash}`);
        return;
      }

      window.location.reload();
    },
    [language],
  );

  const t = useCallback(
    (english: string) => (language === 'ar' ? translateValue(english) : english),
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
