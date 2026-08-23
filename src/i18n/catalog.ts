// Locale discovery and lookup.
//
// ADDING A LANGUAGE IS ONE FILE. Drop `src/i18n/locales/<code>.json` in and it appears
// in the ⚙ menu — there is no registry to edit, no import to add, no enum to extend.
// Vite's `import.meta.glob` treats the file's presence as its registration, and the file
// names itself through its own `$locale` header.
//
// Every lookup falls back to English per key, so a file holding forty keys is valid and
// useful. That matters for the rulebook boxes in particular: a translator transcribing
// from their own edition of the Solo Opponents rulebook can land one module at a time.
//
// A malformed or unreadable locale file is SKIPPED with a console warning rather than
// taken down the app — a bad drop-in must never cost the player their game.

import { englishMessages, type Messages } from './surface';

/** The self-describing header every locale file must carry. */
export interface LocaleHeader {
  /** BCP-47 code, e.g. 'de'. Must match the filename. */
  code: string;
  /** The language's name IN THAT LANGUAGE ('Deutsch'), which is what the picker shows. */
  name: string;
  /** Optional credit line, shown under the picker. */
  credit?: string;
  /**
   * Set when the rulebook (`rule.*`, `tile.*.rule`, `action.*.rule`) has been transcribed
   * from that language's OFFICIAL edition. Left unset, the app keeps showing the English
   * rulebook boxes even where a translation exists, and says so — an unofficial rendering
   * of rule text is worse than none, because the whole point of a verbatim box is that it
   * matches the book in the player's hands.
   */
  officialRulebook?: boolean;
}

export interface Locale {
  header: LocaleHeader;
  messages: Messages;
}

/** The built-in language. English is resolved from the catalogs, never from a file. */
export const DEFAULT_LOCALE = 'en';

const RULE_KEY = /^(rule\.|action\.[^.]+\.rule$|tile\.[^.]+\.(rule|detail)$|phase\.[^.]*rules$)/;

/** Is this key verbatim rulebook text (as opposed to the app's own voice)? */
export function isRulebookKey(key: string): boolean {
  return RULE_KEY.test(key);
}

function validate(code: string, raw: unknown): Locale | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const header = obj.$locale as LocaleHeader | undefined;
  if (!header || typeof header.name !== 'string' || !header.name) {
    console.warn(`[i18n] locales/${code}.json has no usable "$locale": {code, name} header`);
    return null;
  }
  if (header.code !== code) {
    console.warn(`[i18n] locales/${code}.json declares code "${header.code}" — using "${code}"`);
  }
  const messages: Messages = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$locale') continue;
    if (typeof value === 'string' && value !== '') messages[key] = value;
  }
  return { header: { ...header, code }, messages };
}

/**
 * Every locale file on disk, keyed by code. English is synthesized from the catalogs
 * so it exists whether or not `en.json` has been generated; a committed `en.json` only
 * ever supplies the header (its strings are identical by construction).
 */
export function loadLocales(): Record<string, Locale> {
  const found: Record<string, Locale> = {
    [DEFAULT_LOCALE]: {
      header: { code: 'en', name: 'English', officialRulebook: true },
      messages: englishMessages(),
    },
  };
  let files: Record<string, unknown> = {};
  try {
    files = import.meta.glob('./locales/*.json', { eager: true, import: 'default' });
  } catch {
    return found; // no glob support (a plain-node test run) — English only
  }
  for (const [path, raw] of Object.entries(files)) {
    const code = path.replace(/^.*\//, '').replace(/\.json$/, '');
    if (code === DEFAULT_LOCALE) continue;
    const locale = validate(code, raw);
    if (locale) found[code] = locale;
  }
  return found;
}

/**
 * Resolve one key for a locale, falling back to English.
 *
 * `allowRuleText` is false when the locale has not declared an official rulebook
 * transcription: its app-voice strings are still used, but rule text stays English.
 */
export function lookup(
  locale: Locale | undefined,
  english: Messages,
  key: string,
  allowRuleText = true,
): string {
  if (locale && (allowRuleText || !isRulebookKey(key))) {
    const hit = locale.messages[key];
    if (hit != null) return hit;
  }
  return english[key] ?? key;
}

/** Substitute `{name}` placeholders. An unknown placeholder is left as written. */
export function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}
