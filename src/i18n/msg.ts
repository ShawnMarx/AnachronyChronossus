// Resolving a message descriptor into the player's language.
//
// The engine returns `{ key, params }` (see `src/engine/message.ts`); this is where that
// becomes a sentence. Kept separate from the engine so the engine imports nothing from
// i18n, and pure so the whole resolution — nesting, lists, legacy strings — is unit-tested
// without a DOM.

import type { Msg, MsgParam, Text } from '../engine/message';
import { isMsg } from '../engine/message';

type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * Join a list of already-resolved fragments the way the language writes a list.
 * English: "a", "a and b", "a, b and c". Both separators are catalog keys, because a
 * language that writes lists differently (no Oxford comma, a different conjunction, or a
 * trailing particle) has to be able to say so.
 */
function joinList(t: Translate, parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  const sep = t('msg.list.sep');
  const last = t('msg.list.last');
  return parts.slice(0, -1).join(sep) + last + parts[parts.length - 1];
}

function resolveParam(t: Translate, value: MsgParam): string | number {
  if (Array.isArray(value)) return joinList(t, value.map((v) => renderMsg(t, v)));
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

export type { Msg, Text };
