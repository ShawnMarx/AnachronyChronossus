// Message descriptors — how the engine says something without choosing a language.
//
// The engine is pure and knows nothing about i18n. It never returns a sentence; it
// returns a KEY plus the params that fill it, and the view resolves that at render time
// through `t()` (see `src/i18n/msg.ts`).
//
// The reason is persistence, not translation. Instructions and History lines are saved to
// localStorage, so a finished sentence freezes: in whatever language was active when the
// turn happened, and in whatever wording the app shipped that day. A saved descriptor is
// re-rendered on every read, so a reworded instruction fixes OLD saves too — which is why
// this is worth doing even in an English-only build.
//
// The English defaults live in `src/engine/messages.ts`, beside the rules they describe,
// and `src/i18n/surface.ts` folds them into the translatable surface. A locale file is an
// override layer over those defaults, exactly as it is for every other catalog.

/**
 * A translatable message: a key into the message catalog, plus the params that fill its
 * `{placeholder}`s. A param may itself be a `Msg` (or a list of them) — many instructions
 * interpolate other prose, e.g. the cubes a Mine produced or the name of an Action space,
 * and that inner prose has to be translatable too. The resolver walks them depth-first.
 */
export interface Msg {
  key: string;
  params?: Record<string, MsgParam>;
}

export type MsgParam = string | number | Msg | Msg[];

/**
 * A displayed or persisted message. A bare `string` is a LEGACY value — a sentence saved
 * by a build from before this refactor. Those still render as written, so a game already
 * in progress survives the deploy with its History intact.
 */
export type Text = string | Msg;

/** True for a descriptor, false for a legacy saved sentence. */
export function isMsg(value: Text): value is Msg {
  return typeof value === 'object' && value != null && typeof (value as Msg).key === 'string';
}

/**
 * A counted message: `plural('hist.fluxCores', 2)` -> `{ key: 'hist.fluxCores.other',
 * params: { n: 2 } }`. Both `.one` and `.other` are published, so a translator sees the
 * two forms English needs.
 *
 * Deliberately only two categories: the catalog is a flat `key -> string` map and this
 * matches it with no new machinery. A language with more categories (Polish, Russian,
 * Arabic) cannot express all of them — the upgrade is `Intl.PluralRules` inside `t()`
 * resolving `key.<category>`, which stays cheap precisely because every counted key is
 * already a family rather than one string with a baked-in `s`.
 */
export function plural(key: string, n: number, params?: Record<string, MsgParam>): Msg {
  return { key: `${key}.${n === 1 ? 'one' : 'other'}`, params: { ...params, n } };
}

/** Shorthand for a message with no params. */
export function msg(key: string, params?: Record<string, MsgParam>): Msg {
  return params ? { key, params } : { key };
}
