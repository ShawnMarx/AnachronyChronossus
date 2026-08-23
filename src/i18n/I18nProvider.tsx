// The i18n context: which language is active, and how a key becomes text.
//
// Until a second locale file exists this is a pure indirection — every lookup falls
// through to the English default that already lived in the catalogs, so the app renders
// byte-identically. That is deliberate: the mechanism ships and is exercised in English
// long before any translation arrives, so it cannot rot unnoticed.
//
// Storage is touched only inside try/catch and never at module scope: a privacy-restricted
// browser makes every localStorage access THROW, and an app that dies on language
// preference is a blank page nobody reports (see CLAUDE.md's degraded-mode guarantee).

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  DEFAULT_LOCALE,
  interpolate,
  isRulebookKey,
  loadLocales,
  lookup,
  type Locale,
} from './catalog';
import { englishMessages, type Messages } from './surface';

const STORAGE_KEY = 'anachrony:lang';

function readStoredLocale(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function storeLocale(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* disabled / full storage — the choice just won't survive a reload */
  }
}

export interface I18nValue {
  /** Active locale code. */
  code: string;
  /** Every locale found on disk, English first. */
  locales: Locale[];
  setLocale: (code: string) => void;
  /** Look up a key, substituting `{name}` params. Falls back to English, then the key. */
  t: (key: string, params?: Record<string, string | number>) => string;
  /**
   * True when rulebook text is being shown in English because the active locale has no
   * official transcription. The UI says so rather than leaving the player to wonder.
   */
  rulebookIsEnglish: boolean;
  /** Active language's own name, for that notice. */
  languageName: string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const catalog = useMemo(() => loadLocales(), []);
  const english = useMemo<Messages>(() => englishMessages(), []);
  const [code, setCode] = useState<string>(() => {
    const stored = readStoredLocale();
    return stored in catalog ? stored : DEFAULT_LOCALE;
  });

  const setLocale = useCallback((next: string) => {
    setCode(next);
    storeLocale(next);
  }, []);

  const value = useMemo<I18nValue>(() => {
    const locale = catalog[code];
    const official = code === DEFAULT_LOCALE || locale?.header.officialRulebook === true;
    return {
      code,
      locales: Object.values(catalog).sort((a, b) =>
        a.header.code === DEFAULT_LOCALE ? -1 : b.header.code === DEFAULT_LOCALE ? 1 : 0,
      ),
      setLocale,
      t: (key, params) => interpolate(lookup(locale, english, key, official), params),
      rulebookIsEnglish: !official,
      languageName: locale?.header.name ?? 'English',
    };
  }, [catalog, code, english, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * The translation hook. Safe to call outside a provider — it falls back to English,
 * so a component rendered in a test or a stray subtree still shows real text.
 */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  const fallback = useMemo<I18nValue>(() => {
    const english = englishMessages();
    return {
      code: DEFAULT_LOCALE,
      locales: [],
      setLocale: () => {},
      t: (key, params) => interpolate(english[key] ?? key, params),
      rulebookIsEnglish: false,
      languageName: 'English',
    };
  }, []);
  return ctx ?? fallback;
}

/** Shorthand for the common case. */
export function useT(): I18nValue['t'] {
  return useI18n().t;
}

export { isRulebookKey };
