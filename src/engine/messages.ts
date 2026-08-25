// The English defaults for every message the engine and the History summarizers emit.
//
// A flat `key -> English default` map, the same shape as every other catalog the
// translatable surface is derived from (`src/i18n/surface.ts` folds this in as the
// `instr.*` and `hist.*` families). The English text therefore stays in the engine,
// beside the rules it describes, and a locale file is an override layer over it — the
// convention the whole i18n layer follows.
//
// Two rules for anything added here:
//
//   * A mid-sentence branch gets its OWN KEY, never a param. `…the Chronossus ${places ?
//     'places an Exosuit and ' : ''}takes +N VP` becomes two entries. A conditional English
//     fragment passed in as a param is unusable to a translator: word order moves between
//     languages and the fragment has no grammatical home.
//   * A counted noun gets a `.one` / `.other` pair, emitted with `plural()`. Never bake an
//     `s` into the string.
//
// Board locations the player has to act on read `**bold**`, and in-game component art is
// written as an icon token (`{flux}`); `src/history/HistoryText.tsx` renders both. They
// live INSIDE the string so a translator can move them where their grammar needs them.

import { CHRONOBOT_MESSAGES } from './bots/chronobot.messages';
import { renderMsg, type Text } from './message';

/** Keys shared by more than one bot, or by the engine itself. */
const SHARED_MESSAGES: Record<string, string> = {
  // --- List joining -------------------------------------------------------------
  // How this language writes a list of things: "a, b and c". Both are keys because a
  // language may use a different conjunction, drop the comma, or need a trailing particle.
  'msg.list.sep': ', ',
  'msg.list.last': ' and ',

  // --- Board pieces named inside an instruction ---------------------------------
  // Which Timeline tile a Warp tile sits on. Era Zero (Fractures) is its own key because
  // "the Era Zero tile" is that tile's NAME — it is not "Era 0".
  'board.timelineTile.era': 'the Era {era} Timeline tile',
  'board.timelineTile.eraZero': 'the Era Zero tile',
  // The fallback when per-Era tracking can't name the tile — an older save whose tiles are
  // anonymous. It states the rulebook's own selection rule instead of naming an Era.
  'board.timelineTile.mostOldest': 'the Timeline tile where it has the most (oldest if tied)',
  // Time Travel says "past" where the Paradox phase does not — the Paradox phase runs
  // before this Era's Warp phase, so everything the bot has is past already.
  'board.timelineTile.mostOldestPast':
    'the past Timeline tile where it has the most (oldest if tied)',

  // Breakthrough shapes, named inside an instruction.
  'piece.shape.circle': 'circle',
  'piece.shape.triangle': 'triangle',
  'piece.shape.square': 'square',

  // How a list of Resource cubes joins: "1 gold + 2 titanium".
  'msg.cubeJoin': ' + ',
};

/**
 * Every English default the engine emits, from each bot's own catalog. `src/i18n/surface.ts`
 * folds this into the translatable surface; a locale file overrides it per key.
 */
export const ENGINE_MESSAGES: Record<string, string> = {
  ...SHARED_MESSAGES,
  ...CHRONOBOT_MESSAGES,
};

/**
 * Render a descriptor in English, for the paths that are REQUIRED to be English rather
 * than translated: anything on its way to storage, an export, or another tool (see the
 * persisted/display split in CLAUDE.md). The view never calls this — it uses `t()`.
 */
export function englishText(value: Text): string {
  return renderMsg(
    (key, params) =>
      (ENGINE_MESSAGES[key] ?? key).replace(/\{(\w+)\}/g, (whole, name: string) =>
        params && name in params ? String(params[name]) : whole,
      ),
    value,
  );
}
