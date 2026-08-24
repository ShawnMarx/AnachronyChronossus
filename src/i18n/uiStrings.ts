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
  'settings.gear': 'Settings',
  'settings.adventureDeck.virtualTitle':
    'The app draws the bot’s Adventure cards from its own shuffled deck',
  'settings.adventureDeck.physicalTitle':
    'The bot draws from your physical Adventure decks; you name the cards',
  'settings.overallStats': 'Overall stats',
  'settings.signedInAs': 'Signed in as {name}',
  'settings.signOut': 'Sign out ({name})',
  'settings.logIn': 'Log in',
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
  // Short forms of the same flags, shown on the Turn-overview difficulty chip. They are
  // deliberately worded as "what is in force" rather than "what to choose", so they are
  // their own keys and not a reuse of the setup labels above.
  'setup.diffChip.rebootAdvance': 'Advance off Reboot immediately',
  'setup.diffChip.noLeader': 'Play without your Leader power',
  'setup.diffChip.botExtraTurn': 'One extra Chronobot turn after you pass',
  'setup.diffChip.minActions6': 'Minimum Actions raised to 6',
  'setup.diffChip.hexUnavailable': 'Right World Council space covered (Hex Unavailable)',

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

  // --- Chronossus setup flow ------------------------------------------------
  'cxSetup.eyebrow.new': 'New Game',
  'cxSetup.eyebrow.modules': 'Modules',
  'cxSetup.eyebrow.doomsday': 'Doomsday',
  'cxSetup.eyebrow.difficulty': 'Difficulty',
  'cxSetup.eyebrow.setup': 'Setup',
  'cxSetup.title.intro': 'The Chronossus',
  'cxSetup.title.modules': 'Select a Module',
  'cxSetup.title.path': 'Choose Your Path',
  'cxSetup.title.difficulty': 'Increasing the Difficulty',
  'cxSetup.title.setup': 'Setup Instructions',
  'cxSetup.home': 'Back to the home screen',
  'cxSetup.heroAlt': 'Chronossus',
  'cxSetup.continue': 'Continue',
  'cxSetup.back': 'Back',
  'cxSetup.beginEra1': 'Begin Era 1',
  'cxSetup.comingSoon': 'Coming soon ({n})',
  'cxSetup.flavor':
    'When the Path of Unity appeared in our present, altering the course of history, ' +
    'their audacity caused a massive dissonance in the Space-Time Continuum that could ' +
    'not remain unanswered by the cosmos.\n' +
    '\n' +
    'From the deepest, darkest recesses of the universe, an ancient and ruthless menace ' +
    'emerged. The Chronossus, the Destroyer of Worlds, has awakened with only one ' +
    'purpose: to eliminate the dissonance and consume all broken timelines, including ours.',

  // Module picker
  'cxSetup.modules.note':
    '**Base** is the app designer’s suggested start. The app itself handles the extra ' +
    'bookkeeping and complexity of the other modules, giving you a more complete opponent ' +
    'as they come online across the game modes.',
  'cxSetup.modules.pioneersDeck':
    '**Pioneers — where the Chronossus’s Adventure cards come from.** You can change this ' +
    'later in the ⚙ menu.',
  'cxSetup.modules.extras': 'Optional add-on modules (combine with any base mode above):',
  'cxSetup.modules.buildings':
    'The Interlocking buildings and Neutronide buildings are supported and require no ' +
    'additional components or adjustments to the rules.',

  // Module names. Expansion titles, so a locale uses the names on that language's boxes.
  'module.base': 'Base',
  'module.fractures': 'Fractures of Time',
  'module.doomsday': 'Doomsday',
  'module.pioneers': 'Pioneers of New Earth',
  'module.guardians': 'Guardians of the Council',
  'module.hypersync': 'Hypersync Future Actions',
  'module.fractures+pioneers': 'Fractures of Time + Pioneers of New Earth',
  'module.fractures+hypersync': 'Fractures of Time + Hypersync Future Actions',
  'module.guardians+hypersync': 'Guardians of the Council + Hypersync Future Actions',
  'module.guardians+pioneers': 'Guardians of the Council + Pioneers of New Earth',

  // Doomsday's Path screen
  'cxSetup.path.note':
    'Doomsday gives each Path a side of the Doomsday track. Tell the app which one you ' +
    'are playing and it takes the other for the Chronossus — that holds for the whole game.',
  'cxSetup.path.harmony': 'Path of Harmony',
  'cxSetup.path.dominance': 'Path of Dominance',
  'cxSetup.path.salvation': 'Path of Salvation',
  'cxSetup.path.progress': 'Path of Progress',
  'cxSetup.path.detail':
    'You control the **{track}** tracker, moving it {direction} the track. The Chronossus ' +
    'takes the **{botTrack}** tracker.',
  'cxSetup.path.up': 'up',
  'cxSetup.path.down': 'down',
  'cxSetup.path.bothTokens':
    'You will move **both** physical tokens during the game. The app tracks where the ' +
    'Chronossus’s marker sits so it knows the VP its Experiments earn, and tells you when ' +
    'to advance it — and you will read both trackers’ (+)/(−) symbols yourself for the ' +
    'Trajectory roll each Clean Up.',
  'cxSetup.path.rulesLabel': 'Doomsday — the Chronossus’s tracker',

  // Doomsday track + Path names, used in the setup prose
  'track.saveEarth': 'Save Earth',
  'track.sealFate': 'Seal Fate',
  'path.harmony': 'Harmony',
  'path.dominance': 'Dominance',
  'path.salvation': 'Salvation',
  'path.progress': 'Progress',

  // Difficulty screen
  'cxSetup.difficulty.note':
    'Select one or more options to increase the difficulty against the Chronossus, or ' +
    'play with none for the standard game.',
  'cxSetup.tileFlip.head': 'Slot {slot} · {code} — {name}',
  'cxSetup.tileFlip.alt': '{name} ({code})',
  'cxSetup.tileFlip.toB': 'A side ▸ flip to B',
  'cxSetup.tileFlip.toA': 'B side ▸ flip to A',

  // --- Chronossus setup: the app's own instructions -------------------------
  // The bullets that only appear for a given module sit with it, so a translator sees
  // the module's block together.
  'cxSetup.app.title': 'Setup for this app',
  // Labels on the verbatim 📖 setup boxes. The BODIES are rule text (`rule.cxSetup.*`).
  'cxSetup.rules.base': 'Setup',
  'cxSetup.rules.fractures': 'Fractures of Time — setup',
  'cxSetup.rules.guardians': 'Guardians of the Council — setup',
  'cxSetup.rules.pioneers': 'Pioneers of New Earth — setup',
  'cxSetup.rules.doomsday': 'Doomsday — setup',
  'cxSetup.rules.hypersync': 'Hypersync Future Actions — setup',
  'cxSetup.rules.quantumLoops': 'Quantum Loops — setup',
  'cxSetup.rules.hypersyncTilesAlt': 'Solo Hypersync setup tiles',
  // Solo Objective card names, as printed on the cards.
  'objectiveCard.technologyCards': 'Technology Cards',
  'objectiveCard.fluxOnTrack': 'Flux on Track',
  'objectiveCard.guardians': 'Guardians',
  'objectiveCard.successfulAdventures': 'Successful Adventures',
  'objectiveCard.completedExperiments': 'Completed Experiments',
  // How a run of card names is joined mid-sentence.
  'cxSetup.app.cardSep': ', ',
  'cxSetup.app.cardLast': ' and ',
  'cxSetup.app.intro':
    'Set up a 2-player game with the Chronossus as one of the players. There’s no need ' +
    'for the Chronossus board — this app tracks it for you.',
  'cxSetup.app.figures':
    'The Chronossus receives its 6 Exosuits and 8 Warp tiles. It does not receive any ' +
    'Starting Assets or Workers.',
  'cxSetup.app.endgameCards': 'Leave all Endgame Condition cards in the box.',
  'cxSetup.app.addObjectives': 'Add the {cards} Solo Objective card from your module to the deck, then ',
  'cxSetup.app.addObjectivesPlural':
    'Add the {cards} Solo Objective cards from your modules to the deck, then ',
  'cxSetup.app.shuffleLower': 'shuffle',
  'cxSetup.app.shuffleUpper': 'Shuffle',
  'cxSetup.app.revealing': '{shuffle} all Solo Objective cards, revealing {n}{note}. Return the rest to the box.',
  'cxSetup.app.difficultyChosen': ' (difficulty option selected)',
  'cxSetup.app.noFocus': 'The Chronossus does not use a Focus marker.',
  'cxSetup.app.banner':
    'Place the Chronossus’s Banner on the First Player spot; it is the First Player in ' +
    'the 1st Era. You receive 1 additional Water (for being the second player).',
  'cxSetup.app.playerBoard':
    'You may still choose to use either the “A” or the “B” side of your Player board.',
  'cxSetup.app.worldCouncilRequired':
    '**Cover the right World Council space** with a Hex Unavailable tile (required for ' +
    'this mode).',
  'cxSetup.app.worldCouncilOption':
    '**Cover the right World Council space** with a Hex Unavailable tile (difficulty ' +
    'option selected).',
  'cxSetup.app.vpNote':
    'This app tracks **all** of the Chronossus’s VP for you and explains each Action’s ' +
    'rules as it takes them. Building VP is counted as tiles are discarded, rather than ' +
    'placed on the bot’s board. Be ready to place Exosuits and Warp tiles to the board ' +
    'and discard pieces for the bot as prompted.',
  'cxSetup.app.objectivesNote':
    'In addition to your points collected during the game, you score points for the ' +
    'highest level you reached on each Solo Objective. The bot doesn’t score for Solo ' +
    'Objectives.',

  // Guardians bullets in the base list
  'cxSetup.app.guardians.board':
    'Set up the **Guardian board** as for a 2-player game, and keep the Chronossus’s ' +
    '**Path markers** to hand — when it acquires a Guardian you place one on an empty ' +
    'Guardian board slot, and that slot becomes that Guardian’s own Action space. (Solo ' +
    'Path markers aren’t meant to be limited; if they run out, use an unused Path’s markers.)',
  'cxSetup.app.guardians.tracked':
    'The app tracks how many Guardians the Chronossus owns and how many are powered up; ' +
    'you place and retrieve the miniatures as prompted.',
  'cxSetup.app.guardians.starting':
    '**Give the Chronossus 1 Guardian now** and place one of its Path markers on an empty ' +
    'Guardian board slot (difficulty option selected).',

  // Per-module app-voice setup sections
  'cxSetup.mod.fractures.title': 'Fractures of Time setup',
  'cxSetup.mod.fractures.eraZero':
    'Set up the Timeline with the **Era Zero** tile and its own face-up Superproject. ' +
    'Straight after setup the app runs a one-off **Era Zero Warp Phase** — no other ' +
    'phases — with the Warp tiles going on that tile. Era 1 then runs as usual, ' +
    'including its Paradox phase (normally skipped in the first Era).',
  'cxSetup.mod.fractures.timeline':
    'The Timeline is **shorter**: three Eras pre-Impact and two post-Impact. The Impact ' +
    'happens in **Era 3**’s Clean Up and the game ends after **Era 5**.',
  'cxSetup.mod.fractures.valley':
    'Set up the **Valley board** as if it was a 2-player game. The app names the Valley ' +
    'Action the Chronossus takes; you place its Exosuit there (or on the Valley Capital ' +
    'space if no Valley Action space is free).',
  'cxSetup.mod.fractures.cores':
    'Keep **cardboard energized cores** to hand — or any alternative marker — to show ' +
    'which of the Chronossus’s Exosuits are ready to Blink: whenever it places an Exosuit ' +
    'on the Main board, put an Energy Core from the supply into that Exosuit.',
  'cxSetup.mod.fractures.fluxPool':
    'No need for the physical **Flux Pool** container — the app holds its 1 Flux Core + ' +
    '3 Empty Flux Casings and draws from it for you{extra}.',
  'cxSetup.mod.fractures.extraFlux': ' (+{n} extra Flux Core, difficulty option selected)',
  'cxSetup.mod.fractures.extraFluxPlural':
    ' (+{n} extra Flux Cores, difficulty option selected)',
  'cxSetup.mod.fractures.noDevice':
    'The Chronossus does not use a Fracture Device, never rolls the Flux or Glitch dice, ' +
    'and never receives Glitches.',
  'cxSetup.mod.fractures.playerGlitch':
    '**Roll the Glitch die and place that Glitch for yourself**, on top of your two ' +
    'starting Glitches (difficulty option selected).',

  'cxSetup.mod.guardians.title': 'Guardians of the Council setup',
  'cxSetup.mod.guardians.board':
    'Set up the Guardian board as for a 2-player game, and cover the right World Council ' +
    'Action space with a Hex Unavailable tile (as noted in the Guardians of the Council ' +
    'rules for 2 players).',
  'cxSetup.mod.guardians.markers':
    'Keep the Chronossus’s Path markers to hand for the Guardian board.',

  'cxSetup.mod.pioneers.title': 'Pioneers of New Earth setup',
  'cxSetup.mod.pioneers.board': 'Place the Adventure board next to the Main board.',
  'cxSetup.mod.pioneers.upgrade':
    'Give the Chronossus its Exosuit Upgrade board, **{side}** side up.',
  'cxSetup.mod.pioneers.ownDeck':
    'The app keeps the Chronossus’s **own copy** of both Adventure decks — shuffle your ' +
    'two decks and place them on the Adventure board for yourself only. The bot never ' +
    'draws from them.',
  'cxSetup.mod.pioneers.sharedDeck':
    'Shuffle the 5+ and 10+ Adventure decks onto the Adventure board. The Chronossus ' +
    'draws from these **same decks**, and you tell the app which cards it drew.',
  'cxSetup.mod.pioneers.markers':
    'Keep the Chronossus’s Path markers to hand for the Adventure board’s Power slots.',

  'cxSetup.mod.doomsday.title': 'Doomsday setup',
  'cxSetup.mod.doomsday.board':
    'Set up the **Doomsday board**, the Experiment cards and the Impact tile as for a ' +
    '2-player game — including the {stack}.',
  'cxSetup.mod.doomsday.stackPlanned':
    'face-up Level 2 stack of the Planned Experiments variant',
  'cxSetup.mod.doomsday.stackNoPlanned':
    'face-down Level 2 stack (you chose to play without the Planned Experiments variant)',
  'cxSetup.mod.doomsday.path':
    'Your Path (**{path}**) puts you on the **{playerTrack}** track — that is the tracker ' +
    '**you** advance for your own Experiments. The Chronossus scores on the **{botTrack}** ' +
    'track, always the opposing one.',
  'cxSetup.mod.doomsday.bothTokens':
    '**You move both physical tokens.** The app tracks where the Chronossus’s marker ' +
    'sits — that is how it knows the VP each of its Experiments earns — and tells you ' +
    'when to advance it. You will need both trackers’ positions yourself each Clean Up, ' +
    'to read the (+) and (−) symbols for the Trajectory roll.',
  'cxSetup.mod.doomsday.markers':
    'Keep the Chronossus’s **Path markers** to hand for the Experiments.',
  'cxSetup.mod.doomsday.seedMarkers':
    'Place **{n}** of the Chronossus’s Path markers on future Experiments now (difficulty ' +
    'option selected).',
  'cxSetup.mod.doomsday.checkImpact':
    '**You run Check for Impact yourself** each Clean Up — the app never rolls the ' +
    'Trajectory dice or tracks the Impact tile. It prompts you at the right moment and ' +
    'asks what happened.',

  'cxSetup.mod.quantumLoops.title': 'Quantum Loops setup',
  'cxSetup.mod.quantumLoops.module':
    'Set up the **Quantum Loops module** as for a 2-player game — the card offer, the ' +
    'draw deck and the Quantum Warp tiles are unchanged.',
  'cxSetup.mod.quantumLoops.row':
    'Keep the Quantum Loop cards in a **row**, adding new ones **closest to the draw ' +
    'deck**. That order is what the Chronossus reads: it always removes the card ' +
    '**farthest from the draw deck**. When you return a card of your own, add it back ' +
    'farthest from the deck too.',
  'cxSetup.mod.quantumLoops.check':
    'The app rolls the check for you each Warp Phase in which the Chronossus places a ' +
    'Warp tile, and tells you whether a card leaves play. It never takes or returns a ' +
    'card itself, so anything it removes is gone **permanently**.',
  'cxSetup.mod.quantumLoops.leak':
    'If you gain the **“Cosmic Data Leak”** card, draw 2 unused Solo Objectives and put ' +
    'them into play.',

  'cxSetup.mod.hypersync.title': 'Hypersync Future Actions setup',
  'cxSetup.mod.hypersync.board':
    'Use the 2-player side of the Hypersync board, and cover the right World Council ' +
    'Action space on the Main board with a Hex Unavailable tile (as noted in the ' +
    'Hypersync rules for 2 players).',
  'cxSetup.mod.hypersync.tiles':
    'Place the Solo Hypersync tiles next to the Chronossus board.',

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
  'history.close': 'Close history',
  'history.dieAria': 'AI die {n}',

  // --- The phase-screen frame -----------------------------------------------
  'phaseScreen.home': 'Back to the home screen',
  'phaseScreen.eyebrow': 'Era {era} · Phase {phase}',
  'phaseScreen.tabPhase': 'Phase',
  'phaseScreen.tabBoard': 'Board',

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
  // --- Turn overview + phase header controls --------------------------------
  // --- The Ready-to-begin splash and the First-Player prompt ----------------
  'ready.title': 'Ready to begin — Era {era}',
  'ready.botFirst':
    'The {bot} is First Player this Era — it takes the first turn. Press “Take Bot ' +
    'Action” to roll the AI die and resolve it.',
  'ready.youFirst':
    'You are First Player this Era. Take your turn on the Main board first, then press ' +
    '“Take Bot Action” for the {bot}’s turn.',
  'ready.gotIt': 'Your turn first — got it',
  'firstPlayer.title': 'First Player next Era',
  'firstPlayer.ask':
    'Does the {bot} control First Player (banner placed next to the World Council)?',
  'firstPlayer.yes': 'Yes',
  'firstPlayer.no': 'No',

  'turnBar.modesTitle': 'Modules in play',
  'turnBar.difficultyTitle': 'Difficulty options',
  'turnBar.difficultyNone': 'Standard game — none selected',
  'turnBar.difficultyCount': 'Difficulty options ({n} selected)',
  'turnBar.countLabel': 'Bot Actions',
  'turnBar.popTitle': 'Era {era} · Phase {phase} · {countLabel} ',
  'turnBar.popMin': ' / min {n}',
  'turnBar.close': 'Close',
  'turnBar.phaseEnds': '✓ Action Rounds Phase ends',
  'turnBar.recentTurns': 'Recent bot turns',
  'turnBar.turnN': 'Turn {n}',
  'turnBar.botTurnRules': '{bot}’s turn',
  'turnBar.passingRules': 'Passing & End of Actions',
  'turnBar.outsideActions':
    'Outside the Action Rounds — the counts and recent turns below are this Era so far.',
  'turnBar.undoTitle': 'Undo the last committed step',
  'turnBar.historyTitle': 'Turn history',
  'turnBar.turn': 'Turn',
  'turnBar.chipTitle': 'Turn tracker — pass status & recent bot turns',
  'turnBar.chipTitleActions': 'Turn tracker — pass status, minimum Actions & recent bot turns',

  // --- The Action Rounds top bar (titles + aria) ----------------------------
  'topBar.home': 'Back to the home screen',
  'topBar.botPassedTitle': 'The Chronobot has passed for this Era',
  'topBar.takeActionTitle': 'Roll the AI die (faces {faces}) and activate that Command token',
  'topBar.dieAria': 'AI die shows {n}',
  'topBar.passTitle': 'Pass for the Action Rounds phase',
  'topBar.undoTitle': 'Undo the last step (restores the same die roll)',
  'topBar.homeAria': 'Home',
  'topBar.cxBotPassedTitle': 'The Chronossus has passed for this Era',
  'topBar.cxTakeActionTitle':
    'Roll the AI die (faces {faces}) and activate that Command marker',
  'topBar.cxUndoTitle': 'Undo the last committed turn',

  // --- Non-Action phase bodies (Chronobot) ----------------------------------
  'phaseBody.endBanner': '✓ Everyone has passed — the Action Rounds Phase is complete.',
  'phaseBody.continueToCleanUp': 'Continue to Clean Up',
  'phaseBody.continue': 'Continue',
  'phaseBody.preparation':
    'No changes for the Chronobot this phase — set up the Era as normal, then continue.',
  'phaseBody.powerup':
    "Power up **{n}** of the Chronobot's Exosuits (Eras 1–4 → 6, Eras 5–7 → 4). Collect " +
    'those Exosuits to place when the app prompts you; it neither gains nor spends Energy ' +
    'Cores or Water.',
  'cleanUp.retrieve': "Retrieve the Chronobot's Exosuits along with your own.",
  'cleanUp.impact':
    '**The Impact occurs now** — resolve it using the usual procedure at the end of Era 4. ' +
    'From Era 5 on, the Chronobot powers up 4 Exosuits instead of 6.',
  'cleanUp.collapsing':
    'Flip using the usual procedure the Collapsing Capital tiles, then check for game end.',
  'cleanUp.finishAndScore': 'Finish & Score',
  'cleanUp.allFlippedQ': 'Flip the Collapsing Capital tiles. Are they now **all** flipped?',
  'cleanUp.endedYes': '✓ Yes — the game has ended, Finish & Score',
  'cleanUp.continuesNo': '✗ No — the game continues, start Era {era}',
  'cleanUp.endEra': 'End the Era — start Era {era}',

  // --- Paradox phase (shared by both bots) ----------------------------------
  'paradoxPhase.intro':
    'The {bot} rolls for Paradoxes on each past Timeline tile where it has the most (or ' +
    'tied-most) Warp tiles. It keeps checking until it gains an Anomaly.',
  'paradoxPhase.hypersyncNote':
    '**Hypersync:** a Hypersync tile counts as a Warp tile when deciding who has the most ' +
    'Warp tiles on a Timeline tile — but a tile with **zero** Warp tiles never rolls, even ' +
    'with a Hypersync tile present.',
  'paradoxPhase.paradoxAlt': 'Paradox',
  'paradoxPhase.ask':
    'Does the {bot} still have the most (or tied-most) Warp tiles on a past Timeline ' +
    'tile{hypersync}? Keep rolling for each such tile.',
  'paradoxPhase.hypersyncCount': ' (Hypersync tiles count)',
  'paradoxPhase.rollsUsed': '{asked} of up to {max} roll this phase.',
  'paradoxPhase.rollsUsedPlural': '{asked} of up to {max} rolls this phase.',
  'paradoxPhase.yes': 'Yes — it ties or leads (roll)',
  'paradoxPhase.no': 'No — done',
  'paradoxPhase.noShort': 'No',
  'paradoxPhase.hypersyncExtra':
    '**Hypersync — extra Paradox roll.** The player(s) with the most total Hypersync tiles ' +
    'in play make one more Paradox roll. Does the {bot} have the most (or tied-most) total ' +
    'Hypersync tiles in play (it has **{n}**)?',
  'paradoxPhase.noWarpHypersync':
    'The {bot} has no Warp tiles on the Timeline — its Warp-tile Paradox checks are skipped.',
  'paradoxPhase.noWarp':
    'The {bot} has no Warp tiles on the Timeline — it rolls no Paradoxes this phase.',
  'paradoxPhase.continueToPowerUp': 'Continue to Power Up',
  'paradoxPhase.paradoxes': 'Paradoxes',
  'paradoxPhase.anomalies': 'Anomalies',
  'paradoxPhase.warpTiles': 'Warp tiles',
  'paradoxPhase.hypersync': 'Hypersync',
  'paradoxPhase.hypersyncRulesLabel': 'Hypersync in the Paradox Phase',
  'paradoxPhase.hypersyncCite': 'Future Imperfect rulebook, p. 5',

  // --- Score screen (Chronobot) ---------------------------------------------
  'score.title': 'Final Score — Era {era}',
  'score.close': 'Close',
  'score.botVp': 'Chronobot VP',
  'score.yourScore': 'Your score',
  'score.modeNumber': 'Number',
  'score.modeTally': 'Tally sheet',
  'score.numberPlaceholder': 'Enter your total VP',
  'score.clearField': 'Clear {field}',
  'score.clear': 'Clear',
  'score.yourTotal': 'Your total:',
  'score.tallyDone': 'Done — use this total',
  'score.win': '🎉 You win! (more points than the Chronobot)',
  'score.lose': 'You lose — the Chronobot has at least as many points.',
  'score.loginToSave': 'Log in to save this game to your history.',
  'score.loginAndSave': 'Log in & save',
  'score.enterToSave': 'Enter your score above to save this game to your history.',
  'score.saving': 'Saving…',
  'score.saved': '✓ Saved to your history',
  'score.saveFailed': "Couldn't save automatically.",
  'score.logIn': 'Log in',
  'score.retry': 'Retry',
  'score.rulesLabel': 'End Game scoring',
  'score.newGame': 'New Game',
  'score.err.expired':
    'Your login session expired. This game is saved on this device and will upload once ' +
    'you log in.',
  'score.err.rejected':
    "You're still logged in, but the history service rejected the save. This game is " +
    "saved on this device and will upload once that's fixed.",
  'score.err.unreachable':
    "Couldn't reach your history service. This game is saved on this device and will " +
    'upload next time.',

  // --- Action dialogs (shared by both bots; {bot} is the opponent's name) ----
  // Every bold run marks a board location or component the player has to act on, so
  // these render through `<T>` and stay one key each.
  'dialog.close': 'Close',
  'figure.exosuit': 'Exosuit',
  'figure.guardian': 'Guardian',
  'dialog.startTurn': 'Start Your Turn',
  'dialog.advanceAutoleap': 'Advance to Autoleap Action',
  'dialog.space.construct': 'Construct',
  'dialog.space.research': 'Research',
  'dialog.rule.construct': 'Construct',
  'dialog.mechRulesCta': '📖 Placing the {bot}’s Exosuit',

  // Placement gate
  'dialog.mech.place':
    'Place the {bot}’s {figure} on the topmost available **{space}** Action space (or a ' +
    'World Council space if none are free).',
  'dialog.mech.askOpen': 'Is a **{space}** Action space open (not World Council)?',
  'dialog.mech.askOpenPlace':
    'Is a **{space}** Action space open (not World Council)? Place the {bot}’s {figure} ' +
    'on the topmost one.',
  'dialog.mech.blinkFirst':
    'Don’t place anything yet — the {bot} Blink-checks first, and a Blink moves an ' +
    'Exosuit it already has on the board instead.',
  'dialog.mech.coreNoBlink':
    'Put an Energy Core from the supply into that Exosuit. (No Blink is possible, so it ' +
    'places as usual.)',
  'dialog.mech.confirmPlaced': '✓ Confirm placed',
  'dialog.mech.yesCheckBlink': '✓ Yes — check for Blink',
  'dialog.mech.yesPlacedThere': '✓ Yes — placed there',
  'dialog.mech.noneOpen': '✗ No — none open',
  'dialog.mech.cannotPlace': '✗ Cannot place',

  // Guardians: the Guardian-board fallback
  'dialog.guardian.instruct':
    'No Action space was open, so the {bot} places a **Guardian** on the **Guardian ' +
    'board**, on an open space marked with one of its **Path markers** — and performs the ' +
    'Action from there.',
  'dialog.guardian.sub':
    'It doesn’t matter which of its marked spaces you use. This is **not** a Failed ' +
    'Action, so it takes no +1 VP.',
  'dialog.guardian.confirm': '✓ Placed on the Guardian board',

  // World Council overflow
  'dialog.wc.ask': 'No **{space}** space was open. Is the **World Council** space open?',
  'dialog.wc.askPlace':
    'No **{space}** space was open. Is the **World Council** space open? Place the ' +
    '{bot}’s {figure} there instead.',
  'dialog.wc.subBlink':
    'It still performs the Action from there. Nothing to place yet — the Blink check ' +
    'comes first.',
  'dialog.wc.subCore':
    'It still performs the Action from there. Put an Energy Core from the supply into ' +
    'that Exosuit.',
  'dialog.wc.yesBlink': '✓ Yes — check for Blink',
  'dialog.wc.yesPlaced': '✓ Yes — placed on World Council',
  'dialog.wc.no': '✗ No — nothing open',

  // Construct
  'dialog.construct.superproject':
    'Take the **highest-VP Superproject** (oldest if tied). Tap its printed VP (3–8).',
  'dialog.construct.building':
    'Take the higher-VP **{building}** (secondary stack if tied). Tap its printed VP ' +
    '(1–4) — then discard it.',

  // Mine
  'dialog.mine.ask': '**Is there one or more Mining Action space available?**',
  'dialog.mine.blinkSub':
    'Nothing to place yet — the Blink check comes first, and a Blink moves an Exosuit ' +
    'the {bot} already has on the board into that space instead.',
  'dialog.mine.yesBlink': '✓ Yes — check for Blink',
  'dialog.mine.yesOpen': '✓ Yes — a Mining space is open',
  'dialog.mine.no': '✗ No open Mining space',
  'dialog.mine.place':
    'Place the {bot}’s Exosuit in an open **Mine** space granting the best 2 Resources by ' +
    'priority order below, based on lacking-first. Give it those **2 Resources** ' +
    '(pre-selected; adjust to match the space — click a cube twice for **×2**), then ' +
    '**discard those 2 Resource cubes from the board**.',
  'dialog.mine.find':
    'Find the open **Mine** space granting the best 2 Resources by priority order below, ' +
    'based on lacking-first. Give it those **2 Resources** (pre-selected; adjust to match ' +
    'the space — click a cube twice for **×2**), then **discard those 2 Resource cubes ' +
    'from the board**.',

  // Recruit
  'dialog.recruit.instruct':
    'Recruit the highest-priority **Worker** the {bot} lacks by the priority order below ' +
    '(missing-first); if that type isn’t available, take the next available one. Pick the ' +
    'recruited Worker (+1 VP) — then discard its Worker tile from the board.',

  // Recruit Genius / Research
  'dialog.genius.ask':
    'Is a **Genius** available to recruit **and** an open Recruit Action space (or World ' +
    'Council space)? If so, the {bot} recruits a Genius. If not, it performs a Research ' +
    'action instead.',
  'dialog.genius.yes': '✓ Yes — recruit a Genius',
  'dialog.genius.no': '✗ No — Research instead',
  'dialog.genius.recruitPlaced':
    'The {bot} recruits a **Genius** from that Recruit space, removing it from the board. ' +
    'The bot gains 1 VP.',
  'dialog.genius.recruitPlace':
    'Place the {bot}’s Exosuit on the topmost available **Recruit** Action space (or a ' +
    'World Council space if full) and recruit a **Genius**, removing it from the board. ' +
    'The bot gains 1 VP.',

  // Research
  'dialog.research.rolled':
    'The shape die rolled **{shape}** — the {bot} keeps a **{shape}** Breakthrough.',
  'dialog.research.newShape':
    'Difficulty: the {bot} takes a Breakthrough shape it doesn\'t already have (or has ' +
    'the fewest of) — a **{shape}** Breakthrough.',

  // Reboot
  'dialog.reboot': 'Reboot: {bot} does nothing.',

  // Time Travel
  'dialog.timeTravel.fromEra':
    'Remove one of the {bot}’s **Warp tiles** from **{tile}** — the past tile where it ' +
    'has the most (oldest if tied).',
  'dialog.timeTravel.anyPast':
    'Remove one of the {bot}’s **Warp tiles** from the past Timeline tile where it has ' +
    'the most (oldest if tied).',
  'dialog.timeTravel.failCurrentEra':
    'Failed Action: the {bot}’s only Warp tiles are on the **current Era’s Timeline ' +
    'tile**, which Time Travel may not take from — it takes **+{vp} VP** instead (no ' +
    'Exosuit placed).',
  'dialog.timeTravel.failNone':
    'Failed Action: the {bot} has **no Warp tiles** on the Timeline, so it cannot Time ' +
    'Travel — it takes **+{vp} VP** instead (no Exosuit placed).',

  // Remove Anomaly
  'dialog.anomaly.instruct':
    'The {bot} discards **{discards}** and removes **1 Anomaly** from its board.',
  'dialog.anomaly.sub': 'Remove Anomaly places no Exosuit.',
  // The discard list reads mid-sentence ("discards **2 titanium + 1 gold**"), so these
  // are the piece names in running text rather than the capitalised `piece.*` labels.
  'dialog.anomaly.cubes': '{n} {resource}',
  'dialog.anomaly.cubeJoin': ' + ',
  'dialog.anomaly.reason.none': 'it has no Anomaly to remove',
  'dialog.anomaly.reason.cubes': 'it lacks 2 Resource cubes (or a Neutronium) to spend',
  'pieceInline.neutronium': 'neutronium',
  'pieceInline.titanium': 'titanium',
  'pieceInline.gold': 'gold',
  'pieceInline.uranium': 'uranium',
  'pieceInline.water': 'water',
  'dialog.anomaly.fail':
    'Failed Action: {reason} — the {bot} takes +{vp} VP instead (no Exosuit placed).',

  // --- Simple Command View --------------------------------------------------
  'scv.title': 'What Chronobot might do next',
  'scv.cxTitle': 'What Chronossus might do next',
  'scv.cxRulesLabel': 'How the AI die moves the markers',
  'scv.commandMarkerAlt': 'Command marker {n}',
  'scv.rowTitle': 'Show the {action} rules',
  'scv.dieLabel': 'AI die faces',
  'scv.rulesLabel': 'How the AI die moves the tokens',
  'scv.toggleHide': 'Simple Command View — click to hide',
  'scv.toggleShow': 'Simple Command View — click to show',
  'scv.hide': 'Hide',
  'scv.show': 'Show',

  // --- The Chronobot VP breakdown (pill popover + score screen) -------------
  'vp.tokenVP': 'Token VP',
  'vp.tokenVP.tip': 'Everything except Buildings, Time Travel & Breakthroughs',
  'vp.buildingVP': 'Building VP',
  'vp.buildingVP.tip': 'From Construct actions (Buildings & Superprojects)',
  'vp.timeTravel': 'Time Travel',
  'vp.timeTravel.tip': "From the Time Travel marker's track position (0/2/4/…/12)",
  'vp.breakthroughs': 'Breakthroughs (1 each)',
  'vp.breakthroughs.tip': '1 VP per Breakthrough',
  'vp.breakthroughSets': 'Breakthrough sets (+2 each)',
  'vp.breakthroughSets.tip': '+2 VP per complete shape set (one of each)',
  'vp.anomalies': 'Anomalies (−3 each)',
  'vp.anomalies.tip': '−3 VP per remaining Anomaly',
  'vp.total': 'Total',
  'vp.botTurns': 'Bot turns taken',
  'vp.pillTitle': 'Click for the full VP breakdown',
  'vp.pillUnit': 'VP',
  'vp.popoverTitle': 'Chronobot VP',
  // Chronossus-only rows on the same breakdown.
  'vp.cxPopoverTitle': 'Chronossus VP',
  'vp.cxBuildingVP.tip': 'From Construct actions — Buildings only',
  'vp.superprojectVP': 'Superproject VP',
  'vp.superprojectVP.tip': 'From Construct actions — Superprojects only',
  'vp.cxAnomalies.tip': '−3 VP per Anomaly the Chronossus still holds at game end',
  'vp.leftoverEnergy': 'Leftover Energy Cores',
  'vp.leftoverEnergy.tip':
    'Difficulty: 1 VP per energized Energy Core currently in the pool',
  'vp.technologies': 'Technologies (3 each)',
  'vp.technologies.tip': 'Fractures: 3 VP per Technology card the Chronossus holds',
  'vp.leftoverFlux': 'Leftover Flux Cores',
  'vp.leftoverFlux.tip':
    'Fractures difficulty: 1 VP per Flux Core left in the Flux Pool',

  // --- The Chronossus player tally ------------------------------------------
  'cxTally.buildings': 'Buildings',
  'cxTally.anomalies': 'Anomalies',
  'cxTally.superprojects': 'Superprojects',
  'cxTally.timeTravel': 'Time Travel',
  'cxTally.morale': 'Morale',
  'cxTally.vpTokens': 'Victory Point tokens',
  'cxTally.soloObjectives': 'Solo Objectives (highest levels)',
  'cxTally.breakthroughs': 'Breakthroughs',
  'cxTally.breakthroughSets': 'Breakthrough sets',
  'cxTally.timelinePenalties': 'Timeline penalties',
  'cxTally.technologies': 'Technology cards',
  'cxTally.fractureDevice': 'Fracture Device',
  'cxTally.glitches': 'Glitches',
  'cxTally.hypersyncTiles': 'Hypersync tiles remaining',

  // Score-screen row labels. Rate hints read the same on every line ("3 each",
  // "−2 each") — no "×", since these fields take a total, not a count to multiply.
  'cxScore.row.buildings': 'Buildings',
  'cxScore.row.superprojects': 'Superprojects',
  'cxScore.row.timeTravel': 'Time Travel',
  'cxScore.row.breakthroughs': 'Breakthroughs (1 each)',
  'cxScore.row.breakthroughSets': 'Breakthrough sets (set of shapes 2 each)',
  'cxScore.row.anomalies': 'Anomalies (−3 each)',
  'cxScore.row.vpTokens': 'Victory Point tokens',
  'cxScore.row.morale': 'Morale',
  'cxScore.row.soloObjectives': 'Solo Objectives (highest levels)',
  'cxScore.row.timelinePenalties': 'Timeline penalties',
  'cxScore.row.technologies': 'Technology cards (3 each)',
  'cxScore.row.fractureDevice': 'Fracture Device',
  'cxScore.row.glitches': 'Glitches (−2 each)',
  'cxScore.row.hypersyncTiles': 'Hypersync tiles remaining (−4 each)',
  'cxScore.row.leftoverEnergy': 'Leftover Energy Cores (difficulty, 1 each)',
  'cxScore.row.upgradeTokens': 'Upgrade board VP tokens (difficulty, 1 each)',
  'cxScore.row.leftoverFlux': 'Leftover Flux Cores (difficulty, 1 each)',

  // --- The Chronossus score screen ------------------------------------------
  'cxScore.you': 'You',
  'cxScore.vs': 'vs',
  'cxScore.bot': 'Chronossus',
  'cxScore.numberPlaceholder': 'Enter your total VP (including Solo Objectives)',
  'cxScore.leftoverEnergy': 'Leftover Energy Cores (difficulty)',
  'cxScore.upgradeTokens': 'Upgrade board VP tokens (difficulty)',
  'cxScore.leftoverFlux': 'Leftover Flux Cores (difficulty)',
  'cxScore.botTotal': 'Chronossus total',
  'cxScore.win': '🎉 You win! (more points than the Chronossus)',
  'cxScore.lose': 'You lose — the Chronossus has at least as many points.',
  'cxScore.imageDownloaded': '✓ Image downloaded',
  'cxScore.imageFailed': "Couldn't create the image.",

  // --- The player's own score tally -----------------------------------------
  'tally.buildings': 'Buildings',
  'tally.anomalies': 'Anomalies',
  'tally.superprojects': 'Superprojects',
  'tally.timeTravel': 'Time Travel',
  'tally.morale': 'Morale',
  'tally.vpTokens': 'Victory Point tokens',
  'tally.endgame': 'Endgame Conditions',
  'tally.breakthroughs': 'Breakthroughs (×1 each)',
  'tally.breakthroughSets': 'Breakthrough sets (×2 each)',
  'tally.timelinePenalties': 'Timeline penalties (−)',

  // --- The bot's pass decision, in words ------------------------------------
  'passDecision.continue':
    'The bot alternates turns with you and only passes once either you have passed and it ' +
    'has taken at least its minimum of {min} turns, or it has used all its Exosuits and ' +
    'taken one additional Time Travel action.',
  'passDecision.continueExtra':
    'Difficulty: the Chronobot takes one additional turn after you passed — roll the AI ' +
    'die for it.',
  'passDecision.mustContinueMin':
    'The Chronobot is out of Exosuits but has not taken {min} Actions yet — it keeps ' +
    'taking turns (Time Travel / Reboot) until it reaches {min}.',
  'passDecision.timeTravelThenPass':
    'The Chronobot is out of Exosuits — it takes a final Time Travel Action (if able), ' +
    'then passes.',
  'passDecision.pass': 'The Chronobot passes for this Era.',

  // --- Warp phase (shared by both bots; {bot} is the opponent's name) --------
  'warpPhase.tileLabel': 'the current Timeline tile',
  'warpPhase.orderBotFirst':
    'Warping occurs in player order. The {bot} is First Player this Era, so it Warps ' +
    'first — roll for it below, then place your own 0–2 Warp tiles as normal.',
  'warpPhase.orderYouFirst':
    'Warping occurs in player order. You are First Player this Era, so place your own ' +
    '0–2 Warp tiles first, then roll for the {bot}.',
  'warpPhase.roll': "Roll for the {bot}'s Warp",
  'warpPhase.tileAlt': '{bot} Warp tile',
  'warpPhase.none': 'The {bot} rolled no Paradoxes — it places no Warp tiles this phase.',
  'warpPhase.placed':
    'The {bot} rolled {n} Paradox — place {n} Warp tile for it on {tile}. Any tiles will ' +
    'do; the {bot} gains nothing from them.',
  'warpPhase.placedPlural':
    'The {bot} rolled {n} Paradoxes — place {n} Warp tiles for it on {tile}. Any tiles ' +
    'will do; the {bot} gains nothing from them.',

  // --- The Paradox die ------------------------------------------------------
  'paradoxDie.altBlank': 'Paradox die: blank',
  'paradoxDie.altOne': 'Paradox die: one Paradox',
  'paradoxDie.altDouble': 'Paradox die: double Paradox',
  'paradoxDie.rolled': 'Rolled {n} Paradox',
  'paradoxDie.rolledPlural': 'Rolled {n} Paradoxes',

  // --- Board markers (alt text + tooltips) ----------------------------------
  'board.timeTravelMarkerAlt': 'Time Travel marker',
  'board.commandTokenAlt': 'Command token {n}',
  'board.warpTileAlt': 'Chronobot Warp tile',
  'board.warpTitle':
    'Chronobot Warp tiles on the Timeline: {n} — tap for the past / current Era split',
  'board.soloBoardAlt': 'Chronobot solo board',

  // --- Reset ----------------------------------------------------------------
  'reset.confirm': 'Start a new game? This clears the current Chronobot game and its history.',

  // --- Board tracker tooltips -----------------------------------------------
  // `{label}` is the tracker's own name, itself translatable as `counter.<key>`.
  'counterTip.superproject': '{label} ×{count} — VP: {vps}',
  'counterTip.superprojectEmpty': '{label}: 0',
  'counterTip.building': '{label} ×{count} — VP: {vps} (max 3 of a type)',
  'counterTip.buildingEmpty': '{label}: 0 (max 3 of a type)',
  'counterTip.breakthrough': '{label}: {count} — click for per-shape counts',
  'counterTip.mech':
    '{label}: {count} powered Exosuit available · {deployed} deployed on board',
  'counterTip.mechPlural':
    '{label}: {count} powered Exosuits available · {deployed} deployed on board',
  'counterTip.anomaly': '{label}: {count} (max 3)',
  'counterTip.cubes': '{label}: {count} cube',
  'counterTip.cubesPlural': '{label}: {count} cubes',
  'counterTip.plain': '{label}: {count}',
  // Chronossus-only variants of the same tooltips.
  'counterTip.cxMech': '{label}: {count} powered Exosuit available',
  'counterTip.cxMechPlural': '{label}: {count} powered Exosuits available',
  'counterTip.cxMechGuardians':
    '{label}: {count} to place — {exosuits} and {guardians}',
  'counterTip.cxExosuitsOne': '{n} normal Exosuit',
  'counterTip.cxExosuitsMany': '{n} normal Exosuits',
  'counterTip.cxGuardiansOne': '{n} Guardian',
  'counterTip.cxGuardiansMany': '{n} Guardians',
  'counterTip.cxAnomalyVps': '{label} ×{count} — VP: {vps} (max 3)',
  'counterTip.cxAnomalyEmpty': '{label}: 0 (max 3)',
  'counterTip.cxWorkerOperators': '{label}: {count} ({n} is an Operator)',
  'counterTip.cxWorkerOperatorsPlural': '{label}: {count} ({n} are Operators)',

  // --- Shared Action panels (both bots) -------------------------------------
  // The bold runs mark board locations the player has to act on, so these render
  // through `<T>` and stay ONE key each — a translator moves the location name to
  // wherever their grammar needs it.
  'panel.warp.total': '**{n}** Warp tile on the Timeline',
  'panel.warp.totalPlural': '**{n}** Warp tiles on the Timeline',
  'panel.warp.past': 'Past Timeline tiles',
  'panel.warp.current': 'Era {era} (current) tile',
  'panel.warp.tiles': '{n} tile',
  'panel.warp.tilesPlural': '{n} tiles',
  'panel.blink.fluxAlt': 'Flux Core drawn',
  'panel.blink.fluxDrawn': 'Drawn from the Flux Pool — Blink activated.',
  'panel.blink.instruct':
    'Move its Exosuit from **{from}** (bottom-most space) to **{to}**, and return that ' +
    'Exosuit’s Energy Core to the supply.',
  'panel.blink.confirm': '✓ Confirm moved',
  'panel.blink.rulesCta': '📖 Blink',
  'panel.place.casingAlt': 'Empty Flux Casing drawn',
  'panel.place.casingDrawn': 'Drawn from the Flux Pool — no Blink.',
  'panel.place.noFigures':
    'No Blink, and the bot has **no Exosuit left to place** — so it **passes** for the ' +
    'Era. Nothing goes on **{destination}**, and its Command token does not advance.',
  'panel.place.instruct':
    'Place one of its **available powered Exosuits** on **{destination}**, and put an ' +
    'Energy Core from the supply into it.',
  'panel.place.instructOffBoard':
    'Place one of its **available powered Exosuits** on **{destination}**.',
  'panel.place.continuePasses': '✓ Continue — it passes',
  'panel.place.confirm': '✓ Confirm placed',
  // --- Admin stats (admin-only modal) ---------------------------------------
  'adminStats.title': 'Overall stats',
  'adminStats.close': 'Close',
  'adminStats.loading': 'Loading…',
  'adminStats.err': 'Could not load stats (admin only).',
  'adminStats.games': 'Games',
  'adminStats.winRate': 'Player win rate',
  'adminStats.wins': 'Player wins',
  'adminStats.players': 'Players',
  'adminStats.byDifficulty': 'By difficulty',
  'adminStats.none': 'No games recorded yet.',
  'adminStats.colDifficulty': 'Difficulty',
  'adminStats.colGames': 'Games',
  'adminStats.colWins': 'Wins',
  'adminStats.colWinRate': 'Win rate',
  // --- Chronossus: pass model + Doomsday's Check-for-Impact answers ----------
  'cx.pass.passed': 'The Chronossus has passed for this Era.',
  'cx.pass.outOfFigures':
    'The Chronossus is out of Exosuits — it passes the next time it would place one ' +
    '(Time Travel / Reboot still resolve).',
  'cx.pass.alternates':
    'The Chronossus alternates turns with you. It passes once it is out of Exosuits and ' +
    'would place one; when you have both passed, the Action Rounds Phase ends.',
  'cx.impactCheck.earthSaved.label': '“Save Earth” reached its topmost slot',
  'cx.impactCheck.earthSaved.detail':
    'Earth is saved: the Impact never happens and the game ends now',
  'cx.impactCheck.impactNow.label': '“Seal Fate” reached its bottommost slot',
  'cx.impactCheck.impactNow.detail': 'the Impact resolves immediately',
  'cx.impactCheck.impactOccurred.label': 'The Impact occurred',
  'cx.impactCheck.impactOccurred.detail':
    'the Impact tile was reached at the end of this Era',

  // --- Chronossus: the collapsible rule blocks -------------------------------
  'cx.rules.timeTravelFallback': 'Time Travel Action (the fallback):',

  // --- Pioneers: the Exosuit Upgrade board ----------------------------------
  'cx.power.board': 'Upgrade board {side} side',
  'cx.power.vpToken': '{n} VP token',
  'cx.power.vpTokens': '{n} VP tokens',
  'cx.upgrade.dialogAria': 'Chronossus Exosuit Upgrade board',
  'cx.upgrade.title': 'Exosuit Upgrade board',
  'cx.upgrade.close': 'Close',
  'cx.upgrade.artAlt': 'Chronossus Exosuit Upgrade board, {side} side',
  'cx.upgrade.slotFilled': '{resource}: upgraded (+{power} Power)',
  'cx.upgrade.slotEmpty': '{resource}: empty (+{power} Power when filled)',
  'cx.upgrade.tokensCount': '{n} VP token on the board',
  'cx.upgrade.tokensCountPlural': '{n} VP tokens on the board',
  'cx.upgrade.tokensPower': '+{n} Power from its VP tokens — tap for the token count',
  'cx.upgrade.tokensAria': 'VP tokens: {n}, worth {power} Power',
  'cx.upgrade.vpUnit': 'VP',
  'cx.upgrade.powerAlt': 'Power',
  'cx.upgrade.threshold':
    'At **{n}** or more Power — including the Path marker’s bonus, before the die — it ' +
    'draws from the **10+** Adventure deck.',
  'cx.upgrade.tokenNote':
    'Its {n} VP token adds Power but is **not** VP, unless that difficulty option is on.',
  'cx.upgrade.tokenNotePlural':
    'Its {n} VP tokens add Power but are **not** VP, unless that difficulty option is on.',
  'cx.upgrade.adventures': 'Adventures completed: **{n}**.',
  'cx.upgrade.flagHint':
    'Exosuit Upgrade board ({side} side) — {breakdown}. At {n}+ Power (with the ' +
    'Path-marker bonus) it draws from the 10+ Adventure deck. Tap to open the board.',
  'cx.upgrade.flagPart': '{power} {label}',
  'cx.upgrade.flagJoin': ' + ',

  // --- Chronossus pools + chips ---------------------------------------------
  'cx.exosuitAlt': 'Powered Exosuits',

  // --- Chronossus turn-overview chips ---------------------------------------
  'cx.flag.exosuits': 'Powered Exosuits available this Era',
  'cx.flag.exosuitsGuardians':
    'Figures it can still place this Era: {exosuits} and {guardians}. Guardians power up ' +
    'first and are placed last, and each has its own Action space on the Guardian board.',
  'cx.flag.energyPool': 'Energy Pool — non-exhausted Energy Cores / Exhausted Energy Cores',
  'cx.flag.fluxPool':
    'Flux Pool — Flux Cores / Empty Flux Casings, and any Casings set aside this Era ' +
    '(they return in Clean Up). A drawn Flux Core makes the Chronossus Blink.',
  'cx.flag.tech': 'Technology cards it holds (3 VP each at the end)',
  'cx.flag.techUnit': 'Tech',
  'cx.flag.guardians':
    'Guardians powered up this Era / Guardians it has. They are permanent — each keeps a ' +
    'Path marker on its own Guardian board slot — and every Era it powers up as many of ' +
    'them as it can before its own Exosuits. A gap means it has a Guardian it could not ' +
    'power up.',
  'cx.flag.guardianUnit': 'Guardian',
  'cx.flag.guardianUnitPlural': 'Guardians',
  'cx.flag.doomsday':
    'The Chronossus moves the {track} tracker (the one opposing yours), now on slot ' +
    '{slot} of 10. Landing there is worth {vp} VP — it takes BOTH Paths’ printed values, ' +
    'unlike you{locked}',
  'cx.flag.doomsdayLocked':
    '. The tracks are locked — Experiments still score, but nothing moves.',
  'cx.flag.doomsdayEnd': '.',
  'cx.flag.hypersync':
    'Pending Solo Hypersync tiles (max one per Era, 3 total). Hypersync placed this Era: {placed}',
  'cx.flag.hypersyncYes': 'Y',
  'cx.flag.hypersyncNo': 'N — the no-space fallback is still open',
  'cx.flag.hypersyncAlt': 'Hypersync tiles',
  'cx.flag.countLabel': 'Bot Turns',

  // --- Chronossus board overlays + the Exosuit badge pop-out ----------------
  'cx.board.soloBoardAlt': 'Chronossus solo board',
  'cx.phase.statusLabel': 'Chronossus Status',

  // --- Chronossus Power Up phase --------------------------------------------
  'cx.powerUp.drew': 'Drew {n}:',
  'cx.powerUp.backToPool': 'Back to the pool:',
  'cx.powerUp.oneReturns': 'One Exhausted Energy Core returns',
  'cx.powerUp.eecAlt': 'Exhausted Energy Core',
  'cx.powerUp.nothing': 'nothing',
  'cx.powerUp.restRemoved': '(the rest are removed from the game)',
  'cx.powerUp.poolNow': 'Pool now:',
  'cx.powerUp.poweredGuardians':
    'Powered up **{total}** in total — **{guardians}**{exosuits}. It powers up as many ' +
    'Guardians as it can first. Set these aside ready to place on the board for this Era.',
  'cx.powerUp.guardiansOne': ' Guardian',
  'cx.powerUp.guardiansMany': ' Guardians',
  'cx.powerUp.andExosuits': ' and **{n}** normal Exosuit',
  'cx.powerUp.andExosuitsPlural': ' and **{n}** normal Exosuits',
  'cx.powerUp.wholeNumber': ' (its whole number)',
  'cx.powerUp.powered':
    'Powered up **{n}** Exosuit. Set these aside ready to place on the board for this Era.',
  'cx.powerUp.poweredPlural':
    'Powered up **{n}** Exosuits. Set these aside ready to place on the board for this Era.',
  'cx.powerUp.continueToWarp': 'Continue to Warp',
  'cx.powerUp.draw3': 'Draw 3 from the Energy Pool',
  'cx.warp.eraZeroTile': 'the Era Zero tile',

  // --- Pioneers: the Adventure result panel ---------------------------------
  // `gains` / `actions` / `followUps` / the card's conversion + note are produced by the
  // engine from the Adventure card data and are NOT keyed — they need the message-
  // descriptor refactor first (see TODO.md).
  'cx.adv.powerBeforeRoll': 'Power before the roll',
  'cx.tile.autoleap':
    '**Autoleap:** the marker moved onto this tile, so its Action activates now — then ' +
    'the Command marker advances one extra space.',

  // --- Guardians (C11) ------------------------------------------------------
  'cx.guardian.availableAsk': 'Is a **Guardian** still available on the **Guardian board**?',
  'cx.guardian.availableSub':
    'The six Guardians are shared with you, so the app can’t see how many are left. From ' +
    'this Era on they could be gone.',
  'cx.guardian.yesAvailable': '✓ Yes — one is available',
  'cx.guardian.noneLeft': '✗ None left — Failed Action (+{vp} VP)',
  'cx.guardian.wcAsk': 'Is the **World Council Action space** open?',
  'cx.guardian.wcSub':
    'Don’t place anything yet — if it’s taken, the Chronossus spends a Worker instead and ' +
    'places no Exosuit at all.',
  'cx.guardian.wcYes': '✓ Yes — it’s open',
  'cx.guardian.wcNo': '✗ No — it’s taken',
  'cx.guardian.place':
    'Place the Chronossus’s **{figure}** on the **World Council Action space** — it ' +
    'becomes the **First Player**. It performs no Action there; instead it recruits the ' +
    '**leftmost available Guardian** at no cost.',
  'cx.guardian.placeMarker':
    'Put one of the Chronossus’s **Path markers** on an empty Guardian board slot for ' +
    'it — that slot becomes this Guardian’s own Action space. (If its Path markers run ' +
    'out, use an unused Path’s markers.)',
  'cx.guardian.worker':
    'The Chronossus spends a **{worker}** and recruits the **leftmost available ' +
    'Guardian** — no Exosuit is placed.',
  'cx.guardian.workerMarker':
    'Put one of the Chronossus’s **Path markers** on an empty Guardian board slot for the ' +
    'new Guardian — that slot becomes its own Action space.',
  'cx.guardian.workerPriority':
    'Worker priority: the one it has most of, then Scientist > Engineer > Administrator > ' +
    'Genius.',
  'cx.guardian.failedImpact2Vp':
    'The Impact has happened, so the Chronossus can no longer acquire Guardians — ' +
    'difficulty option: it scores 2 VP instead.',
  'cx.guardian.failedImpact':
    'The Impact has happened, so the Chronossus can no longer acquire Guardians — Failed ' +
    'Action: +{vp} VP.',
  'cx.guardian.failed': 'Failed Action: +{vp} VP.',
  'cx.guardian.failedNoWorkers':
    'It has no Workers left to spend on a Guardian — Failed Action: +{vp} VP.',

  // --- Pioneers: the Adventure slot question --------------------------------
  'cx.adv.slotPlaced':
    'The Chronossus performs an **Adventure** — put a **Path marker** on the topmost free ' +
    '**Power slot**. (Its figure is already on the hex pool.)',
  'cx.adv.slotPlace':
    'The Chronossus performs an **Adventure** — put an Exosuit onto the Adventure board’s ' +
    '**hex pool** and a **Path marker** on the topmost free **Power slot**.',
  'cx.adv.slotAsk': 'Which Power slot did its Path marker go on?',
  // Pioneers with the SHARED physical decks: the player draws and names the cards.
  'cx.adv.sharedDraw':
    'Draw **2 cards** from the **{deck}** deck for the Chronossus to evaluate.',
  'cx.adv.sharedPickSub':
    'It takes the one with the **highest Power requirement it meets** — pick that card ' +
    'below. The other goes to the bottom of the deck.',
  'cx.adv.sharedPickPlaceholder': 'Which card does it take?',
  'cx.adv.sharedPickNone': 'Neither — it meets no requirement (+1 VP)',
  'cx.adv.sharedOption': '{name} — {power} Power',
  'cx.adv.sharedNotMet': ' (not met)',
  'cx.adv.confirm': '✓ Confirm',

  // --- Fractures: the Valley gates ------------------------------------------
  'cx.valley.assimilateTech':
    'The shape die rolled **{shape}** — the Chronossus takes a **Technology card**, ' +
    'preferring the secondary stack.',
  'cx.valley.techWorth': 'It is worth 3 VP at the end of the game.',
  'cx.valley.confirmTaken': '✓ Confirm taken',
  'cx.valley.assimilateOperator':
    'The shape die rolled **{shape}** — the Chronossus recruits an **Operator**. Are ' +
    'there any left in the **Valley**?',
  'cx.valley.discardOperator': 'If so, discard one **Operator** from the Valley.',
  'cx.valley.operatorYes': '✓ Yes — it takes an Operator',
  'cx.valley.operatorNone': '✗ None left — Failed Action (+1 VP)',
  'cx.valley.spaceAsk':
    'Is an **{space}** Action space — or the **Valley Capital Action space** — open on ' +
    'the **Valley board**?',
  'cx.valley.spaceAskPlace':
    'Is an **{space}** Action space — or the **Valley Capital Action space** — open on ' +
    'the **Valley board**? Place the Chronossus’s Exosuit on the **topmost** available ' +
    '{space} space, or on the Valley Capital space if no {space} space is open.',
  // --- Doomsday: the Experiment gate ----------------------------------------
  'cx.exp.place':
    'Place one of the Chronossus’s **Exosuits** on the **Experiment Action space**.',
  'cx.exp.step1':
    '**Step 1 — Execute Experiment.** Is there a **Level {level} Experiment** on the ' +
    'Timeline with one of the Chronossus’s **Path markers** on it?',
  'cx.exp.step1Sub':
    'If more than one, it takes the **leftmost** — and discards the Path marker. Every ' +
    'Level {level} Experiment scores **{vp} VP**{tracker}',
  'cx.exp.trackerLocked':
    ', and the Doomsday tracks are locked so its **{tracker}** marker will not move.',
  'cx.exp.trackerMovesVp':
    ', then it moves its **{tracker}** marker one step, scoring the {vp} VP printed there.',
  'cx.exp.trackerMovesNoVp':
    ', then it moves its **{tracker}** marker one step (no VP printed there).',
  'cx.exp.markedYes': '✓ Yes — it takes one',
  'cx.exp.markedNo': '✗ None — skip this step',
  'cx.exp.step2':
    '**Step 2 — Prepare for Experimentation.** Place one of the Chronossus’s **Path ' +
    'markers** on a face-up Experiment that does not already have one — a **Level 1 ' +
    'before a Level 2**, and the **furthest in the past** to break a tie.',
  'cx.exp.step2Sub':
    'Never the Experiment under the next Era. Your Focus marker has no effect on this ' +
    'choice.',
  'cx.exp.allMarked': '✗ All of them already have one',
  'cx.valley.neitherOpen': '✗ No — neither is open',

  // --- Where a placement / Blink lands (the panels name the space) ----------
  // The History line keeps ENGLISH space names: it is persisted as a finished
  // sentence, so a translated one would freeze in whatever language was active.
  'cx.dest.worldCouncil': 'the World Council space',
  'cx.dest.mine': 'a Mine Action space (which one comes next, with the Resources)',
  'cx.dest.topmost': 'the topmost open {space} Action space',

  // --- Hypersync: the tile dialog -------------------------------------------
  'cx.hs.timeTravelTitle': 'Time Travel',
  'cx.hs.tileAlt': '{name} tile ({code})',
  'cx.hs.close': 'Close',
  'cx.hs.intro':
    'The Chronossus has {n} pending Hypersync tile (furthest in the past: Era {era}) and ' +
    'an available Exosuit. Check which Hypersync hex spaces are open on your board.',
  'cx.hs.introPlural':
    'The Chronossus has {n} pending Hypersync tiles (furthest in the past: Era {era}) and ' +
    'an available Exosuit. Check which Hypersync hex spaces are open on your board.',
  'cx.hs.checkHexes': '▶ Check Hypersync hexes',
  'cx.hs.noAction':
    'No pending Hypersync Action is available{why}. The Chronossus performs a normal Time ' +
    'Travel Action instead{fallback}.',
  'cx.hs.whyNeither': ' (no retrievable tile in a prior Era, and no available Exosuit)',
  'cx.hs.whyNoTile': ' (no retrievable Hypersync tile in a prior Era)',
  'cx.hs.whyNoExosuit': ' (no available Exosuit)',
  'cx.hs.fallbackCurrentEra':
    ', but its only Warp tiles are on the current Era’s Timeline tile, so it is a Failed Action',
  'cx.hs.fallbackNoTiles': ', but no Warp tiles remain, so it is a Failed Action',
  'cx.hs.goToTimeTravel': '▶ Go to Time Travel',
  'cx.hs.failedAction': '▶ Failed Action (+{vp} VP)',
  'cx.hs.tapOccupied': 'Tap any Hypersync hex space that is already occupied on the board.',
  'cx.hs.hexOccupied': 'Occupied — unavailable',
  'cx.hs.hexAvailable': 'Available',
  'cx.hs.noneAvailable':
    'No available space — the Chronossus performs a {fallback} instead.',
  'cx.hs.fallbackTimeTravel': 'Time Travel Action',
  'cx.hs.fallbackFailed': 'Failed Action',
  'cx.hs.available': 'Available: {list}.',
  'cx.hs.confirmSpace': '▶ Confirm Available Hypersync space',
  'cx.hs.blinkDestination': 'Hypersync hex {n}',
  'cx.hs.casingDestination': 'Hypersync space {n}',
  'cx.hs.casingDestinationTargeted':
    'the Hypersync space matching your furthest-in-the-past pending tile',
  'cx.hs.targetedAsk':
    'Does one of the available Hypersync spaces ({list}) match a **Hypersync tile you ' +
    'have pending** from a **prior Era**?',
  'cx.hs.targetedYes': '✓ Yes — one matches',
  'cx.hs.targetedNo': '✗ No — none of mine',
  'cx.hs.targetedPlace':
    'The Chronossus takes the space matching **your furthest-in-the-past** pending ' +
    'Hypersync tile.',
  'cx.hs.targetedDefer':
    'It scores 2 VP and retrieves its own oldest pending tile (no Time Travel advance). ' +
    'Don’t place anything yet — the Blink check comes next.',
  'cx.hs.targetedPlaceSub':
    'Place a bot Exosuit on that space to block it; it scores 2 VP and retrieves its own ' +
    'oldest pending tile. (No Time Travel advance.)',
  'cx.hs.takeTurn': '▶ Take Turn',
  'cx.hs.rollPrompt':
    'Roll to randomize between the available Hypersync spaces ({list}).',
  'cx.hs.rollButton': '🎲 Roll available space',
  'cx.hs.rolledDefer':
    'The Chronossus takes **Hypersync space {n}** — it takes the Hypersync tile from the ' +
    'oldest Era (Era {era}).',
  'cx.hs.rolledPlace':
    'Place a Bot Exosuit on **Hypersync space {n}** — the Chronossus takes the Hypersync ' +
    'tile from the oldest Era (Era {era}).',
  'cx.hs.scoresSub': 'It scores 2 VP. Do not advance the Time Travel marker.{defer}',
  'cx.hs.deferSuffix': ' Don’t place anything yet — the Blink check comes next.',
  'cx.hs.timeTravelFallback':
    'Remove one of the Chronossus’s **Warp tiles** from the past Timeline tile where it ' +
    'has the most (oldest if tied), then advance its Time Travel marker.',
  'cx.hs.targetedRulesLabel': 'Targeted Hypersync (difficulty)',

  // --- Variable Anomalies ---------------------------------------------------
  'cx.va.ask':
    '**Variable Anomalies — the Chronossus receives an Anomaly.** From the visible ' +
    'Anomaly tiles give it the one that **lets it retrieve a Warp tile** right now (check ' +
    'each tile’s Before/After Impact icon against this Era’s Impact status). If **both or ' +
    'neither** do, give it the one with the **smaller VP penalty** (closer to 0). Tap its ' +
    'printed VP.',
  'cx.va.retrieveAsk': 'Does the tile it took retrieve a Warp tile?',
  'cx.va.retrieveFrom':
    'If it does: remove one of the Chronossus’s Warp tiles from **{tile}**.',
  'cx.va.yes': '✓ Yes — it retrieves one',
  'cx.va.no': '✗ No',
  'cx.va.rulesLabel': 'Variable Anomalies',
  'cx.va.citeP18': 'Solo Opponents rulebook, p. 18',

  // --- Hypersync: the no-space Capital-Action fallback ----------------------
  'cx.hsTile.dialogAria': 'Place a Solo Hypersync tile',
  'cx.hsTile.art': 'Solo Hypersync tile',
  'cx.hsTile.title': 'Hypersync tile',
  'cx.hsTile.close': 'Close',
  'cx.hsTile.instruct':
    'No Action space remained for the “{action}” Action. Place one of the Chronossus’s ' +
    'Solo Hypersync tiles **above Era {era}** and perform the Action normally — no ' +
    'Exosuit is placed, and this is **not** a Failed Action.',
  'cx.hsTile.confirm': '▶ Place tile & perform the Action',
  'cx.hsRules.cta': '📖 {name} ({code})',

  'cx.valley.blinkSub':
    'Don’t place anything yet — the Chronossus Blink-checks first, and a Blink moves an ' +
    'Exosuit it already has on the Main board onto the Valley space instead.',
  'cx.adv.slotNone': '✗ None free ({n})',
  'cx.adv.boardPower': '{n} Power',
  'cx.adv.pathMarker': ' {sign} {n} Path marker',
  'cx.adv.draws': 'It draws **2 cards** from the **{deck}** deck.',
  'cx.adv.dieAlt': 'Adventure die: {n}',
  'cx.adv.totalPower': 'Total Power',
  'cx.adv.powerSum': '{before} before the roll + {die} on the Adventure die',
  'cx.adv.takes': 'The Chronossus takes **{card}**.',
  'cx.adv.takesAnd': ' It **{what}**.',
  'cx.adv.ruleUsed': 'Rule used:',
  'cx.adv.neither':
    'The Chronossus meets **neither** card’s Power requirement — it gains **1 VP** and ' +
    'both cards go to the bottom of their decks.',
  'cx.adv.upgrade':
    '**Power Upgrade:** the Chronossus moves 1 **{resource}** from its board onto its ' +
    'Exosuit Upgrade board.',
  'cx.adv.upgradeToken':
    '**Power Upgrade:** the Chronossus has no Resource with a free slot, so it places 1 ' +
    '**VP token** from the supply on its Exosuit Upgrade board instead.',

  // --- Chronossus Clean Up + Doomsday's Check for Impact --------------------
  'cx.cleanUp.retrieve': 'Retrieve the Chronossus’s Exosuits along with your own.',
  'cx.cleanUp.checkForImpact':
    '**Check for Impact.** Roll the two Trajectory dice and count their (+) and (−) ' +
    'symbols together with the ones printed beside both trackers’ current slots, then ' +
    'move the Impact tile accordingly.',
  'cx.cleanUp.botLocked':
    'The Chronossus’s own marker is already on its final slot — the tracks are locked and ' +
    'the Impact tile cannot move.',
  'cx.cleanUp.didAnyHappen':
    'Did any of these happen? Tap one if so — otherwise just end the Era.',
  'cx.cleanUp.earthSavedNote':
    'The Impact is **never** resolved — there is no Evacuation and the game ends now. ' +
    'Score as usual.',
  'cx.cleanUp.impactNow':
    '**The Impact occurs now** — resolve it using the usual procedure at the end of Era ' +
    '{era}. From Era {next} on, the Chronossus powers up 2+X Exosuits (max 4) instead of ' +
    '3+X (max 6).',
  'cx.cleanUp.collapsing':
    'Flip the Collapsing Capital tiles using the usual procedure, then check for game end.',
  'cx.cleanUp.earthSavedFinish': 'Earth is saved — Finish & Score',
  'cx.cleanUp.impactRulesLabel': 'Doomsday — Check for Impact',
  'cx.warp.altTimelinesIntro':
    '**Alternate Timelines:** decide how many Resources and/or Workers **you** are ' +
    'warping **before** rolling for the Chronossus. Once you\'ve decided, roll below and ' +
    'place the tiles in turn order as usual.',
  'cx.warp.rulesLabel': 'Warp',
  'cx.warp.citeP9': 'Solo Opponents rulebook, p. 9',
  'cx.warp.citeP18': 'Solo Opponents rulebook, p. 18',
  'cx.warp.altTimelinesLabel': 'Alternate Timelines',
  'cx.warp.quantumLoopsLabel': 'Quantum Loops',
  'cx.warp.quantumLead': 'Quantum Loops:',
  'cx.warp.quantumRemoves':
    'the Chronossus rolled {n} — remove the Quantum Loop card **farthest from the draw ' +
    'deck** from play. It never returns a card, so this one is gone **permanently**.{vp}',
  'cx.warp.quantumVp': ' It receives {n} VP for the removal.',
  'cx.warp.quantumNone':
    'the Chronossus rolled {n} — **no card is removed**. A card only goes on a roll of {faces}.',
  'cx.warp.quantumFaces45': '4 or 5',
  'cx.warp.quantumFaces4': '4',
  'cx.warp.altAsk':
    'Alternate Timelines: how many of the Chronossus’s {n} newly placed Warp tile landed ' +
    'on a **positive**-effect Timeline space?',
  'cx.warp.altAskPlural':
    'Alternate Timelines: how many of the Chronossus’s {n} newly placed Warp tiles landed ' +
    'on a **positive**-effect Timeline space?',
  'cx.warp.altSub':
    'It ignores negative/penalty spaces entirely — nothing to report for those. Each ' +
    'positive one scores it {vp} VP.',
  'cx.phase.heroAlt': 'Chronossus',
  'cx.phase.paradoxFractures':
    'Paradox phase – Players who strained the Timeline with Warping roll for Paradoxes. ' +
    'With Fractures of Time it is played in Era 1 as well, since the Era Zero tile is ' +
    'already in the past.',
  'cx.board.timeTravelMarkerAlt': 'Time Travel marker',
  'cx.board.warpTileAlt': 'Chronossus Warp tile',
  'cx.board.upgradeBtnTitle':
    "Show the Chronossus's Exosuit Upgrade board and its current Power",
  'cx.mechPop.figures': '{n} powered figure to place',
  'cx.mechPop.figuresPlural': '{n} powered figures to place',
  'cx.mechPop.normalExosuits': 'Normal Exosuits',
  'cx.mechPop.guardians': 'Guardians',
  'cx.mechPop.guardiansPowered': '{powered}/{owned} powered',
  'cx.mechPop.available': '{n} powered Exosuit available',
  'cx.mechPop.availablePlural': '{n} powered Exosuits available',
  'cx.mechPop.energyPool': 'Energy Pool',
  'cx.mechPop.hypersyncPlaced': 'Hypersync placed',
  'cx.mechPop.yes': 'Y',
  'cx.mechPop.no': 'N',
  'cx.rules.guardiansLabel': 'Guardians of the Council',
  'cx.rules.guardiansPowerUp':
    '**3 POWER UP PHASE:** The Chronossus first powers up as many Guardians as it can, ' +
    'then it powers up its own Exosuits (e.g. if it needs to power up 4 Exosuits and has ' +
    '2 Guardians, it will power up both of them and 2 of its own).',
  'cx.rules.guardiansGameplay':
    '**GAMEPLAY CHANGES:** When deciding which Exosuit to place, the Chronossus places ' +
    'Guardians last. If it wants to take a Capital Action (Research, Recruit, Construct) ' +
    'and there are no Action spaces remaining (including the World Council Action space), ' +
    'it places a Guardian (if it has any) on the reserved Guardian Action space and ' +
    'performs the Capital Action. This means the Action is not a Failed Action, so it ' +
    'does not take 1 VP.',
  'cx.exoUnit': 'Exo',
  'cx.exoIncGuardian': ' (inc {n} Guardian)',
  'cx.exoIncGuardians': ' (inc {n} Guardians)',
  'cx.energy.energizedTitle': 'Energy Cores in the Energy Pool',
  'cx.energy.energizedAlt': 'Energy Cores',
  'cx.energy.exhaustedTitle': 'Exhausted Energy Cores in the Energy Pool',
  'cx.energy.exhaustedAlt': 'Exhausted Energy Cores',
  'cx.flux.coresTitle': 'Flux Cores in the Flux Pool — each one is a Blink',
  'cx.flux.coresAlt': 'Flux Cores',
  'cx.flux.casingsTitle': 'Empty Flux Casings still in the Flux Pool',
  'cx.flux.casingsAlt': 'Empty Flux Casings',
  'cx.flux.asideTitle':
    'Empty Flux Casings set aside this Era — they return to the pool in Clean Up',
  'cx.rules.timeTravelCta': '📖 Time Travel',
  'cx.rules.autoleapCta': '📖 Autoleap',
} as const satisfies Record<string, string>;

export type UiKey = keyof typeof UI_STRINGS;
