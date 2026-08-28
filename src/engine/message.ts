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

export type MsgParam = string | number | Msg | Msg[] | MsgList;

/**
 * A list param that joins with something other than the default "a, b and c" — the
 * separators are given as KEYS, so the joining stays translatable too. The Chronobot's
 * mined cubes read "1 Gold + 2 Titanium", for instance.
 */
export interface MsgList {
  list: Msg[];
  /** Key for the separator between items. Defaults to `msg.list.sep`. */
  sep?: string;
  /** Key for the separator before the last item. Defaults to `msg.list.last`. */
  last?: string;
}

function isMsgList(value: MsgParam): value is MsgList {
  return typeof value === 'object' && value != null && Array.isArray((value as MsgList).list);
}

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

/**
 * Several whole sentences as one message — for a `detail` that is assembled from a fixed
 * opening plus whichever optional notes apply.
 *
 * Each sentence stays its own key (a translator gets whole sentences, never fragments to
 * splice), and the separator between them is a key too, because a language may not put a
 * space there. Falsy entries drop out, so a caller can pass a condition's result inline.
 */
export function sentences(...parts: (Msg | null | undefined | false)[]): Msg {
  return {
    key: 'msg.sentences',
    params: {
      text: {
        list: parts.filter((p): p is Msg => !!p),
        sep: 'msg.sentenceSep',
        last: 'msg.sentenceSep',
      },
    },
  };
}

/** Shorthand for a message with no params. */
export function msg(key: string, params?: Record<string, MsgParam>): Msg {
  return params ? { key, params } : { key };
}

// --- Resolution -------------------------------------------------------------------
// Turning a descriptor back into text. It lives here, not in `src/i18n/`, because it
// depends on nothing but a lookup function — and the ENGINE needs it too, for the paths
// that are required to be English (a string on its way to storage or an export; see the
// persisted/display split in CLAUDE.md). `src/i18n/msg.ts` binds it to the app's `t()`.

export type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * Join a list of already-resolved fragments the way the language writes a list.
 * English: "a", "a and b", "a, b and c". Both separators are catalog keys, because a
 * language that writes lists differently — no comma, another conjunction, a trailing
 * particle — has to be able to say so.
 */
function joinList(
  t: Translate,
  parts: string[],
  sepKey = 'msg.list.sep',
  lastKey = 'msg.list.last',
): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(t(sepKey)) + t(lastKey) + parts[parts.length - 1];
}

function resolveParam(t: Translate, value: MsgParam): string | number {
  if (Array.isArray(value)) return joinList(t, value.map((v) => renderMsg(t, v)));
  if (isMsgList(value)) {
    return joinList(t, value.list.map((v) => renderMsg(t, v)), value.sep, value.last);
  }
  if (typeof value === 'object' && value != null) return renderMsg(t, value);
  return value;
}

/**
 * Render a descriptor (or a legacy saved sentence) into text.
 *
 * A bare string passes through untouched — that is a sentence persisted by a build from
 * before this refactor, and re-rendering an in-progress game's old History in English is
 * exactly right. Params resolve depth-first, so a message can carry another message.
 */
export function renderMsg(t: Translate, value: Text): string {
  if (!isMsg(value)) return value;
  if (!value.params) return t(value.key);
  const params: Record<string, string | number> = {};
  for (const [name, raw] of Object.entries(value.params)) {
    params[name] = resolveParam(t, raw);
  }
  return t(value.key, params);
}

/** Render a list of descriptors — the History pane's per-turn effects. */
export function renderAll(t: Translate, values: Text[]): string[] {
  return values.map((v) => renderMsg(t, v));
}
