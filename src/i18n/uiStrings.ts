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

  // --- Chronobot setup flow -------------------------------------------------
  'setup.eyebrow.new': 'New Game',
  'setup.eyebrow.difficulty': 'Difficulty',
  'setup.eyebrow.setup': 'Setup',
  'setup.title.flavor': 'The Chronobot',
  'setup.title.difficulty': 'Increasing the Difficulty',
  'setup.title.setup': 'Setup Instructions',
  'setup.home': 'Back to the home screen',
  'setup.heroAlt': 'Chronobot',
  'setup.continue': 'Continue',
  'setup.back': 'Back',
  'setup.beginEra1': 'Begin Era 1',
  'setup.flavor':
    'The Chronobot was sent back from a devastated alternate future with the objective of ' +
    'finding and eliminating the cause of a war that destroyed everything. Though created ' +
    'with the best intentions, it has identified humanity as the real problem—the root of ' +
    'the destruction to come. Misinterpreting its original task, the Chronobot is now ' +
    'determined to take over the leadership of all humankind, even if it has to destroy ' +
    'the Paths, or the Capital itself, to achieve its goal.',
  'setup.difficultyNote':
    'Select one or more of these options to increase the difficulty of the solo game ' +
    'against the Chronobot. You can also play with none for the standard game.',
  'setup.diff.rebootAdvance.label': 'Advance off Reboot immediately',
  'setup.diff.rebootAdvance.detail':
    'Immediately advance the token when it moves onto the Reboot Action. This will ensure ' +
    'that it will perform an Action on every turn.',
  'setup.diff.noLeader.label': 'Play without your Leader power',
  'setup.diff.noLeader.detail': 'Play without using your Leader power.',
  'setup.diff.botExtraTurn.label': 'One extra Chronobot turn after you pass',
  'setup.diff.botExtraTurn.detail': 'The Chronobot takes one additional turn after you have passed.',
  'setup.diff.minActions6.label': 'Raise minimum Actions to 6',
  'setup.diff.minActions6.detail': "Increase the minimum number of Chronobot's Actions from 3 to 6.",
  'setup.diff.hexUnavailable.label': 'Cover the right World Council space',
  'setup.diff.hexUnavailable.detail':
    'Base-game variant: cover the right World Council space with a Hex Unavailable tile. ' +
    '(This constrains your own board — the app changes nothing.)',
  'setup.app.title': 'Setup for this app',
  'setup.app.intro':
    'Set up a 2-player game, with the Chronobot as one of the players. There’s no need for ' +
    'the Chronobot board.',
  'setup.app.bullets':
    'The Chronobot receives its 6 Exosuits and 8 Warp tiles; it does not receive any ' +
    'Starting Assets or Workers.\n' +
    'Leave all Endgame Condition cards in the box.\n' +
    'The Chronobot does not use a Focus marker.\n' +
    'Place the Chronobot’s Banner on the First Player spot; it is the First Player in the ' +
    '1st Era. You receive 1 additional Water (for being the second player).\n' +
    'You may still choose to use either the “A” or the “B” side of your Player board.\n' +
    'For a more challenging game, use the variant rule described in the base game rulebook: ' +
    'cover the right World Council space with a Hex Unavailable tile.',
  'setup.app.vpNote':
    'This app tracks **all** of the Chronobot’s VP for you and explains each Action’s rules ' +
    'as it takes them. Building VP is counted as tiles are discarded, rather than placed on ' +
    'the bot’s board.',
  'setup.rulesBoxLabel': 'Setup',

  // --- Chronossus setup: where the bot's Adventure cards come from ----------
  'cxSetup.adventureDeck.virtual.label': 'Its own deck (recommended)',
  'cxSetup.adventureDeck.virtual.detail':
    'The app keeps its own shuffled copy of both Adventure decks, draws for the Chronossus ' +
    'and shows you the card. Your physical decks are never touched, so the bot can’t ' +
    'deplete or reorder them.',
  'cxSetup.adventureDeck.shared.label': 'Your physical decks',
  'cxSetup.adventureDeck.shared.detail':
    'The Chronossus draws from the same decks you do. The app tells you its Power and which ' +
    'deck to draw 2 cards from, and you tell it which cards came up.',

  // --- Chronossus setup: difficulty options ---------------------------------
  'cxSetup.diff.altTimelines3vp.label': 'Alternate Timelines: 3 VP per positive effect',
  'cxSetup.diff.altTimelines3vp.detail': 'The Chronossus scores 3 VPs per positive effect instead of 2.',
  'cxSetup.diff.doomsdayNoPlanned.label': 'Doomsday: play without the Planned Experiments variant',
  'cxSetup.diff.doomsdayNoPlanned.detail':
    'By default the Level 2 Experiment stack sits face up and a claimed Experiment is ' +
    'replaced from it immediately. Without the variant the stack is face down and Level 2 ' +
    'Experiments are dealt under the Timeline in the Preparation phase instead — the ' +
    'rulebook suggests keeping the variant on for your first few games.',
  'cxSetup.diff.doomsdaySeedMarkers.label': 'Doomsday: it starts with Path markers on future Experiments',
  'cxSetup.diff.doomsdaySeedMarkers.detail':
    'Place 1/2/3 of the Chronossus’s Path markers on future Experiments during setup. ' +
    'They become available to it once they are in the present, so it can execute an ' +
    'Experiment on its very first Experiment Action.',
  'cxSetup.diff.extraEnergy.label': 'Extra starting Energy Cores',
  'cxSetup.diff.extraEnergy.detail':
    'Increase the number of Energy Cores by 1/2/3 in the Energy Pool at the beginning of ' +
    'the game.',
  'cxSetup.diff.extraPowerup.label': 'One extra powered Exosuit each Era',
  'cxSetup.diff.extraPowerup.detail':
    'The Chronossus powers up one additional Exosuit each Era for free. If this would ' +
    'exceed its maximum number of Exosuits, it gains 2 VPs instead for each excess Energy ' +
    'Core drawn (those Energy Cores are still removed from the game).',
  'cxSetup.diff.failedActionVp.label': 'Failed Actions score VP',
  'cxSetup.diff.failedActionVp.detail': 'The Chronossus gains 2 VPs for each Failed Action.',
  'cxSetup.diff.fewerObjectives.label': 'Fewer (or no) Solo Objectives',
  'cxSetup.diff.fewerObjectives.detail': 'Play with fewer (or no) Solo Objectives.',
  'cxSetup.diff.fracturesC14.label': 'Fractures: replace C04 with C14',
  'cxSetup.diff.fracturesC14.detail':
    'C14 is a more difficult tile — Assimilate, but it also gains 1 additional Flux Core.',
  'cxSetup.diff.fracturesExtraFlux.label': 'Fractures: extra starting Flux Cores',
  'cxSetup.diff.fracturesExtraFlux.detail':
    'Increase the number of Flux Cores in the Flux Pool by 1/2/3 at the beginning of the ' +
    'game — a fuller pool means it Blinks more often.',
  'cxSetup.diff.fracturesLeftoverFluxVp.label': 'Fractures: leftover Flux Cores score',
  'cxSetup.diff.fracturesLeftoverFluxVp.detail':
    'Each leftover Flux Core in the Flux Pool at the end of the game is worth 1 VP to the ' +
    'Chronossus.',
  'cxSetup.diff.fracturesPlayerGlitch.label': 'Fractures: roll a starting Glitch for yourself',
  'cxSetup.diff.fracturesPlayerGlitch.detail':
    'Roll the Glitch die after setup and place the rolled Glitch for yourself, in ' +
    'addition to the two starting Glitches from the Fractures of Time rules.',
  'cxSetup.diff.guardiansPostimpact2vp.label': 'Guardians: Acquire Guardian scores 2 VP post-Impact',
  'cxSetup.diff.guardiansPostimpact2vp.detail':
    'After the Impact the Chronossus can no longer acquire Guardians. Instead of the ' +
    'usual Failed Action, it scores 2 VPs when it resolves the Acquire Guardian Action.',
  'cxSetup.diff.guardiansStart1.label': 'Guardians: it starts the game with 1 Guardian',
  'cxSetup.diff.guardiansStart1.detail':
    'The Chronossus starts with 1 Guardian — place one of its Path markers on an empty ' +
    'Guardian board slot at setup, and give it a Guardian.',
  'cxSetup.diff.hypersyncTargeted.label': 'Hypersync: take your oldest tile’s space (no random roll)',
  'cxSetup.diff.hypersyncTargeted.detail':
    'Instead of randomly selecting a Hypersync Action space to take, the Chronossus takes ' +
    'the one corresponding to one of your pending Hypersync tiles. If you have more than ' +
    'one, it takes the one furthest in the past.',
  'cxSetup.diff.leftoverEnergyVp.label': 'Leftover Energy Cores score VP',
  'cxSetup.diff.leftoverEnergyVp.detail':
    'Each leftover (non-exhausted) Energy Core in the Energy Pool at the end of the game ' +
    'is worth 1 VP to the Chronossus.',
  'cxSetup.diff.pioneersBoardB.label': 'Pioneers: flip its Exosuit Upgrade board to the B side',
  'cxSetup.diff.pioneersBoardB.detail':
    'The Chronossus starts with a Power value of 3 instead of 2, and each VP token on its ' +
    'Upgrade board is worth 3 Power instead of 2.',
  'cxSetup.diff.pioneersVpTokensCount.label': 'Pioneers: VP tokens on the Upgrade board count as VP',
  'cxSetup.diff.pioneersVpTokensCount.detail':
    'By default the VP tokens it places when it cannot upgrade a Resource add Power but ' +
    'are not worth VP. With this on, each one also scores 1 VP at the end.',
  'cxSetup.diff.ql2vp.label': 'Quantum Loops: 2 VP per card removed',
  'cxSetup.diff.ql2vp.detail': 'When removing a Quantum Loop card, the Chronossus receives 2 VPs.',
  'cxSetup.diff.qlRemoveOn5.label': 'Quantum Loops: also remove a card on a roll of 5',
  'cxSetup.diff.qlRemoveOn5.detail':
    'The Warp Phase check removes a Quantum Loop card on a roll of 4 or 5, not just a 4.',
  'cxSetup.diff.researchNewShape.label': 'Research takes a new Breakthrough shape',
  'cxSetup.diff.researchNewShape.detail':
    'When taking a Research Action, the Chronossus takes a Breakthrough shape it does not ' +
    'already possess.',
  'cxSetup.diff.swapTiles.label': 'Swap Action tiles between spaces',
  'cxSetup.diff.swapTiles.detail': 'Swap the Action tiles between Slot I and Slot III (the two marked spaces).',
  'cxSetup.diff.tilesBSide.label': 'Flip Action tiles to their B side',
  'cxSetup.diff.tilesBSide.detail': 'Flip some or all of the Action tiles to their B side (pick which below).',
  'cxSetup.diff.worldCouncil.label': 'Cover the right World Council space',
  'cxSetup.diff.worldCouncil.detail':
    'For a more challenging game, cover the right World Council space with a Hex ' +
    'Unavailable tile. (This constrains your own board — the app changes nothing.)',

  // --- Rules reference frame ------------------------------------------------
  'rulesFrame.backToGame': 'Back to Game',
  'rulesFrame.backToGameTitle': 'Return to the game',
  'rulesFrame.viewGroup': 'Rules view',
  'rulesFrame.chat': 'Chat',
  'rulesFrame.resources': 'Resources',
  'rulesFrame.split': 'Split',
  'rulesFrame.splitTitle': 'Side-by-side chat + rules',
  'rulesFrame.home': 'Back to the home screen',
  'rulesFrame.frameTitle': 'Anachrony rules reference',
  'rulesFrame.open': 'Rules',
  'rulesFrame.openTitle': 'Open the rules reference',

  // --- The turn log ---------------------------------------------------------
  'history.title': 'History',
  'history.empty': 'No turns taken yet.',

  // --- Saved-game history screen --------------------------------------------
  'gameHistory.title': 'Your game history',
  'gameHistory.close': 'Close',
  'gameHistory.loading': 'Loading…',
  'gameHistory.none': 'No games yet. Finish a game and choose **Save to my history** on the score screen.',
  'gameHistory.selectAll': 'Select all games',
  'gameHistory.result': 'Result',
  'gameHistory.difficulty': 'Difficulty',
  'gameHistory.delete': 'Delete this game',
  'gameHistory.exportSelected': '{n} selected',
  'gameHistory.exportAll': 'all',
  'gameHistory.export': 'Export {what} to BG Stats',
  'gameHistory.import': 'Import from BG Stats',
  'gameHistory.selectOne': 'Select the game played on {date}',
  'gameHistory.date': 'Date',
  'gameHistory.you': 'You',
  'gameHistory.bot': 'Bot',
  'gameHistory.era': 'Era',
  'gameHistory.win': 'Win',
  'gameHistory.loss': 'Loss',
  'gameHistory.imported': 'imported',
  'gameHistory.err.load': 'Could not load your history. Are you still signed in?',
  'gameHistory.err.delete': 'Delete failed — try again.',
  'gameHistory.err.notJson': 'That file is not valid JSON (expected a BG Stats export).',
  'gameHistory.err.noPlays': 'No plays found in that file.',
  'gameHistory.err.import': 'Import failed — try again.',
  'gameHistory.importedN': 'Imported {n} game.',
  'gameHistory.importedNPlural': 'Imported {n} games.',
} as const satisfies Record<string, string>;

export type UiKey = keyof typeof UI_STRINGS;
