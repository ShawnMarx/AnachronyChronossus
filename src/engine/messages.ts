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

export const ENGINE_MESSAGES: Record<string, string> = {
  // --- List joining -------------------------------------------------------------
  // How this language writes a list of things: "a, b and c". Both are keys because a
  // language may use a different conjunction, drop the comma, or need a trailing particle.
  'msg.list.sep': ', ',
  'msg.list.last': ' and ',
};
