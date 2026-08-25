// The view-facing entry point for rendering a message descriptor.
//
// The resolver itself lives in `src/engine/message.ts` — it depends on nothing but a
// lookup function, and the engine needs it too for the paths that must stay English
// (anything on its way to storage or an export). This module exists so the views import
// rendering from i18n, where the rest of the translation layer lives.

import { renderMsg, type Text } from '../engine/message';
import { interpolate } from './catalog';
import { englishMessages } from './surface';

export { renderMsg, renderAll } from '../engine/message';
export type { Msg, Text, Translate } from '../engine/message';

let english: Record<string, string> | null = null;

/**
 * Render a descriptor in English, against the WHOLE surface.
 *
 * The engine has its own `englishText`, but it can only see the engine's own catalogs —
 * and an instruction routinely nests a key the surface owns (`piece.factory`,
 * `ui.pieceInline.gold`, `action.<id>.label`). The engine cannot import the surface
 * without a cycle, so the full-surface English renderer lives here.
 *
 * For the paths that must NOT be translated — a string on its way to storage, an export,
 * or another tool — and for tests that pin the exact English wording.
 */
export function renderEnglish(value: Text): string {
  english ??= englishMessages();
  return renderMsg((key, params) => interpolate(english![key] ?? key, params), value);
}
