// Guards on the translation layer.
//
// The point of these is that a translator's dropped-in file cannot break the app and
// cannot silently do nothing. Three failure modes are covered: a key that no longer
// exists (the catalogs moved on), a key the app asks for but the surface never publishes
// (a typo in `localized.ts`), and a placeholder a translator dropped while rewording.
//
// `en.json` is GENERATED. If this suite fails on it, run:  UPDATE_LOCALES=1 npm test

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { englishMessages } from './surface';
import { interpolate, isRulebookKey, lookup, type Locale } from './catalog';
import { localizeAction, localizePhaseMeta, localizeTile } from './localized';
import { CHRONOSSUS_TILES } from '../board/chronossusTiles';
import { CHRONOBOT_ACTIONS } from '../engine/rules/chronobotActions';
import { PHASE_META } from '../phases/phaseMeta';
import { CHRONOSSUS_PHASE_META } from '../phases/chronossusPhaseMeta';

const LOCALE_DIR = join(__dirname, 'locales');
const en = englishMessages();

/** Every key the app actually asks for, collected by running the localizers. */
function requestedKeys(): string[] {
  const asked: string[] = [];
  const spy = (key: string) => {
    asked.push(key);
    return en[key] ?? key;
  };
  for (const tile of Object.values(CHRONOSSUS_TILES)) localizeTile(tile, spy);
  for (const def of Object.values(CHRONOBOT_ACTIONS)) localizeAction(def, spy);
  for (const [phase, meta] of Object.entries(PHASE_META)) {
    if (meta) localizePhaseMeta(meta, phase, spy);
  }
  for (const [phase, meta] of Object.entries(CHRONOSSUS_PHASE_META)) {
    if (meta) localizePhaseMeta(meta, phase, spy, 'chronossus.');
  }
  return asked;
}

const PLACEHOLDER = /\{(\w+)\}/g;
const placeholders = (s: string) => [...s.matchAll(PLACEHOLDER)].map((m) => m[1]).sort();

describe('translatable surface', () => {
  it('publishes every tile, Action, mode and phase in the catalogs', () => {
    for (const tile of Object.values(CHRONOSSUS_TILES)) {
      expect(en[`tile.${tile.code}.name`], tile.code).toBe(tile.name);
      expect(en[`tile.${tile.code}.rule`], tile.code).toBe(tile.rule);
    }
    for (const def of Object.values(CHRONOBOT_ACTIONS)) {
      expect(en[`action.${def.id}.rule`], def.id).toBe(def.rule);
    }
    for (const [phase, meta] of Object.entries(PHASE_META)) {
      if (meta) expect(en[`phase.${phase}.overview`], phase).toBe(meta.overview);
    }
  });

  it('publishes every key the app asks for', () => {
    const missing = requestedKeys().filter((k) => !(k in en));
    expect(missing).toEqual([]);
  });

  it('publishes nothing the app cannot render', () => {
    // Adventure card prose is never shown; `summary`/`jit` belong to the unbuilt guided
    // runner; mode labels are written inline by the setup screen. A key here costs a
    // translator real effort, so an unreachable one is a bug.
    const dead = Object.keys(en).filter(
      (k) => k.startsWith('adventure.') || k.startsWith('mode.') ||
        /\.(summary|jit)$/.test(k),
    );
    expect(dead).toEqual([]);
  });

  it('classifies rulebook keys apart from the app’s own voice', () => {
    expect(isRulebookKey('tile.C01A.rule')).toBe(true);
    expect(isRulebookKey('action.research.rule')).toBe(true);
    expect(isRulebookKey('rule.passing')).toBe(true);
    expect(isRulebookKey('tile.C01A.name')).toBe(false);
    expect(isRulebookKey('ui.settings.resetGame')).toBe(false);
  });
});

describe('en.json', () => {
  it('is in sync with the catalogs (UPDATE_LOCALES=1 npm test to regenerate)', () => {
    const path = join(LOCALE_DIR, 'en.json');
    const generated =
      JSON.stringify(
        {
          $locale: { code: 'en', name: 'English', officialRulebook: true },
          ...Object.fromEntries(Object.entries(en).sort(([a], [b]) => a.localeCompare(b))),
        },
        null,
        2,
      ) + '\n';
    if (process.env.UPDATE_LOCALES) {
      writeFileSync(path, generated);
      return;
    }
    let onDisk: string;
    try {
      onDisk = readFileSync(path, 'utf8');
    } catch {
      throw new Error('src/i18n/locales/en.json is missing — run UPDATE_LOCALES=1 npm test');
    }
    expect(onDisk).toBe(generated);
  });
});

describe('dropped-in locale files', () => {
  const files = readdirSync(LOCALE_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'en.json')
    .sort();

  it.each(files.length ? files : ['(none present)'])('%s is usable', (file) => {
    if (file === '(none present)') return;
    const code = file.replace(/\.json$/, '');
    const raw = JSON.parse(readFileSync(join(LOCALE_DIR, file), 'utf8')) as Record<string, unknown>;

    const header = raw.$locale as { code?: string; name?: string } | undefined;
    expect(header, `${file} needs a "$locale" header`).toBeTruthy();
    expect(header!.code, `${file}: $locale.code must match the filename`).toBe(code);
    expect(typeof header!.name, `${file}: $locale.name is the picker label`).toBe('string');

    for (const [key, value] of Object.entries(raw)) {
      if (key === '$locale') continue;
      // An orphan key is a translation of something the app no longer shows.
      expect(en, `${file}: unknown key "${key}"`).toHaveProperty(key);
      expect(typeof value, `${file}: "${key}" must be a string`).toBe('string');
      // Dropping a placeholder while rewording is the classic translation bug.
      expect(placeholders(value as string), `${file}: "${key}" placeholders`).toEqual(
        placeholders(en[key]),
      );
    }
  });
});

describe('lookup and fallback', () => {
  const partial: Locale = {
    header: { code: 'xx', name: 'Test', officialRulebook: true },
    messages: { 'ui.common.continue': 'Weiter', 'tile.C01A.rule': 'Regeltext' },
  };

  it('uses the locale where it has a key', () => {
    expect(lookup(partial, en, 'ui.common.continue')).toBe('Weiter');
  });

  it('falls back to English per key, so a partial file is valid', () => {
    expect(lookup(partial, en, 'ui.common.youPass')).toBe(en['ui.common.youPass']);
  });

  it('falls back to the key itself rather than rendering nothing', () => {
    expect(lookup(partial, en, 'ui.nope.missing')).toBe('ui.nope.missing');
  });

  it('keeps rulebook text English when the locale claims no official transcription', () => {
    expect(lookup(partial, en, 'tile.C01A.rule', false)).toBe(en['tile.C01A.rule']);
    // ...but still uses its app-voice strings.
    expect(lookup(partial, en, 'ui.common.continue', false)).toBe('Weiter');
  });

  it('substitutes params and leaves unknown placeholders visible', () => {
    expect(interpolate('Hallo {name}, {oops}', { name: 'Welt' })).toBe('Hallo Welt, {oops}');
  });
});
