// The app's own voice — chrome, buttons and labels that are NOT rulebook text.
//
// Unlike the rule catalogs, these have no natural home elsewhere, so this file IS their
// source of truth. Keys are grouped by where they appear. Add a string here and it lands
// in the generated `en.json` for translators automatically.
//
// A value may contain `{name}` placeholders, substituted by `t(key, params)`. It may also
// carry the inline markup History already uses (`**bold**`, `{flux}` icon tokens) wherever
// the consumer renders through `HistoryText`. Placeholders are checked against English by
// `i18n.test.ts`, so a locale file cannot silently drop one.

export const UI_STRINGS = {
  // --- Rulebook boxes -------------------------------------------------------
  'rulesBox.label': 'Rulebook text',
  'rulesBox.preamble':
    'When you see these boxes, they contain the exact rules as written in the rulebook.',
  'rulesBox.englishFallback':
    'Rulebook text shown in English — no {language} transcription has been supplied yet.',

  // --- Settings menu --------------------------------------------------------
  'settings.history': 'History',
  'settings.commandView': 'Command View',
  'settings.botAdventureDeck': 'Bot’s own Adventure deck',
  'settings.debugMode': 'Debug mode',
  'settings.tileOutlines': 'Tile outlines',
  'settings.calibrate': 'Calibrate positions',
  'settings.resetGame': 'Reset Game',
  'settings.myHistory': 'My history',
  'settings.language': 'Language',
  'settings.on': 'ON',
  'settings.off': 'OFF',

  // --- Common controls ------------------------------------------------------
  'common.continue': 'Continue',
  'common.back': 'Back',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.undo': 'Undo',
  'common.startYourTurn': 'Start Your Turn',
  'common.takeBotAction': 'Take Bot Action',
  'common.youPass': 'You Pass',

  // --- History --------------------------------------------------------------
  'history.title': 'History',
  'history.empty': 'No turns taken yet.',
} as const satisfies Record<string, string>;

export type UiKey = keyof typeof UI_STRINGS;
