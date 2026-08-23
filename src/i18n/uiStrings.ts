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

  // --- The Action Rounds top bar --------------------------------------------
  // Decorative glyphs (↶ ▶ ✓) stay in the JSX, not in the string: a translator cannot
  // lose or mangle a glyph they never see, and the arrow means the same in every language.
  'common.takeBotAction': 'Take Bot Action',
  'common.botPassed': 'Bot Passed',
  'common.youPass': 'You Pass',
  'common.youPassed': 'You passed',
  'common.undo': 'Undo',

  // --- Home screen ----------------------------------------------------------
  'landing.title': 'Anachrony Solo Assistant',
  'landing.subtitle': "Play against the game's automated Solo opponents",
  'landing.intro':
    'An unofficial companion app for running the Solo opponents in [**Anachrony**](store), ' +
    "published by Mindclash Games. It runs the opponent's turns, rolls its dice, and tells " +
    'you where to move its pieces — and teaches you how to play against it along the way. ' +
    "You'll need the physical game to play, and you should already know (or be willing to " +
    'learn) the base game on your own.',
  'landing.partOfBge': 'Part of [BoardGameEdge](bge) — more play aids for the games on your table.',
  'landing.disclaimer':
    'Unofficial fan-made aid. Anachrony and its artwork are © Mindclash Games. This app ' +
    'requires owning the physical game.',
  'landing.comingSoon': 'Coming Soon',
  'landing.play': 'Play',
  'landing.playAgainst': 'Play against the {name}',
  'landing.soonAria': '{name} — coming soon',
  'landing.artworkAlt': '{name} artwork',
  'landing.chronobot.tagline': 'The base-game automa · easiest place to start',
  'landing.chronobot.description':
    'Supports the base game, with optional difficulty adjustments. A streamlined opponent ' +
    'driven by a handful of Command tokens.',
  'landing.chronossus.tagline': 'The advanced automa · more modes, more depth',
  'landing.chronossus.description':
    'A deeper opponent supporting every official module and their combinations. The app ' +
    'tracks its Energy Pool, modular Action tiles, and scoring, and explains each Action ' +
    'as it resolves.',
  'landing.savedAtUnknown': 'an earlier session',

  // --- Home screen: the login control ---------------------------------------
  'landing.auth.historyTitle': 'Your play history, and BG Stats export / import',
  'landing.auth.overallTitle': 'Overall stats across all players',
  'landing.auth.overall': 'Overall stats',
  'landing.auth.signOut': 'Sign out',
  'landing.auth.logIn': 'Log in',

  // --- Home screen: the continue / discard prompt ---------------------------
  'landing.resume.continueTitle': 'Continue your {bot} game?',
  'landing.resume.continueBody': 'You have a game in progress, last played on **{when}**.',
  'landing.resume.continueBtn': 'Continue game',
  'landing.resume.newBtn': 'Start a new game',
  'landing.resume.cancel': 'Cancel',
  'landing.resume.otherTitle': 'Start a {bot} game?',
  'landing.resume.otherBody':
    'You have a saved **{other}** game (last played **{when}**). Only one opponent can be ' +
    'active at a time — starting the {bot} will discard it.',
  'landing.resume.resumeOther': 'Resume {other}',
  'landing.resume.discardStart': 'Discard & start {bot}',

  // --- History --------------------------------------------------------------
  'history.title': 'History',
  'history.empty': 'No turns taken yet.',
} as const satisfies Record<string, string>;

export type UiKey = keyof typeof UI_STRINGS;
